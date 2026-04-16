import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  haversineDistance,
  calcTotalDistance,
  calcArea,
  formatDistance,
  formatArea,
} from '@/utils/geodesy';

type MeasureMode = 'distance' | 'area';

interface Props {
  map: L.Map;
  mode: MeasureMode;
  onClose: () => void;
}

function createDotIcon(color = '#2563eb') {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:crosshair;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export default function MeasureTool({ map, mode, onClose }: Props) {
  const pointsRef = useRef<L.LatLng[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const previewLineRef = useRef<L.Polyline | null>(null);
  const labelRef = useRef<L.Popup | null>(null);

  const COLOR = mode === 'distance' ? '#2563eb' : '#16a34a';

  const updateLabel = useCallback((pts: L.LatLng[]) => {
    if (pts.length < 2) {
      labelRef.current?.remove();
      labelRef.current = null;
      return;
    }

    const value = mode === 'distance'
      ? `📏 ${formatDistance(calcTotalDistance(pts))}`
      : pts.length >= 3
        ? `📐 ${formatArea(calcArea(pts))}`
        : null;

    if (!value) return;

    const last = pts[pts.length - 1];
    if (!labelRef.current) {
      labelRef.current = L.popup({
        closeButton: false,
        className: 'measure-popup',
        offset: [0, -8],
        autoPan: false,
      });
    }
    labelRef.current
      .setLatLng(last)
      .setContent(`<div style="font-size:13px;font-weight:600;white-space:nowrap;color:${COLOR}">${value}</div>`)
      .openOn(map);
  }, [map, mode, COLOR]);

  const redraw = useCallback((pts: L.LatLng[]) => {
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }

    if (pts.length >= 2) {
      if (mode === 'distance') {
        polylineRef.current = L.polyline(pts, { color: COLOR, weight: 2.5, dashArray: '6 4' }).addTo(map);
      } else if (pts.length >= 3) {
        polygonRef.current = L.polygon(pts, { color: COLOR, weight: 2.5, fillColor: COLOR, fillOpacity: 0.15 }).addTo(map);
      } else {
        polylineRef.current = L.polyline(pts, { color: COLOR, weight: 2.5, dashArray: '6 4' }).addTo(map);
      }
    }
    updateLabel(pts);
  }, [map, mode, COLOR, updateLabel]);

  const cleanup = useCallback(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    pointsRef.current = [];
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    if (previewLineRef.current) { map.removeLayer(previewLineRef.current); previewLineRef.current = null; }
    if (labelRef.current) { labelRef.current.remove(); labelRef.current = null; }
  }, [map]);

  useEffect(() => {
    const prevCursor = map.getContainer().style.cursor;
    map.getContainer().style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      const pts = pointsRef.current;
      pts.push(e.latlng);

      const marker = L.marker(e.latlng, { icon: createDotIcon(COLOR), zIndexOffset: 1000 }).addTo(map);
      // Двойной клик на последней точке — завершить
      marker.on('dblclick', (ev) => {
        L.DomEvent.stopPropagation(ev);
        redraw([...pointsRef.current]);
      });
      markersRef.current.push(marker);
      redraw([...pts]);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const pts = pointsRef.current;
      if (pts.length === 0) return;
      if (previewLineRef.current) map.removeLayer(previewLineRef.current);
      previewLineRef.current = L.polyline([pts[pts.length - 1], e.latlng], {
        color: COLOR, weight: 1.5, dashArray: '4 4', opacity: 0.6,
      }).addTo(map);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (previewLineRef.current) { map.removeLayer(previewLineRef.current); previewLineRef.current = null; }
      redraw([...pointsRef.current]);
    };

    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    map.on('dblclick', onDblClick);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
      map.off('dblclick', onDblClick);
      map.getContainer().style.cursor = prevCursor;
      cleanup();
    };
  }, [map, mode, COLOR, redraw, cleanup]);

  const handleReset = () => {
    cleanup();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="absolute bottom-8 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[var(--forest-dark)]">
          {mode === 'distance' ? '📏 Расстояние' : '📐 Площадь'}
        </span>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-base leading-none">✕</button>
      </div>
      <div className="text-gray-500 mb-3 leading-snug">
        Кликайте на карту, чтобы добавить точки.<br />
        Двойной клик — завершить измерение.
      </div>
      <button
        onClick={handleReset}
        className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
      >
        Сбросить
      </button>
    </div>
  );
}