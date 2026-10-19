import { map } from './map.js';
import { BUFFER_CONFIG, CONFIG, SECONDARY_CONFIG } from './config.js';
import { registerRenderHook } from './state.js';
import { moveSecondaryToTop } from './layers.js';
import { getExportableFeatures } from './export.js';

let turfPromise = null;
let bufferData = null;
let bufferInProgress = false;
let pendingBufferApply = false;

function loadTurf() {
  if (window.turf) return Promise.resolve(window.turf);
  if (turfPromise) return turfPromise;
  turfPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = BUFFER_CONFIG.turfUrl;
    script.onload = () => resolve(window.turf);
    script.onerror = () => reject(new Error('No se pudo cargar Turf.js'));
    document.head.appendChild(script);
  });
  return turfPromise;
}

function getBufferInputFeatures() {
  return getExportableFeatures();
}

function setBufferStatus(kind, message) {
  const el = document.getElementById('buffer-status');
  if (!el) return;
  el.textContent = message || '';
  el.className = `min-h-[0.85rem] text-[10px] leading-tight ${BUFFER_CONFIG.statusClasses[kind] || BUFFER_CONFIG.statusClasses.idle}`;
}

function setBufferButtonsDisabled(generateDisabled, clearDisabled) {
  const generate = document.getElementById('btn-buffer-generate');
  const clear = document.getElementById('btn-buffer-clear');
  if (generate) generate.disabled = generateDisabled;
  if (clear) clear.disabled = clearDisabled;
}

function updateBufferControls() {
  if (bufferInProgress) return;
  const total = getBufferInputFeatures().length;
  setBufferButtonsDisabled(total === 0, !bufferData);
  if (!bufferData && total === 0) {
    setBufferStatus('idle', 'No hay entidades para generar áreas');
  }
}

export function toggleBufferBody(force) {
  const body = document.getElementById('buffer-body');
  const button = document.getElementById('buffer-toggle');
  const chevron = document.getElementById('buffer-chevron');
  if (!body || !button) return;
  const expanded = typeof force === 'boolean' ? force : body.classList.contains('hidden');
  body.classList.toggle('hidden', !expanded);
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (chevron) chevron.classList.toggle('rotate-180', expanded);
  if (expanded) {
    requestAnimationFrame(() => body.scrollIntoView({ block: 'nearest' }));
  }
}

function getBufferColorExpression() {
  return [
    'match',
    ['get', 'capa'],
    'humedales',
    BUFFER_CONFIG.colors.humedales,
    'establecimientos',
    BUFFER_CONFIG.colors.establecimientos,
    BUFFER_CONFIG.colors.fallback
  ];
}

function buildBufferLayerSpecs() {
  return [
    {
      id: BUFFER_CONFIG.layers.fill,
      type: 'fill',
      source: BUFFER_CONFIG.sourceId,
      paint: {
        'fill-color': getBufferColorExpression(),
        'fill-opacity': 0.16
      }
    },
    {
      id: BUFFER_CONFIG.layers.line,
      type: 'line',
      source: BUFFER_CONFIG.sourceId,
      paint: {
        'line-color': getBufferColorExpression(),
        'line-width': 1.2,
        'line-opacity': 0.7
      }
    }
  ];
}

function getBufferBeforeId() {
  if (map.getLayer(CONFIG.layers.centroids)) return CONFIG.layers.centroids;
  if (map.getLayer(SECONDARY_CONFIG.layers.establishments)) return SECONDARY_CONFIG.layers.establishments;
  return undefined;
}

export function applyBufferToMap() {
  if (!bufferData) return;

  if (!map.isStyleLoaded()) {
    if (!pendingBufferApply) {
      pendingBufferApply = true;
      map.once('idle', () => {
        pendingBufferApply = false;
        applyBufferToMap();
      });
    }
    return;
  }

  const source = map.getSource(BUFFER_CONFIG.sourceId);
  if (!source) {
    map.addSource(BUFFER_CONFIG.sourceId, { type: 'geojson', data: bufferData });
  } else if (typeof source.setData === 'function') {
    source.setData(bufferData);
  }

  const beforeId = getBufferBeforeId();
  buildBufferLayerSpecs().forEach((spec) => {
    if (!map.getLayer(spec.id)) {
      map.addLayer(spec, beforeId);
    }
  });
  moveSecondaryToTop();
}

export function clearBuffer() {
  bufferData = null;
  [BUFFER_CONFIG.layers.fill, BUFFER_CONFIG.layers.line].forEach((layerId) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  if (map.getSource(BUFFER_CONFIG.sourceId)) {
    map.removeSource(BUFFER_CONFIG.sourceId);
  }
  setBufferStatus('idle', '');
  updateBufferControls();
}

function buildBufferGeometry(turf, features, distance, unit, steps) {
  const circleSteps = steps * 4;
  const computed = [];

  features.forEach((feature) => {
    const type = feature.geometry && feature.geometry.type;
    const buffered = type === 'Point'
      ? turf.circle(feature, distance, { units: unit, steps: circleSteps })
      : turf.buffer(feature, distance, { units: unit, steps });
    if (buffered) computed.push(buffered);
  });

  return { type: 'FeatureCollection', features: computed };
}

export async function generateBuffer() {
  if (bufferInProgress) return;

  const distanceEl = document.getElementById('buffer-distance');
  const unitEl = document.getElementById('buffer-unit');
  const dissolveEl = document.getElementById('buffer-dissolve');

  const distance = Number.parseFloat(distanceEl ? distanceEl.value : '');
  const unit = unitEl ? unitEl.value : 'meters';
  const dissolve = Boolean(dissolveEl && dissolveEl.checked);

  if (!Number.isFinite(distance) || distance <= 0) {
    setBufferStatus('error', 'Ingresa una distancia válida');
    return;
  }

  const features = getBufferInputFeatures();
  if (!features.length) {
    setBufferStatus('error', 'No hay entidades para generar áreas');
    updateBufferControls();
    return;
  }

  bufferInProgress = true;
  setBufferButtonsDisabled(true, true);
  setBufferStatus('generating', 'Generando áreas…');
  await new Promise((resolve) => setTimeout(resolve, 30));

  // polygon-clipping (usado por dissolve) desborda su cola con demasiados
  // segmentos; al unir áreas se usa un contorno más simple para mantenerlo estable.
  const geometrySteps = dissolve ? BUFFER_CONFIG.dissolveSteps : BUFFER_CONFIG.steps;

  try {
    const turf = await loadTurf();
    let result = buildBufferGeometry(turf, features, distance, unit, geometrySteps);

    if (!result.features.length) {
      throw new Error('No se pudieron generar las áreas');
    }

    if (dissolve) {
      try {
        result = turf.dissolve(turf.flatten(result), { propertyName: 'capa' });
      } catch (dissolveError) {
        console.warn('No se pudieron unir las áreas:', dissolveError);
        throw new Error('No se pudieron unir las áreas. Desactiva "Unir áreas superpuestas" e inténtalo de nuevo.');
      }
    }

    bufferData = result;
    applyBufferToMap();
    const count = result.features.length;
    setBufferStatus('success', `${count} área${count === 1 ? '' : 's'} generada${count === 1 ? '' : 's'}`);
  } catch (error) {
    setBufferStatus('error', (error && error.message) || 'No se pudieron generar las áreas');
  } finally {
    bufferInProgress = false;
    updateBufferControls();
  }
}

registerRenderHook(updateBufferControls);
