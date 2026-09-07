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

export const RECURSOS_EXTERNOS: Record<string, RecursoExterno> = {
  "guia:alquiler": {
    href: "https://cambiodeuso.es/requisitos/",
    ancla: "requisitos para convertir un local en vivienda",
    contexto:
      "Las deducciones de este apartado exigen que el inmueble sea una vivienda. Si lo que tienes es un local, primero hay que tramitar el cambio de uso: estos son los",
  },
  "categoria:vivienda": {
    href: "https://cambiodeuso.es/local-a-vivienda/",
    ancla: "cambio de uso de local a vivienda",
    contexto:
      "Un local no da derecho a estas deducciones mientras no sea legalmente una vivienda. El trámite que cambia eso es el",
  },
};

export function recursoPara(clave: string): RecursoExterno | null {
  return RECURSOS_EXTERNOS[clave] ?? null;
}
