import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { TreeMarker } from '@/types/tree';

interface Props {
  trees: TreeMarker[];
  onImport: (trees: TreeMarker[]) => void;
}

export default function ImportExportView({ trees, onImport }: Props) {
  const kmlRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

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

        <input ref={kmlRef} type="file" accept=".kml" className="hidden" onChange={handleImportKML} />
        <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
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