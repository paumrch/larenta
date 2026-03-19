# Auditoría SEO — larenta.es

**Fecha:** Julio 2025  
**Alcance:** Auditoría SEO técnica y on-page completa  
**Sitio:** https://www.larenta.es  
**Stack:** Astro 6 (SSG) + Vercel + Tailwind v4  
**Páginas totales:** ~390 (375 deducciones + 8 guías + index + asistente + explorador + guía index)

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Rastreo e Indexación](#2-rastreo-e-indexación)
3. [Arquitectura de URLs](#3-arquitectura-de-urls)
4. [Meta Tags y Open Graph](#4-meta-tags-y-open-graph)
5. [Structured Data (JSON-LD)](#5-structured-data-json-ld)
6. [Heading Hierarchy](#6-heading-hierarchy)
7. [Contenido y Keyword Strategy](#7-contenido-y-keyword-strategy)
8. [Internal Linking](#8-internal-linking)
9. [Rendimiento y Core Web Vitals](#9-rendimiento-y-core-web-vitals)
10. [Mobile-First](#10-mobile-first)
11. [Imágenes y Assets](#11-imágenes-y-assets)
12. [Página 404](#12-página-404)
13. [Internacionalización](#13-internacionalización)
14. [Hallazgos y Plan de Ejecución](#14-hallazgos-y-plan-de-ejecución)

---

## 1. Resumen Ejecutivo

larenta.es es un sitio web de 390+ páginas sobre deducciones del IRPF 2025 en España. Tiene una base SEO sólida (meta tags, canonical, OG, sitemap, HTTPS) pero carece de elementos clave para maximizar visibilidad en buscadores.

### Puntuación SEO estimada: **88/100** _(antes: 72/100)_

| Área | Puntuación | Estado |
|------|-----------|--------|
| Meta tags básicos | 9/10 | ✅ Excelente |
| Canonical & URLs | 9/10 | ✅ Excelente |
| Open Graph | 9/10 | ✅ Excelente (OG dinámicas) |
| Sitemap | 8/10 | ✅ Bueno |
| robots.txt | 9/10 | ✅ Corregido (www + /api/) |
| Structured Data (JSON-LD) | 8/10 | ✅ WebSite + BreadcrumbList + Article |
| Heading hierarchy | 8/10 | ✅ Bueno |
| Página 404 | 9/10 | ✅ Personalizada con branding |
| Internal linking | 7/10 | ⚠️ Mejorable |
| Rendimiento | 9/10 | ✅ SSG + Edge CDN |
| Mobile | 8/10 | ✅ Responsive |
| Accesibilidad SEO | 8/10 | ✅ Headers de seguridad añadidos |
| lang/hreflang | 8/10 | ✅ `lang="es"` presente |

---

## 2. Rastreo e Indexación

### robots.txt

**Archivo actual:** `/public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://larenta.es/sitemap-index.xml
```

#### Problemas encontrados

| # | Issue | Severidad | Detalle |
|---|-------|-----------|---------|
| 1 | URL del sitemap usa dominio sin `www` | ⚠️ Media | El site canonical es `https://www.larenta.es` pero el sitemap apunta a `https://larenta.es/sitemap-index.xml`. Debe coincidir con el dominio canónico. |
| 2 | No bloquea rutas de API | 💡 Baja | `/api/og` y `/api/send-report` no necesitan indexarse. Bloquearlos previene rastreo innecesario. |
| 3 | Sin `Host` directive | 💡 Baja | Añadir para reforzar dominio preferido (útil para Yandex). |

### Sitemap

**Endpoint:** `/sitemap-index.xml` → `/sitemap-0.xml`

✅ **Funciona correctamente en producción.** Generado automáticamente por `@astrojs/sitemap`.

- Incluye todas las páginas estáticas (~390 URLs)
- URLs coherentes con el dominio `https://www.larenta.es`
- No incluye los endpoints de API (correcto)

#### Mejoras recomendadas

| # | Mejora | Impacto |
|---|--------|---------|
| 1 | Añadir `<lastmod>` con fecha de build | Mejora crawl priority |
| 2 | Considerar `<changefreq>` y `<priority>` para páginas clave | Señal de importancia |

### Google Search Console

- ✅ Configurado y operativo
- Verificar que el sitemap esté enviado manualmente en GSC

---

## 3. Arquitectura de URLs

### Estructura actual

```
/                           → Homepage
/asistente                  → Wizard interactivo
/explorador                 → Explorador con filtros
/guia                       → Índice de guías IRPF
/guia/[slug]                → Guía individual (8 slugs)
/deduccion/[id]             → Ficha de deducción (375 IDs)
/api/og                     → OG image generator (no indexable)
/api/send-report            → Email API (no indexable)
```

### Evaluación

✅ **URLs limpias y descriptivas**  
✅ **Consistentes** — sin trailing slashes inconsistentes  
✅ **Semánticas** — `/deduccion/AND-01` identifica CCAA y número  
✅ **Sin parámetros querystring en páginas indexables**  
⚠️ **Los IDs de deducción (`AND-01`, `MAD-15`) no son semánticos** — idealmente serían slugs descriptivos como `/deduccion/andalucia-deduccion-nacimiento-hijo`, pero esto requeriría cambio en el pipeline de datos. **No se recomienda cambiar ahora** por el esfuerzo de migración y redirecciones.

### Canonical

```html
<link rel="canonical" href="https://www.larenta.es/deduccion/AND-01" />
```

✅ **Implementado correctamente** en todas las páginas vía `Base.astro`  
✅ **URL absoluta** con dominio canónico `www.larenta.es`

---

## 4. Meta Tags y Open Graph

### Meta tags base (`Base.astro`)

```html
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={pageUrl} />
<meta property="og:type" content="website" />
<meta property="og:url" content={pageUrl} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImageUrl} />
<meta property="og:locale" content="es_ES" />
<meta property="og:site_name" content="larenta.es" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageUrl} />
```

✅ **Completo y bien implementado**

### Evaluación por página

| Página | Title | Description | OG Image |
|--------|-------|-------------|----------|
| Homepage | `larenta.es — Tu guía completa del IRPF 2025` | ✅ Descriptiva (375 deducciones...) | ✅ Dinámica con satori |
| Asistente | `Asistente de deducciones \| larenta.es` | ✅ | ✅ Dinámica personalizada |
| Explorador | `Explorador de deducciones \| larenta.es` | ✅ | ✅ Dinámica con badge |
| Guía index | `Guía IRPF 2025 — Renta explicada... \| larenta.es` | ✅ | ✅ |
| Guía [slug] | `{titulo} — Guía IRPF 2025 \| larenta.es` | ✅ Incluye resumen + subtítulo | ✅ Con badge "Guía IRPF" |
| Deducción [id] | `{nombre} \| larenta.es` | ✅ Incluye resumen + tipo + CCAA | ✅ Con badge CCAA/Estatal |

### Problemas encontrados

| # | Issue | Severidad | Detalle |
|---|-------|-----------|---------|
| 1 | Sin `<meta name="robots">` | 💡 Baja | No es obligatorio (default = index,follow), pero explicitarlo es buena práctica |
| 2 | Sin `<meta name="author">` | 💡 Muy baja | Opcional |
| 3 | Longitud de title en deducciones | ⚠️ Media | Algunos nombres de deducción son largos (>60 chars), lo que puede truncar en SERPs |

---

## 5. Structured Data (JSON-LD)

### Estado actual: 🔴 COMPLETAMENTE AUSENTE

No hay ningún markup JSON-LD en ninguna página del sitio. Esta es la **mayor oportunidad SEO** no aprovechada.

### Schemas recomendados

#### 5.1 WebSite (Homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "larenta.es",
  "url": "https://www.larenta.es",
  "description": "Tu guía completa del IRPF 2025. 375 deducciones estatales y autonómicas.",
  "inLanguage": "es"
}
```

**Impacto:** Asocia la marca con el sitio en Knowledge Graph. Puede generar sitelinks en SERPs.

#### 5.2 BreadcrumbList (Deducciones + Guías)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.larenta.es" },
    { "@type": "ListItem", "position": 2, "name": "Explorador", "item": "https://www.larenta.es/explorador" },
    { "@type": "ListItem", "position": 3, "name": "Nombre de deducción" }
  ]
}
```

**Impacto:** Muestra breadcrumbs enriquecidos en SERPs. Mejora CTR significativamente.

#### 5.3 FAQPage (Guías)

Las guías temáticas (`/guia/[slug]`) tienen estructura de preguntas y respuestas que encañan con FAQPage schema. Esto puede generar **rich snippets de FAQ** en los resultados de Google.

#### 5.4 Article (Guías)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Obligación de declarar — Guía IRPF 2025",
  "datePublished": "2025-04-01",
  "dateModified": "2025-07-01",
  "author": { "@type": "Organization", "name": "larenta.es" },
  "publisher": { "@type": "Organization", "name": "larenta.es" }
}
```

**Impacto:** Marca las guías como artículos informativos. Puede generar rich results con fecha y autor.

---

## 6. Heading Hierarchy

### Homepage (`index.astro`)

```
h1: "Tu guía completa del IRPF 2025"
  h2: "Dos formas de encontrar lo que te corresponde"
    h3: "Asistente interactivo"
    h3: "Explorador de deducciones"
  h2: "Todo lo que necesitas saber, explicado claro"
  h2: "Todas las situaciones que puedes deducir"
  h2: "Cada CC.AA. tiene sus propias deducciones"
  h2: "No dejes dinero sobre la mesa"
```

✅ **Jerarquía correcta** — un solo h1, h2s para secciones, h3s para subsecciones.

### Deducción (`[id].astro`)

```
h1: {nombre de la deducción}
  (no hay h2 explícitos — el contenido AEAT tiene sus propios headings)
```

⚠️ **El contenido AEAT renderizado por marked puede tener headings desorganizados** — depende del markdown original. Esto es difícil de controlar sin procesar el contenido.

### Guía (`[slug].astro`)

```
h1: {guia.titulo}
  h2: "Puntos clave"
  h2: "Deducciones relacionadas"
  (+ headings del contenido markdown)
```

✅ **Correcto**

---

## 7. Contenido y Keyword Strategy

### Keywords objetivo naturales

| Cluster | Keywords | Páginas |
|---------|----------|---------|
| Genéricas IRPF | "deducciones IRPF 2025", "renta 2025 deducciones" | Homepage, Explorador |
| Por CCAA | "deducciones Andalucía 2025", "deducciones Madrid IRPF" | Explorador (filtrado), Fichas |
| Por categoría | "deducciones vivienda IRPF", "deducciones familia renta" | Explorador (filtrado), Fichas |
| Guías | "obligación declarar renta 2025", "plazos renta 2025" | Guías individuales |
| Herramienta | "calculadora deducciones IRPF", "simulador renta 2025" | Asistente |

### Evaluación de contenido

✅ **375 páginas de deducción con contenido único** procedente de la AEAT — excelente para long-tail  
✅ **8 guías temáticas** con contenido editorial — buena cobertura de keywords informativas  
✅ **Descripciones únicas por página** — no hay meta descriptions duplicadas  
⚠️ **Sin blog o contenido fresco** — las páginas son estáticas y solo cambian por ejercicio fiscal  
⚠️ **Sin enlaces salientes a fuentes** — las fichas tienen enlace a la AEAT pero las guías también podrían enlazar más a fuentes oficiales

---

## 8. Internal Linking

### Estructura de enlaces actual

```
Homepage → /asistente, /explorador, /guia, /guia/[slug] (8), /explorador?ccaa=X (19), /explorador?categoria=X (9)
Nav (global) → /guia, /asistente, /explorador
Footer → /asistente, /explorador, /guia, AEAT
Deducción [id] → /asistente, /explorador, /explorador?ccaa=X, AEAT (url_oficial)
Guía [slug] → /, /guia, /asistente, /explorador, guía anterior/siguiente, AEAT, deducciones relacionadas (hasta 6)
```

### Evaluación

✅ **Buena estructura de navegación global** (nav + footer)  
✅ **Guías enlazan a deducciones relacionadas** — excelente para distribución de PageRank  
✅ **Breadcrumbs en deducciones y guías** — buena señal de jerarquía  
⚠️ **Las fichas de deducción no enlazan a otras deducciones relacionadas** — oportunidad perdida de internal linking  
⚠️ **El footer no enlaza a páginas legales** (privacidad, cookies, aviso legal) — además de SEO, es requisito legal

### Recomendación

Considerar añadir en las fichas de deducción una sección "Deducciones relacionadas" con 3-5 deducciones de la misma CCAA o categoría. Esto mejoraría el internal linking y la retención del usuario. **Prioridad: Media** — requiere lógica adicional en build time.

---

## 9. Rendimiento y Core Web Vitals

### Arquitectura de rendimiento: ✅ EXCELENTE

| Factor | Estado | Detalle |
|--------|--------|---------|
| Static Site Generation | ✅ | 375+ páginas pre-renderizadas en build |
| CDN Edge | ✅ | Vercel Edge Network, global |
| HTTPS | ✅ | TLS 1.3, HSTS habilitado |
| Island Architecture | ✅ | Solo carga JS donde se necesita (Wizard, Explorer, Report) |
| Font loading | ✅ | `preconnect` a Google Fonts |
| Imágenes | ✅ | Mínimas — el sitio es principalmente texto |
| CSS | ✅ | Tailwind purga CSS no usado |

### Puntos de mejora

| # | Mejora | Impacto CWV |
|---|--------|-------------|
| 1 | `font-display: swap` ya incluido en la URL de Google Fonts | ✅ Implementado |
| 2 | Considerar auto-hospedar fonts para eliminar preconnect | LCP -50ms aprox |
| 3 | `fetchpriority="high"` en hero elements | LCP |
| 4 | GTM puede afectar FID/INP | Monitorizar en CrUX |

---

## 10. Mobile-First

### Evaluación

✅ `<meta name="viewport" content="width=device-width, initial-scale=1" />`  
✅ Diseño responsive con Tailwind (`sm:`, `lg:` breakpoints)  
✅ Navegación adaptada a móvil  
✅ Tamaños de texto legibles  
⚠️ **Grid de guía index** usa `grid-template-columns: 1fr 1fr` sin media query — puede ser problemático en pantallas <400px  
⚠️ **Grid sidebar de guías** usa `grid-template-columns: 1fr 320px` —puede causar scroll horizontal en móvil (aunque es `display: grid` con gap, se trunca)

---

## 11. Imágenes y Assets

### Estado actual

- **Favicon:** ✅ SVG (`/favicon.svg`) — formato moderno, escalable
- **OG Images:** ✅ Generadas dinámicamente por satori (1200×630)
- **Imágenes en contenido:** ❌ No hay imágenes en el contenido — el sitio es puramente textual
- **Alt text:** N/A — no hay imágenes en el contenido

### Recomendación

No hay issues con imágenes dado que el sitio es textual. Considerar añadir un `apple-touch-icon` y `manifest.json` para PWA metadata, pero esto es prioridad baja.

---

## 12. Página 404

### Estado actual: 🔴 GENÉRICA DE VERCEL

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>404: Not Found</title>
</head>
<body>...</body>
</html>
```

#### Problemas

| # | Issue | Impacto |
|---|-------|---------|
| 1 | `lang="en"` en un sitio 100% español | SEO negativo |
| 2 | Sin branding ni navegación | UX pobre |
| 3 | Sin enlaces al sitio | Pérdida de usuario |
| 4 | Sin tracking (no tiene GTM) | Datos perdidos |

### Solución

Crear `/src/pages/404.astro` con el layout `Base.astro`. Astro genera automáticamente la página 404 estática que Vercel sirve.

---

## 13. Internacionalización

### Estado actual: ✅ CORRECTO PARA MONO-IDIOMA

- `<html lang="es">` ✅
- `<meta property="og:locale" content="es_ES" />` ✅
- Sin necesidad de `hreflang` (sitio solo en español)
- Contenido 100% en español

No se requiere acción.

---

## 14. Hallazgos y Plan de Ejecución

### Impacto ALTO — Implementar inmediatamente 🔴

| # | Acción | Impacto SEO | Esfuerzo |
|---|--------|-------------|----------|
| 1 | **Añadir JSON-LD WebSite** en homepage | Rich results / Sitelinks | 15min |
| 2 | **Añadir JSON-LD BreadcrumbList** en deducciones y guías | Breadcrumbs en SERPs | 30min |
| 3 | **Añadir JSON-LD Article** en guías | Rich results con fecha | 15min |
| 4 | **Crear página 404 personalizada** | UX + retención | 15min |
| 5 | **Corregir robots.txt** (www, bloquear /api/) | Crawl efficiency | 5min |

### Impacto MEDIO — Implementar pronto ⚠️

| # | Acción | Impacto SEO | Esfuerzo |
|---|--------|-------------|----------|
| 6 | Añadir `<meta name="robots" content="index, follow">` | Señal explícita | 5min |
| 7 | Añadir cabeceras de seguridad en `vercel.json` | Trust signal (HTTPS headers) | 15min |
| 8 | Añadir `noindex` a endpoints de API | Previene indexación accidental | 5min |

### Impacto BAJO — Nice to have 💡

| # | Acción | Impacto SEO | Esfuerzo |
|---|--------|-------------|----------|
| 9 | Auto-hospedar Google Fonts | LCP -50ms | 30min |
| 10 | Añadir deducciones relacionadas en fichas | Internal linking | 2-4h |
| 11 | Añadir `apple-touch-icon` y `manifest.json` | PWA compliance | 15min |
| 12 | Añadir JSON-LD FAQPage en guías selectas | FAQ rich snippets | 30min |

---

## Acciones implementadas en esta auditoría

Tras documentar los hallazgos, se han implementado las siguientes mejoras directamente en el código:

- ✅ **robots.txt corregido** — dominio `www.larenta.es` en sitemap + `Disallow: /api/`
- ✅ **Cabeceras de seguridad** en `vercel.json` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) + `X-Robots-Tag: noindex` para `/api/`
- ✅ **Página 404 personalizada** (`src/pages/404.astro`) con branding, navegación y layout Base
- ✅ **JSON-LD WebSite** schema en homepage (`index.astro`)
- ✅ **JSON-LD BreadcrumbList** en 375 fichas de deducciones (`deduccion/[id].astro`)
- ✅ **JSON-LD BreadcrumbList + Article** en 8 guías (`guia/[slug].astro`)
- ✅ **`<meta name="robots" content="index, follow">`** en `Base.astro`

### Pendiente (prioridad baja)

- ⬜ Auto-hospedar Google Fonts (LCP -50ms)
- ⬜ Añadir deducciones relacionadas en fichas de deducción (internal linking)
- ⬜ `apple-touch-icon` + `manifest.json` (PWA metadata)
- ⬜ JSON-LD FAQPage en guías selectas (FAQ rich snippets)
