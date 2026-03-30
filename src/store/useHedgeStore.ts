import { useState, useCallback, useEffect } from 'react';
import { HedgeRow } from '@/types/tree';

const HEDGES_URL = 'https://functions.poehali.dev/fbccade8-1a6c-460a-bbe4-c25ceb03129c';

export function useHedgeStore() {
  const [hedges, setHedges] = useState<HedgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHedgeId, setSelectedHedgeId] = useState<string | null>(null);

  useEffect(() => {
    fetch(HEDGES_URL)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHedges(data);
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
    setHedges(prev => [...prev, newHedge]);
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
    setHedges(prev => prev.map(h => h.id === id ? updated : h));
  }, [hedges]);

  const deleteHedge = useCallback(async (id: string) => {
    setSelectedHedgeId(prev => (prev === id ? null : prev));
    await fetch(`${HEDGES_URL}?id=${id}`, { method: 'DELETE' });
    const res = await fetch(HEDGES_URL);
    const data = await res.json();
    if (Array.isArray(data)) setHedges(data);
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
