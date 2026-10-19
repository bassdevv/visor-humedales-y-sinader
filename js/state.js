import { LAYER_FILTERS, PRIMARY_PROCESS_VALUES, SECONDARY_TREATMENT_VALUES } from './config.js';
import { getUniqueSorted } from './utils.js';

// --- Estado central (única fuente de verdad de los filtros) ---
export const viewerState = {
  filters: {
    search: '',
    region: '',
    comuna: '',
    proceso: null,
    tratamiento: null,
    rubro: null
  },
  view: {
    humedales: true,
    establecimientos: true
  }
};
export const filters = viewerState.filters;

// --- Datos compartidos entre módulos (mutados a través de la app) ---
export const store = {
  geojsonData: null,
  secondaryData: null,
  derivedSnapshot: null,
  filteredFeatures: [],
  filteredSecondaryFeatures: []
};

const renderHooks = [];
const regionChangeHooks = [];
let fitHandler = null;
let chartDataBuilder = () => ({});

export function registerRenderHook(fn) {
  renderHooks.push(fn);
}

export function registerRegionChangeHook(fn) {
  regionChangeHooks.push(fn);
}

export function registerFitHandler(fn) {
  fitHandler = fn;
}

export function registerChartDataBuilder(fn) {
  chartDataBuilder = fn;
}

function isCategorySelected(selection, value) {
  if (!selection) return true;
  if (Array.isArray(selection) && selection.length === 0) return false;
  return selection.includes(value);
}

// Único predicado de filtrado: lo comparten mapa, gráficos, contadores y exportación.
export function matchesViewerFilters(capa, props, omitKey) {
  const config = LAYER_FILTERS[capa];
  if (!config) return true;

  if (filters.search) {
    const haystack = config.searchFields
      .map((field) => (props[field] === undefined || props[field] === null ? '' : String(props[field])))
      .join(' ')
      .toLocaleLowerCase('es-CL');
    if (!haystack.includes(filters.search)) return false;
  }

  if (filters.region && props.region !== filters.region) return false;
  if (filters.comuna && props.comuna !== filters.comuna) return false;

  return config.categories.every((category) => {
    if (category.key === omitKey) return true;
    return isCategorySelected(filters[category.key], props[category.field]);
  });
}

export function filterLayer(capa, omitKey) {
  const source = capa === 'humedales' ? store.geojsonData : store.secondaryData;
  if (!source || !Array.isArray(source.features)) return [];
  return source.features.filter((feature) => matchesViewerFilters(capa, feature.properties || {}, omitKey));
}

export function getSharedFeatures() {
  const features = [];
  if (store.geojsonData && Array.isArray(store.geojsonData.features)) {
    features.push(...store.geojsonData.features);
  }
  if (store.secondaryData && Array.isArray(store.secondaryData.features)) {
    features.push(...store.secondaryData.features);
  }
  return features;
}

export function knownRegions() {
  return getUniqueSorted(getSharedFeatures().map((feature) => feature.properties && feature.properties.region));
}

export function knownComunas(region) {
  return getUniqueSorted(
    getSharedFeatures()
      .filter((feature) => !region || (feature.properties && feature.properties.region) === region)
      .map((feature) => feature.properties && feature.properties.comuna)
  );
}

function deriveViewerData() {
  const humedalesAll = store.geojsonData && Array.isArray(store.geojsonData.features) ? store.geojsonData.features : [];
  const establecimientosAll = store.secondaryData && Array.isArray(store.secondaryData.features) ? store.secondaryData.features : [];

  const snapshot = {
    version: ++derivedVersion,
    origin: null,
    humedales: {
      all: humedalesAll,
      shared: filterLayer('humedales', 'proceso'),
      filtered: filterLayer('humedales')
    },
    establecimientos: {
      all: establecimientosAll,
      shared: filterLayer('establecimientos', 'tratamiento'),
      filtered: filterLayer('establecimientos')
    }
  };

  snapshot.charts = chartDataBuilder(snapshot);
  return snapshot;
}

// Pipeline único de renderizado: deriva una vez y alimenta todas las vistas.
export function renderViewer(origin) {
  store.derivedSnapshot = deriveViewerData();
  store.derivedSnapshot.origin = origin || null;
  store.filteredFeatures = store.derivedSnapshot.humedales.filtered;
  store.filteredSecondaryFeatures = store.derivedSnapshot.establecimientos.filtered;
  lastRenderSignature = viewerSignature();

  renderHooks.forEach((fn) => fn(origin));
  dispatchFilteredData();
}

// Coalescencia por frame: varias mutaciones del mismo frame producen un solo render.
let renderQueued = false;
let pendingOrigin = null;
let pendingFit = false;
let lastRenderSignature = null;
let derivedVersion = 0;

function viewerSignature() {
  return JSON.stringify({ filters: viewerState.filters, view: viewerState.view });
}

// Fuerza el render pendiente de forma sincrónica (uso interno y pruebas).
export function flushViewerRender() {
  renderQueued = false;
  const origin = pendingOrigin;
  pendingOrigin = null;
  const signature = viewerSignature();
  if (signature !== lastRenderSignature) {
    renderViewer(origin);
  }
  if (pendingFit) {
    pendingFit = false;
    if (fitHandler) fitHandler();
  }
}

export function scheduleViewerRender(origin) {
  if (origin !== undefined) pendingOrigin = origin;
  if (renderQueued) return;
  renderQueued = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(flushViewerRender);
  } else {
    setTimeout(flushViewerRender, 0);
  }
}

function normalizeCategorySelection(selection, values) {
  if (selection === null || selection === undefined) return null;
  if (!Array.isArray(selection)) return null;
  let deduped = [...new Set(selection)];
  if (values) {
    deduped = deduped.filter((value) => values.includes(value));
    if (deduped.length === values.length) return null;
  }
  // Un arreglo vacío es un estado válido: "ninguna categoría seleccionada".
  return deduped;
}

function normalizeViewerFilters(next) {
  const out = { ...next };
  out.search = typeof out.search === 'string' ? out.search.trim().toLocaleLowerCase('es-CL') : '';
  out.region = typeof out.region === 'string' ? out.region : '';
  out.comuna = typeof out.comuna === 'string' ? out.comuna : '';

  if (out.region && !knownRegions().includes(out.region)) out.region = '';
  if (out.comuna && !knownComunas(out.region).includes(out.comuna)) out.comuna = '';

  out.proceso = normalizeCategorySelection(out.proceso, PRIMARY_PROCESS_VALUES);
  out.tratamiento = normalizeCategorySelection(out.tratamiento, SECONDARY_TREATMENT_VALUES);
  out.rubro = normalizeCategorySelection(out.rubro, null);

  return out;
}

// Único punto de mutación del estado central.
export function updateViewerState(patch, origin) {
  const regionChanged = Boolean(patch && patch.filters && patch.filters.region !== undefined);

  if (patch && patch.filters) {
    Object.assign(viewerState.filters, normalizeViewerFilters({ ...viewerState.filters, ...patch.filters }));
  }
  if (patch && patch.view) {
    Object.assign(viewerState.view, patch.view);
  }

  if (regionChanged) regionChangeHooks.forEach((fn) => fn());

  scheduleViewerRender(origin);
}

// Diferido: encuadra después del render pendiente para usar el snapshot vigente.
export function requestFitToCurrentResults() {
  pendingFit = true;
  scheduleViewerRender();
}

export function dispatchFilteredData() {
  const detail = {
    humedales: store.filteredFeatures,
    establecimientos: store.filteredSecondaryFeatures,
    primaryVisible: viewerState.view.humedales,
    secondaryVisible: viewerState.view.establecimientos,
    version: store.derivedSnapshot ? store.derivedSnapshot.version : 0
  };
  document.dispatchEvent(new CustomEvent('viewer:filtered', { detail }));
}

export function syncDashboardSummary() {
  const el = document.getElementById('dashboard-summary');
  if (!el) return;
  const parts = [];
  if (filters.search) parts.push(`Buscar: "${filters.search}"`);
  if (filters.region) parts.push(`Región: ${filters.region}`);
  if (filters.comuna) parts.push(`Comuna: ${filters.comuna}`);
  if (filters.proceso) parts.push(`Proceso: ${filters.proceso.join(', ')}`);
  if (filters.tratamiento) parts.push(`Tratamiento: ${filters.tratamiento.join(', ')}`);
  if (filters.rubro) parts.push(`Rubro: ${filters.rubro.join(', ')}`);
  if (!viewerState.view.humedales) parts.push('Capa humedales oculta');
  if (!viewerState.view.establecimientos) parts.push('Capa SINADER oculta');
  el.textContent = parts.length ? parts.join(' · ') : 'Sin filtros activos';
}
