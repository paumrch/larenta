/**
 * Fecha de la última actualización de los datos fiscales.
 *
 * Se declara a mano, a propósito. NO usar el `mtime` de los ficheros de `data/`:
 * en Vercel el build parte de un `git clone`, que reescribe las fechas de
 * modificación con la hora del checkout, así que el sitio acabaría diciendo que
 * los datos se actualizaron el día del último deploy, que es falso.
 *
 * Actualizar al regenerar los datos con `scripts/generate_indexes.py`.
 */
export const DATOS_ACTUALIZADOS = "2026-03-25";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-03-25" → "25 de marzo de 2026" */
export function fechaLarga(iso: string = DATOS_ACTUALIZADOS): string {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/**
 * Recorta un texto a una meta description utilizable en la SERP (~155 car.),
 * cortando en frontera de palabra y sin dejar la frase colgando de una coma.
 * Limpia además los guiones y viñetas con los que arranca parte del texto
 * extraído del Manual de la AEAT.
 */
export function metaDescripcion(texto: string, max = 155): string {
  let t = (texto || "")
    // Un puñado de resúmenes vienen con HTML crudo del Manual de la AEAT
    // (RIO-25 y RIO-26 son tablas enteras). Sin quitarlo, la description
    // sería un trozo de marcado.
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#\d+);/g, " ")
    .replace(/^[\s\-–—•·*]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const recorte = t.slice(0, max + 1);
  const ultimoEspacio = recorte.lastIndexOf(" ");
  // Si no hay ningún espacio donde cortar, se corta en seco: es preferible a
  // devolver una cadena vacía, que es lo que pasaba antes.
  const corte = ultimoEspacio > max / 2 ? ultimoEspacio : max;
  return t.slice(0, corte).replace(/[\s,;:.\-–—]+$/, "") + "…";
}
