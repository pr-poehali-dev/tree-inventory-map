import { useState, useCallback } from 'react';
import MapView from '@/components/MapView';
import CatalogView from '@/components/CatalogView';
import StatsView from '@/components/StatsView';
import ImportExportView from '@/components/ImportExportView';
import HelpView from '@/components/HelpView';
import TreeFormDialog from '@/components/TreeFormDialog';
import Icon from '@/components/ui/icon';
import { useTreeStore } from '@/store/useTreeStore';
import { TreeMarker } from '@/types/tree';

type Tab = 'map' | 'catalog' | 'stats' | 'import' | 'help';

const TABS: { id: Tab; label: string; icon: string; short: string }[] = [
  { id: 'map', label: 'Карта', icon: 'Map', short: 'Карта' },
  { id: 'catalog', label: 'Каталог', icon: 'List', short: 'Каталог' },
  { id: 'stats', label: 'Статистика', icon: 'BarChart2', short: 'Стат.' },
  { id: 'import', label: 'Импорт / Экспорт', icon: 'ArrowLeftRight', short: 'И/Э' },
  { id: 'help', label: 'Справка', icon: 'HelpCircle', short: 'Справка' },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTree, setEditingTree] = useState<TreeMarker | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const store = useTreeStore();

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingLatLng({ lat, lng });
    setEditingTree(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((tree: TreeMarker) => {
    setEditingTree(tree);
    setPendingLatLng(null);
    setFormOpen(true);
  }, []);

  const handleFormSave = useCallback(
    (data: Omit<TreeMarker, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (editingTree) {
        store.updateTree(editingTree.id, data);
      } else {
        store.addTree(data);
      }
      setFormOpen(false);
      setEditingTree(null);
      setPendingLatLng(null);
    },
    [editingTree, store]
  );

  const handleSelectTree = useCallback(
    (id: string) => {
      store.setSelectedTreeId(id);
      setActiveTab('map');
    },
    [store]
  );

  const total = store.trees.reduce((s, t) => s + t.count, 0);
  const emergency = store.trees.filter(t => t.status === 'emergency').length;

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] overflow-hidden">
      {/* Header */}
      <header className="forest-bg text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center text-lg">🌲</div>
          <div>
            <div className="font-bold font-heading text-sm leading-tight">Дендрологическая ведомость</div>
            <div className="text-white/60 text-xs">г. Минусинск и Минусинский район</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {emergency > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 px-3 py-1.5 rounded-lg">
              <Icon name="AlertTriangle" size={14} className="text-red-300" />
              <span className="text-xs text-red-200 font-medium">{emergency} аварийных</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-white font-bold font-heading text-lg leading-tight">{total}</div>
            <div className="text-white/50 text-[10px]">деревьев</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar navigation (desktop) */}
        <nav className="hidden md:flex flex-col w-48 bg-white border-r border-[var(--border)] shrink-0">
          <div className="flex-1 py-3 space-y-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-[var(--forest-pale)] text-[var(--forest-dark)] border-r-2 border-[var(--forest-mid)]'
                    : 'text-[var(--stone)] hover:bg-gray-50 hover:text-[var(--forest-dark)]'
                  }
                `}
              >
                <Icon name={tab.icon as "Map"} fallback="Circle" size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--border)]">
            <button
              onClick={() => {
                setEditingTree(null);
                setPendingLatLng({ lat: 53.7102, lng: 91.6886 });
                setFormOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--forest-mid)] hover:bg-[var(--forest-dark)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Icon name="Plus" size={16} />
              Добавить дерево
            </button>
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'map' && (
            <div className="flex-1 p-3 overflow-hidden">
              <MapView
                trees={store.filteredTrees}
                onMapClick={handleMapClick}
                onEdit={handleEdit}
                onDelete={store.deleteTree}
                onSelect={store.setSelectedTreeId}
                selectedTreeId={store.selectedTreeId}
              />
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <CatalogView
                trees={store.filteredTrees}
                onSelect={handleSelectTree}
                onEdit={handleEdit}
                onDelete={store.deleteTree}
                searchQuery={store.searchQuery}
                setSearchQuery={store.setSearchQuery}
                filterSpecies={store.filterSpecies}
                setFilterSpecies={store.setFilterSpecies}
                filterStatus={store.filterStatus}
                setFilterStatus={store.setFilterStatus}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Статистика</div>
                <div className="text-xs text-[var(--stone)]">По всем объектам учёта</div>
              </div>
              <StatsView trees={store.trees} />
            </div>
          )}

          {activeTab === 'import' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Импорт и Экспорт</div>
                <div className="text-xs text-[var(--stone)]">Обмен данными с другими системами</div>
              </div>
              <ImportExportView trees={store.trees} onImport={store.importTrees} />
            </div>
          )}

          {activeTab === 'help' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Справка</div>
                <div className="text-xs text-[var(--stone)]">Инструкция по работе с системой</div>
              </div>
              <HelpView />
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden flex border-t border-[var(--border)] bg-white shrink-0 z-10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-[var(--forest-mid)]'
                : 'text-[var(--stone)]'
              }
            `}
          >
            <Icon name={tab.icon as "Map"} fallback="Circle" size={20} />
            {tab.short}
          </button>
        ))}
      </nav>

      {/* Tree form dialog */}
      <TreeFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTree(null); setPendingLatLng(null); }}
        onSave={handleFormSave}
        initialData={editingTree ?? undefined}
        lat={pendingLatLng?.lat}
        lng={pendingLatLng?.lng}
      />
    </div>
  );
}