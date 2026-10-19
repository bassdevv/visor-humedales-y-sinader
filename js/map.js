import { CONFIG } from './config.js';

// ==========================================
// INICIALIZACIÓN DEL MAPA
// ==========================================
export const map = new maplibregl.Map({
  container: 'map',
  style: CONFIG.styles.satellite,
  center: [-71.0, -35.7], // Centro aproximado de Chile continental
  zoom: 4,
  pitch: 0,
  attributionControl: true
});

// Añadir controles de navegación nativos (zoom, rotación, inclinación)
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
