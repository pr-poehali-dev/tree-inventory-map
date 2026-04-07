import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { TreeMarker, TreeStatus, TreeCondition, TreeLifeStatus, STATUS_LABELS, CONDITION_LABELS, LIFE_STATUS_LABELS, SPECIES_GROUPS } from '@/types/tree';

type BulkUpdates = {
  name?: string;
  species?: string;
  diameter?: number;
  height?: number;
  count?: number;
  status?: TreeStatus;
  condition?: TreeCondition;
  lifeStatus?: TreeLifeStatus;
};

interface Props {
  open: boolean;
  trees: TreeMarker[];
  onClose: () => void;
  onSave: (ids: string[], updates: BulkUpdates) => Promise<void>;
}

const NONE = '__none__';

export default function BulkEditDialog({ open, trees, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState(NONE);
  const [diameter, setDiameter] = useState('');
  const [height, setHeight] = useState('');
  const [count, setCount] = useState('');
  const [status, setStatus] = useState<TreeStatus | typeof NONE>(NONE);
  const [condition, setCondition] = useState<TreeCondition | typeof NONE>(NONE);
  const [lifeStatus, setLifeStatus] = useState<TreeLifeStatus | typeof NONE>(NONE);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setSpecies(NONE); setDiameter(''); setHeight(''); setCount('');
    setStatus(NONE); setCondition(NONE); setLifeStatus(NONE);
  };

  const handleSave = async () => {
    const updates: BulkUpdates = {};
    if (name.trim()) updates.name = name.trim();
    if (species !== NONE) updates.species = species;
    if (diameter !== '' && Number(diameter) > 0) updates.diameter = Number(diameter);
    if (height !== '' && Number(height) > 0) updates.height = Number(height);
    if (count !== '' && Number(count) > 0) updates.count = Number(count);
    if (status !== NONE) updates.status = status;
    if (condition !== NONE) updates.condition = condition;
    if (lifeStatus !== NONE) updates.lifeStatus = lifeStatus;

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    await onSave(trees.map(t => t.id), updates);
    setSaving(false);
    reset();
    onClose();
  };

  const hasChanges =
    name.trim() ||
    species !== NONE ||
    (diameter !== '' && Number(diameter) > 0) ||
    (height !== '' && Number(height) > 0) ||
    (count !== '' && Number(count) > 0) ||
    status !== NONE ||
    condition !== NONE ||
    lifeStatus !== NONE;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовое редактирование</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-500 mb-3">
          Применится к <span className="font-semibold text-gray-800">{trees.length}</span> {plural(trees.length, 'дереву', 'деревьям', 'деревьям')}.
          Пустые поля не изменяются.
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Наименование</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Не изменять" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Порода</label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Не изменять" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value={NONE}>Не изменять</SelectItem>
                {SPECIES_GROUPS.map((group, gi) => (
                  <SelectGroup key={group.group}>
                    {gi > 0 && <SelectSeparator />}
                    <SelectLabel className="flex items-center gap-1.5 text-[var(--forest-dark)] font-semibold bg-[var(--forest-pale)]/60 px-2 py-1">
                      <span>{group.icon}</span>{group.group}
                    </SelectLabel>
                    {group.items.map(s => (
                      <SelectItem key={s} value={s} className="pl-6 text-xs">{s}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Диаметр (см)</label>
              <Input type="number" min={1} value={diameter} onChange={e => setDiameter(e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Высота (м)</label>
              <Input type="number" min={0.1} step={0.1} value={height} onChange={e => setHeight(e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Кол-во стволов</label>
              <Input type="number" min={1} value={count} onChange={e => setCount(e.target.value)} placeholder="—" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Состояние</label>
            <Select value={status} onValueChange={v => setStatus(v as TreeStatus | typeof NONE)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Не изменять" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не изменять</SelectItem>
                {(Object.entries(STATUS_LABELS) as [TreeStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Жизненное состояние</label>
            <Select value={condition} onValueChange={v => setCondition(v as TreeCondition | typeof NONE)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Не изменять" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не изменять</SelectItem>
                {(Object.entries(CONDITION_LABELS) as [TreeCondition, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Жизнеспособность</label>
            <Select value={lifeStatus} onValueChange={v => setLifeStatus(v as TreeLifeStatus | typeof NONE)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Не изменять" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не изменять</SelectItem>
                {(Object.entries(LIFE_STATUS_LABELS) as [TreeLifeStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            onClick={() => { reset(); onClose(); }}
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