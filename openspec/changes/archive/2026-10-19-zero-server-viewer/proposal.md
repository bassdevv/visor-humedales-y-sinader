# Propuesta: Visor Geoespacial Zero-Server con MapLibre y GitHub Pages

## Why

### Background
Se requiere una solución geoespacial ligera para visualizar geometrías vectoriales (puntos, líneas y polígonos) de forma ágil, económica y sin costos operativos de infraestructura.

### Problem Statement
Las soluciones geoespaciales tradicionales a menudo dependen de servidores dedicados (GeoServer, Node.js, Python/Django, bases de datos PostGIS) o servicios de mapas con límites de cuota y claves de API restrictivas. Para proyectos ágiles o bootcamps, esto añade sobrecarga de configuración y costos innecesarios.

### Alternatives Considered
- **Leaflet + OpenStreetMap**: Ligero pero con capacidades 3D y renderizado vectorial de alto rendimiento limitados.
- **CesiumJS**: Muy potente en 3D pero pesado y excesivo para el principio KISS.
- **MapLibre GL JS + GitHub Pages**: Excelente rendimiento con WebGL, soporte de inclinación/perspectiva 3D, soporte para estilos vectoriales y raster sin requerir backend.

---

## What Changes
- Creación de un visor web minimalista en un único archivo `index.html`.
- Incorporación de MapLibre GL JS vía CDN para renderizado acelerado por hardware.
- Implementación de Tailwind CSS vía CDN para paneles de control flotantes con estética moderna (glassmorphism / dark mode).
- Carga de capas GeoJSON desde el mismo repositorio (`./data/layer.geojson`).
- Incorporación de mapa base satelital realista (Esri World Imagery) y modos claro/oscuro (Carto).
- Documentación completa del proyecto bajo el estándar OpenSpec.

---

## Capabilities
- `geospatial-viewer`: Visualización interactiva en WebGL, popups dinámicos, ajuste de límites y control de capas.
- `basemap-switcher`: Conmutación en caliente entre vista satelital fotográfica y estilos claro/oscuro.
- `static-data-pipeline`: Distribución de datos en formato GeoJSON directamente mediante GitHub Pages.
