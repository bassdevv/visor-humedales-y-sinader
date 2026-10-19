import { map } from './map.js';
import { loadGeoJsonData, loadSecondaryLayer } from './data.js';
import { initUi } from './ui.js';
import './popups.js';

// Arranca la interfaz y las capas cuando el estilo base está listo.
initUi();

map.on('load', () => {
  loadGeoJsonData();
  loadSecondaryLayer();
});
