import { useState, useCallback } from 'react';
import { haversineDistanceCoords } from '@/utils/geodesy';
import MapView from '@/components/MapView';
import CatalogView from '@/components/CatalogView';
import HedgeCatalogView from '@/components/HedgeCatalogView';
import StatsView from '@/components/StatsView';
import ImportExportView from '@/components/ImportExportView';
import HelpView from '@/components/HelpView';
import AdminView from '@/components/AdminView';
import TreeFormDialog from '@/components/TreeFormDialog';
import HedgeFormDialog from '@/components/HedgeFormDialog';
import PolygonResultPanel from '@/components/PolygonResultPanel';
import Icon from '@/components/ui/icon';
import { useTreeStore } from '@/store/useTreeStore';
import { useHedgeStore } from '@/store/useHedgeStore';
import { TreeMarker, HedgeRow } from '@/types';
import { User } from '@/hooks/useAuth';

type Tab = 'map' | 'catalog' | 'hedges' | 'stats' | 'import' | 'help' | 'admin';

const TABS: { id: Tab; label: string; icon: string; short: string; adminOnly?: boolean }[] = [
  { id: 'map', label: 'Карта', icon: 'Map', short: 'Карта' },
  { id: 'catalog', label: 'Каталог', icon: 'List', short: 'Каталог' },
  { id: 'hedges', label: 'Живые изгороди', icon: 'Minus', short: 'Изгороди' },
  { id: 'stats', label: 'Статистика', icon: 'BarChart2', short: 'Стат.' },
  { id: 'import', label: 'Импорт / Экспорт', icon: 'ArrowLeftRight', short: 'И/Э' },
  { id: 'help', label: 'Справка', icon: 'HelpCircle', short: 'Справка' },
  { id: 'admin', label: 'Пользователи', icon: 'Users', short: 'Адм.', adminOnly: true },
];

interface IndexProps {
  user: User | null;
  onLogout: () => void;
}

export default function Index({ user, onLogout }: IndexProps) {
  const isGuest = !user;
  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor' || isAdmin;
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTree, setEditingTree] = useState<TreeMarker | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const store = useTreeStore();
  const hedgeStore = useHedgeStore();

  const [hedgeFormOpen, setHedgeFormOpen] = useState(false);
  const [editingHedge, setEditingHedge] = useState<HedgeRow | null>(null);
  const [pendingHedgePoints, setPendingHedgePoints] = useState<[number, number][]>([]);
  const [pendingHedgeLength, setPendingHedgeLength] = useState<number | null>(null);
  const [polygonTrees, setPolygonTrees] = useState<TreeMarker[] | null>(null);

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

  const handleHedgeDrawn = useCallback((points: [number, number][], lengthM: number) => {
    setPendingHedgePoints(points);
    setPendingHedgeLength(lengthM);
    setEditingHedge(null);
    setHedgeFormOpen(true);
  }, []);

  const handleHedgeEdit = useCallback((hedge: HedgeRow) => {
    setEditingHedge(hedge);
    setHedgeFormOpen(true);
  }, []);

  const handlePolygonSelect = useCallback((trees: TreeMarker[]) => {
    setPolygonTrees(trees);
  }, []);

  const handleHedgePointsEdit = useCallback((id: string, points: [number, number][]) => {
    const hedge = hedgeStore.hedges.find(h => h.id === id);
    if (!hedge) return;
    const lengthM = points.reduce((dist, pt, i) => {
      if (i === 0) return 0;
      const prev = points[i - 1];
      return dist + haversineDistanceCoords(prev[0], prev[1], pt[0], pt[1]);
    }, 0);
    hedgeStore.updateHedge(id, { points, lengthM });
  }, [hedgeStore]);

  const handleHedgeSave = useCallback(
    (data: Omit<HedgeRow, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => {
      if (editingHedge) {
        hedgeStore.updateHedge(editingHedge.id, data);
      } else {
        hedgeStore.addHedge(data);
      }
      setHedgeFormOpen(false);
      setEditingHedge(null);
    },
    [editingHedge, hedgeStore]
  );

  const handleSelectHedge = useCallback(
    (id: string) => {
      hedgeStore.setSelectedHedgeId(id);
      setActiveTab('map');
    },
    [hedgeStore]
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
          <div className="flex items-center gap-2 border-l border-white/20 pl-3">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-white/90 text-xs font-medium leading-tight">{user.name}</div>
                  <div className="text-white/50 text-[10px]">{user.email}</div>
                </div>
                <button onClick={onLogout} title="Выйти"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                  <Icon name="LogOut" size={15} className="text-white/80" />
                </button>
              </>
            ) : (
              <button onClick={onLogout} title="Войти"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all">
                <Icon name="LogIn" size={14} />
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar navigation (desktop) */}
        <nav className="hidden md:flex flex-col w-48 bg-white border-r border-[var(--border)] shrink-0">
          <div className="flex-1 py-3 space-y-0.5">
            {visibleTabs.map(tab => (
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

          <div className="p-3 border-t border-[var(--border)] space-y-2">
            {isGuest ? (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--forest-mid)] hover:bg-[var(--forest-dark)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Icon name="LogIn" size={16} />
                Войти для редактирования
              </button>
            ) : isEditor ? (
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
            ) : (
              <div className="text-xs text-[var(--stone)] text-center px-2 py-1">
                Только просмотр. Обратитесь к администратору для получения прав редактирования.
              </div>
            )}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'map' && (
            <div className="flex-1 p-3 overflow-hidden relative">
              <MapView
                trees={store.filteredTrees}
                onMapClick={isEditor ? handleMapClick : () => {}}
                onEdit={isEditor ? handleEdit : () => {}}
                onDelete={isEditor ? store.deleteTree : () => {}}
                onSelect={store.setSelectedTreeId}
                selectedTreeId={store.selectedTreeId}
                isGuest={!isEditor}
                hedges={hedgeStore.hedges}
                onHedgeDrawn={isEditor ? handleHedgeDrawn : undefined}
                onHedgeEdit={isEditor ? handleHedgeEdit : undefined}
                onHedgeDelete={isEditor ? hedgeStore.deleteHedge : undefined}
                selectedHedgeId={hedgeStore.selectedHedgeId}
                onHedgePointsEdit={isEditor ? handleHedgePointsEdit : undefined}
                onPolygonSelect={handlePolygonSelect}
              />
              {polygonTrees !== null && (
                <PolygonResultPanel
                  trees={polygonTrees}
                  onClose={() => setPolygonTrees(null)}
                  onSelectTree={id => { store.setSelectedTreeId(id); setPolygonTrees(null); }}
                  onBulkEdit={isEditor ? store.updateManyTrees : undefined}
                  isEditor={isEditor}
                />
              )}
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <CatalogView
                trees={store.filteredTrees}
                onSelect={handleSelectTree}
                onEdit={isEditor ? handleEdit : () => {}}
                onDelete={isEditor ? store.deleteTree : () => {}}
                onDeleteBefore={isEditor ? store.deleteTreesBefore : undefined}
                onBulkEdit={isEditor ? store.updateManyTrees : undefined}
                searchQuery={store.searchQuery}
                setSearchQuery={store.setSearchQuery}
                filterSpecies={store.filterSpecies}
                setFilterSpecies={store.setFilterSpecies}
                filterStatus={store.filterStatus}
                setFilterStatus={store.setFilterStatus}
                isGuest={!isEditor}
              />
            </div>
          )}

          {activeTab === 'hedges' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Живые изгороди</div>
                <div className="text-xs text-[var(--stone)]">Линейные объекты озеленения</div>
              </div>
              <HedgeCatalogView
                hedges={hedgeStore.hedges}
                onSelect={handleSelectHedge}
                onEdit={isEditor ? handleHedgeEdit : () => {}}
                onDelete={isEditor ? hedgeStore.deleteHedge : () => {}}
                isGuest={!isEditor}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Статистика</div>
                <div className="text-xs text-[var(--stone)]">По всем объектам учёта</div>
              </div>
              <StatsView trees={store.trees} hedges={hedgeStore.hedges} />
            </div>
          )}

          {activeTab === 'import' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Импорт и Экспорт</div>
                <div className="text-xs text-[var(--stone)]">Обмен данными с другими системами</div>
              </div>
              <ImportExportView trees={store.trees} onImport={store.importTrees} importProgress={store.importProgress} isGuest={isGuest} />
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

          {activeTab === 'admin' && isAdmin && user && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-white/60">
                <div className="font-semibold text-[var(--forest-dark)] font-heading">Пользователи</div>
                <div className="text-xs text-[var(--stone)]">Управление правами доступа</div>
              </div>
              <AdminView currentUser={user} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden flex border-t border-[var(--border)] bg-white shrink-0 z-10">
        {visibleTabs.map(tab => (
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

      {/* Hedge form dialog */}
      <HedgeFormDialog
        open={hedgeFormOpen}
        onClose={() => { setHedgeFormOpen(false); setEditingHedge(null); }}
        onSave={handleHedgeSave}
        points={pendingHedgePoints}
        lengthM={pendingHedgeLength}
        editing={editingHedge}
      />
    </div>
  );
}