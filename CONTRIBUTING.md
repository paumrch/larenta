# Contribuir a larenta.es

Gracias por tu interés en contribuir. Este proyecto es de código abierto y cualquier ayuda es bienvenida — desde corregir un dato hasta mejorar la interfaz.

## Formas de contribuir

### 1. Reportar un dato incorrecto

Si encuentras una deducción con información errónea o desactualizada, [abre un issue](https://github.com/paumrch/larenta/issues/new?template=dato-incorrecto.yml) indicando:

- El ID de la deducción (ej. `MAD-13`) o su nombre.
- Qué dato es incorrecto.
- La fuente oficial que lo corrige (enlace a la AEAT o al BOE).

### 2. Contribuir datos

Cada deducción es un archivo JSON en `data/fichas/<id>.json`. Un fichero típico tiene esta estructura:

```json
{
  "id": "AND-01",
  "tipo": "autonomica",
  "comunidad": "Andalucía",
  "codigo_ccaa": "AND",
  "nombre": "Nombre oficial de la deducción",
  "nombre_corto": "Versión concisa para UI",
  "categoria": "vivienda",
  "relevancia": 1,
  "aplica_asalariados": true,
  "aplica_autonomos": true,
  "situaciones": ["tiene_vivienda_propia"],
  "resumen": "Descripción accesible de 1-2 frases",
  "porcentaje": "6%",
  "base_maxima": "9.040 euros",
  "limite_renta": "25.000 euros",
  "novedad_2025": false,
  "url_oficial": "https://sede.agenciatributaria.gob.es/...",
  "contenido_md": "Contenido completo en markdown...",
  "edad_minima": null,
  "edad_maxima": 35
}
```

Para corregir o añadir información:

1. Modifica la ficha en `data/fichas/`.
2. Regenera los índices:
   ```bash
   python3 scripts/generate_indexes.py
   ```
3. Copia los índices a la webapp:
   ```bash
   cp data/wizard_index.json data/explorer_index.json data/deducciones.json larenta/data/
   ```
4. Comprueba que el build pasa:
   ```bash
   cd larenta && npm run build
   ```

### 3. Contribuir código

#### Setup local

```bash
git clone https://github.com/paumrch/larenta.git
cd larenta
npm install
npm run dev      # http://localhost:4321
```

La única variable de entorno es `RESEND_API_KEY` (Resend), necesaria solo para el envío de informes por email. Sin ella, todo lo demás funciona.

#### Stack

- **Astro 6** — SSG con islands architecture
- **React 19** — Componentes interactivos (Wizard, Explorer, Report)
- **Tailwind CSS 4** — Estilos
- **Vercel** — Deploy

#### Estructura clave

```
src/
├── components/
│   ├── Wizard.tsx       # Asistente interactivo (7 pasos)
│   ├── Explorer.tsx     # Explorador con filtros y búsqueda
│   └── Report.tsx       # Generación de informe PDF y email
├── lib/
│   ├── data.ts          # Funciones de acceso a datos
│   └── types.ts         # Tipos, mapas de CCAA y categorías
└── pages/               # Rutas de Astro
```

## Flujo de trabajo

1. Haz fork del repositorio.
2. Crea una rama desde `master`:
   ```bash
   git checkout -b fix/mi-mejora
   ```
3. Haz tus cambios.
4. Pasa los tests:
   ```bash
   node scripts/test_income_filter.mjs
   ```
5. Comprueba que el build funciona:
   ```bash
   npm run build
   ```
6. Abre un Pull Request describiendo los cambios.

## Convenciones

- **Commits**: usa [Conventional Commits](https://www.conventionalcommits.org/) — `fix:`, `feat:`, `docs:`, `data:`.
- **Ramas**: `fix/descripcion`, `feat/descripcion`, `data/descripcion`.
- **Idioma**: el código y los commits pueden ser en español o inglés. Los datos están en español.
- **Formato**: respeta el formato existente. No reformatees archivos que no has modificado.

## Tests

El proyecto tiene tests de simulación que verifican la lógica de filtrado del asistente:

```bash
node scripts/test_income_filter.mjs
```

Si tus cambios afectan al filtrado de deducciones (Wizard.tsx, types.ts, datos de fichas), asegúrate de que los 31 tests pasan.

## Código de conducta

Sé respetuoso. Este es un proyecto voluntario con el objetivo de ayudar a la gente a pagar solo lo justo en impuestos. No se tolera ningún tipo de acoso o discriminación.

## ¿Dudas?

Abre un [issue](https://github.com/paumrch/larenta/issues/new) o contacta con [@paumrch](https://github.com/paumrch).
