import { MapLayer, LAYERS } from '@/utils/mapLayers';

interface Props {
  activeLayer: MapLayer;
  open: boolean;
  onToggle: () => void;
  onSelect: (layer: MapLayer) => void;
}

export default function MapLayerSwitcher({ activeLayer, open, onToggle, onSelect }: Props) {
  return (
    <div className="absolute top-16 right-4 z-[1000] flex flex-col items-end gap-1">
      <button
        onClick={onToggle}
        title="Слои карты"
        className={`w-11 h-11 flex items-center justify-center rounded-xl shadow-lg text-lg transition-all active:scale-95
          ${open ? 'bg-[var(--forest-mid)] text-white' : 'bg-white/95 text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'}`}
      >
        🗂
      </button>
      {open && (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex flex-col">
          {(Object.entries(LAYERS) as [MapLayer, { label: string; icon: string }][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all
                ${activeLayer === key
                  ? 'bg-[var(--forest-mid)] text-white'
                  : 'text-[var(--forest-dark)] hover:bg-[var(--forest-pale)]'
                }`}
            >
              <span>{val.icon}</span>
              <span>{val.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
