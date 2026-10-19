# Especificación: Instanciación del Mapa Base Oscuro

## ADDED Requirements

### Requirement: Instanciación sobre el contenedor existente
The system SHALL initialize MapLibre GL JS using the existing `#map` container, without creating an additional map container or altering the existing interface structure.

#### Scenario: Carga inicial del visor
- **GIVEN** a modern browser loading `index.html` from a static HTTP server or GitHub Pages
- **WHEN** the MapLibre map is instantiated
- **THEN** the map renders inside the existing `#map` element.

---

### Requirement: Mapa base oscuro por defecto
The system SHALL use a dark basemap style as the initial map style, using a public style that does not require an API key or backend service.

#### Scenario: Estilo inicial
- **GIVEN** the viewer has just loaded
- **WHEN** the map style is applied
- **THEN** the visible basemap corresponds to Carto Dark Matter.

---

### Requirement: Vista inicial sobre Chile
The system SHALL initialize the map centered on Chile at zoom level 4.

#### Scenario: Cámara inicial
- **GIVEN** no persisted viewport state
- **WHEN** the map is created
- **THEN** the initial center is approximately `[-71.0, -35.7]` and the initial zoom is `4`.

---

### Requirement: Ocupación del espacio disponible
The system SHALL render the map canvas filling the available viewport space, while preserving the existing floating panel and navigation controls.

#### Scenario: Layout full-screen
- **GIVEN** a browser viewport of any supported size
- **WHEN** `index.html` is displayed
- **THEN** the `#map` canvas occupies the full available width and height
- **AND** the existing panel and controls remain visible without structural changes.

---

### Requirement: Estado visual coherente del selector
The system SHALL display the dark style option as active when the map initializes with the dark basemap.

#### Scenario: Indicador de estilo activo
- **GIVEN** the map initializes with the dark style
- **WHEN** the viewer finishes loading
- **THEN** the "Oscuro" button is shown as active and the other style buttons remain inactive.
