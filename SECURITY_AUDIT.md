# Auditoría de Seguridad — larenta.es

**Fecha:** Julio 2025  
**Alcance:** Sitio web larenta.es (Astro 6, Vercel, APIs serverless)  
**Auditor:** Revisión automatizada del código fuente completo  
**Estado:** Revisado y documentado

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Superficie de Ataque](#2-superficie-de-ataque)
3. [Endpoints de servidor (APIs)](#3-endpoints-de-servidor-apis)
4. [Almacenamiento y privacidad de datos](#4-almacenamiento-y-privacidad-de-datos)
5. [Variables de entorno y secretos](#5-variables-de-entorno-y-secretos)
6. [Protección contra XSS](#6-protección-contra-xss)
7. [Validación de entrada](#7-validación-de-entrada)
8. [Cabeceras HTTP de seguridad](#8-cabeceras-http-de-seguridad)
9. [RGPD y cumplimiento legal](#9-rgpd-y-cumplimiento-legal)
10. [Dependencias de terceros](#10-dependencias-de-terceros)
11. [Infraestructura (Vercel)](#11-infraestructura-vercel)
12. [Integridad de los datos](#12-integridad-de-los-datos)
13. [SSRF y consumo de recursos](#13-ssrf-y-consumo-de-recursos)
14. [Plan de Ejecución](#14-plan-de-ejecución)

---

## 1. Resumen Ejecutivo

larenta.es es un sitio web estático generado con Astro 6 y desplegado en Vercel. Contiene 375+ páginas de deducciones del IRPF 2025 generadas en build time, con dos endpoints serverless (`/api/og` y `/api/send-report`). No almacena ningún dato de usuario en servidor ni utiliza bases de datos.

### Nivel de riesgo global: **BAJO**

| Área | Riesgo | Estado |
|------|--------|--------|
| Almacenamiento de datos | ✅ Ninguno | Mitigado |
| Secretos/API keys | ✅ Protegido | Mitigado |
| XSS | ✅ Controlado | Mitigado |
| Validación de entrada | ✅ Implementada | Mitigado |
| Cabeceras HTTP | ⚠️ Parcial | Vercel defaults |
| RGPD / Cookies GTM | 🔴 Sin banner | Pendiente |
| Páginas legales | 🔴 Ausentes | Pendiente |
| Rate limiting | ⚠️ Sin implementar | Riesgo bajo |
| Dependencias | ✅ Actualizadas | Revisado |

---

## 2. Superficie de Ataque

### Arquitectura del sitio

```
                   ┌─────────────────────┐
                   │   Vercel Edge CDN   │
                   └──────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
 ┌────────▼────────┐ ┌───────▼───────┐ ┌────────▼────────┐
 │ Páginas estáticas│ │  /api/og      │ │ /api/send-report│
 │  (375+ HTML)     │ │  (Serverless) │ │  (Serverless)   │
 │  Build-time      │ │  GET → PNG    │ │  POST → Resend  │
 └─────────────────┘ └───────────────┘ └─────────────────┘
                                                │
                                         ┌──────▼──────┐
                                         │  Resend API │
                                         │  (email)    │
                                         └─────────────┘
```

### Puntos de entrada

| Punto de entrada | Tipo | Método | Riesgo |
|------------------|------|--------|--------|
| `/*` (páginas estáticas) | HTML estático | GET | Ninguno — ficheros generados en build |
| `/api/og` | Serverless Function | GET | Bajo — genera imagen PNG |
| `/api/send-report` | Serverless Function | POST | Medio — acepta datos del usuario |
| Google Tag Manager | Script tercero | - | Medio — carga scripts externos |
| Google Fonts | Recurso externo | GET | Bajo — solo carga tipografías |

### Componentes client-side (React Islands)

| Componente | Alcance | Datos sensibles |
|------------|---------|-----------------|
| `Wizard.tsx` | Cuestionario IRPF | No almacena, solo filtra client-side |
| `Explorer.tsx` | Filtrado de deducciones | No almacena |
| `Report.tsx` | Resultados + email/PDF | Envía email vía `/api/send-report` |

---

## 3. Endpoints de servidor (APIs)

### 3.1 `/api/og` — Generación de imágenes OG

**Archivo:** `src/pages/api/og.ts`  
**Método:** GET  
**Input:** Query params `title`, `subtitle`, `badge`  
**Output:** image/png (1200×630)

#### Controles implementados ✅

- **Sanitización de entrada:** Función `sanitize()` escapa `&`, `<`, `>`, `"` y elimina markdown (`**`, `*`)
- **Límite de longitud:** `title` y `subtitle` truncados a 200 chars, `badge` a 50 chars
- **Cache-Control:** `Cache-Control: public, max-age=31536000, immutable` — se cachea en CDN para reducir invocaciones
- **Sin acceso a filesystem:** Solo lee fonts desde URL pública (`/fonts/`)
- **Sin ejecución de código dinámico:** satori renderiza un árbol React-like a SVG, no ejecuta código arbitrario

#### Riesgos residuales

- **Consumo de recursos:** Cada invocación genera un PNG en memoria (~2-5 MB). Sin rate limiting, un atacante podría generar muchas peticiones con parámetros distintos para bypassear la caché. **Riesgo: Bajo** — Vercel tiene límites de invocación por cuenta.
- **Font loading:** Las fuentes se cargan desde la URL pública del propio sitio (`url.origin`). Si `url.origin` fuera manipulado, podría intentar cargar recursos de otro origen. **Riesgo: Muy bajo** — `url.origin` está controlado por Vercel.

### 3.2 `/api/send-report` — Envío de email

**Archivo:** `src/pages/api/send-report.ts`  
**Método:** POST  
**Input:** JSON body con datos del informe  
**Output:** JSON `{ ok: true }`

#### Controles implementados ✅

- **Validación de email:** Regex `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` + límite 254 chars
- **Escape HTML:** Función `escapeHtml()` escapa `&`, `<`, `>`, `"`, `'` en todos los campos renderizados en el HTML del email
- **Límite de arrays:** `topDeducciones.slice(0, 10)`, `categorias.slice(0, 20)` — previene payloads excesivamente grandes
- **Acceso a API key:** Usa `import.meta.env.RESEND_API_KEY` (solo disponible en servidor, no expuesta al cliente)
- **Error handling:** Captura y devuelve errores genéricos sin exponer detalles internos

#### Riesgos residuales

- **Sin rate limiting:** Un atacante podría enviar muchos emails a la misma dirección o a diferentes. **Riesgo: Medio**
  - *Mitigación parcial:* Resend tiene sus propios rate limits por dominio (100/day en plan gratuito)
  - *Recomendación:* Considerar añadir rate limiting por IP en Vercel Edge Middleware
- **Sin verificación de payload:** No se valida que `totalEstimado` o `totalDeducciones` sean números válidos. Un atacante podría enviar valores arbitrarios en el email. **Riesgo: Bajo** — solo afecta al contenido visual del email recibido por el propio atacante.
- **Sin CAPTCHA:** No hay protección contra envío automatizado. **Riesgo: Bajo-Medio** — dependiente del rate limit de Resend.

---

## 4. Almacenamiento y privacidad de datos

### Estado actual: ✅ NINGÚN ALMACENAMIENTO

| Aspecto | Estado |
|---------|--------|
| Base de datos | No existe |
| Cookies propias | No se establecen |
| LocalStorage | No se usa (datos no persistidos) |
| SessionStorage | No se usa |
| IndexedDB | No se usa |
| Server-side logging de datos personales | No — solo logs estándar de Vercel (IP, path, status) |

### Flujo de datos del usuario

```
Usuario → Wizard.tsx (responde preguntas) → Filtrado client-side → Resultados → [Opción: enviar email]
                                                                                        │
                                                                                  /api/send-report
                                                                                        │
                                                                                  Resend (email)
                                                                                        │
                                                                               Email → Usuario
                                                                               (datos NO guardados)
```

**Los datos del cuestionario (CCAA, situación laboral, situaciones familiares) nunca salen del navegador** excepto si el usuario solicita activamente el envío del email. Incluso en ese caso, el servidor solo reenvía los datos a Resend y no los almacena.

---

## 5. Variables de entorno y secretos

### Secretos activos

| Variable | Uso | Localización |
|----------|-----|--------------|
| `RESEND_API_KEY` | API key de Resend para envío de emails | Vercel Environment Variables (Production) |

### Protecciones ✅

- **`.env` en `.gitignore`:** El archivo `.env` local está excluido del repositorio
- **`import.meta.env`:** Astro no expone variables del servidor al bundle del cliente
- **Repositorio privado:** `paumrch/larenta` es un repositorio privado en GitHub
- **Vercel env vars:** La key de producción está configurada directamente en Vercel, no en el código
- **Sin API keys hardcodeadas:** No hay credenciales embebidas en el código fuente

### GTM y Analytics IDs (no son secretos)

| ID | Servicio | Riesgo |
|----|----------|--------|
| `GTM-P5HKM4NQ` | Google Tag Manager | Público — no sensible |
| `G-9BMRQTWEG5` | Google Analytics 4 | Público — no sensible |

---

## 6. Protección contra XSS

### Páginas estáticas: ✅ Seguro

Las 375+ páginas de deducciones se generan en build time con Astro. En Astro, las expresiones `{variable}` se escapan automáticamente. El único punto donde se inyecta HTML sin escapar es:

```astro
<!-- [id].astro -->
<Fragment set:html={contentHtml} />

<!-- guia/[slug].astro -->
<div class="prose-civic" set:html={contentHtml} />
```

Esto usa `marked.parse()` para renderizar markdown a HTML. **¿Es un riesgo?**

- **No en este caso:** El contenido viene de `data/deducciones.json` y `data/guias.json`, que son ficheros estáticos controlados por el equipo. No hay input de usuario en el markdown.
- **`marked` v17:** La versión 17 de marked NO sanitiza HTML por defecto. Si el JSON fuera comprometido, podría inyectar HTML/JS. Sin embargo, esto requeriría comprometer el repositorio o el build pipeline.
- *Recomendación:* Si se añade contenido generado por usuarios en el futuro, configurar marked con `{ sanitize: true }` o usar DOMPurify.

### API de email (`send-report.ts`): ✅ Seguro

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

Todos los campos del usuario (nombre de deducción, categoría) se escapan antes de insertarlos en el HTML del email. Esto previene inyección de HTML/JS en el email.

### OG Image API (`og.ts`): ✅ Seguro

La función `sanitize()` escapa HTML entities y elimina markdown. Satori no ejecuta JavaScript — solo renderiza un árbol de nodos a SVG. No hay riesgo de XSS en la imagen generada.

### React Islands: ✅ Seguro

React escapa automáticamente todas las expresiones JSX. No se usa `dangerouslySetInnerHTML` en ningún componente React.

---

## 7. Validación de entrada

### `/api/send-report` — Validación de email

```typescript
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

if (!body.email || !EMAIL_RE.test(body.email) || body.email.length > 254) {
  return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400 });
}
```

✅ Válido: regex razonable + límite de longitud.

### `/api/og` — Validación de parámetros

```typescript
const title = sanitize((url.searchParams.get("title") || "Tu guía completa del IRPF").slice(0, 200));
const subtitle = sanitize((url.searchParams.get("subtitle") || "").slice(0, 200));
const badge = sanitize((url.searchParams.get("badge") || "").slice(0, 50));
```

✅ Válido: truncado + sanitización.

### Client-side (Wizard.tsx)

El wizard usa un sistema de pasos con opciones predefinidas. No hay campos de texto libre; el usuario solo selecciona entre opciones. Los datos nunca se envían al servidor excepto en el flujo de email.

---

## 8. Cabeceras HTTP de seguridad

### Estado actual: ⚠️ PARCIAL

Vercel establece automáticamente:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (para Vercel deployments)
- `Strict-Transport-Security` (HTTPS forzado)

### Cabeceras recomendadas NO configuradas

| Cabecera | Propósito | Riesgo de ausencia |
|----------|-----------|-------------------|
| `Content-Security-Policy` | Restringe orígenes de scripts/styles | Medio — GTM carga scripts dinámicos |
| `Permissions-Policy` | Deshabilita APIs del navegador no usadas | Bajo |
| `Referrer-Policy` | Controla qué info se envía como referer | Bajo |

### Recomendación

Para un sitio informativo sin login, la ausencia de CSP es un riesgo **bajo**. Si se desea implementar, hay que tener en cuenta que GTM inyecta scripts dinámicos, lo que complica la política CSP (requiere `unsafe-inline` o nonces).

**Configuración sugerida en `vercel.json`:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

> **Nota:** No se incluye CSP porque GTM es incompatible con políticas estrictas sin un proxy o server-side GTM.

---

## 9. RGPD y cumplimiento legal

### Estado actual: 🔴 INCOMPLETO

#### Problemas identificados

| Issue | Severidad | Detalle |
|-------|-----------|---------|
| Sin banner de cookies | 🔴 **Crítico** | GTM + GA4 establecen cookies de tracking sin consentimiento |
| Sin política de privacidad | 🔴 **Crítico** | Obligatorio según RGPD Art. 13 |
| Sin aviso legal | 🔴 **Crítico** | Obligatorio en España (LSSI, Art. 10) |
| Sin política de cookies | 🔴 **Crítico** | Obligatorio con cookies no esenciales (RGPD + LSSI) |
| Sin mecanismo de consentimiento | 🔴 **Crítico** | Las cookies de GA4/GTM requieren consentimiento previo explícito |

#### Cookies establecidas por GTM/GA4

| Cookie | Propósito | Duración | Tipo |
|--------|-----------|----------|------|
| `_ga` | Identificación de usuario GA4 | 2 años | No esencial (analytics) |
| `_ga_*` | Estado de sesión GA4 | 2 años | No esencial (analytics) |
| `_gid` | Identificación de sesión | 24 horas | No esencial (analytics) |

### Plan de corrección

1. **Implementar consentimiento de cookies** (CMP):
   - Opción A: Google Consent Mode v2 (integrado con GTM)
   - Opción B: CMP de terceros (Cookiebot, CookieYes)
   - **La solución más rápida:** Configurar Google Consent Mode v2 en GTM para que las cookies de analytics solo se establezcan tras consentimiento explícito

2. **Crear páginas legales:**
   - `/privacidad` — Política de privacidad
   - `/legal` — Aviso legal
   - `/cookies` — Política de cookies
   - Enlazar desde el footer

3. **Email marketing (Resend):**
   - El email solo se envía cuando el usuario lo solicita explícitamente (no hay suscripción)
   - No se usa para newsletters ni email recurrente
   - ✅ Esto NO requiere doble opt-in, ya que es un email transaccional solicitado por el usuario

---

## 10. Dependencias de terceros

### Dependencias del proyecto (`package.json`)

| Paquete | Versión | Vulnerabilidades conocidas | Riesgo |
|---------|---------|---------------------------|--------|
| astro | ^6.0.6 | Ninguna conocida | ✅ |
| react | ^19.2.4 | Ninguna conocida | ✅ |
| react-dom | ^19.2.4 | Ninguna conocida | ✅ |
| @astrojs/react | ^5.0.1 | Ninguna conocida | ✅ |
| @astrojs/sitemap | ^3.7.1 | Ninguna conocida | ✅ |
| @astrojs/vercel | ^10.0.1 | Ninguna conocida | ✅ |
| tailwindcss | ^4.2.2 | Ninguna conocida | ✅ |
| @tailwindcss/vite | ^4.2.2 | Ninguna conocida | ✅ |
| marked | ^17.0.4 | Ninguna conocida (no sanitiza por defecto, ver §6) | ✅ |
| satori | ^0.25.0 | Ninguna conocida | ✅ |
| @resvg/resvg-js | ^2.6.2 | Ninguna conocida | ✅ |
| resend | ^6.9.4 | Ninguna conocida | ✅ |
| jspdf | ^4.2.1 | Ninguna conocida | ✅ |
| html2canvas-pro | ^2.0.2 | Ninguna conocida | ✅ |

### Servicios externos

| Servicio | Propósito | Datos compartidos | Riesgo |
|----------|-----------|-------------------|--------|
| Vercel | Hosting + CDN | Logs de acceso (IP, path, timestamp) | Bajo |
| Google Fonts | Tipografías | IP del visitante | Bajo |
| Google Analytics 4 | Analytics | Cookies, comportamiento de navegación | Medio |
| Google Tag Manager | Gestión de tags | Depende de los tags configurados | Medio |
| Resend | Email transaccional | Email del usuario + contenido del informe | Bajo |

### Recomendación sobre Google Fonts

Se cargan desde el CDN de Google (`fonts.googleapis.com`). Esto envía la IP del visitante a Google con cada carga de página. Para máxima conformidad RGPD, se podrían auto-hospedar las fuentes (ya tenemos los TTF en `/fonts/` para la OG image). **Riesgo: Bajo** — la mayoría de sitios en España usan Google Fonts sin problemas regulatorios.

---

## 11. Infraestructura (Vercel)

### Configuración actual

- **Output:** `static` (pre-renderizado en build)
- **Adapter:** `@astrojs/vercel` (solo para las 2 funciones serverless)
- **Framework:** Astro 6
- **Región:** Auto (Vercel selecciona la más cercana)
- **HTTPS:** Forzado por defecto en Vercel

### Protecciones inherentes de Vercel ✅

- **DDoS mitigation:** Incluido en todos los planes
- **Automatic HTTPS:** Certificados TLS gestionados automáticamente
- **Edge caching:** Los assets estáticos se sirven desde el edge CDN
- **Serverless isolation:** Cada invocación de función se ejecuta en un contenedor aislado
- **Rate limiting nativo:** Vercel tiene límites de invocación por proyecto (soft limits en plan Hobby)

### Configuración de dominio

- **Dominio:** `www.larenta.es`
- **Redirect:** `larenta.es` → `www.larenta.es` (configurado en Vercel)
- **DNS:** Gestionado vía Vercel

---

## 12. Integridad de los datos

### Origen de datos

Los datos de deducciones provienen del **Manual Práctico de la Renta 2025 de la AEAT** (Agencia Tributaria). Se extrajeron y procesaron en un pipeline separado y se almacenan como archivos JSON estáticos en `data/`.

### Archivos de datos

| Archivo | Registros | Hash check |
|---------|-----------|------------|
| `data/deducciones.json` | 375 deducciones completas | No implementado |
| `data/explorer_index.json` | 375 fichas (sin contenido_md) | No implementado |
| `data/wizard_index.json` | 375 fichas para el wizard | No implementado |
| `data/stats.json` | Estadísticas agregadas | No implementado |
| `data/guias.json` | 8 guías temáticas | No implementado |

### Protecciones ✅

- **Build-time only:** Los datos se leen en build time y se embeben en el HTML estático. No hay endpoint que exponga los JSON directamente.
- **Repositorio privado:** Los JSON están en un repositorio privado de GitHub
- **Sin modificación runtime:** No existe mecanismo para modificar los datos en producción

### Recomendación

Considerar añadir checksums SHA-256 de los JSON en el build pipeline para detectar modificaciones inesperadas. **Prioridad: Baja** — el riesgo actual es mínimo dado que el repositorio es privado y el build pipeline es controlado.

---

## 13. SSRF y consumo de recursos

### Análisis de SSRF

| Punto | Riesgo | Detalle |
|-------|--------|--------|
| `/api/og` font loading | Bajo | `loadFonts(origin)` usa `url.origin` controlado por Vercel. No acepta URLs arbitrarias. |
| `/api/send-report` | Ninguno | No realiza requests a URLs externas (solo llama a la API de Resend con el SDK) |
| `marked.parse()` | Ninguno | Solo transforma markdown a HTML, no hace fetch |

### Consumo de recursos

- **`/api/og`:** Genera un PNG de ~30-100KB por invocación. La caché CDN de 1 año mitiga el riesgo de abuso.
- **`/api/send-report`:** Cada invocación envía un email vía Resend. Rate limited por Resend (100/day plan free, 3000/day plan Pro).
- **Build time:** El build genera 375+ páginas HTML. Esto solo afecta al CI/CD, no a producción.

---

## 14. Plan de Ejecución

### Prioridad CRÍTICA (Pre-requisito legal) 🔴

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Implementar consentimiento de cookies (Google Consent Mode v2 en GTM) | 2-4h | Legal |
| 2 | Crear página `/privacidad` — Política de privacidad RGPD | 1-2h | Legal |
| 3 | Crear página `/legal` — Aviso legal LSSI | 1-2h | Legal |
| 4 | Crear página `/cookies` — Política de cookies | 1-2h | Legal |
| 5 | Añadir enlaces a páginas legales en el footer | 15min | Legal |

### Prioridad ALTA (Hardening recomendado) ⚠️

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 6 | Añadir cabeceras de seguridad en `vercel.json` | 30min | Security |
| 7 | Considerar rate limiting vía Vercel Edge Middleware para `/api/send-report` | 1-2h | Security |
| 8 | Auto-hospedar Google Fonts (alternativa a CDN externo) | 30min | Privacy |

### Prioridad MEDIA (Mejoras opcionales) 💡

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 9 | Configurar `marked` con sanitización si se añade contenido de terceros | 15min | Security |
| 10 | Añadir checksums de datos al build pipeline | 30min | Integrity |
| 11 | Monitorizazción de `npm audit` en CI | 15min | Dependencies |

### Prioridad BAJA (Best practices a futuro) 📋

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 12 | Implementar CSP con nonces (requiere server-side GTM) | 4-8h | Security |
| 13 | Añadir CAPTCHA al flujo de email | 1-2h | Anti-abuse |
| 14 | Logging centralizado de invocaciones API | 1-2h | Monitoring |

---

## Conclusión

larenta.es tiene una superficie de ataque **reducida** gracias a su arquitectura estática. Los dos endpoints serverless están razonablemente protegidos con validación de entrada, sanitización HTML y gestión segura de secretos.

Las **únicas deficiencias críticas son de cumplimiento legal** (RGPD/LSSI), no de seguridad técnica. La implementación del consentimiento de cookies y las páginas legales es el paso más urgente.

El código fuente no presenta vulnerabilidades de la OWASP Top 10 activas. Las recomendaciones de hardening (cabeceras HTTP, rate limiting) son mejoras incrementales, no correcciones de vulnerabilidades existentes.
