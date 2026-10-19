# Visor Geoespacial: Humedales Urbanos y Establecimientos SINADER

Visor web geospacial **Zero-Server** (100% estático) que cruza los **Humedales Urbanos**
(SIMBIO / MMA) con los **establecimientos industriales SINADER 2024**, permitiendo explorar,
filtrar, analizar y exportar ambas capas directamente en el navegador, sin backend ni claves
de API.

> Proyecto desarrollado en el bootcamp **“Desarrollo de aplicaciones web territoriales con IA”**,
> bajo la metodología **Spec-Driven Development (SDD)** con **OpenSpec**.
>
> Stack: **HTML5**, **Tailwind CSS**, **Vanilla JS** y **MapLibre GL JS**.

---

## Demo

**Sitio en vivo:** <https://bassdevv.github.io/visor-humedales-y-sinader/>

**Repositorio:** <https://github.com/bassdevv/visor-humedales-y-sinader>

---

## Características

- **Mapa base conmutable**: Satélite (Esri World Imagery + etiquetas), Claro (Carto Positron)
  y Oscuro (Carto Dark Matter), con paleta oscura ajustada.
- **Dos capas de datos**: Humedales Urbanos (polígonos) y Establecimientos SINADER (puntos),
  con simbología por tipo de proceso / tratamiento.
- **Filtros enlazados**: búsqueda por texto, región, comuna, rubro, proceso del humedal y
  tratamiento del establecimiento.
- **Leyendas interactivas**: contadores por categoría y chips que encienden/apagan categorías.
- **Análisis cruzado (dashboard)**: tres gráficos Chart.js clickeables que filtran el mapa:
  - Tonelaje por región y tratamiento (barras apiladas).
  - Humedales vs. presión industrial por comuna (burbujas log-log con medianas).
  - Rubros y tratamiento (barras 100% apiladas).
- **Área de influencia (buffer)**: genera zonas a distancia configurable alrededor de las
  entidades filtradas, con opción de unir áreas superpuestas (Turf.js).
- **Exportación client-side**: descarga de las entidades filtradas en **GeoJSON** o
  **Shapefile (.zip)**.
- **Popups atributivos** al hacer clic sobre humedales y establecimientos.
- **Responsive**: panel de filtros como *drawer* en tablet/móvil y tarjeta de estado oculta en
  pantallas pequeñas.

---

## Metodología: Spec-Driven Development con OpenSpec

El visor se construyó siguiendo **Spec-Driven Development (SDD)** con **OpenSpec**: primero se
especificó cada capacidad y luego se implementó, manteniendo trazabilidad entre requisito,
diseño y código.

- `openspec/specs/geospatial-viewer/spec.md`: especificación canónica (requisitos + escenarios).
- `openspec/changes/<cambio>/`: propuestas con `proposal.md`, `design.md`, `tasks.md` y deltas
  de especificación (`specs/`).
- `openspec/changes/archive/`: cambios implementados, conservados como historial.

El flujo se aplicó por capacidades: visor base, capa secundaria, dashboard cruzado,
exportación y análisis de buffer.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Estructura | HTML5 semántico |
| Estilos | [Tailwind CSS 3](https://tailwindcss.com/) vía CDN (`darkMode: 'class'`) + `css/styles.css` |
| Lógica | **Vanilla JS** con ES Modules nativos (sin build, sin bundler) |
| Mapas | [MapLibre GL JS 4.7.1](https://maplibre.org/) |

## Tecnologías

| Uso | Tecnología |
| --- | --- |
| Gráficos | [Chart.js 4.4.7](https://www.chartjs.org/) (dashboard, carga bajo demanda por CDN) |
| Geoespacial | [Turf.js 7.0](https://turfjs.org/) (buffers, carga bajo demanda) |
| Export Shapefile | [@mapbox/shp-write](https://github.com/mapbox/shp-write) (carga bajo demanda) |
| Datos | GeoJSON estático (`./data/*.geojson`) |
| Hosting | GitHub Pages |
| Arquitectura | Zero-Server (sin backend, sin compilación) |
| Metodología | **Spec-Driven Development (SDD)** con **OpenSpec** |

**Sin dependencias de build**: no hay `npm install` ni empaquetado. El navegador carga los
módulos ES directamente.

---

## Datos y fuentes

- **Humedales Urbanos**: Sistema de Información de Humedales (SIMBIO) · Ministerio del Medio
  Ambiente (MMA).
- **Establecimientos SINADER 2024**: Registro de establecimientos que declaran transferencias
  de residuos (Ventanilla Única / MMA).

Los datos se incluyen como artefactos GeoJSON minificados en `data/`; el navegador nunca
procesa archivos XLSX.

---

## Licencia y créditos

Proyecto educativo desarrollado en el bootcamp **“Desarrollo de aplicaciones web territoriales con IA”**. Datos con fines de demostración,
cuya titularidad corresponde a sus fuentes (MMA · SIMBIO + SINADER).
