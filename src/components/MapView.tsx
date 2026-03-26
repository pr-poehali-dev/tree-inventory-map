import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';
import TreePopup from './TreePopup';

type MapLayer = 'scheme' | 'satellite' | 'hybrid';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
}

const LAYERS: Record<MapLayer, { label: string; icon: string }> = {
  scheme:    { label: 'Схема',    icon: '🗺' },
  satellite: { label: 'Спутник', icon: '🛰' },
  hybrid:    { label: 'Гибрид',  icon: '🌍' },
};

function getTileLayer(type: MapLayer): L.TileLayer {
  switch (type) {
    case 'satellite':
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri © USGS', maxZoom: 19 }
      );
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
  const [activeLayer, setActiveLayer] = useState<MapLayer>('scheme');

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

    if (activeLayer === 'hybrid') {
      const labels = getLabelsLayer();
      labels.addTo(map);
      labelsLayerRef.current = labels;
    }
  }, [activeLayer]);

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

      {/* Layer switcher */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex">
        {(Object.entries(LAYERS) as [MapLayer, { label: string; icon: string }][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all
              ${activeLayer === key
                ? 'bg-[var(--forest-mid)] text-white'
                : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
              }
            `}
          >
            <span>{val.icon}</span>
            <span>{val.label}</span>
          </button>
        ))}
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