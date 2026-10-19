import { map } from './map.js';
import {
  CONFIG,
  SECONDARY_CONFIG,
  SECONDARY_STYLE,
  PROCESS_STYLES,
  DEFAULT_PROCESS_COLOR,
  HIGHLIGHT_CONFIG
} from './config.js';
import {
  store,
  viewerState,
  renderViewer,
  registerRenderHook,
  registerFitHandler
} from './state.js';
import { extendBounds, prefersReducedMotion, withCapa } from './utils.js';

// ==========================================
// CAPA PRINCIPAL (HUMEDALES)
// ==========================================
function buildProcessColorExpression(kind) {
  const expression = ['match', ['get', 'proceso_humedal_urbano']];
  Object.entries(PROCESS_STYLES).forEach(([process, colors]) => {
    expression.push(process, colors[kind]);
  });
  expression.push(DEFAULT_PROCESS_COLOR[kind]);
  return expression;
}

function buildCentroidData(data) {
  const features = data.features
    .map((feature) => {
      if (!feature.geometry) return null;
      const bounds = new maplibregl.LngLatBounds();
      extendBounds(bounds, feature.geometry.coordinates);
      if (bounds.isEmpty()) return null;
      const center = bounds.getCenter();
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        },
        properties: feature.properties
      };
    })
    .filter(Boolean);

  return { type: 'FeatureCollection', features };
}

let pendingDataApply = false;

export function applyDataToMap() {
  if (!store.geojsonData) return;

  if (!map.isStyleLoaded()) {
    if (!pendingDataApply) {
      pendingDataApply = true;
      map.once('idle', () => {
        pendingDataApply = false;
        applyDataToMap();
      });
    }
    return;
  }

  if (!map.getSource(CONFIG.sourceId)) {
    map.addSource(CONFIG.sourceId, {
      type: 'geojson',
      promoteId: 'cod_humedal',
      data: store.geojsonData
    });
  }

  if (!map.getSource(CONFIG.centroidSourceId)) {
    map.addSource(CONFIG.centroidSourceId, {
      type: 'geojson',
      promoteId: 'cod_humedal',
      data: buildCentroidData(store.geojsonData)
    });
  }

  if (!map.getLayer(CONFIG.layers.polygonFill)) {
    map.addLayer({
      id: CONFIG.layers.polygonFill,
      type: 'fill',
      source: CONFIG.sourceId,
      paint: {
        'fill-color': buildProcessColorExpression('fill'),
        'fill-opacity': 0.6
      }
    });
  }

  if (!map.getLayer(CONFIG.layers.polygonLine)) {
    map.addLayer({
      id: CONFIG.layers.polygonLine,
      type: 'line',
      source: CONFIG.sourceId,
      paint: {
        'line-color': buildProcessColorExpression('line'),
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2]
      }
    });
  }

  if (!map.getLayer(CONFIG.layers.centroids)) {
    map.addLayer({
      id: CONFIG.layers.centroids,
      type: 'circle',
      source: CONFIG.centroidSourceId,
      maxzoom: 10,
      paint: {
        'circle-color': buildProcessColorExpression('fill'),
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 6, 5, 9, 4],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    });
  }

  setLayersVisibility(viewerState.view.humedales);
  moveSecondaryToTop();
  renderViewer('load');
}

export function setLayersVisibility(visible) {
  const visibility = visible ? 'visible' : 'none';
  Object.values(CONFIG.layers).forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  });
}

// ==========================================
// CAPA SECUNDARIA (SINADER 2024)
// ==========================================
function getSecondaryColorExpression() {
  const expression = ['match', ['get', 'tratamiento']];
  Object.entries(SECONDARY_STYLE.colors).forEach(([treatment, color]) => {
    expression.push(treatment, color);
  });
  expression.push(SECONDARY_STYLE.fallbackColor);
  return expression;
}

function buildSecondaryLayerSpecs() {
  return [
    {
      id: SECONDARY_CONFIG.layers.establishments,
      type: 'circle',
      source: SECONDARY_CONFIG.sourceId,
      paint: {
        'circle-color': getSecondaryColorExpression(),
        'circle-radius': SECONDARY_STYLE.radius,
        'circle-stroke-width': SECONDARY_STYLE.strokeWidth,
        'circle-stroke-color': SECONDARY_STYLE.strokeColor,
        'circle-opacity': SECONDARY_STYLE.opacity
      }
    }
  ];
}

export function moveSecondaryToTop() {
  const layerId = SECONDARY_CONFIG.layers.establishments;
  if (map.getLayer(layerId)) {
    map.moveLayer(layerId);
  }
}

export function setSecondaryVisibility(visible) {
  const layerId = SECONDARY_CONFIG.layers.establishments;
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

let secondaryInteractionsBound = false;

function bindSecondaryInteractions() {
  if (secondaryInteractionsBound) return;
  const layerId = SECONDARY_CONFIG.layers.establishments;
  if (!map.getLayer(layerId)) return;

  map.on('mouseenter', layerId, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
  });

  secondaryInteractionsBound = true;
}

let pendingSecondaryApply = false;

export function applySecondaryToMap() {
  if (!store.secondaryData) return;

  if (!map.isStyleLoaded()) {
    if (!pendingSecondaryApply) {
      pendingSecondaryApply = true;
      map.once('idle', () => {
        pendingSecondaryApply = false;
        applySecondaryToMap();
      });
    }
    return;
  }

  if (!map.getSource(SECONDARY_CONFIG.sourceId)) {
    map.addSource(SECONDARY_CONFIG.sourceId, {
      type: 'geojson',
      promoteId: 'id_vu',
      data: store.secondaryData
    });
  }

  buildSecondaryLayerSpecs().forEach((layerSpec) => {
    if (!map.getLayer(layerSpec.id)) {
      map.addLayer(layerSpec);
    }
  });

  bindSecondaryInteractions();
  setSecondaryVisibility(viewerState.view.establecimientos);
  moveSecondaryToTop();
  renderViewer('load');
}

// ==========================================
// RESALTADO (HIGHLIGHT) DEL MAPA
// ==========================================
function polygonGeometryFilter() {
  return ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]];
}

function ensureHighlightLayers() {
  if (!map.isStyleLoaded() || !store.derivedSnapshot) return;
  if (!map.getSource(HIGHLIGHT_CONFIG.sourceId)) {
    map.addSource(HIGHLIGHT_CONFIG.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }

  const specs = [
    {
      id: HIGHLIGHT_CONFIG.layers.fill,
      type: 'fill',
      filter: polygonGeometryFilter(),
      paint: { 'fill-color': '#fde047', 'fill-opacity': 0.28 }
    },
    {
      id: HIGHLIGHT_CONFIG.layers.line,
      type: 'line',
      filter: polygonGeometryFilter(),
      paint: { 'line-color': '#facc15', 'line-width': 2.5 }
    },
    {
      id: HIGHLIGHT_CONFIG.layers.circle,
      type: 'circle',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': '#facc15',
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#78350f',
        'circle-opacity': 0.95
      }
    }
  ];

  specs.forEach((spec) => {
    if (!map.getLayer(spec.id)) {
      map.addLayer({ ...spec, source: HIGHLIGHT_CONFIG.sourceId });
    }
  });
}

function bringHighlightToTop() {
  Object.values(HIGHLIGHT_CONFIG.layers).forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });
}

export function setHighlightFeatures(features) {
  if (!map.isStyleLoaded()) return;
  ensureHighlightLayers();
  const source = map.getSource(HIGHLIGHT_CONFIG.sourceId);
  if (source && typeof source.setData === 'function') {
    source.setData({ type: 'FeatureCollection', features: features || [] });
  }
  bringHighlightToTop();
}

export function clearHighlight() {
  setHighlightFeatures([]);
}

export function highlightMatching(matcher) {
  if (!store.derivedSnapshot) return;
  const features = [];
  store.derivedSnapshot.humedales.filtered.forEach((feature) => {
    if (matcher(feature.properties || {})) features.push(withCapa(feature, 'humedales'));
  });
  store.derivedSnapshot.establecimientos.filtered.forEach((feature) => {
    if (matcher(feature.properties || {})) features.push(withCapa(feature, 'establecimientos'));
  });
  setHighlightFeatures(features);
}

// ==========================================
// RENDER DE DATOS EN EL MAPA (setData)
// ==========================================
export function renderMapData() {
  if (!map.isStyleLoaded() || !store.derivedSnapshot) return;

  const primary = map.getSource(CONFIG.sourceId);
  if (primary && typeof primary.setData === 'function') {
    primary.setData({ type: 'FeatureCollection', features: store.derivedSnapshot.humedales.filtered });
  }

  const centroids = map.getSource(CONFIG.centroidSourceId);
  if (centroids && typeof centroids.setData === 'function') {
    centroids.setData(buildCentroidData({ features: store.derivedSnapshot.humedales.filtered }));
  }

  const secondary = map.getSource(SECONDARY_CONFIG.sourceId);
  if (secondary && typeof secondary.setData === 'function') {
    secondary.setData({ type: 'FeatureCollection', features: store.derivedSnapshot.establecimientos.filtered });
  }

  setLayersVisibility(viewerState.view.humedales);
  setSecondaryVisibility(viewerState.view.establecimientos);
  ensureHighlightLayers();
  clearHighlight();
}

// ==========================================
// ENCUADRE (FIT) DEL MAPA
// ==========================================
export function fitMapToData(features) {
  if (!Array.isArray(features) || features.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  features.forEach((feature) => {
    if (feature.geometry) extendBounds(bounds, feature.geometry.coordinates);
  });

  if (!bounds.isEmpty()) {
    const narrow = window.innerWidth <= 1024;
    map.fitBounds(bounds, {
      padding: narrow
        ? { top: 60, right: 40, bottom: 60, left: 40 }
        : { top: 80, right: 300, bottom: 80, left: 400 },
      maxZoom: 12,
      duration: prefersReducedMotion() ? 0 : 1200
    });
  }
}

let fitResultsTimer = null;

export function fitToFilteredResults() {
  if (fitResultsTimer) {
    clearTimeout(fitResultsTimer);
    fitResultsTimer = null;
  }
  if (!store.filteredFeatures.length) return;
  fitMapToData(store.filteredFeatures);
}

export function scheduleFitToFilteredResults() {
  if (fitResultsTimer) clearTimeout(fitResultsTimer);
  fitResultsTimer = setTimeout(() => {
    fitResultsTimer = null;
    fitToFilteredResults();
  }, 400);
}

export function fitToCurrentResultsNow() {
  const features = [...store.filteredFeatures, ...store.filteredSecondaryFeatures];
  if (!features.length) return;
  fitMapToData(features);
}

registerRenderHook(renderMapData);
registerFitHandler(fitToCurrentResultsNow);
