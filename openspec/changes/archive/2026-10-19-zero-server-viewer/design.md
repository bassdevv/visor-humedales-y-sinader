# Diseño Técnico: Visor Geoespacial Zero-Server

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura **Zero-Server** (100% estática en el cliente), ejecutada directamente en el navegador del usuario y hospedada mediante GitHub Pages:

```
[ Navegador del Usuario ]
  ├── index.html (DOM, Tailwind CDN, MapLibre GL JS, Vanilla JS)
  ├── Solicitud Estática Local -> ./data/layer.geojson (Mismo origen / Sin CORS)
  └── Solicitudes de Tiles de Mapas Base:
        ├── Esri World Imagery (Satélite fotográfico)
        ├── Carto Positron (Modo Claro)
        └── Carto Dark Matter (Modo Oscuro)
```

---

## 2. Decisiones Arquitectónicas y Tecnológicas

| Componente | Tecnología Seleccionada | Justificación / Beneficio |
| :--- | :--- | :--- |
| **Estructura** | HTML5 semántico en archivo único (`index.html`) | Respeta el principio KISS; despliegue inmediato sin paso de build. |
| **Estilos** | Tailwind CSS (CDN `@tailwindcss/browser` / `cdn.tailwindcss.com`) | Clases utilitarias modernas, soporte dark mode y paneles flotantes translúcidos. |
| **Motor de Mapas** | MapLibre GL JS v4.7.1 | Renderizado WebGL de 60fps, soporte de rotación e inclinación tridimensional (`pitch`). |
| **Fuentes de Mapa Base** | Esri World Imagery + Carto Positron / Dark Matter | Estilos 100% libres de API keys privadas y con cabeceras CORS públicas. |
| **Fuente de Datos** | GeoJSON relativo (`./data/layer.geojson`) | Se aloja y versiona junto con el código; servido por GitHub Pages. |

---

## 3. Patrones de Implementación Clave

### A. Persistencia de Capas ante Cambio de Estilo (`style.load`)
En MapLibre GL JS, invocar `map.setStyle(...)` destruye las fuentes y capas agregadas dinámicamente. El visor resuelve esto utilizando el evento de ciclo de vida:
```javascript
map.setStyle(CONFIG.styles[styleName]);
map.once('style.load', () => {
  applyDataToMap();
  setLayersVisibility(currentVisibilityState);
});
```

### B. Inclinación y Perspectiva 3D
Se configura `pitch: 35` en la instanciación de `maplibregl.Map` y se añade el control `NavigationControl({ visualizePitch: true })` para permitir al usuario cambiar la perspectiva con clic derecho.

---

## 4. Riesgos y Mitigaciones

1. **Problemas de CORS en desarrollo local**:
   - *Riesgo*: Al abrir el archivo con `file:///`, el navegador bloquea el `fetch()`.
   - *Mitigación*: Se utiliza un servidor estático mínimo (`python -m http.server 8000`). En producción sobre GitHub Pages, la ruta es relativa y no genera CORS.
2. **Volumen de datos en GeoJSON**:
   - *Riesgo*: Archivos de más de 20MB pueden ralentizar el navegador.
   - *Mitigación*: Mantener capas optimizadas o considerar PMTiles en caso de requerir conjuntos de datos masivos.
