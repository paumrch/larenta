import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { DeduccionIndex } from "../lib/types";
import {
  CCAA_MAP,
  CIUDADES_AUTONOMAS,
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

interface ExplorerProps {
  deducciones: DeduccionIndex[];
  initialCcaa?: string;
  initialCategoria?: string;
}

const CATEGORY_ORDER = ["familia", "vivienda", "educacion", "salud", "empresa", "donativos", "energia", "movilidad", "otros"];

export default function Explorer({
  deducciones,
  initialCcaa = "",
  initialCategoria = "",
}: ExplorerProps) {
  const [search, setSearch] = useState("");
  const [ccaa, setCcaa] = useState(initialCcaa);
  const [categoria, setCategoria] = useState(initialCategoria);
  const [relevancia, setRelevancia] = useState("");
  const [tipo, setTipo] = useState("");
  const [showNovedades, setShowNovedades] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORY_ORDER));

  // Debounced search tracking
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const trackSearch = useCallback((term: string) => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (term.trim().length >= 2) {
        pushEvent("explorer_search", { search_term: term.trim() });
      }
    }, 800);
  }, []);

  function trackFilter(filter_type: string, filter_value: string) {
    pushEvent("explorer_filter", { filter_type, filter_value: filter_value || "(all)" });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ccaa")) setCcaa(params.get("ccaa")!);
    if (params.get("categoria")) setCategoria(params.get("categoria")!);
    if (params.get("novedades") === "1") setShowNovedades(true);
  }, []);

  const CCAA_OPTIONS = useMemo(
    () => Object.entries(CCAA_MAP).filter(([k]) => k !== "EST").sort(([, a], [, b]) => a.localeCompare(b)),
    []
  );
  const CATEGORIAS = useMemo(
    () => Object.entries(CATEGORIA_LABELS).sort(([, a], [, b]) => a.localeCompare(b)),
    []
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deducciones.filter((d) => {
      if (ccaa && d.codigo_ccaa !== ccaa && d.tipo !== "estatal") return false;
      if (categoria && d.categoria !== categoria) return false;
      if (relevancia && d.relevancia !== Number(relevancia)) return false;
      if (tipo === "estatal" && d.tipo !== "estatal") return false;
      if (tipo === "autonomica" && d.tipo !== "autonomica") return false;
      if (showNovedades && !d.novedad_2025) return false;
      if (q) {
        const haystack = `${d.nombre} ${d.resumen} ${d.comunidad} ${d.categoria}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (b.relevancia !== a.relevancia) return b.relevancia - a.relevancia;
      if (a.tipo !== b.tipo) return a.tipo === "estatal" ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [deducciones, search, ccaa, categoria, relevancia, tipo, showNovedades]);

  // Group by category for accordion view
  const grouped = useMemo(() => {
    const groups: Record<string, DeduccionIndex[]> = {};
    for (const d of filtered) {
      if (!groups[d.categoria]) groups[d.categoria] = [];
      groups[d.categoria].push(d);
    }
    return groups;
  }, [filtered]);

  const sortedCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => grouped[c]?.length),
    [grouped]
  );

  // Use flat list mode when searching by text (more useful for search)
  const isSearching = search.trim().length > 0;

  const hasFilters = search || ccaa || categoria || relevancia || tipo || showNovedades;

  function clearFilters() {
    setSearch("");
    setCcaa("");
    setCategoria("");
    setRelevancia("");
    setTipo("");
    setShowNovedades(false);
  }

  function toggleCategory(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const selStyle = (active: boolean) => ({
    background: active ? "var(--color-primary)" : "var(--color-surface-high)",
    color: active ? "var(--color-on-primary)" : "var(--color-on-surface)",
    borderRadius: "var(--radius-pill)",
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    border: "none",
    cursor: "pointer" as const,
    transition: "background 0.15s ease",
    appearance: "none" as const,
    maxWidth: "100%",
  });

  function DeduccionRow({ d }: { d: DeduccionIndex }) {
    return (
      <a
        href={fichaUrl(d.id)}
        onClick={() => pushEvent("explorer_deduction_click", { deduction_id: d.id, deduction_name: cleanName(d.nombre_corto) })}
        className="flex items-center justify-between py-2.5 px-3 transition-colors"
        style={{
          background: "var(--color-surface-high)",
          borderRadius: "var(--radius-lg)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-highest)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface-high)"; }}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className={`text-[10px] font-semibold flex-shrink-0 ${d.relevancia === 3 ? "relevancia-alta" : d.relevancia === 2 ? "relevancia-media" : "relevancia-baja"}`} title={`Relevancia ${relevanciaLabel(d.relevancia)}`}>
            {relevanciaText(d.relevancia)}
          </span>
          <span className="text-sm leading-snug truncate" style={{ color: "var(--color-on-surface)" }}>
            {cleanName(d.nombre_corto)}
          </span>
          {d.tipo === "autonomica" && (
            <span className="text-[10px] flex-shrink-0 hidden sm:inline" style={{ color: "var(--color-on-surface-variant)" }}>
              {d.comunidad}
            </span>
          )}
          {d.novedad_2025 && (
            <span className="text-[10px] flex-shrink-0" style={{ color: "var(--color-on-secondary-container)" }}>✨</span>
          )}
        </div>
        {d.porcentaje && (
          <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: "var(--color-primary)" }}>
            {cleanName(d.porcentaje)}
          </span>
        )}
      </a>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-5">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--color-on-surface-variant)" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Buscar deducción por nombre, comunidad…"
          aria-label="Buscar deducciones"
          value={search}
          onChange={(e) => { setSearch(e.target.value); trackSearch(e.target.value); }}
          className="w-full pl-10 pr-5 py-3.5 text-sm focus:outline-none transition-colors"
          style={{
            background: "var(--color-surface-high)",
            color: "var(--color-on-surface)",
            borderRadius: "var(--radius-pill)",
            border: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.background = "var(--color-surface-lowest)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-primary)"; }}
          onBlur={(e) => { e.currentTarget.style.background = "var(--color-surface-high)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select value={ccaa} onChange={(e) => { setCcaa(e.target.value); trackFilter("ccaa", e.target.value); }} style={selStyle(!!ccaa)}>
          <option value="">Todas las CCAA</option>
          {CCAA_OPTIONS.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>

        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); trackFilter("categoria", e.target.value); }} style={selStyle(!!categoria)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select value={relevancia} onChange={(e) => { setRelevancia(e.target.value); trackFilter("relevancia", e.target.value); }} style={selStyle(!!relevancia)}>
          <option value="">Todas las relevancias</option>
          <option value="3">Alta relevancia</option>
          <option value="2">Media relevancia</option>
          <option value="1">Baja relevancia</option>
        </select>

        <select value={tipo} onChange={(e) => { setTipo(e.target.value); trackFilter("tipo", e.target.value); }} style={selStyle(!!tipo)}>
          <option value="">Estatales y autonómicas</option>
          <option value="estatal">Solo estatales</option>
          <option value="autonomica">Solo autonómicas</option>
        </select>

        <button
          onClick={() => setShowNovedades(!showNovedades)}
          style={{
            background: showNovedades ? "var(--color-secondary-container)" : "var(--color-surface-high)",
            color: showNovedades ? "var(--color-on-secondary-container)" : "var(--color-on-surface)",
            borderRadius: "var(--radius-pill)",
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          ✨ Novedades 2025
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: "transparent",
              color: "var(--color-on-surface-variant)",
              borderRadius: "var(--radius-pill)",
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Nota ciudades autónomas */}
      {(CIUDADES_AUTONOMAS as readonly string[]).includes(ccaa) && (
        <div className="mb-4 px-4 py-3 text-sm rounded-xl" style={{ background: "var(--color-secondary-container)", color: "var(--color-on-secondary-container)" }}>
          <strong>Nota:</strong> Ceuta y Melilla no tienen deducciones autonómicas propias. Se muestran las deducciones estatales, incluyendo la deducción específica por rentas obtenidas en estos territorios.
        </div>
      )}

      {/* Counter */}
      <div className="mb-4 text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
        {filtered.length === deducciones.length
          ? `${deducciones.length} deducciones`
          : `${filtered.length} de ${deducciones.length} deducciones`}
        {!isSearching && ` en ${sortedCategories.length} categorías`}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ background: "var(--color-surface-high)", borderRadius: "var(--radius-xl)" }}>
          <p className="text-lg" style={{ color: "var(--color-on-surface-variant)" }}>
            No se encontraron deducciones con estos filtros
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm font-medium"
            style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : isSearching ? (
        /* Flat list when searching by text */
        <div className="space-y-1">
          {filtered.map((d) => (
            <a
              key={d.id}
              href={fichaUrl(d.id)}
              className="flex items-start gap-4 p-4 transition-all"
              style={{
                background: "var(--color-surface-lowest)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-float)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shadow-modal)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-float)"; }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`badge text-[11px] ${CATEGORIA_COLORS[d.categoria] || "badge-otros"}`}>
                    {CATEGORIA_LABELS[d.categoria] || d.categoria}
                  </span>
                  <span className="badge text-[11px]" style={{ background: "var(--color-surface-high)", color: d.tipo === "estatal" ? "var(--color-primary)" : "var(--color-on-surface-variant)" }}>
                    {d.tipo === "estatal" ? "Estatal" : d.comunidad}
                  </span>
                  {d.novedad_2025 && (
                    <span className="badge text-[11px]" style={{ background: "var(--color-secondary-fixed)", color: "var(--color-on-secondary-container)" }}>✨ Novedad</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--color-on-surface)" }}>{cleanName(d.nombre_corto)}</h3>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {d.porcentaje && (
                  <span className="text-sm font-extrabold" style={{ color: "var(--color-primary)" }}>{cleanName(d.porcentaje)}</span>
                )}
                <span className={`text-xs font-semibold ${d.relevancia === 3 ? "relevancia-alta" : d.relevancia === 2 ? "relevancia-media" : "relevancia-baja"}`} title={`Relevancia ${relevanciaLabel(d.relevancia)}`}>
                  {relevanciaText(d.relevancia)}
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        /* Grouped accordion view */
        <div className="space-y-3">
          {sortedCategories.map((cat) => {
            const items = grouped[cat];
            const isOpen = expandedCats.has(cat);
            const altaCount = items.filter((d) => d.relevancia === 3).length;

            return (
              <div
                key={cat}
                style={{
                  background: "var(--color-surface-lowest)",
                  borderRadius: "var(--radius-xl)",
                  boxShadow: "var(--shadow-float)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`badge ${CATEGORIA_COLORS[cat] || "badge-otros"}`}>
                      {CATEGORIA_LABELS[cat] || cat}
                    </span>
                    <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                      {items.length} {items.length === 1 ? "deducción" : "deducciones"}
                      {altaCount > 0 && (
                        <span className="ml-1.5 text-xs font-semibold" style={{ color: "var(--color-success)" }}>
                          · {altaCount} alta
                        </span>
                      )}
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
                      <DeduccionRow key={d.id} d={d} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
