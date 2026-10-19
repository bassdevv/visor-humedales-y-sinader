export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeProperties(data) {
  if (!data || !Array.isArray(data.features)) return;
  data.features.forEach((feature) => {
    const props = feature.properties;
    if (!props) return;
    Object.keys(props).forEach((key) => {
      if (typeof props[key] === 'string') {
        props[key] = props[key].trim();
      }
    });
    const area = Number(props.ha);
    if (Number.isFinite(area)) props.ha = area;
  });
}

export function getUniqueSorted(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export function countBy(features, key) {
  return features.reduce((counts, feature) => {
    const value = feature.properties ? feature.properties[key] : null;
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

export function formatArea(value) {
  const area = Number(value);
  if (!Number.isFinite(area)) return '—';
  return `${area.toLocaleString('es-CL', { maximumFractionDigits: 2 })} ha`;
}

export function formatTonnage(value) {
  const tonnage = Number(value);
  if (!Number.isFinite(tonnage)) return '—';
  return `${tonnage.toLocaleString('es-CL', { maximumFractionDigits: 3 })} t`;
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function extendBounds(bounds, coordinates) {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') {
    bounds.extend(coordinates);
    return;
  }
  coordinates.forEach((coordinate) => extendBounds(bounds, coordinate));
}

export function withCapa(feature, capa) {
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: { ...(feature.properties || {}), capa }
  };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
