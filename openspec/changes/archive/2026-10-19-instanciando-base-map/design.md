# Diseño Técnico: Instanciación del Mapa Base Oscuro

## 1. Contexto Actual

El proyecto ya cuenta con:

- `index.html` como único entrypoint.
- Un contenedor `<div id="map" class="absolute inset-0"></div>`.
- MapLibre GL JS v4.7.1 cargado por CDN.
- Un selector de estilos Satélite / Claro / Oscuro.
- Una capa GeoJSON cargada desde `./data/layer.geojson` con ajuste automático de límites.

La instanciación vigente usa el estilo satelital, centro en Santiago (`[-70.65, -33.44]`) y zoom `13`.

---

## 2. Decisiones Arquitectónicas

| Decisión | Valor | Justificación |
| :--- | :--- | :--- |
| Contenedor | `#map` existente | Evita duplicar nodos y respeta la arquitectura actual. |
| Mapa base inicial | Carto Dark Matter (`dark-matter-gl-style`) | Estilo oscuro público, sin API key y con CORS habilitado. |
| Centro inicial | `[-71.0, -35.7]` | Posición aproximada del centro geográfico de Chile continental. |
| Zoom inicial | `4` | Permite una vista panorámica del territorio chileno. |
| Dimensionamiento | `#map` al 100% dentro de un contenedor full-screen | El canvas ocupa todo el espacio disponible. |
| Interfaz | Sin cambios estructurales | Se conserva el panel y los controles existentes. |

---

## 3. Patrón de Implementación

1. Inicializar `currentStyle` en `'dark'`.
2. Pasar `CONFIG.styles[currentStyle]` como estilo inicial a `new maplibregl.Map(...)`.
3. Configurar `center: [-71.0, -35.7]` y `zoom: 4`.
4. Sincronizar el estado visual del selector mediante una función reutilizable, de modo que el botón "Oscuro" aparezca activo desde el primer render.
5. Mantener el resto de la lógica de capas, popups y controles sin modificaciones.

---

## 4. Compatibilidad con el Comportamiento Existente

La carga del GeoJSON conserva su comportamiento actual, incluido `fitMapToData()`. Por lo tanto, la cámara inicial definida en la instanciación puede ser reencuadrada cuando finaliza la carga de datos. Esta change define exclusivamente la configuración inicial del mapa base y no modifica el pipeline de datos.

---

## 5. Riesgos y Mitigaciones

1. **Estilo oscuro no disponible por CDN**
   - *Riesgo*: El servicio de Carto no responde.
   - *Mitigación*: El selector permite cambiar a Claro o Satélite; no se introducen credenciales.
2. **Confusión entre estado inicial y ajuste a datos**
   - *Riesgo*: `fitMapToData()` puede alejar la vista del encuadre inicial de Chile.
   - *Mitigación*: Documentar que el encuadre automático a datos es un comportamiento preexistente y fuera del alcance de esta change.
3. **Regresión visual del panel**
   - *Riesgo*: Alterar clases del panel al activar el tema oscuro.
   - *Mitigación*: Solo se sincronizan las clases del selector de mapas; la estructura del panel no cambia.
