# Especificación: Análisis de Buffer con Turf.js

## ADDED Requirements

### Requirement: Generación de buffer íntegramente en el cliente

The system SHALL generate buffer geometries in the browser from the already-loaded data, using Turf.js loaded on demand, without a backend, database, API key, or additional data download.

#### Scenario: Sin backend
- **GIVEN** the viewer is served from a static host (local HTTP server or GitHub Pages)
- **WHEN** the user generates a buffer
- **THEN** the geometry is produced in the browser
- **AND** no server-side endpoint, database, or secret is involved.

#### Scenario: Dependencia cargada bajo demanda
- **GIVEN** the viewer has just loaded
- **WHEN** the user has not generated a buffer
- **THEN** Turf.js is not downloaded
- **AND** it is fetched only when the buffer is generated.

#### Scenario: Reutilización de datos cargados
- **GIVEN** the primary and secondary datasets are already loaded
- **WHEN** the user generates a buffer
- **THEN** the computation reuses the in-memory features
- **AND** no additional request for the source GeoJSON files is made.

---

### Requirement: Distancia y unidades configurables

The system SHALL let the user choose the buffer distance and its unit, and SHALL produce geometries at that distance.

#### Scenario: Distancia en metros
- **GIVEN** the user enters a distance of 500 and selects meters
- **WHEN** the buffer is generated
- **THEN** each geometry is expanded by 500 meters.

#### Scenario: Distancia en kilómetros
- **GIVEN** the user enters a distance of 1 and selects kilometers
- **WHEN** the buffer is generated
- **THEN** each geometry is expanded by 1 kilometer.

#### Scenario: Distancia inválida
- **GIVEN** the distance is empty, zero or negative
- **WHEN** the user tries to generate the buffer
- **THEN** no buffer is generated
- **AND** an explanatory message is shown.

---

### Requirement: Alcance filtrado y visible

The system SHALL generate the buffer only for the entities that are currently filtered and visible.

#### Scenario: Entidades filtradas
- **GIVEN** filters or hidden groups are active
- **WHEN** the user generates the buffer
- **THEN** only the filtered and visible entities are buffered.

#### Scenario: Grupo oculto
- **GIVEN** the wetlands or establishments group is hidden
- **WHEN** the user generates the buffer
- **THEN** the hidden group is not buffered.

#### Scenario: Sin entidades
- **GIVEN** the current filters and visibility yield zero entities
- **WHEN** the filter state is applied
- **THEN** the generate control is disabled.

---

### Requirement: Buffer para puntos y polígonos

The system SHALL buffer both point and polygon geometries, preserving the layer each buffer originates from.

#### Scenario: Establecimientos
- **GIVEN** establishments (points) are filtered and visible
- **WHEN** the buffer is generated
- **THEN** each point is expanded into a circular polygon at the chosen distance.

#### Scenario: Humedales
- **GIVEN** wetlands (multipolygons) are filtered and visible
- **WHEN** the buffer is generated
- **THEN** each polygon is expanded by the chosen distance.

#### Scenario: Discriminante de capa
- **GIVEN** the buffer includes both layers
- **WHEN** it is rendered
- **THEN** the buffer originating from each layer is visually distinguishable by its `capa` property.

---

### Requirement: Disolución opcional de solapamientos

The system SHALL optionally dissolve overlapping buffers, separately per layer.

#### Scenario: Disolver activado
- **GIVEN** the dissolve option is enabled
- **WHEN** the buffer is generated
- **THEN** overlapping buffers are merged topologically
- **AND** wetlands and establishments remain separate from each other.

#### Scenario: Disolver desactivado
- **GIVEN** the dissolve option is disabled
- **WHEN** the buffer is generated
- **THEN** one buffer geometry is produced per source entity.

#### Scenario: Disolución estable con muchas entidades
- **GIVEN** the dissolve option is enabled and many entities are visible
- **WHEN** the buffer is generated
- **THEN** the result is produced without an internal error
- **AND** the boundaries use a reduced detail to keep the operation stable.

#### Scenario: Fallo de disolución
- **GIVEN** the dissolve operation cannot complete
- **WHEN** the buffer is generated
- **THEN** an explanatory message is shown
- **AND** the viewer remains operational.

---

### Requirement: Visualización y limpieza del buffer

The system SHALL render the result in dedicated map layers, separately from the source data, and SHALL allow removing it.

#### Scenario: Render dedicado
- **GIVEN** a buffer has been generated
- **WHEN** it is added to the map
- **THEN** it is rendered in its own source and layers
- **AND** the original datasets, filters, popups and exports are not modified.

#### Scenario: Limpiar buffer
- **GIVEN** a buffer is visible
- **WHEN** the user clears it
- **THEN** the buffer layers and source are removed
- **AND** the rest of the viewer stays unchanged.

#### Scenario: Cambio de mapa base
- **GIVEN** a buffer is visible
- **WHEN** the user switches the basemap
- **THEN** the buffer is restored on top of the new style
- **AND** it remains visually consistent.

---

### Requirement: Feedback y estado de los controles

The system SHALL provide generation feedback and SHALL keep the viewer responsive during errors.

#### Scenario: Generando
- **GIVEN** there is at least one entity to buffer
- **WHEN** the user triggers generation
- **THEN** the controls show an in-progress state
- **AND** further generations are prevented until it finishes.

#### Scenario: Éxito
- **GIVEN** the buffer finishes successfully
- **WHEN** the result is rendered
- **THEN** the panel reports the number of generated areas
- **AND** the clear control becomes available.

#### Scenario: Fallo de la dependencia
- **GIVEN** Turf.js cannot be loaded from its CDN
- **WHEN** the user requests a buffer
- **THEN** an error message is shown
- **AND** the filters, layers, popups and exports keep working.
