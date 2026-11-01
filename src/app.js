import * as THREE from 'three';
import { Engine } from './engine.js';
import { PROJECTS, OPTIONS, ALTERNATIVES, COMPANY, price, rub } from './catalog.js';
import { preloadSets, onTextureReady, BASE } from './materials.js';
import { setEvening, setWood } from './houses/kit.js';
import { makeGround, makeHardscape, makeTrees, makeGlobes, mulchBed } from './site.js';
import { Interior } from './interior/interior.js';

const HOUSES = {
  d130: () => import('./houses/d130.js').then((m) => m.D130),
  d240: () => import('./houses/d240.js').then((m) => m.D240),
};

const $ = (s) => document.querySelector(s);
const engine = new Engine($('#viewport'));
onTextureReady.add(() => engine.invalidate(3));
preloadSets(['pine', 'plaster', 'larch', 'lining', 'laminate', 'oak', 'grass', 'ground', 'gravel', 'concrete']);

const params = new URLSearchParams(location.search);
const qp = params.get('p');
// shareable view: ?cam=x,y,z,tx,ty,tz (camera and target) and ?tod=evening
const qcam = (params.get('cam') || '').split(',').map(Number);
// ?clean — scene only (presentation renders / screenshots); ?kit — domokomplekt only
if (params.has('clean')) document.body.classList.add('clean');
// ?room — start inside the house (interior mode)
const state = {
  project: PROJECTS[qp] ? qp : 'd130',
  tod: params.get('tod') === 'evening' ? 'evening' : 'day',
  mode: params.has('room') ? 'interior' : 'exterior',
  cfg: {},
};
for (const id of Object.keys(PROJECTS)) {
  state.cfg[id] = structuredClone(PROJECTS[id].defaults);
  if (params.has('kit')) for (const k of Object.keys(state.cfg[id].opts)) state.cfg[id].opts[k] = false;
}

// ---------------------------------------------------------------- scene setup
const scene = engine.scene;
scene.add(makeGround());
const world = new THREE.Group();
scene.add(world);
let current = null; // { def, built, key, extras }
const matsCache = {};
const interior = new Interior(engine, { onChange: () => renderSummary() });

const modelCfg = (c) => ({ opts: c.opts, clad: c.clad, roofType: c.roofType });
function structuralKey(id, c) {
  return JSON.stringify([id, c.opts.finish, c.opts.roof, c.opts.windows, c.clad, c.roofType]);
}

let building = Promise.resolve();
function showProject(id, opts) {
  building = building.then(() => doShow(id, opts));
  return building;
}
async function doShow(id, { fly = true } = {}) {
  const def = await HOUSES[id]();
  const c = state.cfg[id];
  const key = structuralKey(id, c);
  if (current && current.key === key) return;
  const mats = matsCache[id] || (matsCache[id] = def.materials());
  const built = def.build(modelCfg(c), mats);
  const projectChanged = !current || current.def.id !== id;
  if (current) {
    world.remove(current.built.group);
    dispose(current.built.group);
    world.remove(current.extras);
  }
  world.add(built.group);
  const extras = await siteFor(def, built);
  world.add(extras);
  current = { def, built, key, extras };
  engine.sunFrom = def.sun;
  applyLooks();
  await applyTod();
  if (state.mode === 'interior') {
    await interior.enter(id, built);
    state.started = true;
  } else if (fly && projectChanged) {
    const [p, t] = qcam.length === 6 && qcam.every(Number.isFinite) && !state.started ? [qcam.slice(0, 3), qcam.slice(3)] : def.views.main;
    if (!state.started) {
      engine.camera.position.set(...p);
      engine.controls.target.set(...t);
      state.started = true;
    } else engine.flyTo(p, t);
  }
  engine.invalidate(3);
}

function dispose(o) {
  o.traverse((m) => m.isMesh && m.geometry.dispose());
}

// site per project: hardscape, shrubs, garden globes, facade light washes; the forest is shared and generated once
const sharedSite = { trees: null };
const siteCache = {};
async function siteFor(def, built) {
  const g = new THREE.Group();
  const site = siteCache[def.id] || (siteCache[def.id] = {});
  if (!site.hard) {
    site.hard = makeHardscape({ footprint: built.bounds, path: built.entry ? [built.entry, ...def.path] : def.path, landings: built.landings, ...def.hardscape });
    site.globes = makeGlobes(def.globes || []);
  }
  g.add(site.hard, site.globes);
  const lights = new THREE.Group();
  lights.name = 'houseLights';
  for (const L of built.lights) if (L.type === 'wash') lights.add(wash(L));
  g.add(lights);
  if (def.shrubs && !site.shrubs) {
    site.shrubs = new THREE.Group();
    const bushes = [];
    def.shrubs.forEach((s, i) => {
      site.shrubs.add(mulchBed(s.x, s.z, s.height * 0.62 + 0.15, i + 1));
      bushes.push({ kind: s.m, x: s.x, z: s.z, seed: 3 + i, rot: s.rotY, scale: s.height });
    });
    if (bushes.length) makeTrees(bushes, () => engine.invalidate()).then((t) => (site.shrubs.add(t), engine.invalidate(3)));
  }
  if (site.shrubs) g.add(site.shrubs);
  if (!sharedSite.trees) {
    sharedSite.trees = new THREE.Group();
    scene.add(sharedSite.trees);
    setTimeout(() => plantTrees(), 300);
  }
  return g;
}

let washTex;
function wash(L) {
  // light wash from an up/down facade sconce, visible in the evening
  if (!washTex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(128, 256);
    for (let j = 0; j < 256; j++)
      for (let i = 0; i < 128; i++) {
        const v = Math.abs(j - 128) / 128;
        const u = (i - 64) / 64;
        const spread = 0.1 + v * 0.6;
        const a = Math.max(0, 1 - Math.abs(u) / spread) ** 1.6 * Math.max(0, 1 - v) ** 1.2 * (v < 0.06 ? v / 0.06 : 1);
        const k = (j * 128 + i) * 4;
        img.data[k] = 255;
        img.data[k + 1] = 190;
        img.data[k + 2] = 112;
        img.data[k + 3] = Math.min(255, a * 255);
      }
    x.putImageData(img, 0, 0);
    washTex = new THREE.CanvasTexture(c);
    washTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: true });
  m.userData.evening = 1.5;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), m);
  mesh.position.copy(L.pos).addScaledVector(L.out, -0.04);
  mesh.lookAt(mesh.position.clone().add(L.out));
  mesh.renderOrder = 2;
  return mesh;
}

async function plantTrees() {
  // Ural pine forest as on the renders: tall pines with a few birches, a ring around the plot and a far edge
  const R = mulberryLocal(5);
  const spots = [];
  const ring = [
    ['spruce', -21, -17], ['spruce', -26, -5], ['birch', -23, 10], ['spruce', -14, -25], ['spruce', 4, -26], ['spruce', 15, -23],
    ['birch', 25, -13], ['spruce', 29, -1], ['spruce', -31, -21], ['spruce', -4, -34], ['spruce', 27, -29], ['birch', -28, 20],
    ['spruce', 35, 11], ['spruce', -14, 27], ['spruce', -37, 4], ['spruce', 20, 24], ['birch', 31, 22],
  ];
  ring.forEach(([kind, x, z], i) => spots.push({ kind, x: x + (R() - 0.5) * 2, z: z + (R() - 0.5) * 2, seed: 10 + (i % 3), rot: R() * 6.28, scale: 0.95 + R() * 0.4 }));
  for (let i = 0; i < 52; i++) {
    const a = -Math.PI * 0.97 + (i / 52) * Math.PI * 1.6 + (R() - 0.5) * 0.08;
    const r = 50 + R() * 28;
    spots.push({ kind: R() < 0.85 ? 'spruce' : 'birch', x: Math.cos(a) * r, z: Math.sin(a) * r, seed: 10 + (i % 3), rot: R() * 6.28, scale: 1.05 + R() * 0.55, far: true });
  }
  const g = await makeTrees(spots, () => engine.invalidate());
  sharedSite.trees.add(g);
  engine.invalidate(3);
}
function mulberryLocal(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- looks (material-only changes)
function finishOf(item) {
  if (item.tint === 'natural') return { natural: true };
  if (item.tint === 'stain') return { natural: false, color: item.color, keep: item.keep ?? 0.45, contrast: item.contrast ?? 1.05 };
  return { natural: false, color: item.color, keep: 0, contrast: 0.6 };
}
function pick(project, group) {
  const P = PROJECTS[project];
  return P.palettes[group].items.find((i) => i.id === state.cfg[project][group]) || P.palettes[group].items[0];
}
function applyLooks() {
  if (!current) return;
  const id = current.def.id, m = current.built.mats;
  setWood(m, finishOf(pick(id, 'wood')));
  const metal = pick(id, 'metal').color;
  for (const k of ['roof', 'wallMetal', 'flash', 'flashing', 'gutter']) m[k].color.set(metal);
  m.frame.color.set(pick(id, 'frame').color);
  m.doorLeaf.color.set(pick(id, 'frame').color);
  if (PROJECTS[id].palettes.surround) {
    const s = pick(id, 'surround');
    m.surround.color.set(s.color || metal);
    m.surround.userData.finish.color = s.color || metal;
  }
  engine.invalidate(3);
}

// ---------------------------------------------------------------- time of day
async function applyTod() {
  await engine.setEnvironment(state.tod);
  const ev = state.tod === 'evening';
  if (current) {
    setEvening(current.built.mats, ev);
    current.extras.traverse((o) => {
      if (o.isMesh && o.material.userData?.evening) o.material.opacity = ev ? o.material.userData.evening : 0;
      if (o.isMesh && o.material.userData?.glow) o.material.emissiveIntensity = ev ? o.material.userData.glow : 0;
    });
  }
  await interior.setEvening(ev);
  if (!interior.active) engine.renderer.toneMappingExposure = 1.0;
  engine.invalidate(3);
}

// ---------------------------------------------------------------- UI
function renderHeader() {
  $('#models').innerHTML = Object.values(PROJECTS)
    .map((p) => `<button data-p="${p.id}" class="${p.id === state.project ? 'on' : ''}">${p.name}</button>`)
    .join('');
  $('#models').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.p === state.project) return;
    state.project = b.dataset.p;
    track('switch-' + state.project, 'Переключение на ' + PROJECTS[state.project].name);
    syncUrl();
    renderAll();
    showProject(state.project);
  };
  const inside = state.mode === 'interior';
  const views = inside
    ? [['main', 'Общий вид'], ['tv', 'ТВ-зона'], ['windows', 'Окна'], ['back', 'Из окна'], ['top', 'Сверху']]
    : [['main', 'Общий вид'], ['terrace', 'Терраса'], ['facade', 'Фасад'], ['back', 'Вход'], ['top', 'Сверху']];
  $('#views').innerHTML = views.map(([k, l]) => `<button data-v="${k}">${l}</button>`).join('');
  $('#views').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || !current) return;
    const [p, t] = inside ? interior.views()[b.dataset.v] : current.def.views[b.dataset.v];
    engine.flyTo(p, t);
  };
  $('#enter').innerHTML = inside
    ? `<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l-4 4 4 4M10 12h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Выйти из дома</span>`
    : `<svg viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l4 4-4 4M14 12H4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Войти в дом</span>`;
  $('#enter').classList.toggle('accent', !inside);
  $('#tod').innerHTML = [
    ['day', 'День'],
    ['evening', 'Вечер'],
  ]
    .map(([k, l]) => `<button data-t="${k}" class="${state.tod === k ? 'on' : ''}">${l}</button>`)
    .join('');
  $('#tod').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.tod = b.dataset.t;
    renderHeader();
    applyTod();
  };
}

function renderProject() {
  const P = PROJECTS[state.project];
  if (state.mode === 'interior' && interior.active) return interior.renderProject($('#project'), P);
  $('#project').innerHTML = `
    <div class="eyebrow">${P.series.split(' · ').map((t) => `<span>${t}</span>`).join(' · ')}</div>
    <h1>${P.name}</h1>
    <p class="tag">${P.tagline}</p>
    <dl class="specs">${P.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <details class="incl"><summary>Что входит в домокомплект</summary>
      <dl>${P.included.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </details>`;
}

function swatch(item, on, group) {
  const bg = item.tint === 'natural' ? `url(${BASE}tex/pine/color.webp) center/260%` : item.color || 'linear-gradient(135deg,#45484d 50%,#2c2e31 50%)';
  return `<button class="sw ${on ? 'on' : ''}" data-g="${group}" data-v="${item.id}" title="${item.label}${item.note ? ' — ' + item.note : ''}">
      <i style="background:${bg}"></i><span>${item.label}${item.note ? `<small>${item.note}</small>` : ''}</span></button>`;
}
const palette = (P, c, g, off = false) =>
  `<div class="pal ${off ? 'off' : ''}"><h3>${P.palettes[g].label}</h3><div class="sws">${P.palettes[g].items.map((it) => swatch(it, c[g] === it.id, g)).join('')}</div></div>`;

function renderOptions() {
  if (state.mode === 'interior') {
    if (interior.active) interior.renderOptions($('#options'));
    else $('#options').innerHTML = '<p class="note">Загружаем интерьер…</p>';
    return;
  }
  $('#options').onclick = null;
  const id = state.project, P = PROJECTS[id], c = state.cfg[id];
  const sec = (num, title, body, sub = '') => `<section class="opt"><h2><em>${num}</em>${title}${sub ? `<span>${sub}</span>` : ''}</h2>${body}</section>`;
  const cards = (key, items, off) =>
    `<div class="cards ${off ? 'off' : ''}">${items
      .map(([v, l, d], i) => `<button data-k="${key}" data-v="${v}" class="card ${c[key] === v ? 'on' : ''}"><b>${l}</b><small>${d}</small><em>${i === 0 ? 'входит в опцию' : 'по запросу'}</em></button>`)
      .join('')}</div>`;
  let html = '';
  html += sec(
    '01',
    'Комплектация',
    `<div class="list">
      <div class="row fixed on"><span><b>Домокомплект с монтажом</b><small>Панели стен, перекрытий и крыши, ЭКОВАТА, GREENBOARD</small></span><em>${rub(P.price)}</em></div>
      ${OPTIONS.map(
        (o) => `<label class="row check ${c.opts[o.id] ? 'on' : ''}" title="${o.note}"><input type="checkbox" value="${o.id}" ${c.opts[o.id] ? 'checked' : ''}>
        <span><b>${o.label}</b><small>${o.value}</small></span><em>+${rub(P.prices[o.id])}</em></label>`,
      ).join('')}</div>
      <p class="note">Снимите опции, чтобы увидеть на модели сам домокомплект: фибролитовые панели, мембрану с обрешёткой, лаги террасы и пустые проёмы.</p>`,
    'цены dominno.ru',
  );
  html += sec(
    '02',
    'Фасад',
    cards('clad', ALTERNATIVES.clad, !c.opts.finish) + palette(P, c, 'wood', !c.opts.finish) + (P.palettes.surround ? palette(P, c, 'surround', !c.opts.finish) : ''),
    c.opts.finish ? 'доска ШТИЛЬ, TEKNOS' : 'нужна опция «Внешняя отделка»',
  );
  html += sec(
    '03',
    'Кровля и металл',
    cards('roofType', ALTERNATIVES.roofType, !c.opts.roof) + palette(P, c, 'metal', !c.opts.roof && !c.opts.finish),
    'GRANDLINE Drap',
  );
  html += sec('04', 'Окна и двери', palette(P, c, 'frame', !c.opts.windows) + '<p class="note">Поворотно-откидные окна, панорамные двери на террасы. Возможна замена на деревянные или алюминиевые системы — по запросу.</p>');
  $('#options').innerHTML = html;
}

function renderSummary() {
  const id = state.project, P = PROJECTS[id], c = state.cfg[id];
  const p = price(id, c);
  $('#summary').innerHTML = `
    <div class="sum-lines">
      <div><span>Домокомплект ${P.name}, ${String(P.area).replace('.', ',')} м²</span><b>${rub(p.base)}</b></div>
      <div><span>Опции комплектации: ${p.lines.length} из ${OPTIONS.length}</span><b>+${rub(p.total - p.base)}</b></div>
      ${p.alt ? `<div><span>Альтернативные материалы (${p.alt})</span><b>по запросу</b></div>` : ''}
      ${interior.store[id] ? `<div><span>Внутренняя отделка и мебель (${interior.store[id].items?.length || 0} предм.)</span><b>по запросу</b></div>` : ''}
    </div>
    <div class="sum-total"><span>Предварительная стоимость</span><strong>${rub(p.total)}</strong><small>${rub(p.perM2)}/м² · доставка, автокран, коммуникации и внутренняя отделка — индивидуально</small></div>
    <button class="btn primary" id="send">Получить коммерческое предложение</button>`;
  $('#send').onclick = openRequest;
}

function renderAll() {
  renderHeader();
  renderProject();
  renderOptions();
  renderSummary();
}

$('#options').addEventListener('click', (e) => {
  if (state.mode === 'interior') return;
  const id = state.project, c = state.cfg[id];
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.k) {
    c[t.dataset.k] = t.dataset.v;
    showProject(id);
  } else if (t.dataset.g) {
    c[t.dataset.g] = t.dataset.v;
    applyLooks();
  } else return;
  renderOptions();
  renderSummary();
});
$('#options').addEventListener('change', (e) => {
  if (state.mode === 'interior') return;
  const id = state.project, c = state.cfg[id];
  const t = e.target;
  if (t.type !== 'checkbox') return;
  c.opts[t.value] = t.checked;
  showProject(id);
  renderOptions();
  renderSummary();
});

function openRequest() {
  const id = state.project, P = PROJECTS[id], c = state.cfg[id];
  const p = price(id, c);
  const lines = [
    `Проект: ${P.name} (${String(P.area).replace('.', ',')} м²)`,
    `Домокомплект: ${rub(P.price)}`,
    ...OPTIONS.map((o) => `${o.label}: ${c.opts[o.id] ? `${o.value}, +${rub(P.prices[o.id])}` : 'не потребуется'}`),
    ...(c.opts.finish ? [`Обшивка: ${ALTERNATIVES.clad.find((x) => x[0] === c.clad)[1]}`, `Покрытие дерева: ${pick(id, 'wood').label}`] : []),
    ...(c.opts.finish && P.palettes.surround ? [`Обрамление торцов: ${pick(id, 'surround').label}`] : []),
    ...(c.opts.roof ? [`Кровля: ${ALTERNATIVES.roofType.find((x) => x[0] === c.roofType)[1]}`] : []),
    `Цвет металла: ${pick(id, 'metal').label}`,
    ...(c.opts.windows ? [`Окна и двери: ${pick(id, 'frame').label}`] : []),
    ...interior.describe(id),
    `Предварительная стоимость: ${rub(p.total)}${p.alt || interior.store[id] ? ' + ' + [p.alt && 'альтернативы', interior.store[id] && 'интерьер'].filter(Boolean).join(' и ') + ' по запросу' : ''}`,
  ];
  $('#req-body').innerHTML = `<ul>${lines.map((l) => `<li>${l.replace(/^([^:]+):/, '<span>$1</span>')}</li>`).join('')}</ul>
    <p class="note">Расчёт предварительный и не является офертой. Цена фиксируется в договоре. Доставка, автокран, инженерные коммуникации и внутренняя отделка рассчитываются индивидуально; дальше 30 км от Екатеринбурга добавляются транспортные и командировочные расходы.</p>
    <p class="req-phone">Позвоните: <a href="${COMPANY.phoneHref}">${COMPANY.phone}</a> · <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> · <a href="${COMPANY.telegram}" target="_blank" rel="noopener">Telegram</a></p>`;
  $('#req-link').href = P.url;
  $('#req-link').onclick = () => track('site-' + id, 'Переход на dominno.ru');
  $('#req-body .req-phone').onclick = (e) => {
    const a = e.target.closest('a');
    if (a) track(a.href.startsWith('tel:') ? 'phone' : a.href.startsWith('mailto:') ? 'email' : 'telegram', 'Контакт: ' + a.textContent);
  };
  track('request-' + id, 'Коммерческое предложение: ' + P.name);
  $('#req-copy').onclick = (e) => {
    e.preventDefault();
    track('copy-' + id, 'Скопирован расчёт');
    navigator.clipboard?.writeText(lines.join('\n'));
    $('#req-copy').textContent = 'Скопировано';
    setTimeout(() => ($('#req-copy').textContent = 'Скопировать расчёт'), 1600);
  };
  $('#request').showModal();
}

$('#shot').onclick = () => {
  track('screenshot', 'Снимок экрана');
  const url = engine.capture(2560, 1440);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ДОМИННО-${PROJECTS[state.project].name}${state.mode === 'interior' ? '-интерьер' : ''}.png`;
  a.click();
};

// visit statistics: GoatCounter events (the counter script is loaded async in index.html)
function track(path, title) {
  try { window.goatcounter?.count?.({ path, title, event: true }); } catch {}
}

// ---------------------------------------------------------------- inside / outside
function syncUrl() {
  history.replaceState(null, '', '?p=' + state.project + (state.mode === 'interior' ? '&room' : ''));
}
async function setMode(mode) {
  if (mode === state.mode) return;
  const fade = $('#fade');
  fade.classList.add('on');
  await new Promise((r) => setTimeout(r, 280));
  state.mode = mode;
  if (mode === 'interior') track('enter-' + state.project, 'Вход в дом');
  syncUrl();
  await building;
  if (mode === 'interior') {
    renderAll();
    await interior.enter(state.project, current.built);
  } else {
    interior.exit();
    const [p, t] = current.def.views.terrace;
    engine.camera.position.set(...p);
    engine.controls.target.set(...t);
  }
  await applyTod();
  renderAll();
  requestAnimationFrame(() => fade.classList.remove('on'));
}
$('#enter').onclick = () => setMode(state.mode === 'interior' ? 'exterior' : 'interior');

// ---------------------------------------------------------------- start
renderAll();
(async () => {
  const bar = $('#loader i');
  bar.style.width = '30%';
  await engine.setEnvironment(state.tod);
  bar.style.width = '70%';
  await showProject(state.project);
  if (state.mode === 'interior') renderAll();
  bar.style.width = '100%';
  setTimeout(() => $('#loader').classList.add('done'), 250);
  setTimeout(() => document.body.setAttribute('data-ready', ''), 4000);
  setTimeout(() => $('#hint').classList.add('done'), 6000);
})();

globalThis.__app = { engine, state, interior, get current() { return current; }, showProject, applyLooks, applyTod, setMode };
