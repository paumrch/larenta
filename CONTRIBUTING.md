# Contribuir a larenta.es

Gracias por tu interés en contribuir. Este proyecto es de código abierto y cualquier ayuda es bienvenida — desde corregir un dato hasta mejorar la interfaz.

## Formas de contribuir

### 1. Reportar un dato incorrecto

Si encuentras una deducción con información errónea o desactualizada, [abre un issue](https://github.com/paumrch/larenta/issues/new?template=dato-incorrecto.yml) indicando:

- El ID de la deducción (ej. `MAD-13`) o su nombre.
- Qué dato es incorrecto.
- La fuente oficial que lo corrige (enlace a la AEAT o al BOE).

### 2. Contribuir datos

Los datos de deducciones se mantienen internamente y se compilan en los archivos JSON que consume la webapp (`data/deducciones.json`, `data/wizard_index.json`, `data/explorer_index.json`).

Si quieres corregir o añadir información sobre una deducción:

1. [Abre un issue](https://github.com/paumrch/larenta/issues/new?template=dato-incorrecto.yml) indicando:
   - El ID de la deducción (ej. `MAD-13`) o su nombre.
   - Qué dato hay que corregir o añadir.
   - La fuente oficial (enlace a la AEAT, BOE o normativa autonómica).
2. Un mantenedor aplicará el cambio, regenerará los índices y lo mergeará.

Si prefieres enviar una PR directamente, puedes editar los archivos JSON en `data/`. Asegúrate de que el build pasa (`npm run build`) antes de abrirla.

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
4. Comprueba que el build funciona:
   ```bash
   npm run build
   ```
5. Abre un Pull Request describiendo los cambios.

## Convenciones

- **Commits**: usa [Conventional Commits](https://www.conventionalcommits.org/) — `fix:`, `feat:`, `docs:`, `data:`.
- **Ramas**: `fix/descripcion`, `feat/descripcion`, `data/descripcion`.
- **Idioma**: el código y los commits pueden ser en español o inglés. Los datos están en español.
- **Formato**: respeta el formato existente. No reformatees archivos que no has modificado.

## Validación

Antes de abrir una PR, comprueba que el proyecto compila correctamente:

```bash
npm run build
```

Si el build falla, revisa los errores — normalmente son imports rotos o errores de tipo en TypeScript.

## Código de conducta

Sé respetuoso. Este es un proyecto voluntario con el objetivo de ayudar a la gente a pagar solo lo justo en impuestos. No se tolera ningún tipo de acoso o discriminación.

## ¿Dudas?

Abre un [issue](https://github.com/paumrch/larenta/issues/new) o contacta con [@paumrch](https://github.com/paumrch).
