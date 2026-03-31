import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { createRoot } from 'react-dom/client';
import { TreeMarker, STATUS_COLORS, HedgeRow, HEDGE_COLOR, STATUS_LABELS, CONDITION_LABELS } from '@/types/tree';
import TreePopup from './TreePopup';
import MeasureTool from './MeasureTool';


type MapLayer = 'scheme' | 'satellite' | 'hybrid';

interface Props {
  trees: TreeMarker[];
  onMapClick: (lat: number, lng: number) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedTreeId: string | null;
  isGuest?: boolean;
  hedges?: HedgeRow[];
  onHedgeDrawn?: (points: [number, number][], lengthM: number) => void;
  onHedgeEdit?: (hedge: HedgeRow) => void;
  onHedgeDelete?: (id: string) => void;
  selectedHedgeId?: string | null;
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

function getTreeEmoji(species: string, lifeStatus?: string): string {
  if (lifeStatus === 'cut') return '🪵';
  const s = species.toLowerCase();
  if (s.includes('кустарник') || s === 'кустарник') return '🌿';
  if (s.includes('хвойное') || s.includes('ель') || s.includes('сосна') || s.includes('лиственниц') || s.includes('пихта') || s.includes('кедр')) return '🌲';
  return '🌳';
}

function createTreeIcon(status: TreeMarker['status'], species: string, lifeStatus?: string) {
  if (lifeStatus === 'cut') {
    return L.divIcon({
      className: '',
      html: `
        <div style="
          width:28px;height:28px;
          background:#e53e3e;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 3px 10px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="2" x2="12" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="12" y1="2" x2="2" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -18],
    });
  }
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

export default function MapView({ trees, onMapClick, onEdit, onDelete, onSelect, selectedTreeId, isGuest = false, hedges = [], onHedgeDrawn, onHedgeEdit, onHedgeDelete, selectedHedgeId }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const geoMarkerRef = useRef<L.Marker | null>(null);
  const geoCircleRef = useRef<L.Circle | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const hedgeLayersRef = useRef<Map<string, L.Polyline>>(new Map());
  const hedgeDrawPointsRef = useRef<[number, number][]>([]);
  const hedgeDrawLineRef = useRef<L.Polyline | null>(null);
  const hedgeDrawMarkersRef = useRef<L.CircleMarker[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [hedgeDrawMode, setHedgeDrawMode] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('scheme');
  const [showOffset, setShowOffset] = useState(false);
  const [tileOffset, setTileOffset] = useState({ x: 0, y: 0 });
  const [measureMode, setMeasureMode] = useState<'distance' | 'area' | null>(null);
  const [geoActive, setGeoActive] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoFollow, setGeoFollow] = useState(false);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [layerOpen, setLayerOpen] = useState(false);


  const geoIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;
      background:#2563eb;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(37,99,235,0.25);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  const startGeo = () => {
    if (!navigator.geolocation) { setGeoError('Геолокация не поддерживается браузером'); return; }
    setGeoError('');
    setGeoActive(true);
    setGeoFollow(true);

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const map = mapRef.current;
        if (!map) return;
        setGeoPos({ lat, lng });

        if (!geoMarkerRef.current) {
          geoMarkerRef.current = L.marker([lat, lng], { icon: geoIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          geoMarkerRef.current.setLatLng([lat, lng]);
        }

        if (!geoCircleRef.current) {
          geoCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map);
        } else {
          geoCircleRef.current.setLatLng([lat, lng]);
          geoCircleRef.current.setRadius(accuracy);
        }

        if (geoFollow) {
          map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
        }
      },
      (err) => {
        if (err.code === 1) setGeoError('Доступ к геолокации запрещён');
        else if (err.code === 2) setGeoError('Геолокация недоступна');
        else setGeoError('Ошибка геолокации');
        stopGeo();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopGeo = () => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
    if (geoMarkerRef.current) { geoMarkerRef.current.remove(); geoMarkerRef.current = null; }
    if (geoCircleRef.current) { geoCircleRef.current.remove(); geoCircleRef.current = null; }
    setGeoActive(false);
    setGeoFollow(false);
    setGeoPos(null);
  };

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
      zoom: 15,
      zoomControl: false,
    });

    const tile = getTileLayer('scheme');
    tile.addTo(map);
    tileLayerRef.current = tile;

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,
      disableClusteringAtZoom: 18,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 36;
        let bg = '#2d6a4f';
        if (count >= 50) { size = 52; bg = '#1a3a2a'; }
        else if (count >= 20) { size = 44; bg = '#40916c'; }
        else if (count >= 10) { size = 40; bg = '#52b788'; }
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${bg};
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 3px 12px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${size > 40 ? 14 : 12}px;
            font-family:sans-serif;
          ">${count}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

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

    if (activeLayer === 'hybrid') {
      const labels = getLabelsLayer();
      labels.addTo(map);
      labelsLayerRef.current = labels;
    }
  }, [activeLayer, tileOffset]);



  const calcLength = (pts: [number, number][]) => {
    let dist = 0;
    for (let i = 1; i < pts.length; i++) {
      const R = 6371000;
      const lat1 = pts[i-1][0] * Math.PI / 180;
      const lat2 = pts[i][0] * Math.PI / 180;
      const dlat = (pts[i][0] - pts[i-1][0]) * Math.PI / 180;
      const dlng = (pts[i][1] - pts[i-1][1]) * Math.PI / 180;
      const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
      dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    return dist;
  };

  const finishHedgeDraw = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts = hedgeDrawPointsRef.current;
    if (pts.length >= 2 && onHedgeDrawn) {
      onHedgeDrawn(pts, calcLength(pts));
    }
    hedgeDrawPointsRef.current = [];
    if (hedgeDrawLineRef.current) { hedgeDrawLineRef.current.remove(); hedgeDrawLineRef.current = null; }
    hedgeDrawMarkersRef.current.forEach(m => m.remove());
    hedgeDrawMarkersRef.current = [];
    setHedgeDrawMode(false);
  };

  const cancelHedgeDraw = () => {
    const map = mapRef.current;
    if (!map) return;
    hedgeDrawPointsRef.current = [];
    if (hedgeDrawLineRef.current) { hedgeDrawLineRef.current.remove(); hedgeDrawLineRef.current = null; }
    hedgeDrawMarkersRef.current.forEach(m => m.remove());
    hedgeDrawMarkersRef.current = [];
    setHedgeDrawMode(false);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (addMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
        setAddMode(false);
        return;
      }
      if (hedgeDrawMode) {
        const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
        hedgeDrawPointsRef.current = [...hedgeDrawPointsRef.current, pt];
        const pts = hedgeDrawPointsRef.current;
        if (hedgeDrawLineRef.current) {
          hedgeDrawLineRef.current.setLatLngs(pts);
        } else {
          hedgeDrawLineRef.current = L.polyline(pts, { color: HEDGE_COLOR, weight: 4, opacity: 0.9, dashArray: '8,4' }).addTo(map);
        }
        const dot = L.circleMarker(pt, { radius: 5, color: HEDGE_COLOR, fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(map);
        hedgeDrawMarkersRef.current = [...hedgeDrawMarkersRef.current, dot];
      }
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      if (hedgeDrawMode) {
        L.DomEvent.stopPropagation(e);
        finishHedgeDraw();
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    if (hedgeDrawMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = addMode ? 'crosshair' : '';
    }

    return () => { map.off('click', handleClick); map.off('dblclick', handleDblClick); };
  }, [addMode, onMapClick, hedgeDrawMode]);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    const currentIds = new Set(trees.map(t => t.id));
    const existingIds = new Set(markersRef.current.keys());

    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        const m = markersRef.current.get(id);
        if (m) clusterGroup.removeLayer(m);
        markersRef.current.delete(id);
      }
    });

    trees.forEach(tree => {
      const existing = markersRef.current.get(tree.id);
      if (existing) {
        existing.setLatLng([tree.lat, tree.lng]);
        existing.setIcon(createTreeIcon(tree.status, tree.species, tree.lifeStatus));
      } else {
        const marker = L.marker([tree.lat, tree.lng], { icon: createTreeIcon(tree.status, tree.species, tree.lifeStatus) });
        const popupDiv = document.createElement('div');
        const root = createRoot(popupDiv);
        root.render(
          <TreePopup tree={tree} onEdit={onEdit} onDelete={onDelete} onSelect={onSelect} />
        );
        marker.bindPopup(L.popup({ maxWidth: 280, minWidth: 240 }).setContent(popupDiv));
        clusterGroup.addLayer(marker);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(hedges.map(h => h.id));
    hedgeLayersRef.current.forEach((line, id) => {
      if (!currentIds.has(id)) { line.remove(); hedgeLayersRef.current.delete(id); }
    });

    hedges.forEach(hedge => {
      const isSelected = hedge.id === selectedHedgeId;
      const existing = hedgeLayersRef.current.get(hedge.id);
      const color = isSelected ? '#0ea5e9' : HEDGE_COLOR;
      const weight = isSelected ? 6 : 4;

      const popupHtml = `
        <div style="min-width:200px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:14px;color:#1a3a2a;margin-bottom:6px;">🌿 №${hedge.number} — ${hedge.name}</div>
          <div style="font-size:12px;color:#555;margin-bottom:4px;">Вид: ${hedge.species}</div>
          <div style="font-size:12px;color:#555;margin-bottom:4px;">Состояние: ${STATUS_LABELS[hedge.status]}</div>
          <div style="font-size:12px;color:#555;margin-bottom:4px;">Жизнеспособность: ${CONDITION_LABELS[hedge.condition]}</div>
          ${hedge.lengthM ? `<div style="font-size:12px;color:#555;margin-bottom:4px;">Длина: ${hedge.lengthM.toFixed(1)} м</div>` : ''}
          ${hedge.description ? `<div style="font-size:12px;color:#777;margin-bottom:8px;">${hedge.description}</div>` : ''}
          ${!isGuest ? `
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button onclick="window.__hedgeEdit('${hedge.id}')" style="flex:1;padding:5px 8px;background:#2d6a4f;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">Изменить</button>
            <button onclick="window.__hedgeDel('${hedge.id}')" style="padding:5px 8px;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">Удалить</button>
          </div>` : ''}
        </div>`;

      if (existing) {
        existing.setLatLngs(hedge.points);
        existing.setStyle({ color, weight });
        existing.bindPopup(popupHtml);
      } else {
        const line = L.polyline(hedge.points, { color, weight, opacity: 0.9 }).addTo(map);
        line.bindPopup(popupHtml);
        hedgeLayersRef.current.set(hedge.id, line);
      }
    });
  }, [hedges, selectedHedgeId, isGuest]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__hedgeEdit = (id: string) => { const h = hedges.find(x => x.id === id); if (h && onHedgeEdit) onHedgeEdit(h); };
    (window as unknown as Record<string, unknown>).__hedgeDel = (id: string) => { if (onHedgeDelete) onHedgeDelete(id); };
  }, [hedges, onHedgeEdit, onHedgeDelete]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Left controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2" style={{ maxWidth: 210 }}>
        {!isGuest && (
          <>
            <button
              onClick={() => { setAddMode(m => !m); if (hedgeDrawMode) cancelHedgeDraw(); }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
                ${addMode
                  ? 'bg-[var(--forest-dark)] text-white ring-2 ring-[var(--forest-light)]'
                  : 'bg-white text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
                }
              `}
            >
              <span>{addMode ? '🖱' : '➕'}</span>
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
            {onHedgeDrawn && (
              <>
                <button
                  onClick={() => { setHedgeDrawMode(m => !m); if (addMode) setAddMode(false); if (hedgeDrawMode) cancelHedgeDraw(); }}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
                    ${hedgeDrawMode
                      ? 'bg-green-700 text-white ring-2 ring-green-300'
                      : 'bg-white text-green-700 hover:bg-green-50'
                    }
                  `}
                >
                  <span>🌿</span>
                  {hedgeDrawMode ? 'Ставьте точки...' : 'Живая изгородь'}
                </button>
                {hedgeDrawMode && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 shadow">
                    Кликайте точки линии.<br />Двойной клик — завершить.
                    <button onClick={cancelHedgeDraw} className="block mt-1.5 text-red-500 hover:text-red-700 font-semibold">✕ Отмена</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Геолокация */}
        <button
          onClick={geoActive ? stopGeo : startGeo}
          title={geoActive ? 'Выключить геолокацию' : 'Моё местоположение'}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
            ${geoActive
              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
        >
          <span>📍</span>
          {geoActive ? 'Слежение вкл.' : 'Моя геопозиция'}
        </button>
        {geoActive && (
          <button
            onClick={() => setGeoFollow(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all
              ${geoFollow ? 'bg-blue-100 text-blue-700' : 'bg-white/90 text-[var(--stone)]'}`}
          >
            🔒 {geoFollow ? 'Следить: вкл.' : 'Следить: выкл.'}
          </button>
        )}
        {geoActive && geoPos && !isGuest && (
          <button
            onClick={() => { onMapClick(geoPos.lat, geoPos.lng); }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all bg-[var(--forest-mid)] text-white hover:bg-[var(--forest-dark)]"
          >
            🌳 Добавить дерево здесь
          </button>
        )}
        {geoError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl shadow">
            {geoError}
          </div>
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

      {/* Layer switcher */}
      <div className="absolute top-16 right-4 z-[1000] flex flex-col items-end gap-1">
        <button
          onClick={() => setLayerOpen(v => !v)}
          title="Слои карты"
          className={`w-11 h-11 flex items-center justify-center rounded-xl shadow-lg text-lg transition-all active:scale-95
            ${layerOpen ? 'bg-[var(--forest-mid)] text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
        >
          🗂
        </button>
        {layerOpen && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex flex-col">
            {(Object.entries(LAYERS) as [MapLayer, { label: string; icon: string }][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => { setActiveLayer(key); setLayerOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all
                  ${activeLayer === key
                    ? 'bg-[var(--forest-mid)] text-white'
                    : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
                  }`}
              >
                <span>{val.icon}</span>
                <span>{val.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 z-[1000] flex flex-col gap-1 shadow-lg rounded-xl overflow-hidden"
        style={{ bottom: measureMode ? '8px' : '108px' }}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-11 h-11 flex items-center justify-center bg-white/95 hover:bg-[var(--forest-pale)] text-[var(--forest-dark)] text-xl font-bold transition-all active:scale-95 select-none"
          aria-label="Приблизить"
        >+</button>
        <div className="h-px bg-gray-200" />
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-11 h-11 flex items-center justify-center bg-white/95 hover:bg-[var(--forest-pale)] text-[var(--forest-dark)] text-xl font-bold transition-all active:scale-95 select-none"
          aria-label="Отдалить"
        >−</button>
      </div>

      {/* Measure tools */}
      {!measureMode && (
        <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={() => setMeasureMode('distance')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)] transition-all"
          >
            📏 Расстояние
          </button>
          <button
            onClick={() => setMeasureMode('area')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)] transition-all"
          >
            📐 Площадь
          </button>
        </div>
      )}

      {measureMode && mapRef.current && (
        <MeasureTool
          map={mapRef.current}
          mode={measureMode}
          onClose={() => setMeasureMode(null)}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-[1000] flex flex-col items-start gap-1">
        <button
          onClick={() => setLegendOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg bg-white/95 backdrop-blur-sm text-[var(--forest-dark)] hover:bg-[var(--forest-pale)] transition-all"
        >
          <span>🗺</span> Условные знаки {legendOpen ? '▲' : '▼'}
        </button>
        {legendOpen && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg text-xs">
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
              { emoji: '🔴', label: 'Спиленное' },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <span className="text-sm">{emoji}</span>
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="font-semibold text-[var(--forest-dark)] mt-2 mb-1 font-heading">Линейные объекты</div>
            <div className="flex items-center gap-2 py-0.5">
              <div className="w-8 h-1.5 rounded-full shrink-0" style={{ background: HEDGE_COLOR }} />
              <span className="text-gray-600">Живая изгородь</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}