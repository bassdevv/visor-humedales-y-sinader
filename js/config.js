export const SATELLITE_STYLE = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
    },
    'labels-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'labels-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export const CONFIG = {
  // Estilos disponibles (Satélite fotográfico, Claro, Oscuro)
  styles: {
    satellite: SATELLITE_STYLE,
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  },
  // Ruta relativa servida directamente por GitHub Pages
  geojsonUrl: './data/humedales.geojson',
  sourceId: 'humedales-source',
  centroidSourceId: 'humedales-centroids-source',
  layers: {
    polygonFill: 'humedales-fill',
    polygonLine: 'humedales-line',
    centroids: 'humedales-centroids'
  }
};

// Datos de la capa secundaria (sin simbología)
export const SECONDARY_CONFIG = {
  geojsonUrl: './data/sinader_establecimientos.geojson',
  sourceId: 'sinader-establecimientos-source',
  layers: {
    establishments: 'sinader-establecimientos'
  }
};

// Simbología de la capa secundaria (sin lógica de datos)
export const SECONDARY_STYLE = {
  colors: {
    'Eliminación': '#ef4444',
    'Valorización': '#10b981',
    'Recepción y Almacenamiento': '#8b5cf6'
  },
  fallbackColor: '#94a3b8',
  radius: ['interpolate', ['linear'], ['zoom'], 4, 3.5, 8, 6, 12, 8],
  strokeColor: '#ffffff',
  strokeWidth: 1,
  opacity: 0.85
};

export const REGION_ALIASES = {
  'Aysén del Gral. Carlos Ibanez del Campo': 'Aysén del General Carlos Ibáñez del Campo',
  "Libertador Gral. Bernardo O'Higgins": "Libertador General Bernardo O'Higgins"
};

export const PROCESS_STYLES = {
  Municipal: { fill: '#0ea5e9', line: '#0369a1' },
  'de Oficio': { fill: '#f59e0b', line: '#b45309' }
};
export const DEFAULT_PROCESS_COLOR = { fill: '#94a3b8', line: '#64748b' };

// --- Campos y valores de filtrado por capa (única definición) ---
export const PRIMARY_PROCESS_FIELD = 'proceso_humedal_urbano';
export const SECONDARY_TREATMENT_FIELD = 'tratamiento';
export const SECONDARY_RUBRO_FIELD = 'rubro';
export const PRIMARY_PROCESS_VALUES = Object.keys(PROCESS_STYLES);
export const SECONDARY_TREATMENT_VALUES = Object.keys(SECONDARY_STYLE.colors);

export const LAYER_FILTERS = {
  humedales: {
    searchFields: ['nombre_humedal', 'cod_humedal'],
    categories: [
      { key: 'proceso', field: PRIMARY_PROCESS_FIELD, values: PRIMARY_PROCESS_VALUES }
    ]
  },
  establecimientos: {
    searchFields: ['nombre', 'razon_social', 'id_vu'],
    categories: [
      { key: 'tratamiento', field: SECONDARY_TREATMENT_FIELD, values: SECONDARY_TREATMENT_VALUES },
      { key: 'rubro', field: SECONDARY_RUBRO_FIELD, values: null }
    ]
  }
};

export const HIGHLIGHT_CONFIG = {
  sourceId: 'dashboard-highlight-source',
  layers: {
    fill: 'dashboard-highlight-fill',
    line: 'dashboard-highlight-line',
    circle: 'dashboard-highlight-circle'
  }
};

export const EXPORT_CONFIG = {
  shpWriteUrl: 'https://unpkg.com/@mapbox/shp-write@latest/shpwrite.js',
  filenamePrefix: 'datos-filtrados',
  shpTypeNames: { point: 'establecimientos', polygon: 'humedales' },
  numericFields: ['sup_ha', 'toneladas', 'id_vu'],
  shpFields: {
    humedales: [
      ['cod_humedal', 'codigo'],
      ['nombre_humedal', 'nombre'],
      ['region', 'region'],
      ['comuna', 'comuna'],
      ['ha', 'sup_ha'],
      ['proceso_humedal_urbano', 'proceso']
    ],
    establecimientos: [
      ['id_vu', 'id_vu'],
      ['nombre', 'nombre'],
      ['razon_social', 'razon'],
      ['rubro', 'rubro'],
      ['region', 'region'],
      ['comuna', 'comuna'],
      ['toneladas', 'toneladas'],
      ['tratamiento', 'tratam']
    ]
  },
  statusClasses: {
    idle: 'text-slate-500 dark:text-slate-400',
    generating: 'text-sky-600 dark:text-sky-300',
    success: 'text-emerald-600 dark:text-emerald-300',
    error: 'text-rose-600 dark:text-rose-300'
  }
};

export const CHART_CONFIG = {
  url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js'
};

export const BUFFER_CONFIG = {
  turfUrl: 'https://unpkg.com/@turf/turf@7.0.0/turf.min.js',
  sourceId: 'buffer-source',
  layers: { fill: 'buffer-fill', line: 'buffer-line' },
  steps: 16,
  dissolveSteps: 8,
  colors: {
    humedales: '#0ea5e9',
    establecimientos: '#a855f7',
    fallback: '#38bdf8'
  },
  statusClasses: {
    idle: 'text-slate-500 dark:text-slate-400',
    generating: 'text-sky-600 dark:text-sky-300',
    success: 'text-emerald-600 dark:text-emerald-300',
    error: 'text-rose-600 dark:text-rose-300'
  }
};

export const DARK_BASEMAP_PALETTE = {
  background: '#0e2036',
  land: '#102641',
  park: '#13304f',
  residential: 'rgba(24, 52, 84, 0.5)',
  water: '#1b3f6b',
  waterway: '#2a5a8c'
};
