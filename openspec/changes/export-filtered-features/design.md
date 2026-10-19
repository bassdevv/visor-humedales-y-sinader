# Diseño Técnico: Exportación de Entidades Filtradas

## 1. Alcance y Experiencia de Usuario

La exportación opera sobre el **estado de filtros actual** del visor, sin volver a descargar ni re-parsear los GeoJSON. El conjunto exportable es la unión de:

- `filteredFeatures`: humedales que pasan búsqueda, región, comuna y selección de proceso.
- `filteredSecondaryFeatures`: establecimientos que pasan búsqueda, región, comuna y selección de tratamiento.

### 1.1 Controles

Se añaden dos acciones al pie del panel de filtros:

| Control | Acción |
| :--- | :--- |
| `#btn-export-geojson` | Descarga un `.geojson` con las entidades filtradas. |
| `#btn-export-shp` | Descarga un `.zip` con Shapefile(s) de las entidades filtradas. |

### 1.2 Reglas de inclusión

1. Se exporta **solo** lo filtrado; nunca el dataset completo.
2. Una capa oculta con su interruptor de grupo (`#toggle-primary` / `#toggle-secondary`) **no** se exporta: se exporta "lo que se ve". El interruptor de grupo se distingue de los filtros de categoría, que sí forman parte del filtrado.
3. El archivo respeta la selección de categorías de cada leyenda (proceso / tratamiento), porque esas selecciones son filtros.
4. Se agrega una propiedad discriminante `capa` (`"humedales"` | `"establecimientos"`) a cada feature exportada, para poder separar los conjuntos en herramientas externas.

### 1.3 Estados de la interfaz

| Estado | Comportamiento |
| :--- | :--- |
| Sin resultados (`totalExportable === 0`) | Ambos botones `disabled`. |
| Con resultados | Botones habilitados. |
| Generando | Botón activo con `disabled` + spinner/texto "Generando…". |
| Éxito | Mensaje efímero "Descargado: `archivo`". |
| Error | Mensaje de error visible; el visor sigue operativo. |

Los botones se sincronizan dentro de `applyFilters()`, el mismo ciclo donde ya se actualizan los contadores.

---

## 2. Decisión de dependencia: generación de Shapefile en el navegador

### 2.1 Requisitos de la tarea

El Shapefile es un conjunto de archivos binarios mínimos:

- `.shp` (geometrías), `.shx` (índice), `.dbf` (atributos tabulares), `.prj` (proyección, WKT).
- Debe empaquetarse en un `.zip` para una descarga única.
- Un Shapefile **no puede mezclar tipos de geometría**: debe haber un shapefile por tipo. El visor produce `MultiPolygon` (humedales) y `Point` (establecimientos).

### 2.2 Opciones evaluadas

| Opción | Tipo | Geometrías | ZIP | Build | Veredicto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Codificador propio (0 deps) | Custom | Todas (a mano) | A mano (CRC32 + STORE) | No | Descartada: alto costo y riesgo binario |
| `@mapbox/shp-write` | Librería | Point, Line, Polygon, Multi* | JSZip incluido | No | **Seleccionada** |
| `geojson-to-shapefile` | Librería | Solo `Point` | JSZip | No | Descartada: no cubre `MultiPolygon` |
| `shpjs` / `shapefile.js` | Librería | — (lectura) | — | No | Descartada: no escribe |
| `shp-write` (nombre antiguo) | Librería | Point, Line, Polygon, Multi* | JSZip | No | Descartada: paquete deprecado, redirige a `@mapbox/shp-write` |

### 2.3 Decisión

Se adopta **`@mapbox/shp-write`**, cargada de forma diferida desde CDN:

```
https://unpkg.com/@mapbox/shp-write@latest/shpwrite.js
```

### 2.4 Justificación

- Es la **dependencia mínima** que cubre todo el requisito: escribe `.shp`/`.shx`/`.dbf`/`.prj` y arma el ZIP en una sola librería, sin bundle ni paso de compilación.
- Soporta **ambos** tipos de geometría del visor (`MultiPolygon` y `Point`) y los separa automáticamente en shapefiles distintos dentro del ZIP.
- Compatible con la arquitectura actual (CDN + Vanilla JS, como Tailwind y MapLibre), respetando Zero-Server.
- Se carga **solo cuando el usuario solicita Shapefile**, por lo que no afecta el tiempo de carga inicial ni el uso de memoria en el caso común.
- Licencia BSD-3-Clause.

### 2.5 Limitaciones asumidas y mitigaciones

| Limitación | Mitigación |
| :--- | :--- |
| Nombres de campo DBF limitados a 10 caracteres | Se exporta un **esquema renombrado y abreviado** documentado en §3.2, en lugar de los nombres internos largos (`nombre_humedal`, `proceso_humedal_urbano`, …). |
| `shp-write` puede usar compresión `DEFLATE` (por defecto) | Se fija explícitamente `compression: 'DEFLATE'`; el ZIP es válido y se abre en cualquier SIG. |
| Dependencia de CDN externa | Es la misma estrategia que Tailwind y MapLibre; si la CDN falla, se muestra error y el visor no se afecta. |
| Proyección fija WGS84 | Es la proyección de los datos; se emite el `.prj` correspondiente (EPSG:4326). |

### 2.6 API usada

`shp-write` expone `shpwrite.zip(geojson, options)`. Se usa `options.outputType = 'blob'` para obtener un `Blob` y disparar la descarga con un `Blob`/`URL.createObjectURL` y un `<a download>` (sin depender de `download()` del paquete, que está deprecado y no usaría la descarga nativa). Además se pasan `options.types = { point: 'establecimientos', polygon: 'humedales' }` para nombrar cada shapefile dentro del ZIP según la capa, y `options.compression = 'DEFLATE'`.

---

## 3. Contrato de los archivos de exportación

### 3.1 GeoJSON

- Tipo: `FeatureCollection`.
- Features: las filtradas y visibles de ambas capas, cada una con la propiedad añadida `capa`.
- Propiedades: las originales de cada capa, sin renombrar.
- Metadatos en una propiedad raíz `metadata` (fecha ISO, conteos por capa, filtros aplicados), siguiendo el patrón ya usado en `data/sinader_establecimientos.geojson`.
- Codificación UTF-8, nombre sugerido `datos-filtrados_YYYY-MM-DD.geojson`.

### 3.2 Shapefile (ZIP)

Para respetar el límite de 10 caracteres del DBF y mantener nombres legibles, cada capa usa un esquema abreviado:

| Origen (GeoJSON) | Campo DBF | Tipo |
| :--- | :--- | :--- |
| `cod_humedal` | `codigo` | string |
| `nombre_humedal` | `nombre` | string |
| `region` | `region` | string |
| `comuna` | `comuna` | string |
| `ha` | `sup_ha` | number |
| `proceso_humedal_urbano` | `proceso` | string |
| `id_vu` | `id_vu` | number |
| `razon_social` | `razon` | string |
| `rubro` | `rubro` | string |
| `toneladas` | `toneladas` | number |
| `tratamiento` | `tratam` | string |

- El ZIP contiene un shapefile por tipo de geometría presente (por ejemplo `humedales.shp` y `establecimientos.shp`), cada uno con sus `.shx`, `.dbf` y `.prj`.
- `.prj`: WGS84 (`GEOGCS["GCS_WGS_1984", ...]`).
- Nombre sugerido `datos-filtrados_YYYY-MM-DD.zip`.

---

## 4. Arquitectura en `index.html`

### 4.1 Módulo desacoplado

Se añade un bloque "EXPORTACIÓN" que mantiene la separación datos / presentación ya vigente:

- `EXPORT_CONFIG`: nombres de archivo, textos de estado y URL de la librería de Shapefile.
- `getExportableFeatures()`: reúne `filteredFeatures` + `filteredSecondaryFeatures` según las reglas de §1.2 y agrega `capa`.
- `exportGeoJson()`: serializa y descarga el GeoJSON.
- `exportShapefile()`: carga la librería si hace falta, proyecta el esquema de §3.2 y descarga el ZIP.
- `loadShpWrite()`: inyección dinámica de `<script>` con caché de promesa (una sola descarga por sesión).
- `downloadBlob(blob, filename)`: helper común de descarga.
- `setExportState(state)`: habilita/deshabilita botones y actualiza el texto de estado.

Ninguna de estas funciones modifica `geojsonData` ni `secondaryData`; solo los leen.

### 4.2 Carga diferida

```js
let shpWritePromise = null;
function loadShpWrite() {
  if (window.shpwrite) return Promise.resolve(window.shpwrite);
  if (shpWritePromise) return shpWritePromise;
  shpWritePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EXPORT_CONFIG.shpWriteUrl;
    script.onload = () => resolve(window.shpwrite);
    script.onerror = () => reject(new Error('No se pudo cargar la librería de Shapefile'));
    document.head.appendChild(script);
  });
  return shpWritePromise;
}
```

### 4.3 Sincronización con filtros

`applyFilters()` (ya existente) llama a `setExportState()` al final, de modo que los botones reflejen siempre el conteo filtrado actual y el estado de visibilidad de cada grupo.

---

## 5. Feedback y estados

- **Antes**: si `totalExportable === 0`, botones `disabled` con `title` explicativo.
- **Durante**: el botón pulsado se `disabled`, muestra spinner y "Generando…", y se bloquea el otro botón de exportación para evitar clics simultáneos.
- **Después (éxito)**: texto "Descargado: `archivo`" durante ~3 s; el botón vuelve a su estado normal.
- **Después (error)**: texto de error visible (por ejemplo "No se pudo generar el Shapefile") y se restaura el botón.
- La generación es síncrona y rápida para los volúmenes del visor (≤ 9.103 puntos + 107 polígonos), por lo que no requiere Web Worker; el feedback cubre el tiempo de carga de la librería y la serialización.

---

## 6. Manejo de errores

- Fallo al cargar la librería desde CDN → error controlado, mensaje en el panel, visor intacto.
- Exportación sin resultados → botones deshabilitados (no es un error).
- Cualquier excepción durante la serialización se captura en `try/catch` y se refleja como error de estado; nunca rompe filtros, capas o popups.
- No se usa `alert()`; el feedback se muestra en el propio panel.

---

## 7. Rendimiento

- Sin costo en la carga inicial: la librería de Shapefile se descarga solo bajo demanda.
- GeoJSON se serializa con `JSON.stringify` sobre el subconjunto filtrado, no sobre el dataset completo.
- Shapefile se genera en memoria a partir del subconjunto filtrado; el ZIP con `STORE` es de tamaño similar al GeoJSON.
- No hay nuevas llamadas de red para obtener datos: se reutiliza el GeoJSON ya cargado.

---

## 8. Compatibilidad y No Regresión

| Capacidad existente | Impacto esperado |
| :--- | :--- |
| Carga de humedales y de establecimientos | Sin cambios |
| Filtros (búsqueda, región, comuna, proceso, tratamiento) | Sin cambios de semántica; se leen para exportar |
| Interruptores de grupo y leyendas | Sin cambios; condicionan qué se exporta |
| Mapas base, popups, navegación | Sin cambios |
| Ejecución con `python -m http.server` y GitHub Pages | Sin cambios; la librería se sirve por CDN |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Mitigación |
| :--- | :--- |
| La CDN de `shp-write` no está disponible | Carga diferida + `try/catch` + mensaje de error; el GeoJSON sigue funcionando sin librería. |
| Nombres de campo largos truncados en el DBF | Esquema abreviado explícito (§3.2). |
| Shapefile con tipos de geometría mezclados | `shp-write` separa automáticamente por tipo; un shapefile por geometría dentro del ZIP. |
| Exportar datos ocultos por error | Regla §1.2: las capas ocultas por su interruptor de grupo no se exportan. |
| Bloqueo de UI en datasets muy grandes | Volúmenes actuales pequeños; si crecen, se evaluaría Web Worker en una change posterior. |
| Doble clic simultáneo | Ambos botones se deshabilitan durante la generación. |

---

## 10. Fuera de Alcance

- Exportar a CSV, Excel, KML u otros formatos.
- Exportar por capa en archivos separados o un selector de formato por capa.
- Re-proyección a sistemas distintos de WGS84.
- Filtrado geográfico por área dibujada antes de exportar.
- Uso de Web Workers para la serialización.
- Backend, base de datos o claves de API.
- Cambios en datos, filtros, simbología o mapas base.
