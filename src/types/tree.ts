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

export const SPECIES_GROUPS: { group: string; icon: string; items: string[] }[] = [
  {
    group: 'Деревья хвойные',
    icon: '🌲',
    items: [
      'Ель обыкновенная',
      'Ель колючая (голубая)',
      'Сосна обыкновенная',
      'Сосна сибирская (кедр)',
      'Лиственница сибирская',
      'Пихта сибирская',
    ],
  },
  {
    group: 'Деревья лиственные',
    icon: '🌳',
    items: [
      'Берёза повислая',
      'Берёза пушистая',
      'Дуб черешчатый',
      'Липа мелколистная',
      'Клён остролистный',
      'Клён татарский',
      'Тополь пирамидальный',
      'Тополь белый',
      'Тополь бальзамический',
      'Ясень обыкновенный',
      'Ива белая',
      'Ива плакучая',
      'Ива ломкая',
      'Вяз гладкий',
      'Вяз мелколистный',
      'Осина',
      'Ольха чёрная',
      'Ольха серая',
      'Черёмуха обыкновенная',
      'Рябина обыкновенная',
      'Яблоня лесная',
      'Яблоня ягодная',
      'Груша обыкновенная',
      'Каштан конский',
    ],
  },
  {
    group: 'Кустарники',
    icon: '🌿',
    items: [
      'Сирень обыкновенная',
      'Сирень венгерская',
      'Акация жёлтая (карагана)',
      'Жимолость татарская',
      'Жимолость обыкновенная',
      'Боярышник кроваво-красный',
      'Боярышник сибирский',
      'Шиповник майский',
      'Шиповник морщинистый',
      'Смородина золотистая',
      'Смородина чёрная',
      'Калина обыкновенная',
      'Бузина красная',
      'Бузина чёрная',
      'Спирея средняя',
      'Спирея иволистная',
      'Спирея японская',
      'Дёрен белый',
      'Барбарис обыкновенный',
      'Барбарис Тунберга',
      'Снежноягодник белый',
      'Пузыреплодник калинолистный',
      'Чубушник венечный (жасмин)',
      'Ирга обыкновенная',
      'Облепиха крушиновидная',
      'Лапчатка кустарниковая',
      'Роза ругоза (морщинистая)',
      'Роза кустарниковая',
      'Крыжовник обыкновенный',
      'Малина обыкновенная',
    ],
  },
];

export const SPECIES_LIST = SPECIES_GROUPS.flatMap(g => g.items);

export const CONDITION_LABELS: Record<TreeCondition, string> = {
  healthy: 'Здоровое',
  weakened: 'Ослабленное',
  strongly_weakened: 'Сильно ослабленное',
  dying: 'Усыхающее',
  dead: 'Погибшее',
};