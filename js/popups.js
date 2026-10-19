import { map } from './map.js';
import {
  CONFIG,
  SECONDARY_CONFIG,
  PROCESS_STYLES,
  DEFAULT_PROCESS_COLOR,
  SECONDARY_STYLE
} from './config.js';
import { escapeHtml, safeUrl, formatArea, formatTonnage } from './utils.js';

// ==========================================
// POPUPS ATRIBUTIVOS
// ==========================================
function buildPopupHtml(props) {
  const process = props.proceso_humedal_urbano || 'Sin clasificar';
  const colors = PROCESS_STYLES[process] || DEFAULT_PROCESS_COLOR;
  const bcnUrl = safeUrl(props.url_res_bcn);
  const simbioUrl = safeUrl(props.url_simbio);

  const rows = [
    ['Código', props.cod_humedal],
    ['Región', props.region],
    ['Comuna', props.comuna],
    ['Superficie', formatArea(props.ha)],
    ['Resolución', props.resolucion]
  ].filter((row) => row[1]);

  let html = '<div class="text-xs font-sans">';
  html += `<strong class="text-sm block text-slate-900">${escapeHtml(props.nombre_humedal || 'Humedal sin nombre')}</strong>`;
  html += `<span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background:${colors.fill}22;color:${colors.line}">`;
  html += `<span class="w-2 h-2 rounded-full" style="background:${colors.fill}"></span>`;
  html += `${escapeHtml(process)}</span>`;
  html += '<div class="mt-2 space-y-1">';

  rows.forEach(([label, value]) => {
    html += `<div class="flex justify-between gap-3 text-slate-600">`;
    html += `<span class="font-medium text-slate-500">${label}</span>`;
    html += `<span class="text-right">${escapeHtml(value)}</span></div>`;
  });

  html += '</div>';

  if (bcnUrl || simbioUrl) {
    html += '<div class="mt-2 pt-2 border-t border-slate-200 flex gap-3">';
    if (bcnUrl) {
      html += `<a href="${escapeHtml(bcnUrl)}" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:text-sky-700 font-medium">Ver resolución (BCN)</a>`;
    }
    if (simbioUrl) {
      html += `<a href="${escapeHtml(simbioUrl)}" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:text-sky-700 font-medium">Ficha SIMBIO</a>`;
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function buildSecondaryPopupHtml(props) {
  const treatment = props.tratamiento || 'Sin clasificar';
  const color = SECONDARY_STYLE.colors[treatment] || SECONDARY_STYLE.fallbackColor;

  const rows = [
    ['Razón social', props.razon_social],
    ['Rubro', props.rubro],
    ['Región', props.region],
    ['Comuna', props.comuna],
    ['Toneladas 2024', formatTonnage(props.toneladas)],
    ['Registros', props.registros],
    ['ID VU', props.id_vu]
  ].filter((row) => row[1] !== undefined && row[1] !== null && row[1] !== '');

  let html = '<div class="text-xs font-sans">';
  html += `<strong class="text-sm block text-slate-900">${escapeHtml(props.nombre || 'Establecimiento sin nombre')}</strong>`;
  html += `<span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background:${color}22;color:${color}">`;
  html += `<span class="w-2 h-2 rounded-full" style="background:${color}"></span>`;
  html += `${escapeHtml(treatment)}</span>`;
  html += '<div class="mt-2 space-y-1">';

  rows.forEach(([label, value]) => {
    html += `<div class="flex justify-between gap-3 text-slate-600">`;
    html += `<span class="font-medium text-slate-500">${label}</span>`;
    html += `<span class="text-right">${escapeHtml(value)}</span></div>`;
  });

  html += '</div>';
  html += '<div class="mt-2 pt-2 border-t border-slate-200 text-[9px] text-slate-400">Fuente: SINADER 2024 · MMA</div>';
  html += '</div>';
  return html;
}

// ==========================================
// INTERACCIONES DEL MAPA
// ==========================================
map.on('click', (event) => {
  const secondaryLayerId = SECONDARY_CONFIG.layers.establishments;
  if (map.getLayer(secondaryLayerId)) {
    const secondaryFeatures = map.queryRenderedFeatures(event.point, { layers: [secondaryLayerId] });
    if (secondaryFeatures.length) {
      new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
        .setLngLat(event.lngLat)
        .setHTML(buildSecondaryPopupHtml(secondaryFeatures[0].properties || {}))
        .addTo(map);
      return;
    }
  }

  const layers = Object.values(CONFIG.layers).filter((layerId) => map.getLayer(layerId));
  if (!layers.length) return;

  const features = map.queryRenderedFeatures(event.point, { layers });
  if (!features.length) return;

  new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
    .setLngLat(event.lngLat)
    .setHTML(buildPopupHtml(features[0].properties || {}))
    .addTo(map);
});

Object.values(CONFIG.layers).forEach((layerId) => {
  map.on('mouseenter', layerId, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
  });
});
