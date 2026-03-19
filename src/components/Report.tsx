import { useState, useMemo, useRef } from "react";
import type { DeduccionIndex } from "../lib/types";
import {
  CCAA_MAP,
  CATEGORIA_LABELS,
  CATEGORIA_COLORS,
  cleanName,
  fichaUrl,
  relevanciaText,
  relevanciaLabel,
} from "../lib/types";

declare global {
  interface Window { dataLayer: Record<string, unknown>[]; }
}

function pushEvent(event: string, params?: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

interface ReportProps {
  deducciones: DeduccionIndex[];
  ccaa: string;
  laboral: string;
  situaciones: string[];
  datosEconomicos?: Record<string, string>;
  onBack: () => void;
  onReset: () => void;
}

/** Parse porcentaje or euro amount from string */
function parseAmount(val: string | null): { type: "pct" | "eur"; value: number } | null {
  if (!val) return null;
  const clean = cleanName(val).replace(/\./g, "").replace(",", ".");

  const eurMatch = clean.match(/^([\d.]+)\s*euros?/i);
  if (eurMatch) return { type: "eur", value: parseFloat(eurMatch[1]) };

  const pctMatch = clean.match(/^([\d.]+)\s*%/);
  if (pctMatch) return { type: "pct", value: parseFloat(pctMatch[1]) };

  return null;
}

/** Estimate max deduction amount from a single deduccion.
 *  - porcentaje (%) + base_maxima (€) → porcentaje × base_maxima
 *  - porcentaje is a fixed € amount → that amount
 *  - base_maxima is €, no porcentaje → can't estimate reliably
 */
function estimateSavings(d: DeduccionIndex): number | null {
  const pct = parseAmount(d.porcentaje);
  const base = parseAmount(d.base_maxima);

  // Both percentage and base in euros → actual deduction = pct% × base
  if (pct?.type === "pct" && base?.type === "eur") {
    return (pct.value / 100) * base.value;
  }
  // Porcentaje is a fixed € amount (e.g. "300 euros")
  if (pct?.type === "eur") return pct.value;
  // Only base_maxima in euros, no percentage → can't compute deduction
  // (base_maxima is the eligible expense, not the deduction itself)
  if (base?.type === "eur" && !pct) return null;
  return null;
}

/** Cap for individual deduction in total calculation */
const PER_DEDUCTION_CAP = 5000;

/** Map category → datosEconomicos key for user-provided amounts */
const CATEGORY_DATA_KEY: Record<string, string> = {
  vivienda: "alquiler_anual",
  educacion: "gastos_educacion",
  donativos: "donativos",
  energia: "reforma_energia",
};

/** Group deductions by category */
function groupByCategory(items: DeduccionIndex[]): Record<string, DeduccionIndex[]> {
  const groups: Record<string, DeduccionIndex[]> = {};
  for (const d of items) {
    if (!groups[d.categoria]) groups[d.categoria] = [];
    groups[d.categoria].push(d);
  }
  // Sort each group by relevancia desc
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.relevancia - a.relevancia);
  }
  return groups;
}

const CATEGORY_ORDER = ["familia", "vivienda", "educacion", "salud", "empresa", "donativos", "energia", "movilidad", "otros"];

export default function Report({ deducciones, ccaa, laboral, situaciones, datosEconomicos = {}, onBack, onReset }: ReportProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [expandedTop, setExpandedTop] = useState<Set<string>>(new Set());
  const reportRef = useRef<HTMLDivElement>(null);

  /** Parse user income (bruto) */
  const userIncome = useMemo(() => {
    const raw = datosEconomicos.ingresos_brutos;
    if (!raw) return null;
    const val = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    return isNaN(val) || val <= 0 ? null : val;
  }, [datosEconomicos]);

  /** Filter deducciones by limite_renta if user provided income */
  const { filteredDeducciones, excludedByIncome } = useMemo(() => {
    if (userIncome === null) return { filteredDeducciones: deducciones, excludedByIncome: 0 };

    let excluded = 0;
    const filtered = deducciones.filter((d) => {
      if (!d.limite_renta) return true;
      const limiteAmt = parseAmount(d.limite_renta);
      if (limiteAmt?.type === "eur" && userIncome > limiteAmt.value) {
        excluded++;
        return false;
      }
      return true;
    });
    return { filteredDeducciones: filtered, excludedByIncome: excluded };
  }, [deducciones, userIncome]);

  const grouped = useMemo(() => groupByCategory(filteredDeducciones), [filteredDeducciones]);

  const sortedCategories = useMemo(() =>
    CATEGORY_ORDER.filter((c) => grouped[c]?.length),
    [grouped]
  );

  const { totalEstimado, topDeducciones, deduccionesConEstimacion } = useMemo(() => {
    let total = 0;
    const withEstimation: (DeduccionIndex & { estimated: number })[] = [];

    for (const d of filteredDeducciones) {
      let est = estimateSavings(d);

      // If user provided financial data for this category, refine the estimate
      const dataKey = CATEGORY_DATA_KEY[d.categoria];
      if (dataKey && datosEconomicos[dataKey]) {
        const userAmount = parseFloat(datosEconomicos[dataKey].replace(/\./g, "").replace(",", "."));
        const pct = parseAmount(d.porcentaje);
        const base = parseAmount(d.base_maxima);
        if (!isNaN(userAmount) && userAmount > 0 && pct?.type === "pct") {
          // Use user amount capped at base_maxima if available
          const cappedBase = base?.type === "eur" ? Math.min(userAmount, base.value) : userAmount;
          est = (pct.value / 100) * cappedBase;
        }
      }

      if (est !== null && est > 0) {
        withEstimation.push({ ...d, estimated: est });
        // Cap each deduction for the total to avoid unrealistic sums
        total += Math.min(est, PER_DEDUCTION_CAP);
      }
    }

    withEstimation.sort((a, b) => b.estimated - a.estimated);

    return {
      totalEstimado: total,
      topDeducciones: withEstimation.slice(0, 5),
      deduccionesConEstimacion: withEstimation.length,
    };
  }, [filteredDeducciones, datosEconomicos]);

  function toggleCategory(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleTopDeduccion(id: string) {
    setExpandedTop((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSendEmail() {
    if (!email || !email.includes("@")) return;
    setSending(true);
    setSendError("");

    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ccaa,
          laboral,
          totalEstimado,
          totalDeducciones: filteredDeducciones.length,
          topDeducciones: topDeducciones.map((d) => ({
            nombre: cleanName(d.nombre_corto),
            porcentaje: d.porcentaje ? cleanName(d.porcentaje) : null,
            estimado: d.estimated,
            categoria: d.categoria,
            url: fichaUrl(d.id),
          })),
          categorias: sortedCategories.map((cat) => ({
            nombre: CATEGORIA_LABELS[cat] || cat,
            total: grouped[cat].length,
          })),
        }),
      });

      if (res.ok) {
        setSent(true);
        pushEvent("report_email_sent", {
          ccaa,
          ccaa_name: CCAA_MAP[ccaa] || ccaa,
          total_deducciones: filteredDeducciones.length,
          total_estimado: totalEstimado,
        });
      } else {
        setSendError("No se pudo enviar. Inténtalo de nuevo.");
      }
    } catch {
      setSendError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 25;

      // Header
      doc.setFontSize(24);
      doc.setTextColor(0, 71, 139);
      doc.text("larenta.es — Tu informe personalizado", margin, y);
      y += 12;

      doc.setFontSize(11);
      doc.setTextColor(66, 71, 82);
      doc.text(`${CCAA_MAP[ccaa] || "Todas"} · ${laboral === "ambos" ? "Asalariado + Autónomo" : laboral === "asalariado" ? "Asalariado" : "Autónomo"}${userIncome ? ` · ${userIncome.toLocaleString("es-ES")} € brutos` : ""}`, margin, y);
      y += 10;

      // Estimated savings
      doc.setFontSize(16);
      doc.setTextColor(0, 71, 139);
      doc.text(`${filteredDeducciones.length} deducciones aplicables`, margin, y);
      y += 8;
      if (totalEstimado > 0) {
        doc.setFontSize(12);
        doc.text(`Ahorro orientativo: hasta ${totalEstimado.toLocaleString("es-ES")} €`, margin, y);
        y += 6;
      }
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${deduccionesConEstimacion} deducciones con estimación numérica`, margin, y);
      y += 14;

      // Top deducciones
      if (topDeducciones.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(0, 71, 139);
        doc.text("Deducciones con mayor impacto", margin, y);
        y += 8;

        for (const d of topDeducciones) {
          if (y > 270) { doc.addPage(); y = 25; }
          doc.setFontSize(10);
          doc.setTextColor(20, 29, 35);
          const lines = doc.splitTextToSize(cleanName(d.nombre_corto), contentW - 40);
          doc.text(lines, margin, y);
          doc.setTextColor(0, 71, 139);
          doc.text(`${d.estimated.toLocaleString("es-ES")} €`, pageW - margin, y, { align: "right" });
          y += lines.length * 5 + 3;
        }
        y += 6;
      }

      // All deducciones by category
      for (const cat of sortedCategories) {
        if (y > 250) { doc.addPage(); y = 25; }
        doc.setFontSize(12);
        doc.setTextColor(0, 71, 139);
        doc.text(`${CATEGORIA_LABELS[cat] || cat} (${grouped[cat].length})`, margin, y);
        y += 7;

        for (const d of grouped[cat]) {
          if (y > 270) { doc.addPage(); y = 25; }
          doc.setFontSize(9);
          doc.setTextColor(20, 29, 35);
          const name = cleanName(d.nombre_corto);
          const lines = doc.splitTextToSize(name, contentW - 30);
          doc.text(lines, margin + 4, y);
          if (d.porcentaje) {
            doc.setTextColor(0, 71, 139);
            doc.text(cleanName(d.porcentaje), pageW - margin, y, { align: "right" });
          }
          y += lines.length * 4.5 + 2;
        }
        y += 6;
      }

      // Footer
      if (y > 260) { doc.addPage(); y = 25; }
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Generado en larenta.es · Datos del Manual Práctico de Renta — AEAT", margin, y);
      y += 4;
      doc.text("Información orientativa. No constituye asesoramiento fiscal.", margin, y);

      doc.save(`informe-renta-2025-${ccaa.toLowerCase()}.pdf`);
      pushEvent("report_pdf_downloaded", {
        ccaa,
        ccaa_name: CCAA_MAP[ccaa] || ccaa,
        total_deducciones: filteredDeducciones.length,
        total_estimado: totalEstimado,
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  const laboralLabel = laboral === "ambos" ? "Asalariado + Autónomo"
    : laboral === "asalariado" ? "Asalariado" : "Autónomo";

  return (
    <div className="animate-fade-up" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button onClick={onBack} className="btn-text !text-sm">← Modificar</button>
          <button onClick={onReset} className="btn-text !text-sm" style={{ color: "var(--color-on-surface-variant)" }}>Reiniciar</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Card 1: Deducciones count */}
        <div
          className="p-5 sm:p-6"
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)",
            borderRadius: "var(--radius-2xl)",
            color: "white",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ opacity: 0.6 }}>
            Deducciones aplicables
          </p>
          <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ letterSpacing: "-0.03ch" }}>
            {filteredDeducciones.length}
          </div>
          <p className="text-sm" style={{ opacity: 0.7 }}>
            {CCAA_MAP[ccaa]} · {laboralLabel}
          </p>
          {userIncome && (
            <p className="text-xs mt-1" style={{ opacity: 0.5 }}>
              {userIncome.toLocaleString("es-ES")} € brutos anuales
            </p>
          )}
          {excludedByIncome > 0 && (
            <p className="text-[11px] mt-2" style={{ opacity: 0.45 }}>
              {excludedByIncome} excluida{excludedByIncome > 1 ? "s" : ""} por superar el límite de renta
            </p>
          )}
        </div>

        {/* Card 2: Estimated savings */}
        <div
          className="p-5 sm:p-6"
          style={{
            background: "var(--color-surface-lowest)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
            Ahorro orientativo
          </p>
          {totalEstimado > 0 ? (
            <>
              <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: "var(--color-primary)", letterSpacing: "-0.03ch" }}>
                hasta {totalEstimado.toLocaleString("es-ES")} €
              </div>
              <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                Basado en {deduccionesConEstimacion} deducciones con datos numéricos
              </p>
            </>
          ) : (
            <>
              <div className="text-xl font-bold mb-1" style={{ color: "var(--color-on-surface)" }}>
                No disponible
              </div>
              <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                No hay suficientes datos numéricos para estimar
              </p>
            </>
          )}
          <p className="text-[11px] mt-2" style={{ color: "var(--color-on-surface-variant)", opacity: 0.5 }}>
            El ahorro real depende de tu situación fiscal concreta
          </p>
        </div>
      </div>

      {/* Save CTA — prominent, right after hero */}
      <div
        className="p-5 sm:p-6 mb-8"
        style={{
          background: "var(--color-surface-lowest)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--color-on-surface)" }}>
              Guarda tu informe
            </h3>
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Recíbelo por email o descarga el PDF.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sent ? (
              <div className="flex items-center gap-2 py-2.5 px-4" style={{ background: "var(--color-success-surface)", borderRadius: "var(--radius-xl)", color: "var(--color-success)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold">Enviado</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-44 sm:w-48 px-3.5 py-2.5 text-sm"
                  style={{
                    background: "var(--color-surface-high)",
                    borderRadius: "var(--radius-pill)",
                    border: "none",
                    color: "var(--color-on-surface)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
                />
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !email.includes("@")}
                  className="btn-primary !py-2 !px-4 !text-sm"
                  style={sending || !email.includes("@") ? { opacity: 0.5, pointerEvents: "none" } : {}}
                >
                  {sending ? "…" : "Enviar →"}
                </button>
              </div>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="btn-gold !py-2 !px-4 !text-sm flex-shrink-0"
              style={generatingPdf ? { opacity: 0.5 } : {}}
            >
              {generatingPdf ? "…" : "📄 PDF"}
            </button>
          </div>
        </div>
        {sendError && (
          <p className="text-xs mt-2" style={{ color: "var(--color-error)" }}>{sendError}</p>
        )}
        <p className="text-[11px] mt-3" style={{ color: "var(--color-on-surface-variant)", opacity: 0.5 }}>
          Tu email solo se usa para enviarte el informe. No lo almacenamos ni compartimos.
        </p>
      </div>

      {/* Top deducciones */}
      {topDeducciones.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>
            Deducciones con mayor impacto
          </h3>
          <div className="space-y-2">
            {topDeducciones.map((d, i) => {
              const isExpanded = expandedTop.has(d.id);
              return (
                <div
                  key={d.id}
                  style={{
                    background: "var(--color-surface-lowest)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-float)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => toggleTopDeduccion(d.id)}
                    className="w-full flex items-center justify-between p-4 text-left transition-all"
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "var(--color-surface-high)", color: "var(--color-primary)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-snug" style={{ color: "var(--color-on-surface)" }}>
                          {cleanName(d.nombre_corto)}
                        </div>
                        <span className={`text-[11px] ${CATEGORIA_COLORS[d.categoria] || "badge-otros"} badge`}>
                          {CATEGORIA_LABELS[d.categoria] || d.categoria}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <div className="text-lg font-extrabold" style={{ color: "var(--color-primary)", letterSpacing: "-0.02ch" }}>
                          {d.estimated.toLocaleString("es-ES")} €
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>hasta</div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 transition-transform flex-shrink-0"
                        style={{ color: "var(--color-on-surface-variant)", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 mb-3" style={{ background: "var(--color-surface-high)", borderRadius: "var(--radius-lg)" }}>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
                          {cleanName(d.resumen)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                          {d.porcentaje && <span><strong>Porcentaje:</strong> {cleanName(d.porcentaje)}</span>}
                          {d.base_maxima && <span><strong>Base máx:</strong> {cleanName(d.base_maxima)}</span>}
                        </div>
                        <a
                          href={fichaUrl(d.id)}
                          className="text-xs font-semibold transition-colors"
                          style={{ color: "var(--color-primary)", textDecoration: "none" }}
                        >
                          Ver ficha completa →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All deducciones by category — accordion */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>
          Todas tus deducciones por categoría
        </h3>
        <div className="space-y-2">
          {sortedCategories.map((cat) => {
            const items = grouped[cat];
            const isOpen = expandedCats.has(cat);
            return (
              <div key={cat} style={{ background: "var(--color-surface-lowest)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-float)", overflow: "hidden" }}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`badge ${CATEGORIA_COLORS[cat] || "badge-otros"}`}>
                      {CATEGORIA_LABELS[cat] || cat}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                      {items.length} {items.length === 1 ? "deducción" : "deducciones"}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 transition-transform"
                    style={{ color: "var(--color-on-surface-variant)", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-1">
                    {items.map((d) => (
                      <a
                        key={d.id}
                        href={fichaUrl(d.id)}
                        className="flex items-center justify-between py-2.5 px-3 transition-colors"
                        style={{
                          background: "var(--color-surface-high)",
                          borderRadius: "var(--radius-lg)",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-highest)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface-high)"; }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-semibold ${d.relevancia === 3 ? "relevancia-alta" : d.relevancia === 2 ? "relevancia-media" : "relevancia-baja"}`} title={`Relevancia ${relevanciaLabel(d.relevancia)}`}>
                            {relevanciaText(d.relevancia)}
                          </span>
                          <span className="text-sm leading-snug min-w-0 flex-1" style={{ color: "var(--color-on-surface)" }}>
                            {cleanName(d.nombre_corto)}
                          </span>
                        </div>
                        {d.porcentaje && (
                          <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: "var(--color-primary)" }}>
                            {cleanName(d.porcentaje)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4" style={{ background: "var(--color-surface-high)", borderRadius: "var(--radius-xl)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
          <strong>Aviso:</strong> Este informe es orientativo basado en los datos oficiales del Manual de la Renta 2025 de la AEAT.
          Los importes mostrados son máximos teóricos — tu ahorro real dependerá de tu situación fiscal concreta.
          Consulta siempre con un profesional para optimizar tu declaración.
        </p>
      </div>
    </div>
  );
}
