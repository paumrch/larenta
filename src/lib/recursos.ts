/**
 * Enlaces a recursos externos, colocados sólo donde aportan algo al lector.
 *
 * Cada entrada se ancla a una página concreta (clave `tipo:id`) y lleva la frase
 * que justifica el enlace. Deliberadamente son pocos y a destinos distintos:
 * un mismo enlace repetido en decenas de páginas no ayuda a nadie.
 */
export type RecursoExterno = {
  /** URL de destino, absoluta. */
  href: string;
  /** Texto del enlace. */
  ancla: string;
  /** Frase previa que explica por qué el enlace viene a cuento. */
  contexto: string;
};

export const RECURSOS_EXTERNOS: Record<string, RecursoExterno> = {};

export function recursoPara(clave: string): RecursoExterno | null {
  return RECURSOS_EXTERNOS[clave] ?? null;
}
