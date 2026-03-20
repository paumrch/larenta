import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const prerender = false;

let fontBold: ArrayBuffer | null = null;
let fontRegular: ArrayBuffer | null = null;
let logoDataUri: string | null = null;

async function loadAssets(siteUrl: string) {
  if (fontBold && fontRegular && logoDataUri) {
    return { fontBold, fontRegular, logoDataUri };
  }
  const [boldRes, regularRes, logoRes] = await Promise.all([
    fetch(`${siteUrl}/fonts/PublicSans-ExtraBold.ttf`),
    fetch(`${siteUrl}/fonts/PublicSans-Regular.ttf`),
    fetch(`${siteUrl}/LRwhite.svg`),
  ]);
  fontBold = await boldRes.arrayBuffer();
  fontRegular = await regularRes.arrayBuffer();

  // Pre-render SVG logo to PNG (satori can't handle SVGs with <style> tags)
  const svgText = await logoRes.text();
  const cleanSvg = svgText
    .replace(/<defs>[\s\S]*?<\/defs>/, "")
    .replace(/class="cls-1"/g, 'fill="#ffffff"');
  const logoResvg = new Resvg(cleanSvg, { fitTo: { mode: "height", value: 120 } });
  const logoPng = logoResvg.render().asPng();
  logoDataUri = `data:image/png;base64,${Buffer.from(logoPng).toString("base64")}`;

  return { fontBold, fontRegular, logoDataUri };
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
  const { fontBold: bold, fontRegular: regular, logoDataUri: logo } = await loadAssets(origin);

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
          background: "#00478b",
          fontFamily: "Public Sans",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // Background: subtle geometric shapes (bottom-right)
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
          // Gold accent bar (top)
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
          // Content
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
                // Top: badge + title + subtitle
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
                              style: { display: "flex", alignItems: "center" },
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
                            fontSize: title.length > 80 ? "38px" : title.length > 55 ? "44px" : title.length > 35 ? "52px" : "58px",
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
                // Bottom: logo + tagline
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
                          src: logo,
                          width: 206,
                          height: 32,
                          style: {
                            width: "206px",
                            height: "32px",
                          },
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
