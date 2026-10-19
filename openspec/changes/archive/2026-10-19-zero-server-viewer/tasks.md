# Tareas de Implementación: Visor Geoespacial Zero-Server

## 1. Fase de Preparación y Arquitectura
- [x] Definir requerimientos y principios de arquitectura (KISS, Zero-Server, Single-File).
- [x] Seleccionar proveedores de mapas base libres de API keys con soporte CORS.
- [x] Diseñar la estrategia de distribución de datos mediante rutas relativas para GitHub Pages.

## 2. Fase de Construcción
- [x] Crear estructura base en `index.html` con CDN de Tailwind CSS y MapLibre GL JS.
- [x] Crear archivo de datos de prueba en `data/layer.geojson` con entidades de punto y polígono.
- [x] Implementar la función de carga de datos asíncrona (`fetch`).
- [x] Añadir capas de renderizado vectorial (relleno de polígono, contorno de polígono y círculos para puntos).
- [x] Implementar cálculo dinámico de límites (`fitBounds`) para encuadrar los datos cargados.

## 3. Fase de Interactividad y UI
- [x] Crear panel flotante de control de mapa con diseño translúcido (glassmorphism).
- [x] Implementar selector de tres estilos de mapa base: Satélite (Esri), Claro (Carto) y Oscuro (Carto).
- [x] Implementar persistencia de capas al alternar entre estilos de mapa (`map.once('style.load')`).
- [x] Agregar soporte de popups interactivos al hacer clic sobre entidades.
- [x] Agregar control de alternancia de visibilidad de la capa (checkbox).
- [x] Configurar perspectiva 3D (`pitch: 35`) y controles de inclinación/rotación.

## 4. Fase de Documentación y Pruebas
- [x] Probar ejecución en servidor local estático con Python (`python -m http.server 8000`).
- [x] Documentar toda la especificación bajo el estándar OpenSpec (`openspec/`).
- [ ] Desplegar en GitHub Pages mediante repositorio remoto.
