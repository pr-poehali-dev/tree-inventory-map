import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { TreeMarker, STATUS_LABELS, STATUS_COLORS, SPECIES_GROUPS, TreeStatus } from '@/types/tree';
import { SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BulkEditDialog from '@/components/BulkEditDialog';

interface Props {
  trees: TreeMarker[];
  onSelect: (id: string) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onDeleteBefore?: (fromDate: string, toDate: string) => Promise<void>;
  onBulkEdit?: (ids: string[], updates: { name?: string; diameter?: number; height?: number }) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterSpecies: string;
  setFilterSpecies: (v: string) => void;
  filterStatus: TreeStatus | '';
  setFilterStatus: (v: TreeStatus | '') => void;
  isGuest?: boolean;
}

export default function CatalogView({
  trees,
  onSelect,
  onEdit,
  onDelete,
  onDeleteBefore,
  onBulkEdit,
  searchQuery,
  setSearchQuery,
  filterSpecies,
  setFilterSpecies,
  filterStatus,
  setFilterStatus,
  isGuest = false,
}: Props) {
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'diameter' | 'height' | 'age' | 'date'>('number');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bulkDeleteFrom, setBulkDeleteFrom] = useState('');
  const [bulkDeleteTo, setBulkDeleteTo] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const filtered = trees.filter(tree => {
    if (dateFrom && tree.createdAt < dateFrom) return false;
    if (dateTo && tree.createdAt > dateTo) return false;
    return true;
  });

  const bulkDeleteCount = trees.filter(t => {
    if (bulkDeleteFrom && t.createdAt < bulkDeleteFrom) return false;
    if (bulkDeleteTo && t.createdAt > bulkDeleteTo) return false;
    return true;
  }).length;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'number') return (a.number ?? 0) - (b.number ?? 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'date') return b.createdAt.localeCompare(a.createdAt);
    return (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-[var(--border)] bg-white/60 backdrop-blur-sm space-y-3">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--stone)]" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или породе..."
            className="pl-9 border-[var(--forest-light)]/40"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={filterSpecies || '__all__'} onValueChange={v => setFilterSpecies(v === '__all__' ? '' : v)}>
            <SelectTrigger className="border-[var(--forest-light)]/40 text-sm h-9">
              <SelectValue placeholder="Порода" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__all__">Все породы</SelectItem>
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

          <Select value={filterStatus || '__all__'} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v as TreeStatus)}>
            <SelectTrigger className="border-[var(--forest-light)]/40 text-sm h-9">
              <SelectValue placeholder="Состояние" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все состояния</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="border-[var(--forest-light)]/40 text-sm h-9">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">По номеру</SelectItem>
              <SelectItem value="name">По названию</SelectItem>
              <SelectItem value="date">По дате</SelectItem>
              <SelectItem value="diameter">По диаметру</SelectItem>
              <SelectItem value="height">По высоте</SelectItem>
              <SelectItem value="age">По возрасту</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="CalendarDays" size={14} className="text-[var(--stone)] shrink-0" />
          <span className="text-xs text-[var(--stone)] shrink-0">Дата добавления:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 h-8 px-2 text-xs border border-[var(--forest-light)]/40 rounded-md bg-white focus:outline-none focus:border-[var(--forest-mid)]"
          />
          <span className="text-xs text-[var(--stone)]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 h-8 px-2 text-xs border border-[var(--forest-light)]/40 rounded-md bg-white focus:outline-none focus:border-[var(--forest-mid)]"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[var(--stone)] hover:text-red-400 transition-colors">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--stone)]">
            Найдено: <span className="font-semibold text-[var(--forest-mid)]">{sorted.length}</span> объектов
          </div>
          {!isGuest && onBulkEdit && sorted.length > 0 && (
            <button
              onClick={() => setBulkEditOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--forest-pale)] border border-[var(--forest-light)]/50 text-[var(--forest-dark)] hover:bg-[var(--forest-light)]/20 font-semibold transition-all"
            >
              <Icon name="Pencil" size={12} />
              Изменить всё ({sorted.length})
            </button>
          )}
        </div>

        {!isGuest && onDeleteBefore && (
          <div className="pt-1 border-t border-[var(--border)] space-y-2">
            <div className="flex items-center gap-1.5">
              <Icon name="Trash2" size={13} className="text-red-400 shrink-0" />
              <span className="text-xs font-medium text-red-500">Удалить за период:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--stone)] shrink-0">с</span>
              <input
                type="date"
                value={bulkDeleteFrom}
                onChange={e => setBulkDeleteFrom(e.target.value)}
                className="flex-1 h-8 px-2 text-xs border border-red-200 rounded-md bg-white focus:outline-none focus:border-red-400"
              />
              <span className="text-xs text-[var(--stone)] shrink-0">по</span>
              <input
                type="date"
                value={bulkDeleteTo}
                onChange={e => setBulkDeleteTo(e.target.value)}
                className="flex-1 h-8 px-2 text-xs border border-red-200 rounded-md bg-white focus:outline-none focus:border-red-400"
              />
              {(bulkDeleteFrom || bulkDeleteTo) && (
                <button onClick={() => { setBulkDeleteFrom(''); setBulkDeleteTo(''); }} className="text-[var(--stone)] hover:text-red-400 transition-colors shrink-0">
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
            <button
              disabled={!bulkDeleteFrom && !bulkDeleteTo}
              onClick={() => setConfirmBulkDelete(true)}
              className="w-full h-8 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {(bulkDeleteFrom || bulkDeleteTo) ? `Удалить ${bulkDeleteCount} деревьев` : 'Выберите период'}
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--stone)] gap-2">
            <Icon name="TreePine" size={36} className="opacity-30" />
            <span className="text-sm">Деревья не найдены</span>
          </div>
        )}

        {sorted.map((tree, i) => (
          <div
            key={tree.id}
            className="bg-white rounded-xl border border-[var(--border)] hover:border-[var(--forest-light)] hover:shadow-md transition-all animate-fade-in cursor-pointer group"
            style={{ animationDelay: `${i * 0.04}s` }}
            onClick={() => onSelect(tree.id)}
          >
            <div className="flex gap-3 p-3">
              {tree.photoUrl ? (
                <img
                  src={tree.photoUrl}
                  alt={tree.name}
                  className="w-16 h-16 object-cover rounded-lg shrink-0"
                />
              ) : (
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${tree.lifeStatus === 'cut' ? 'bg-red-50' : 'bg-[var(--forest-pale)] text-2xl'}`}>
                  {tree.lifeStatus === 'cut' ? (
                    <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="3" y1="3" x2="15" y2="15" stroke="white" strokeWidth="3" strokeLinecap="round"/><line x1="15" y1="3" x2="3" y2="15" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
                    </div>
                  ) : tree.species.toLowerCase().includes('кустарник') ? '🌿'
                    : (tree.species.toLowerCase().includes('хвойное') || tree.species.toLowerCase().includes('ель') || tree.species.toLowerCase().includes('сосна') || tree.species.toLowerCase().includes('лиственниц') || tree.species.toLowerCase().includes('пихта') || tree.species.toLowerCase().includes('кедр')) ? '🌲'
                    : '🌳'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {tree.number && <span className="text-[10px] font-bold text-[var(--forest-mid)] bg-[var(--forest-pale)] px-1.5 py-0.5 rounded">№{tree.number}</span>}
                      <span className="font-semibold text-[var(--forest-dark)] text-sm leading-tight">{tree.name}</span>
                    </div>
                    <div className="text-xs text-[var(--stone)] mt-0.5">{tree.species}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      className="text-[10px] px-1.5 py-0.5 text-white border-0"
                      style={{ background: STATUS_COLORS[tree.status] }}
                    >
                      {STATUS_LABELS[tree.status]}
                    </Badge>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tree.lifeStatus === 'cut' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                      {tree.lifeStatus === 'cut' ? '✕ Спиленное' : '🌿 Живое'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[var(--stone)]">
                  <span>⌀ {tree.diameter} см</span>
                  <span>↑ {tree.height} м</span>
                  <span>× {tree.count} шт</span>
                  {tree.age && <span>~ {tree.age} лет</span>}
                </div>
                {tree.address && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-[var(--forest-mid)]">
                    <Icon name="MapPin" size={11} className="shrink-0" />
                    <span className="truncate">{tree.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--stone)]/70 font-mono">
                  <Icon name="Navigation" size={10} className="shrink-0" />
                  <span>{tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}</span>
                </div>
                {tree.createdByName && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--stone)]/70">
                    <Icon name="User" size={10} className="shrink-0" />
                    <span>{tree.createdByName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--stone)]/70">
                  <Icon name="CalendarDays" size={10} className="shrink-0" />
                  <span>{new Date(tree.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>

            <div className="flex border-t border-[var(--border)] divide-x divide-[var(--border)]">
              {!isGuest && (<>
              <button
                onClick={e => { e.stopPropagation(); onEdit(tree); }}
                className="flex-1 py-2 text-xs text-[var(--forest-mid)] hover:bg-[var(--forest-pale)] transition-colors rounded-bl-xl"
              >
                Изменить
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(tree.id); }}
                className="px-4 py-2 text-xs text-red-400 hover:bg-red-50 transition-colors rounded-br-xl"
              >
                Удалить
              </button>
              </>)}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={confirmBulkDelete} onOpenChange={v => !bulkDeleting && setConfirmBulkDelete(v)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[var(--forest-dark)] flex items-center gap-2">
              <Icon name="Trash2" size={18} className="text-red-500" />
              Массовое удаление
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--stone)] pb-2">
            Будет удалено <span className="font-bold text-red-500">{bulkDeleteCount}</span> деревьев
            {bulkDeleteFrom && <> с <span className="font-semibold">{new Date(bulkDeleteFrom).toLocaleDateString('ru-RU')}</span></>}
            {bulkDeleteTo && <> по <span className="font-semibold">{new Date(bulkDeleteTo).toLocaleDateString('ru-RU')}</span></>}.
            {' '}Это действие необратимо.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              disabled={bulkDeleting}
              onClick={() => setConfirmBulkDelete(false)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--forest-dark)] bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 transition-colors font-medium disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              disabled={bulkDeleting}
              onClick={async () => {
                if (!onDeleteBefore) return;
                setBulkDeleting(true);
                await onDeleteBefore(bulkDeleteFrom, bulkDeleteTo);
                setBulkDeleting(false);
                setConfirmBulkDelete(false);
                setBulkDeleteFrom('');
                setBulkDeleteTo('');
              }}
              className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {bulkDeleting && <Icon name="Loader2" size={14} className="animate-spin" />}
              {bulkDeleting ? 'Удаляю...' : 'Удалить все'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[var(--forest-dark)] flex items-center gap-2">
              <Icon name="Trash2" size={18} className="text-red-500" />
              Удалить дерево?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--stone)] pb-2">
            Это действие необратимо. Дерево будет удалено из базы данных.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--forest-dark)] bg-[var(--forest-pale)] hover:bg-[var(--forest-light)]/30 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              onClick={() => { if (confirmDeleteId) { onDelete(confirmDeleteId); setConfirmDeleteId(null); } }}
              className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors font-medium"
            >
              Удалить
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {onBulkEdit && (
        <BulkEditDialog
          open={bulkEditOpen}
          trees={sorted}
          onClose={() => setBulkEditOpen(false)}
          onSave={onBulkEdit}
        />
      )}
    </div>
  );
}