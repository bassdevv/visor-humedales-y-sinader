# Diseño Técnico: Capa Espacial Secundaria SINADER 2024

## 1. Inspección del archivo espacial disponible

### 1.1 Inventario de archivos

| Archivo | Tamaño | Contenido | Uso propuesto |
| :--- | ---: | :--- | :--- |
| `gi-sinader-2024-ckan.xlsx` | 43.492.428 B (≈41,5 MiB) | Hojas `Datos` (241.687 × 40) y `Resumen` (metadatos) | **Fuente de la capa secundaria** |
| `data/humedales.geojson` | 3.686.687 B (≈3,5 MiB) | 107 `MultiPolygon`, Humedales Urbanos | Capa principal existente |
| `Humedales_Urbanos.geojson` | 3.686.687 B | Idéntico a `data/humedales.geojson` (mismo SHA-256) | Duplicado de la capa principal |
| `data/layer.geojson` | 886 B | 1 `Point` + 1 `Polygon` de demostración en Santiago | No apto como capa secundaria |

Conclusión: el único archivo con información espacial nueva es el XLSX SINADER. Los dos GeoJSON restantes no aportan una segunda capa: uno duplica la capa principal y el otro es un fixture de prueba sin atributos compatibles con los filtros.

### 1.2 Fuente elegida, geometría y cobertura

- **Fuente**: `gi-sinader-2024-ckan.xlsx`, hoja `Datos` (declaraciones de transferencia de residuos, año 2024). La hoja `Resumen` documenta 40 columnas, versión 2.0 y fecha de extracción 2025-12-26.
- **Geometría**: no hay columna geométrica. Las coordenadas están en `latitud` y `longitud` como grados decimales; se interpretan como WGS84 (EPSG:4326). La capa se representará como `Point`.
- **Volumen**: 241.687 filas; 241.651 con coordenadas numéricas; 9.105 establecimientos únicos (`id_vu`) en el origen. Tras excluir las coordenadas inválidas quedan **9.103 establecimientos** y 8.718 coordenadas únicas a 6 decimales. Los establecimientos restantes que comparten coordenada corresponden a un mismo edificio o recinto, lo que no constituye un duplicado.
- **Cobertura**: Chile continental e insular. La bbox cruda es `lon [-109,42, -62,52]`, `lat [-85,23, -18,35]`; el extremo sur y dos coordenadas anómalas quedan fuera del territorio y se excluyen (ver 1.4).
- **Gránularidad**: una fila = una declaración mensual de transferencia. El activo espacial es el establecimiento, por lo que la capa debe deduplicar por `id_vu` y agregar toneladas.

### 1.3 Atributos relevantes y valores nulos

| Columna | Nulos | Distintos | Uso en la capa secundaria |
| :--- | ---: | ---: | :--- |
| `id_vu` | 0 | 9.105 (9.103 válidos) | Identificador y clave de deduplicación |
| `nombre_establecimiento` | 67 | >5.000 | Etiqueta principal del popup |
| `razon_social` | 0 | 3.725 | Etiqueta secundaria y búsqueda |
| `rubro` | 0 | 19 | Atributo de contexto y simbología opcional |
| `codigo_unico_territorial` | 0 | 316 | Fuente canónica de región y comuna |
| `region` | 0 | 16 | Filtro compartido; se valida contra el código |
| `comuna` | 0 | 316 | Filtro compartido; se resuelve por comuna modal del código |
| `latitud` / `longitud` | 0 | >5.000 | Geometría `Point` |
| `cantidad_toneladas` | 0 | >5.000 | Suma agregada por establecimiento |
| `mes` | 0 | 12 | Conteo de registros; no se usa como filtro |
| `tratamiento_n1_name` | 1 | 3 | Categoría de simbología |
| `tratamiento_n2_name` | 1.486 | 12 | Fuera de alcance |
| `tratamiento_n3_name` | 10.270 | 65 | Fuera de alcance |
| `trazabilidad__pais` | 0 | 17 | Fuera de alcance (residuos transfronterizos) |

Total de toneladas declaradas en 2024: **11.536.956,33 t**. Las columnas restantes (CIIU, LER, RUT, provincia, trazabilidad) no se incluyen en el artefacto para controlar el tamaño.

### 1.4 Calidad de datos

1. **36 filas con coordenadas malformadas** (≈0,015 %): valores escalados por `10^4` (por ejemplo `-380006`, `-7409796`), notación científica extrema y enteros de 14–18 dígitos. No existe una regla de reparación uniforme y confiable; se excluyen del artefacto.
2. **117 filas fuera de Chile** (2 `id_vu`, 2 coordenadas únicas): `(-85,22585, -62,51810)` × 97 y `(-83,95761, -89,74635)` × 20. Se excluyen.
3. **6.644 filas (630 `id_vu`) con región inconsistente respecto del `codigo_unico_territorial`**: por ejemplo, el código `13111` (La Granja, RM) aparece como Coquimbo y el `8108` (San Pedro de la Paz, Biobío) como La Araucanía. Las columnas `region`/`comuna` no son confiables; la región se deriva del prefijo del código oficial (mapa 1–16) y la comuna del valor modal de las filas de ese código. Hay 56 códigos con más de una comuna en el origen; la modal es la que coincide con el código y las coordenadas.
4. **25 `id_vu` con más de una región en el origen**: se registra una advertencia; la región canónica se deriva del código.
5. **Nombres de región desalineados con la capa principal**:
   - `Aysén del Gral. Carlos Ibañez del Campo` → `Aysén del General Carlos Ibáñez del Campo`
   - `Libertador Gral. Bernardo O'Higgins` → `Libertador General Bernardo O'Higgins`
   - `Maule` existe en SINADER pero no en humedales; debe incorporarse a la unión de opciones.
6. **Comunas**: 61 de 65 comunas de humedales coinciden; las 4 restantes (`Navidad`, `Papudo`, `Paredones`, `Río Ibáñez`) solo existen en la capa principal. La unión es válida.
7. **Codificación**: los textos del XLSX se leen correctamente en UTF-8 (el mojibake observado en consola es solo de visualización). El GeoJSON principal contiene `RE N°` dañado como `RE N�`; queda fuera del alcance de esta change.

### 1.5 Tamaño derivado y compatibilidad

- El artefacto generado pesa **3.260.129 bytes (≈3,1 MiB)** para 9.103 puntos (≈358 bytes por feature). El presupuesto de diseño es **≤5 MiB**; GitHub Pages aplica compresión en tránsito, por lo que la descarga efectiva será menor.
- MapLibre GL JS soporta `Point` GeoJSON y 9.103 círculos sin problemas de rendimiento con una sola fuente y una sola capa.
- La arquitectura actual ya usa `fetch` sobre rutas relativas y `map.addSource`/`addLayer`; la nueva capa reutiliza ese patrón.
- La integración de filtros es viable porque `region` y `comuna` existen en ambos datasets; el texto libre requiere campos distintos por capa.

---

## 2. Decisiones de Diseño

### 2.1 Pipeline offline: XLSX → GeoJSON estático

El navegador nunca descarga ni parsea el XLSX. Se agrega un script de preprocesamiento offline (`scripts/build_sinader_geojson.py`, Python + `openpyxl` en modo lectura) que genera `data/sinader_establecimientos.geojson`.

Reglas del pipeline:

1. Leer únicamente la hoja `Datos`.
2. Descartar filas con coordenadas no numéricas o fuera de rango.
3. Descartar filas fuera del bbox de Chile: `lat ∈ [-56,5, -17,0]`, `lon ∈ [-110,0, -66,0]` (incluye Isla de Pascua y Juan Fernández).
4. Agrupar por `id_vu`:
   - sumar `cantidad_toneladas` (redondeo a 3 decimales);
   - contar `registros`;
   - conservar `nombre_establecimiento`, `razon_social` y `rubro` (son únicos por `id_vu`);
   - derivar `region` del prefijo de `codigo_unico_territorial` (mapa oficial 1–16);
   - derivar `comuna` del valor modal de las filas de ese código;
   - elegir `tratamiento_n1_name` por valor modal; si no existe, `Sin clasificar`.
5. Normalizar regiones con el mapa de alias de 1.4 y contar las filas cuyo `region` de origen no coincide con el código oficial.
6. Aplicar `trim` a textos y reemplazar nombres nulos por `Establecimiento {id_vu}`.
7. Redondear coordenadas a 6 decimales.
8. Ordenar por `id_vu` para que la regeneración sea determinista.
9. Emitir JSON minificado con metadatos de generación.
10. Reportar por consola filas leídas, excluidas, establecimientos emitidos y advertencias.

Comando de referencia:

```
python scripts/build_sinader_geojson.py gi-sinader-2024-ckan.xlsx data/sinader_establecimientos.geojson
```

El artefacto resultante se versiona en el repositorio. El XLSX permanece como fuente de verdad y no se sirve al navegador. Esta separación es la que permite cumplir Zero-Server sin sacrificar rendimiento.

### 2.2 Contrato del artefacto GeoJSON

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "source": "gi-sinader-2024-ckan.xlsx",
    "version": 1,
    "generated": "YYYY-MM-DD",
    "features": 9103,
    "region_source": "codigo_unico_territorial",
    "excluded": { "invalid_coords": 36, "out_of_chile": 117 },
    "warnings": {
      "multi_region_ids": 25,
      "multi_code_ids": 0,
      "region_field_mismatches": 6644,
      "ids_with_region_mismatch": 630
    }
  },
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-70.123456, -33.123456] },
      "properties": {
        "id_vu": 123456,
        "nombre": "Establecimiento de ejemplo",
        "razon_social": "Razón Social de Ejemplo SpA",
        "rubro": "Producción agropecuaria",
        "region": "Metropolitana de Santiago",
        "comuna": "Santiago",
        "toneladas": 1234.567,
        "registros": 12,
        "tratamiento": "Valorización",
        "anio": 2024
      }
    }
  ]
}
```

Contrato de propiedades:

| Propiedad | Tipo | Obligatoria | Descripción |
| :--- | :--- | :--- | :--- |
| `id_vu` | number (entero) | Sí | Identificador único del establecimiento |
| `nombre` | string | Sí | Nombre del establecimiento o fallback |
| `razon_social` | string | Sí | Razón social |
| `rubro` | string | Sí | Rubro declarado |
| `region` | string | Sí | Región derivada del `codigo_unico_territorial` y normalizada al vocabulario de humedales |
| `comuna` | string | Sí | Comuna modal del código territorial |
| `toneladas` | number | Sí | Toneladas totales 2024 |
| `registros` | number (entero) | Sí | Cantidad de declaraciones agregadas |
| `tratamiento` | string | Sí | `Eliminación`, `Valorización`, `Recepción y Almacenamiento` o `Sin clasificar` |
| `anio` | number | Sí | 2024 |

La geometría es la única fuente de coordenadas; no se duplican `latitud`/`longitud` en propiedades.

### 2.3 Separación datos / simbología en `index.html`

Se definen dos bloques independientes:

- **Datos** (`SECONDARY_CONFIG` + `loadSecondaryData()`): URL, `sourceId`, `layerIds`, nombres de propiedades, `fetch`, validación del `FeatureCollection`, normalización y alias. No conoce colores ni radios.
- **Simbología** (`SECONDARY_STYLE` + `buildSecondaryLayerSpecs()`): colores por tratamiento, radio por zoom, borde, opacidad, etiquetas de leyenda y `buildSecondaryPopupHtml()`. No conoce el origen del dato ni cómo se descarga.

Funciones de orquestación:

- `loadSecondaryLayer()`: descarga y normaliza; actualiza el estado; llama a `applySecondaryToMap()`.
- `applySecondaryToMap()`: agrega `source` y `layers` si el estilo está listo; reaplica visibilidad y filtro.
- `applySecondaryFilters()`: calcula el filtro compartido y actualiza `setFilter` y los contadores.
- `restoreAllLayers()`: aplica capa principal y secundaria; se usa tras `setStyle()`.
- `buildSecondaryPopupHtml(props)`: usa `escapeHtml()` y `safeUrl()` ya existentes.

Regla de mantenimiento: un cambio de color/radio solo debe tocar `SECONDARY_STYLE`; un cambio de fuente o de reglas de agregación solo debe tocar el pipeline y `loadSecondaryData()`.

### 2.4 Ciclo de vida y carga

La carga se dispara únicamente dentro del evento `load` de MapLibre:

```js
map.on('load', () => {
  loadGeoJsonData();      // capa principal, ya existente
  loadSecondaryLayer();   // nueva capa, independiente
});
```

`applySecondaryToMap()` repite el guard existente de la capa principal: si `map.isStyleLoaded()` es falso, espera `idle` una sola vez y reintenta. La falla de la capa secundaria se captura en su propio `try/catch` y no propaga errores al flujo principal.

En `setBasemap()` se conserva el patrón de token vigente, pero la restauración pasa a ser única para ambas capas:

```js
const token = ++styleRestoreToken;
const restore = () => {
  if (token !== styleRestoreToken || !map.isStyleLoaded()) return;
  applyDataToMap();
  applySecondaryToMap();
};
map.once('idle', restore);
setTimeout(restore, 2500);
map.setStyle(CONFIG.styles[styleName]);
```

La capa secundaria se agrega después de las capas principales para quedar visualmente por encima; no se usa `beforeId` para no acoplar el orden a las capas de humedales.

### 2.5 Integración con filtros y resúmenes

| Filtro existente | Humedales | Establecimientos SINADER |
| :--- | :--- | :--- |
| Búsqueda de texto | `nombre_humedal`, `cod_humedal` | `nombre`, `razon_social`, `id_vu` |
| Región | Sí | Sí, con alias normalizado |
| Comuna | Sí | Sí |
| Proceso | Sí | No se aplica |
| Superficie mín./máx. | Sí | No se aplica |

- Las opciones de región y comuna se construyen con la **unión** de ambos datasets. `updateComunaOptions()` se extiende para considerar las comunas de la capa secundaria, respetando la región seleccionada.
- Los filtros específicos de humedales no ocultan ni reinterpretan la capa secundaria: solo afectan a las capas de humedales. La UI no cambia de estructura.
- Los contadores se actualizan en `applyFilters()`: el contador principal pasa a mostrar `X humedales · Y establecimientos` (o `Y ocultos` si la capa está desactivada). La leyenda de humedales se conserva y se agrega una leyenda secundaria con los tres tratamientos.
- **Gráficos**: el código actual no incluye una librería de gráficos; los únicos resúmenes visuales son `#filter-count` y la leyenda. Para dejar el punto de integración explícito, tras cada actualización se emite:

```js
document.dispatchEvent(new CustomEvent('viewer:filtered', {
  detail: {
    humedales: filteredFeatures,
    establecimientos: filteredSecondaryFeatures
  }
}));
```

Cualquier gráfico presente o futuro se suscribe a `viewer:filtered` y recibe ambos conjuntos ya filtrados, sin descargas adicionales. Esta es la interpretación de "integrarse con los gráficos existentes" mientras el visor no tenga charts.

### 2.6 Simbología propuesta

- **Forma**: círculos (`circle`) de radio pequeño, para no competir con los polígonos de humedales.
- **Color por tratamiento N1**:
  - `Eliminación`: `#ef4444`
  - `Valorización`: `#10b981`
  - `Recepción y Almacenamiento`: `#8b5cf6`
  - `Sin clasificar`: `#94a3b8`
- **Radio**: interpolación por zoom `4 → 3,5`, `8 → 6`, `12 → 8`; borde blanco de 1 px; opacidad 0,85.
- **Orden**: la capa de puntos se agrega después de `humedales-centroids`, de modo que quede arriba.
- **Leyenda**: una fila por tratamiento con su color y conteo filtrado; atribución `SINADER 2024 · MMA`.
- **Control**: interruptor independiente `#toggle-secondary`, por defecto activo, que solo altera `visibility` de las capas secundarias.

La simbología no reutiliza los colores de proceso de humedales para evitar ambigüedad semántica.

### 2.7 Popups

El popup secundario muestra, como mínimo:

- `nombre` (título) y `razon_social`;
- `rubro`;
- `region` / `comuna`;
- `toneladas` formateadas con `toLocaleString('es-CL')` y `registros`;
- `tratamiento`.

Todos los valores pasan por `escapeHtml()`. El popup se construye en una función separada (`buildSecondaryPopupHtml`) y se registra en el mismo handler de `map.on('click')`, consultando primero las capas secundarias y luego las primarias. El cursor `pointer` se maneja con los eventos `mouseenter`/`mouseleave` ya utilizados.

### 2.8 Manejo de errores y estados

- Si `fetch` falla o el JSON no es un `FeatureCollection` válido, se registra el error en consola y se muestra un chip de estado `SINADER no disponible` en el panel.
- La capa principal, los filtros existentes, los estilos y los popups no se ven afectados.
- El estado de carga se muestra por separado del estado de humedales, sin reutilizar `#layer-status`.
- No se reintenta automáticamente; recargar la página es suficiente. Un botón de reintento queda fuera de alcance.

### 2.9 Rendimiento

- Una sola descarga de ≈3,1 MiB; sin clustering en esta iteración, porque 9.103 puntos son manejables y el clustering complica los conteos y los popups.
- La carga es asíncrona y no bloquea la inicialización del mapa ni la capa principal.
- Los filtros usan expresiones de MapLibre (`setFilter`) y arreglos en memoria; no se re-descarga ni se re-parsea el GeoJSON al filtrar.
- La búsqueda ya está debounced (400 ms) para el ajuste de bounds; se mantiene ese comportamiento.

---

## 3. Compatibilidad y No Regresión

| Capacidad existente | Impacto esperado |
| :--- | :--- |
| Carga de humedales desde `data/humedales.geojson` | Sin cambios |
| Estilos Satélite / Claro / Oscuro | Se restauran ambas capas tras el cambio de estilo |
| Filtros de humedales (texto, región, comuna, proceso, superficie) | Sin cambios de semántica; región/comuna se amplían a la unión |
| Popups de humedales | Sin cambios; se prioriza el popup secundario solo si el clic cae sobre un punto |
| Leyenda y contadores | Se amplían, sin eliminar los existentes |
| Navegación, pitch, zoom, atribución | Sin cambios |
| Ejecución con `python -m http.server` y GitHub Pages | Sin cambios; solo se agrega un archivo estático |

---

## 4. Riesgos y Mitigaciones

| Riesgo | Mitigación |
| :--- | :--- |
| El XLSX cambia y el artefacto queda desactualizado | Script determinista documentado; metadata con fecha de generación y conteos. |
| Nombres de región/comuna no calzan entre datasets | Mapa de alias explícito y pruebas de intersección (16 regiones, 61 comunas compartidas). |
| Región/comuna del origen inconsistentes con el código territorial | Se derivan del `codigo_unico_territorial` y de la comuna modal por código; las 6.644 filas y 630 establecimientos afectados quedan reportados en la metadata. |
| Puntos fuera de Chile o coordenadas corruptas | Exclusión por bbox y reporte de excluidos en la metadata. |
| 25 establecimientos con región inconsistente | Resolución por valor modal y advertencia en metadata. |
| Capa secundaria no carga en producción | `try/catch` aislado, chip de error y capa principal intacta. |
| Saturación visual por 9.103 puntos | Radio pequeño, opacidad 0,85, interruptor independiente y orden sobre las capas de humedales. |
| Condición de carrera al cambiar de estilo | Token `styleRestoreToken` existente + restauración conjunta + fallback por timeout. |
| Expectativa de "gráficos" que no existen en el código | Se documenta la ausencia y se expone `viewer:filtered` como punto de integración; un chart nuevo sería otra change. |
| Tamaño del repositorio | El artefacto pesa ≈3,1 MiB y se versiona; el XLSX de 41,5 MiB ya está en el repositorio. |

---

## 5. Fuera de Alcance

- Parsear el XLSX en el navegador o agregar SheetJS.
- Backend, base de datos, API o claves.
- Gráficos nuevos o librería de charts.
- Agregación mensual, animación temporal o filtros por mes/tratamiento.
- Clustering, heatmap o tiles vectoriales.
- Popups de trazabilidad transfronteriza (`trazabilidad__pais`).
- Corrección del mojibake existente en `data/humedales.geojson`.
- Cambios en la simbología o en los datos de la capa principal.
