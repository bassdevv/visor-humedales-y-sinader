# Propuesta: Análisis de Buffer con Turf.js

## Why

### Background

El visor ya permite filtrar humedales y establecimientos, ver su simbología, exportar el subconjunto filtrado y cambiar de mapa base. Sin embargo, no ofrece ninguna herramienta de análisis espacial: no se puede responder preguntas de proximidad como "¿qué establecimientos están a 500 m de un humedal?" ni visualizar áreas de influencia.

La arquitectura es estática, de archivo único y sin backend (`index.html` + `data/*.geojson` sobre GitHub Pages). Cualquier análisis debe resolverse íntegramente en el navegador, sobre los datos ya cargados, sin subirlos a un servidor ni agregar un paso de build. La exportación ya estableció el patrón de cargar una librería por CDN bajo demanda (ver `loadShpWrite()`), reutilizable aquí.

### Problem Statement

Se necesita incorporar análisis de buffer (área de influencia por distancia) con Turf.js, de forma client-side, para las entidades actualmente filtradas y visibles. La herramienta debe permitir elegir distancia y unidades, procesar los humedales (`MultiPolygon`) y los establecimientos (`Point`), y opcionalmente disolver los solapamientos. Hay que decidir la dependencia, la estrategia de render y si se requiere un Web Worker.

### Alternatives Considered

- **Sin librería (buffer propio)**: descartado. Reproyectar, generar arcos y unir topológicamente a mano es costoso y propenso a errores.
- **Turf.js vía CDN, carga diferida (seleccionada)**: cubre `buffer`, `circle` y `dissolve`; 634 KB min / ≈162 KB gzip, comparable a `shp-write`; se carga solo al abrir/ejecutar el análisis.
- **Cargar Turf al inicio**: descartado. Penaliza el arranque del visor para una función opcional.
- **Buffer en backend**: descartado. Viola Zero-Server.
- **Web Worker desde la v1**: descartado por ahora. El caso típico (filtros activos, detalle fijo) tarda <1 s; se reevaluará si el uso crece.

---

## What Changes

- Añadir a `index.html` una sección **Área de influencia (buffer)** (colapsable) en el panel de filtros.
- Controles: distancia, unidad (m/km) y **Unir áreas superpuestas** (dissolve opcional). El detalle del borde es fijo (se reduce automáticamente al disolver) y el alcance siempre es lo filtrado y visible.
- Cargar **Turf.js v7** de forma diferida desde CDN, solo al generar el primer buffer.
- Generar el buffer en el cliente sobre los datos ya cargados:
  - puntos → `turf.circle` (geodésico, más rápido y preciso);
  - polígonos → `turf.buffer`.
- Renderizar el resultado en una **fuente y capas MapLibre dedicadas** (`buffer-fill` / `buffer-line`), sin mutar `geojsonData` ni `secondaryData`.
- Ofrecer **Limpiar buffer** para quitar las capas y el estado.
- Mostrar **feedback** (Generando / listo / error) y deshabilitar controles cuando corresponda.
- Restaurar el buffer tras cambiar de mapa base (MapLibre descarta las capas al cambiar de estilo).
- Mantener sin cambios: datos fuente, filtros, simbología, popups, exportación y mapas base.

---

## Capabilities

- `geospatial-viewer`: se agrega la capacidad de generar y visualizar buffers de distancia sobre las entidades filtradas y visibles, íntegramente en el cliente.

---

## Impact

- **Archivos afectados**: `index.html` (UI, módulo de buffer, carga diferida de Turf, restauración en cambio de estilo).
- **Nueva dependencia**: `@turf/turf@7` por CDN, cargada solo al generar el buffer. Evaluación en `design.md` §2.
- **Sin backend, sin base de datos, sin claves de API.**
- **Sin cambios** en `data/*.geojson`, filtros, simbología, exportación ni mapas base.
- **Costo inicial**: nulo; Turf no se descarga hasta que el usuario genera un buffer.

El detalle técnico (unidades, reglas de inclusión, dissolve, rendimiento medido y decisión sobre Web Workers) se documenta en `design.md`.
