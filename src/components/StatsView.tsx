import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TreeMarker, HedgeRow, STATUS_LABELS, STATUS_COLORS } from '@/types/tree';
import Icon from '@/components/ui/icon';

interface Props {
  trees: TreeMarker[];
  hedges?: HedgeRow[];
}

const COLORS_CHART = ['#2d6a4f', '#52b788', '#95d5b2', '#d4a017', '#8b5e3c', '#c0392b', '#6b7c6e', '#1a3a2a'];

export default function StatsView({ trees, hedges = [] }: Props) {
  const stats = useMemo(() => {
    const total = trees.reduce((s, t) => s + t.count, 0);
    const totalArea = trees.length;
    const avgDiameter = trees.length ? (trees.reduce((s, t) => s + t.diameter, 0) / trees.length).toFixed(1) : 0;
    const avgHeight = trees.length ? (trees.reduce((s, t) => s + t.height, 0) / trees.length).toFixed(1) : 0;

    const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
      name: label,
      value: trees.filter(t => t.status === key).reduce((s, t) => s + t.count, 0),
      color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
    })).filter(d => d.value > 0);

    const bySpecies = Object.entries(
      trees.reduce((acc, t) => {
        acc[t.species] = (acc[t.species] ?? 0) + t.count;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([name, count], i) => ({ name: name.split(' ')[0], count, fill: COLORS_CHART[i % COLORS_CHART.length] }))
      .sort((a, b) => b.count - a.count);

    const emergency = trees.filter(t => t.status === 'emergency').reduce((s, t) => s + t.count, 0);
    const bad = trees.filter(t => t.status === 'bad').reduce((s, t) => s + t.count, 0);

    return { total, totalArea, avgDiameter, avgHeight, byStatus, bySpecies, emergency, bad };
  }, [trees]);

  const hedgeStats = useMemo(() => {
    const count = hedges.length;
    const totalLength = hedges.reduce((s, h) => s + (h.lengthM ?? 0), 0);
    const byStatus = Object.entries(STATUS_LABELS).map(([key, label]) => ({
      name: label,
      value: hedges.filter(h => h.status === key).length,
      color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
    })).filter(d => d.value > 0);
    return { count, totalLength, byStatus };
  }, [hedges]);

  const metrics = [
    { label: 'Всего деревьев', value: stats.total, icon: 'TreePine', color: 'text-[var(--forest-mid)]', bg: 'bg-[var(--forest-pale)]' },
    { label: 'Объектов учёта', value: stats.totalArea, icon: 'MapPin', color: 'text-[var(--forest-dark)]', bg: 'bg-green-50' },
    { label: 'Средний диаметр', value: `${stats.avgDiameter} см`, icon: 'Ruler', color: 'text-[var(--bark)]', bg: 'bg-amber-50' },
    { label: 'Средняя высота', value: `${stats.avgHeight} м`, icon: 'ArrowUp', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-[var(--border)] p-4 animate-fade-in">
            <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-2`}>
              <Icon name={m.icon} fallback="TreePine" size={18} className={m.color} />
            </div>
            <div className={`text-2xl font-bold font-heading ${m.color}`}>{m.value}</div>
            <div className="text-xs text-[var(--stone)] mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(stats.emergency > 0 || stats.bad > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
          <div className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <Icon name="AlertTriangle" size={16} />
            Требуют внимания
          </div>
          {stats.emergency > 0 && (
            <div className="text-xs text-red-600">⚠️ Аварийных: <b>{stats.emergency} шт</b> — требуется срочная вырубка</div>
          )}
          {stats.bad > 0 && (
            <div className="text-xs text-red-500">⚡ Неудовл.: <b>{stats.bad} шт</b> — требуется обработка</div>
          )}
        </div>
      )}

      {/* Status chart */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="font-semibold text-[var(--forest-dark)] font-heading text-sm mb-3">По состоянию</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={stats.byStatus}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {stats.byStatus.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v} шт`, '']} />
            <Legend
              formatter={(v) => <span style={{ fontSize: 11, color: '#6b7c6e' }}>{v}</span>}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Hedgerows block */}
      {hedgeStats.count > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-4 space-y-3">
          <div className="font-semibold text-[var(--forest-dark)] font-heading text-sm flex items-center gap-2">
            🌿 Живые изгороди
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold font-heading text-green-700">{hedgeStats.count}</div>
              <div className="text-xs text-[var(--stone)] mt-0.5">Объектов</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold font-heading text-green-700">
                {hedgeStats.totalLength >= 1000
                  ? `${(hedgeStats.totalLength / 1000).toFixed(2)} км`
                  : `${hedgeStats.totalLength.toFixed(0)} м`}
              </div>
              <div className="text-xs text-[var(--stone)] mt-0.5">Суммарная длина</div>
            </div>
          </div>
          {hedgeStats.byStatus.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--stone)]">По состоянию</div>
              {hedgeStats.byStatus.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <div className="text-xs text-gray-600 flex-1">{s.name}</div>
                  <div className="text-xs font-semibold text-[var(--forest-dark)]">{s.value} шт</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Species chart */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="font-semibold text-[var(--forest-dark)] font-heading text-sm mb-3">По породам</div>
        <ResponsiveContainer width="100%" height={Math.max(120, stats.bySpecies.length * 32)}>
          <BarChart data={stats.bySpecies} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => [`${v} шт`, 'Количество']} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {stats.bySpecies.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}