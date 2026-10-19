# Especificación: Dashboard con Gráficos Cruzados

## ADDED Requirements

### Requirement: Fuente única de verdad para los filtros

The system SHALL maintain exactly one authoritative in-memory filter state that drives the map, the charts, the counters, the legends, the export, and the `viewer:filtered` event.

#### Scenario: El DOM no es estado
- **GIVEN** the filter controls (inputs, selects, legend toggles) are rendered in the DOM
- **WHEN** the viewer derives filtered data
- **THEN** it uses the central filter state
- **AND** it does not read `aria-pressed` or input values to decide which features pass.

#### Scenario: Punto único de actualización
- **GIVEN** any filter control or chart interaction
- **WHEN** the user changes a filter
- **THEN** the change is applied through a single update entry point
- **AND** exactly one derivation and one render are triggered for that state change.

#### Scenario: Sin resultados divergentes
- **GIVEN** any combination of active filters
- **WHEN** the map, counters, charts and export are rendered
- **THEN** all consume the same derived snapshot
- **AND** no view computes its own filtered subset.

---

### Requirement: Filtrado unificado sin lógica duplicada

The system SHALL define filter semantics once and SHALL feed the map and the charts from the same derived feature collections.

#### Scenario: Paridad mapa–gráficos
- **GIVEN** a filter state that matches a subset of features
- **WHEN** the map data and the chart data are updated
- **THEN** the map sources contain exactly the features in the derived filtered collections
- **AND** the charts aggregate those same collections.

#### Scenario: Sin evaluadores paralelos
- **GIVEN** the existing filter conditions (search, region, comuna, process, treatment, rubro)
- **WHEN** filtering is applied
- **THEN** there is a single predicate that defines their semantics
- **AND** no MapLibre filter expression reimplements those rules.

#### Scenario: Contadores de leyenda preservados
- **GIVEN** a category selection in a legend
- **WHEN** the per-category counts are computed
- **THEN** the count for each category is derived with that category selection omitted
- **AND** the same predicate and snapshot are used.

#### Scenario: Visibilidad separada de filtros
- **GIVEN** a layer group is hidden with its visibility toggle
- **WHEN** the charts are rendered
- **THEN** the charts still reflect the active filters
- **AND** the hidden layer is identified as hidden in the dashboard
- **AND** the visibility change does not emit a new filtered-data event.

---

### Requirement: Dashboard analítico de tres gráficos

The system SHALL provide a dashboard with three client-side charts built from the filtered data.

#### Scenario: Presión territorial por región y tratamiento
- **GIVEN** one or more filtered establishments
- **WHEN** the first chart is rendered
- **THEN** it shows the sum of `toneladas` per `region` grouped by `tratamiento` as horizontal stacked bars
- **AND** regions are ordered by total tonnage in descending order
- **AND** the tooltip shows absolute tonnage and the regional percentage.

#### Scenario: Humedales versus presión industrial por comuna
- **GIVEN** filtered wetlands and filtered establishments
- **WHEN** the second chart is rendered
- **THEN** it joins both layers by the composite key `region` + `comuna`
- **AND** it plots the summed `ha` on a logarithmic X axis against the summed `toneladas` on a logarithmic Y axis
- **AND** bubble size represents the number of establishments
- **AND** only comunas with both values greater than zero are plotted
- **AND** the tooltip identifies the comuna, region, hectares, tonnage and establishment count.

#### Scenario: Rubros y tratamiento
- **GIVEN** one or more filtered establishments
- **WHEN** the third chart is rendered
- **THEN** it shows the sum of `toneladas` per `rubro` grouped by `tratamiento` as 100 % horizontal stacked bars
- **AND** it displays the top 10 rubros by total tonnage plus an aggregated "Otros" category
- **AND** the tooltip shows absolute tonnage and the percentage per treatment.

---

### Requirement: Sincronización bidireccional entre gráficos y mapa

The system SHALL update the charts when viewer filters change and SHALL update the map and controls when a chart selection is made.

#### Scenario: Filtros del visor actualizan los gráficos
- **GIVEN** the dashboard is visible
- **WHEN** the user changes search, region, comuna, process, treatment or rubro
- **THEN** all three charts are recomputed from the new filtered snapshot
- **AND** no additional data request is made.

#### Scenario: Selección de región desde el gráfico
- **GIVEN** the first chart is rendered
- **WHEN** the user clicks a region bar or segment
- **THEN** the shared state applies that region and clears any previous comuna
- **AND** the map, counters, controls and all charts reflect the new filter.

#### Scenario: Selección de comuna desde el gráfico
- **GIVEN** the second chart is rendered
- **WHEN** the user clicks a bubble
- **THEN** the shared state applies that region and comuna
- **AND** the map, counters, controls and all charts reflect the new filter.

#### Scenario: Selección de rubro desde el gráfico
- **GIVEN** the third chart is rendered
- **WHEN** the user clicks a rubro bar or segment
- **THEN** the shared state applies that rubro
- **AND** the map, counters, controls and all charts reflect the new filter.

#### Scenario: Toggle y limpieza
- **GIVEN** a chart-controlled filter is already active
- **WHEN** the user clicks the same chart element again
- **THEN** only the dimensions controlled by that chart are cleared
- **AND** filters controlled by other controls remain active
- **AND** a visible summary allows clearing the active filters.

#### Scenario: Resaltado sin filtrar
- **GIVEN** the dashboard is visible
- **WHEN** the user hovers over a chart element
- **THEN** the corresponding features are highlighted on the map
- **AND** the filter state, counters, charts and `viewer:filtered` event do not change.

#### Scenario: Sin ciclos de actualización
- **GIVEN** a chart-triggered filter update
- **WHEN** the charts are programmatically re-rendered
- **THEN** no new filter update or click event is emitted
- **AND** repeated equal selections are idempotent.

---

### Requirement: Dimensión de filtro `rubro`

The system SHALL expose `rubro` as a visible, resettable filter that applies only to establishments and stays synchronized with the third chart.

#### Scenario: Control visible y accesible
- **GIVEN** the secondary layer is available
- **WHEN** the filter panel is rendered
- **THEN** a `rubro` select with a "Todos los rubros" option is available
- **AND** selecting a rubro updates the central filter state.

#### Scenario: Sincronización con el gráfico
- **GIVEN** the third chart is visible
- **WHEN** the user clicks a rubro or changes the `rubro` select
- **THEN** both controls show the same active value.

#### Scenario: Alcance y reset
- **GIVEN** a rubro is active
- **WHEN** the viewer filters wetlands or resets all filters
- **THEN** the rubro does not restrict wetlands
- **AND** the reset clears the rubro together with the other filter dimensions.

#### Scenario: Exportación coherente
- **GIVEN** a rubro filter is active
- **WHEN** the user exports filtered features
- **THEN** the exported subset respects the rubro filter
- **AND** the export metadata records the active rubro.

---

### Requirement: Chart.js íntegramente en el cliente

The system SHALL render the charts with Chart.js loaded from a CDN using a fixed version, without a backend, build step, API key, or additional data download.

#### Scenario: Carga asíncrona
- **GIVEN** the viewer is loading from a static host
- **WHEN** the map initializes
- **THEN** the map is usable before Chart.js finishes loading
- **AND** the chart library is loaded once and reused.

#### Scenario: Actualización sin recrear
- **GIVEN** the charts are already instantiated
- **WHEN** filters change
- **THEN** the existing chart instances update their datasets
- **AND** they are not destroyed and recreated on every update.

#### Scenario: Fallo de la CDN
- **GIVEN** Chart.js cannot be loaded
- **WHEN** the dashboard initialization fails
- **THEN** the dashboard shows a controlled error message
- **AND** the map, filters, popups, basemaps and export remain fully functional.

---

### Requirement: El mapa sigue siendo el elemento principal

The system SHALL present the dashboard as a collapsible overlay that does not resize or replace the map.

#### Scenario: Panel superpuesto
- **GIVEN** a supported viewport
- **WHEN** the dashboard is opened
- **THEN** the map canvas keeps its full viewport size
- **AND** at least the majority of the map remains visible
- **AND** the dashboard does not call `map.resize()`.

#### Scenario: Comportamiento responsivo
- **GIVEN** a viewport narrower than 1024 px
- **WHEN** the viewer loads
- **THEN** the dashboard starts collapsed
- **AND** it can be expanded to a bounded height without covering the map controls.

#### Scenario: Encuadre con el panel abierto
- **GIVEN** a filter change caused by a chart selection
- **WHEN** the map fits the filtered features
- **THEN** the padding accounts for the open dashboard
- **AND** the selected features are not hidden behind it.

---

### Requirement: Accesibilidad y rendimiento del dashboard

The system SHALL provide accessible chart summaries and SHALL keep filter updates responsive.

#### Scenario: Alternativa accesible
- **GIVEN** a chart is rendered on a canvas
- **WHEN** it is exposed to assistive technology
- **THEN** it has a meaningful accessible label and a text/table equivalent
- **AND** every filter dimension remains operable through native controls or keyboard-accessible elements.

#### Scenario: Actualización eficiente
- **GIVEN** the full datasets (107 wetlands and 9,103 establishments)
- **WHEN** a filter changes
- **THEN** filtering and aggregation run in a single pass over the in-memory data
- **AND** render updates are coalesced per frame
- **AND** chart and map updates are skipped when the derived data did not change.

#### Scenario: Sin regresiones
- **GIVEN** the new dashboard is active
- **WHEN** the user interacts with existing features
- **THEN** search, filters, legends, visibility toggles, popups, basemaps, navigation and export behave as before
- **AND** `viewer:filtered` is emitted once per accepted filter change with the current snapshot.
