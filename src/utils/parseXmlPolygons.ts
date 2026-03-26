export interface XmlPolygon {
  id: string;
  label: string;
  coordinates: [number, number][]; // [lng, lat]
  properties: Record<string, string>;
}

let idCounter = 0;

function nextId() {
  return `xml-${Date.now()}-${++idCounter}`;
}

// Получить все элементы по локальному имени тега (игнорируя namespace)
function byTag(node: Document | Element, localName: string): Element[] {
  const result: Element[] = [];
  const all = node.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName.toLowerCase() === localName.toLowerCase()) {
      result.push(all[i]);
    }
  }
  return result;
}

function firstByTag(node: Document | Element, ...names: string[]): Element | null {
  for (const name of names) {
    const els = byTag(node, name);
    if (els.length > 0) return els[0];
  }
  return null;
}

function textOf(node: Document | Element, ...names: string[]): string {
  const el = firstByTag(node, ...names);
  return el?.textContent?.trim() ?? '';
}

// Парсим строку координат в пары [lng, lat]
function parsePairs(str: string): [number, number][] {
  const nums = str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && isFinite(n));
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push([nums[i], nums[i + 1]]);
  }
  return pairs;
}

// Определяем порядок координат — Росреестр даёт lat/lng, нам нужен lng/lat
function fixOrder(pairs: [number, number][]): [number, number][] {
  if (pairs.length === 0) return pairs;
  const [a, b] = pairs[0];
  // Россия: lat 40-80, lng 20-190
  // Если первое число — широта (40-80), второе — долгота (20-190) → swap
  if (a >= 40 && a <= 80 && b >= 20 && b <= 190) {
    return pairs.map(([x, y]) => [y, x]);
  }
  return pairs;
}

// KML
function parseKml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];
  const placemarks = byTag(doc, 'Placemark');

  placemarks.forEach(pm => {
    const name = textOf(pm, 'name') || `Участок ${++idCounter}`;
    const desc = textOf(pm, 'description');
    const coordEls = byTag(pm, 'coordinates');

    coordEls.forEach(el => {
      const text = el.textContent ?? '';
      // KML формат: lng,lat,alt или lng,lat
      const pairs: [number, number][] = text.trim().split(/\s+/).map(token => {
        const parts = token.split(',').map(Number);
        return parts.length >= 2 ? [parts[0], parts[1]] as [number, number] : null;
      }).filter(Boolean) as [number, number][];

      if (pairs.length >= 3) {
        polygons.push({ id: nextId(), label: name, coordinates: pairs, properties: { description: desc } });
      }
    });
  });

  return polygons;
}

// GML / Росреестр XML
function parseGml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];

  // Теги с координатами
  const coordTags = ['posList', 'pos', 'coordinates', 'Ordinate'];
  const coordElements: Element[] = [];
  coordTags.forEach(tag => coordElements.push(...byTag(doc, tag)));

  const processed = new Set<string>();

  coordElements.forEach(el => {
    const text = el.textContent ?? '';
    let pairs = parsePairs(text);
    if (pairs.length < 3) return;
    pairs = fixOrder(pairs);

    // Поднимаемся вверх чтобы найти родительский объект
    let parent: Element | null = el;
    const objectTags = ['parcel', 'object', 'spatialElement', 'entityspatial',
      'boundary', 'contour', 'plot', 'featuremember', 'feature',
      'polygon', 'multipolygon', 'geometry'];

    for (let i = 0; i < 8; i++) {
      parent = parent?.parentElement ?? null;
      if (!parent) break;
      if (objectTags.includes(parent.localName.toLowerCase())) break;
    }

    const key = parent ? (parent.getAttribute('id') || parent.outerHTML.slice(0, 80)) : text.slice(0, 40);
    if (processed.has(key)) return;
    processed.add(key);

    // Кадастровый номер
    const label =
      textOf(parent ?? doc, 'CadastralNumber', 'cadastralnumber', 'NumberKvartal',
        'NumberRecord', 'Name', 'name', 'CN') ||
      parent?.getAttribute('CadastralNumber') ||
      parent?.getAttribute('id') ||
      `Участок ${++idCounter}`;

    const properties: Record<string, string> = {};
    ['Area', 'area', 'Category', 'category', 'TypeDoc', 'Status', 'status'].forEach(tag => {
      const val = textOf(parent ?? doc, tag);
      if (val) properties[tag] = val;
    });

    polygons.push({ id: nextId(), label, coordinates: pairs, properties });
  });

  return polygons;
}

export function parseXmlPolygons(xmlText: string): XmlPolygon[] {
  idCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Ошибка парсинга XML: ' + parseError.textContent?.slice(0, 200));
  }

  const rootTag = doc.documentElement.localName.toLowerCase();
  console.log('[XML import] root tag:', rootTag, '| total elements:', doc.getElementsByTagName('*').length);

  let result: XmlPolygon[];
  if (rootTag === 'kml') {
    result = parseKml(doc);
  } else {
    result = parseGml(doc);
  }

  console.log('[XML import] parsed polygons:', result.length, result.map(p => p.label));
  return result;
}
