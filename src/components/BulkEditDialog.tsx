import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TreeMarker } from '@/types/tree';

interface Props {
  open: boolean;
  trees: TreeMarker[];
  onClose: () => void;
  onSave: (ids: string[], updates: { name?: string; diameter?: number; height?: number }) => Promise<void>;
}

export default function BulkEditDialog({ open, trees, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [diameter, setDiameter] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const updates: { name?: string; diameter?: number; height?: number } = {};
    if (name.trim()) updates.name = name.trim();
    if (diameter !== '' && !isNaN(Number(diameter)) && Number(diameter) > 0) updates.diameter = Number(diameter);
    if (height !== '' && !isNaN(Number(height)) && Number(height) > 0) updates.height = Number(height);

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    await onSave(trees.map(t => t.id), updates);
    setSaving(false);
    setName('');
    setDiameter('');
    setHeight('');
    onClose();
  };

  const hasChanges = name.trim() || (diameter !== '' && Number(diameter) > 0) || (height !== '' && Number(height) > 0);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Массовое редактирование</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-500 mb-4">
          Изменения применятся к <span className="font-semibold text-gray-800">{trees.length}</span> {plural(trees.length, 'дереву', 'деревьям', 'деревьям')}.
          Оставьте поле пустым, чтобы не менять его.
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Наименование</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Не изменять"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Диаметр (см)</label>
              <Input
                type="number"
                min={1}
                value={diameter}
                onChange={e => setDiameter(e.target.value)}
                placeholder="Не менять"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Высота (м)</label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={height}
                onChange={e => setHeight(e.target.value)}
                placeholder="Не менять"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex-1 py-2 rounded-lg bg-[var(--forest-mid)] hover:bg-[var(--forest-dark)] disabled:opacity-40 text-white font-semibold text-sm transition-colors"
          >
            {saving ? `Сохраняю... (${trees.length})` : 'Применить'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--stone)] hover:bg-gray-50 text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
