import {
  PRIMARY_PROCESS_VALUES,
  SECONDARY_TREATMENT_VALUES,
  PRIMARY_PROCESS_FIELD,
  SECONDARY_TREATMENT_FIELD
} from './config.js';
import { getUniqueSorted, countBy, setText } from './utils.js';
import {
  viewerState,
  filters,
  store,
  updateViewerState,
  knownRegions,
  knownComunas,
  syncDashboardSummary,
  requestFitToCurrentResults,
  registerRenderHook,
  registerRegionChangeHook
} from './state.js';

// ==========================================
// CONTADORES Y LEYENDAS
// ==========================================
function updateFilterCount() {
  const countEl = document.getElementById('filter-count');
  const primaryLegendEl = document.getElementById('legend-primary');
  const secondaryLegendEl = document.getElementById('legend-secondary');
  if (primaryLegendEl) primaryLegendEl.textContent = store.filteredFeatures.length;
  if (secondaryLegendEl) secondaryLegendEl.textContent = store.filteredSecondaryFeatures.length;
  if (!countEl) return;

  const primaryLabel = viewerState.view.humedales
    ? `${store.filteredFeatures.length} humedales`
    : 'Humedales ocultos';

  if (!store.secondaryData) {
    const total = store.geojsonData && Array.isArray(store.geojsonData.features)
      ? store.geojsonData.features.length
      : 0;
    countEl.textContent = viewerState.view.humedales
      ? `${store.filteredFeatures.length} de ${total}`
      : primaryLabel;
    return;
  }

  const secondaryLabel = viewerState.view.establecimientos
    ? `${store.filteredSecondaryFeatures.length} est.`
    : 'SINADER oculto';
  countEl.textContent = `${primaryLabel} · ${secondaryLabel}`;
}

function updateLegendCounts() {
  if (!store.derivedSnapshot) return;
  const processCounts = countBy(store.derivedSnapshot.humedales.shared, PRIMARY_PROCESS_FIELD);
  setText('legend-municipal', processCounts['Municipal'] || 0);
  setText('legend-oficio', processCounts['de Oficio'] || 0);

  const treatmentCounts = countBy(store.derivedSnapshot.establecimientos.shared, SECONDARY_TREATMENT_FIELD);
  setText('legend-sec-eliminacion', treatmentCounts['Eliminación'] || 0);
  setText('legend-sec-valorizacion', treatmentCounts['Valorización'] || 0);
  setText('legend-sec-recepcion', treatmentCounts['Recepción y Almacenamiento'] || 0);
}

// ==========================================
// CONTROLES DE FILTRO
// ==========================================
function fillSelect(select, values, allLabel) {
  if (!select) return;
  select.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
}

export function populateFilterControls() {
  const regionSelect = document.getElementById('filter-region');
  const rubroSelect = document.getElementById('filter-rubro');
  const regions = knownRegions();
  const secondaryFeatures = store.secondaryData && Array.isArray(store.secondaryData.features) ? store.secondaryData.features : [];
  const rubros = getUniqueSorted(secondaryFeatures.map((feature) => feature.properties && feature.properties.rubro));

  fillSelect(
    regionSelect,
    regions.map((region) => ({ value: region, label: region })),
    'Todas las regiones'
  );
  fillSelect(
    rubroSelect,
    rubros.map((rubro) => ({ value: rubro, label: rubro })),
    'Todos los rubros'
  );

  refreshComunaOptions();
  syncControls();
}

export function refreshComunaOptions() {
  const comunaSelect = document.getElementById('filter-comuna');
  const comunas = knownComunas(filters.region);
  fillSelect(
    comunaSelect,
    comunas.map((comuna) => ({ value: comuna, label: comuna })),
    'Todas las comunas'
  );
  if (comunaSelect) comunaSelect.value = filters.comuna || '';
}

// Sincroniza el DOM desde el estado. Nunca se lee el DOM para derivar datos.
export function syncControls() {
  const searchInput = document.getElementById('filter-search');
  const regionSelect = document.getElementById('filter-region');
  const comunaSelect = document.getElementById('filter-comuna');
  const rubroSelect = document.getElementById('filter-rubro');

  if (searchInput && document.activeElement !== searchInput) searchInput.value = filters.search;
  if (regionSelect) regionSelect.value = filters.region || '';
  if (comunaSelect) comunaSelect.value = filters.comuna || '';
  if (rubroSelect) rubroSelect.value = filters.rubro && filters.rubro.length ? filters.rubro[0] : '';

  syncLegendPressed('process', filters.proceso, PRIMARY_PROCESS_VALUES);
  syncLegendPressed('treatment', filters.tratamiento, SECONDARY_TREATMENT_VALUES);

  const primaryToggle = document.getElementById('toggle-primary');
  const secondaryToggle = document.getElementById('toggle-secondary');
  if (primaryToggle) primaryToggle.checked = viewerState.view.humedales;
  if (secondaryToggle) secondaryToggle.checked = viewerState.view.establecimientos;

  syncDashboardSummary();
}

function syncLegendPressed(attribute, selection) {
  document.querySelectorAll(`[data-${attribute}]`).forEach((button) => {
    const value = button.dataset[attribute];
    const pressed = !selection || selection.includes(value);
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });
}

export function toggleLegendValue(key, value) {
  const values = key === 'proceso' ? PRIMARY_PROCESS_VALUES : SECONDARY_TREATMENT_VALUES;
  const viewKey = key === 'proceso' ? 'humedales' : 'establecimientos';
  const current = filters[key];
  let next;
  if (!current) {
    next = values.filter((item) => item !== value);
  } else if (current.includes(value)) {
    next = current.filter((item) => item !== value);
  } else {
    next = [...current, value];
  }
  // Espejo con el checkbox de la capa: ningún chip activo apaga la capa;
  // cualquier chip activo la enciende.
  const activate = next === null || next.length > 0;
  updateViewerState({ filters: { [key]: next }, view: { [viewKey]: activate } }, 'legend');
}

export function resetFilters() {
  updateViewerState({
    filters: {
      search: '',
      region: '',
      comuna: '',
      proceso: null,
      tratamiento: null,
      rubro: null
    },
    view: { humedales: true, establecimientos: true }
  }, 'reset');
  requestFitToCurrentResults();
}

registerRenderHook(syncControls);
registerRenderHook(updateFilterCount);
registerRenderHook(updateLegendCounts);
registerRegionChangeHook(refreshComunaOptions);
