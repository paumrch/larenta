import { useState, useMemo, useEffect } from "react";
import type { DeduccionIndex } from "../lib/types";
import {
  CCAA_MAP,
  CIUDADES_AUTONOMAS,
  SITUACION_LABELS,
} from "../lib/types";
import Report from "./Report";

declare global {
  interface Window { dataLayer: Record<string, unknown>[]; }
}

function pushEvent(event: string, params?: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

interface WizardProps {
  deducciones: DeduccionIndex[];
}

interface Answers {
  ccaa: string;
  laboral: "asalariado" | "autonomo" | "ambos" | "";
  situaciones: string[];
  edad: string;
  alquiler: "si" | "no" | "";
  ganancias: "si" | "no" | "";
  datosEconomicos: Record<string, string>;
}

const STEPS = [
  { key: "ccaa",       title: "¿Dónde tributa tu IRPF?",             subtitle: "Selecciona tu Comunidad Autónoma" },
  { key: "laboral",    title: "¿Cuál es tu situación laboral?",       subtitle: "Esto determina qué deducciones aplican" },
  { key: "situaciones",title: "¿Qué situaciones te describen?",       subtitle: "Marca todas las que apliquen" },
  { key: "edad",       title: "¿Cuántos años tienes?",               subtitle: "Algunas deducciones tienen límites de edad" },
  { key: "alquiler",   title: "¿Alquilas algún inmueble?",            subtitle: "Vivienda, local u otro bien" },
  { key: "ganancias",  title: "¿Has tenido ganancias patrimoniales?", subtitle: "Venta de inmuebles, fondos, acciones…" },
  { key: "economicos", title: "Unos datos más para personalizar",     subtitle: "Opcional — para estimar mejor tu ahorro" },
] as const;

/** Financial questions based on user situaciones */
interface FinancialQuestion {
  key: string;
  label: string;
  placeholder: string;
  suffix: string;
  /** Show only if user selected one of these situaciones (empty = always show) */
  showIf: string[];
}

/** Core income questions — always shown */
const INCOME_QUESTIONS: FinancialQuestion[] = [
  { key: "ingresos_brutos", label: "¿Cuáles son tus ingresos brutos anuales?", placeholder: "28.000", suffix: "€/año", showIf: [] },
  { key: "ingresos_autonomo", label: "¿Cuáles son tus ingresos como autónomo?", placeholder: "20.000", suffix: "€/año", showIf: ["__autonomo"] },
];

/** Situational financial questions */
const SITUATIONAL_QUESTIONS: FinancialQuestion[] = [
  { key: "num_hijos", label: "¿Cuántos hijos tienes?", placeholder: "0", suffix: "", showIf: ["tiene_hijos", "familia_numerosa", "familia_monoparental"] },
  { key: "alquiler_anual", label: "¿Cuánto pagas de alquiler al año?", placeholder: "9.600", suffix: "€/año", showIf: ["alquila_vivienda"] },
  { key: "inversion_vivienda", label: "¿Cuánto has invertido en vivienda este año?", placeholder: "5.000", suffix: "€", showIf: ["tiene_vivienda_propia"] },
  { key: "donativos", label: "¿Cuánto has donado este año?", placeholder: "500", suffix: "€", showIf: ["hace_donativos"] },
  { key: "gastos_educacion", label: "¿Gastos en educación este año?", placeholder: "2.000", suffix: "€", showIf: ["estudia_o_tiene_estudiantes"] },
  { key: "reforma_energia", label: "¿Cuánto has invertido en eficiencia energética?", placeholder: "3.000", suffix: "€", showIf: ["reforma_eficiencia"] },
];

const CCAA_OPTIONS = Object.entries(CCAA_MAP)
  .filter(([k]) => k !== "EST")
  .sort(([, a], [, b]) => a.localeCompare(b));

const LABORAL_OPTIONS = [
  { value: "asalariado", label: "Asalariado/a",  desc: "Trabajo por cuenta ajena",  icon: "💼" },
  { value: "autonomo",   label: "Autónomo/a",    desc: "Trabajo por cuenta propia",  icon: "🧾" },
  { value: "ambos",      label: "Ambos",         desc: "Combino empleo y actividad", icon: "⚖️" },
] as const;

const ALL_SITUACION_OPTIONS = Object.entries(SITUACION_LABELS);

export default function Wizard({ deducciones }: WizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    ccaa: "",
    laboral: "",
    situaciones: [],
    edad: "",
    alquiler: "",
    ganancias: "",
    datosEconomicos: {},
  });
  const [showResults, setShowResults] = useState(false);

  // Track wizard start (once)
  useEffect(() => { pushEvent("wizard_start"); }, []);

  // Show CML-specific situaciones only when user selected Ceuta y Melilla
  const SITUACION_OPTIONS = useMemo(() =>
    ALL_SITUACION_OPTIONS.filter(([key]) =>
      key !== "vive_en_ceuta_melilla" || answers.ccaa === "CML"
    ),
    [answers.ccaa]
  );

  const results = useMemo(() => {
    if (!showResults) return [];

    return deducciones
      .filter((d) => {
        if (d.tipo === "autonomica" && d.codigo_ccaa !== answers.ccaa) return false;
        if (answers.laboral === "asalariado" && !d.aplica_asalariados) return false;
        if (answers.laboral === "autonomo" && !d.aplica_autonomos) return false;

        // If deduction requires specific situaciones, user must match at least one
        if (d.situaciones.length > 0) {
          const match = d.situaciones.some((s) => answers.situaciones.includes(s));
          if (!match) return false;
        }

        // Modifier tags like "vive_en_pueblo" are geographic context, not content qualifiers.
        // For multi-tag deductions, require matching at least one content tag — not just a modifier.
        const MODIFIER_TAGS = ["vive_en_pueblo"];
        if (d.situaciones.length > 1) {
          const contentTags = d.situaciones.filter((s) => !MODIFIER_TAGS.includes(s));
          if (contentTags.length > 0 && !contentTags.some((s) => answers.situaciones.includes(s))) {
            return false;
          }
        }

        // Required tags: if the deduction includes these, the user must have them selected
        if (d.situaciones.includes("reforma_eficiencia") && !answers.situaciones.includes("reforma_eficiencia")) return false;
        if (d.situaciones.includes("vive_en_ceuta_melilla") && !answers.situaciones.includes("vive_en_ceuta_melilla")) return false;

        // Negative filters: explicit "no" answers override situacion matches
        if (answers.alquiler === "no" && d.situaciones.includes("alquila_vivienda")) return false;
        if (answers.ganancias === "no" && d.situaciones.includes("invierte") && !answers.situaciones.includes("invierte")) return false;

        // If user invested 0€ in housing, discard vivienda-category deductions about property
        const invVivienda = answers.datosEconomicos?.inversion_vivienda;
        if (invVivienda !== undefined && invVivienda !== "" && Number(invVivienda) === 0) {
          if (d.situaciones.includes("tiene_vivienda_propia") && d.categoria === "vivienda") return false;
        }

        // Age filtering
        if (answers.edad) {
          const edad = parseInt(answers.edad, 10);
          if (!isNaN(edad)) {
            if (d.edad_maxima != null && edad > d.edad_maxima) return false;
            if (d.edad_minima != null && edad < d.edad_minima) return false;
          }
        }

        // Income filtering (limite_renta)
        const ingresosRaw = answers.datosEconomicos?.ingresos_brutos;
        if (ingresosRaw && d.limite_renta) {
          const ingresos = parseFloat(ingresosRaw.replace(/\./g, "").replace(",", "."));
          const limMatch = d.limite_renta.replace(/\./g, "").replace(",", ".").match(/^([\d.]+)\s*euros?/i);
          if (limMatch && !isNaN(ingresos) && ingresos > parseFloat(limMatch[1])) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (b.relevancia !== a.relevancia) return b.relevancia - a.relevancia;
        if (a.tipo !== b.tipo) return a.tipo === "estatal" ? -1 : 1;
        return 0;
      });
  }, [showResults, deducciones, answers]);

  // Income questions: always show base income; show autonomo only if relevant
  const incomeQuestions = useMemo(() =>
    INCOME_QUESTIONS.filter((q) =>
      q.showIf.length === 0 ||
      (q.showIf.includes("__autonomo") && (answers.laboral === "autonomo" || answers.laboral === "ambos"))
    ),
    [answers.laboral]
  );

  // Situational financial questions relevant to this user
  const relevantFinancialQuestions = useMemo(() =>
    SITUATIONAL_QUESTIONS.filter((q) =>
      q.showIf.length === 0 || q.showIf.some((s) => answers.situaciones.includes(s))
    ),
    [answers.situaciones]
  );

  const canAdvance =
    (step === 0 && answers.ccaa !== "") ||
    (step === 1 && answers.laboral !== "") ||
    step === 2 ||
    step === 3 || // age is optional
    (step === 4 && answers.alquiler !== "") ||
    (step === 5 && answers.ganancias !== "") ||
    step === 6; // economic data is optional

  function handleNext() {
    if (step < STEPS.length - 1) {
      pushEvent("wizard_step_complete", {
        step: step + 1,
        step_name: STEPS[step].key,
      });
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  }

  function handleBack() {
    if (showResults) {
      setShowResults(false);
    } else if (step > 0) {
      setStep(step - 1);
    }
  }

  function handleReset() {
    setStep(0);
    setAnswers({ ccaa: "", laboral: "", situaciones: [], edad: "", alquiler: "", ganancias: "", datosEconomicos: {} });
    setShowResults(false);
  }

  function toggleSituacion(sit: string) {
    setAnswers((prev) => ({
      ...prev,
      situaciones: prev.situaciones.includes(sit)
        ? prev.situaciones.filter((s) => s !== sit)
        : [...prev.situaciones, sit],
    }));
  }

  // ── RESULTS ──────────────────────────────────────────────────────────
  if (showResults) {
    pushEvent("wizard_complete", {
      ccaa: answers.ccaa,
      ccaa_name: CCAA_MAP[answers.ccaa] || answers.ccaa,
      laboral: answers.laboral,
      total_deducciones: results.length,
    });
    return (
      <Report
        deducciones={results}
        ccaa={answers.ccaa}
        laboral={answers.laboral}
        situaciones={answers.situaciones}
        datosEconomicos={answers.datosEconomicos}
        onBack={handleBack}
        onReset={handleReset}
      />
    );
  }

  // ── WIZARD STEPS ─────────────────────────────────────────────────────
  const progressPct = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div>
      {/* Progress bar (8px, gradient gold — DESIGN.md) */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
          <span>Paso {step + 1} de {STEPS.length}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max(progressPct, 5)}%` }}></div>
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2 mb-8 mt-3">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === step ? "24px" : "8px",
              height: "8px",
              background: i <= step
                ? "var(--color-primary)"
                : "var(--color-surface-high)",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="animate-fade-up" key={step}>
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-1"
          style={{ color: "var(--color-on-surface)", letterSpacing: "-0.02ch" }}>
          {STEPS[step].title}
        </h2>
        <p className="mb-6 text-base" style={{ color: "var(--color-on-surface-variant)" }}>
          {STEPS[step].subtitle}
        </p>

        {/* Step 0: CCAA — grid de pills sin borde */}
        {step === 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CCAA_OPTIONS.map(([code, name]) => {
                const sel = answers.ccaa === code;
                return (
                  <button
                    key={code}
                    onClick={() => setAnswers((p) => ({ ...p, ccaa: code }))}
                    className="px-4 py-3 text-left text-sm font-medium transition-all"
                    style={{
                      background: sel ? "var(--color-primary)" : "var(--color-surface-high)",
                      color: sel ? "var(--color-on-primary)" : "var(--color-on-surface)",
                      borderRadius: "var(--radius-xl)",
                      transform: sel ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {(CIUDADES_AUTONOMAS as readonly string[]).includes(answers.ccaa) && (
              <div className="mt-4 px-4 py-3 text-sm rounded-xl" style={{ background: "var(--color-secondary-container)", color: "var(--color-on-secondary-container)" }}>
                <strong>Nota:</strong> Ceuta y Melilla no tienen deducciones autonómicas propias. Te mostraremos las deducciones estatales, incluyendo la deducción específica por rentas obtenidas en estos territorios.
              </div>
            )}
          </>
        )}

        {/* Step 1: Laboral — 3 opciones grandes */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LABORAL_OPTIONS.map((opt) => {
              const sel = answers.laboral === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAnswers((p) => ({ ...p, laboral: opt.value as Answers["laboral"] }))}
                  className="px-5 py-5 text-left transition-all"
                  style={{
                    background: sel ? "var(--color-primary)" : "var(--color-surface-lowest)",
                    color: sel ? "white" : "var(--color-on-surface)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: sel ? "none" : "var(--shadow-float)",
                    transform: sel ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <span className="text-2xl block mb-3">{opt.icon}</span>
                  <div className="font-semibold text-base">{opt.label}</div>
                  <div className="text-sm mt-0.5" style={{ opacity: sel ? 0.8 : undefined, color: sel ? "inherit" : "var(--color-on-surface-variant)" }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Situaciones — checkbox pills */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SITUACION_OPTIONS.map(([key, label]) => {
              const sel = answers.situaciones.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleSituacion(key)}
                  className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all"
                  style={{
                    background: sel ? "var(--color-secondary-container)" : "var(--color-surface-high)",
                    color: sel ? "var(--color-on-secondary-container)" : "var(--color-on-surface)",
                    borderRadius: "var(--radius-xl)",
                  }}
                >
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 text-xs font-bold transition-all"
                    style={{
                      background: sel ? "var(--color-on-secondary-container)" : "var(--color-surface-highest)",
                      color: sel ? "var(--color-secondary-container)" : "transparent",
                    }}
                  >
                    ✓
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Edad */}
        {step === 3 && (
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 32"
                value={answers.edad}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setAnswers((p) => ({ ...p, edad: val }));
                }}
                className="flex-1 px-5 py-4 text-lg font-semibold text-center"
                style={{
                  background: "var(--color-surface-high)",
                  borderRadius: "var(--radius-xl)",
                  border: "none",
                  color: "var(--color-on-surface)",
                }}
                autoFocus
              />
              <span className="text-base font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                años
              </span>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--color-on-surface-variant)", opacity: 0.7 }}>
              Hay deducciones específicas para jóvenes (&lt;36) y mayores (&gt;65). Si prefieres no indicar tu edad, pulsa Siguiente.
            </p>
          </div>
        )}

        {/* Step 4: Alquiler — Sí / No */}
        {step === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            {[
              { value: "si", label: "Sí, alquilo un inmueble", icon: "🏠", desc: "Vivienda, local, garaje…" },
              { value: "no", label: "No alquilo nada", icon: "✖️", desc: "No tengo ingresos por alquiler" },
            ].map((opt) => {
              const sel = answers.alquiler === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAnswers((p) => ({ ...p, alquiler: opt.value as Answers["alquiler"] }))}
                  className="px-5 py-5 text-left transition-all"
                  style={{
                    background: sel ? "var(--color-primary)" : "var(--color-surface-lowest)",
                    color: sel ? "white" : "var(--color-on-surface)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: sel ? "none" : "var(--shadow-float)",
                    transform: sel ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <span className="text-2xl block mb-3">{opt.icon}</span>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm mt-0.5" style={{ opacity: 0.75, color: sel ? "inherit" : "var(--color-on-surface-variant)" }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 5: Ganancias patrimoniales — Sí / No */}
        {step === 5 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            {[
              { value: "si", label: "Sí, he tenido ganancias", icon: "📈", desc: "Venta de acciones, fondos, inmuebles…" },
              { value: "no", label: "No he tenido ganancias", icon: "📉", desc: "Sin operaciones de inversión este año" },
            ].map((opt) => {
              const sel = answers.ganancias === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAnswers((p) => ({ ...p, ganancias: opt.value as Answers["ganancias"] }))}
                  className="px-5 py-5 text-left transition-all"
                  style={{
                    background: sel ? "var(--color-primary)" : "var(--color-surface-lowest)",
                    color: sel ? "white" : "var(--color-on-surface)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: sel ? "none" : "var(--shadow-float)",
                    transform: sel ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <span className="text-2xl block mb-3">{opt.icon}</span>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm mt-0.5" style={{ opacity: 0.75, color: sel ? "inherit" : "var(--color-on-surface-variant)" }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 6: Datos económicos */}
        {step === 6 && (
          <div className="space-y-6 max-w-lg">
            {/* Income — always shown */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-primary)" }}>
                Tus ingresos
              </p>
              <div className="space-y-4">
                {incomeQuestions.map((q) => (
                  <div key={q.key}>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--color-on-surface)" }}>
                      {q.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={q.placeholder}
                        value={answers.datosEconomicos[q.key] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d.,]/g, "");
                          setAnswers((prev) => ({
                            ...prev,
                            datosEconomicos: { ...prev.datosEconomicos, [q.key]: val },
                          }));
                        }}
                        className="flex-1 px-4 py-3 text-sm"
                        style={{
                          background: "var(--color-surface-high)",
                          borderRadius: "var(--radius-xl)",
                          border: "none",
                          color: "var(--color-on-surface)",
                        }}
                      />
                      {q.suffix && (
                        <span className="text-sm font-medium flex-shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
                          {q.suffix}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Situational — only if relevant */}
            {relevantFinancialQuestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-primary)" }}>
                  Según tu situación
                </p>
                <div className="space-y-4">
                  {relevantFinancialQuestions.map((q) => (
                    <div key={q.key}>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--color-on-surface)" }}>
                        {q.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={q.placeholder}
                          value={answers.datosEconomicos[q.key] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d.,]/g, "");
                            setAnswers((prev) => ({
                              ...prev,
                              datosEconomicos: { ...prev.datosEconomicos, [q.key]: val },
                            }));
                          }}
                          className="flex-1 px-4 py-3 text-sm"
                          style={{
                            background: "var(--color-surface-high)",
                            borderRadius: "var(--radius-xl)",
                            border: "none",
                            color: "var(--color-on-surface)",
                          }}
                        />
                        {q.suffix && (
                          <span className="text-sm font-medium flex-shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
                            {q.suffix}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs" style={{ color: "var(--color-on-surface-variant)", opacity: 0.6 }}>
              Estos datos no se almacenan. Solo se usan para estimar tu ahorro.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6"
        style={{ borderTop: `1px solid var(--color-outline-variant)` }}>
        <button
          onClick={handleBack}
          className="btn-text"
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
        >
          ← Atrás
        </button>

        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className="btn-primary"
          style={!canAdvance ? { opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" } : {}}
        >
          {step === STEPS.length - 1 ? "Ver mis deducciones →" : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
