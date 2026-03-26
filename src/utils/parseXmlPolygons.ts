export interface XmlPolygon {
  id: string;
  label: string;
  coordinates: [number, number][]; // [lng, lat]
  properties: Record<string, string>;
}

let idCounter = 0;
function nextId() { return `xml-${Date.now()}-${++idCounter}`; }

function byTag(node: Document | Element, localName: string): Element[] {
  const result: Element[] = [];
  const all = node.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName.toLowerCase() === localName.toLowerCase()) result.push(all[i]);
  }
  return result;
}

function textOf(node: Document | Element, ...names: string[]): string {
  for (const name of names) {
    const els = byTag(node, name);
    if (els.length > 0 && els[0].textContent?.trim()) return els[0].textContent.trim();
  }
  return '';
}

function parsePairs(str: string): [number, number][] {
  const nums = str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && isFinite(n));
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  return pairs;
}

// Росреестр даёт lat/lng, Leaflet хочет lng/lat
function fixOrder(pairs: [number, number][]): [number, number][] {
  if (pairs.length === 0) return pairs;
  const [a, b] = pairs[0];
  if (a >= 40 && a <= 80 && b >= 20 && b <= 190) return pairs.map(([x, y]) => [y, x]);
  return pairs;
}

// Выписка ЕГРН: <Ordinate x="..." y="...">
function parseEgrn(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];
  const cadNumber = textOf(doc, 'cad_number', 'CadastralNumber');
  const area = textOf(doc, 'area_value', 'Area', 'area');
  const category = textOf(doc, 'category', 'Category');

  const ordinates = byTag(doc, 'Ordinate');
  if (ordinates.length >= 3) {
    // Группируем по родителю
    const groups = new Map<Element, Element[]>();
    ordinates.forEach(ord => {
      const parent = ord.parentElement ?? doc.documentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent)!.push(ord);
    });

    groups.forEach((ords, parent) => {
      if (ords.length < 3) return;
      const pairs: [number, number][] = ords.map(o => {
        const x = parseFloat(o.getAttribute('x') ?? o.getAttribute('X') ?? '0');
        const y = parseFloat(o.getAttribute('y') ?? o.getAttribute('Y') ?? '0');
        return [x, y] as [number, number];
      });
      const fixed = fixOrder(pairs);
      const groupLabel = parent.getAttribute('Num') || parent.getAttribute('num') || '';
      const label = cadNumber
        ? (groupLabel ? `${cadNumber} (контур ${groupLabel})` : cadNumber)
        : `Участок ${++idCounter}`;

      polygons.push({
        id: nextId(), label, coordinates: fixed,
        properties: {
          ...(cadNumber ? { 'Кад. номер': cadNumber } : {}),
          ...(area ? { 'Площадь': area + ' м²' } : {}),
          ...(category ? { 'Категория': category } : {}),
        },
      });
    });
    if (polygons.length > 0) return polygons;
  }

  // Запасной вариант — текстовые координаты
  ['posList', 'coordinates', 'pos'].forEach(tag => {
    byTag(doc, tag).forEach(el => {
      const pairs = fixOrder(parsePairs(el.textContent ?? ''));
      if (pairs.length >= 3) {
        polygons.push({
          id: nextId(),
          label: cadNumber || `Участок ${++idCounter}`,
          coordinates: pairs,
          properties: { ...(area ? { 'Площадь': area + ' м²' } : {}) },
        });
      }
    });
  });

  return polygons;
}

// KML
function parseKml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];
  byTag(doc, 'Placemark').forEach(pm => {
    const name = textOf(pm, 'name') || `Объект ${++idCounter}`;
    byTag(pm, 'coordinates').forEach(el => {
      const pairs: [number, number][] = (el.textContent ?? '').trim().split(/\s+/).map(token => {
        const parts = token.split(',').map(Number);
        return parts.length >= 2 ? [parts[0], parts[1]] as [number, number] : null;
      }).filter(Boolean) as [number, number][];
      if (pairs.length >= 3) polygons.push({ id: nextId(), label: name, coordinates: pairs, properties: {} });
    });
  });
  return polygons;
}

// GML общий
function parseGml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];
  const processed = new Set<string>();
  ['posList', 'coordinates', 'pos'].forEach(tag => {
    byTag(doc, tag).forEach(el => {
      const key = el.textContent?.slice(0, 60) ?? '';
      if (processed.has(key)) return;
      processed.add(key);
      const pairs = fixOrder(parsePairs(el.textContent ?? ''));
      if (pairs.length < 3) return;
      let parent: Element | null = el;
      for (let i = 0; i < 6; i++) {
        parent = parent?.parentElement ?? null;
        if (!parent) break;
        const ln = parent.localName.toLowerCase();
        if (['parcel','object','feature','featuremember','polygon','boundary'].includes(ln)) break;
      }
      const label = textOf(parent ?? doc, 'CadastralNumber', 'Name', 'name') ||
        parent?.getAttribute('id') || `Участок ${++idCounter}`;
      polygons.push({ id: nextId(), label, coordinates: pairs, properties: {} });
    });
  });
  return polygons;
}

export function parseXmlPolygons(xmlText: string): XmlPolygon[] {
  idCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Ошибка парсинга XML');

  const root = doc.documentElement.localName.toLowerCase();
  console.log('[XML] root:', root, '| Ordinate count:', byTag(doc, 'Ordinate').length);

  if (root === 'kml') return parseKml(doc);

  // Выписка ЕГРН Росреестра
  if (root.includes('extract') || root.includes('land_record') ||
      byTag(doc, 'Ordinate').length > 0 || byTag(doc, 'cad_number').length > 0) {
    const result = parseEgrn(doc);
    console.log('[XML] EGRN parsed:', result.length, 'polygons');
    return result;
  }

  return parseGml(doc);
}
