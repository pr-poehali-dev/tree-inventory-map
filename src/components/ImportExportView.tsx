import { useRef, useState } from 'react';
import proj4 from 'proj4';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { TreeMarker } from '@/types/tree';

// ──────────────────────────────────────────────────────────────────────────────
// МСК-167 → WGS84   (точное преобразование через proj4)
//
// МСК-167 — местная система координат для г. Минусинска (Красноярский край).
// Параметры проекции (Гаусс–Крюгер / Transverse Mercator):
//   Эллипсоид: Красовского (a=6378245, rf=298.3)
//   Датум:     Пулково 1942 (7-параметрное смещение к WGS84)
//   Ось X:     центральный меридиан 93° в.д.
//   Ложный сдвиг по X (FE):  106 797.80 м
//   Ложный сдвиг по Y (FN): −5 578 022.50 м
//   Масштаб:   1.0
//
// Параметры towgs84 для Пулково–1942 (Красноярский край):
//   +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12
// ──────────────────────────────────────────────────────────────────────────────

const MSK167_PROJ =
  '+proj=tmerc' +
  ' +lat_0=0' +
  ' +lon_0=93' +
  ' +k=1' +
  ' +x_0=106797.80' +
  ' +y_0=-5578022.50' +
  ' +ellps=krass' +
  ' +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12' +
  ' +units=m' +
  ' +no_defs';

const WGS84_PROJ = '+proj=longlat +datum=WGS84 +no_defs';

/**
 * Переводит координаты из МСК-167 в WGS84.
 * @param x  — координата X в МСК-167 (ось «север», в метрах)
 * @param y  — координата Y в МСК-167 (ось «восток», в метрах)
 * @returns  [lat, lng] в градусах WGS84
 */
function msk167toWGS84(x: number, y: number): [number, number] {
  try {
    // В МСК-167 X — это «северная» ось (аналог N в Гаусс-Крюгере),
    // Y — «восточная» ось. proj4 ожидает [easting, northing] → [lon, lat]
    const [lon, lat] = proj4(MSK167_PROJ, WGS84_PROJ, [y, x]);
    return [lat, lon];
  } catch (err) {
    console.error('Ошибка преобразования координат МСК-167 → WGS84:', err);
    return [x, y]; // fallback: вернём как есть
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Таблица кодов объектов (поле 4 в TXT-файле)
// ──────────────────────────────────────────────────────────────────────────────
const TREE_CODE_MAP: Record<string, { name: string; species: string; condition: TreeMarker['condition'] }> = {
  '542': { name: 'Дерево лиственное', species: 'Лиственное',  condition: 'healthy' },
  '543': { name: 'Дерево хвойное',    species: 'Хвойное',     condition: 'healthy' },
  '560': { name: 'Кустарник',         species: 'Кустарник',   condition: 'healthy' },
};

// ──────────────────────────────────────────────────────────────────────────────

interface Props {
  trees: TreeMarker[];
  onImport: (trees: TreeMarker[]) => void;
}

export default function ImportExportView({ trees, onImport }: Props) {
  const kmlRef  = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const txtRef  = useRef<HTMLInputElement>(null);
  const [txtPreview, setTxtPreview] = useState<{
    ok: number; skip: number; rows: string[];
    sample?: { name: string; lat: number; lng: number }[];
  } | null>(null);

  // ── Экспорт ─────────────────────────────────────────────────────────────────

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(trees, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `dendro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['ID','Название','Порода','Диаметр (см)','Высота (м)','Количество','Возраст','Состояние','Широта','Долгота','Дата'];
    const rows    = trees.map(t => [
      t.id, t.name, t.species, t.diameter, t.height, t.count,
      t.age ?? '', t.status, t.lat.toFixed(6), t.lng.toFixed(6), t.createdAt,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `dendro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportKML = () => {
    const placemarks = trees.map(t => `
    <Placemark>
      <name>${t.name}</name>
      <description><![CDATA[
        Порода: ${t.species}<br/>
        Диаметр: ${t.diameter} см<br/>
        Высота: ${t.height} м<br/>
        Количество: ${t.count} шт<br/>
        Состояние: ${t.status}<br/>
        ${t.description ? `Примечание: ${t.description}` : ''}
      ]]></description>
      <Point><coordinates>${t.lng},${t.lat},0</coordinates></Point>
    </Placemark>`).join('');

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Дендрологическая ведомость города Минусинска и Минусинского района</name>
    <description>Экспорт от ${new Date().toLocaleDateString('ru-RU')}</description>
    ${placemarks}
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `dendro_${new Date().toISOString().split('T')[0]}.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Импорт JSON ─────────────────────────────────────────────────────────────

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as TreeMarker[];
        if (Array.isArray(data)) {
          onImport(data.map(t => ({ ...t, id: `imp_${Date.now()}_${Math.random()}` })));
        }
      } catch (err) { console.error('Import failed', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Импорт TXT (МСК-167) ────────────────────────────────────────────────────

  const handleImportTXT = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Пробуем UTF-8; если попадётся cp1251 — пересчитаем позже
    const reader = new FileReader();
    reader.onload = ev => {
      const text    = ev.target?.result as string;
      const lines   = text.split(/\r?\n/).filter(l => l.trim());
      const imported: TreeMarker[] = [];
      const skipped: string[]      = [];

      lines.forEach((line, i) => {
        // Разделители: точка с запятой, табуляция, запятая
        const parts = line.split(/[;,\t]+/).map(p => p.trim());

        if (parts.length < 4) {
          skipped.push(`Строка ${i + 1}: недостаточно полей («${line.slice(0, 50)}»)`);
          return;
        }

        const [rawName, rawX, rawY, rawCode] = parts;

        // Заменяем запятую на точку для десятичного разделителя
        const xVal = parseFloat(rawX.replace(',', '.'));
        const yVal = parseFloat(rawY.replace(',', '.'));
        const code = rawCode?.trim();

        if (isNaN(xVal) || isNaN(yVal)) {
          skipped.push(`Строка ${i + 1}: некорректные координаты («${line.slice(0, 50)}»)`);
          return;
        }

        // ── КЛЮЧЕВОЕ: преобразование МСК-167 → WGS84 ──
        const [lat, lng] = msk167toWGS84(xVal, yVal);

        // Санity-check: результат должен попадать в район Минусинска
        // (примерно 53°–54° с.ш., 91°–93° в.д.)
        const inMinusinsk = lat > 52 && lat < 55 && lng > 89 && lng < 95;
        if (!inMinusinsk) {
          skipped.push(
            `Строка ${i + 1}: координаты после перевода (${lat.toFixed(4)}, ${lng.toFixed(4)}) ` +
            `вне района Минусинска — проверьте порядок осей X/Y в файле`
          );
          return;
        }

        const treeInfo = TREE_CODE_MAP[code] ?? {
          name:      rawName || `Объект ${i + 1}`,
          species:   'Не определено',
          condition: 'healthy' as TreeMarker['condition'],
        };

        imported.push({
          id:          `txt_${Date.now()}_${i}`,
          lat,
          lng,
          name:        rawName || treeInfo.name,
          species:     treeInfo.species,
          diameter:    20,
          height:      10,
          count:       1,
          status:      'good',
          condition:   treeInfo.condition,
          description: code ? `Код объекта: ${code}` : undefined,
          createdAt:   new Date().toISOString().split('T')[0],
          updatedAt:   new Date().toISOString().split('T')[0],
        });
      });

      // Показываем первые 3 объекта как превью
      const sample = imported.slice(0, 3).map(t => ({
        name: t.name,
        lat:  t.lat,
        lng:  t.lng,
      }));

      setTxtPreview({ ok: imported.length, skip: skipped.length, rows: skipped, sample });
      if (imported.length > 0) onImport(imported);
    };

    // Сначала пробуем UTF-8; большинство современных файлов в нём
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // ── Импорт KML ──────────────────────────────────────────────────────────────

  const handleImportKML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text      = ev.target?.result as string;
      const parser    = new DOMParser();
      const doc       = parser.parseFromString(text, 'application/xml');
      const placemarks = Array.from(doc.querySelectorAll('Placemark'));

      const imported: TreeMarker[] = placemarks.map((pm, i) => {
        const name   = pm.querySelector('name')?.textContent ?? `Дерево ${i + 1}`;
        const coords = pm.querySelector('coordinates')?.textContent?.trim().split(',') ?? ['0', '0'];
        return {
          id:        `kml_${Date.now()}_${i}`,
          lat:       parseFloat(coords[1] ?? '0'),
          lng:       parseFloat(coords[0] ?? '0'),
          name,
          species:   'Берёза повислая',
          diameter:  20,
          height:    10,
          count:     1,
          status:    'good',
          condition: 'healthy',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      });

      if (imported.length > 0) onImport(imported);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Экспорт */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[var(--forest-pale)] rounded-lg flex items-center justify-center">
            <Icon name="Download" size={16} className="text-[var(--forest-mid)]" />
          </div>
          <div>
            <div className="font-semibold text-[var(--forest-dark)] text-sm font-heading">Экспорт данных</div>
            <div className="text-xs text-[var(--stone)]">{trees.length} объектов</div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={exportKML}
            className="w-full justify-start gap-3 bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/20 text-[var(--forest-dark)] border border-[var(--forest-light)]/30 font-medium"
            variant="outline"
          >
            <Icon name="Globe" size={16} className="text-[var(--forest-mid)]" />
            Экспорт в KML (Google Earth)
          </Button>

          <Button
            onClick={exportCSV}
            className="w-full justify-start gap-3 bg-white hover:bg-green-50 text-[var(--forest-dark)] border border-[var(--border)] font-medium"
            variant="outline"
          >
            <Icon name="Sheet" fallback="Table" size={16} className="text-green-600" />
            Экспорт в CSV (Excel)
          </Button>

          <Button
            onClick={exportJSON}
            className="w-full justify-start gap-3 bg-white hover:bg-blue-50 text-[var(--forest-dark)] border border-[var(--border)] font-medium"
            variant="outline"
          >
            <Icon name="FileJson" fallback="File" size={16} className="text-blue-500" />
            Экспорт в JSON (резервная копия)
          </Button>
        </div>
      </div>

      {/* Импорт */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Icon name="Upload" size={16} className="text-amber-600" />
          </div>
          <div>
            <div className="font-semibold text-[var(--forest-dark)] text-sm font-heading">Импорт данных</div>
            <div className="text-xs text-[var(--stone)]">Добавить к существующим</div>
          </div>
        </div>

        {/* TXT-импорт (главный — МСК-167) */}
        <div className="mb-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50/40">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="MapPin" size={15} className="text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">Импорт из МСК-167 (TXT)</span>
          </div>

          {/* Описание формата */}
          <div className="mb-3 text-xs text-purple-700 leading-relaxed space-y-1">
            <div>Формат каждой строки файла:</div>
            <div className="font-mono bg-white rounded px-2 py-1.5 text-purple-900 border border-purple-200 text-[11px] select-all">
              название;X;Y;код
            </div>
            <div className="font-mono bg-white rounded px-2 py-1.5 text-purple-900 border border-purple-200 text-[11px] select-all">
              городокская;378072.760;20331.493;542
            </div>
            <div className="pt-0.5 text-purple-600 space-y-0.5">
              <div><b>X</b> — северная координата (м) · <b>Y</b> — восточная координата (м)</div>
              <div>Разделитель: <b>;</b> или <b>Tab</b> · Кодировка: UTF-8 или Windows-1251</div>
              <div className="pt-1 font-medium text-purple-700">Коды объектов:</div>
              <div>542 — лиственное дерево · 543 — хвойное · 560 — кустарник</div>
            </div>
          </div>

          <button
            onClick={() => txtRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 transition-colors text-sm text-white font-medium shadow-sm"
          >
            <Icon name="FileText" size={15} className="text-white" />
            Загрузить TXT файл (МСК-167)
          </button>

          {/* Результат импорта */}
          {txtPreview && (
            <div className={`mt-3 p-3 rounded-lg border text-xs ${txtPreview.ok > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`flex items-center gap-2 font-semibold mb-1 ${txtPreview.ok > 0 ? 'text-green-700' : 'text-red-700'}`}>
                <Icon name={txtPreview.ok > 0 ? 'CheckCircle' : 'XCircle'} size={13} />
                Загружено {txtPreview.ok} объектов{txtPreview.skip > 0 ? `, пропущено ${txtPreview.skip}` : ''}
              </div>

              {/* Превью координат */}
              {txtPreview.sample && txtPreview.sample.length > 0 && (
                <div className="mb-2">
                  <div className="text-green-600 mb-1 font-medium">Примеры переведённых координат (WGS84):</div>
                  {txtPreview.sample.map((s, i) => (
                    <div key={i} className="font-mono text-green-800 text-[10px]">
                      {s.name}: {s.lat.toFixed(6)}, {s.lng.toFixed(6)}
                    </div>
                  ))}
                </div>
              )}

              {/* Пропущенные строки */}
              {txtPreview.rows.length > 0 && (
                <ul className="text-red-600 space-y-0.5 mt-1 border-t border-red-200 pt-1">
                  {txtPreview.rows.slice(0, 10).map((r, i) => <li key={i}>• {r}</li>)}
                  {txtPreview.rows.length > 10 && (
                    <li className="text-red-400">…ещё {txtPreview.rows.length - 10} ошибок</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Остальные форматы */}
        <div className="space-y-2">
          <button
            onClick={() => kmlRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-[var(--forest-light)]/40 hover:border-[var(--forest-mid)] hover:bg-[var(--forest-pale)]/30 transition-all text-sm text-[var(--forest-dark)] font-medium"
          >
            <Icon name="Globe" size={16} className="text-[var(--forest-mid)]" />
            Загрузить KML файл
          </button>

          <button
            onClick={() => jsonRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-sm text-[var(--forest-dark)] font-medium"
          >
            <Icon name="FileJson" fallback="File" size={16} className="text-blue-500" />
            Загрузить JSON файл
          </button>
        </div>

        <input ref={txtRef}  type="file" accept=".txt,.csv" className="hidden" onChange={handleImportTXT} />
        <input ref={kmlRef}  type="file" accept=".kml"      className="hidden" onChange={handleImportKML} />
        <input ref={jsonRef} type="file" accept=".json"     className="hidden" onChange={handleImportJSON} />
      </div>

      {/* Справка */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="font-semibold text-[var(--forest-dark)] text-sm font-heading mb-3 flex items-center gap-2">
          <Icon name="HelpCircle" size={16} className="text-[var(--stone)]" />
          Справка по форматам
        </div>

        {/* МСК-167 info card */}
        <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-xs text-indigo-700">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={13} className="shrink-0 mt-0.5 text-indigo-500" />
            <div className="space-y-1">
              <div className="font-semibold text-indigo-800">МСК-167 — местная система координат г. Минусинска</div>
              <div>Основана на проекции Гаусс–Крюгера, эллипсоид Красовского, датум Пулково-1942.</div>
              <div>Центральный меридиан: <b>93° в.д.</b> · Ложный сдвиг по X: <b>106 797.80 м</b></div>
              <div>Координаты автоматически переводятся в WGS84 и отображаются на карте.</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-[var(--stone)]">
          <div><b className="text-[var(--forest-dark)]">KML</b> — стандарт геопространственных данных. Совместим с Google Earth, QGIS, Яндекс.Картами.</div>
          <div><b className="text-[var(--forest-dark)]">CSV</b> — таблица с разделителем «;». Открывается в Microsoft Excel и Google Таблицах.</div>
          <div><b className="text-[var(--forest-dark)]">JSON</b> — полная резервная копия для переноса данных между устройствами.</div>
        </div>
      </div>

    </div>
  );
}
