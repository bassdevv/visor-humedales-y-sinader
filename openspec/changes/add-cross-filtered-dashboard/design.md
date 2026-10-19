# Diseño Técnico: Dashboard con Gráficos Cruzados

## 1. Alcance y Principios

El dashboard incorpora tres gráficos que responden preguntas analíticas sobre las dos capas existentes y comparte con el mapa **un único estado de filtros**. El mapa sigue siendo el elemento principal: el dashboard es un panel superpuesto, colapsable, que no redimensiona ni reemplaza el canvas.

Principios de la implementación:

1. **Una sola fuente de verdad.** Ningún gráfico, contador o capa mantiene su propio subconjunto filtrado.
2. **Una sola semántica de filtrado.** Un predicado y una pasada de derivación alimentan mapa, gráficos, contadores, leyendas y exportación.
3. **El DOM no es estado.** Los inputs, selects y `aria-pressed` son vistas que se sincronizan desde el estado; nunca se leen para derivar datos.
4. **Toda interacción pasa por un único punto de actualización.** Controles del visor y clics de gráficos producen el mismo tipo de patch sobre el mismo estado.
5. **Client-side y sin build.** Chart.js se carga por CDN con versión fijada y de forma asíncrona.

---

## 2. Auditoría del Estado Actual

Antes de añadir gráficos hay que corregir la fragmentación existente:

| Elemento actual | Rol actual | Problema |
| :--- | :--- | :--- |
| `filters` (`search`, `region`, `comuna`) | Estado de filtros compartidos | Solo cubre tres dimensiones |
| `aria-pressed` de `.legend-toggle` | Estado de proceso/tratamiento | El DOM es la fuente de verdad |
| `primaryVisible` / `secondaryVisible` | Visibilidad de grupos | Estado fuera del objeto de filtros |
| `buildFilterExpression()` / `buildSecondaryFilterExpression()` | Filtrado del mapa | Primera implementación de la semántica |
| `matchesPrimarySharedFilters()` / `matchesSecondarySharedFilters()` | Filtrado JS para contadores y exportación | Segunda implementación de la misma semántica |
| `filteredFeatures` / `filteredSecondaryFeatures` | Subconjuntos filtrados | Se recalculan en varios caminos |

Añadir un gráfico que filtre por su cuenta crearía una tercera implementación y permitiría que, por ejemplo, el mapa muestre 120 establecimientos y un gráfico sume 135. Este diseño elimina esa posibilidad.

**Decisión:** se reemplazan las expresiones de MapLibre y los predicados duplicados por un único predicado JavaScript. El mapa recibe exactamente los mismos arreglos que los gráficos mediante `source.setData(...)`. Con 107 polígonos y 9.103 puntos, el volumen es apto para este enfoque y no requiere Web Workers.

---

## 3. Estado Centralizado

### 3.1 Forma del estado

```json
{
  "filters": {
    "search": "",
    "region": "",
    "comuna": "",
    "proceso": null,
    "tratamiento": null,
    "rubro": null
  },
  "view": {
    "humedales": true,
    "establecimientos": true
  },
  "ui": {
    "dashboardOpen": true
  }
}
```

Convenciones:

- `search`, `region`, `comuna`: cadena vacía significa "sin restricción". `search` se guarda en minúsculas y sin espacios extremos, igual que hoy.
- `proceso`, `tratamiento`, `rubro`: `null` significa "todos"; un arreglo es una selección explícita (un arreglo vacío significa "ninguno"). Esta representación evita la ambigüedad entre "todo seleccionado" y "nada seleccionado".
- `view` describe visibilidad. **No es un filtro**: no altera los datos de los gráficos. Los gráficos muestran siempre el subconjunto filtrado, y una capa oculta se indica con una etiqueta "capa oculta" en el dashboard.
- `ui` no interviene en la derivación de datos.

La exportación conserva su regla actual de "lo que se ve": sigue excluyendo las capas ocultas, aunque los gráficos las incluyan.

### 3.2 Único punto de actualización

Toda modificación pasa por una sola función:

```text
updateViewerState(patch, origin)
```

- `patch` puede incluir `filters`, `view` o `ui`.
- `origin` identifica el control de origen (`search`, `region`, `comuna`, `legend`, `rubro`, `chart`, `reset`, `load`, `toggle`) y solo se usa para decisión de encuadre, depuración y evitar recargas innecesarias; no crea rutas paralelas.
- La función normaliza, compara con el estado anterior, deriva una vez y renderiza una vez.
- Si el estado de filtros no cambió, se omiten derivación y actualización de datos; solo se sincroniza la vista si hace falta.

Reglas de normalización:

| Regla | Comportamiento |
| :--- | :--- |
| Cambio de región | Si la comuna actual no pertenece a la nueva región, `comuna = ''`. |
| Comuna sin región válida | Se descarta (`comuna = ''`). |
| Categorías | Se eliminan duplicados y valores desconocidos; si la selección cubre todas las opciones, se guarda `null`. |
| `rubro` | Solo afecta a establecimientos; se ignora al evaluar humedales. |
| Búsqueda | `trim` + `toLocaleLowerCase('es-CL')`. |
| Sin cambios | No se emite un nuevo evento ni se recalculan gráficos. |

### 3.3 Derivación única

`deriveViewerData(state)` es una función pura que produce un snapshot:

```text
{
  version,
  humedales: {
    all,
    shared,      // sin el filtro de proceso (para contadores de leyenda)
    filtered     // con todos los filtros
  },
  establecimientos: {
    all,
    shared,      // sin el filtro de tratamiento (para contadores de leyenda)
    filtered     // con todos los filtros
  },
  counts,
  charts: {
    regionTreatment,
    comunaPressure,
    rubroTreatment
  }
}
```

- `filtered` alimenta mapa, gráficos, exportación y evento `viewer:filtered`.
- `shared` alimenta únicamente los contadores de leyenda, preservando la semántica actual: el contador de cada categoría no se colapsa por su propia selección.
- No se crean copias mutables independientes: los arreglos derivados son los que consume cada vista.
- `version` se incrementa en cada cambio de filtros aceptado y permite descartar renders obsoletos.

### 3.4 Pipeline único de renderizado

```text
updateViewerState(patch, origin)
  → normalizeViewerState()
  → deriveViewerData()
  → renderViewer()
      1. syncControls()        // inputs, selects, aria-pressed, resumen de filtros
      2. renderMapData()       // setData de fuentes y centroides; visibilidad
      3. renderCounters()      // contadores, leyendas y estado de exportación
      4. renderCharts()        // Chart.js, sin animación y sin recrear instancias
      5. dispatchViewerEvent() // viewer:filtered con el snapshot actual
```

Ninguna otra función tiene permitido asignar `filters`, sobrescribir `filteredFeatures` ni leer `aria-pressed` para decidir datos. Las funciones existentes de exportación se adaptan para leer el snapshot vigente en lugar de variables paralelas.

El pipeline se coalesce con `requestAnimationFrame`: varias actualizaciones en el mismo frame producen un solo render con la última versión del estado.

---

## 4. Filtrado Unificado

### 4.1 Un predicado, dos capas

```text
matchesViewerFilters(capa, properties, filters)
```

Es el único lugar donde vive la semántica. Configuración declarativa por capa:

| Capa | Campos de búsqueda | Categoría propia | Otras dimensiones |
| :--- | :--- | :--- | :--- |
| Humedales | `nombre_humedal`, `cod_humedal` | `proceso_humedal_urbano` | `region`, `comuna`, `search` |
| Establecimientos | `nombre`, `razon_social`, `id_vu` | `tratamiento`, `rubro` | `region`, `comuna`, `search` |

La búsqueda conserva la coerción a texto y la normalización actuales, de modo que el comportamiento no cambie.

### 4.2 Mapa sin expresiones duplicadas

Para garantizar paridad total:

- Las fuentes GeoJSON declaran `promoteId` (`cod_humedal` en humedales, `id_vu` en establecimientos) para tener identificadores estables.
- `renderMapData()` aplica `setData()` a:
  - la fuente principal con `humedales.filtered`;
  - la fuente de centroides con `buildCentroidData(humedales.filtered)`;
  - la fuente secundaria con `establecimientos.filtered`.
- Se eliminan `buildFilterExpression()` y `buildSecondaryFilterExpression()`; no se usa `map.setFilter()` para los filtros de datos.
- Si no hay filtros activos se usa el conjunto completo. `setData` solo se ejecuta cuando cambia la firma derivada (filtros), nunca por cambios de visibilidad o de basemap.
- Tras un cambio de estilo, el pipeline vuelve a aplicar los datos y la visibilidad, igual que hoy ocurre con las capas.

**Trade-off asumido:** `setData` re-serializa el subconjunto en MapLibre. Con 9.103 puntos es aceptable; se coalesce por frame y, si la medición en un equipo modesto supera ~100 ms por actualización, se añade un debounce de 150 ms únicamente a la búsqueda. No se vuelve a dos evaluadores de filtrado.

### 4.3 Resaltado sin filtrar

El resaltado desde gráficos usa una fuente y capas propias (`dashboard-highlight-source`), no `setFilter`:

- Al hacer hover en un gráfico se seleccionan features del snapshot con el mismo predicado y se cargan en la fuente de resaltado.
- Tres capas (relleno, línea, círculo) con filtros por tipo de geometría dibujan el resaltado por encima de las capas existentes.
- Al salir del gráfico se vacía la fuente.
- Esto no modifica `viewerState.filters`, no altera contadores y no dispara `viewer:filtered`.
- El hover se limita a ~120 ms para no recalcular en cada píxel del ratón.

---

## 5. Contrato de los Gráficos

| # | Pregunta | Fuente | Clave | Serie | Medida | Agregación | Filtros aplicados |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ¿Qué regiones concentran el tonelaje y cómo se reparte por tratamiento? | `establecimientos.filtered` | `region` | `tratamiento` | `toneladas` | Suma por región × tratamiento; orden descendente por total | Todos |
| 2 | ¿La superficie de humedales y la presión industrial coinciden en las mismas comunas? | `humedales.filtered` + `establecimientos.filtered` | `region` + `comuna` | — | `ha`, `toneladas`, conteo de establecimientos | Suma de `ha` (X), suma de `toneladas` (Y), conteo (tamaño de burbuja) | Todos, con intersección de comunas |
| 3 | ¿Qué rubros concentran el tonelaje y qué proporción se valoriza? | `establecimientos.filtered` | `rubro` | `tratamiento` | `toneladas` | Suma por rubro × tratamiento; top 10 por total + "Otros" | Todos |

Reglas comunes:

- Los colores de `tratamiento` provienen de `SECONDARY_STYLE.colors`; el gráfico 2 usa un color neutro con borde por proceso para no introducir una simbología nueva.
- Los valores se formatean con `es-CL`; toneladas y hectáreas se muestran con separador de miles y hasta una decimal.
- No se suman `ha` con `toneladas`: el gráfico 2 las usa como ejes independientes.
- Los gráficos se crean una sola vez. Las actualizaciones usan `chart.update('none')` para evitar animaciones y parpadeos.
- Cada gráfico compara una firma de sus datos agregados y omite la actualización si no cambió.

### 5.1 Gráfico 1 — Presión territorial

- **Tipo:** barras horizontales apiladas (`indexAxis: 'y'`).
- **Etiquetas:** todas las regiones presentes tras los filtros, ordenadas por total descendente.
- **Series:** Eliminación, Valorización, Recepción y Almacenamiento, Sin clasificar.
- **Tooltip:** toneladas absolutas y porcentaje del total regional.
- **Clic en una barra o segmento:** aplica `region = R` y limpia `comuna`. Un segundo clic sobre la misma región la limpia. El tratamiento **no** se modifica desde aquí: su control sigue siendo la leyenda existente, evitando dos controles para la misma dimensión.
- **Hover:** resalta en el mapa los establecimientos de la región (y del tratamiento del segmento, si aplica).

### 5.2 Gráfico 2 — Humedales vs. presión industrial por comuna

- **Tipo:** burbujas (`bubble`).
- **Eje X:** suma de `ha` por comuna. **Eje Y:** suma de `toneladas` por comuna. Ambos logarítmicos.
- **Tamaño:** cantidad de establecimientos de la comuna.
- **Inclusión:** solo comunas con `ha > 0` y `toneladas > 0` después de los filtros; la clave es el par `region + comuna` para evitar homónimos entre regiones.
- **Referencias:** líneas en las medianas de X e Y mediante un plugin inline; no se añade otra dependencia.
- **Etiquetas:** se rotulan los valores extremos (mayor superficie, mayor tonelaje) para que el gráfico siga siendo legible sin hover.
- **Tooltip:** comuna, región, hectáreas, toneladas y cantidad de establecimientos; incluye una nota de que la relación es exploratoria y no causal.
- **Clic en burbuja:** aplica `region` y `comuna`; un segundo clic sobre la misma burbuja limpia ambas.
- **Hover:** resalta humedales y establecimientos de esa comuna.

### 5.3 Gráfico 3 — Rubros y tratamiento

- **Tipo:** barras horizontales apiladas al 100 % (`indexAxis: 'y'`, `stacked: true` con normalización por rubro).
- **Etiquetas:** top 10 de rubros por tonelaje total + "Otros"; el resto se agrupa y no es interactivo.
- **Series:** los mismos tratamientos del gráfico 1.
- **Tooltip:** toneladas absolutas del rubro y porcentaje por tratamiento.
- **Clic en una barra o segmento:** aplica `rubro = R`; un segundo clic sobre el mismo rubro lo limpia. El tratamiento no se modifica desde aquí.
- **Hover:** resalta los establecimientos de ese rubro (y tratamiento del segmento).
- **Control accesible:** se añade un select `#filter-rubro` al panel de filtros, con "Todos los rubros". El clic del gráfico actualiza ese select y viceversa. Esto hace visible y accesible una dimensión que de otro modo solo existiría dentro del canvas.

---

## 6. Modelo de Interacción

### 6.1 Direcciones de sincronización

| Origen | Cambio en el estado | Efecto |
| :--- | :--- | :--- |
| Búsqueda, región, comuna, proceso, tratamiento, rubro | `filters` | Mapa, contadores, leyendas, exportación y los tres gráficos se actualizan |
| Clic en gráfico 1 | `region` (y `comuna = ''`) | Mapa filtrado y encuadrado; controles sincronizados; gráficos recalculados |
| Clic en gráfico 2 | `region`, `comuna` | Igual, acotado a la comuna |
| Clic en gráfico 3 | `rubro` | Igual, acotado al rubro |
| Hover en cualquier gráfico | Ninguno (estado efímero de resaltado) | Solo resalta features en el mapa |
| Interruptor de visibilidad | `view` | Solo oculta/muestra capas; los gráficos no cambian y muestran la etiqueta "capa oculta" |
| Abrir/cerrar dashboard | `ui` | Solo presentación; no altera filtros ni datos |
| Reset | Limpia `filters` completo | Igual que hoy, ampliado con `rubro`; la visibilidad no cambia |

### 6.2 Reglas de toggle y limpieza

- Un clic sobre el elemento ya seleccionado limpia las dimensiones que ese gráfico controla, nunca las dimensiones de otro control.
- Al aplicar una región desde un gráfico se limpia la comuna anterior, porque una comuna siempre pertenece a una región.
- `rubro` se puede limpiar desde el mismo gráfico, desde el select o con el reset general.
- El resumen de filtros del dashboard muestra las dimensiones activas con una acción de limpieza, incluida `rubro`.

### 6.3 Prevención de ciclos e inconsistencias

- Los clics de Chart.js llaman a `updateViewerState` una sola vez; las actualizaciones programáticas de datos con `chart.update('none')` no emiten eventos de clic.
- Un guard `isRendering` evita que una interacción se procese durante el render; el pipeline coalescido garantiza un solo render por frame.
- La comparación de estado normalizado evita renders y eventos redundantes.
- Los gráficos no filtran datos por su cuenta: reciben `snapshot.charts` ya agregado por el pipeline.
- Los contadores, la exportación y `viewer:filtered` consumen el mismo snapshot; una diferencia entre ellos es un defecto de implementación, no un caso válido.

### 6.4 Encuadre del mapa

- Cuando el origen del cambio es un gráfico, se encuadra el subconjunto filtrado con `fitMapToData`.
- El padding inferior de `fitBounds` considera la altura del dashboard abierto para que la selección no quede oculta.
- El dashboard se superpone al canvas; no se llama a `map.resize()` al abrirlo o cerrarlo.

---

## 7. Interfaz y Protagonismo del Mapa

- **Contenedor:** `#dashboard`, panel fijo inferior con `#dashboard-toggle` (botón "Análisis", `aria-expanded` / `aria-controls`) y `#dashboard-body`.
- **Escritorio (≥ 1024 px):** abierto por defecto, altura máxima 40 vh, tres tarjetas en una fila; el mapa conserva todo el viewport detrás y al menos el 60 % visible.
- **Móvil (< 1024 px):** cerrado por defecto; al abrirse ocupa como máximo 45 vh, con tarjetas en carrusel horizontal con scroll-snap. El botón permanece siempre accesible.
- **No reflow:** el dashboard es una capa superpuesta; no reduce ni desplaza el contenedor del mapa, y los controles de navegación siguen operativos.
- **Conflicto con otros paneles:** el panel de filtros mantiene su posición y z-index; el dashboard se ancla al borde inferior con márgenes que evitan tapar los controles de navegación.
- **Estados:** esqueletos mientras faltan datos; mensaje "Sin resultados para los filtros actuales" cuando una agregación queda vacía; mensaje de error si Chart.js no carga.
- **Tema:** colores de ejes, leyendas y tooltips se ajustan al tema claro/oscuro vigente; los colores de tratamiento reutilizan la simbología del mapa.

---

## 8. Integración de Chart.js

- **Versión fijada:** se usa una versión 4.x concreta (por ejemplo, `chart.js@4.4.7` en jsDelivr) para evitar cambios silenciosos. No se usa `@latest`.
- **Carga:** script dinámico con caché de promesa, iniciado después de que el mapa esté listo y exista una primera derivación de datos. No se añade al `head` de forma bloqueante.
- **Sin plugins adicionales:** las líneas de mediana del gráfico 2 se dibujan con un plugin inline; no se incorpora `chartjs-plugin-annotation`.
- **Fallo de CDN:** el dashboard muestra un error controlado; mapa, filtros, popups y exportación siguen funcionando. No se usa `alert()`.
- **Ciclo de vida:** las instancias se crean una vez por canvas y se reutilizan; se destruyen solo si el dashboard se reconstruye. `responsive: true`, `maintainAspectRatio: false`, animaciones desactivadas.
- **Datos faltantes:** si la capa secundaria falla, los gráficos 1 y 3 muestran "SINADER no disponible" y el gráfico 2 no se bloquea si hay humedales.

---

## 9. Rendimiento

| Operación | Costo | Mitigación |
| :--- | :--- | :--- |
| Filtrado | O(n), n = 9.210 features | Una sola pasada por capa y frame |
| Agregaciones | O(n) con `Map` | Se calculan dentro de la misma derivación |
| `setData` del mapa | Serialización del subconjunto | Solo con cambios de filtros; coalescido por frame |
| Actualización de gráficos | 3 canvas | `update('none')`; se omite si la firma no cambió |
| Hover de resaltado | O(n) por evento | Throttle ~120 ms y solo sobre el snapshot vigente |
| Búsqueda | Potencial escritura por tecla | Coalescencia por frame; debounce de 150 ms solo si se mide latencia > 100 ms |

La carga inicial no ejecuta agregaciones pesadas hasta que los datos están disponibles. Chart.js no se descarga si el usuario nunca abre el dashboard en pantallas donde está colapsado (en escritorio se abre por defecto y se carga tras el mapa).

---

## 10. Accesibilidad

- El botón del dashboard tiene `aria-expanded`, `aria-controls` y texto visible; se puede operar con teclado.
- Cada canvas lleva `role="img"` y un `aria-label` con un resumen actualizado (por ejemplo, "Tonelaje por región y tratamiento; 11,5 millones de toneladas en 16 regiones").
- Cada gráfico tiene una tabla o lista equivalente visualmente oculta, actualizada con el mismo snapshot, para lectores de pantalla.
- Las interacciones de clic son una mejora: todas las dimensiones siguen siendo controlables desde inputs, selects y leyendas nativas. `rubro` cuenta con su propio select.
- No se atrapa el foco; el panel no bloquea la navegación del mapa ni de los controles existentes.
- Se respeta `prefers-reduced-motion` (sin animaciones de gráficos).

---

## 11. Manejo de Errores

- Chart.js no disponible → mensaje en el dashboard, mapa intacto.
- Una agregación con datos insuficientes (por ejemplo, menos de dos comunas con ambas capas) → estado vacío explicativo, no un error.
- Excepción durante el render de un gráfico → se aísla en `try/catch`, se muestra el error en esa tarjeta y los demás gráficos y el mapa continúan.
- Datos de capa ausentes → los gráficos afectados se marcan como no disponibles.
- Nunca se rompe la carga inicial por un fallo del dashboard.

---

## 12. No Regresión

| Capacidad existente | Impacto esperado |
| :--- | :--- |
| Carga de humedales y SINADER | Sin cambios en datos ni en URLs |
| Búsqueda, región, comuna | Misma semántica; ahora centralizada |
| Leyendas de proceso/tratamiento | Mismos contadores; el DOM se sincroniza desde el estado |
| Interruptores de grupo | Igual; además condicionan la exportación como hoy |
| Popups y hover del mapa | Sin cambios; el resaltado se dibuja en capas adicionales |
| Mapas base y navegación | Sin cambios; el dashboard no redimensiona el mapa |
| Exportación GeoJSON/Shapefile | Sigue usando lo filtrado y visible; su metadata incorpora `rubro` |
| Evento `viewer:filtered` | Se mantiene y emite una sola vez por render con el snapshot vigente |
| GitHub Pages / `python -m http.server` | Sin cambios; Chart.js se sirve por CDN |

**Invariantes verificables:**

1. La suma de toneladas del gráfico 1 es igual a la del gráfico 3 y a la del conjunto filtrado de establecimientos.
2. El total de barras del gráfico 3 (incluido "Otros") es igual al total filtrado.
3. Para cualquier filtro, los conteos del mapa, los contadores y los gráficos provienen del mismo `snapshot.version`.
4. Cambiar visibilidad no altera ninguna cifra de los gráficos.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Mitigación |
| :--- | :--- |
| Divergencia entre mapa y gráficos | `setData` con los mismos arreglos derivados; se eliminan los evaluadores paralelos |
| Estado duplicado en el DOM | `syncControls()` es la única escritura; ninguna lectura de `aria-pressed` para derivar |
| Ciclos de actualización | Un solo punto de entrada, toggle idempotente, guard de render y coalescencia por frame |
| Colapso de un gráfico al filtrar su propia dimensión | Toggle para limpiar, resumen de filtros y reset; comportamiento documentado |
| `setData` costoso en equipos lentos | Volumen acotado, coalescencia y debounce medido solo para búsqueda |
| Homónimos de comunas | Clave compuesta `region + comuna` en la agregación y el cruce |
| Tonelaje muy sesgado | Ejes logarítmicos en el scatter, medianas y tooltip con valores absolutos |
| `rubro` filtrado sin control visible | Select dedicado y resumen de filtros; se sincroniza con el gráfico |
| Dashboard tapa el mapa en móvil | Cerrado por defecto, altura máxima y carrusel; el canvas no se redimensiona |
| Versión de Chart.js cambia | URL con versión fija |
| CDN bloqueada | Error aislado en el dashboard; el visor sigue operativo |

---

## 14. Dependencias y Orden de Cierre

- Esta change consume el estado filtrado y la exportación existentes. Debe archivarse **después** de `export-filtered-features`, para que la especificación principal ya contenga los requisitos de exportación antes de aplicar este delta.
- No introduce cambios en `scripts/build_sinader_geojson.py` ni en los artefactos de datos.

---

## 15. Fuera de Alcance

- Nuevas capas, nuevas fuentes de datos o series temporales (solo existe `anio = 2024`).
- Selección por rectángulo o lazo (brush) y filtros espaciales dibujados.
- Exportar los gráficos como imagen, CSV o informe.
- Persistir filtros en la URL o en `localStorage`.
- Nuevos mapas base, cambios de simbología o rediseño del panel de filtros.
- Backend, base de datos o claves de API.
- Web Workers y virtualización de gráficos.
