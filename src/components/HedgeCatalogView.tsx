import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { HedgeRow, STATUS_LABELS, STATUS_COLORS, CONDITION_LABELS } from '@/types/tree';

interface Props {
  hedges: HedgeRow[];
  onSelect: (id: string) => void;
  onEdit: (hedge: HedgeRow) => void;
  onDelete: (id: string) => void;
  isGuest?: boolean;
}

export default function HedgeCatalogView({ hedges, onSelect, onEdit, onDelete, isGuest = false }: Props) {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = hedges.filter(h =>
    !search ||
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.species.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] bg-white/60 backdrop-blur-sm">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--stone)]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или виду..."
            className="pl-9 border-[var(--forest-light)]/40"
          />
        </div>
        <div className="mt-2 text-xs text-[var(--stone)]">
          Найдено: {sorted.length} {sorted.length === 1 ? 'изгородь' : sorted.length < 5 ? 'изгороди' : 'изгородей'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <div className="text-center py-16 text-[var(--stone)]">
            <div className="text-4xl mb-3">🌿</div>
            <div className="font-semibold font-heading">Живых изгородей нет</div>
            <div className="text-sm mt-1">Нарисуйте первую изгородь на карте</div>
          </div>
        )}

        {sorted.map(hedge => (
          <div
            key={hedge.id}
            className="bg-white rounded-xl border border-[var(--border)] hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onSelect(hedge.id)}
          >
            <div className="p-3 flex gap-3 items-start">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl"
                style={{ background: '#e8f5e9' }}
              >
                🌿
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[var(--stone)] bg-gray-100 px-1.5 py-0.5 rounded">
                    №{hedge.number}
                  </span>
                  <span className="font-semibold text-[var(--forest-dark)] text-sm truncate">{hedge.name}</span>
                </div>
                <div className="text-xs text-[var(--stone)] mb-1.5">{hedge.species}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    className="text-[10px] px-1.5 py-0 font-semibold text-white"
                    style={{ background: STATUS_COLORS[hedge.status] }}
                  >
                    {STATUS_LABELS[hedge.status]}
                  </Badge>
                  <span className="text-[10px] text-[var(--stone)] bg-gray-50 px-1.5 py-0.5 rounded border">
                    {CONDITION_LABELS[hedge.condition]}
                  </span>
                  {hedge.lengthM !== null && hedge.lengthM !== undefined && (
                    <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                      📏 {hedge.lengthM.toFixed(1)} м
                    </span>
                  )}
                </div>
                {hedge.description && (
                  <div className="text-xs text-[var(--stone)] mt-1 truncate">{hedge.description}</div>
                )}
              </div>
              {!isGuest && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(hedge); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 text-[var(--forest-dark)] transition-all"
                    title="Редактировать"
                  >
                    <Icon name="Pencil" size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(hedge.id); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all"
                    title="Удалить"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!confirmDeleteId} onOpenChange={v => !v && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить изгородь?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--stone)]">Это действие нельзя отменить.</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { if (confirmDeleteId) { onDelete(confirmDeleteId); setConfirmDeleteId(null); } }}
              className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
            >
              Удалить
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--stone)] hover:bg-gray-50 text-sm transition-colors"
            >
              Отмена
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
