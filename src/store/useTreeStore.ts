import { useState, useCallback, useEffect, useMemo } from 'react';
import { TreeMarker, TreeStatus } from '@/types/tree';
import { useDebounce } from '@/hooks/useDebounce';
import { readCache, writeCache } from '@/hooks/useSessionCache';
import { API, STORAGE_KEYS } from '@/config/api';

const TREES_URL = API.TREES;
const CACHE_KEY = STORAGE_KEYS.TREES_CACHE;

export function useTreeStore() {
  const [trees, setTrees] = useState<TreeMarker[]>(() => readCache<TreeMarker[]>(CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => !readCache<TreeMarker[]>(CACHE_KEY));
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TreeStatus | ''>('');
  const [filterDiameterMin, setFilterDiameterMin] = useState<number>(0);
  const [filterDiameterMax, setFilterDiameterMax] = useState<number>(200);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetch(TREES_URL)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTrees(data);
          writeCache(CACHE_KEY, data);
        }
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
    setTrees(prev => {
      const next = [...prev, newTree];
      writeCache(CACHE_KEY, next);
      return next;
    });
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
    setTrees(prev => {
      const next = prev.map(t => t.id === id ? updated : t);
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, [trees]);

  const deleteTree = useCallback(async (id: string) => {
    setSelectedTreeId(prev => (prev === id ? null : prev));
    setTrees(prev => {
      const next = prev.filter(t => t.id !== id);
      writeCache(CACHE_KEY, next);
      return next;
    });
    await fetch(`${TREES_URL}?id=${id}`, { method: 'DELETE' });
  }, []);

  const deleteTreesBefore = useCallback(async (fromDate: string, toDate: string) => {
    const toDelete = trees.filter(t => {
      if (fromDate && t.createdAt < fromDate) return false;
      if (toDate && t.createdAt > toDate) return false;
      return true;
    });
    if (toDelete.length === 0) return;
    const ids = toDelete.map(t => t.id);
    setSelectedTreeId(prev => (ids.includes(prev ?? '') ? null : prev));
    setTrees(prev => {
      const next = prev.filter(t => !ids.includes(t.id));
      writeCache(CACHE_KEY, next);
      return next;
    });
    await fetch(TREES_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }, [trees]);

  const updateManyTrees = useCallback(async (ids: string[], updates: Partial<TreeMarker>) => {
    const res = await fetch(TREES_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    const updated: TreeMarker[] = await res.json();
    if (Array.isArray(updated)) {
      setTrees(prev => {
        const next = prev.map(t => {
          const u = updated.find(u => u.id === t.id);
          return u ? u : t;
        });
        writeCache(CACHE_KEY, next);
        return next;
      });
    }
  }, []);

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
    setTrees(prev => {
      const next = [...(Array.isArray(added) ? added : []), ...prev];
      writeCache(CACHE_KEY, next);
      return next;
    });
    setTimeout(() => setImportProgress(null), 800);
  }, []);

  const filteredTrees = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return trees.filter(tree => {
      if (filterSpecies && tree.species !== filterSpecies) return false;
      if (filterStatus && tree.status !== filterStatus) return false;
      if (tree.diameter < filterDiameterMin || tree.diameter > filterDiameterMax) return false;
      if (q && !tree.name.toLowerCase().includes(q) && !tree.species.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [trees, filterSpecies, filterStatus, filterDiameterMin, filterDiameterMax, debouncedSearch]);

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