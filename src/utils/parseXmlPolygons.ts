export interface XmlPolygon {
  id: string;
  label: string;
  coordinates: [number, number][]; // [lng, lat]
  properties: Record<string, string>;
}

function parseCoordString(str: string): [number, number][] {
  return str.trim().split(/\s+/).map(pair => {
    const parts = pair.split(',');
    if (parts.length >= 2) {
      return [parseFloat(parts[0]), parseFloat(parts[1])] as [number, number];
    }
    return null;
  }).filter(Boolean) as [number, number][];
}

function parseSpaceSeparated(str: string): [number, number][] {
  const nums = str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
  const result: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    result.push([nums[i], nums[i + 1]]);
  }
  return result;
}

let idCounter = 0;

// KML
function parseKml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];
  const placemarks = doc.querySelectorAll('Placemark');

  placemarks.forEach(pm => {
    const name = pm.querySelector('name')?.textContent?.trim() ?? `Участок ${++idCounter}`;
    const desc = pm.querySelector('description')?.textContent?.trim() ?? '';
    const coordsEls = pm.querySelectorAll('Polygon outerBoundaryIs LinearRing coordinates, Polygon coordinates');

    coordsEls.forEach(el => {
      const coords = parseCoordString(el.textContent ?? '');
      if (coords.length >= 3) {
        polygons.push({
          id: `xml-${Date.now()}-${++idCounter}`,
          label: name,
          coordinates: coords,
          properties: { description: desc },
        });
      }
    });
  });

  return polygons;
}

// GML / Росреестр XML
function parseGml(doc: Document): XmlPolygon[] {
  const polygons: XmlPolygon[] = [];

  // Ищем любые элементы с координатами полигонов
  const selectors = [
    'posList', 'coordinates', 'pos',
    'gml\\:posList', 'gml\\:coordinates',
  ];

  const processedParents = new Set<Element>();

  selectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => {
      const parent = el.closest(
        'Parcel, parcel, Object, object, SpatialElement, spatialElement, ' +
        'featureMember, Feature, feature, Polygon, polygon, MultiPolygon'
      ) ?? el.parentElement?.parentElement ?? el.parentElement;

      if (!parent || processedParents.has(parent)) return;
      processedParents.add(parent);

      const text = el.textContent ?? '';
      let coords = parseSpaceSeparated(text);

      // Если формат "y x" (Росреестр — lat lng), меняем порядок
      // Определяем по диапазону: lng России ~20-180, lat ~40-80
      if (coords.length > 0) {
        const [first0, first1] = coords[0];
        // Если первое число похоже на широту (40-80), а второе на долготу (20-190)
        if (first0 >= 40 && first0 <= 80 && first1 >= 20 && first1 <= 190) {
          coords = coords.map(([a, b]) => [b, a]); // swap lat/lng → lng/lat
        }
      }

      if (coords.length < 3) return;

      // Определяем метку
      const label =
        parent.querySelector('CadastralNumber, cadastralNumber, cn, CN')?.textContent?.trim() ||
        parent.querySelector('Name, name')?.textContent?.trim() ||
        parent.getAttribute('CadastralNumber') ||
        parent.getAttribute('id') ||
        `Участок ${++idCounter}`;

      // Собираем атрибуты
      const properties: Record<string, string> = {};
      ['Area', 'area', 'CadastralNumber', 'Category', 'category', 'Type', 'type'].forEach(attr => {
        const val = parent.querySelector(attr)?.textContent?.trim() || parent.getAttribute(attr);
        if (val) properties[attr] = val;
      });

      polygons.push({
        id: `xml-${Date.now()}-${++idCounter}`,
        label,
        coordinates: coords,
        properties,
      });
    });
  });

  return polygons;
}

export function parseXmlPolygons(xmlText: string): XmlPolygon[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Ошибка парсинга XML файла');

  const rootTag = doc.documentElement.tagName.toLowerCase();

  if (rootTag.includes('kml')) return parseKml(doc);
  return parseGml(doc);
}
