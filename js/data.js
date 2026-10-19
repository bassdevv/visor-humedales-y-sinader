import { CONFIG, SECONDARY_CONFIG, REGION_ALIASES } from './config.js';
import { store } from './state.js';
import { escapeHtml, normalizeProperties } from './utils.js';
import { populateFilterControls } from './filters.js';
import { applyDataToMap, applySecondaryToMap, fitMapToData } from './layers.js';

// ==========================================
// CARGA DE LA CAPA PRINCIPAL (HUMEDALES)
// ==========================================
export async function loadGeoJsonData() {
  const statusEl = document.getElementById('layer-status');
  try {
    if (window.location.protocol === 'file:') {
      throw new Error('Abre el visor con un servidor local: python -m http.server 8000');
    }

    const response = await fetch(CONFIG.geojsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: No se pudo cargar ${CONFIG.geojsonUrl}`);
    }

    store.geojsonData = await response.json();
    normalizeProperties(store.geojsonData);
    populateFilterControls();
    applyDataToMap();

    const totalFeatures = store.geojsonData.features ? store.geojsonData.features.length : 0;
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>${totalFeatures} humedales cargados</span>
      `;
    }

    fitMapToData(store.geojsonData.features);
  } catch (err) {
    console.error('Error cargando GeoJSON:', err);
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        <span class="text-rose-500">${escapeHtml(err.message)}</span>
      `;
    }
  }
}

// ==========================================
// CARGA DE LA CAPA SECUNDARIA (SINADER 2024)
// ==========================================
function normalizeSecondaryData(data) {
  data.features = data.features.filter((feature) => {
    if (!feature || !feature.geometry || feature.geometry.type !== 'Point') return false;
    const coordinates = feature.geometry.coordinates;
    return Array.isArray(coordinates)
      && Number.isFinite(Number(coordinates[0]))
      && Number.isFinite(Number(coordinates[1]));
  });

  data.features.forEach((feature) => {
    const props = feature.properties || {};

    Object.keys(props).forEach((key) => {
      if (typeof props[key] === 'string') {
        props[key] = props[key].trim();
      }
    });

    if (props.region && REGION_ALIASES[props.region]) {
      props.region = REGION_ALIASES[props.region];
    }

    const tonnage = Number(props.toneladas);
    props.toneladas = Number.isFinite(tonnage) ? tonnage : 0;

    const establishmentId = Number(props.id_vu);
    if (Number.isFinite(establishmentId)) {
      props.id_vu = establishmentId;
    }
  });

  return data;
}

export async function loadSecondaryLayer() {
  const statusEl = document.getElementById('secondary-status');
  try {
    if (window.location.protocol === 'file:') {
      throw new Error('Requiere servidor local');
    }

    const response = await fetch(SECONDARY_CONFIG.geojsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: No se pudo cargar ${SECONDARY_CONFIG.geojsonUrl}`);
    }

    const data = await response.json();
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('El archivo SINADER no es un FeatureCollection válido');
    }

    store.secondaryData = normalizeSecondaryData(data);
    populateFilterControls();
    applySecondaryToMap();

    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>${store.secondaryData.features.length} establecimientos SINADER</span>
      `;
    }
  } catch (err) {
    console.error('Error cargando capa SINADER:', err);
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        <span class="text-rose-500">SINADER no disponible</span>
      `;
    }
  }
}
