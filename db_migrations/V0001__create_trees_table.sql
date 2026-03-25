CREATE TABLE trees (
  id          TEXT PRIMARY KEY,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL,
  diameter    INTEGER NOT NULL DEFAULT 20,
  height      NUMERIC(5,1) NOT NULL DEFAULT 8,
  count       INTEGER NOT NULL DEFAULT 1,
  age         INTEGER,
  status      TEXT NOT NULL DEFAULT 'good',
  condition   TEXT NOT NULL DEFAULT 'healthy',
  description TEXT,
  photo_url   TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

INSERT INTO trees (id, lat, lng, name, species, diameter, height, count, age, status, condition, description, created_at, updated_at) VALUES
('1', 55.7522, 37.6156, 'Берёза №1',    'Берёза повислая',     28, 14, 1, 45,  'good',         'healthy',           'Расположена у главного входа', '2024-03-15', '2024-03-15'),
('2', 55.7535, 37.617,  'Дуб №1',       'Дуб черешчатый',      65, 22, 1, 120, 'satisfactory', 'weakened',          'Вековой дуб, требует наблюдения', '2024-03-15', '2024-03-15'),
('3', 55.751,  37.6175, 'Ель №3',       'Ель обыкновенная',    32, 18, 3, 55,  'good',         'healthy',           NULL, '2024-03-15', '2024-03-15'),
('4', 55.7528, 37.614,  'Тополь №2',    'Тополь пирамидальный',42, 28, 2, 30,  'emergency',    'dying',             'Требует срочной вырубки', '2024-03-10', '2024-04-01'),
('5', 55.7515, 37.6162, 'Клён №1',      'Клён остролистный',   22, 10, 4, 25,  'bad',          'strongly_weakened', NULL, '2024-03-15', '2024-03-15');
