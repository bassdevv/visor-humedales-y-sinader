# Especificación: Exportación de Entidades Filtradas

## ADDED Requirements

### Requirement: Exportación íntegramente en el cliente

The system SHALL generate export files entirely in the browser from the already-loaded data, without a backend, database, API key, or an additional data download.

#### Scenario: Sin backend
- **GIVEN** the viewer is served from a static host (local HTTP server or GitHub Pages)
- **WHEN** the user requests an export
- **THEN** the file is produced in the browser
- **AND** no server-side endpoint, database, or secret is involved.

#### Scenario: Reutilización de datos cargados
- **GIVEN** the primary and secondary datasets are already loaded
- **WHEN** the user requests an export
- **THEN** the export reuses the in-memory filtered features
- **AND** no additional request for the source GeoJSON files is made.

---

### Requirement: Exportación del estado de filtros actual

The system SHALL export only the entities that satisfy the currently active filters, and SHALL exclude layers hidden through their group toggle.

#### Scenario: Subconjunto filtrado
- **GIVEN** active filters on both layers
- **WHEN** the user exports
- **THEN** the file contains only the features that pass those filters
- **AND** the dataset is never exported in full.

#### Scenario: Capa oculta
- **GIVEN** a layer group is switched off with its visibility toggle
- **WHEN** the user exports
- **THEN** the features of that hidden group are excluded from the file.

#### Scenario: Discriminante de capa
- **GIVEN** the export includes features from both layers
- **WHEN** the file is generated
- **THEN** every exported feature carries a `capa` property identifying `humedales` or `establecimientos`.

---

### Requirement: Descarga en GeoJSON

The system SHALL allow downloading the filtered entities as a valid GeoJSON `FeatureCollection`.

#### Scenario: Archivo GeoJSON
- **GIVEN** there is at least one filtered feature
- **WHEN** the user chooses the GeoJSON export
- **THEN** a `FeatureCollection` file is downloaded
- **AND** it contains the filtered features with their original properties plus `capa`.

---

### Requirement: Descarga en Shapefile comprimido en ZIP

The system SHALL allow downloading the filtered entities as Shapefile inside a ZIP archive, producing one shapefile per geometry type present and including its projection file.

#### Scenario: Contenido del ZIP
- **GIVEN** the filtered set contains polygon and/or point geometries
- **WHEN** the user chooses the Shapefile export
- **THEN** the ZIP contains, per geometry type, the `.shp`, `.shx`, `.dbf` and `.prj` files
- **AND** no shapefile mixes different geometry types.

#### Scenario: Proyección declarada
- **GIVEN** the source data is in WGS84 (EPSG:4326)
- **WHEN** the Shapefile is generated
- **THEN** the `.prj` file declares WGS84
- **AND** attribute field names respect the DBF 10-character limit.

#### Scenario: Dependencia cargada bajo demanda
- **GIVEN** the viewer has just loaded
- **WHEN** the user has not requested the Shapefile export
- **THEN** the Shapefile library is not downloaded
- **AND** it is fetched only when the Shapefile export is requested.

---

### Requirement: Feedback y estado de los controles de exportación

The system SHALL provide generation feedback and SHALL disable the export controls when there are no results.

#### Scenario: Sin resultados
- **GIVEN** the active filters match zero entities
- **WHEN** the filter state is applied
- **THEN** both export controls are disabled.

#### Scenario: Generando
- **GIVEN** there is at least one filtered feature
- **WHEN** the user triggers an export
- **THEN** the control shows an in-progress state
- **AND** further export clicks are prevented until it finishes.

#### Scenario: Resultado correcto
- **GIVEN** an export finishes successfully
- **WHEN** the file download starts
- **THEN** the panel shows a success message
- **AND** the controls return to their normal state.

#### Scenario: Fallo de la dependencia
- **GIVEN** the Shapefile library cannot be loaded from its CDN
- **WHEN** the user requests the Shapefile export
- **THEN** an error message is shown
- **AND** the filters, layers, popups and GeoJSON export keep working.
