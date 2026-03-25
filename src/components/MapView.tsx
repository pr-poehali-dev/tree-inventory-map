import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';
import TreePopup from './TreePopup';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
}

function createTreeIcon(status: TreeMarker['status']) {
  const color = STATUS_COLORS[status];
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
        <span style="transform:rotate(45deg);font-size:11px;">🌲</span>
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
  const [addMode, setAddMode] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [55.7522, 37.6156],
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
    if (addMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('click', handleClick);
    };
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
        existing.setIcon(createTreeIcon(tree.status));
      } else {
        const marker = L.marker([tree.lat, tree.lng], { icon: createTreeIcon(tree.status) });

        const popupDiv = document.createElement('div');
        const root = createRoot(popupDiv);
        root.render(
          <TreePopup
            tree={tree}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelect}
          />
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

      {/* Add mode toggle */}
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
      </div>
    </div>
  );
}
