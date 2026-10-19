# Diseño Técnico: Análisis de Buffer con Turf.js

## 1. Alcance y experiencia de usuario

La herramienta genera buffers (áreas de influencia) a partir de las geometrías ya cargadas, sin volver a descargar ni re-parsear los GeoJSON. No muta `geojsonData` ni `secondaryData`: el resultado vive en su propia fuente MapLibre y es descartable.

### 1.1 Controles

Sección **Área de influencia (buffer)** colapsable al pie del panel de filtros:

| Control | Default | Acción |
| :--- | :--- | :--- |
| `#buffer-distance` | `100` | Distancia del buffer (número > 0). |
| `#buffer-unit` | `meters` | Unidad: metros o kilómetros. |
| `#buffer-dissolve` | desmarcado | Une topológicamente los buffers solapados, por capa. |
| `#btn-buffer-generate` | — | Genera las áreas. |
| `#btn-buffer-clear` | deshabilitado | Quita el buffer del mapa. |

El detalle del borde no se expone en la UI: se fija en `steps = 16` (64 vértices por círculo) y baja a `steps = 8` cuando se activa dissolve, por estabilidad de `polygon-clipping` (ver §5). A la escala habitual del visor la diferencia entre 8/16/32 no es perceptible, y el control confundía a usuarios no técnicos.

El panel arranca colapsado (`#buffer-body` oculto) para no alterar el alto del visor; el estado (Generando / listo / error) se muestra en `#buffer-status`.

### 1.2 Reglas de inclusión

1. Siempre se usa el mismo conjunto que la exportación (`getExportableFeatures()`): filtros activos **y** grupos visibles (`#toggle-primary` / `#toggle-secondary`). No hay opción de procesar el dataset completo.
2. Cada feature se etiqueta con `capa` (`humedales` / `establecimientos`) para la simbología del buffer.
3. El buffer se calcula una vez y queda como **snapshot**: cambiar filtros después no lo recalcula ni lo elimina (se limpia explícitamente).

---

## 2. Decisión de dependencia

### 2.1 Opciones evaluadas

| Opción | Tamaño | API | Veredicto |
| :--- | :--- | :--- | :--- |
| Buffer propio | 0 | — | Descartado: reproyección + topología a mano. |
| `@turf/turf@7` UMD por CDN | 634 KB min / ≈162 KB gzip | `buffer`, `circle`, `dissolve` | **Seleccionada** |
| Carga inicial de Turf | — | — | Descartada: penaliza el arranque. |
| Web Worker en v1 | — | — | Descartado: el caso por defecto es <1 s. |

### 2.2 Decisión

Se adopta **`@turf/turf@7.0.0`** cargado de forma diferida:

```
https://unpkg.com/@turf/turf@7.0.0/turf.min.js
```

Mismo patrón que la exportación (`loadShpWrite()`), con caché de promesa (`loadTurf()`): una sola descarga por sesión, solo al generar el primer buffer.

### 2.3 Justificación

- Cubre los tres requisitos en una sola librería (buffer, círculos geodésicos y dissolve).
- Compatible con CDN + Vanilla JS y con Zero-Server.
- Costo inicial nulo y tamaño comparable a la dependencia ya aceptada para Shapefile.

---

## 3. Distancia, unidades y precisión

- `@turf/buffer(feature, radius, { units, steps })` acepta `meters`, `kilometers`, `feet`, `miles`, `yards`. La UI se limita a **metros/km**, que son las unidades pertinentes; se descartan `degrees`/`radians`.
- En Turf 7 `buffer` **no** opera en grados: proyecta cada geometría a un azimutal equidistante local centrado en su centroide (`d3-geo`), aplica JSTS `BufferOp` en metros y desproyecta. La distorsión por latitud queda corregida localmente; para radios urbanos (50–1000 m) el error es despreciable. El error crece con radios muy grandes (>5–10 km) o geometrías enormes, y se documenta como limitación.
- `steps` corresponde a *quadrant segments*: un círculo completo usa **4 × steps** vértices. El valor queda fijo en `16` → 64 vértices; con dissolve baja a `8` → 32 vértices (ver §5). No se expone en la UI.
- Para puntos se usa `@turf/circle(feature, distance, { units, steps: steps * 4 })`, que genera círculos geodésicos reales (`destination()`) y es ~3× más rápido que `buffer`, con la misma cantidad de vértices para una suavidad equivalente.
- Para polígonos (`MultiPolygon`) se usa `@turf/buffer`; si devuelve `undefined` (coordenadas degeneradas/NaN) la feature se omite y se informa el conteo.

---

## 4. Procesamiento y rendimiento

El buffer siempre se calcula sobre lo filtrado y visible (no sobre el dataset completo), por lo que el caso real es menor o igual a los totales. Las siguientes mediciones sobre el dataset completo se usaron para dimensionar el detalle fijo y el costo máximo:

| Operación | Tiempo | Vértices | JSON |
| :--- | ---: | ---: | ---: |
| Buffer 9.103 puntos @100 m, steps 8 | 1,15 s | 300.399 | 15,0 MB |
| `circle` 9.103 puntos @100 m, steps 16 | 0,37 s | 300.399 | 15,0 MB |
| Buffer 107 humedales @100 m, steps 8 | 1,77 s | 67.954 | 2,77 MB |
| Buffer 107 humedales @100 m, steps 32 | 1,63 s | 145.093 | 5,86 MB |
| Dissolve 2.000 buffers de puntos | 0,37 s | 58.986 | 2,48 MB |
| Dissolve 5.000 buffers de puntos | 0,89 s | 139.635 | 5,85 MB |
| Dissolve 107 buffers de humedales | 0,24 s | 67.002 | 2,69 MB |

- El costo es lineal por entidad: ≈0,13 ms/punto y ≈16 ms/humedal con steps 8.
- Con dissolve y el dataset completo (9.103 puntos), `steps 16` falla; `steps 8` completa en 1,44 s y produce 6.097 componentes. Por eso el dissolve usa `steps 8`.
- Flujo máximo real (filtros que abarquen todo + dissolve) ≈ 4 s.

---

## 5. Dissolve

- `@turf/dissolve` usa `polygon-clipping.union` y **solo acepta Polygon**, por lo que se aplica `turf.flatten()` antes (convierte `MultiPolygon` en `Polygon`).
- Se disuelve **por capa** con `{ propertyName: 'capa' }`, de modo que humedales y establecimientos mantienen su color y no se fusionan entre sí.
- Devuelve una feature por componente conexa (no necesariamente un único polígono). Medido: 2.000 buffers → 1.665 features; 5.000 → 3.852; 107 humedales → 105 (casi no se tocan a 100 m).
- Aporta valor sobre todo en puntos densos: evita doble opacidad y sobreconteo de área. Es opcional (checkbox), nunca forzado.
- **Limitación de `polygon-clipping`**: con el dataset completo y `steps 16` (64 vértices por círculo), `dissolve` lanza `Infinite loop when putting segment endpoints in a priority queue (queue size too big)`. Es un desborde interno de la librería, no un error de los datos. Medido: 9.103 puntos con `steps 8` disuelven en 1,44 s (6.097 componentes); con `steps 16` falla. Por eso, al activar dissolve se usa `steps 8`. Si aun así fallara, `generateBuffer()` lo captura y muestra un mensaje amigable sugiriendo desactivar la unión, sin romper el visor.

---

## 6. Render

- Fuente: `buffer-source` (`geojson`).
- Capas:
  - `buffer-fill`: `fill-color` según `capa` (humedales `#0ea5e9`, establecimientos `#a855f7`), `fill-opacity` ≈ 0.16.
  - `buffer-line`: mismo color, `line-width` ≈ 1.2, `line-opacity` ≈ 0.7.
- Se insertan **debajo** de centroides y establecimientos (`beforeId`) para no tapar los puntos, y luego se reafirma `moveSecondaryToTop()`.
- `applyBufferToMap()` es idempotente: crea fuente/capas si faltan y actualiza `setData()` si ya existen.
- `clearBuffer()` elimina capas y fuente; no toca los datasets originales.

---

## 7. Integración con el ciclo actual

- `applyFilters()` llama a `updateBufferControls()` para habilitar/deshabilitar **Generar** según el conteo de entidades filtradas y visibles (solo afecta el estado del botón; no borra el buffer ya generado).
- `setBasemap()` restaura el buffer: `restoreData()` ejecuta `applyDataToMap()`, `applySecondaryToMap()` y luego `applyBufferToMap()`, porque MapLibre descarta las capas al cambiar de estilo.
- Turf se carga con `loadTurf()` y caché de promesa, igual que `loadShpWrite()`.

---

## 8. Estados y manejo de errores

| Estado | Comportamiento |
| :--- | :--- |
| Sin entidades filtradas/visibles | **Generar** deshabilitado; texto explicativo. |
| Generando | Ambos botones deshabilitados; "Generando áreas…"; se cede un tick para pintar el estado antes del trabajo síncrono. |
| Éxito | Texto con cantidad de áreas generadas; **Quitar** habilitado. |
| Error (Turf no carga, distancia inválida, sin resultados, dissolve falla) | Mensaje en `#buffer-status`; el visor sigue operativo. |
| Cambio de mapa base | El buffer se re-agrega tras restaurar los datos. |

Sin `alert()`; el feedback vive en el panel.

---

## 9. Rendimiento y Web Workers

- Caso típico (filtros activos, `steps 16`): <0,5–1 s; el mismo orden que la exportación, que ya se resuelve en el hilo principal.
- Peor caso (filtros que abarcan todo + dissolve, `steps 8`): ≈4 s, sin congelamientos prolongados. Se acepta en v1 con feedback explícito.
- **No se implementa Web Worker en esta change.** Si el uso real crece, se evaluará en una change posterior: Worker desde `Blob URL` + `importScripts(turfUrl)`, transfiriendo solo las features y devolviendo el `FeatureCollection`.
- Memoria: se mantiene un único resultado de buffer; se libera al limpiar o reemplazar.

---

## 10. Compatibilidad y no regresión

| Capacidad existente | Impacto |
| :--- | :--- |
| Carga de humedales/SINADER | Sin cambios |
| Filtros, leyendas, toggles de grupo | Sin cambios de semántica |
| Exportación GeoJSON/Shapefile | Sin cambios |
| Popups, mapas base, navegación | Sin cambios |
| `python -m http.server` / GitHub Pages | Sin cambios; Turf se sirve por CDN |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
| :--- | :--- |
| CDN de Turf no disponible | Carga diferida + `try/catch` + mensaje; el visor no se afecta. |
| Congelamiento de UI en filtros amplios + dissolve | Feedback previo, `steps 8` al disolver (peor caso ≈4 s); Web Worker evaluado a futuro. |
| Desborde interno de `polygon-clipping` al disolver | `steps 8` fijo con dissolve y captura del error con mensaje amigable. |
| Buffers que invaden el mar o zonas sin datos | Es el comportamiento esperado de un buffer geométrico; se documenta. |
| Geometrías degeneradas | `buffer` puede devolver `undefined`; se omiten y se informa. |
| Buffer desactualizado tras cambiar filtros | Es un snapshot intencional; se limpia/regenera manualmente. |
| Pérdida de capas al cambiar de estilo | `applyBufferToMap()` se llama en `restoreData()`. |

---

## 12. Fuera de alcance

- Intersecciones o conteos "dentro del buffer" (p. ej. establecimientos por humedal).
- Elegir alcance (dataset completo) o detalle del borde: el buffer siempre usa lo filtrado y visible, con detalle fijo.
- Buffers negativos (erosión) o multi-distancia.
- Reproyección a CRS locales distintos de la aproximación de Turf.
- Exportar el buffer a GeoJSON/Shapefile (podría reutilizar el módulo de exportación en otra change).
- Web Workers.
- Backend, base de datos o claves de API.
