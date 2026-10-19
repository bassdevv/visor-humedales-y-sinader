import { setBasemap } from './basemaps.js';
import { fitToFilteredResults, scheduleFitToFilteredResults } from './layers.js';
import { resizeCharts } from './charts.js';
import { updateViewerState, requestFitToCurrentResults } from './state.js';
import { toggleLegendValue, resetFilters } from './filters.js';
import { runExport } from './export.js';
import { toggleBufferBody, generateBuffer, clearBuffer } from './buffer.js';

export function initUi() {
  // ==========================================
  // EVENTOS DE INTERFAZ
  // ==========================================
  document.getElementById('btn-satellite').addEventListener('click', () => setBasemap('satellite'));
  document.getElementById('btn-light').addEventListener('click', () => setBasemap('light'));
  document.getElementById('btn-dark').addEventListener('click', () => setBasemap('dark'));

  document.getElementById('btn-fit-bounds').addEventListener('click', () => {
    fitToFilteredResults();
  });

  const searchInput = document.getElementById('filter-search');
  const regionSelect = document.getElementById('filter-region');
  const comunaSelect = document.getElementById('filter-comuna');
  const rubroSelect = document.getElementById('filter-rubro');

  searchInput.addEventListener('input', () => {
    updateViewerState({ filters: { search: searchInput.value } }, 'search');
    scheduleFitToFilteredResults();
  });

  regionSelect.addEventListener('change', () => {
    updateViewerState({ filters: { region: regionSelect.value } }, 'region');
    requestFitToCurrentResults();
  });

  comunaSelect.addEventListener('change', () => {
    updateViewerState({ filters: { comuna: comunaSelect.value } }, 'comuna');
    requestFitToCurrentResults();
  });

  if (rubroSelect) {
    rubroSelect.addEventListener('change', () => {
      updateViewerState({ filters: { rubro: rubroSelect.value ? [rubroSelect.value] : null } }, 'rubro');
      requestFitToCurrentResults();
    });
  }

  document.querySelectorAll('[data-process]').forEach((button) => {
    button.addEventListener('click', () => toggleLegendValue('proceso', button.dataset.process));
  });
  document.querySelectorAll('[data-treatment]').forEach((button) => {
    button.addEventListener('click', () => toggleLegendValue('tratamiento', button.dataset.treatment));
  });

  document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);

  const geojsonExportBtn = document.getElementById('btn-export-geojson');
  const shpExportBtn = document.getElementById('btn-export-shp');
  if (geojsonExportBtn) geojsonExportBtn.addEventListener('click', () => runExport('geojson'));
  if (shpExportBtn) shpExportBtn.addEventListener('click', () => runExport('shp'));

  const bufferToggleBtn = document.getElementById('buffer-toggle');
  if (bufferToggleBtn) bufferToggleBtn.addEventListener('click', () => toggleBufferBody());

  const bufferGenerateBtn = document.getElementById('btn-buffer-generate');
  if (bufferGenerateBtn) bufferGenerateBtn.addEventListener('click', generateBuffer);

  const bufferClearBtn = document.getElementById('btn-buffer-clear');
  if (bufferClearBtn) bufferClearBtn.addEventListener('click', clearBuffer);

  // ==========================================
  // PANEL DE FILTROS MÓVIL (DRAWER)
  // ==========================================
  const panelColumn = document.getElementById('panel-column');
  const panelToggle = document.getElementById('panel-toggle');
  const panelClose = document.getElementById('panel-close');
  const panelBackdrop = document.getElementById('panel-backdrop');
  const mobilePanelQuery = window.matchMedia('(max-width: 1024px)');

  function syncPanelAccessibility() {
    const isOpen = document.body.classList.contains('panel-open');
    if (panelColumn) panelColumn.inert = mobilePanelQuery.matches && !isOpen;
    if (panelToggle) panelToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function setPanelOpen(open) {
    const isOpen = Boolean(open);
    document.body.classList.toggle('panel-open', isOpen);
    syncPanelAccessibility();
    if (isOpen && panelClose) {
      panelClose.focus({ preventScroll: true });
      requestAnimationFrame(resizeCharts);
    } else if (mobilePanelQuery.matches && panelToggle) {
      panelToggle.focus({ preventScroll: true });
    }
  }

  if (panelToggle) panelToggle.addEventListener('click', () => setPanelOpen(true));
  if (panelClose) panelClose.addEventListener('click', () => setPanelOpen(false));
  if (panelBackdrop) panelBackdrop.addEventListener('click', () => setPanelOpen(false));
  mobilePanelQuery.addEventListener('change', () => {
    if (!mobilePanelQuery.matches) document.body.classList.remove('panel-open');
    syncPanelAccessibility();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('panel-open')) {
      setPanelOpen(false);
    }
  });
  syncPanelAccessibility();

  // ==========================================
  // TOGGLES DE VISIBILIDAD DE CAPA
  // ==========================================
  const primaryToggle = document.getElementById('toggle-primary');
  if (primaryToggle) {
    primaryToggle.addEventListener('change', () => {
      const checked = primaryToggle.checked;
      updateViewerState({
        view: { humedales: checked },
        filters: { proceso: checked ? null : [] }
      }, 'toggle');
    });
  }

  const secondaryToggle = document.getElementById('toggle-secondary');
  if (secondaryToggle) {
    secondaryToggle.addEventListener('change', () => {
      const checked = secondaryToggle.checked;
      updateViewerState({
        view: { establecimientos: checked },
        filters: { tratamiento: checked ? null : [] }
      }, 'toggle');
    });
  }
}
