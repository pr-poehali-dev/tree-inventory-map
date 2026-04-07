import { useState, useCallback, useEffect } from 'react';
import { TreeMarker, TreeStatus } from '@/types/tree';

const TREES_URL = 'https://functions.poehali.dev/1b6d0efc-fd2f-47f8-bbb8-13e7b83d6536';

export function useTreeStore() {
  const [trees, setTrees] = useState<TreeMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TreeStatus | ''>('');
  const [filterDiameterMin, setFilterDiameterMin] = useState<number>(0);
  const [filterDiameterMax, setFilterDiameterMax] = useState<number>(200);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetch(TREES_URL)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTrees(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const addTree = useCallback(async (tree: Omit<TreeMarker, 'id' | 'createdAt' | 'updatedAt'>) => {
    const token = localStorage.getItem('tree_auth_token') || '';
    const res = await fetch(TREES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify(tree),
    });
    const newTree: TreeMarker = await res.json();
    setTrees(prev => [...prev, newTree]);
    return newTree;
  }, []);

  const updateTree = useCallback(async (id: string, updates: Partial<TreeMarker>) => {
    const existing = trees.find(t => t.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const res = await fetch(`${TREES_URL}?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    const updated: TreeMarker = await res.json();
    setTrees(prev => prev.map(t => t.id === id ? updated : t));
  }, [trees]);

  const deleteTree = useCallback(async (id: string) => {
    setSelectedTreeId(prev => (prev === id ? null : prev));
    await fetch(`${TREES_URL}?id=${id}`, { method: 'DELETE' });
    const res = await fetch(TREES_URL);
    const data = await res.json();
    if (Array.isArray(data)) setTrees(data);
  }, []);

  const deleteTreesBefore = useCallback(async (fromDate: string, toDate: string) => {
    const toDelete = trees.filter(t => {
      if (fromDate && t.createdAt < fromDate) return false;
      if (toDate && t.createdAt > toDate) return false;
      return true;
    });
    for (const tree of toDelete) {
      setSelectedTreeId(prev => (prev === tree.id ? null : prev));
      await fetch(`${TREES_URL}?id=${tree.id}`, { method: 'DELETE' });
    }
    const res = await fetch(TREES_URL);
    const data = await res.json();
    if (Array.isArray(data)) setTrees(data);
  }, [trees]);

  const updateManyTrees = useCallback(async (ids: string[], updates: Partial<TreeMarker>) => {
    for (const id of ids) {
      const existing = trees.find(t => t.id === id);
      if (!existing) continue;
      const merged = { ...existing, ...updates };
      const res = await fetch(`${TREES_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const updated: TreeMarker = await res.json();
      setTrees(prev => prev.map(t => t.id === id ? updated : t));
    }
  }, [trees]);

  const importTrees = useCallback(async (newTrees: TreeMarker[]) => {
    if (newTrees.length === 0) return;
    setImportProgress({ current: 0, total: newTrees.length });
    const res = await fetch(TREES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrees),
    });
    const added: TreeMarker[] = await res.json();
    setImportProgress({ current: newTrees.length, total: newTrees.length });
    setTrees(prev => [...(Array.isArray(added) ? added : []), ...prev]);
    setTimeout(() => setImportProgress(null), 800);
  }, []);

  const filteredTrees = trees.filter(tree => {
    if (filterSpecies && tree.species !== filterSpecies) return false;
    if (filterStatus && tree.status !== filterStatus) return false;
    if (tree.diameter < filterDiameterMin || tree.diameter > filterDiameterMax) return false;
    if (
      searchQuery &&
      !tree.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tree.species.toLowerCase().includes(searchQuery.toLowerCase())
    ) return false;
    return true;
  });

  const selectedTree = trees.find(t => t.id === selectedTreeId) ?? null;

  return {
    trees,
    loading,
    importProgress,
    filteredTrees,
    selectedTree,
    selectedTreeId,
    setSelectedTreeId,
    addTree,
    updateTree,
    updateManyTrees,
    deleteTree,
    deleteTreesBefore,
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