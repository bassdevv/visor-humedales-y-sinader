import { EXPORT_CONFIG } from './config.js';
import { filters, store, viewerState, registerRenderHook } from './state.js';
import { withCapa, downloadBlob } from './utils.js';

let shpWritePromise = null;
let exportInProgress = false;

export function getExportableFeatures() {
  const features = [];
  if (viewerState.view.humedales) {
    store.filteredFeatures.forEach((feature) => features.push(withCapa(feature, 'humedales')));
  }
  if (viewerState.view.establecimientos) {
    store.filteredSecondaryFeatures.forEach((feature) => features.push(withCapa(feature, 'establecimientos')));
  }
  return features;
}

function exportFilename(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `${EXPORT_CONFIG.filenamePrefix}_${date}.${extension}`;
}

function buildExportMetadata(features) {
  return {
    generado: new Date().toISOString(),
    fuente: 'Humedales Urbanos y Establecimientos SINADER (MMA · SIMBIO + SINADER 2024)',
    conteo: {
      humedales: features.filter((f) => f.properties.capa === 'humedales').length,
      establecimientos: features.filter((f) => f.properties.capa === 'establecimientos').length
    },
    filtros: {
      busqueda: filters.search || null,
      region: filters.region || null,
      comuna: filters.comuna || null,
      proceso: filters.proceso,
      tratamiento: filters.tratamiento,
      rubro: filters.rubro,
      grupoHumedalesVisible: viewerState.view.humedales,
      grupoSinaderVisible: viewerState.view.establecimientos
    }
  };
}

function loadShpWrite() {
  if (window.shpwrite) return Promise.resolve(window.shpwrite);
  if (shpWritePromise) return shpWritePromise;
  shpWritePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EXPORT_CONFIG.shpWriteUrl;
    script.onload = () => resolve(window.shpwrite);
    script.onerror = () => reject(new Error('No se pudo cargar la librería de Shapefile'));
    document.head.appendChild(script);
  });
  return shpWritePromise;
}

function toShapefileProperties(properties, capa) {
  const fieldMap = EXPORT_CONFIG.shpFields[capa] || [];
  const out = {};
  fieldMap.forEach(([source, target]) => {
    const value = properties[source];
    if (value === undefined || value === null || value === '') {
      out[target] = '';
    } else if (EXPORT_CONFIG.numericFields.includes(target)) {
      out[target] = Number(value);
    } else {
      out[target] = String(value);
    }
  });
  return out;
}

function buildShapefileGeojson(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: toShapefileProperties(feature.properties || {}, feature.properties && feature.properties.capa)
    }))
  };
}

function setExportStatus(kind, message) {
  const el = document.getElementById('export-status');
  if (!el) return;
  el.textContent = message || '';
  el.className = `mt-1 min-h-[0.85rem] text-[10px] leading-tight ${EXPORT_CONFIG.statusClasses[kind] || EXPORT_CONFIG.statusClasses.idle}`;
}

function setExportButtonsDisabled(disabled) {
  ['btn-export-geojson', 'btn-export-shp'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

function setExportLabel(id, busy) {
  const label = document.querySelector(`#${id} [data-export-label]`);
  if (!label) return;
  if (!label.dataset.idle) label.dataset.idle = label.textContent;
  label.textContent = busy ? 'Generando…' : label.dataset.idle;
}

function updateExportControls() {
  if (exportInProgress) return;
  const total = getExportableFeatures().length;
  setExportButtonsDisabled(total === 0);
  setExportStatus('idle', total === 0 ? 'Sin resultados para exportar' : '');
}

export async function runExport(kind) {
  if (exportInProgress) return;
  const features = getExportableFeatures();
  if (!features.length) {
    updateExportControls();
    return;
  }

  exportInProgress = true;
  setExportButtonsDisabled(true);
  const buttonId = kind === 'shp' ? 'btn-export-shp' : 'btn-export-geojson';
  setExportLabel(buttonId, true);
  setExportStatus('generating', kind === 'shp' ? 'Generando Shapefile…' : 'Generando GeoJSON…');

  try {
    let blob;
    let filename;
    if (kind === 'shp') {
      const shpwrite = await loadShpWrite();
      const geojson = buildShapefileGeojson(features);
      blob = await shpwrite.zip(geojson, {
        outputType: 'blob',
        types: EXPORT_CONFIG.shpTypeNames,
        compression: 'DEFLATE'
      });
      filename = exportFilename('zip');
    } else {
      const collection = {
        type: 'FeatureCollection',
        metadata: buildExportMetadata(features),
        features
      };
      blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' });
      filename = exportFilename('geojson');
    }
    downloadBlob(blob, filename);
    setExportStatus('success', `Descargado: ${filename}`);
  } catch (error) {
    setExportStatus('error', (error && error.message) || 'No se pudo generar la exportación');
  } finally {
    setExportLabel(buttonId, false);
    exportInProgress = false;
    setExportButtonsDisabled(getExportableFeatures().length === 0);
  }
}

registerRenderHook(updateExportControls);
