# Tareas de Implementación: Análisis de Buffer con Turf.js

## 1. Configuración y dependencia
- [x] Definir `BUFFER_CONFIG` (URL de Turf 7, fuente/capas, defaults, paleta).
- [x] Implementar `loadTurf()` con `<script>` diferido y caché de promesa.
- [x] Verificar que la carga inicial no descargue Turf.

## 2. Interfaz
- [x] Añadir la sección colapsable **Área de influencia (buffer)** con `#buffer-toggle` / `#buffer-body`.
- [x] Añadir controles: distancia, unidad y unión de áreas superpuestas.
- [x] Añadir botones `#btn-buffer-generate` y `#btn-buffer-clear` y `#buffer-status`.
- [x] Implementar `updateBufferControls()` (estado y conteo según filtros y visibilidad).

## 3. Cálculo
- [x] Implementar `getBufferInputFeatures()` reutilizando `withCapa()` y `getExportableFeatures()`.
- [x] Implementar puntos con `turf.circle` y polígonos con `turf.buffer`.
- [x] Aplicar detalle fijo (16, y 8 al disolver; ×4 en `circle` para suavidad equivalente).
- [x] Implementar dissolve opcional con `turf.flatten` + `{ propertyName: 'capa' }`.
- [x] Omitir geometrías degeneradas (`undefined`) e informar.

## 4. Render y ciclo de vida
- [x] Implementar `applyBufferToMap()` idempotente (fuente `buffer-source`, capas `buffer-fill`/`buffer-line`).
- [x] Insertar las capas debajo de centroides/establecimientos.
- [x] Implementar `clearBuffer()`.
- [x] Restaurar el buffer en `restoreData()` al cambiar de mapa base.
- [x] Llamar a `updateBufferControls()` desde `applyFilters()`.

## 5. Validación y no regresión
- [x] Verificar buffer de establecimientos (puntos) y humedales (polígonos).
- [x] Verificar que respeta filtros y grupos ocultos.
- [x] Verificar disolver activado/desactivado, incluido el dataset completo sin el error de `polygon-clipping`.
- [x] Verificar Generar deshabilitado sin entidades y con distancia inválida.
- [x] Verificar Limpiar buffer.
- [x] Verificar restauración tras cambiar Satélite/Claro/Oscuro.
- [x] Verificar que Turf no se descarga hasta generar.
- [x] Verificar que filtros, exportación, popups y leyendas siguen intactos.
- [x] Revisar layout en escritorio y móvil.

## 6. Cierre
- [ ] Actualizar la especificación principal al archivar la change.
