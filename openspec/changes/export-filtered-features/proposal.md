# Propuesta: Exportación de Entidades Filtradas

## Why

### Background

El visor ya permite filtrar su contenido por búsqueda de texto, región, comuna y por las categorías de cada capa (proceso de humedales; tratamiento de establecimientos), además de mostrar/ocultar los grupos de capas. El estado de filtros (`filteredFeatures` y `filteredSecondaryFeatures`) ya se calcula en cada actualización y se expone mediante el evento `viewer:filtered`.

Hoy ese resultado filtrado solo puede verse en el mapa: no hay forma de descargarlo para usarlo en una herramienta externa (Excel, QGIS, ArcGIS, un informe). El usuario debe rehacer manualmente el subconjunto, lo que rompe el flujo "filtrar → usar el resultado".

La arquitectura es estática, de archivo único y sin backend (`index.html` + `data/*.geojson` sobre GitHub Pages). Cualquier exportación debe resolverse íntegramente en el navegador, sin subir datos a un servidor ni agregar un paso de build.

### Problem Statement

No existe una función de exportación. Se necesita que el usuario pueda descargar exactamente las entidades que cumplen los filtros activos, en dos formatos habituales en el trabajo geoespacial:

- **GeoJSON**, el formato nativo del visor.
- **Shapefile comprimido en ZIP**, formato requerido por muchos SIG de escritorio (ArcGIS, QGIS, etc.).

Además, la generación de un Shapefile en el navegador no es trivial (archivos binarios `.shp`/`.shx`/`.dbf` y un ZIP), por lo que hay que decidir la **dependencia mínima** necesaria y documentarla, manteniendo el principio Zero-Server y sin comprometer la simplicidad del proyecto.

### Alternatives Considered

- **Exportar solo GeoJSON**: descartado como única opción. No cubre a usuarios de SIG que exigen Shapefile.
- **Generar el Shapefile en un backend**: descartado. Viola Zero-Server y agrega infraestructura.
- **Codificador de Shapefile propio, sin dependencias**: viable y sin librerías, pero implica mantener a mano el formato binario Shapefile (`.shp`/`.shx`/`.dbf`), el `.prj`, el CRC32 y el contenedor ZIP para varios tipos de geometría. Se descarta por costo de implementación y riesgo de errores frente a una librería madura.
- **Librería dedicada `geojson-to-shapefile` (ghonim0007)**: descartada. Es reciente y solo soporta geometría `Point`; el visor también debe exportar los humedales (`MultiPolygon`).
- **Librería `shpjs` / `shapefile.js`**: descartadas. Son librerías de **lectura**, no de escritura.
- **`@mapbox/shp-write` (CDN, carga diferida)**: seleccionada. Escribe Shapefile en JavaScript puro con soporte de `Point`, `LineString`, `Polygon`, `MultiLineString` y `MultiPolygon`, genera `.shp`/`.shx`/`.dbf`/`.prj` y arma el ZIP, todo en el navegador con una sola etiqueta `<script>`. Se carga bajo demanda, solo al pulsar exportar.

---

## What Changes

- Añadir a `index.html` un módulo de exportación client-side que consume el estado de filtros ya existente (`filteredFeatures` y `filteredSecondaryFeatures`), sin volver a descargar datos.
- Ofrecer **descarga en GeoJSON** de las entidades filtradas.
- Ofrecer **descarga en Shapefile comprimido en ZIP** de las entidades filtradas, con su `.prj` (WGS84 / EPSG:4326).
- Cargar la dependencia de Shapefile de forma **diferida** (solo al usar esa exportación), sin alterar la carga inicial ni agregar build.
- Mostrar **feedback** durante la generación (estado en el botón / mensaje de progreso) y confirmación o error al terminar.
- **Deshabilitar** los botones de exportación cuando no existan resultados filtrados.
- Mantener el comportamiento existente: sin cambios en la carga de datos, filtros, simbología, popups ni mapas base.

---

## Capabilities

- `geospatial-viewer`: se agrega la capacidad de exportar el estado de filtros del visor a archivos descargables (GeoJSON y Shapefile en ZIP), íntegramente en el cliente.

---

## Impact

- **Archivos afectados**: `index.html` (UI de exportación + módulo de generación + carga diferida de la librería).
- **Nueva dependencia**: `@mapbox/shp-write` por CDN, cargada solo al solicitar Shapefile. Ver `design.md` §2 para la evaluación y justificación.
- **Sin backend, sin base de datos, sin claves de API.**
- **Sin cambios** en `data/humedales.geojson`, `data/sinader_establecimientos.geojson`, filtros, simbología ni mapas base.
- **Costo inicial**: nulo; la librería de Shapefile se descarga únicamente cuando el usuario la necesita.

El detalle técnico, la evaluación de la dependencia y el contrato de los archivos se documentan en `design.md`.
