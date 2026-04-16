import L from 'leaflet';

export const EARTH_RADIUS = 6371000;

export function haversineDistance(a: L.LatLng, b: L.LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.asin(Math.sqrt(sin2));
}

export function calcTotalDistance(pts: L.LatLng[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineDistance(pts[i - 1], pts[i]);
  return d;
}

export function calcArea(pts: L.LatLng[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const lat1 = (pts[i].lat * Math.PI) / 180;
    const lat2 = (pts[j].lat * Math.PI) / 180;
    const dLng = ((pts[j].lng - pts[i].lng) * Math.PI) / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((area * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} км`;
  return `${m.toFixed(1)} м`;
}

export function formatArea(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} га`;
  return `${m2.toFixed(1)} м²`;
}

export function haversineDistanceCoords(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  return haversineDistance(L.latLng(lat1, lng1), L.latLng(lat2, lng2));
}
