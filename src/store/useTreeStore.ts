import { useState, useCallback } from 'react';
import { TreeMarker, TreeStatus } from '@/types/tree';

const MOCK_TREES: TreeMarker[] = [
  {
    id: '1',
    lat: 53.7102,
    lng: 91.6886,
    name: 'Берёза №1',
    species: 'Берёза повислая',
    diameter: 28,
    height: 14,
    count: 1,
    age: 45,
    status: 'good',
    condition: 'healthy',
    description: 'Центральный парк, ул. Ленина',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15',
  },
  {
    id: '2',
    lat: 53.7145,
    lng: 91.6920,
    name: 'Дуб №1',
    species: 'Дуб черешчатый',
    diameter: 65,
    height: 22,
    count: 1,
    age: 120,
    status: 'satisfactory',
    condition: 'weakened',
    description: 'Вековой дуб, требует наблюдения',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15',
  },
  {
    id: '3',
    lat: 53.7080,
    lng: 91.6850,
    name: 'Ель №3',
    species: 'Ель обыкновенная',
    diameter: 32,
    height: 18,
    count: 3,
    age: 55,
    status: 'good',
    condition: 'healthy',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15',
  },
  {
    id: '4',
    lat: 53.7065,
    lng: 91.6910,
    name: 'Тополь №2',
    species: 'Тополь пирамидальный',
    diameter: 42,
    height: 28,
    count: 2,
    age: 30,
    status: 'emergency',
    condition: 'dying',
    description: 'Требует срочной вырубки',
    createdAt: '2024-03-10',
    updatedAt: '2024-04-01',
  },
  {
    id: '5',
    lat: 53.7120,
    lng: 91.6830,
    name: 'Клён №1',
    species: 'Клён остролистный',
    diameter: 22,
    height: 10,
    count: 4,
    age: 25,
    status: 'bad',
    condition: 'strongly_weakened',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-15',
  },
];

let treeIdCounter = 6;

export function useTreeStore() {
  const [trees, setTrees] = useState<TreeMarker[]>(MOCK_TREES);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TreeStatus | ''>('');
  const [filterDiameterMin, setFilterDiameterMin] = useState<number>(0);
  const [filterDiameterMax, setFilterDiameterMax] = useState<number>(200);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const addTree = useCallback((tree: Omit<TreeMarker, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTree: TreeMarker = {
      ...tree,
      id: String(treeIdCounter++),
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setTrees(prev => [...prev, newTree]);
    return newTree;
  }, []);

  const updateTree = useCallback((id: string, updates: Partial<TreeMarker>) => {
    setTrees(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, ...updates, updatedAt: new Date().toISOString().split('T')[0] }
          : t
      )
    );
  }, []);

  const deleteTree = useCallback((id: string) => {
    setTrees(prev => prev.filter(t => t.id !== id));
    setSelectedTreeId(prev => (prev === id ? null : prev));
  }, []);

  const importTrees = useCallback((newTrees: TreeMarker[]) => {
    setTrees(prev => [...prev, ...newTrees]);
  }, []);

  const filteredTrees = trees.filter(tree => {
    if (filterSpecies && tree.species !== filterSpecies) return false;
    if (filterStatus && tree.status !== filterStatus) return false;
    if (tree.diameter < filterDiameterMin || tree.diameter > filterDiameterMax) return false;
    if (
      searchQuery &&
      !tree.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tree.species.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const selectedTree = trees.find(t => t.id === selectedTreeId) ?? null;

  return {
    trees,
    filteredTrees,
    selectedTree,
    selectedTreeId,
    setSelectedTreeId,
    addTree,
    updateTree,
    deleteTree,
    importTrees,
    filterSpecies,
    setFilterSpecies,
    filterStatus,
    setFilterStatus,
    filterDiameterMin,
    setFilterDiameterMin,
    filterDiameterMax,
    setFilterDiameterMax,
    searchQuery,
    setSearchQuery,
  };
}