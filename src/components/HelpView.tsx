import Icon from '@/components/ui/icon';

const sections = [
  {
    icon: 'Map',
    title: 'Карта',
    color: 'text-[var(--forest-mid)]',
    bg: 'bg-[var(--forest-pale)]',
    items: [
      'Нажмите «Добавить дерево», затем кликните на карту — откроется форма создания объекта',
      'Кликните на маркер дерева для просмотра краткой информации',
      'Используйте колёсико мыши для масштабирования карты',
      'Маркеры окрашены по состоянию деревьев (см. легенду на карте)',
    ],
  },
  {
    icon: 'List',
    title: 'Каталог',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    items: [
      'Просматривайте все объекты учёта в виде карточек',
      'Фильтруйте по породе, состоянию и диаметру',
      'Кликните на карточку — маркер на карте выделится',
      'Используйте поиск по названию или породе',
    ],
  },
  {
    icon: 'BarChart2',
    title: 'Статистика',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    items: [
      'Диаграмма по состоянию деревьев (круговая)',
      'Распределение по породам (столбчатая)',
      'Сводные показатели: среднее, количество',
      'Автоматическое выделение аварийных объектов',
    ],
  },
  {
    icon: 'Upload',
    title: 'Импорт',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    items: [
      'Загрузите KML файл из Google Earth или QGIS',
      'Импорт JSON — резервная копия из этой системы',
      'После импорта KML уточните породу в каталоге',
    ],
  },
  {
    icon: 'Download',
    title: 'Экспорт',
    color: 'text-green-600',
    bg: 'bg-green-50',
    items: [
      'KML — для Google Earth, QGIS, Яндекс.Карты',
      'CSV — таблица для Microsoft Excel / Google Таблицы',
      'JSON — полная резервная копия данных',
    ],
  },
];

export default function HelpView() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="forest-bg rounded-xl p-5 text-white">
        <div className="text-xl font-bold font-heading mb-1">Дендрологическая ведомость</div>
        <div className="text-sm text-white/70">Система учёта и инвентаризации деревьев</div>
        <div className="mt-3 flex gap-4 text-xs text-white/60">
          <span>Версия 1.0</span>
          <span>•</span>
          <span>Формат ГОСТ Р</span>
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.title} className="bg-white rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 ${section.bg} rounded-lg flex items-center justify-center`}>
              <Icon name={section.icon as "Map"} fallback="HelpCircle" size={16} className={section.color} />
            </div>
            <div className="font-semibold text-[var(--forest-dark)] font-heading text-sm">{section.title}</div>
          </div>
          <ul className="space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--stone)]">
                <span className="text-[var(--forest-mid)] shrink-0 mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Fields reference */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="font-semibold text-[var(--forest-dark)] font-heading text-sm mb-3 flex items-center gap-2">
          <Icon name="BookOpen" size={16} className="text-[var(--stone)]" />
          Поля ведомости
        </div>
        <div className="space-y-2">
          {[
            ['Наименование', 'Индивидуальное обозначение объекта (Берёза №1)'],
            ['Порода', 'Ботаническое наименование вида'],
            ['Диаметр ствола', 'Измеряется на высоте 1,3 м от земли (ГОСТт)'],
            ['Высота', 'Общая высота дерева в метрах'],
            ['Количество', 'Число стволов в точке учёта'],
            ['Возраст', 'Примерный возраст в годах'],
            ['Состояние', 'Хорошее / Удовл. / Неудовл. / Сухостой / Аварийное'],
          ].map(([field, desc]) => (
            <div key={field} className="flex gap-3 text-xs">
              <span className="font-medium text-[var(--forest-dark)] shrink-0 w-28">{field}</span>
              <span className="text-[var(--stone)]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
