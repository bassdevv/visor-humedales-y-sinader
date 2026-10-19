# Visor Geoespacial: Humedales Urbanos y Establecimientos SINADER

Visor web geospacial **Zero-Server** (100% estático) que cruza los **Humedales Urbanos**
(SIMBIO / MMA) con los **establecimientos industriales SINADER 2024**, permitiendo explorar,
filtrar, analizar y exportar ambas capas directamente en el navegador, sin backend ni claves
de API.

> Proyecto desarrollado en el bootcamp **“Desarrollo de aplicaciones web territoriales con IA”**,
> bajo la metodología **Spec-Driven Development (SDD)** con **OpenSpec**.
>
> Stack principal: **MapLibre GL JS**, **Chart.js**, **Turf.js**, **Tailwind CSS** y **JavaScript ES Modules**.

---

## Demo

Al desplegarse en GitHub Pages queda disponible en:

```
https://BasssDev.github.io/visor-humedales-y-sinader/
```

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

## Stack y tecnologías

| Capa | Tecnología |
| --- | --- |
| Estructura | HTML5 semántico |
| Estilos | [Tailwind CSS 3](https://tailwindcss.com/) vía CDN (`darkMode: 'class'`) + `css/styles.css` |
| Lógica | JavaScript **Vanilla con ES Modules nativos** (sin build, sin bundler) |
| Mapas | [MapLibre GL JS 4.7.1](https://maplibre.org/) |
| Gráficos | [Chart.js 4.4.7](https://www.chartjs.org/) (carga bajo demanda por CDN) |
| Geoespacial | [Turf.js 7.0](https://turfjs.org/) para buffers (carga bajo demanda) |
| Export Shapefile | [@mapbox/shp-write](https://github.com/mapbox/shp-write) (carga bajo demanda) |
| Datos | GeoJSON estático (`./data/*.geojson`) |
| Hosting | GitHub Pages |
| Arquitectura | Zero-Server (sin backend, sin compilación) |
| Metodología | **Spec-Driven Development (SDD)** con **OpenSpec** |

**Sin dependencias de build**: no hay `npm install` ni empaquetado. El navegador carga los
módulos ES directamente.

---

## Arquitectura del código

El JavaScript está separado por dominio (ES Modules) y desacoplado por un núcleo de estado con
*hooks* de render, evitando dependencias circulares.

```
index.html              # Estructura HTML + CDNs + <script type="module" src="./js/main.js">
css/
  styles.css            # Estilos propios (glass, media queries, overrides de MapLibre)
js/
  config.js             # Constantes y configuración (estilos, filtros, export, buffer)
  utils.js              # Helpers puros (escape, formatos, geometría)
  state.js              # Estado central + pipeline de render (hooks, fit, eventos)
  map.js                # Instancia de MapLibre
  layers.js             # Capas humedales / SINADER / resaltado + encuadre
  data.js               # Carga y normalización de GeoJSON
  filters.js            # Filtros → UI, contadores y leyendas
  basemaps.js           # Cambio de mapa base
  charts.js             # Dashboard (Chart.js)
  export.js             # Exportación GeoJSON / Shapefile
  buffer.js             # Áreas de influencia (Turf.js)
  popups.js             # Popups e interacciones del mapa
  ui.js                 # Eventos de la interfaz + drawer responsive
  main.js               # Punto de entrada
data/
  humedales.geojson
  sinader_establecimientos.geojson
```

`state.js` no depende de los módulos de funcionalidad: expone registros
(`registerRenderHook`, `registerRegionChangeHook`, `registerFitHandler`,
`registerChartDataBuilder`) que cada módulo usa para engancharse al ciclo de render.

---

## Ejecución local

Como usa `fetch` y módulos ES, se requiere servirse por HTTP (no funciona con `file://`):

```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node
npx serve .
```

Luego abre <http://localhost:8000>.

---

## Despliegue en GitHub Pages

1. **Crea el repositorio** en GitHub (vacío, sin README).
2. **Conecta y sube** el proyecto (ver comandos más abajo).
3. En GitHub: **Settings → Pages → Build and deployment**
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` · carpeta `/ (root)` · **Save**
4. Espera 1–2 minutos; el sitio queda en
   `https://BasssDev.github.io/visor-humedales-y-sinader/`.

El archivo `.nojekyll` en la raíz desactiva el procesamiento de Jekyll para que los módulos ES
y los archivos de datos se sirvan tal cual.

### Comandos para subir

```bash
git init
git add .
git commit -m "Visor geospacial Zero-Server (Desarrollo de aplicaciones web territoriales con IA)"
git branch -M main
git remote add origin https://github.com/BasssDev/visor-humedales-y-sinader.git
git push -u origin main
```

> Alternativa con GitHub CLI: `gh repo create visor-humedales-y-sinader --public --source=. --push`.

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
