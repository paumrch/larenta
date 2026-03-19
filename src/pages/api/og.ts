import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const prerender = false;

let fontBold: ArrayBuffer | null = null;
let fontRegular: ArrayBuffer | null = null;

async function loadFonts(siteUrl: string) {
  if (fontBold && fontRegular) return { fontBold, fontRegular };
  const [boldRes, regularRes] = await Promise.all([
    fetch(`${siteUrl}/fonts/PublicSans-ExtraBold.ttf`),
    fetch(`${siteUrl}/fonts/PublicSans-Regular.ttf`),
  ]);
  fontBold = await boldRes.arrayBuffer();
  fontRegular = await regularRes.arrayBuffer();
  return { fontBold, fontRegular };
}

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

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const { fontBold: bold, fontRegular: regular } = await loadFonts(origin);

  const title = sanitize((url.searchParams.get("title") || "Tu guía completa del IRPF").slice(0, 200));
  const subtitle = sanitize((url.searchParams.get("subtitle") || "").slice(0, 200));
  const badge = sanitize((url.searchParams.get("badge") || "").slice(0, 50));

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
          background: "linear-gradient(135deg, #00478b 0%, #005eb5 60%, #0070d4 100%)",
          padding: "60px",
          fontFamily: "Public Sans",
        },
        children: [
          // Top section — badge + title
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column", gap: "24px" },
              children: [
                // Badge (optional)
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
                                color: "#6e5c00",
                                fontSize: "18px",
                                fontWeight: 800,
                                padding: "6px 18px",
                                borderRadius: "999px",
                              },
                              children: badge,
                            },
                          },
                        ],
                      },
                    }
                  : null,
                // Title
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: title.length > 60 ? "42px" : title.length > 40 ? "50px" : "58px",
                      fontWeight: 800,
                      color: "#ffffff",
                      lineHeight: 1.15,
                      letterSpacing: "-0.03em",
                      maxWidth: "900px",
                    },
                    children: title,
                  },
                },
                // Subtitle (optional)
                subtitle
                  ? {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 400,
                          color: "rgba(255,255,255,0.7)",
                          lineHeight: 1.4,
                          maxWidth: "750px",
                        },
                        children: subtitle,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Bottom bar — logo + domain
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                // Logo
                {
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
                            fontSize: "36px",
                            fontWeight: 800,
                            color: "#ffffff",
                            letterSpacing: "-0.04em",
                          },
                          children: "LARENTA",
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: "36px",
                            fontWeight: 800,
                            color: "#fcd400",
                            letterSpacing: "-0.04em",
                          },
                          children: ".ES",
                        },
                      },
                    ],
                  },
                },
                // Tagline
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: "18px",
                      color: "rgba(255,255,255,0.45)",
                      fontWeight: 400,
                    },
                    children: "Datos oficiales AEAT",
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
          data: bold,
          weight: 800,
          style: "normal" as const,
        },
        {
          name: "Public Sans",
          data: regular,
          weight: 400,
          style: "normal" as const,
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const png = resvg.render().asPng();

  return new Response(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
};
