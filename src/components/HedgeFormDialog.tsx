import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HedgeRow, HEDGE_SPECIES_LIST, STATUS_LABELS, CONDITION_LABELS, TreeStatus, TreeCondition } from '@/types/tree';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<HedgeRow, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => void;
  points: [number, number][];
  lengthM: number | null;
  editing?: HedgeRow | null;
}

export default function HedgeFormDialog({ open, onClose, onSave, points, lengthM, editing }: Props) {
  const [name, setName] = useState('Живая изгородь');
  const [species, setSpecies] = useState('Живая изгородь');
  const [status, setStatus] = useState<TreeStatus>('good');
  const [condition, setCondition] = useState<TreeCondition>('healthy');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setSpecies(editing.species);
      setStatus(editing.status);
      setCondition(editing.condition);
      setDescription(editing.description || '');
    } else {
      setName('Живая изгородь');
      setSpecies('Живая изгородь');
      setStatus('good');
      setCondition('healthy');
      setDescription('');
    }
  }, [editing, open]);

  const handleSave = () => {
    onSave({
      name,
      species,
      status,
      condition,
      description: description || undefined,
      points: editing ? editing.points : points,
      lengthM: editing ? editing.lengthM : lengthM,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-[var(--forest-dark)] flex items-center gap-2">
            🌿 {editing ? 'Редактировать' : 'Добавить'} живую изгородь
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[var(--stone)] mb-1.5 block">Название</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Живая изгородь" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--stone)] mb-1.5 block">Вид кустарника</label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEDGE_SPECIES_LIST.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--stone)] mb-1.5 block">Состояние</label>
              <Select value={status} onValueChange={v => setStatus(v as TreeStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [TreeStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--stone)] mb-1.5 block">Жизнеспособность</label>
              <Select value={condition} onValueChange={v => setCondition(v as TreeCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CONDITION_LABELS) as [TreeCondition, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(lengthM !== null || editing?.lengthM) && (
            <div className="bg-[var(--forest-pale)] rounded-lg px-3 py-2 text-sm text-[var(--forest-dark)]">
              📏 Длина: <strong>{((editing?.lengthM ?? lengthM) ?? 0).toFixed(1)} м</strong>
              {' · '}Точек: <strong>{editing ? editing.points.length : points.length}</strong>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--stone)] mb-1.5 block">Примечание</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Необязательно" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-lg bg-[var(--forest-mid)] hover:bg-[var(--forest-dark)] text-white font-semibold text-sm transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--stone)] hover:bg-gray-50 text-sm transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
