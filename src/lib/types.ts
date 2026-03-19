// Tipos y helpers compartidos para datos de deducciones

export interface Deduccion {
  id: string;
  tipo: "estatal" | "autonomica";
  comunidad: string;
  codigo_ccaa: string;
  nombre: string;
  nombre_corto: string;
  categoria: string;
  relevancia: number;
  aplica_asalariados: boolean;
  aplica_autonomos: boolean;
  situaciones: string[];
  resumen: string;
  porcentaje: string | null;
  base_maxima: string | null;
  limite_renta: string | null;
  novedad_2025: boolean;
  url_oficial: string;
  contenido_md: string;
}

export interface DeduccionIndex {
  id: string;
  tipo: "estatal" | "autonomica";
  comunidad: string;
  codigo_ccaa: string;
  nombre: string;
  nombre_corto: string;
  categoria: string;
  relevancia: number;
  aplica_asalariados: boolean;
  aplica_autonomos: boolean;
  situaciones: string[];
  resumen: string;
  porcentaje: string | null;
  base_maxima: string | null;
  limite_renta: string | null;
  novedad_2025: boolean;
  url_oficial: string;
}

export interface Stats {
  total_deducciones: number;
  total_estatales: number;
  total_autonomicas: number;
  total_ccaa: number;
  total_alta_relevancia: number;
  total_media_relevancia: number;
  total_baja_relevancia: number;
  novedades_2025: number;
  categorias: Record<string, number>;
  por_ccaa: Record<string, number>;
  top_situaciones: Record<string, number>;
  ccaa_lista: { codigo: string; nombre: string; total: number }[];
}

export const CCAA_MAP: Record<string, string> = {
  AND: "Andalucía",
  ARA: "Aragón",
  AST: "Principado de Asturias",
  BAL: "Illes Balears",
  CAN: "Canarias",
  CTB: "Cantabria",
  CLM: "Castilla-La Mancha",
  CYL: "Castilla y León",
  CAT: "Cataluña",
  EXT: "Extremadura",
  GAL: "Galicia",
  MAD: "Comunidad de Madrid",
  MUR: "Región de Murcia",
  RIO: "La Rioja",
  VAL: "Comunitat Valenciana",
  EST: "Estatal",
};

export const CATEGORIA_LABELS: Record<string, string> = {
  familia: "👨‍👩‍👧 Familia",
  vivienda: "🏠 Vivienda",
  educacion: "🎓 Educación",
  salud: "🏥 Salud",
  empresa: "💼 Empresa",
  donativos: "🤝 Donativos",
  energia: "⚡ Energía",
  movilidad: "🚗 Movilidad",
  otros: "📋 Otros",
};

export const CATEGORIA_COLORS: Record<string, string> = {
  familia: "badge-familia",
  vivienda: "badge-vivienda",
  educacion: "badge-educacion",
  salud: "badge-salud",
  empresa: "badge-empresa",
  donativos: "badge-donativos",
  energia: "badge-energia",
  movilidad: "badge-movilidad",
  otros: "badge-otros",
};

export const SITUACION_LABELS: Record<string, string> = {
  tiene_hijos: "Tengo hijos",
  tiene_vivienda_propia: "Tengo vivienda propia",
  alquila_vivienda: "Alquilo vivienda",
  discapacidad: "Discapacidad (propia o familiar)",
  invierte: "Invierto o ahorro",
  cuida_mayores: "Cuido de mayores",
  estudia_o_tiene_estudiantes: "Estudio o tengo hijos estudiando",
  hace_donativos: "Hago donativos",
  tiene_conyuge: "Tengo cónyuge",
  autonomo: "Soy autónomo",
  vive_en_pueblo: "Vivo en zona rural",
  reforma_eficiencia: "He hecho reformas de eficiencia energética",
  familia_numerosa: "Familia numerosa",
  familia_monoparental: "Familia monoparental",
  coche_electrico: "Tengo o quiero coche eléctrico",
};

/** Limpia los escapes markdown del nombre */
export function cleanName(name: string): string {
  return name.replace(/\\\\/g, "\\").replace(/\\([.*+?^${}()|[\]\\#!])/g, "$1").replace(/\\/g, "");
}

/** Devuelve la URL de la ficha */
export function fichaUrl(id: string): string {
  return `/deduccion/${id}`;
}

/** Dots de relevancia: ••• alta, •• media, • baja */
export function relevanciaText(r: number): string {
  if (r === 3) return "•••";
  if (r === 2) return "••";
  return "•";
}

/** Label de relevancia para accesibilidad */
export function relevanciaLabel(r: number): string {
  if (r === 3) return "Alta";
  if (r === 2) return "Media";
  return "Baja";
}
