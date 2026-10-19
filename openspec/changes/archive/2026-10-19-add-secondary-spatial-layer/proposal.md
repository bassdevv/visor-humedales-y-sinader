# Propuesta: Capa Espacial Secundaria de Establecimientos SINADER 2024

## Why

### Background

El visor ya muestra la capa principal de Humedales Urbanos (107 polígonos, `data/humedales.geojson`) con estilos de mapa base, popups y filtros por región, comuna, proceso, superficie y texto libre. Como siguiente paso se busca incorporar una segunda capa de contexto espacial: los establecimientos industriales que declararon transferencias de residuos en 2024 (SINADER / Ventanilla Única), disponibles en `gi-sinader-2024-ckan.xlsx`.

El archivo fuente no es GeoJSON: es una planilla de 43,492,428 bytes (≈41.5 MiB) con 241.687 filas y 40 columnas, que incluye coordenadas `latitud`/`longitud`. El visor es una aplicación estática, de archivo único y sin backend; por lo tanto la capa secundaria debe consumirse como un artefacto GeoJSON estático, no como una planilla procesada en el navegador.

### Problem Statement

Actualmente el visor solo puede responder preguntas sobre humedales. No existe una capa de establecimientos que permita cruzar visualmente presiones industriales con humedales urbanos. Añadir el XLSX directamente rompería los principios de la arquitectura Zero-Server: descargar 41.5 MiB y parsear 241.687 filas en el cliente degradaría la carga inicial, requeriría una librería adicional (por ejemplo SheetJS) y multiplicaría el uso de memoria.

La solución debe incorporar la nueva capa sin backend, sin claves de API, sin bloquear la carga del mapa y sin alterar el comportamiento de la capa principal ni de los controles existentes.

### Alternatives Considered

- **Parsear el XLSX en el navegador**: descartado. 41.5 MiB y 241.687 filas implican una descarga y un procesamiento costosos, además de una dependencia CDN adicional (SheetJS), en contradicción con KISS y con el rendimiento esperado.
- **Servicio backend / PostGIS / GeoServer**: descartado. Viola la arquitectura Zero-Server y agrega infraestructura y costos operativos.
- **Tiles vectoriales o PMTiles**: descartado para esta iteración. Aporta complejidad de build y de hosting que no se justifica para ≈9.100 puntos.
- **Usar `data/layer.geojson` como capa secundaria**: descartado. Es un archivo de demostración de 886 bytes con 1 punto y 1 polígono en Santiago, sin atributos relevantes ni compatibilidad con los filtros actuales.
- **Preprocesar el XLSX fuera de línea y publicar un GeoJSON estático**: seleccionado. El navegador descarga un único archivo de ≈4 MiB, lo consume con `fetch` y lo renderiza con MapLibre; el procesamiento pesado ocurre una sola vez, fuera del runtime.

---

## What Changes

- Añadir un artefacto estático `data/sinader_establecimientos.geojson` (FeatureCollection de puntos, ≈9.100 establecimientos únicos) derivado del XLSX SINADER 2024.
- Incorporar en `index.html` una capa secundaria de puntos, cargada únicamente cuando MapLibre haya completado su carga inicial.
- Normalizar región y comuna a partir del `codigo_unico_territorial` y de la comuna modal por código, porque las columnas `region`/`comuna` del origen presentan 6.644 filas (630 establecimientos) inconsistentes con el código oficial.
- Separar la lógica de datos (fetch, validación, normalización, deduplicación) de la simbología (definición de source/layers, colores, radios, leyenda).
- Integrar la capa secundaria con los filtros existentes: búsqueda, región y comuna compartidas; los filtros específicos de humedales (proceso y superficie) quedan acotados a la capa principal.
- Extender los contadores/leyenda existentes para reflejar ambas capas y exponer un evento de datos filtrados para gráficos actuales o futuros.
- Añadir control independiente de visibilidad, popups propios y manejo de error no bloqueante.
- Documentar el comando de regeneración del GeoJSON a partir del XLSX (script de preprocesamiento offline).
- No modificar la capa principal, sus datos, sus filtros ni los estilos de mapa base.

---

## Capabilities

- `geospatial-viewer`: se agrega una capa espacial secundaria de puntos, su ciclo de vida, su simbología desacoplada, su integración con filtros/resúmenes y su control de visibilidad.

---

## Impact

- **Archivos afectados**: `index.html`; nuevo archivo `data/sinader_establecimientos.geojson`; opcionalmente `scripts/build_sinader_geojson.py` para regenerar el artefacto.
- **Sin cambios** en `data/humedales.geojson`, en la capa principal ni en los estilos de mapa base.
- **Sin backend, sin base de datos y sin claves de API.**
- **Costo de datos**: una descarga adicional de ≈3,1 MiB sin comprimir al abrir el visor; el XLSX no se descarga en el navegador.

---

## Resumen de la inspección del dato disponible

| Aspecto | Hallazgo |
| :--- | :--- |
| Archivo fuente | `gi-sinader-2024-ckan.xlsx` — 43.492.428 bytes (≈41.5 MiB), hojas `Datos` y `Resumen`. |
| Estructura | `Datos`: 241.687 filas × 40 columnas. `Resumen`: metadatos (versión 2.0, extracción 2025-12-26). |
| Geometría | No nativa: coordenadas `latitud`/`longitud` en grados decimales (WGS84). Se representará como `Point`. |
| Registros espaciales | 241.651 filas con coordenadas numéricas; 9.105 establecimientos únicos (`id_vu`); tras excluir coordenadas inválidas quedan 9.103 establecimientos y 8.718 coordenadas únicas. |
| Atributos relevantes | `id_vu`, `nombre_establecimiento`, `razon_social`, `rubro`, `codigo_unico_territorial`, `region`, `comuna`, `latitud`, `longitud`, `cantidad_toneladas`, `mes`, `tratamiento_n1_name`. |
| Valores nulos | 36 filas con coordenadas malformadas (valores escalados/no numéricos); 67 nombres de establecimiento nulos; 1 tratamiento N1 nulo; la mayoría de las columnas restantes no presenta nulos. |
| Calidad espacial | 117 filas (2 `id_vu`) fuera del bbox de Chile; deben excluirse. 25 `id_vu` presentan más de una región en el origen. Además, 6.644 filas (630 `id_vu`) tienen una región que no coincide con el `codigo_unico_territorial`; la región y comuna canónicas se derivan del código oficial y de la comuna modal por código. |
| Tamaño derivado | 3.260.129 bytes (≈3,1 MiB) sin comprimir para 9.103 puntos (≈358 bytes por feature). |
| Compatibilidad | Alta: GeoJSON relativo, `Point` y atributos `region`/`comuna` compartidos. Requiere normalizar dos nombres de región (Aysén y O'Higgins) y derivar región/comuna desde el código oficial para que los filtros crucen ambas capas. |

El detalle completo, las reglas de validación y el contrato de datos se documentan en `design.md`.
