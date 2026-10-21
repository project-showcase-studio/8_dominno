// Projects, options and prices of ДОМИННО (dominno.ru, October 2026). The base price is the published price of the
// project: manufacture and installation of the domokomplekt (wall, floor and roof panels). The calculator options of
// each project page are added on top with their published prices; delivery, crane, engineering and interior finishing
// are quoted individually («рассчитываются индивидуально»).

export const COMPANY = {
  name: 'ДОМИННО',
  slogan: 'префаб-дома с 2008 года',
  city: 'Екатеринбург · выставочные дома в д. Перебор и КП «Заповедник»',
  phone: '+7 (343) 227-35-00',
  phoneHref: 'tel:+73432273500',
  email: 'info@dominno.ru',
  telegram: 'https://t.me/dmitryond',
  vk: 'https://vk.com/dominno_ekb',
  site: 'https://dominno.ru',
};

// Calculator options of the project pages (same order and wording as on dominno.ru)
export const OPTIONS = [
  {
    id: 'foundation', label: 'Устройство фундамента', value: 'Забивные ж/б сваи',
    note: 'СТРОЙМАТИК С30.15 с крепёжными пластинами. Заказывается по нашему ТЗ; цена — для участков до 30 км от Екатеринбурга при нормальных грунтах',
  },
  {
    id: 'windows', label: 'Остекление и входная дверь', value: 'ПВХ-окна и входная дверь',
    note: 'DECEUNINCK Bautec Urban (5 камер), двухкамерные стеклопакеты с мультифункциональными и закалёнными стёклами',
  },
  {
    id: 'roof', label: 'Кровля, водосток и снегозадержание', value: 'Профнастил',
    note: 'GRANDLINE с поглощающим покрытием Drap, доборные элементы, металлический водосток, трубчатое снегозадержание',
  },
  {
    id: 'insul', label: 'Перекрёстное утепление', value: 'Потребуется',
    note: 'Базальтовый утеплитель между горизонтальной обрешёткой камерной сушки, мембраны ROTHOBLAAS HOLZTECHNIC',
  },
  {
    id: 'finish', label: 'Внешняя отделка', value: 'Профнастил, доска Штиль и террасная доска с покраской',
    note: 'Обшивочная доска ШТИЛЬ, профнастил GRANDLINE, терраса и крыльцо из лиственницы, покрытие TEKNOS TALATU',
  },
];

// Alternatives the site offers on request («стоимость определяется индивидуально») — shown on the model
export const ALTERNATIVES = {
  clad: [
    ['shtil', 'Доска «Штиль»', 'Профилированная обшивочная доска, по проекту'],
    ['planken', 'Планкен', 'Доска с открытым зазором 9 мм'],
  ],
  roofType: [
    ['prof', 'Профнастил', 'GrandLine, по проекту'],
    ['seam', 'Фальцевая', 'Стоячий фальц, ручная работа'],
  ],
};

// Teknos Talatu coating of the «Штиль» boards, soffits and the deck
const WOOD = {
  label: 'Покрытие дерева TEKNOS',
  items: [
    { id: 'grey', label: 'Серый графит', note: 'как dominno130', color: '#6f6e6a', tint: 'stain', keep: 0.18, contrast: 1.0 },
    { id: 'amber', label: 'Тёплая сосна', note: 'как dominno240', color: '#c38a50', tint: 'stain', keep: 0.5, contrast: 1.05 },
    { id: 'natural', label: 'Натуральный', note: 'бесцветный', tint: 'natural' },
    { id: 'walnut', label: 'Орех', color: '#5d3d27', tint: 'stain', keep: 0.4, contrast: 1.1 },
    { id: 'black', label: 'Чёрный', note: 'скандинавский', color: '#2b2a29', tint: 'paint' },
    { id: 'white', label: 'Белёный', note: 'полупрозрачный', color: '#d9d3c7', tint: 'stain', keep: 0.25, contrast: 0.8 },
  ],
};
const METAL = {
  label: 'Цвет металла GRANDLINE Drap',
  items: [
    { id: 'ral7024', label: 'RAL 7024', note: 'графит, по проекту', color: '#45484d' },
    { id: 'ral9005', label: 'RAL 9005', note: 'чёрный', color: '#1c1d1f' },
    { id: 'ral7016', label: 'RAL 7016', note: 'антрацит', color: '#383e42' },
    { id: 'ral8017', label: 'RAL 8017', note: 'шоколад', color: '#45322e' },
  ],
};
const FRAME = {
  label: 'Окна и двери DECEUNINCK',
  items: [
    { id: 'anthracite', label: 'Антрацит', note: 'по проекту', color: '#3b3f44' },
    { id: 'black', label: 'Чёрные', color: '#1d1e20' },
    { id: 'white', label: 'Белые', color: '#f1f1ef' },
    { id: 'oak', label: 'Золотой дуб', color: '#94612f' },
  ],
};
const SURROUND = {
  label: 'Обрамление торцов',
  items: [
    { id: 'white', label: 'Белое', note: 'штукатурка, по проекту', color: '#f1efea' },
    { id: 'grey', label: 'Светло-серое', color: '#c9c7c2' },
    { id: 'metal', label: 'В цвет металла', note: 'как dominno130', color: null },
  ],
};

const KIT = [
  ['Каркас', 'Сухая строганая доска камерной сушки, заводские стеновые панели, панели перекрытий и крыши'],
  ['Утепление', 'Целлюлозная ЭКОВАТА по всему тепловому контуру, мембраны ROTHOBLAAS HOLZTECHNIC'],
  ['Обшивка', 'Снаружи — фибролит GREENBOARD, внутри — гипсостружечные плиты PESHELAN, пол — ЦСП STROPAN'],
  ['Кровля', 'Панели крыши с обрешёткой под профнастил'],
  ['Монтаж', 'Обвязочный брус под сваи, сборка домокомплекта за несколько дней, временная лестница'],
];

export const PROJECTS = {
  d130: {
    id: 'd130',
    name: 'dominno130',
    series: 'Барнхаус · 1 этаж с антресолью',
    url: 'https://dominno.ru/dominno-30',
    price: 1685000,
    area: 50.96,
    prices: { foundation: 119500, windows: 531500, roof: 255000, insul: 93500, finish: 435500 },
    tagline: 'Минималистичный барнхаус 6 × 8 м: кухня-гостиная со вторым светом, ванная и спальня-антресоль. Подходит для жизни за городом и для глэмпинга.',
    specs: [
      ['Габариты', '6 × 8 м'],
      ['Строительная площадь', '50,96 м²'],
      ['Помещения', '30,46 м² + антресоль 5,18 м²'],
      ['Терраса', '10,65 м², крыльцо 2,89 м²'],
      ['Конёк', '+5,255 м'],
      ['Срок', 'около 2 месяцев'],
    ],
    included: KIT,
    defaults: { opts: { foundation: true, windows: true, roof: true, insul: true, finish: true }, clad: 'shtil', roofType: 'prof', wood: 'grey', metal: 'ral7024', frame: 'anthracite' },
    palettes: { wood: WOOD, metal: METAL, frame: FRAME },
  },
  d240: {
    id: 'd240',
    name: 'dominno240',
    series: 'Барнхаус · 1 этаж с антресолью',
    url: 'https://dominno.ru/dominno-140',
    price: 6143500,
    area: 187.62,
    prices: { foundation: 285500, windows: 2118500, roof: 841500, insul: 267500, finish: 1749500 },
    tagline: 'Дом для большой семьи 14,5 × 18 м: кухня-гостиная 43 м² со вторым светом и камином, три спальни, гардероб, кабинет на антресоли и две террасы.',
    specs: [
      ['Габариты', '14,5 × 18 м'],
      ['Строительная площадь', '187,62 м²'],
      ['Помещения', '140 м² · 3 спальни'],
      ['Террасы', '18 м² и 9 м², крыльцо 5 м²'],
      ['Высота', '+5,743 м'],
      ['Срок', '2–4 месяца'],
    ],
    included: KIT,
    defaults: { opts: { foundation: true, windows: true, roof: true, insul: true, finish: true }, clad: 'shtil', roofType: 'prof', wood: 'amber', metal: 'ral7024', frame: 'anthracite', surround: 'white' },
    palettes: { wood: WOOD, metal: METAL, frame: FRAME, surround: SURROUND },
  },
};

export function price(project, cfg) {
  const P = PROJECTS[project];
  const lines = OPTIONS.filter((o) => cfg.opts[o.id]).map((o) => [o, P.prices[o.id]]);
  const total = P.price + lines.reduce((s, [, v]) => s + v, 0);
  const alt = (cfg.clad !== 'shtil' ? 1 : 0) + (cfg.roofType !== 'prof' ? 1 : 0);
  return { base: P.price, lines, total, alt, perM2: Math.round(total / P.area) };
}

export const rub = (n) => n.toLocaleString('ru-RU').replace(/[  ,]/g, ' ') + ' ₽';
