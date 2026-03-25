export type TreeStatus = 'good' | 'satisfactory' | 'bad' | 'dry' | 'emergency';
export type TreeCondition = 'healthy' | 'weakened' | 'strongly_weakened' | 'dying' | 'dead';

export interface TreeMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  species: string;
  diameter: number;
  height: number;
  count: number;
  age?: number;
  status: TreeStatus;
  condition: TreeCondition;
  description?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<TreeStatus, string> = {
  good: 'Хорошее',
  satisfactory: 'Удовлетворительное',
  bad: 'Неудовлетворительное',
  dry: 'Сухостой',
  emergency: 'Аварийное',
};

export const STATUS_COLORS: Record<TreeStatus, string> = {
  good: '#2d6a4f',
  satisfactory: '#52b788',
  bad: '#d4a017',
  dry: '#8b5e3c',
  emergency: '#c0392b',
};

export const SPECIES_LIST = [
  'Берёза повислая',
  'Дуб черешчатый',
  'Ель обыкновенная',
  'Липа мелколистная',
  'Клён остролистный',
  'Сосна обыкновенная',
  'Тополь пирамидальный',
  'Ясень обыкновенный',
  'Яблоня',
  'Рябина обыкновенная',
  'Ива плакучая',
  'Каштан конский',
  'Вяз гладкий',
  'Осина',
  'Черёмуха обыкновенная',
];

export const CONDITION_LABELS: Record<TreeCondition, string> = {
  healthy: 'Здоровое',
  weakened: 'Ослабленное',
  strongly_weakened: 'Сильно ослабленное',
  dying: 'Усыхающее',
  dead: 'Погибшее',
};
