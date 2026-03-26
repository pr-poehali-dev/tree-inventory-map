import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { TreeMarker } from '@/types/tree';

// МСК-167 → WGS84 через аффинное преобразование по опорным точкам (МНК)
// Эталон: городокская X=378072.760, Y=20331.493 → 53.72458, 91.68978
// В файле: первая колонка = X (отклонение от осевого ~20000), вторая = Y (северная ~378000)
// Опорные точки для калибровки:
const _calPts = [
  { x: 378072.760, y: 20331.493, lat: 53.72458, lon: 91.68978 },
];

function msk167toWGS84(xMsk: number, yMsk: number): [number, number] {
  if (_calPts.length === 0) return [xMsk, yMsk];

  if (_calPts.length === 1) {
    // 1 точка: используем масштаб градусов/метр для широты 53°
    const p = _calPts[0];
    const dLat = (xMsk - p.x) * 0.000009009;  // ~1° широты = 111 000 м
    const dLon = (yMsk - p.y) * 0.000015;      // ~1° долготы = 66 700 м на ш.53°
    return [p.lat + dLat, p.lon + dLon];
  }

  // 2+ точек: МНК аффинное преобразование
  const n = _calPts.length;
  let sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0;
  let sxLat = 0, syLat = 0, sLat = 0;
  let sxLon = 0, syLon = 0, sLon = 0;
  for (const p of _calPts) {
    sx += p.x; sy += p.y; sx2 += p.x*p.x; sy2 += p.y*p.y; sxy += p.x*p.y;
    sxLat += p.x*p.lat; syLat += p.y*p.lat; sLat += p.lat;
    sxLon += p.x*p.lon; syLon += p.y*p.lon; sLon += p.lon;
  }
  const A = [[n,sx,sy],[sx,sx2,sxy],[sy,sxy,sy2]];
  const det = (m: number[][]) =>
    m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
   -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
   +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D = det(A);
  const repl = (col: number, b: number[]) => A.map((row,i) => row.map((v,j) => j===col ? b[i] : v));
  const [a0,a1,a2] = [0,1,2].map(i => det(repl(i,[sLat,sxLat,syLat]))/D);
  const [b0,b1,b2] = [0,1,2].map(i => det(repl(i,[sLon,sxLon,syLon]))/D);
  return [a0+a1*xMsk+a2*yMsk, b0+b1*xMsk+b2*yMsk];
}

const TREE_CODE_MAP: Record<string, { name: string; species: string; condition: TreeMarker['condition'] }> = {
  '542': { name: 'Дерево лиственное', species: 'Лиственное', condition: 'healthy' },
  '543': { name: 'Дерево хвойное',    species: 'Хвойное',    condition: 'healthy' },
  '560': { name: 'Кустарник',         species: 'Кустарник',  condition: 'healthy' },
};

interface Props {
  trees: TreeMarker[];
  onImport: (trees: TreeMarker[]) => void;
}

export default function ImportExportView({ trees, onImport }: Props) {
  const kmlRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const txtRef = useRef<HTMLInputElement>(null);
  const [txtPreview, setTxtPreview] = useState<{ ok: number; skip: number; rows: string[] } | null>(null);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(trees, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dendro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Название', 'Порода', 'Диаметр (см)', 'Высота (м)', 'Количество', 'Возраст', 'Состояние', 'Широта', 'Долгота', 'Дата'];
    const rows = trees.map(t => [
      t.id, t.name, t.species, t.diameter, t.height, t.count, t.age ?? '', t.status, t.lat.toFixed(6), t.lng.toFixed(6), t.createdAt
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dendro_${new Date().toISOString().split('T')[0]}.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleImportTXT = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const imported: TreeMarker[] = [];
      const skipped: string[] = [];

      lines.forEach((line, i) => {
        const parts = line.split(/[\t,;]+/).map(p => p.trim());
        if (parts.length < 4) {
          skipped.push(`Строка ${i + 1}: недостаточно полей («${line.slice(0, 40)}»)`);
          return;
        }
        const [rawName, rawX, rawY, rawCode] = parts;
        const rawXf = parseFloat(rawX.replace(',', '.'));
        const rawYf = parseFloat(rawY.replace(',', '.'));
        const code = rawCode?.trim();
        if (isNaN(rawXf) || isNaN(rawYf)) {
          skipped.push(`Строка ${i + 1}: некорректные координаты («${line.slice(0, 40)}»)`);
          return;
        }
        const [lat, lng] = msk167toWGS84(rawXf, rawYf);
        const treeInfo = TREE_CODE_MAP[code] ?? {
          name: rawName || `Объект ${i + 1}`,
          species: 'Не определено',
          condition: 'healthy' as TreeMarker['condition'],
        };
        imported.push({
          id: `txt_${Date.now()}_${i}`,
          lat,
          lng,
          name: rawName || treeInfo.name,
          species: treeInfo.species,
          diameter: 20,
          height: 10,
          count: 1,
          status: 'good',
          condition: treeInfo.condition,
          description: code ? `Код объекта: ${code}` : undefined,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        });
      });

      setTxtPreview({ ok: imported.length, skip: skipped.length, rows: skipped });
      if (imported.length > 0) onImport(imported);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleImportKML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');
      const placemarks = Array.from(doc.querySelectorAll('Placemark'));

      const imported: TreeMarker[] = placemarks.map((pm, i) => {
        const name = pm.querySelector('name')?.textContent ?? `Дерево ${i + 1}`;
        const coords = pm.querySelector('coordinates')?.textContent?.trim().split(',') ?? ['0', '0'];
        return {
          id: `kml_${Date.now()}_${i}`,
          lat: parseFloat(coords[1] ?? '0'),
          lng: parseFloat(coords[0] ?? '0'),
          name,
          species: 'Берёза повислая',
          diameter: 20,
          height: 10,
          count: 1,
          status: 'good',
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Export */}
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

      {/* Import */}
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

        <div className="space-y-2">
          <button
            onClick={() => txtRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all text-sm text-[var(--forest-dark)] font-medium"
          >
            <Icon name="FileText" size={16} className="text-purple-500" />
            Загрузить TXT файл (коды объектов)
          </button>

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

        <input ref={txtRef} type="file" accept=".txt" className="hidden" onChange={handleImportTXT} />
        <input ref={kmlRef} type="file" accept=".kml" className="hidden" onChange={handleImportKML} />
        <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />

        {txtPreview && (
          <div className={`mt-3 p-3 rounded-lg border text-xs ${txtPreview.ok > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`flex items-center gap-2 font-medium mb-1 ${txtPreview.ok > 0 ? 'text-green-700' : 'text-red-700'}`}>
              <Icon name={txtPreview.ok > 0 ? 'CheckCircle' : 'XCircle'} size={13} />
              Загружено {txtPreview.ok} объектов{txtPreview.skip > 0 ? `, пропущено ${txtPreview.skip}` : ''}
            </div>
            {txtPreview.rows.length > 0 && (
              <ul className="text-red-600 space-y-0.5 mt-1">
                {txtPreview.rows.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 flex gap-2">
            <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-0.5">Формат TXT: имя, X, Y, код</div>
              <div className="text-purple-600">542 — лиственные · 543 — хвойные · 560 — кустарники</div>
              <div className="text-purple-500 mt-0.5">Координаты пересчитываются из МСК-167 в GPS автоматически</div>
            </div>
          </div>
        </div>

        <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-700 flex gap-2">
            <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
            <span>При импорте KML объектам будет присвоена порода «Берёза» по умолчанию. После импорта отредактируйте данные в каталоге.</span>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="font-semibold text-[var(--forest-dark)] text-sm font-heading mb-2 flex items-center gap-2">
          <Icon name="HelpCircle" size={16} className="text-[var(--stone)]" />
          Справка по форматам
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