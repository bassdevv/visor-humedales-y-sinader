# Tareas de Implementación: Exportación de Entidades Filtradas

## 1. Preparación y contrato de exportación
- [x] Definir `EXPORT_CONFIG` con nombres de archivo, textos de estado y URL de `@mapbox/shp-write`.
- [x] Implementar `getExportableFeatures()` sobre `filteredFeatures` y `filteredSecondaryFeatures`, respetando visibilidad de grupo.
- [x] Añadir la propiedad discriminante `capa` (`humedales` / `establecimientos`) a cada feature exportada.
- [x] Definir el esquema abreviado de campos DBF por capa.
- [x] Definir el helper común `downloadBlob(blob, filename)`.

## 2. Interfaz y estados
- [x] Añadir los botones `#btn-export-geojson` y `#btn-export-shp` al panel de filtros.
- [x] Implementar `setExportState(state)` (habilitado, deshabilitado, generando, éxito, error).
- [x] Llamar a `setExportState()` desde `applyFilters()` para reflejar el estado filtrado.
- [x] Deshabilitar ambos botones cuando `totalExportable === 0`.
- [x] Mostrar feedback de progreso y mensaje de éxito/error sin usar `alert()`.

## 3. Exportación a GeoJSON
- [x] Implementar `exportGeoJson()` sobre el subconjunto filtrado.
- [x] Incluir `metadata` con fecha, conteos por capa y filtros aplicados.
- [x] Disparar la descarga con el nombre `datos-filtrados_YYYY-MM-DD.geojson`.

## 4. Exportación a Shapefile (ZIP)
- [x] Implementar `loadShpWrite()` con carga diferida por `<script>` y caché de promesa.
- [x] Implementar `exportShapefile()` usando `shpwrite.zip(geojson, { outputType: 'blob' })`.
- [x] Aplicar el esquema abreviado de §3.2 del diseño a cada capa.
- [x] Verificar que el ZIP incluya un shapefile por tipo de geometría (`.shp`, `.shx`, `.dbf`, `.prj`).
- [x] Verificar el `.prj` WGS84 (EPSG:4326).
- [x] Disparar la descarga con el nombre `datos-filtrados_YYYY-MM-DD.zip`.

## 5. Validación y no regresión
- [x] Verificar que la carga inicial no descargue la librería de Shapefile.
- [x] Verificar la exportación GeoJSON con filtros de búsqueda, región, comuna y categorías.
- [x] Verificar la exportación Shapefile y su apertura en QGIS o similar.
- [x] Verificar que las capas ocultas por su interruptor de grupo no se exporten.
- [x] Verificar que los botones se deshabiliten sin resultados.
- [x] Verificar el manejo de error cuando la CDN no está disponible.
- [x] Confirmar que filtros, popups, leyendas y mapas base no se ven afectados.
- [x] Revisar el layout en escritorio y móvil.

## 6. Documentación y cierre
- [x] Documentar el uso y las limitaciones (nombres de campo DBF, WGS84) en el propio código o en el README si existe.
- [ ] Actualizar la especificación principal al archivar la change.
