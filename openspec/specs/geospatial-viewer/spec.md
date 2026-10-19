# Especificación: Visor Geoespacial (Geospatial Viewer)

## Purpose
Proveer un visor web geoespacial interactivo, de alto impacto visual y con arquitectura Zero-Server, servido estáticamente desde GitHub Pages sin requerir infraestructura backend ni claves de API propietarias.

## Requirements

### Requirement 1: Arquitectura Zero-Server modular sin paso de build
The system SHALL be served as static files with `index.html` as the single entrypoint containing the HTML structure and Tailwind CSS via CDN. The custom CSS SHALL live in `css/styles.css`, and the Vanilla JavaScript SHALL be organized into ES modules under `js/` loaded natively through `<script type="module">`, without requiring a compilation, bundling or backend runtime.

#### Scenarios:
- **Given** an HTTP static server or GitHub Pages environment
- **When** the root `index.html` file is loaded by a modern browser
- **Then** the browser loads `js/main.js` and resolves the ES module graph under `js/` natively, without a bundler
- **And** the application initializes completely without server-side rendering or backend dependencies.
- **Given** the JavaScript is split by domain (configuración, estado, mapa, capas, filtros, gráficos, exportación, buffer, UI)
- **When** a developer modifies one module
- **Then** the change is isolated to that module and its public exports, without touching a monolithic script.

---

### Requirement 2: Consumo de Capas Geoespaciales Locales/GitHub Pages
The system SHALL fetch GeoJSON datasets using relative URLs (`./data/humedales.geojson`) served directly by the static host, avoiding cross-origin (CORS) complications.

#### Scenarios:
- **Given** a valid GeoJSON file located at `./data/humedales.geojson`
- **When** the map finishes its initial style load
- **Then** the system fetches the GeoJSON, parses its features, adds them to the map canvas, and auto-adjusts viewport bounds (`fitBounds`).

---

### Requirement 3: Modos de Mapa Base (Satélite, Claro y Oscuro)
The system SHALL provide seamless switching between at least three basemap styles:
1. High-resolution Satellite imagery (Esri World Imagery + Labels overlay).
2. Light mode (Carto Positron).
3. Dark mode (Carto Dark Matter).

#### Scenarios:
- **Given** the user selects a new basemap style button (e.g., "Claro" or "Oscuro")
- **When** the new style is applied via `map.setStyle()`
- **Then** the underlying map tiles update and all active GeoJSON layers and event handlers are automatically restored on `style.load`.

---

### Requirement 4: Interactividad y Popups Atributivos
The system SHALL display informative, styled popups when clicking vector features (points, polygons), presenting all relevant feature properties dynamically.

#### Scenarios:
- **Given** rendered vector elements on the map
- **When** the user hovers over a feature
- **Then** the cursor changes to `pointer`
- **When** the user clicks on the feature
- **Then** a popup opens containing the feature title and key-value properties.

---

### Requirement 5: Control de Visibilidad y Navegación 3D
The system SHALL allow users to toggle layer visibility on/off and interact with perspective/tilt (`pitch`), zoom, and rotation controls.

#### Scenarios:
- **Given** the "Ver Capa GitHub" checkbox is checked
- **When** the user unchecks the control
- **Then** the GeoJSON layers become invisible (`visibility: 'none'`) without removing the data source from memory.

---

### Requirement 6: Instanciación sobre el contenedor existente
The system SHALL initialize MapLibre GL JS using the existing `#map` container, without creating an additional map container or altering the existing interface structure.

#### Scenario: Carga inicial del visor
- **GIVEN** a modern browser loading `index.html` from a static HTTP server or GitHub Pages
- **WHEN** the MapLibre map is instantiated
- **THEN** the map renders inside the existing `#map` element.

---

### Requirement 7: Mapa base oscuro por defecto
The system SHALL use a dark basemap style as the initial map style, using a public style that does not require an API key or backend service.

#### Scenario: Estilo inicial
- **GIVEN** the viewer has just loaded
- **WHEN** the map style is applied
- **THEN** the visible basemap corresponds to Carto Dark Matter.

---

### Requirement 8: Vista inicial sobre Chile
The system SHALL initialize the map centered on Chile at zoom level 4.

#### Scenario: Cámara inicial
- **GIVEN** no persisted viewport state
- **WHEN** the map is created
- **THEN** the initial center is approximately `[-71.0, -35.7]` and the initial zoom is `4`.

---

### Requirement 9: Ocupación del espacio disponible
The system SHALL render the map canvas filling the available viewport space, while preserving the existing floating panel and navigation controls.

#### Scenario: Layout full-screen
- **GIVEN** a browser viewport of any supported size
- **WHEN** `index.html` is displayed
- **THEN** the `#map` canvas occupies the full available width and height
- **AND** the existing panel and controls remain visible without structural changes.

---

### Requirement 10: Estado visual coherente del selector
The system SHALL display the dark style option as active when the map initializes with the dark basemap.

#### Scenario: Indicador de estilo activo
- **GIVEN** the map initializes with the dark style
- **WHEN** the viewer finishes loading
- **THEN** the "Oscuro" button is shown as active and the other style buttons remain inactive.

---

### Requirement 11: Entrega estática y client-side del dataset secundario
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

### Requirement 12: Ciclo de vida ligado a MapLibre
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

### Requirement 13: Separación entre datos y simbología
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

### Requirement 14: Integración con filtros y resúmenes existentes
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

### Requirement 15: Control de visibilidad y popups propios
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

### Requirement 16: Calidad de datos y rendimiento
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
