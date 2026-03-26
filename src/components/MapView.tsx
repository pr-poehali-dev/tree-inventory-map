import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';
import TreePopup from './TreePopup';

type MapLayer = 'osm' | 'esri_satellite' | 'esri_hybrid' | 'yandex_map' | 'yandex_satellite' | 'google_map' | 'google_satellite' | 'google_hybrid';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
}

const LAYER_GROUPS: { label: string; layers: { key: MapLayer; label: string }[] }[] = [
  {
    label: 'OpenStreetMap',
    layers: [
      { key: 'osm', label: 'Схема' },
    ],
  },
  {
    label: 'Яндекс',
    layers: [
      { key: 'yandex_map',       label: 'Карта' },
      { key: 'yandex_satellite', label: 'Спутник' },
    ],
  },
  {
    label: 'Google',
    layers: [
      { key: 'google_map',       label: 'Карта' },
      { key: 'google_satellite', label: 'Спутник' },
      { key: 'google_hybrid',    label: 'Гибрид' },
    ],
  },
  {
    label: 'Esri',
    layers: [
      { key: 'esri_satellite', label: 'Спутник' },
      { key: 'esri_hybrid',    label: 'Гибрид' },
    ],
  },
];

function getTileLayer(type: MapLayer): L.TileLayer {
  switch (type) {
    case 'yandex_map':
      return L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=24.06.12-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        { attribution: '© Яндекс', maxZoom: 19, tms: false }
      );
    case 'yandex_satellite':
      return L.tileLayer(
        'https://core-sat.maps.yandex.net/tiles?l=sat&v=3.986.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        { attribution: '© Яндекс', maxZoom: 19 }
      );
    case 'google_map':
      return L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 20, subdomains: ['0','1','2','3'] }
      );
    case 'google_satellite':
      return L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 20, subdomains: ['0','1','2','3'] }
      );
    case 'google_hybrid':
      return L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 20, subdomains: ['0','1','2','3'] }
      );
    case 'esri_satellite':
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri', maxZoom: 19 }
      );
    case 'esri_hybrid':
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri', maxZoom: 19 }
      );
    default:
      return L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 20 }
      );
  }
}

function getLabelsLayer(): L.TileLayer {
  return L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', maxZoom: 20, pane: 'shadowPane' }
  );
}

function getTreeEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('кустарник') || s === 'кустарник') return '🌿';
  if (s.includes('хвойное') || s.includes('ель') || s.includes('сосна') || s.includes('лиственниц') || s.includes('пихта') || s.includes('кедр')) return '🌲';
  return '🌳';
}

function createTreeIcon(status: TreeMarker['status'], species: string) {
  const color = STATUS_COLORS[status];
  const emoji = getTreeEmoji(species);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:28px;height:28px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(26,58,42,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:11px;">${emoji}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

export default function MapView({ trees, onMapClick, onEdit, onDelete, onSelect, selectedTreeId }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('osm');
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [showOffset, setShowOffset] = useState(false);
  const [tileOffset, setTileOffset] = useState({ x: 0, y: 0 });

  const shiftTile = (dx: number, dy: number) => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const metersPerPx = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const px = 1 / metersPerPx;
    setTileOffset(o => ({ x: o.x + dx * px, y: o.y + dy * px }));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [53.7102, 91.6886],
      zoom: 12,
      zoomControl: false,
    });

    const tile = getTileLayer('scheme');
    tile.addTo(map);
    tileLayerRef.current = tile;

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply pixel offset to tile layer container
  useEffect(() => {
    const tile = tileLayerRef.current;
    if (!tile) return;
    const container = (tile as L.TileLayer & { getContainer?: () => HTMLElement | null }).getContainer?.();
    if (container) {
      container.style.transform = `translate(${tileOffset.x}px, ${tileOffset.y}px)`;
    }
  }, [tileOffset]);

  // Switch tile layer when activeLayer changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    const newTile = getTileLayer(activeLayer);
    newTile.addTo(map);
    tileLayerRef.current = newTile;

    newTile.on('load', () => {
      const container = (newTile as L.TileLayer & { getContainer?: () => HTMLElement | null }).getContainer?.();
      if (container) container.style.transform = `translate(${tileOffset.x}px, ${tileOffset.y}px)`;
    });

    if (activeLayer === 'esri_hybrid') {
      const labels = getLabelsLayer();
      labels.addTo(map);
      labelsLayerRef.current = labels;
    }
  }, [activeLayer, tileOffset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (addMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
        setAddMode(false);
      }
    };

    map.on('click', handleClick);
    map.getContainer().style.cursor = addMode ? 'crosshair' : '';

    return () => { map.off('click', handleClick); };
  }, [addMode, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(trees.map(t => t.id));
    const existingIds = new Set(markersRef.current.keys());

    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    });

    trees.forEach(tree => {
      const existing = markersRef.current.get(tree.id);
      if (existing) {
        existing.setLatLng([tree.lat, tree.lng]);
        existing.setIcon(createTreeIcon(tree.status, tree.species));
      } else {
        const marker = L.marker([tree.lat, tree.lng], { icon: createTreeIcon(tree.status, tree.species) });
        const popupDiv = document.createElement('div');
        const root = createRoot(popupDiv);
        root.render(
          <TreePopup tree={tree} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
        );
        marker.bindPopup(L.popup({ maxWidth: 280, minWidth: 240 }).setContent(popupDiv));
        marker.addTo(map);
        markersRef.current.set(tree.id, marker);
      }
    });
  }, [trees, onEdit, onDelete, onSelect]);

  useEffect(() => {
    if (selectedTreeId) {
      const marker = markersRef.current.get(selectedTreeId);
      if (marker) {
        marker.openPopup();
        mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      }
    }
  }, [selectedTreeId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Add mode button */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setAddMode(m => !m)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
            ${addMode
              ? 'bg-[var(--forest-dark)] text-white ring-2 ring-[var(--forest-light)]'
              : 'bg-white text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
            }
          `}
        >
          <span>{addMode ? '📍' : '➕'}</span>
          {addMode ? 'Кликните на карту' : 'Добавить дерево'}
        </button>
        {addMode && (
          <button
            onClick={() => setAddMode(false)}
            className="bg-white/90 text-gray-500 text-xs px-3 py-1.5 rounded-lg shadow hover:bg-white transition-all"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Offset panel */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={() => setShowOffset(v => !v)}
          title="Сдвиг карты"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showOffset ? 'bg-amber-500 text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          <span>⊹</span> Сдвиг карты
        </button>

        {showOffset && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex flex-col items-center gap-1">
            <div className="text-[10px] text-[var(--stone)] mb-1 font-medium">Сдвиг подложки (1 м/шаг)</div>
            <button onClick={() => shiftTile(0, -1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg transition-all">↑</button>
            <div className="flex gap-1">
              <button onClick={() => shiftTile(-1, 0)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg transition-all">←</button>
              <button onClick={() => setTileOffset({ x: 0, y: 0 })}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 text-sm font-bold transition-all">✕</button>
              <button onClick={() => shiftTile(1, 0)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg transition-all">→</button>
            </div>
            <button onClick={() => shiftTile(0, 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg transition-all">↓</button>
            {(tileOffset.x !== 0 || tileOffset.y !== 0) && (
              <div className="text-[9px] text-amber-600 mt-1">{tileOffset.x.toFixed(1)}px / {tileOffset.y.toFixed(1)}px</div>
            )}
          </div>
        )}
      </div>

      {/* Layer picker */}
      <div className="absolute top-16 right-4 z-[1000] flex flex-col items-end gap-1">
        <button
          onClick={() => setShowLayerPicker(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showLayerPicker ? 'bg-[var(--forest-mid)] text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          🗺 Подложка
        </button>
        {showLayerPicker && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            {LAYER_GROUPS.map(group => (
              <div key={group.label}>
                <div className="text-[10px] font-bold text-[var(--stone)] px-3 pt-2 pb-0.5 uppercase tracking-wide">{group.label}</div>
                {group.layers.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveLayer(key); setShowLayerPicker(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-all
                      ${activeLayer === key
                        ? 'bg-[var(--forest-mid)] text-white'
                        : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
                      }`}
                  >{label}</button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg text-xs">
        <div className="font-semibold text-[var(--forest-dark)] mb-2 font-heading">Состояние</div>
        {[
          { color: '#2d6a4f', label: 'Хорошее' },
          { color: '#52b788', label: 'Удовлетворительное' },
          { color: '#d4a017', label: 'Неудовл.' },
          { color: '#8b5e3c', label: 'Сухостой' },
          { color: '#c0392b', label: 'Аварийное' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
        <div className="font-semibold text-[var(--forest-dark)] mt-2 mb-1 font-heading">Тип</div>
        {[
          { emoji: '🌳', label: 'Лиственные' },
          { emoji: '🌲', label: 'Хвойные' },
          { emoji: '🌿', label: 'Кустарники' },
        ].map(({ emoji, label }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className="text-sm">{emoji}</span>
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}