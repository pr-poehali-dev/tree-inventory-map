import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { TreeMarker, STATUS_LABELS, STATUS_COLORS, SPECIES_GROUPS, TreeStatus } from '@/types/tree';
import { SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';

interface Props {
  trees: TreeMarker[];
  onSelect: (id: string) => void;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
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
  searchQuery,
  setSearchQuery,
  filterSpecies,
  setFilterSpecies,
  filterStatus,
  setFilterStatus,
  isGuest = false,
}: Props) {
  const [sortBy, setSortBy] = useState<'name' | 'diameter' | 'height' | 'age'>('name');

  const sorted = [...trees].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
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
              <SelectItem value="name">По названию</SelectItem>
              <SelectItem value="diameter">По диаметру</SelectItem>
              <SelectItem value="height">По высоте</SelectItem>
              <SelectItem value="age">По возрасту</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-[var(--stone)]">
          Найдено: <span className="font-semibold text-[var(--forest-mid)]">{trees.length}</span> объектов
        </div>
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
                <div className="w-16 h-16 rounded-lg bg-[var(--forest-pale)] flex items-center justify-center shrink-0 text-2xl">
                  {tree.species.toLowerCase().includes('кустарник') ? '🌿'
                    : (tree.species.toLowerCase().includes('хвойное') || tree.species.toLowerCase().includes('ель') || tree.species.toLowerCase().includes('сосна') || tree.species.toLowerCase().includes('лиственниц') || tree.species.toLowerCase().includes('пихта') || tree.species.toLowerCase().includes('кедр')) ? '🌲'
                    : '🌳'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="font-semibold text-[var(--forest-dark)] text-sm leading-tight">{tree.name}</div>
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
                      {tree.lifeStatus === 'cut' ? '🪵 Спиленное' : '🌿 Живое'}
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
                onClick={e => { e.stopPropagation(); onDelete(tree.id); }}
                className="px-4 py-2 text-xs text-red-400 hover:bg-red-50 transition-colors rounded-br-xl"
              >
                Удалить
              </button>
              </>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}