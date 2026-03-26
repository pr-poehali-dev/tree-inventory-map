import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';
import TreePopup from './TreePopup';

type MapLayer = 'yandex_map' | 'yandex_satellite' | 'yandex_hybrid';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
}

const LAYERS: { key: MapLayer; label: string }[] = [
  { key: 'yandex_map',       label: 'Карта' },
  { key: 'yandex_satellite', label: 'Спутник' },
  { key: 'yandex_hybrid',    label: 'Гибрид' },
];

function getTileLayer(type: MapLayer): L.TileLayer {
  switch (type) {
    case 'yandex_satellite':
      return L.tileLayer(
        'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        { attribution: '© Яндекс', maxZoom: 19, crossOrigin: true }
      );
    case 'yandex_hybrid':
      return L.tileLayer(
        'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        { attribution: '© Яндекс', maxZoom: 19, crossOrigin: true }
      );
    default:
      return L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        { attribution: '© Яндекс', maxZoom: 19, crossOrigin: true }
      );
  }
}

function getHybridLabels(): L.TileLayer {
  return L.tileLayer(
    'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
    { attribution: '', maxZoom: 19, crossOrigin: true }
  );
}

function getTreeEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('кустарник')) return '🌿';
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
  const [activeLayer, setActiveLayer] = useState<MapLayer>(() => {
    const saved = localStorage.getItem('mapLayer') as MapLayer;
    const valid: MapLayer[] = ['yandex_map', 'yandex_satellite', 'yandex_hybrid'];
    return valid.includes(saved) ? saved : 'yandex_map';
  });
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

  // Инициализация
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [53.7102, 91.6886],
      zoom: 12,
      zoomControl: false,
    });

    const tile = getTileLayer('yandex_map');
    tile.addTo(map);
    tileLayerRef.current = tile;

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Сдвиг подложки
  useEffect(() => {
    const tile = tileLayerRef.current;
    if (!tile) return;
    const container = (tile as L.TileLayer & { getContainer?: () => HTMLElement | null }).getContainer?.();
    if (container) container.style.transform = `translate(${tileOffset.x}px, ${tileOffset.y}px)`;
  }, [tileOffset]);

  // Переключение слоя
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    localStorage.setItem('mapLayer', activeLayer);

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (labelsLayerRef.current) { map.removeLayer(labelsLayerRef.current); labelsLayerRef.current = null; }

    const newTile = getTileLayer(activeLayer);
    newTile.addTo(map);
    tileLayerRef.current = newTile;

    newTile.once('load', () => {
      const container = (newTile as L.TileLayer & { getContainer?: () => HTMLElement | null }).getContainer?.();
      if (container) container.style.transform = `translate(${tileOffset.x}px, ${tileOffset.y}px)`;
    });

    if (activeLayer === 'yandex_hybrid') {
      const labels = getHybridLabels();
      labels.addTo(map);
      labelsLayerRef.current = labels;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayer]);

  // Клик на карте
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (addMode) { onMapClick(e.latlng.lat, e.latlng.lng); setAddMode(false); }
    };
    map.on('click', handleClick);
    map.getContainer().style.cursor = addMode ? 'crosshair' : '';
    return () => { map.off('click', handleClick); };
  }, [addMode, onMapClick]);

  // Маркеры
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(trees.map(t => t.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
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
        root.render(<TreePopup tree={tree} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />);
        marker.bindPopup(L.popup({ maxWidth: 280, minWidth: 240 }).setContent(popupDiv));
        marker.addTo(map);
        markersRef.current.set(tree.id, marker);
      }
    });
  }, [trees, onEdit, onDelete, onSelect]);

  // Центрирование
  useEffect(() => {
    if (!selectedTreeId) return;
    const marker = markersRef.current.get(selectedTreeId);
    if (marker) { marker.openPopup(); mapRef.current?.panTo(marker.getLatLng(), { animate: true }); }
  }, [selectedTreeId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Добавить дерево */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setAddMode(m => !m)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
            ${addMode ? 'bg-[var(--forest-dark)] text-white ring-2 ring-[var(--forest-light)]' : 'bg-white text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          <span>{addMode ? '📍' : '➕'}</span>
          {addMode ? 'Кликните на карту' : 'Добавить дерево'}
        </button>
        {addMode && (
          <button onClick={() => setAddMode(false)}
            className="bg-white/90 text-gray-500 text-xs px-3 py-1.5 rounded-lg shadow hover:bg-white transition-all">
            Отмена
          </button>
        )}
      </div>

      {/* Подложка + Сдвиг */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        {/* Выбор слоя */}
        <button
          onClick={() => setShowLayerPicker(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showLayerPicker ? 'bg-[var(--forest-mid)] text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          🗺 Подложка
        </button>
        {showLayerPicker && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden min-w-[120px]">
            {LAYERS.map(({ key, label }) => (
              <button key={key}
                onClick={() => { setActiveLayer(key); setShowLayerPicker(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-all
                  ${activeLayer === key ? 'bg-[var(--forest-mid)] text-white' : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Сдвиг подложки */}
        <button
          onClick={() => setShowOffset(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showOffset ? 'bg-amber-500 text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          ⊹ Сдвиг{(tileOffset.x !== 0 || tileOffset.y !== 0) ? ' ●' : ''}
        </button>
        {showOffset && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex flex-col items-center gap-1">
            <div className="text-[10px] text-[var(--stone)] mb-1 font-medium">Сдвиг подложки (1 м/шаг)</div>
            <button onClick={() => shiftTile(0, -1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">↑</button>
            <div className="flex gap-1">
              <button onClick={() => shiftTile(-1, 0)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">←</button>
              <button onClick={() => setTileOffset({ x: 0, y: 0 })}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 text-sm font-bold">✕</button>
              <button onClick={() => shiftTile(1, 0)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">→</button>
            </div>
            <button onClick={() => shiftTile(0, 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">↓</button>
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg text-xs">
        <div className="font-semibold text-[var(--forest-dark)] mb-2 font-heading">Состояние</div>
        {[
          { color: '#2d6a4f', label: 'Хорошее' },
          { color: '#52b788', label: 'Удовлетворительное' },
          { color: '#d4a017', label: 'Неудовл.' },
          { color: '#8b5e3c', label: 'Сухостой' },
          { color: '#c0392b', label: 'Аварийное' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[var(--stone)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
