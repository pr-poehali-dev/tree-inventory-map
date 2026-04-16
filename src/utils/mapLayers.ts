import L from 'leaflet';

export type MapLayer = 'scheme' | 'satellite' | 'hybrid';

export const LAYERS: Record<MapLayer, { label: string; icon: string }> = {
  scheme:    { label: 'Схема',    icon: '🗺' },
  satellite: { label: 'Спутник', icon: '🛰' },
  hybrid:    { label: 'Гибрид',  icon: '🌍' },
};

export function getTileLayer(type: MapLayer): L.TileLayer {
  switch (type) {
    case 'satellite':
    case 'hybrid':
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri © USGS', maxZoom: 19 }
      );
    default:
      return L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 20 }
      );
  }
}

export function getLabelsLayer(): L.TileLayer {
  return L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', maxZoom: 20, pane: 'shadowPane' }
  );
}
