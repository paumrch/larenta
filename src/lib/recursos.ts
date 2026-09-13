/**
 * Enlaces a recursos externos, colocados sólo donde aportan algo al lector.
 *
 * Cada entrada se ancla a una página concreta (clave `tipo:id`) y lleva la frase
 * que justifica el enlace. Deliberadamente son pocos y a destinos distintos:
 * un mismo enlace repetido en decenas de páginas no ayuda a nadie.
 *
 * Una página puede llevar más de uno cuando el trámite que le falta al lector es
 * más de uno —alquilar un local exige cambiar el uso Y certificar la vivienda—,
 * pero la regla de arriba sigue mandando: si el segundo no resuelve una duda
 * distinta de la del primero, sobra.
 */
export type RecursoExterno = {
  /** URL de destino, absoluta. */
  href: string;
  /** Texto del enlace. */
  ancla: string;
  /** Frase previa que explica por qué el enlace viene a cuento. */
  contexto: string;
};

export const RECURSOS_EXTERNOS: Record<string, RecursoExterno[]> = {
  "guia:alquiler": [
    {
      href: "https://cambiodeuso.es/requisitos/",
      ancla: "requisitos para convertir un local en vivienda",
      contexto:
        "Las deducciones de este apartado exigen que el inmueble sea una vivienda. Si lo que tienes es un local, primero hay que tramitar el cambio de uso: estos son los",
    },
    {
      href: "https://certificadoenergia.es/certificado-energetico/alquilar/",
      ancla: "qué hay que entregar al alquilar",
      contexto:
        "Antes del contrato hay otro requisito que no es fiscal: alquilar a un inquilino nuevo exige certificado de eficiencia energética, y la calificación tiene que aparecer ya en el anuncio. Esto es",
    },
  ],
  "categoria:vivienda": [
    {
      href: "https://cambiodeuso.es/local-a-vivienda/",
      ancla: "cambio de uso de local a vivienda",
      contexto:
        "Un local no da derecho a estas deducciones mientras no sea legalmente una vivienda. El trámite que cambia eso es el",
    },
  ],
  "categoria:energia": [
    {
      href: "https://cambiodeuso.es/guias/eficiencia-energetica/",
      ancla: "eficiencia energética que exige un cambio de uso",
      contexto:
        "Si las obras forman parte de la conversión de un local en vivienda, además del IRPF hay que cumplir la",
    },
  ],
  "deduccion:E-11-eficiencia-energetica-03": [
    {
      href: "https://cambiodeuso.es/guias/cedula-de-habitabilidad/",
      ancla: "cédula de habitabilidad",
      contexto:
        "Esta deducción exige que el edificio tenga uso predominantemente residencial. Un local no lo tiene hasta completar el cambio de uso y obtener la",
    },
  ],
};

export function recursosPara(clave: string): RecursoExterno[] {
  return RECURSOS_EXTERNOS[clave] ?? [];
}
