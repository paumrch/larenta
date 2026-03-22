import type { APIRoute, GetStaticPaths } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import {
  getAllDeducciones,
  getDeduccionesByCCAA,
  getDeduccionesByCategoria,
  getStats,
} from "../../lib/data";
import {
  CCAA_MAP,
  CCAA_SLUG,
  CATEGORIA_LABELS,
  cleanName,
} from "../../lib/types";
import guiasData from "../../../data/guias.json";

export const prerender = true;

// ── Assets (read once at build time) ────────────────────────────────
const root = process.cwd();
const fontBold = readFileSync(join(root, "public/fonts/PublicSans-ExtraBold.ttf"));
const fontRegular = readFileSync(join(root, "public/fonts/PublicSans-Regular.ttf"));

const logoSvg = readFileSync(join(root, "public/LRwhite.svg"), "utf-8");
const cleanSvg = logoSvg
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/class="cls-1"/g, 'fill="#ffffff"');
const logoResvg = new Resvg(cleanSvg, {
  fitTo: { mode: "height", value: 120 },
});
const logoPng = logoResvg.render().asPng();
const logoDataUri = `data:image/png;base64,${Buffer.from(logoPng).toString("base64")}`;

const WIDTH = 1200;
const HEIGHT = 630;

function sanitize(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

// ── All OG image entries ────────────────────────────────────────────
interface OgEntry {
  slug: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

function buildEntries(): OgEntry[] {
  const stats = getStats();
  const deducciones = getAllDeducciones();
  const entries: OgEntry[] = [];

  // Fixed pages
  entries.push({
    slug: "home",
    title: "Descubre todas las deducciones del IRPF",
    subtitle: `${stats.total_deducciones} deducciones estatales y autonómicas explicadas de forma clara`,
  });
  entries.push({
    slug: "asistente",
    title: "Asistente de deducciones",
    subtitle: "Descubre qué deducciones puedes aplicar en tu declaración",
  });
  entries.push({
    slug: "explorador",
    title: "Explorador de deducciones",
    subtitle: `Busca y filtra ${deducciones.length} deducciones del IRPF`,
    badge: `${deducciones.length} deducciones`,
  });
  entries.push({
    slug: "novedades",
    title: "Novedades IRPF 2025",
    subtitle: `${stats.novedades_2025} deducciones nuevas o modificadas`,
  });
  entries.push({
    slug: "elproyecto",
    title: "Sobre este proyecto",
    badge: "larenta.es",
    subtitle: "Quién está detrás y por qué existe",
  });
  entries.push({
    slug: "guia",
    title: "Guía IRPF 2025",
    subtitle: "Renta explicada paso a paso",
  });

  // Guías
  for (const guia of guiasData as { slug: string; titulo: string }[]) {
    entries.push({
      slug: `guia-${guia.slug}`,
      title: guia.titulo,
      badge: "Guía IRPF",
    });
  }

  // Deducciones
  for (const d of deducciones) {
    entries.push({
      slug: `deduccion-${d.id}`,
      title: cleanName(d.nombre),
      badge: d.tipo === "estatal" ? "Estatal" : d.comunidad,
    });
  }

  // Comunidades
  for (const [codigo, slug] of Object.entries(CCAA_SLUG)) {
    const ccaaName = CCAA_MAP[codigo];
    const deds = getDeduccionesByCCAA(codigo);
    entries.push({
      slug: `comunidad-${slug}`,
      title: `Deducciones IRPF ${ccaaName}`,
      subtitle: `${deds.length} deducciones · Campaña 2025`,
    });
  }

  // Categorías
  const categorias = [
    "familia", "vivienda", "educacion", "salud", "empresa",
    "donativos", "energia", "movilidad", "otros",
  ];
  for (const cat of categorias) {
    const label = CATEGORIA_LABELS[cat] || cat;
    const labelTexto = label.replace(/^[^\s]+\s/, "");
    const deds = getDeduccionesByCategoria(cat);
    const totalCCAA = new Set(
      deds.filter((d) => d.tipo === "autonomica").map((d) => d.codigo_ccaa),
    ).size;
    entries.push({
      slug: `categoria-${cat}`,
      title: `Deducciones ${labelTexto} IRPF 2025`,
      subtitle: `${deds.length} deducciones · ${totalCCAA} comunidades`,
    });
  }

  return entries;
}

export const getStaticPaths: GetStaticPaths = () => {
  return buildEntries().map((e) => ({
    params: { slug: e.slug },
    props: { title: e.title, subtitle: e.subtitle || "", badge: e.badge || "" },
  }));
};

// ── Render ───────────────────────────────────────────────────────────
export const GET: APIRoute = async ({ props }) => {
  const title = sanitize(
    ((props.title as string) || "Tu guía completa del IRPF").slice(0, 200),
  );
  const subtitle = sanitize(((props.subtitle as string) || "").slice(0, 200));
  const badge = sanitize(((props.badge as string) || "").slice(0, 50));

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#00478b",
          fontFamily: "Public Sans",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-80px",
                right: "-80px",
                width: "500px",
                height: "500px",
                borderRadius: "80px",
                background: "rgba(255,255,255,0.03)",
                transform: "rotate(15deg)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-40px",
                right: "60px",
                width: "300px",
                height: "300px",
                borderRadius: "60px",
                background: "rgba(255,255,255,0.025)",
                transform: "rotate(30deg)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                height: "5px",
                background: "#fcd400",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                padding: "56px 64px 48px 64px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    },
                    children: [
                      badge
                        ? {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                              },
                              children: [
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      background: "#fcd400",
                                      color: "#3d3200",
                                      fontSize: "16px",
                                      fontWeight: 800,
                                      padding: "5px 16px",
                                      borderRadius: "6px",
                                      letterSpacing: "0.02em",
                                      textTransform: "uppercase" as const,
                                    },
                                    children: badge,
                                  },
                                },
                              ],
                            },
                          }
                        : null,
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize:
                              title.length > 80
                                ? "38px"
                                : title.length > 55
                                  ? "44px"
                                  : title.length > 35
                                    ? "52px"
                                    : "58px",
                            fontWeight: 800,
                            color: "#ffffff",
                            lineHeight: 1.12,
                            letterSpacing: "-0.03em",
                            maxWidth: "850px",
                          },
                          children: title,
                        },
                      },
                      subtitle
                        ? {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "22px",
                                fontWeight: 400,
                                color: "rgba(255,255,255,0.55)",
                                lineHeight: 1.45,
                                maxWidth: "700px",
                              },
                              children: subtitle,
                            },
                          }
                        : null,
                    ].filter(Boolean),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      paddingTop: "24px",
                    },
                    children: [
                      {
                        type: "img",
                        props: {
                          src: logoDataUri,
                          width: 206,
                          height: 32,
                          style: { width: "206px", height: "32px" },
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#fcd400",
                                },
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  fontSize: "16px",
                                  color: "rgba(255,255,255,0.4)",
                                  fontWeight: 400,
                                  letterSpacing: "0.02em",
                                },
                                children: "Datos oficiales AEAT · IRPF 2025",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Public Sans",
          data: fontBold,
          weight: 800,
          style: "normal" as const,
        },
        {
          name: "Public Sans",
          data: fontRegular,
          weight: 400,
          style: "normal" as const,
        },
      ],
    },
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
