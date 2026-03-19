import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// ── Rate Limiting (in-memory, per serverless instance) ──────────────
// Limits: 100 requests/hour, 1000 requests/day (global, not per-IP)
// Note: in-memory counters reset on cold starts. This is a best-effort
// guard, not a hard guarantee — Resend's own limits are the final gate.
const HOUR_LIMIT = 100;
const DAY_LIMIT = 1000;

interface RateWindow {
  count: number;
  resetAt: number;
}

const hourWindow: RateWindow = { count: 0, resetAt: Date.now() + 3_600_000 };
const dayWindow: RateWindow = { count: 0, resetAt: Date.now() + 86_400_000 };

function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (now >= hourWindow.resetAt) {
    hourWindow.count = 0;
    hourWindow.resetAt = now + 3_600_000;
  }
  if (now >= dayWindow.resetAt) {
    dayWindow.count = 0;
    dayWindow.resetAt = now + 86_400_000;
  }

  if (dayWindow.count >= DAY_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((dayWindow.resetAt - now) / 1000) };
  }
  if (hourWindow.count >= HOUR_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((hourWindow.resetAt - now) / 1000) };
  }

  hourWindow.count++;
  dayWindow.count++;
  return { allowed: true };
}
// ── End Rate Limiting ───────────────────────────────────────────────

/** Escape HTML entities to prevent XSS in emails */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ReportPayload {
  email: string;
  ccaa: string;
  laboral: string;
  totalEstimado: number;
  totalDeducciones: number;
  topDeducciones: {
    nombre: string;
    porcentaje: string | null;
    estimado: number;
    categoria: string;
    url: string;
  }[];
  categorias: { nombre: string; total: number }[];
}

function buildEmailHtml(data: ReportPayload): string {
  const topRows = data.topDeducciones
    .slice(0, 10)
    .map(
      (d) => `
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: #141d23;">${escapeHtml(d.nombre)}</td>
        <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #00478b; text-align: right;">
          ${Number(d.estimado).toLocaleString("es-ES")} €
        </td>
      </tr>`
    )
    .join("");

  const catList = data.categorias
    .slice(0, 20)
    .map((c) => `<li style="margin: 4px 0;">${escapeHtml(c.nombre)}: ${Number(c.total)} deducciones</li>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f6faff;font-family:'Public Sans',system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#00478b;margin:0;letter-spacing:-0.04ch;">LARENTA<span style="color:#6e5c00;font-weight:800;">.ES</span></h1>
      <p style="font-size:13px;color:#424752;margin:4px 0 0;">Tu informe personalizado IRPF 2025</p>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#00478b 0%,#005eb5 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.6);margin:0 0 8px;">Ahorro máximo estimado</p>
      <p style="font-size:42px;font-weight:800;color:#fcd400;margin:0;">${data.totalEstimado.toLocaleString("es-ES")} €</p>
      <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:8px 0 0;">
        ${data.totalDeducciones} deducciones aplicables
      </p>
    </div>

    <!-- Top deducciones -->
    ${
      data.topDeducciones.length > 0
        ? `
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 32px rgba(20,29,35,0.05);margin-bottom:24px;">
      <div style="padding:16px 20px;background:#e0e9f2;">
        <h2 style="font-size:15px;font-weight:700;color:#00478b;margin:0;">Deducciones con mayor impacto</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${topRows}
      </table>
    </div>`
        : ""
    }

    <!-- Categorías -->
    <div style="background:#ffffff;border-radius:16px;padding:20px;box-shadow:0 2px 32px rgba(20,29,35,0.05);margin-bottom:24px;">
      <h2 style="font-size:15px;font-weight:700;color:#00478b;margin:0 0 12px;">Resumen por categoría</h2>
      <ul style="margin:0;padding:0 0 0 20px;color:#141d23;font-size:13px;line-height:1.8;">
        ${catList}
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://larenta.es/asistente" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#00478b,#005eb5);color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:9999px;">
        Ver mi informe completo →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:20px;border-top:1px solid #e0e9f2;">
      <p style="font-size:11px;color:#424752;margin:0;">
        Información orientativa basada en el Manual de la Renta 2025 — AEAT.<br>
        No constituye asesoramiento fiscal. Consulta siempre con un profesional.
      </p>
      <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">
        © ${new Date().getFullYear()} larenta.es
      </p>
    </div>
  </div>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limit check
    const rate = checkRateLimit();
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo más tarde." }),
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
      );
    }

    const body = (await request.json()) as ReportPayload;

    if (!body.email || !EMAIL_RE.test(body.email) || body.email.length > 254) {
      return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "larenta.es <informe@larenta.es>",
      to: body.email,
      subject: `Tu informe IRPF 2025 — ${body.totalDeducciones} deducciones aplicables`,
      html: buildEmailHtml(body),
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Error al enviar" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
