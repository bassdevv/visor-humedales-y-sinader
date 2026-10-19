# Propuesta: Dashboard con Gráficos Cruzados (Cross-Filtering)

## Why

### Background

El visor ya integra dos capas con atributos complementarios:

- **Humedales urbanos** (107 registros): `region`, `comuna`, `cod_humedal`, `nombre_humedal`, `ha`, `proceso_humedal_urbano`.
- **Establecimientos SINADER 2024** (9.103 registros): `region`, `comuna`, `id_vu`, `nombre`, `razon_social`, `rubro`, `toneladas`, `registros`, `tratamiento`.

Ambas comparten `region` y `comuna` (61 comunas en común), lo que permite cruces territoriales. Los datos soportan tres preguntas analíticas reales:

1. **Presión territorial**: la Región Metropolitana (3,35 M t), Biobío (2,30 M t) y Antofagasta (1,43 M t) concentran el mayor tonelaje declarado, con mezclas distintas de eliminación, valorización y almacenamiento.
2. **Cruce humedal–industria**: la superficie de humedales por comuna y el tonelaje declarado por comuna muestran una relación débil (r ≈ 0,12): el tamaño del humedal no predice la presión industrial, un hallazgo que solo se ve al agregar ambas capas.
3. **Rubros**: Construcción (2,73 M t) y Otras industrias manufactureras (2,57 M t) lideran por tonelaje, un ranking distinto al de cantidad de establecimientos.

Hoy el visor solo muestra estos datos como puntos y polígonos, con contadores y filtros. No hay ninguna vista agregada que responda esas preguntas.

### Problem Statement

Agregar gráficos de forma ingenua duplicaría el filtrado y crearía estados inconsistentes. El código actual ya tiene tres fuentes de verdad parciales:

- el objeto `filters` (`search`, `region`, `comuna`);
- el DOM como estado de las categorías (`aria-pressed` en las leyendas);
- las variables `primaryVisible` / `secondaryVisible`.

Además, la semántica de filtrado está implementada dos veces: una en expresiones de MapLibre (`buildFilterExpression`, `buildSecondaryFilterExpression`) y otra en predicados JavaScript (`matchesPrimarySharedFilters`, `matchesSecondarySharedFilters`). Un dashboard añadiría una tercera derivación y sería fácil que mapa, contadores, leyenda y gráficos mostraran subconjuntos distintos.

Se necesita un dashboard que:

- comparta un **único estado de filtros** con el mapa;
- se actualice con cualquier filtro del visor;
- permita que una selección en un gráfico filtre el mapa;
- no replique la lógica de filtrado;
- funcione íntegramente en el cliente;
- mantenga el mapa como elemento visual principal.

### Alternatives Considered

- **Cada gráfico filtra por su cuenta sobre los datos crudos**: descartado. Multiplica la lógica y garantiza divergencias entre gráficos y mapa.
- **Mantener el DOM como fuente de verdad y que los gráficos lean `aria-pressed`**: descartado. Es frágil, difícil de testear y provoca ciclos de actualización.
- **Conservar los filtros de MapLibre y calcular los gráficos por separado**: descartado. Son dos evaluadores de la misma regla, justo lo que se quiere evitar.
- **Librería BI completa (por ejemplo, un dashboard embebido)**: descartado. Añade peso, build y una arquitectura ajena al proyecto Zero-Server de archivo único.
- **Chart.js desde CDN + estado centralizado**: seleccionado. Librería madura, sin build, con los tres tipos de gráfico necesarios (barras apiladas y burbujas) y actualizaciones eficientes sobre canvas.

---

## What Changes

- Introducir un **estado de filtros central** (`viewerState`) como única fuente de verdad, con una sola función de actualización y un único pipeline de derivación y renderizado.
- **Unificar el filtrado** en un predicado y una pasada de derivación; mapa, contadores, leyenda, exportación y gráficos consumen los mismos arreglos filtrados.
- Añadir un **dashboard con tres gráficos Chart.js**:
  1. tonelaje por región y tratamiento (barras horizontales apiladas);
  2. superficie de humedales vs. tonelaje por comuna (burbujas, ejes logarítmicos);
  3. tonelaje por rubro y tratamiento (barras horizontales apiladas al 100 %).
- Añadir **cross-filtering**: clic en región, comuna o rubro aplica el filtro al estado compartido y actualiza mapa, controles y demás gráficos; segundo clic lo limpia.
- Añadir **resaltado en el mapa** al pasar el cursor por un gráfico, sin modificar los filtros.
- Incorporar `rubro` como **nueva dimensión de filtro** de la capa SINADER, visible, accesible y reseteable, para que una selección hecha en el gráfico no quede oculta en el estado.
- Cargar **Chart.js por CDN con versión fijada** y de forma asíncrona; sin backend, sin build y sin bloquear la carga del mapa.
- Integrar el dashboard como **panel superpuesto y colapsable**, sin redimensionar el mapa, colapsado por defecto en móvil.

---

## Capabilities

- `geospatial-viewer`: se agrega un dashboard analítico cruzado que comparte el estado de filtros con el mapa y permite filtrar el mapa desde los gráficos.

---

## Impact

- **Archivos afectados**: `index.html` (estado, filtrado, UI del dashboard, integración de Chart.js).
- **Nueva dependencia**: Chart.js 4.x por CDN, con versión fijada. Se carga después de MapLibre y solo una vez.
- **Sin backend, sin base de datos, sin claves de API, sin paso de build.**
- **Sin cambios** en `data/*.geojson`, en la simbología, en los mapas base ni en la semántica de los filtros existentes.
- **Refactor interno**: se eliminan las dos implementaciones actuales del filtrado (`buildFilterExpression` / predicados JavaScript) en favor de una sola derivación; el mapa recibe los mismos arreglos que los gráficos.
- **Exportación existente**: sigue usando los arreglos filtrados centrales; su metadata incorpora `rubro`.
- **Orden de cierre**: esta change se archiva después de `export-filtered-features`, para que su delta de especificación se aplique sobre una spec que ya incluya la exportación.

El detalle del estado, el contrato de los gráficos y las reglas de interacción se documentan en `design.md`.
