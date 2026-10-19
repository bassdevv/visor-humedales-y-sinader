import { CHART_CONFIG, SECONDARY_STYLE, SECONDARY_TREATMENT_VALUES } from './config.js';
import {
  store,
  filters,
  updateViewerState,
  requestFitToCurrentResults,
  syncDashboardSummary,
  registerRenderHook,
  registerChartDataBuilder
} from './state.js';
import { highlightMatching, clearHighlight } from './layers.js';

let chartJsPromise = null;
let charts = {};
let chartsReady = false;
let chartError = false;
let hoverTimer = null;

const medianLinesPlugin = {
  id: 'medianLines',
  afterDatasetsDraw(chart) {
    const medians = chart.$medians;
    if (!medians) return;
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.strokeStyle = chart.$medianColor || 'rgba(148, 163, 184, 0.65)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    if (Number.isFinite(medians.x) && scales.x) {
      const px = scales.x.getPixelForValue(medians.x);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
    }
    if (Number.isFinite(medians.y) && scales.y) {
      const py = scales.y.getPixelForValue(medians.y);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, py);
      ctx.lineTo(chartArea.right, py);
      ctx.stroke();
    }
    ctx.restore();
  }
};

function formatChartNumber(value, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('es-CL', { maximumFractionDigits: digits });
}

function treatmentColor(treatment) {
  return SECONDARY_STYLE.colors[treatment] || SECONDARY_STYLE.fallbackColor;
}

function matchesTreatment(props, treatment) {
  if (!treatment) return true;
  const value = props.tratamiento;
  const known = SECONDARY_TREATMENT_VALUES.includes(value);
  if (treatment === 'Sin clasificar') return !known;
  return value === treatment;
}

function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (chartJsPromise) return chartJsPromise;
  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHART_CONFIG.url;
    script.async = true;
    script.onload = () => (window.Chart ? resolve(window.Chart) : reject(new Error('Chart.js no disponible')));
    script.onerror = () => reject(new Error('No se pudo cargar Chart.js'));
    document.head.appendChild(script);
  });
  return chartJsPromise;
}

function setDashboardStatus(message, kind) {
  const el = document.getElementById('dashboard-status');
  if (!el) return;
  el.textContent = message || '';
  const classes = {
    idle: 'text-slate-500 dark:text-slate-400',
    error: 'text-rose-600 dark:text-rose-300'
  };
  el.className = `mt-1 min-h-[0.85rem] text-[10px] leading-tight ${classes[kind] || classes.idle}`;
}

function chartPalette() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return dark
    ? {
        text: '#e2e8f0',
        muted: '#cbd5e1',
        grid: 'rgba(148, 163, 184, 0.28)',
        median: 'rgba(226, 232, 240, 0.75)',
        tooltipBg: 'rgba(15, 23, 42, 0.94)',
        tooltipText: '#e2e8f0',
        tooltipBorder: 'rgba(148, 163, 184, 0.35)'
      }
    : {
        text: '#1e293b',
        muted: '#475569',
        grid: 'rgba(71, 85, 105, 0.22)',
        median: 'rgba(51, 65, 85, 0.6)',
        tooltipBg: 'rgba(255, 255, 255, 0.97)',
        tooltipText: '#1e293b',
        tooltipBorder: 'rgba(100, 116, 139, 0.35)'
      };
}

// Reaplica colores de texto/ejes/leyenda/tooltip según el tema (claro/oscuro).
export function applyChartTheme() {
  if (!chartsReady) return;
  const p = chartPalette();
  Object.values(charts).forEach((chart) => {
    if (!chart || !chart.options) return;
    const scales = chart.options.scales || {};
    Object.values(scales).forEach((scale) => {
      if (scale.ticks) scale.ticks.color = p.muted;
      if (scale.title) scale.title.color = p.text;
      if (scale.grid) scale.grid.color = p.grid;
      if (scale.pointLabels) scale.pointLabels.color = p.text;
    });
    const plugins = chart.options.plugins || (chart.options.plugins = {});
    if (plugins.legend && plugins.legend.labels) plugins.legend.labels.color = p.text;
    if (plugins.tooltip) {
      plugins.tooltip.backgroundColor = p.tooltipBg;
      plugins.tooltip.titleColor = p.tooltipText;
      plugins.tooltip.bodyColor = p.tooltipText;
      plugins.tooltip.footerColor = p.muted;
      plugins.tooltip.borderColor = p.tooltipBorder;
      plugins.tooltip.borderWidth = 1;
    }
    chart.$medianColor = p.median;
    chart.update('none');
  });
}

function createCharts(Chart) {
  const palette = chartPalette();
  const legendConfig = {
    position: 'bottom',
    labels: { boxWidth: 10, boxHeight: 10, font: { size: 10 }, color: palette.text }
  };
  const gridColor = palette.grid;
  const tooltipBase = {
    backgroundColor: palette.tooltipBg,
    titleColor: palette.tooltipText,
    bodyColor: palette.tooltipText,
    footerColor: palette.muted,
    borderColor: palette.tooltipBorder,
    borderWidth: 1
  };

  const regionCanvas = document.getElementById('chart-region');
  if (regionCanvas) {
    charts.region = new Chart(regionCanvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { font: { size: 9 }, color: palette.muted }, grid: { color: gridColor } },
          y: { stacked: true, ticks: { font: { size: 9 }, color: palette.text }, grid: { display: false } }
        },
        plugins: {
          legend: legendConfig,
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => {
                const total = ctx.chart.data.datasets.reduce((sum, dataset) => sum + (Number(dataset.data[ctx.dataIndex]) || 0), 0);
                const percent = total > 0 ? (ctx.parsed.x / total) * 100 : 0;
                return `${ctx.dataset.label}: ${formatChartNumber(ctx.parsed.x)} t (${percent.toFixed(1)}%)`;
              },
              footer: (items) => {
                if (!items.length) return '';
                const total = items[0].chart.data.datasets.reduce((sum, dataset) => sum + (Number(dataset.data[items[0].dataIndex]) || 0), 0);
                return `Total: ${formatChartNumber(total)} t`;
              }
            }
          }
        },
        onClick: (event, elements, chart) => handleChartClick('region', elements, chart),
        onHover: (event, elements, chart) => handleChartHover('region', elements, chart)
      }
    });
    regionCanvas.addEventListener('mouseleave', clearHighlight);
  }

  const comunaCanvas = document.getElementById('chart-comuna');
  if (comunaCanvas) {
    charts.comuna = new Chart(comunaCanvas, {
      type: 'bubble',
      data: { datasets: [{ label: 'Comunas', data: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'logarithmic',
            title: { display: true, text: 'Superficie humedales (ha)', font: { size: 9 }, color: palette.text },
            ticks: { font: { size: 9 }, color: palette.muted },
            grid: { color: gridColor }
          },
          y: {
            type: 'logarithmic',
            title: { display: true, text: 'Toneladas declaradas (t)', font: { size: 9 }, color: palette.text },
            ticks: { font: { size: 9 }, color: palette.muted },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => {
                const point = ctx.raw || {};
                return [
                  `${point.comuna} (${point.region})`,
                  `${formatChartNumber(point.x, 2)} ha`,
                  `${formatChartNumber(point.y)} t`,
                  `${formatChartNumber(point.count)} establecimientos`
                ];
              }
            }
          }
        },
        onClick: (event, elements, chart) => handleChartClick('comuna', elements, chart),
        onHover: (event, elements, chart) => handleChartHover('comuna', elements, chart)
      },
      plugins: [medianLinesPlugin]
    });
    comunaCanvas.addEventListener('mouseleave', clearHighlight);
  }

  const rubroCanvas = document.getElementById('chart-rubro');
  if (rubroCanvas) {
    charts.rubro = new Chart(rubroCanvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            ticks: { font: { size: 9 }, color: palette.muted, callback: (value) => `${value}%` },
            grid: { color: gridColor }
          },
          y: { stacked: true, ticks: { font: { size: 9 }, color: palette.text }, grid: { display: false } }
        },
        plugins: {
          legend: legendConfig,
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => {
                const rows = ctx.chart.$rows || [];
                const row = rows[ctx.dataIndex];
                const absolute = row && row.values ? Number(row.values[ctx.dataset.label]) || 0 : 0;
                return `${ctx.dataset.label}: ${Number(ctx.parsed.x).toFixed(1)}% (${formatChartNumber(absolute)} t)`;
              },
              footer: (items) => {
                if (!items.length) return '';
                const rows = items[0].chart.$rows || [];
                const row = rows[items[0].dataIndex];
                return row ? `Total: ${formatChartNumber(row.total)} t` : '';
              }
            }
          }
        },
        onClick: (event, elements, chart) => handleChartClick('rubro', elements, chart),
        onHover: (event, elements, chart) => handleChartHover('rubro', elements, chart)
      }
    });
    rubroCanvas.addEventListener('mouseleave', clearHighlight);
  }
}

async function ensureCharts() {
  if (chartsReady) return true;
  if (chartError) return false;
  try {
    const Chart = await loadChartJs();
    createCharts(Chart);
    chartsReady = true;
    applyChartTheme();
    setDashboardStatus('', 'idle');
    return true;
  } catch (error) {
    chartError = true;
    setDashboardStatus((error && error.message) || 'No se pudo inicializar el dashboard', 'error');
    return false;
  }
}

// Reajusta los gráficos al ancho real del contenedor (p. ej. al abrir el drawer).
export function resizeCharts() {
  Object.values(charts).forEach((chart) => {
    if (chart && typeof chart.resize === 'function') chart.resize();
  });
}

function aggregateRegionTreatment(features) {
  const grouped = new Map();
  features.forEach((feature) => {
    const props = feature.properties || {};
    const region = props.region || 'Sin región';
    const treatment = SECONDARY_TREATMENT_VALUES.includes(props.tratamiento) ? props.tratamiento : 'Sin clasificar';
    const value = Number(props.toneladas) || 0;
    if (!grouped.has(region)) grouped.set(region, { region, total: 0, values: {} });
    const entry = grouped.get(region);
    entry.values[treatment] = (entry.values[treatment] || 0) + value;
    entry.total += value;
  });
  return [...grouped.values()].sort((a, b) => b.total - a.total);
}

function aggregateComunaPressure(snapshot) {
  const keyOf = (props) => `${props.region || ''}\u0000${props.comuna || ''}`;
  const haMap = new Map();
  const tonMap = new Map();
  const countMap = new Map();

  snapshot.humedales.filtered.forEach((feature) => {
    const props = feature.properties || {};
    const key = keyOf(props);
    haMap.set(key, (haMap.get(key) || 0) + (Number(props.ha) || 0));
  });
  snapshot.establecimientos.filtered.forEach((feature) => {
    const props = feature.properties || {};
    const key = keyOf(props);
    tonMap.set(key, (tonMap.get(key) || 0) + (Number(props.toneladas) || 0));
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  const points = [];
  haMap.forEach((ha, key) => {
    const ton = tonMap.get(key) || 0;
    if (ha > 0 && ton > 0) {
      const [region, comuna] = key.split('\u0000');
      const count = countMap.get(key) || 0;
      points.push({
        x: ha,
        y: ton,
        r: Math.max(4, Math.min(20, Math.sqrt(count) * 1.8)),
        region,
        comuna,
        count
      });
    }
  });

  const median = (values) => {
    if (!values.length) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  return {
    points,
    medians: { x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)) }
  };
}

function aggregateRubroTreatment(features) {
  const grouped = new Map();
  features.forEach((feature) => {
    const props = feature.properties || {};
    const rubro = props.rubro || 'Sin rubro';
    const treatment = SECONDARY_TREATMENT_VALUES.includes(props.tratamiento) ? props.tratamiento : 'Sin clasificar';
    const value = Number(props.toneladas) || 0;
    if (!grouped.has(rubro)) grouped.set(rubro, { rubro, total: 0, values: {} });
    const entry = grouped.get(rubro);
    entry.values[treatment] = (entry.values[treatment] || 0) + value;
    entry.total += value;
  });

  const sorted = [...grouped.values()].sort((a, b) => b.total - a.total);
  const rows = sorted.slice(0, 10).map((entry) => ({ rubro: entry.rubro, total: entry.total, values: { ...entry.values } }));
  const rest = sorted.slice(10);
  if (rest.length) {
    const other = { rubro: 'Otros', total: 0, values: {} };
    rest.forEach((entry) => {
      other.total += entry.total;
      Object.entries(entry.values).forEach(([treatment, value]) => {
        other.values[treatment] = (other.values[treatment] || 0) + value;
      });
    });
    rows.push(other);
  }

  return {
    labels: rows.map((row) => row.rubro),
    rows: rows.map((row) => ({
      rubro: row.rubro,
      total: row.total,
      values: { ...row.values },
      percent: Object.fromEntries(
        SECONDARY_TREATMENT_VALUES.map((treatment) => [
          treatment,
          row.total > 0 ? ((row.values[treatment] || 0) / row.total) * 100 : 0
        ])
      )
    }))
  };
}

function buildChartData(snapshot) {
  return {
    regionTreatment: aggregateRegionTreatment(snapshot.establecimientos.filtered),
    comunaPressure: aggregateComunaPressure(snapshot),
    rubroTreatment: aggregateRubroTreatment(snapshot.establecimientos.filtered)
  };
}

function updateCharts() {
  if (!chartsReady || !store.derivedSnapshot || !store.derivedSnapshot.charts) return;
  const data = store.derivedSnapshot.charts;

  const regions = data.regionTreatment || [];
  if (charts.region) {
    charts.region.data.labels = regions.map((entry) => entry.region);
    charts.region.data.datasets = SECONDARY_TREATMENT_VALUES.map((treatment) => ({
      label: treatment,
      data: regions.map((entry) => entry.values[treatment] || 0),
      backgroundColor: treatmentColor(treatment),
      borderRadius: 2
    }));
    charts.region.update('none');
  }

  const pressure = data.comunaPressure || { points: [], medians: {} };
  if (charts.comuna) {
    charts.comuna.data.datasets = [{
      label: 'Comunas',
      data: pressure.points,
      backgroundColor: 'rgba(56, 189, 248, 0.45)',
      borderColor: '#0284c7',
      borderWidth: 1
    }];
    charts.comuna.$medians = pressure.medians;
    charts.comuna.update('none');
  }

  const rubro = data.rubroTreatment || { labels: [], rows: [] };
  if (charts.rubro) {
    charts.rubro.$rows = rubro.rows;
    charts.rubro.data.labels = rubro.labels;
    charts.rubro.data.datasets = SECONDARY_TREATMENT_VALUES.map((treatment) => ({
      label: treatment,
      data: rubro.rows.map((row) => row.percent[treatment] || 0),
      backgroundColor: treatmentColor(treatment),
      borderRadius: 2
    }));
    charts.rubro.update('none');
  }

  if (!chartError) {
    const empty = store.derivedSnapshot.establecimientos.filtered.length === 0
      && store.derivedSnapshot.humedales.filtered.length === 0;
    setDashboardStatus(empty ? 'Sin resultados para los filtros actuales' : '', 'idle');
  }

  updateChartSummaries();
}

function setChartSummary(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (canvas) canvas.setAttribute('aria-label', text);
  const summary = document.getElementById(`${canvasId}-summary`);
  if (summary) summary.textContent = text;
}

function updateChartSummaries() {
  if (!store.derivedSnapshot || !store.derivedSnapshot.charts) return;
  const totalTonnage = store.derivedSnapshot.establecimientos.filtered
    .reduce((sum, feature) => sum + (Number((feature.properties || {}).toneladas) || 0), 0);
  const regionCount = (store.derivedSnapshot.charts.regionTreatment || []).length;
  const pressureCount = store.derivedSnapshot.charts.comunaPressure ? store.derivedSnapshot.charts.comunaPressure.points.length : 0;
  const rubroCount = store.derivedSnapshot.charts.rubroTreatment ? store.derivedSnapshot.charts.rubroTreatment.rows.length : 0;

  setChartSummary('chart-region', `Tonelaje por región y tratamiento: ${formatChartNumber(totalTonnage)} t en ${regionCount} regiones.`);
  setChartSummary('chart-comuna', `Superficie de humedales y tonelaje por comuna: ${pressureCount} comunas con ambas capas.`);
  setChartSummary('chart-rubro', `Tonelaje por rubro y tratamiento: ${rubroCount} categorías mostradas.`);
}

async function renderDashboard(origin) {
  syncDashboardSummary();
  const ready = await ensureCharts();
  if (ready) updateCharts();
}

function handleChartClick(key, elements, chart) {
  if (!elements || !elements.length) return;
  const element = elements[0];

  if (key === 'region') {
    const region = chart.data.labels[element.index];
    if (!region) return;
    if (filters.region === region && !filters.comuna) {
      updateViewerState({ filters: { region: '', comuna: '' } }, 'chart');
    } else {
      updateViewerState({ filters: { region, comuna: '' } }, 'chart');
    }
    requestFitToCurrentResults();
    return;
  }

  if (key === 'comuna') {
    const point = chart.data.datasets[element.datasetIndex].data[element.index];
    if (!point || !point.region) return;
    if (filters.region === point.region && filters.comuna === point.comuna) {
      updateViewerState({ filters: { region: '', comuna: '' } }, 'chart');
    } else {
      updateViewerState({ filters: { region: point.region, comuna: point.comuna } }, 'chart');
    }
    requestFitToCurrentResults();
    return;
  }

  if (key === 'rubro') {
    const label = chart.data.labels[element.index];
    if (!label || label === 'Otros') return;
    if (filters.rubro && filters.rubro.length === 1 && filters.rubro[0] === label) {
      updateViewerState({ filters: { rubro: null } }, 'chart');
    } else {
      updateViewerState({ filters: { rubro: [label] } }, 'chart');
    }
    requestFitToCurrentResults();
  }
}

function handleChartHover(key, elements, chart) {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  if (!elements || !elements.length) {
    hoverTimer = setTimeout(clearHighlight, 80);
    return;
  }
  const element = elements[0];
  hoverTimer = setTimeout(() => {
    if (key === 'region') {
      const region = chart.data.labels[element.index];
      const treatment = chart.data.datasets[element.datasetIndex] ? chart.data.datasets[element.datasetIndex].label : null;
      if (region) highlightMatching((props) => props.region === region && matchesTreatment(props, treatment));
    } else if (key === 'comuna') {
      const point = chart.data.datasets[element.datasetIndex].data[element.index];
      if (point) highlightMatching((props) => props.region === point.region && props.comuna === point.comuna);
    } else if (key === 'rubro') {
      const label = chart.data.labels[element.index];
      const treatment = chart.data.datasets[element.datasetIndex] ? chart.data.datasets[element.datasetIndex].label : null;
      if (label && label !== 'Otros') highlightMatching((props) => props.rubro === label && matchesTreatment(props, treatment));
    }
  }, 90);
}

registerChartDataBuilder(buildChartData);
registerRenderHook(renderDashboard);
