# larenta.es

Tu guía completa del IRPF 2025. Todas las deducciones estatales y autonómicas explicadas en lenguaje claro, con datos oficiales de la AEAT.

**[larenta.es](https://www.larenta.es)**

---

## Qué es

Cada año, millones de personas hacen la declaración de la renta sin saber que podrían deducirse cientos de euros. La información existe, pero está repartida entre el BOE, la web de la AEAT y 15 normativas autonómicas diferentes.

**larenta.es** reúne las **377 deducciones del IRPF 2025** en un solo sitio y ofrece tres herramientas:

- **[Asistente interactivo](https://www.larenta.es/asistente)** — responde unas preguntas y obtén tus deducciones aplicables en menos de 2 minutos.
- **[Explorador de deducciones](https://www.larenta.es/explorador)** — busca y filtra entre todas las deducciones por CCAA, categoría, relevancia o texto.
- **[Guía IRPF 2025](https://www.larenta.es/guia)** — guías temáticas sobre los conceptos clave de la declaración.

> No es un servicio de asesoría fiscal. Es una herramienta gratuita, de código abierto, basada en los datos oficiales del Manual Práctico de Renta 2025 de la AEAT.

## Stack

| Tecnología | Uso |
|---|---|
| [Astro 6](https://astro.build/) | Framework — SSG con islands architecture |
| [React 19](https://react.dev/) | Componentes interactivos (Wizard, Explorer, Report) |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos |
| [Vercel](https://vercel.com/) | Deploy y hosting |
| [Resend](https://resend.com/) | Envío de informes por email |
| [Satori](https://github.com/vercel/satori) + [resvg](https://github.com/nicolo-ribaudo/resvg-js) | Generación dinámica de imágenes OG |

## Inicio rápido

### Requisitos

- Node.js ≥ 20
- npm ≥ 9

### Instalación

```bash
git clone https://github.com/paumrch/larenta.git
cd larenta
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre `http://localhost:4321` en tu navegador.

### Build de producción

```bash
npm run build
npm run preview   # para comprobar en local
```

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
RESEND_API_KEY=re_...   # Necesaria solo para el envío de informes por email
```

Sin esta variable, todo funciona excepto el endpoint `/api/send-report`.

## Estructura del proyecto

```
larenta/
├── data/                    # Datos del IRPF (JSON)
│   ├── deducciones.json     # 377 deducciones completas (con contenido markdown)
│   ├── wizard_index.json    # Índice ligero para el asistente
│   ├── explorer_index.json  # Índice ligero para el explorador
│   ├── guias.json           # Guías temáticas del IRPF
│   └── stats.json           # Estadísticas generales
├── public/                  # Assets estáticos (logo, fuentes, robots.txt)
└── src/
    ├── components/
    │   ├── Wizard.tsx       # Asistente interactivo (7 pasos)
    │   ├── Explorer.tsx     # Explorador con filtros y búsqueda
    │   └── Report.tsx       # Generación de informe PDF y envío por email
    ├── layouts/
    │   └── Base.astro       # Layout base (HTML, nav, footer, dark mode)
    ├── lib/
    │   ├── data.ts          # Funciones de acceso a datos
    │   └── types.ts         # Tipos TypeScript, mapas de CCAA y categorías
    ├── pages/
    │   ├── index.astro      # Homepage
    │   ├── asistente.astro  # Página del asistente
    │   ├── explorador.astro # Página del explorador
    │   ├── elproyecto.astro # Sobre este proyecto
    │   ├── 404.astro        # Error 404
    │   ├── api/
    │   │   ├── og.ts        # Generación dinámica de imágenes OG
    │   │   └── send-report.ts  # Envío de informe por email (Resend)
    │   ├── deduccion/
    │   │   └── [id].astro   # Ficha individual de cada deducción
    │   └── guia/
    │       ├── index.astro  # Índice de la guía IRPF
    │       └── [slug].astro # Guías temáticas individuales
    └── styles/
        └── global.css       # Estilos globales y design tokens
```

## Datos

El proyecto contiene **377 deducciones** extraídas del Manual Práctico de Renta 2025 de la AEAT, organizadas en:

- **15 comunidades autónomas con deducciones propias** + deducciones estatales
- **9 categorías**: vivienda, familia, educación, donativos, empresa, energía, movilidad, salud, otros
- **3 niveles de relevancia**: alta (•••), media (••), baja (•)

Cada deducción incluye: nombre, resumen, porcentaje y base máxima, límite de renta, situaciones aplicables, edad mínima/máxima, si es novedad 2025, enlace oficial a la AEAT y contenido completo en markdown.

### Pipeline de datos

Los datos se generan a partir del Manual Práctico de la AEAT mediante los scripts en `scripts/`:

```
extract_urls → download_pages → parse_deducciones → postprocess_data → normalize_percentages → generate_indexes → validate_data
```

Para regenerar los índices tras modificar los datos:

```bash
python3 scripts/generate_indexes.py
```

Los archivos fuente de datos están fuera de `larenta/`, en el directorio padre `data/fichas/` (377 ficheros JSON individuales). El script `generate_indexes.py` los agrega en los JSON optimizados que usa la webapp.

## Cómo contribuir

### Reportar datos incorrectos

Si encuentras una deducción con información errónea, desactualizada o incompleta, [abre un issue](https://github.com/paumrch/larenta/issues/new) indicando:

1. El ID de la deducción (ej. `MAD-13`) o su nombre.
2. Qué dato es incorrecto.
3. La fuente oficial que lo corrige (idealmente un enlace a la AEAT o al BOE).

### Contribuir código

1. Haz fork del repositorio.
2. Crea una rama desde `master`: `git checkout -b fix/mi-mejora`
3. Haz tus cambios y asegúrate de que el build pasa: `npm run build`
4. Abre un Pull Request describiendo los cambios.

### Contribuir datos

Cada deducción es un archivo JSON en `data/fichas/<id>.json`. Para corregir o añadir información:

1. Localiza la ficha en `data/fichas/`.
2. Modifica los campos necesarios.
3. Regenera los índices: `python3 scripts/generate_indexes.py`
4. Copia los índices a la webapp: `cp data/*.json larenta/data/`
5. Comprueba que el build pasa: `cd larenta && npm run build`

## Tests

```bash
node scripts/test_income_filter.mjs
```

Ejecuta 31 tests de simulación que verifican la lógica de filtrado del asistente: filtrado por límite de renta, por CCAA, formatos numéricos y exclusión de deducciones de Ceuta/Melilla.

## Licencia

[MIT](LICENSE)

## Autor

**Pau March** — [paumarch.com](https://www.paumarch.com)

---

Hecho con datos oficiales del [Manual Práctico de Renta 2025 — AEAT](https://sede.agenciatributaria.gob.es/).
