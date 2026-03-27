import { useState } from 'react';
import { TreeMarker, STATUS_LABELS, STATUS_COLORS, CONDITION_LABELS } from '@/types/tree';

interface Props {
  tree: TreeMarker;
  onEdit: (tree: TreeMarker) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export default function TreePopup({ tree, onEdit, onDelete, onSelect }: Props) {
  const statusColor = STATUS_COLORS[tree.status];
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="p-3 min-w-[240px] font-sans">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          {tree.number && (
            <div className="text-[10px] font-bold text-[#2d6a4f] mb-0.5">№ {tree.number}</div>
          )}
          <div className="font-semibold text-[#1a3a2a] text-sm">{tree.name}</div>
          <div className="text-xs text-[#6b7c6e]">{tree.species}</div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
          style={{ background: statusColor }}
        >
          {STATUS_LABELS[tree.status]}
        </span>
      </div>

      {tree.photoUrl && (
        <img
          src={tree.photoUrl}
          alt={tree.name}
          className="w-full h-24 object-cover rounded-lg mb-2"
        />
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
        <div className="text-[#6b7c6e]">Диаметр</div>
        <div className="font-medium text-[#1a3a2a]">{tree.diameter} см</div>
        <div className="text-[#6b7c6e]">Высота</div>
        <div className="font-medium text-[#1a3a2a]">{tree.height} м</div>
        <div className="text-[#6b7c6e]">Количество</div>
        <div className="font-medium text-[#1a3a2a]">{tree.count} шт</div>
        {tree.age && (
          <>
            <div className="text-[#6b7c6e]">Возраст</div>
            <div className="font-medium text-[#1a3a2a]">{tree.age} лет</div>
          </>
        )}
        <div className="text-[#6b7c6e]">Категория</div>
        <div className="font-medium text-[#1a3a2a]">{CONDITION_LABELS[tree.condition]}</div>
        <div className="text-[#6b7c6e]">Состояние</div>
        <div className={`font-medium text-sm ${tree.lifeStatus === 'cut' ? 'text-gray-500' : 'text-green-700'}`}>
          {tree.lifeStatus === 'cut' ? '🪵 Спиленное' : '🌿 Живое'}
        </div>
        <div className="text-[#6b7c6e]">Координаты</div>
        <div className="font-mono text-[10px] text-[#1a3a2a]">{tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}</div>
      </div>

      {tree.address && (
        <div className="flex items-start gap-1.5 text-xs mb-2 border-t border-gray-100 pt-2">
          <span className="text-[#6b7c6e] shrink-0">📍</span>
          <span className="text-[#1a3a2a] font-medium">{tree.address}</span>
        </div>
      )}

      {tree.description && (
        <div className="text-xs text-[#6b7c6e] italic mb-2 border-t border-gray-100 pt-2">
          {tree.description}
        </div>
      )}

      {tree.createdByName && (
        <div className="flex items-center gap-1 text-[10px] text-[#6b7c6e] mb-2 border-t border-gray-100 pt-2">
          <span>👤</span>
          <span>Добавил: <span className="font-medium text-[#1a3a2a]">{tree.createdByName}</span></span>
        </div>
      )}

      {confirm && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 font-medium mb-2">Удалить это дерево?</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 text-xs py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              onClick={() => onDelete(tree.id)}
              className="flex-1 text-xs py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
            >
              Удалить
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 pt-1 border-t border-gray-100">
        <button
          onClick={() => onEdit(tree)}
          className="flex-1 text-xs py-1.5 rounded-md border border-[#2d6a4f]/30 text-[#2d6a4f] hover:bg-[#d8f3dc] transition-colors font-medium"
        >
          ✏️ Изменить
        </button>
        <button
          onClick={() => onSelect(tree.id)}
          className="flex-1 text-xs py-1.5 rounded-md bg-[#2d6a4f] text-white hover:bg-[#1a3a2a] transition-colors font-medium"
        >
          📋 Детали
        </button>
        <button
          onClick={() => setConfirm(true)}
          className="text-xs px-2 py-1.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          🗑
        </button>
      </div>
    </div>
  );
}