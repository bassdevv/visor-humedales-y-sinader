# Propuesta: Instanciación del Mapa Base Oscuro

## Why

### Background
El visor ya incorpora MapLibre GL JS, un contenedor `#map`, el panel de control y una capa GeoJSON. Sin embargo, la instanciación actual inicia con el estilo satelital, centrada en Santiago y con zoom 13, por lo que no existe un contrato explícito para el mapa base inicial.

### Problem Statement
Se requiere que la instanciación inicial del mapa utilice el contenedor existente, cargue un mapa base oscuro, centre la vista en Chile y use zoom 4, sin modificar el panel lateral ni los componentes de interfaz ya construidos.

### Alternatives Considered
- **Mantener el estilo satelital como inicial**: descartado porque el comportamiento esperado exige un mapa base oscuro.
- **Crear un estilo oscuro propio**: descartado por complejidad innecesaria; se reutiliza Carto Dark Matter.
- **Ajustar la vista después de la carga**: descartado porque el requisito es sobre la instanciación inicial del mapa.

---

## What Changes
- Instanciar MapLibre GL JS sobre el contenedor `#map` existente.
- Establecer Carto Dark Matter como estilo de mapa base inicial.
- Definir Chile como centro inicial (`[-71.0, -35.7]`) y zoom inicial `4`.
- Mantener el canvas ocupando todo el espacio disponible del viewport.
- Sincronizar el estado visual del selector de mapas para reflejar el modo oscuro activo.
- No modificar la estructura del panel lateral ni de los controles existentes.

---

## Capabilities
- `geospatial-viewer`: se agrega el contrato de instanciación inicial del mapa base oscuro, la vista inicial sobre Chile y la ocupación del espacio disponible.

---

## Impact
- **Archivos afectados**: `index.html`.
- **Sin cambios** en `data/layer.geojson`, en la estructura del panel ni en los controles existentes.
- **Sin backend** ni claves de API.
