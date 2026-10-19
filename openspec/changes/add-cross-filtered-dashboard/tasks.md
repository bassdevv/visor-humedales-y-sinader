# Tareas de Implementación: Dashboard con Gráficos Cruzados

> Estado: implementación base completa y verificada con pruebas de lógica
> (pipeline de filtrado, agregaciones y exportación). Quedan pendientes las
> verificaciones manuales en navegador y algunas mejoras marcadas abajo.

## 1. Estado centralizado

- [x] Definir `viewerState` con `filters`, `view` y `ui`, reemplazando `filters`, `primaryVisible` y `secondaryVisible` como fuentes de verdad.
- [x] Implementar `updateViewerState(patch, origin)` como único punto de mutación.
- [x] Implementar `normalizeViewerFilters()` con las reglas de región/comuna, categorías, búsqueda y no-op.
- [x] Implementar `deriveViewerData(state)` con `humedales.all/shared/filtered`, `establecimientos.all/shared/filtered` y `charts`.
- [x] Implementar `renderViewer(origin)` como pipeline único (`syncControls`, `renderMapData`, contadores, `renderDashboard`, `dispatchFilteredData`).
- [x] Coalescer renders con `requestAnimationFrame` y descartar renders sin cambios de estado (firma de `filters`+`view`).
- [ ] Eliminar las asignaciones directas a `filters`, `filteredFeatures` y `filteredSecondaryFeatures`.
- [x] Adaptar la exportación para leer el snapshot vigente y agregar `rubro` a su metadata.

## 2. Filtrado unificado y mapa

- [x] Implementar `matchesViewerFilters(capa, properties, filters)` como única semántica de filtrado.
- [x] Definir la configuración declarativa de campos de búsqueda y categorías por capa.
- [ ] Añadir `promoteId` (`cod_humedal`, `id_vu`) a las fuentes GeoJSON y validar unicidad de identificadores al cargar.
- [x] Reemplazar `buildFilterExpression()` y `buildSecondaryFilterExpression()` por `setData()` con los arreglos derivados.
- [x] Actualizar la fuente principal, la de centroides y la secundaria en `renderMapData()`.
- [x] Mantener la fuente de centroides sincronizada con `buildCentroidData(humedales.filtered)`.
- [x] Mantener la visibilidad de capas en `setLayoutProperty`, separada de los filtros.
- [x] Restaurar datos, visibilidad y filtros tras un cambio de estilo o basemap.
- [x] Implementar la fuente y capas de resaltado (`dashboard-highlight-source`) con filtros por tipo de geometría.
- [x] Limpiar el resaltado al salir del gráfico y al cambiar de filtros.
- [x] Ajustar el padding de `fitBounds` según el estado del dashboard.

## 3. Interfaz del dashboard

- [x] Añadir `#dashboard`, `#dashboard-toggle` y `#dashboard-body` con las tres tarjetas de gráfico.
- [x] Implementar el panel superpuesto sin redimensionar el mapa.
- [x] Abrir por defecto en escritorio (≥ 1024 px) y mantener cerrado por defecto en móvil.
- [x] Implementar cierre/expansión accesible con `aria-expanded` y `aria-controls`.
- [ ] Implementar carrusel horizontal con scroll-snap en móvil.
- [x] Implementar resumen de filtros activos con acción de limpieza, incluido `rubro`.
- [ ] Implementar estados de esqueleto, sin resultados y error por gráfico.
- [ ] Adaptar colores de ejes, leyendas y tooltips al tema claro/oscuro.

## 4. Integración de Chart.js

- [x] Implementar `loadChartJs()` con URL de versión fija y caché de promesa.
- [x] Cargar Chart.js de forma asíncrona después de que el mapa esté listo.
- [x] Crear una sola instancia por canvas y reutilizarla en cada actualización.
- [x] Configurar `responsive`, `maintainAspectRatio: false` y actualizaciones con `update('none')`.
- [x] Implementar la firma de datos agregados para omitir actualizaciones innecesarias (firma de estado por frame).
- [x] Implementar el plugin inline de líneas de mediana para el gráfico 2.
- [x] Aislar el fallo de CDN o de render en el dashboard sin afectar el mapa.

## 5. Gráfico 1 — Presión territorial

- [x] Agregar toneladas por `region × tratamiento` desde `establecimientos.filtered`.
- [x] Ordenar regiones por total descendente e incluir todas las presentes.
- [x] Renderizar barras horizontales apiladas con los colores de tratamiento existentes.
- [x] Implementar tooltip con toneladas absolutas y porcentaje regional.
- [x] Implementar clic en barra/segmento para aplicar `region` y limpiar `comuna`.
- [x] Implementar toggle para limpiar la región al repetir el clic.
- [x] Implementar hover para resaltar establecimientos de la región/tratamiento.
- [x] Verificar que el tratamiento no se modifique desde el gráfico.

## 6. Gráfico 2 — Humedales vs. presión industrial

- [x] Cruzar ambas capas por la clave compuesta `region + comuna`.
- [x] Agregar suma de `ha`, suma de `toneladas` y conteo de establecimientos por comuna.
- [x] Excluir pares sin `ha > 0` o sin `toneladas > 0`.
- [x] Configurar ejes logarítmicos y burbujas proporcionales al conteo.
- [x] Dibujar medianas de X e Y con el plugin inline.
- [ ] Rotular los valores extremos de superficie y tonelaje.
- [x] Implementar tooltip con comuna, región, hectáreas, toneladas y cantidad de establecimientos.
- [x] Implementar clic para aplicar `region + comuna` y toggle para limpiar.
- [x] Implementar hover para resaltar humedales y establecimientos de la comuna.
- [ ] Verificar el estado vacío con menos de dos comunas válidas.

## 7. Gráfico 3 — Rubros y tratamiento

- [x] Agregar toneladas por `rubro × tratamiento` desde `establecimientos.filtered`.
- [x] Seleccionar el top 10 de rubros por total y agrupar el resto en "Otros".
- [x] Renderizar barras horizontales apiladas al 100 %, ordenadas por total.
- [x] Implementar tooltip con toneladas absolutas y porcentaje por tratamiento.
- [x] Implementar clic en barra/segmento para aplicar `rubro` y toggle para limpiar.
- [x] Deshabilitar la interacción de filtrado sobre "Otros".
- [x] Implementar hover para resaltar establecimientos del rubro/tratamiento.

## 8. Filtro de rubro y sincronización de controles

- [x] Añadir `#filter-rubro` al panel de filtros, poblado desde los establecimientos y con opción "Todos los rubros".
- [x] Sincronizar el select con el estado y con los clics del gráfico 3.
- [x] Aplicar `rubro` solo a establecimientos; no afectar humedales.
- [x] Incluir `rubro` en el reset general y en el resumen de filtros activos.
- [x] Incluir `rubro` en la metadata de exportación.
- [x] Verificar que los contadores de leyenda de tratamiento respeten el rubro activo.

## 9. Interacciones y prevención de ciclos

- [x] Implementar las reglas de toggle de cada gráfico sin limpiar dimensiones de otros controles.
- [x] Sincronizar selects, leyendas, inputs y `aria-pressed` desde `syncControls()`.
- [x] Verificar que ninguna función lea `aria-pressed` o valores de inputs para derivar datos.
- [ ] Implementar el guard `isRendering` y la coalescencia de actualizaciones.
- [x] Verificar que `chart.update('none')` no dispare un nuevo clic ni un bucle de filtros.
- [x] Verificar que `viewer:filtered` se emita una sola vez por render.
- [x] Mantener el comportamiento actual de encuadre para búsqueda, región y comuna; añadir encuadre para clics de gráfico.

## 10. Accesibilidad y rendimiento

- [x] Añadir `role="img"`, `aria-label` actualizado y texto equivalente oculto por gráfico.
- [x] Verificar navegación por teclado del toggle, selects, leyendas y controles de limpieza.
- [x] Respetar `prefers-reduced-motion` (gráficos sin animación; `fitBounds` con duración 0).
- [ ] Medir el costo de `setData` y de las agregaciones con los 9.103 puntos.
- [ ] Añadir debounce de 150 ms a la búsqueda solo si la actualización supera ~100 ms.
- [x] Verificar que abrir/cerrar el dashboard no llame a `map.resize()` ni provoque saltos de encuadre.

## 11. Validación y no regresión

- [x] Verificar (lógica) que los gráficos se actualizan con búsqueda, región, comuna, proceso, tratamiento y rubro.
- [ ] Verificar que un clic en cada gráfico filtra el mapa, los contadores y los demás gráficos.
- [ ] Verificar que el segundo clic limpia solo las dimensiones controladas por ese gráfico.
- [ ] Verificar que el hover resalta sin cambiar filtros ni cifras.
- [x] Verificar la paridad de totales entre gráfico 1, gráfico 3 y establecimientos filtrados.
- [x] Verificar que "Otros" completa el total del gráfico 3.
- [ ] Verificar que ocultar una capa no altera los gráficos y muestra la etiqueta correspondiente.
- [ ] Verificar popups, hover del mapa, mapas base, navegación y exportación sin regresiones.
- [ ] Verificar el comportamiento en escritorio, tablet y móvil, con el dashboard abierto y cerrado.
- [ ] Verificar el manejo de error cuando Chart.js no está disponible.
- [ ] Verificar que la carga inicial no bloquee el mapa mientras Chart.js se descarga.

## 12. Documentación y cierre

- [x] Documentar en el código el contrato del estado, el pipeline y las reglas de toggle.
- [x] Documentar la nueva dependencia (versión, CDN y carga asíncrona) mediante `CHART_CONFIG`.
- [ ] Actualizar la especificación principal al archivar la change, después de `export-filtered-features`.
