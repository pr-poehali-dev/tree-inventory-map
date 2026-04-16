import { useState, useCallback, useEffect } from 'react';
import { HedgeRow } from '@/types';
import { readCache, writeCache } from '@/hooks/useSessionCache';
import { API, STORAGE_KEYS } from '@/config/api';

const HEDGES_URL = API.HEDGES;
const CACHE_KEY = STORAGE_KEYS.HEDGES_CACHE;

export function useHedgeStore() {
  const [hedges, setHedges] = useState<HedgeRow[]>(() => readCache<HedgeRow[]>(CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => !readCache<HedgeRow[]>(CACHE_KEY));
  const [selectedHedgeId, setSelectedHedgeId] = useState<string | null>(null);

  useEffect(() => {
    fetch(HEDGES_URL)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHedges(data);
          writeCache(CACHE_KEY, data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const addHedge = useCallback(async (hedge: Omit<HedgeRow, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => {
    const token = localStorage.getItem('tree_auth_token') || '';
    const res = await fetch(HEDGES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify(hedge),
    });
    const newHedge: HedgeRow = await res.json();
    setHedges(prev => {
      const next = [...prev, newHedge];
      writeCache(CACHE_KEY, next);
      return next;
    });
    return newHedge;
  }, []);

  const updateHedge = useCallback(async (id: string, updates: Partial<HedgeRow>) => {
    const existing = hedges.find(h => h.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const res = await fetch(`${HEDGES_URL}?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    const updated: HedgeRow = await res.json();
    setHedges(prev => {
      const next = prev.map(h => h.id === id ? updated : h);
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, [hedges]);

  const deleteHedge = useCallback(async (id: string) => {
    setSelectedHedgeId(prev => (prev === id ? null : prev));
    setHedges(prev => {
      const next = prev.filter(h => h.id !== id);
      writeCache(CACHE_KEY, next);
      return next;
    });
    await fetch(`${HEDGES_URL}?id=${id}`, { method: 'DELETE' });
  }, []);

  const selectedHedge = hedges.find(h => h.id === selectedHedgeId) ?? null;

  return {
    hedges,
    loading,
    selectedHedge,
    selectedHedgeId,
    setSelectedHedgeId,
    addHedge,
    updateHedge,
    deleteHedge,
  };
}