import { map } from './map.js';
import { CONFIG, DARK_BASEMAP_PALETTE } from './config.js';
import { applyDataToMap, applySecondaryToMap } from './layers.js';
import { applyBufferToMap } from './buffer.js';
import { applyChartTheme } from './charts.js';

let currentStyle = 'satellite';
let styleRestoreToken = 0;

function setBasemapPaint(layerId, property, value) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, property, value);
  }
}

function tintDarkBasemap() {
  if (currentStyle !== 'dark' || !map.getLayer('background')) return;
  const p = DARK_BASEMAP_PALETTE;
  setBasemapPaint('background', 'background-color', p.background);
  ['landcover', 'landuse', 'park_national_park'].forEach((id) => {
    setBasemapPaint(id, 'fill-color', p.land);
  });
  setBasemapPaint('park_nature_reserve', 'fill-color', p.park);
  setBasemapPaint('landuse_residential', 'fill-color', p.residential);
  setBasemapPaint('water', 'fill-color', p.water);
  setBasemapPaint('waterway', 'line-color', p.waterway);
  setBasemapPaint('building-top', 'fill-color', 'rgba(30, 62, 98, 1)');
  setBasemapPaint('building-top', 'fill-outline-color', p.background);
  setBasemapPaint('boundary_country_outline', 'line-color', p.water);
  setBasemapPaint('boundary_country_inner', 'line-color', 'rgba(92, 126, 168, 1)');
  setBasemapPaint('boundary_state', 'line-color', 'rgba(72, 104, 146, 1)');
  setBasemapPaint('boundary_county', 'line-color', '#2c4a70');
}

export function setBasemap(styleName) {
  if (currentStyle === styleName) return;
  currentStyle = styleName;

  const buttons = {
    satellite: document.getElementById('btn-satellite'),
    light: document.getElementById('btn-light'),
    dark: document.getElementById('btn-dark')
  };

  const activeClasses = 'inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all bg-sky-500/90 text-white shadow-md shadow-sky-500/25';
  const inactiveClasses = 'inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10';

  Object.entries(buttons).forEach(([key, btn]) => {
    if (!btn) return;
    btn.className = key === styleName ? activeClasses : inactiveClasses;
  });

  if (styleName === 'dark' || styleName === 'satellite') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  applyChartTheme();

  // MapLibre descarta las capas al cambiar de estilo. Esperamos a que el
  // nuevo estilo esté completamente estable (idle) para restaurar los datos.
  const token = ++styleRestoreToken;
  let restored = false;
  const restoreData = () => {
    if (restored || token !== styleRestoreToken || !map.isStyleLoaded()) return;
    restored = true;
    tintDarkBasemap();
    applyDataToMap();
    applySecondaryToMap();
    applyBufferToMap();
  };
  map.once('idle', restoreData);
  setTimeout(restoreData, 2500);
  map.setStyle(CONFIG.styles[styleName]);
}
