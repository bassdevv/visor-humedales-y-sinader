# Tareas de Implementación: Capa Espacial Secundaria SINADER

## 1. Inspección del Dato (completada)
- [x] Inventariar los archivos espaciales disponibles y descartar duplicados/fixtures.
- [x] Identificar tipo de geometría (`Point`) y sistema de coordenadas (`latitud`/`longitud`, WGS84).
- [x] Perfilar atributos, nulos y cardinalidad de las 40 columnas de la hoja `Datos`.
- [x] Cuantificar registros inválidos: 36 coordenadas malformadas y 117 filas fuera de Chile.
- [x] Detectar inconsistencias: 25 `id_vu` con más de una región y 6.644 filas (630 `id_vu`) cuya región no coincide con el `codigo_unico_territorial`.
- [x] Estimar el artefacto derivado: 9.103 puntos, ≈3,1 MiB sin comprimir.
- [x] Confirmar compatibilidad con `fetch` relativo, MapLibre y filtros `region`/`comuna`.

## 2. Pipeline Offline de Datos
- [x] Crear `scripts/build_sinader_geojson.py` con lectura streaming de `openpyxl`.
- [x] Implementar validación numérica y bbox de Chile (incluyendo islas).
- [x] Excluir las 36 coordenadas malformadas y las 117 filas fuera de Chile.
- [x] Deduplicar por `id_vu` agregando toneladas y conteo de registros.
- [x] Derivar la región del prefijo de `codigo_unico_territorial` y la comuna del valor modal por código.
- [x] Resolver tratamiento por valor modal y registrar advertencias de región/código.
- [x] Aplicar el mapa de alias de Aysén y O'Higgins.
- [x] Emitir `data/sinader_establecimientos.geojson` minificado con metadata de generación.
- [x] Verificar conteos (9.103 features), tamaño (≈3,1 MiB), ausencia de nulos y orden determinista por `id_vu`.
- [x] Documentar el comando de regeneración en el propio script.

## 3. Separación entre Datos y Simbología
- [x] Definir `SECONDARY_CONFIG` solo con URL, IDs y nombres de propiedades.
- [x] Implementar `loadSecondaryData()`/`loadSecondaryLayer()` sin referencias a colores, radios ni capas.
- [x] Definir `SECONDARY_STYLE` con colores por tratamiento, radio, borde y opacidad.
- [x] Implementar `buildSecondaryLayerSpecs()` a partir de `SECONDARY_STYLE`.
- [x] Implementar `buildSecondaryPopupHtml()` con `escapeHtml()`.
- [x] Verificar que cambiar un color no requiera tocar la lógica de fetch/normalización.

## 4. Integración con MapLibre
- [x] Cargar la capa secundaria únicamente dentro de `map.on('load')`.
- [x] Implementar `applySecondaryToMap()` con guard de `isStyleLoaded()`.
- [x] Agregar `source` y capas de puntos después de las capas de humedales.
- [x] Refactorizar la restauración de `setBasemap()` para aplicar ambas capas.
- [x] Mantener el token y el fallback por timeout existentes.
- [x] Añadir el interruptor independiente de visibilidad de la capa secundaria.
- [x] Añadir cursor `pointer` y popup al hacer clic en un punto.
- [x] Añadir chip de estado/error de la capa secundaria sin reutilizar `#layer-status`.
- [x] Verificar que un fallo de la capa secundaria no afecte a la capa principal.

## 5. Filtros, Contadores y Gráficos
- [x] Construir opciones de región y comuna con la unión de ambos datasets.
- [x] Aplicar el mapa de alias de regiones antes de comparar valores.
- [x] Extender la búsqueda para establecimientos (`nombre`, `razon_social`, `id_vu`).
- [x] Aplicar `region`, `comuna` y búsqueda a la capa secundaria.
- [x] Mantener `proceso` y superficie acotados a la capa principal.
- [x] Actualizar `#filter-count` con los conteos de ambas capas.
- [x] Agregar leyenda secundaria por tratamiento sin eliminar la leyenda existente.
- [x] Emitir `viewer:filtered` con ambos conjuntos filtrados tras cada actualización.
- [x] Verificar que los filtros existentes conserven su comportamiento.

## 6. Validación y No Regresión
- [x] Servir el proyecto con `python -m http.server 8000` y verificar la carga.
- [x] Probar los tres mapas base y confirmar la restauración de ambas capas.
- [x] Probar búsqueda, región, comuna, proceso y superficie.
- [x] Probar el interruptor de la capa secundaria y sus popups.
- [x] Simular el fallo de `sinader_establecimientos.geojson` y confirmar la degradación aislada.
- [x] Verificar que el XLSX no se descargue en el navegador.
- [x] Revisar el rendimiento de la carga inicial y el uso de memoria.
- [x] Verificar el layout en escritorio y móvil.
- [x] Actualizar la especificación principal al archivar la change.
