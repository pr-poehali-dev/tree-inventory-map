import L from 'leaflet';
import { TreeMarker, STATUS_COLORS } from '@/types/tree';

export function getTreeEmoji(species: string, lifeStatus?: string): string {
  if (lifeStatus === 'cut') return '🪵';
  const s = species.toLowerCase();
  if (s.includes('кустарник') || s === 'кустарник') return '🌿';
  if (
    s.includes('хвойное') || s.includes('ель') || s.includes('сосна') ||
    s.includes('лиственниц') || s.includes('пихта') || s.includes('кедр')
  ) return '🌲';
  return '🌳';
}

export function createTreeIcon(
  status: TreeMarker['status'],
  species: string,
  lifeStatus?: string
): L.DivIcon {
  if (lifeStatus === 'cut') {
    return L.divIcon({
      className: '',
      html: `
        <div style="
          width:22px;height:22px;
          background:#e53e3e;
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="2" x2="12" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="12" y1="2" x2="2" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    });
  }
  const color = STATUS_COLORS[status];
  const emoji = getTreeEmoji(species);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:22px;height:22px;
        background:${color};
        border:2px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(26,58,42,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:9px;">${emoji}</span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24],
  });
}

export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
