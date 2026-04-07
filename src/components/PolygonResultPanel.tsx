import { useState } from 'react';
import { TreeMarker, STATUS_LABELS, STATUS_COLORS } from '@/types/tree';
import BulkEditDialog from '@/components/BulkEditDialog';

interface Props {
  trees: TreeMarker[];
  onClose: () => void;
  onSelectTree: (id: string) => void;
  onBulkEdit?: (ids: string[], updates: Partial<import('@/types/tree').TreeMarker>) => Promise<void>;
  isEditor?: boolean;
}

export default function PolygonResultPanel({ trees, onClose, onSelectTree, onBulkEdit, isEditor = false }: Props) {
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = trees.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.species.toLowerCase().includes(search.toLowerCase()) ||
    String(t.number ?? '').includes(search)
  );

  const totalCount = trees.reduce((s, t) => s + (t.count ?? 1), 0);

  const byStatus = trees.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
    <div className="absolute top-4 right-4 z-[1000] w-80 max-h-[calc(100vh-6rem)] flex flex-col bg-white/97 backdrop-blur-sm rounded-2xl shadow-2xl border border-violet-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
        <div>
          <div className="font-bold text-base">⬡ Выбрано полигоном</div>
          <div className="text-violet-200 text-xs mt-0.5">
            {trees.length} {plural(trees.length, 'дерево', 'дерева', 'деревьев')}
            {totalCount !== trees.length && ` · ${totalCount} стволов`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditor && trees.length > 0 && onBulkEdit && (
            <button
              onClick={() => setBulkOpen(true)}
              className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-all"
            >
              ✏️ Изменить всё
            </button>
          )}
          <button onClick={onClose} className="text-violet-200 hover:text-white text-xl leading-none">✕</button>
        </div>
      </div>

      {trees.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          В выбранной области нет деревьев
        </div>
      ) : (
        <>
          <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
            {Object.entries(byStatus).map(([status, cnt]) => (
              <span
                key={status}
                className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? '#888' }}
              >
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}: {cnt}
              </span>
            ))}
          </div>

          <div className="px-3 py-2 border-b border-gray-100">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию или виду..."
              className="w-full text-xs rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-violet-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.map(tree => (
              <button
                key={tree.id}
                onClick={() => onSelectTree(tree.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-violet-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[tree.status], marginTop: 5 }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {tree.number ? `№${tree.number} · ` : ''}{tree.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{tree.species}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {STATUS_LABELS[tree.status]}
                      {tree.diameter ? ` · ⌀${tree.diameter} см` : ''}
                      {tree.height ? ` · ${tree.height} м` : ''}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-4 text-center text-gray-400 text-xs">Ничего не найдено</div>
            )}
          </div>
        </>
      )}
    </div>
    {onBulkEdit && (
      <BulkEditDialog
        open={bulkOpen}
        trees={trees}
        onClose={() => setBulkOpen(false)}
        onSave={onBulkEdit}
      />
    )}
    </>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}