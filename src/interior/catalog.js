// Interior of one room per project: finishing options, style presets, the furniture catalogue and default layouts.
// Models: Poly Haven (CC0, real-world scale, glTF with 1–2k PBR textures); items marked `proc` are built in
// items.js (modern pieces the CC0 libraries lack: sofas, TV wall unit, TVs, rugs, shelves, floor lamp, posters).

export const THUMBS = 'interior/thumbs/';

// ---------------------------------------------------------------- finishes
export const WALL_COLORS = [
  { id: 'white', label: 'Белый', color: '#f2f0eb' },
  { id: 'milk', label: 'Молочный', color: '#ebe3d3' },
  { id: 'greige', label: 'Грейж', color: '#cdc4b5' },
  { id: 'sage', label: 'Шалфей', color: '#aab39c' },
  { id: 'clay', label: 'Глина', color: '#c79f86' },
  { id: 'graphite', label: 'Графит', color: '#545659' },
];

export const FINISHES = {
  walls: {
    label: 'Стены',
    items: [
      { id: 'paint', label: 'Окраска', note: 'шпаклёвка, моющаяся краска', set: 'paint', thumb: 'plastered_wall_04', colors: true },
      { id: 'lining', label: 'Вагонка «штиль»', note: 'под покраску или масло', set: 'lining', thumb: 'white_planks_clean', colors: true },
      { id: 'plaster', label: 'Декоративная штукатурка', note: 'фактурная, Ceresit', set: 'plaster', thumb: 'white_stucco_02', colors: true },
      { id: 'microcement', label: 'Микроцемент', note: 'бесшовное покрытие', set: 'microcement', thumb: 'smooth_concrete_floor' },
    ],
  },
  accent: {
    label: 'Акцентная стена (ТВ-зона)',
    items: [
      { id: 'same', label: 'Как стены', note: 'без акцента' },
      { id: 'slats', label: 'Дубовые рейки', note: 'на чёрном войлоке', set: 'oak', thumb: 'oak_veneer_01' },
      { id: 'oak', label: 'Шпон дуба', note: 'стеновые панели', set: 'oak', thumb: 'oak_veneer_01' },
      { id: 'brick', label: 'Белый кирпич', note: 'лофт', set: 'brick', thumb: 'whitewashed_brick' },
      { id: 'marble', label: 'Керамогранит «мрамор»', note: 'слэбы 1200 × 2400', set: 'marble', thumb: 'marble_01' },
      { id: 'microcement', label: 'Микроцемент', note: 'бесшовное покрытие', set: 'microcement', thumb: 'smooth_concrete_floor' },
      { id: 'dark', label: 'Тёмная окраска', note: 'графит', set: 'paint', thumb: 'plastered_wall_04', color: '#3f4042' },
    ],
  },
  floor: {
    label: 'Пол',
    items: [
      { id: 'oakplank', label: 'Инженерная доска', note: 'дуб, широкая', set: 'oakplank', thumb: 'wood_floor', wood: true },
      { id: 'laminate', label: 'Ламинат «дуб»', note: '33 класс', set: 'laminate', thumb: 'laminate_floor_03', wood: true },
      { id: 'parquet', label: 'Паркет «ёлочка»', note: 'массив дуба', set: 'parquet', thumb: 'herringbone_parquet', wood: true },
      { id: 'microcement', label: 'Микроцемент', note: 'с тёплым полом', set: 'microcement', thumb: 'smooth_concrete_floor' },
      { id: 'marble', label: 'Керамогранит', note: 'под мрамор, 600 × 1200', set: 'marble', thumb: 'marble_01' },
    ],
  },
  tone: {
    label: 'Тон дерева',
    items: [
      { id: 'natural', label: 'Натуральный', color: '#a57a4e' },
      { id: 'bleached', label: 'Белёный', color: '#d6c8b2' },
      { id: 'smoked', label: 'Копчёный', color: '#5e4634' },
    ],
  },
  ceiling: {
    label: 'Потолок',
    items: [
      { id: 'paint', label: 'Окраска', note: 'по ГСП PESHELAN', set: 'paint', thumb: 'plastered_wall_04' },
      { id: 'pine', label: 'Вагонка, сосна', note: 'масло, натуральный тон', set: 'pine', thumb: 'kitchen_wood' },
      { id: 'lining', label: 'Вагонка, белая', note: 'лессировка', set: 'lining', thumb: 'white_planks_clean' },
    ],
  },
  beams: {
    label: 'Декоративные балки',
    items: [
      { id: 'none', label: 'Без балок' },
      { id: 'oak', label: 'Дуб', color: '#9c7650' },
      { id: 'dark', label: 'Тёмные', color: '#3a2e25' },
    ],
  },
  trim: {
    label: 'Плинтус, двери, подоконники',
    items: [
      { id: 'white', label: 'Белые', color: '#f1efea' },
      { id: 'oak', label: 'Дуб', color: '#a5794b' },
      { id: 'black', label: 'Графит', color: '#2d2e30' },
    ],
  },
  curtains: {
    label: 'Шторы',
    items: [
      { id: 'none', label: 'Без штор' },
      { id: 'linen', label: 'Лён, светлые', color: '#ddd5c6' },
      { id: 'sand', label: 'Блэкаут, песок', color: '#b19a7c' },
      { id: 'graphite', label: 'Блэкаут, графит', color: '#4a4c4f' },
    ],
  },
};

export const DEFAULT_FINISH = { walls: 'paint', wallColor: 'white', accent: 'slats', floor: 'oakplank', tone: 'natural', ceiling: 'paint', beams: 'none', trim: 'white', curtains: 'linen' };

// ---------------------------------------------------------------- style presets (finishes + furniture per role)
export const STYLES = [
  {
    id: 'scandi', label: 'Скандинавский', note: 'светлые стены, дуб, рейки',
    finish: { walls: 'paint', wallColor: 'white', accent: 'slats', floor: 'oakplank', tone: 'natural', ceiling: 'paint', beams: 'none', trim: 'white', curtains: 'linen' },
    roles: { sofa: 'sofa_straight', corner: 'sofa_corner', chair: 'mid_century_lounge_chair', chair2: 'modern_arm_chair_01', coffee: 'modern_coffee_table_01', coffee2: 'modern_coffee_table_02', unit: 'tv_unit', unitVar: 'white', rug: 'rug_rect', rugVar: 'oat', sofaVar: 'light', side: 'side_table_01', plant: 'potted_plant_01', plant2: 'potted_plant_02', lamp: 'floor_lamp', pendant: 'modern_ceiling_lamp_01', art1: 'poster', art2: 'hanging_picture_frame_02' },
  },
  {
    id: 'eco', label: 'Эко', note: 'вагонка, сосна, натуральный дуб',
    finish: { walls: 'lining', wallColor: 'milk', accent: 'oak', floor: 'parquet', tone: 'natural', ceiling: 'pine', beams: 'oak', trim: 'oak', curtains: 'linen' },
    roles: { sofa: 'sofa_straight', corner: 'sofa_corner', chair: 'Rockingchair_01', chair2: 'mid_century_lounge_chair', coffee: 'coffee_table_round_01', coffee2: 'coffee_table_round_01', unit: 'tv_unit', unitVar: 'oak', rug: 'rug_round', rugVar: 'oat', sofaVar: 'olive', side: 'side_table_tall_01', plant: 'potted_plant_01', plant2: 'potted_plant_02', lamp: 'floor_lamp', pendant: 'modern_ceiling_lamp_01', art1: 'hanging_picture_frame_01', art2: 'hanging_picture_frame_03' },
  },
  {
    id: 'loft', label: 'Лофт', note: 'микроцемент, кирпич, металл',
    finish: { walls: 'microcement', wallColor: 'white', accent: 'brick', floor: 'microcement', tone: 'smoked', ceiling: 'paint', beams: 'dark', trim: 'black', curtains: 'graphite' },
    roles: { sofa: 'sofa_straight', corner: 'sofa_corner', chair: 'mid_century_lounge_chair', chair2: 'GreenChair_01', coffee: 'industrial_coffee_table', coffee2: 'industrial_coffee_table', unit: 'steel_frame_shelves_03', unitVar: 'graphite', rug: 'rug_rect', rugVar: 'graphite', sofaVar: 'cognac', side: 'side_table_tall_01', plant: 'potted_plant_02', plant2: 'potted_plant_01', lamp: 'floor_lamp', pendant: 'hanging_industrial_lamp', art1: 'poster_b', art2: 'wall_clock' },
  },
  {
    id: 'classic', label: 'Современная классика', note: 'штукатурка, мрамор, ёлочка',
    finish: { walls: 'plaster', wallColor: 'greige', accent: 'marble', floor: 'parquet', tone: 'bleached', ceiling: 'paint', beams: 'none', trim: 'white', curtains: 'sand' },
    roles: { sofa: 'sofa_straight', corner: 'sofa_corner', chair: 'ArmChair_01', chair2: 'modern_arm_chair_01', coffee: 'modern_coffee_table_02', coffee2: 'modern_coffee_table_02', unit: 'tv_unit', unitVar: 'graphite', rug: 'rug_rect', rugVar: 'sand', sofaVar: 'sand', side: 'side_table_01', plant: 'potted_plant_01', plant2: 'potted_plant_02', lamp: 'floor_lamp', pendant: 'modern_ceiling_lamp_01', art1: 'fancy_picture_frame_02', art2: 'ornate_mirror_01' },
  },
];

// ---------------------------------------------------------------- furniture catalogue
// mount: floor (stands on the floor), surface (floor or on top of furniture), wall (hangs on a wall), ceiling.
// rot: correction (degrees) so the model faces +Z; light: lamp source in item space (evening).
export const CATEGORIES = [
  ['sofa', 'Диваны'],
  ['chair', 'Кресла'],
  ['table', 'Столы'],
  ['storage', 'Стенки и хранение'],
  ['tv', 'ТВ'],
  ['wall', 'На стену'],
  ['decor', 'Декор'],
  ['light', 'Свет'],
  ['rug', 'Ковры'],
];

const FABRIC = [
  { id: 'light', label: 'Светло-серый', color: '#c9c6bf' },
  { id: 'sand', label: 'Песочный', color: '#cdb89a' },
  { id: 'olive', label: 'Оливковый', color: '#7d7f5a' },
  { id: 'cognac', label: 'Коньяк', color: '#8e5634' },
  { id: 'graphite', label: 'Графит', color: '#4a4b4d' },
];
const RUG = [
  { id: 'oat', label: 'Овсяный', color: '#d8cdb9' },
  { id: 'sand', label: 'Песочный', color: '#bfa480' },
  { id: 'sage', label: 'Шалфей', color: '#9ea58f' },
  { id: 'graphite', label: 'Графит', color: '#55575a' },
];
const CABINET = [
  { id: 'white', label: 'Белый + дуб', color: '#eeeae2' },
  { id: 'oak', label: 'Дуб', color: '#a5794b' },
  { id: 'graphite', label: 'Графит + дуб', color: '#3a3b3d' },
];

export const ITEMS = [
  // sofas
  { id: 'sofa_corner', cat: 'sofa', label: 'Угловой диван', note: '2,8 × 1,7 м, букле', proc: true, mount: 'floor', variants: FABRIC },
  { id: 'sofa_straight', cat: 'sofa', label: 'Диван прямой', note: '2,3 м, букле', proc: true, mount: 'floor', variants: FABRIC },
  { id: 'sofa_03', cat: 'sofa', label: 'Диван с бахромой', note: '2,7 м', mount: 'floor' },
  { id: 'sofa_02', cat: 'sofa', label: 'Диван компактный', note: '1,8 м', mount: 'floor' },
  { id: 'Sofa_01', cat: 'sofa', label: 'Диван классический', note: '1,6 м', mount: 'floor' },
  // armchairs
  { id: 'mid_century_lounge_chair', cat: 'chair', label: 'Лаунж-кресло', note: 'mid-century', mount: 'floor' },
  { id: 'modern_arm_chair_01', cat: 'chair', label: 'Кресло мягкое', mount: 'floor' },
  { id: 'GreenChair_01', cat: 'chair', label: 'Кресло бархатное', mount: 'floor' },
  { id: 'ArmChair_01', cat: 'chair', label: 'Кресло винтажное', mount: 'floor' },
  { id: 'Rockingchair_01', cat: 'chair', label: 'Кресло-качалка', mount: 'floor' },
  { id: 'Ottoman_01', cat: 'chair', label: 'Пуф', mount: 'floor' },
  // tables
  { id: 'modern_coffee_table_01', cat: 'table', label: 'Журнальный стол', note: '120 × 60', mount: 'floor' },
  { id: 'modern_coffee_table_02', cat: 'table', label: 'Журнальный стол', note: '120 × 120', mount: 'floor' },
  { id: 'coffee_table_round_01', cat: 'table', label: 'Стол круглый', note: 'Ø 130', mount: 'floor' },
  { id: 'industrial_coffee_table', cat: 'table', label: 'Стол лофт', mount: 'floor' },
  { id: 'side_table_01', cat: 'table', label: 'Приставной столик', mount: 'floor' },
  { id: 'side_table_tall_01', cat: 'table', label: 'Столик высокий', mount: 'floor' },
  { id: 'round_wooden_table_02', cat: 'table', label: 'Обеденный стол', note: 'Ø 80', mount: 'floor' },
  // storage / wall units
  { id: 'tv_unit', cat: 'storage', label: 'ТВ-стенка модульная', note: '3,0 м: тумба, два пенала, полка', proc: true, mount: 'floor', variants: CABINET },
  { id: 'tv_console', cat: 'storage', label: 'ТВ-тумба подвесная', note: '2,0 м', proc: true, mount: 'wall', variants: CABINET },
  { id: 'modern_wooden_cabinet', cat: 'storage', label: 'Тумба из массива', note: '2,4 м', mount: 'floor' },
  { id: 'wooden_display_shelves_01', cat: 'storage', label: 'Стеллаж', mount: 'floor', rot: 90 },
  { id: 'steel_frame_shelves_03', cat: 'storage', label: 'Стеллаж металлический', note: '2,35 м', mount: 'floor' },
  { id: 'drawer_cabinet', cat: 'storage', label: 'Шкаф с ящиками', mount: 'floor' },
  { id: 'painted_wooden_cabinet', cat: 'storage', label: 'Комод', mount: 'floor' },
  { id: 'vintage_cabinet_01', cat: 'storage', label: 'Буфет', mount: 'floor' },
  // TV & media
  { id: 'tv65', cat: 'tv', label: 'Телевизор 65″', note: 'на кронштейне', proc: true, mount: 'wall' },
  { id: 'tv55', cat: 'tv', label: 'Телевизор 55″', note: 'на кронштейне', proc: true, mount: 'wall' },
  { id: 'tv55_stand', cat: 'tv', label: 'Телевизор 55″', note: 'на ножках', proc: true, mount: 'surface' },
  { id: 'soundbar', cat: 'tv', label: 'Саундбар', proc: true, mount: 'surface' },
  // wall decor
  { id: 'poster', cat: 'wall', label: 'Постер «Холмы»', note: '60 × 80, дубовая рама', proc: true, mount: 'wall' },
  { id: 'poster_b', cat: 'wall', label: 'Постер «Геометрия»', note: '70 × 100, чёрная рама', proc: true, mount: 'wall' },
  { id: 'hanging_picture_frame_01', cat: 'wall', label: 'Картина в раме', mount: 'wall' },
  { id: 'hanging_picture_frame_02', cat: 'wall', label: 'Картина горизонтальная', mount: 'wall' },
  { id: 'hanging_picture_frame_03', cat: 'wall', label: 'Картина малая', mount: 'wall' },
  { id: 'fancy_picture_frame_02', cat: 'wall', label: 'Картина в багете', mount: 'wall' },
  { id: 'ornate_mirror_01', cat: 'wall', label: 'Зеркало', mount: 'wall' },
  { id: 'wall_clock', cat: 'wall', label: 'Часы настенные', mount: 'wall' },
  { id: 'shelf', cat: 'wall', label: 'Полка из дуба', note: '1,2 м, скрытый крепёж', proc: true, mount: 'wall' },
  { id: 'shelf_long', cat: 'wall', label: 'Полка из дуба', note: '2,0 м', proc: true, mount: 'wall' },
  // decor
  { id: 'potted_plant_01', cat: 'decor', label: 'Фикус в кашпо', mount: 'floor' },
  { id: 'potted_plant_02', cat: 'decor', label: 'Растение в кашпо', mount: 'floor' },
  { id: 'potted_plant_04', cat: 'decor', label: 'Суккулент', mount: 'surface' },
  { id: 'ceramic_vase_01', cat: 'decor', label: 'Ваза керамическая', mount: 'surface' },
  { id: 'ceramic_vase_03', cat: 'decor', label: 'Ваза узкая', mount: 'surface' },
  { id: 'brass_vase_01', cat: 'decor', label: 'Ваза латунная', mount: 'surface' },
  { id: 'book_encyclopedia_set_01', cat: 'decor', label: 'Книги', mount: 'surface' },
  { id: 'wicker_basket_01', cat: 'decor', label: 'Корзина плетёная', mount: 'surface' },
  { id: 'throw_pillows_01', cat: 'decor', label: 'Подушки', mount: 'surface' },
  // lighting
  { id: 'floor_lamp', cat: 'light', label: 'Торшер-тренога', note: 'дуб, льняной абажур', proc: true, mount: 'floor', light: { at: [0, 1.38, 0], intensity: 3.2, distance: 7 } },
  { id: 'modern_ceiling_lamp_01', cat: 'light', label: 'Подвесной светильник', mount: 'ceiling', glow: /globe|glass/, light: { at: [0, -0.85, 0], intensity: 4, distance: 8 } },
  { id: 'hanging_industrial_lamp', cat: 'light', label: 'Подвес лофт', mount: 'ceiling', glow: /glass/, light: { at: [0, -1.2, 0], intensity: 4, distance: 8 } },
  { id: 'industrial_wall_lamp', cat: 'light', label: 'Бра лофт', mount: 'wall', glow: /glass/, light: { at: [0, 0, 0.1], intensity: 1.6, distance: 5 } },
  // rugs
  { id: 'rug_rect', cat: 'rug', label: 'Ковёр', note: '2 × 3 м, шерсть', proc: true, mount: 'floor', variants: RUG, under: true },
  { id: 'rug_round', cat: 'rug', label: 'Ковёр круглый', note: 'Ø 2,2 м, букле', proc: true, mount: 'floor', variants: RUG, under: true },
  { id: 'rug_runner', cat: 'rug', label: 'Ковёр малый', note: '1,6 × 2,3 м', proc: true, mount: 'floor', variants: RUG, under: true },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ---------------------------------------------------------------- default layouts (room-centred: x, z from the room
// centre; rot in degrees, 0 = facing +z / the window wall; wall items: side + u from the centre + y above the floor;
// decor lands on the surface below it). Roles are resolved through the style.
export const LAYOUTS = {
  d130: [
    { role: 'rug', x: -0.55, z: 0.05, rot: 90 },
    { role: 'unit', x: -2.38, z: 0.05, rot: 90 },
    { id: 'tv65', side: 'left', u: 0.05, y: 1.25 },
    { role: 'sofa', x: 0.95, z: 0.05, rot: -90 },
    { role: 'coffee', x: -0.6, z: 0.05, rot: 0 },
    { role: 'chair', x: -1.35, z: 1.3, rot: 150 },
    { role: 'plant', x: -2.2, z: 1.5, rot: 0 },
    { role: 'lamp', x: 1.75, z: 1.3, rot: 0 },
    { role: 'side', x: 1.55, z: -1.35, rot: 0 },
    { role: 'art1', side: 'right', u: -0.45, y: 1.5 },
    { role: 'art2', side: 'right', u: 0.55, y: 1.55 },
    { id: 'shelf', side: 'back', u: -1.2, y: 1.45 },
    { id: 'book_encyclopedia_set_01', x: -1.45, z: -1.75, rot: 0 },
    { id: 'ceramic_vase_01', x: -0.8, z: -1.72, rot: 0 },
    { id: 'potted_plant_04', x: -2.4, z: -1.24, rot: 0 },
    { role: 'pendant', x: -0.6, z: 0.05, rot: 0 },
  ],
  d240: [
    { role: 'rug', x: -1.0, z: -0.55, rot: 90 },
    { role: 'unit', x: -2.59, z: -0.55, rot: 90 },
    { id: 'tv65', side: 'left', u: -0.55, y: 1.25 },
    { role: 'corner', x: 0.55, z: -0.55, rot: -90 },
    { role: 'coffee2', x: -1.05, z: -0.55, rot: 0 },
    { role: 'chair', x: -1.55, z: 1.55, rot: 160 },
    { role: 'chair2', x: -0.35, z: 1.75, rot: 200 },
    { role: 'lamp', x: 1.75, z: 1.25, rot: 0 },
    { role: 'plant', x: 2.4, z: 3.25, rot: 0 },
    { role: 'plant2', x: -2.4, z: -3.3, rot: 0 },
    { role: 'side', x: 1.75, z: -2.35, rot: 0 },
    { id: 'round_wooden_table_02', x: 1.95, z: -2.6 + 0.55, rot: 0 },
    { role: 'art1', side: 'right', u: 0.5, y: 1.5 },
    { role: 'art2', side: 'right', u: 1.45, y: 1.55 },
    { id: 'shelf_long', side: 'back', u: -1.0, y: 1.5 },
    { id: 'book_encyclopedia_set_01', x: -1.55, z: -3.62, rot: 0 },
    { id: 'brass_vase_01', x: -0.4, z: -3.6, rot: 0 },
    { id: 'ceramic_vase_03', x: -2.61, z: -1.84, rot: 0 },
    { role: 'pendant', x: -1.05, z: -0.55, rot: 0 },
    { id: 'hanging_industrial_lamp', x: 1.95, z: -2.05, rot: 0 },
  ],
};
