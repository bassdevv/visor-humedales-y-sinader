# Especificación: Capa Espacial Secundaria SINADER

## ADDED Requirements

### Requirement: Entrega estática y client-side del dataset secundario

The system SHALL fetch the secondary spatial layer from a single static GeoJSON artifact at a relative URL (`./data/sinader_establecimientos.geojson`) and SHALL NOT require a backend, database, API key, or runtime parsing of the source XLSX.

#### Scenario: Carga del artefacto estático
- **GIVEN** a modern browser loading the viewer from a static HTTP server or GitHub Pages
- **WHEN** the secondary layer is requested
- **THEN** the browser downloads only `./data/sinader_establecimientos.geojson`
- **AND** `gi-sinader-2024-ckan.xlsx` is never fetched or parsed by the browser.

#### Scenario: Entorno sin backend
- **GIVEN** an environment with no application server beyond static file hosting
- **WHEN** the viewer initializes and loads the secondary layer
- **THEN** no server-side endpoint, database connection, or secret is required.

---

### Requirement: Ciclo de vida ligado a MapLibre

The system SHALL add the secondary source and layers only after MapLibre has completed its initial load for the active style, and SHALL restore them after any basemap style change without affecting the primary layer.

#### Scenario: Carga inicial
- **GIVEN** the viewer has just loaded and MapLibre has not completed its initial style load
- **WHEN** the page initializes
- **THEN** no secondary source or layer is added before the map `load` event
- **AND** the secondary layer is added once the map is ready.

#### Scenario: Cambio de mapa base
- **GIVEN** the secondary layer is visible
- **WHEN** the user switches between Satélite, Claro and Oscuro
- **THEN** the secondary source and layers are restored on the new style
- **AND** the primary layer, basemap controls and popups continue to work.

#### Scenario: Error de carga aislado
- **GIVEN** the secondary GeoJSON request fails or returns invalid data
- **WHEN** the error is handled
- **THEN** the primary layer, basemap switching, existing filters and popups remain fully functional
- **AND** the viewer reports the secondary layer as unavailable without throwing an unhandled error.

---

### Requirement: Separación entre datos y simbología

The system SHALL keep secondary data acquisition and normalization separate from secondary symbology, so that fetch/validation/transform logic and map styling can change independently.

#### Scenario: Cambio de simbología sin tocar datos
- **GIVEN** the secondary data module fetches and normalizes the GeoJSON
- **WHEN** a developer changes point color, radius or legend labels
- **THEN** only the symbology definition changes
- **AND** no fetch, validation, deduplication or normalization logic is modified.

#### Scenario: Cambio de fuente sin tocar simbología
- **GIVEN** the secondary style definition consumes normalized features
- **WHEN** the data source or normalization rules change
- **THEN** the layer definitions, paint expressions and legend remain unchanged.

---

### Requirement: Integración con filtros y resúmenes existentes

The system SHALL apply shared filters to both layers and SHALL keep wetland-specific filters scoped to the primary layer.

#### Scenario: Filtro de región o comuna
- **GIVEN** both layers are loaded
- **WHEN** the user selects a region or comuna
- **THEN** the primary and secondary layers are filtered by the same normalized value
- **AND** region and comuna options include the union of values from both datasets.

#### Scenario: Búsqueda de texto
- **GIVEN** both layers are loaded
- **WHEN** the user types in the search field
- **THEN** wetlands match by name or code
- **AND** establishments match by establishment name, business name (`razon_social`) or `id_vu`.

#### Scenario: Filtros específicos de humedales
- **GIVEN** the secondary layer is visible
- **WHEN** the user selects a process or a surface range
- **THEN** only the primary layer is filtered
- **AND** the secondary layer remains visible under the shared filters.

#### Scenario: Resúmenes y gráficos
- **GIVEN** the existing counters and legend, or any chart subscribed to the filter update event
- **WHEN** filters change
- **THEN** the visible counts for both layers are updated in the same update cycle
- **AND** the filtered features of both layers are exposed to chart consumers without an additional fetch.

---

### Requirement: Control de visibilidad y popups propios

The system SHALL provide an independent visibility control for the secondary layer and SHALL display secondary-specific popups when a point is clicked.

#### Scenario: Alternar visibilidad
- **GIVEN** the secondary layer is loaded and visible
- **WHEN** the user turns off the secondary layer control
- **THEN** only the secondary layers become invisible
- **AND** the primary layer and its controls remain unchanged.

#### Scenario: Popup de establecimiento
- **GIVEN** a rendered secondary point
- **WHEN** the user hovers over it
- **THEN** the cursor changes to `pointer`
- **WHEN** the user clicks it
- **THEN** a popup shows at least establishment name, business name, `rubro`, region, comuna and aggregated tonnage
- **AND** all displayed values are HTML-escaped.

---

### Requirement: Calidad de datos y rendimiento

The derived secondary artifact SHALL contain only valid, deduplicated features and SHALL keep the initial load non-blocking.

#### Scenario: Registros inválidos
- **GIVEN** the source XLSX contains malformed coordinates, out-of-Chile coordinates or duplicate establishment records
- **WHEN** the artifact is generated offline
- **THEN** malformed and out-of-Chile records are excluded
- **AND** records are deduplicated by `id_vu` with aggregated tonnage and record count.

#### Scenario: Región y comuna canónicas
- **GIVEN** the source XLSX contains rows whose `region`/`comuna` values do not match the official territorial code
- **WHEN** the artifact is generated offline
- **THEN** `region` is derived from `codigo_unico_territorial`
- **AND** `comuna` is derived from the modal comuna of that code
- **AND** the number of corrected rows is recorded in the artifact metadata.

#### Scenario: Presupuesto de carga
- **GIVEN** a standard broadband connection
- **WHEN** the viewer loads the secondary artifact
- **THEN** the artifact is at most 5 MiB uncompressed
- **AND** the primary map remains interactive while the secondary layer loads.
