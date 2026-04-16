import { HEDGE_COLOR } from '@/types';

interface Props {
  open: boolean;
  onToggle: () => void;
}

const STATUS_ITEMS = [
  { color: '#2d6a4f', label: 'Хорошее' },
  { color: '#52b788', label: 'Удовлетворительное' },
  { color: '#d4a017', label: 'Неудовл.' },
  { color: '#8b5e3c', label: 'Сухостой' },
  { color: '#c0392b', label: 'Аварийное' },
];

const TYPE_ITEMS = [
  { emoji: '🌳', label: 'Лиственные' },
  { emoji: '🌲', label: 'Хвойные' },
  { emoji: '🌿', label: 'Кустарники' },
  { emoji: '🔴', label: 'Спиленное' },
];

export default function MapLegend({ open, onToggle }: Props) {
  return (
    <div className="absolute bottom-8 left-4 z-[1000] flex flex-col items-start gap-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg bg-white/95 backdrop-blur-sm text-[var(--forest-dark)] hover:bg-[var(--forest-pale)] transition-all"
      >
        <span>🗺</span> Условные знаки {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg text-xs">
          <div className="font-semibold text-[var(--forest-dark)] mb-2 font-heading">Состояние</div>
          {STATUS_ITEMS.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 py-0.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
          <div className="font-semibold text-[var(--forest-dark)] mt-2 mb-1 font-heading">Тип</div>
          {TYPE_ITEMS.map(({ emoji, label }) => (
            <div key={label} className="flex items-center gap-2 py-0.5">
              <span className="text-sm">{emoji}</span>
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
          <div className="font-semibold text-[var(--forest-dark)] mt-2 mb-1 font-heading">Линейные объекты</div>
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-8 h-1.5 rounded-full shrink-0" style={{ background: HEDGE_COLOR }} />
            <span className="text-gray-600">Живая изгородь</span>
          </div>
        </div>
      )}
    </div>
  );
}
