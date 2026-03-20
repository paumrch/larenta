# Changelog — larenta.es v2 (Wizard Filtering + Edad)

**Fecha:** 20 de marzo de 2026  
**Commit:** `5a581f2` (master)  
**Rama de desarrollo:** `dev` → `master` (merge `f473378`)  
**Deploy:** Vercel (automático desde push a master)

---

## Resumen

Corrección completa del sistema de filtrado del Asistente de deducciones y nueva funcionalidad de filtrado por edad del contribuyente. Incluye limpieza de datos de calidad en 375 fichas de deducciones.

---

## 1. Corrección del filtro de situaciones (Bug fix)

### Problema
El filtro del Wizard tenía 3 bugs:
1. Si el usuario no seleccionaba ninguna situación personal, **todas** las deducciones pasaban el filtro (no se excluía ninguna).
2. 58 deducciones tenían `situaciones: []` (array vacío), lo que hacía que siempre pasaran el filtro independientemente de la selección del usuario.
3. Las respuestas de `alquiler` y `ganancias` se recogían pero no se usaban en el filtrado.

### Solución

#### Lógica (Wizard.tsx)
- **Antes:** `if (answers.situaciones.length > 0 && d.situaciones.length > 0)` — el filtro solo se aplicaba si el usuario seleccionaba al menos una situación.
- **Después:** `if (d.situaciones.length > 0)` — el filtro siempre se aplica para deducciones que tienen requisitos específicos.

#### Datos (39 deducciones reclasificadas)
De las 58 deducciones con `situaciones: []`, se asignaron valores correctos a 39:
- 21 deducciones de donativos → `donativos`
- 3 deducciones de vehículo eléctrico → `coche_electrico`
- 4 deducciones para zonas rurales → `vive_en_pueblo`
- 3 deducciones de vivienda propia → `tiene_vivienda_propia`
- 2 deducciones de empleados del hogar → `empleados_hogar` (nuevo tag)
- 2 deducciones de discapacidad → `discapacidad`
- 4 deducciones de inversión/autónomos → `invierte` / `autonomo`

Las 19 restantes se dejaron intencionalmente vacías (son deducciones de aplicación general).

### Archivos modificados
- `src/components/Wizard.tsx` — Lógica de filtro
- `data/wizard_index.json` — Datos de situaciones
- `data/explorer_index.json` — Datos de situaciones (sincronizado)

---

## 2. Limpieza de calidad de datos (3 rondas)

### Ronda 1: Arrendamiento + tiene_vivienda_propia
- **23 deducciones** de arrendamiento (inquilinos) tenían incorrectamente el tag `tiene_vivienda_propia` → eliminado.
- **1 deducción** (VAL-26) tenía `discapacidad` como modificador que causaba falsos positivos → eliminado.

### Ronda 2: Modificadores personales en deducciones de arrendamiento
- **8 deducciones** de arrendamiento tenían modificadores personales (`tiene_hijos`, `discapacidad`, `tiene_conyuge`, `familia_monoparental`) que generaban falsos positivos → limpiados, dejando solo `alquila_vivienda`.
- **CAN-22** (deducción para arrendadores) estaba clasificada como `alquila_vivienda` → reclasificada a `tiene_vivienda_propia`.

### Ronda 3: Verificación de regresión
- **10/10 escenarios de validación** pasaron correctamente.
- **45/45 tests de regresión CCAA** (15 CCAA × 3 perfiles) pasaron correctamente.

### Archivos modificados
- `data/wizard_index.json` — 375 deducciones
- `data/explorer_index.json` — 375 deducciones

---

## 3. Nuevo paso de edad en el Wizard

### Funcionalidad
Nuevo paso 3 (de 7 totales) que pregunta la edad del contribuyente. Se usa para filtrar deducciones con requisitos de edad.

### Pasos del Wizard (antes → después)
| # | Antes | Después |
|---|-------|---------|
| 0 | CCAA | CCAA |
| 1 | Laboral | Laboral |
| 2 | Situaciones | Situaciones |
| 3 | Alquiler | **Edad** (nuevo) |
| 4 | Ganancias | Alquiler |
| 5 | Económicos | Ganancias |
| 6 | — | Económicos |

### Detalle del paso de edad
- **Input:** Numérico con autoFocus
- **Texto de ayuda:** "Hay deducciones específicas para jóvenes (<36) y mayores (>65)"
- **Opcional:** El usuario puede avanzar sin rellenar (no filtra por edad)

### Lógica de filtrado
```typescript
if (d.edad_maxima != null && edad > d.edad_maxima) return false;
if (d.edad_minima != null && edad < d.edad_minima) return false;
```

### Datos de edad añadidos
Se añadieron dos campos nuevos a las 375 deducciones:
- `edad_minima: number | null`
- `edad_maxima: number | null`

**27 deducciones** tienen valores reales de edad (aplican al contribuyente):
- Edad máxima 35/36/40 → deducciones para jóvenes
- Edad mínima 65/70/75 → deducciones para mayores

**38 deducciones** mencionan edades en su nombre pero aplican a dependientes (hijos, mayores a cargo), por lo que no se filtraron por edad del contribuyente.

### Archivos modificados
- `src/lib/types.ts` — Interfaces `Deduccion` y `DeduccionIndex` (`edad_minima`, `edad_maxima`)
- `src/components/Wizard.tsx` — Nuevo paso, nueva lógica de filtro, UI
- `data/wizard_index.json` — Campos de edad en 375 deducciones
- `data/explorer_index.json` — Campos de edad en 375 deducciones

---

## 4. Auditorías pre-deploy

### Seguridad ✅
- Sin vulnerabilidades en dependencias
- Sin XSS (escaping correcto en OG y email endpoints)
- Sin injection (no hay DB, no hay shell commands)
- `.env` no está en git (nunca fue commiteado)
- Headers de seguridad en vercel.json (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Rate limiting en `/api/send-report`
- robots.txt bloquea `/api/`

### Contenido ✅
- 375 deducciones sincronizadas en wizard_index y explorer_index
- 15 CCAA representadas
- Sin placeholders, TODOs ni contenido vacío
- Metadata consistente en todas las páginas
- 404 personalizado funcional
- 100% UI en español

### SEO ✅ (88/100)
- Meta tags dinámicas (title, description, OG, Twitter)
- Sitemap auto-generado (390 URLs)
- JSON-LD: WebSite, BreadcrumbList, Article
- Canonical URLs absolutas por página
- `lang="es"` + `og:locale="es_ES"`
- robots.txt + X-Robots-Tag en endpoints API

### Directorio ✅
- Sin scripts temporales
- Sin archivos .bak, .tmp, .log
- `.gitignore` correcto (node_modules, dist, .env)
- Working tree limpio (0 cambios sin commitear)

---

## Archivos modificados (resumen)

| Archivo | Cambios |
|---------|---------|
| `src/components/Wizard.tsx` | Filtro de situaciones, paso de edad, reindexado de pasos |
| `src/lib/types.ts` | `edad_minima` y `edad_maxima` en interfaces |
| `data/wizard_index.json` | Situaciones corregidas + campos de edad (375 entradas) |
| `data/explorer_index.json` | Situaciones corregidas + campos de edad (375 entradas) |

**Total:** 4 archivos, +2604 / -954 líneas
