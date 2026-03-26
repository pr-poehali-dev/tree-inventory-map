import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';
import TreePopup from './TreePopup';

type MapLayer = 'yandex_map' | 'yandex_satellite';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
}

declare global {
  interface Window {
    ymaps3: Record<string, unknown> & { ready: Promise<void> };
  }
}

function getTreeEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('кустарник') || s === 'кустарник') return '🌿';
  if (s.includes('хвойное') || s.includes('ель') || s.includes('сосна') || s.includes('лиственниц') || s.includes('пихта') || s.includes('кедр')) return '🌲';
  return '🌳';
}

function createMarkerElement(status: TreeMarker['status'], species: string): HTMLElement {
  const color = STATUS_COLORS[status];
  const emoji = getTreeEmoji(species);
  const el = document.createElement('div');
  el.style.cssText = `
    width:28px;height:28px;
    background:${color};
    border:3px solid white;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(26,58,42,0.35);
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;
  const span = document.createElement('span');
  span.style.cssText = 'transform:rotate(45deg);font-size:11px;';
  span.textContent = emoji;
  el.appendChild(span);
  return el;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YMaps = any;

export default function MapView({ trees, onMapClick, onEdit, onDelete, onSelect, selectedTreeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMaps>(null);
  const markersRef = useRef<Map<string, YMaps>>(new Map());
  const balloonRef = useRef<YMaps>(null);
  const [addMode, setAddMode] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayer>(() => {
    const saved = localStorage.getItem('mapLayer') as MapLayer;
    return saved === 'yandex_satellite' ? 'yandex_satellite' : 'yandex_map';
  });
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [showOffset, setShowOffset] = useState(false);
  const [markerOffset, setMarkerOffset] = useState({ lat: 0, lng: 0 });
  const addModeRef = useRef(addMode);
  const onMapClickRef = useRef(onMapClick);

  const shiftMarkers = (dlat: number, dlng: number) => {
    setMarkerOffset(o => ({ lat: o.lat + dlat, lng: o.lng + dlng }));
  };

  const metersToCoord = () => {
    const map = mapRef.current;
    if (!map) return { lat: 0, lng: 0 };
    const zoom = map.zoom ?? 15;
    const lat = map.center?.[1] ?? 53.7102;
    const latStep = 1 / (111320);
    const lngStep = 1 / (111320 * Math.cos((lat * Math.PI) / 180));
    const px = Math.pow(2, zoom);
    return { lat: latStep * 256 / px, lng: lngStep * 256 / px };
  };

  useEffect(() => { addModeRef.current = addMode; }, [addMode]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      // Ждём загрузки скрипта Яндекса если он ещё не готов
      if (!window.ymaps3) {
        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (window.ymaps3) { clearInterval(interval); resolve(); }
          }, 50);
        });
      }
      await window.ymaps3.ready;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = window.ymaps3;

      const map = new (YMap as YMaps)(containerRef.current, {
        location: { center: [91.6886, 53.7102], zoom: 12 },
      });

      map.addChild(new (YMapDefaultSchemeLayer as YMaps)({ theme: 'light' }));
      map.addChild(new (YMapDefaultFeaturesLayer as YMaps)());

      const listener = new (YMapListener as YMaps)({
        onClick: (_obj: unknown, event: { coordinates: [number, number] }) => {
          if (addModeRef.current) {
            const [lng, lat] = event.coordinates;
            onMapClickRef.current(lat, lng);
            setAddMode(false);
          }
        },
      });
      map.addChild(listener);

      mapRef.current = map;
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy?.();
        mapRef.current = null;
      }
    };
  }, []);

  // Переключение слоя
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const { YMapDefaultSchemeLayer } = window.ymaps3 || {};
    if (!YMapDefaultSchemeLayer) return;

    localStorage.setItem('mapLayer', activeLayer);

    const children: YMaps[] = [...(map._children || [])];
    children.forEach((child: YMaps) => {
      const name = child?.constructor?.name ?? '';
      if (name === 'YMapDefaultSchemeLayer' || name === 'YMapLayer') {
        try { map.removeChild(child); } catch (_e) { /* ignore */ }
      }
    });

    if (activeLayer === 'yandex_satellite') {
      const { YMapTileDataSource, YMapLayer } = window.ymaps3;
      try {
        const src = new (YMapTileDataSource as YMaps)('satellite', {
          raster: {
            en: { url: 'https://core-sat.maps.yandex.net/tiles?l=sat&x={{x}}&y={{y}}&z={{z}}&lang=ru_RU' },
          },
          zoomRange: { min: 0, max: 19 },
          copyrights: ['© Яндекс'],
        });
        map.addChild(src);
        const layer = new (YMapLayer as YMaps)({ source: 'satellite', type: 'ground' });
        map.addChild(layer);
      } catch (_e) {
        map.addChild(new (YMapDefaultSchemeLayer as YMaps)({ theme: 'light' }));
      }
    } else {
      map.addChild(new (YMapDefaultSchemeLayer as YMaps)({ theme: 'light' }));
    }
  }, [activeLayer]);

  // Маркеры
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const { YMapMarker } = window.ymaps3 || {};
    if (!YMapMarker) return;

    const currentIds = new Set(trees.map(t => t.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        try { map.removeChild(marker); } catch (_e) { /* ignore */ }
        markersRef.current.delete(id);
      }
    });

    trees.forEach(tree => {
      const existing = markersRef.current.get(tree.id);
      if (existing) {
        try { map.removeChild(existing); } catch (_e) { /* ignore */ }
        markersRef.current.delete(tree.id);
      }

      const el = createMarkerElement(tree.status, tree.species);
      el.addEventListener('click', (e) => {
        e.stopPropagation();

        if (balloonRef.current) {
          try { map.removeChild(balloonRef.current); } catch (_e) { /* ignore */ }
          balloonRef.current = null;
        }

        const popupDiv = document.createElement('div');
        const root = createRoot(popupDiv);
        root.render(
          <TreePopup tree={tree} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
        );
        popupDiv.style.cssText = `
          background:white;border-radius:12px;
          box-shadow:0 4px 20px rgba(0,0,0,0.15);
          min-width:240px;max-width:280px;
          position:relative;z-index:1000;
        `;

        const balloon = new (YMapMarker as YMaps)(
          { coordinates: [tree.lng + markerOffset.lng, tree.lat + markerOffset.lat], anchor: { x: 0.5, y: 1.2 } },
          popupDiv
        );

        map.addChild(balloon);
        balloonRef.current = balloon;
      });

      const marker = new (YMapMarker as YMaps)(
        { coordinates: [tree.lng + markerOffset.lng, tree.lat + markerOffset.lat], anchor: { x: 0.5, y: 1 } },
        el
      );
      map.addChild(marker);
      markersRef.current.set(tree.id, marker);
    });
  }, [trees, onEdit, onDelete, onSelect, markerOffset]);

  // Центрирование на выбранном дереве
  useEffect(() => {
    if (!selectedTreeId || !mapRef.current) return;
    const tree = trees.find(t => t.id === selectedTreeId);
    if (tree) {
      mapRef.current.setLocation({ center: [tree.lng, tree.lat], zoom: 17, duration: 500 });
    }
  }, [selectedTreeId, trees]);

  return (
    <div className="relative w-full h-full" onClick={() => {
      if (balloonRef.current && mapRef.current) {
        try { mapRef.current.removeChild(balloonRef.current); } catch (_e) { /* ignore */ }
        balloonRef.current = null;
      }
    }}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ cursor: addMode ? 'crosshair' : 'grab' }}
      />

      {/* Add mode button */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={e => { e.stopPropagation(); setAddMode(m => !m); }}
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
            onClick={e => { e.stopPropagation(); setAddMode(false); }}
            className="bg-white/90 text-gray-500 text-xs px-3 py-1.5 rounded-lg shadow hover:bg-white transition-all"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Layer picker */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-1">
        <button
          onClick={e => { e.stopPropagation(); setShowLayerPicker(v => !v); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showLayerPicker ? 'bg-[var(--forest-mid)] text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          🗺 Подложка
        </button>
        {showLayerPicker && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            {([
              { key: 'yandex_map',       label: 'Яндекс Карта' },
              { key: 'yandex_satellite', label: 'Яндекс Спутник' },
            ] as { key: MapLayer; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={e => { e.stopPropagation(); setActiveLayer(key); setShowLayerPicker(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-all
                  ${activeLayer === key
                    ? 'bg-[var(--forest-mid)] text-white'
                    : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
                  }`}
              >{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Offset panel */}
      <div className="absolute top-16 right-4 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={e => { e.stopPropagation(); setShowOffset(v => !v); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
            ${showOffset ? 'bg-amber-500 text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          ⊹ Сдвиг
          {(markerOffset.lat !== 0 || markerOffset.lng !== 0) && (
            <span className="ml-1 bg-amber-200 text-amber-800 rounded px-1 text-[10px]">●</span>
          )}
        </button>
        {showOffset && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}>
            <div className="text-[10px] text-[var(--stone)] mb-1 font-medium">Сдвиг объектов (1 м/шаг)</div>
            <button onClick={() => { const s = metersToCoord(); shiftMarkers(s.lat, 0); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">↑</button>
            <div className="flex gap-1">
              <button onClick={() => { const s = metersToCoord(); shiftMarkers(0, -s.lng); }}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">←</button>
              <button onClick={() => setMarkerOffset({ lat: 0, lng: 0 })}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 text-sm font-bold">✕</button>
              <button onClick={() => { const s = metersToCoord(); shiftMarkers(0, s.lng); }}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">→</button>
            </div>
            <button onClick={() => { const s = metersToCoord(); shiftMarkers(-s.lat, 0); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] font-bold text-lg">↓</button>
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
          <div key={label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[var(--stone)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}