// Interior mode: "enter" the house and finish one room. The room shell is built inside the house at its real wall
// planes (room.js), so the facade glazing, the terrace and the site are seen through the openings. Lighting is
// image-based: an interior HDRI (Poly Haven) lights every interior material, the sun of the exterior HDRI comes
// in through the windows with shadows, and in the evening downlights, lamps and the fire take over.
// Furniture is arranged by dragging: floor pieces slide on the floor, wall pieces on the walls, small decor lands
// on whatever surface is under the cursor (tables, shelves, the wall unit).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { BASE, surface } from '../materials.js';
import { buildRoom } from './room.js';
import { createItem } from './items.js';
import { FINISHES, WALL_COLORS, DEFAULT_FINISH, STYLES, ITEMS, ITEM, CATEGORIES, LAYOUTS, THUMBS } from './catalog.js';

const STORE_KEY = 'dominno.interior.v1';
// Inside, the house's stand-in rooms behind the glazing are not drawn at all, and parts that cannot be seen from the
// room (roof sheets, gutters, chimney, piles, sill beams) only cast their shadows through the windows. Outside, the
// whole interior group is out of the scene.
const HIDE = new Set(['roomWall', 'roomCeil', 'roomFloor', 'roomFurniture', 'sofa', 'curtain', 'sheer', 'downlight']);
const SHADOW_ONLY = new Set(['roof', 'gutter', 'chimney', 'membrane', 'lumber', 'sill', 'concrete']);
const GHOST = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
const DEG = Math.PI / 180;
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

export class Interior {
  constructor(engine, { onChange } = {}) {
    this.engine = engine;
    this.onChange = onChange || (() => {});
    this.active = false;
    this.evening = false;
    this.group = new THREE.Group();
    this.group.name = 'interior';
    this.itemsGroup = new THREE.Group();
    this.group.add(this.itemsGroup);
    this.items = []; // { root, def, size, lights, glow, rec }
    this.matCache = new Map();
    this.cat = 'sofa';
    this.store = load();
    this.env = {};
    this.raycaster = new THREE.Raycaster(); // pointer picking and dragging
    this.down = new THREE.Raycaster(); // vertical probes (surfaces under decor, riders): never disturbs a drag in progress
    this.selBox = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#4d7a52'));
    this.selBox.material.depthTest = false;
    this.selBox.material.transparent = true;
    this.selBox.renderOrder = 10;
    this.selBox.visible = false;
    this.group.add(this.selBox);
    this.downLights = new THREE.Group();
    this.group.add(this.downLights);
    this.fireLight = new THREE.PointLight('#ff9a4a', 0, 6, 2);
    this.group.add(this.fireLight);
    this.thumbs = {};
    this.installInput();
    this.frameFn = (dt) => this.frame(dt);
  }

  // ---------------------------------------------------------------- state
  cfg(pid = this.pid) {
    if (!this.store[pid]) this.store[pid] = { fin: { ...DEFAULT_FINISH }, style: 'scandi', items: null };
    return this.store[pid];
  }
  save() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
      } catch {}
    }, 300);
    this.onChange();
  }

  // ---------------------------------------------------------------- environment (interior HDRIs)
  loadEnv(key) {
    if (!this.env[key]) {
      this.env[key] = new RGBELoader()
        .setDataType(THREE.FloatType)
        .loadAsync(`${BASE}hdri/interior_${key}.hdr`)
        .then((hdr) => {
          // white balance (grey world, keeping a little of the original warmth): the photographed rooms are lit by
          // tungsten and would tint white walls peach
          const d = hdr.image.data, n = d.length / 4, mean = [0, 0, 0];
          for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += Math.min(d[i + c], 8);
          const lum = (mean[0] + mean[1] + mean[2]) / 3;
          const keep = key === 'evening' ? 0.2 : 0.15;
          const k = mean.map((m) => (lum / m) ** (1 - keep));
          for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) d[i * 4 + c] *= k[c];
          hdr.needsUpdate = true;
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          const pm = new THREE.PMREMGenerator(this.engine.renderer);
          const t = pm.fromEquirectangular(hdr).texture;
          pm.dispose();
          hdr.dispose();
          return t;
        });
    }
    return this.env[key];
  }
  get envState() {
    return { map: this.envMap, intensity: this.evening ? 0.22 : 0.85 };
  }
  applyEnv(root) {
    const e = this.envState;
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        m.envMap = e.map;
        m.envMapIntensity = m.userData.envBoost ? e.intensity * m.userData.envBoost : e.intensity;
        m.needsUpdate = true;
      }
    });
  }

  // ---------------------------------------------------------------- enter / exit
  async enter(pid, built) {
    const E = this.engine;
    if (this.active) this.teardown();
    this.pid = pid;
    this.built = built;
    this.spec = built.interior;
    this.active = true;
    this.envMap = await this.loadEnv(this.evening ? 'evening' : 'day');
    built.group.children.forEach((m) => HIDE.has(m.name) && (m.visible = false));
    // shadow-only: a material that writes neither colour nor depth; the shadow pass uses its own depth material
    for (const m of built.group.children) if (SHADOW_ONLY.has(m.name)) {
      m.userData.material = m.material;
      m.material = GHOST;
    }
    if (!this.group.parent) E.scene.add(this.group);
    this.rebuildRoom();
    const R = this.spec;
    E.focusShadow(new THREE.Vector3((R.x0 + R.x1) / 2, R.floor + 1.5, (R.z0 + R.z1) / 2), Math.hypot(R.x1 - R.x0, R.z1 - R.z0) / 2 + 1.2);
    // camera: wider lens, near plane for close-ups, orbit inside the room
    this.saved = { fov: E.camera.fov, near: E.camera.near, min: E.controls.minDistance, max: E.controls.maxDistance, maxPolar: E.controls.maxPolarAngle, ao: { ...E.ao.configuration } };
    E.camera.fov = 62;
    E.camera.near = 0.03;
    E.camera.updateProjectionMatrix();
    E.controls.minDistance = 0.25;
    E.controls.maxDistance = 9;
    E.controls.maxPolarAngle = Math.PI * 0.97;
    E.ao.configuration.aoRadius = 0.6;
    E.ao.configuration.distanceFalloff = 0.4;
    E.ao.configuration.intensity = 2.2;
    if (!E.onFrame.includes(this.frameFn)) E.onFrame.push(this.frameFn);
    const [p, t] = this.views().main;
    E.camera.position.set(...p);
    E.controls.target.set(...t);
    await this.furnish();
    this.setEvening(this.evening);
    E.invalidate(4);
  }

  exit() {
    if (!this.active) return;
    const E = this.engine;
    this.teardown();
    E.scene.remove(this.group);
    const s = this.saved;
    E.camera.fov = s.fov;
    E.camera.near = s.near;
    E.camera.updateProjectionMatrix();
    E.controls.minDistance = s.min;
    E.controls.maxDistance = s.max;
    E.controls.maxPolarAngle = s.maxPolar;
    Object.assign(E.ao.configuration, s.ao);
    E.onFrame.splice(E.onFrame.indexOf(this.frameFn), 1);
    E.invalidate(4);
  }

  teardown() {
    this.select(null);
    this.built?.group.children.forEach((m) => {
      if (HIDE.has(m.name)) m.visible = true;
      if (m.userData.material) [m.material, m.userData.material] = [m.userData.material, null];
    });
    this.engine.focusShadow(null);
    if (this.room) {
      this.group.remove(this.room.group);
      this.room.group.traverse((o) => o.isMesh && o.geometry.dispose());
      this.room = null;
    }
    for (const it of this.items) this.itemsGroup.remove(it.root);
    this.items = [];
    this.downLights.clear();
    this.active = false;
  }

  /** Camera presets from the room box: overview, windows, TV zone, from the window, top. */
  views() {
    const R = this.spec, FL = R.floor;
    const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
    const acc = R.accent === 'left' ? -1 : 1;
    const ax = acc < 0 ? R.x0 : R.x1, ox = acc < 0 ? R.x1 : R.x0;
    const cmin = Math.min(R.ceil(R.x0), R.ceil(R.x1), R.ceil(cx));
    return {
      main: [[ox + acc * 0.45, FL + 1.6, R.z0 + 0.5], [cx + acc * 0.4, FL + 0.95, cz + 0.6]],
      tv: [[ox + acc * 0.5, FL + 1.75, cz + (R.tvU ?? 0)], [ax, FL + 1.2, cz + (R.tvU ?? 0)]],
      windows: [[cx, FL + 1.55, R.z0 + 0.45], [cx, FL + 1.7, R.z1]],
      back: [[ax - acc * 0.5, FL + 1.6, R.z1 - 0.45], [cx - acc * 0.3, FL + 0.9, R.z0 + 0.6]],
      top: [[cx, cmin - 0.15, cz + 0.02], [cx, FL, cz]],
    };
  }

  // ---------------------------------------------------------------- room finishes
  mat(key, make) {
    if (!this.matCache.has(key)) this.matCache.set(key, make());
    return this.matCache.get(key);
  }
  roomMats() {
    const f = this.cfg().fin;
    const wc = WALL_COLORS.find((c) => c.id === f.wallColor)?.color || '#f2f0eb';
    const paint = (c) => this.mat('paint' + c, () => surface('paint', { tint: 'paint', color: c, contrast: 0.45, normalScale: 0.6, roughness: 0.92 }));
    const tone = FINISHES.tone.items.find((t) => t.id === f.tone);
    const wood = (set, t = tone) => this.mat(set + t.id, () => (t.id === 'natural' ? surface(set, { tint: 'natural', roughness: 0.55 }) : surface(set, { tint: 'stain', color: t.color, keep: 0.35, contrast: 1.05, roughness: 0.55 })));
    const lac = (c) => this.mat('lac' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.25 }));
    const oakN = () => this.mat('oakNat', () => surface('oak', { tint: 'stain', color: '#b08657', keep: 0.75, contrast: 1.05, roughness: 0.55 }));
    const walls = {
      paint: () => paint(wc),
      lining: () => this.mat('lining' + wc, () => surface('lining', { tint: 'paint', color: wc, contrast: 0.6, roughness: 0.85 })),
      plaster: () => this.mat('plaster' + wc, () => surface('plaster', { tint: 'paint', color: wc, contrast: 0.85, normalScale: 0.9, roughness: 0.95 })),
      microcement: () => this.mat('mc', () => surface('microcement', { tint: 'stain', color: '#bdb7ad', keep: 0.6, contrast: 1.0, roughness: 0.75 })),
    };
    const accent = {
      oak: () => this.mat('accOak', () => surface('oak', { tint: 'stain', color: '#a7784b', keep: 0.8, contrast: 1.1, roughness: 0.5, tile: [0.6, 2.4] })),
      brick: () => this.mat('brick', () => surface('brick', { roughness: 0.95 })),
      marble: () => this.mat('marble', () => surface('marble', { roughness: 0.18 })),
      microcement: () => this.mat('mcA', () => surface('microcement', { tint: 'stain', color: '#a39d93', keep: 0.6, contrast: 1.05, roughness: 0.7 })),
      dark: () => paint('#3f4042'),
      slats: () => walls[f.walls](),
      same: () => walls[f.walls](),
    };
    const floors = {
      oakplank: () => wood('oakplank'),
      laminate: () => wood('laminate'),
      parquet: () => wood('parquet'),
      microcement: () => this.mat('mcF', () => surface('microcement', { tint: 'stain', color: '#a8a299', keep: 0.6, contrast: 1.05, roughness: 0.4 })),
      marble: () => this.mat('marbleF', () => surface('marble', { roughness: 0.12 })),
    };
    const ceils = {
      paint: () => paint('#f4f2ee'),
      pine: () => this.mat('pineC', () => surface('pine', { tint: 'stain', color: '#d0ac7c', keep: 0.7, contrast: 0.95, roughness: 0.7 })),
      lining: () => this.mat('liningC', () => surface('lining', { tint: 'paint', color: '#f1eee7', contrast: 0.6, roughness: 0.85 })),
    };
    const trimC = FINISHES.trim.items.find((t) => t.id === f.trim).color;
    const trim = f.trim === 'oak' ? oakN() : lac(trimC);
    const curtainC = FINISHES.curtains.items.find((t) => t.id === f.curtains)?.color || '#ddd5c6';
    const beamC = FINISHES.beams.items.find((t) => t.id === f.beams)?.color || '#9c7650';
    return {
      wall: walls[f.walls](),
      accent: accent[f.accent](),
      floor: floors[f.floor](),
      ceil: ceils[f.ceiling](),
      reveal: f.walls === 'paint' ? paint(wc) : paint('#f2f0eb'),
      sill: trim,
      skirting: trim,
      door: f.trim === 'oak' ? oakN() : lac(trimC),
      doorGap: this.mat('gap', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 })),
      handle: this.mat('handle' + f.trim, () => (f.trim === 'black' ? new THREE.MeshStandardMaterial({ color: '#b8935a', roughness: 0.3, metalness: 1 }) : new THREE.MeshStandardMaterial({ color: '#202123', roughness: 0.4, metalness: 0.7 }))),
      beam: this.mat('beam' + beamC, () => surface('oak', { tint: 'stain', color: beamC, keep: 0.55, contrast: 1.1, roughness: 0.65 })),
      slat: oakN(),
      slatBack: this.mat('felt', () => new THREE.MeshStandardMaterial({ color: '#161616', roughness: 1 })),
      curtain: this.mat('cur' + curtainC, () => new THREE.MeshPhysicalMaterial({ color: curtainC, roughness: 0.95, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(curtainC).lerp(new THREE.Color('#fff'), 0.5), side: THREE.DoubleSide })),
      sheer: this.mat('sheer', () => new THREE.MeshPhysicalMaterial({ color: '#f6f3ee', roughness: 1, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, sheen: 1, sheenColor: new THREE.Color('#ffffff') })),
      rail: this.mat('rail', () => new THREE.MeshStandardMaterial({ color: '#1e1f21', roughness: 0.4, metalness: 0.7 })),
      hearth: this.mat('hearth', () => surface('marble', { tint: 'stain', color: '#47474a', keep: 0.2, contrast: 1.3, roughness: 0.3 })),
      steel: this.mat('steelF', () => new THREE.MeshStandardMaterial({ color: '#19191a', roughness: 0.55, metalness: 0.65 })),
      fireGlass: this.mat('fglass', () => new THREE.MeshPhysicalMaterial({ color: '#1a1410', roughness: 0.04, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false })),
      fire: this.fireMat(),
      firebox: this.mat('fbox', () => new THREE.MeshStandardMaterial({ color: '#2a2522', roughness: 1 })),
      log: this.mat('log', () => surface('oak', { tint: 'stain', color: '#3d2c20', keep: 0.4, roughness: 0.9 })),
      downlight: this.mat('dl', () => new THREE.MeshStandardMaterial({ color: '#f4f2ee', emissive: '#fff1dc', emissiveIntensity: 0 })),
    };
  }
  fireMat() {
    return this.mat('fire', () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      this.fireCanvas = c;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      this.fireTex = t;
      this.drawFire(0);
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 });
    });
  }
  drawFire(time) {
    const x = this.fireCanvas.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const bx = 40 + i * 22 + Math.sin(time * 3 + i * 1.7) * 6;
      const h = 110 + Math.sin(time * 4.3 + i * 2.1) * 30 + (i % 3) * 18;
      const g = x.createRadialGradient(bx, 230, 4, bx, 230 - h * 0.5, h * 0.75);
      g.addColorStop(0, 'rgba(255,220,140,0.9)');
      g.addColorStop(0.35, 'rgba(255,140,40,0.55)');
      g.addColorStop(1, 'rgba(120,20,0,0)');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(bx, 230 - h * 0.45, 22, h * 0.6, Math.sin(time * 2 + i) * 0.12, 0, Math.PI * 2);
      x.fill();
    }
    const ember = x.createLinearGradient(0, 215, 0, 256);
    ember.addColorStop(0, 'rgba(255,90,20,0)');
    ember.addColorStop(1, 'rgba(255,110,30,0.8)');
    x.fillStyle = ember;
    x.fillRect(20, 215, 216, 41);
    this.fireTex.needsUpdate = true;
  }

  rebuildRoom() {
    const f = this.cfg().fin;
    if (this.room) {
      this.group.remove(this.room.group);
      this.room.group.traverse((o) => o.isMesh && o.geometry.dispose());
    }
    const mats = this.roomMats();
    this.room = buildRoom(this.spec, { accent: f.accent, beams: f.beams, curtains: f.curtains }, mats);
    this.group.add(this.room.group);
    this.applyEnv(this.room.group);
    this.setupLights();
    this.engine.invalidate(4);
  }

  // ---------------------------------------------------------------- lighting
  setupLights() {
    this.downLights.clear();
    // the brightest few downlights become real spots (the rest glow only)
    const dl = this.room.downlights;
    const step = Math.max(1, Math.ceil(dl.length / 6));
    dl.forEach((d, i) => {
      if (i % step) return;
      const s = new THREE.SpotLight('#ffd9a8', 0, 9, 1.05, 0.85, 2);
      s.position.copy(d.pos);
      s.target.position.copy(d.pos).add(new THREE.Vector3(0, -3, 0));
      this.downLights.add(s, s.target);
    });
    this.setEvening(this.evening);
  }
  async setEvening(on) {
    this.evening = on;
    if (!this.active) return;
    const map = await this.loadEnv(on ? 'evening' : 'day');
    if (!this.active) return;
    this.envMap = map;
    this.applyEnv(this.group);
    for (const s of this.downLights.children) if (s.isSpotLight) s.intensity = on ? 7 : 0;
    const dlm = this.matCache.get('dl');
    if (dlm) dlm.emissiveIntensity = on ? 5 : 0;
    for (const it of this.items) lightItem(it, on);
    const fire = this.room?.fire;
    if (fire) {
      this.fireLight.position.copy(fire.pos);
      this.fireLight.intensity = on ? 2.4 : 0;
      fire.mesh.material.opacity = on ? 1 : 0;
    }
    this.engine.renderer.toneMappingExposure = on ? 1.15 : 1.0;
    this.engine.invalidate(4);
  }

  // ---------------------------------------------------------------- per-frame: camera inside the room, fire, selection
  frame(dt) {
    if (!this.active) return false;
    const R = this.spec, E = this.engine, m = 0.2;
    for (const v of [E.camera.position, E.controls.target]) {
      v.x = THREE.MathUtils.clamp(v.x, R.x0 + m, R.x1 - m);
      v.z = THREE.MathUtils.clamp(v.z, R.z0 + m, R.z1 - m);
      v.y = THREE.MathUtils.clamp(v.y, R.floor + 0.25, R.ceil(v.x) - 0.12);
    }
    let anim = false;
    if (this.evening && this.room?.fire) {
      this.fireT = (this.fireT || 0) + dt;
      if ((this.fireAcc = (this.fireAcc || 0) + dt) > 1 / 24) {
        this.fireAcc = 0;
        this.drawFire(this.fireT);
        this.fireLight.intensity = 2.2 + Math.sin(this.fireT * 9) * 0.25 + Math.sin(this.fireT * 23) * 0.15;
      }
      anim = true;
    }
    if (this.sel) {
      this.selBox.box.setFromObject(this.sel.root.children[0]);
      this.placeBar();
    }
    return anim;
  }

  // ---------------------------------------------------------------- furniture
  async furnish() {
    const c = this.cfg();
    if (!c.items) c.items = this.layout(c.style);
    // decor without a height lands on whatever is under it, once the furniture stands
    const later = (r) => ITEM[r.id].mount === 'surface' && r.y == null;
    await Promise.all(c.items.filter((r) => !later(r)).map((r) => this.spawn(r)));
    await Promise.all(c.items.filter(later).map((r) => this.spawn(r)));
    this.settle();
  }
  /** Default arrangement resolved through a style (roles → items, fabric / cabinet variants). */
  layout(styleId) {
    const st = STYLES.find((s) => s.id === styleId) || STYLES[0];
    const R = this.spec, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
    return (LAYOUTS[this.pid] || []).map((p) => {
      const id = p.id || st.roles[p.role];
      const def = ITEM[id];
      const variant = !def?.variants ? undefined : p.role === 'unit' ? st.roles.unitVar : p.role === 'rug' ? st.roles.rugVar : p.role === 'sofa' || p.role === 'corner' ? st.roles.sofaVar : undefined;
      if (p.side) {
        const along = p.side === 'left' || p.side === 'right';
        return { id, variant, side: p.side, u: (along ? cz : cx) + p.u, y: R.floor + p.y };
      }
      return { id, variant, x: cx + p.x, z: cz + p.z, rot: p.rot || 0 };
    }).filter((r) => ITEM[r.id]);
  }
  async spawn(rec) {
    const it = await createItem(rec.id, rec.variant, this.envState);
    if (!this.active) return null;
    it.rec = rec;
    this.items.push(it);
    this.itemsGroup.add(it.root);
    if (it.def.mount === 'ceiling') this.addCord(it);
    this.place(it, rec);
    lightItem(it, this.evening);
    this.engine.invalidate(3);
    return it;
  }
  addCord(it) {
    const m = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 });
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), m);
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 32), m);
    it.cord = { cord, canopy };
    it.root.add(cord, canopy);
  }

  /** Applies a record to an item: position from mount type, clamped into the room. */
  place(it, rec) {
    this.pose(it, rec);
    // ray casts for settling / riders run before the next render: keep the world matrix current
    it.root.updateMatrixWorld(true);
  }
  pose(it, rec) {
    const R = this.spec, root = it.root, s = it.size;
    const mount = it.def.mount;
    if (mount === 'wall') {
      const S = this.room.sides[rec.side];
      const u = THREE.MathUtils.clamp(rec.u, S.u0 + s.x / 2 + 0.02, S.u1 - s.x / 2 - 0.02);
      const top = Math.min(S.top(u - s.x / 2), S.top(u + s.x / 2));
      const y = THREE.MathUtils.clamp(rec.y, R.floor + s.y / 2 + 0.02, top - s.y / 2 - 0.03);
      const off = R.accent === rec.side && this.cfg().fin.accent === 'slats' ? 0.024 : 0.002;
      root.position.copy(S.at(u, y, -off));
      root.rotation.set(0, Math.atan2(S.n.x, S.n.z), 0);
      rec.u = u;
      rec.y = y;
      return;
    }
    const rot = (rec.rot || 0) * DEG;
    const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
    const ex = c * s.x / 2 + sn * s.z / 2, ez = sn * s.x / 2 + c * s.z / 2;
    const b = this.bounds();
    const x = THREE.MathUtils.clamp(rec.x, b.x0 + ex + 0.005, b.x1 - ex - 0.005);
    const z = THREE.MathUtils.clamp(rec.z, b.z0 + ez + 0.005, b.z1 - ez - 0.005);
    rec.x = x;
    rec.z = z;
    root.rotation.set(0, rot, 0);
    if (mount === 'ceiling') {
      const ceil = R.ceil(x);
      const y = Math.min(ceil, Math.max(R.floor + 1.8 + s.y, ceil - 2.2));
      root.position.set(x, y, z);
      const L = ceil - y;
      it.cord.cord.visible = L > 0.02;
      it.cord.cord.scale.y = Math.max(L, 0.001);
      it.cord.cord.position.y = L / 2;
      it.cord.canopy.position.y = L - 0.015;
      return;
    }
    let y = R.floor;
    if (mount === 'surface') y = rec.y ?? this.surfaceY(x, z, it);
    rec.y = y;
    root.position.set(x, y, z);
  }
  /** Usable floor box: the room less the 22 mm slats of a slatted accent wall (furniture stands in front of them). */
  bounds() {
    const R = this.spec, b = { x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1 };
    if (this.cfg().fin.accent === 'slats' && R.accent) {
      const k = { left: 'x0', right: 'x1', back: 'z0', front: 'z1' }[R.accent];
      b[k] += (k.endsWith('0') ? 1 : -1) * 0.024;
    }
    return b;
  }
  /** Height of the first upward-facing surface under (x, z) below `from` (default: the ceiling), ignoring `self`. */
  surfaceY(x, z, self, from) {
    const R = this.spec;
    this.down.set(new THREE.Vector3(x, from ?? R.ceil(x) - 0.05, z), new THREE.Vector3(0, -1, 0));
    const targets = this.items.filter((i) => i !== self && i.def.mount !== 'ceiling').map((i) => i.root);
    const up = (h) => h.face && h.object.visible && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.6;
    const hit = this.down.intersectObjects(targets, true).find(up);
    return hit ? hit.point.y : R.floor;
  }
  /** Drops every decor piece onto the nearest surface below it (lowest first, so stacks settle in order). */
  settle() {
    const decor = this.items.filter((i) => i.def.mount === 'surface').sort((a, b) => (a.rec.y ?? 0) - (b.rec.y ?? 0));
    for (const it of decor) {
      it.rec.y = this.surfaceY(it.rec.x, it.rec.z, it, it.rec.y != null ? it.rec.y + 0.25 : undefined);
      this.place(it, it.rec);
    }
    this.engine.invalidate(2);
  }
  /** Decor standing on `it` (directly or on other riders), with its pose in the support's frame. */
  riders(it) {
    const out = [], supports = [it];
    for (let k = 0; k < supports.length; k++) {
      const sup = supports[k];
      for (const d of this.items) {
        if (d.def.mount !== 'surface' || supports.includes(d)) continue;
        this.down.set(d.root.position.clone().add(new THREE.Vector3(0, 0.03, 0)), new THREE.Vector3(0, -1, 0));
        const h = this.down.intersectObject(sup.root, true)[0];
        if (h && h.distance < 0.06) {
          supports.push(d);
          out.push({ it: d, local: it.root.worldToLocal(d.root.position.clone()), rot: (d.rec.rot || 0) - (it.root.rotation.y / DEG) });
        }
      }
    }
    return out;
  }
  /** Moves riders along with their support after it moved or turned. */
  carry(it, riders) {
    it.root.updateMatrixWorld(true);
    for (const r of riders) {
      const p = it.root.localToWorld(r.local.clone());
      Object.assign(r.it.rec, { x: p.x, y: p.y, z: p.z, rot: Math.round(r.rot + it.root.rotation.y / DEG) });
      this.place(r.it, r.it.rec);
    }
  }

  async addItem(id) {
    const def = ITEM[id];
    const R = this.spec, E = this.engine;
    // drop it where the camera looks: on the floor (or the wall in view for wall pieces)
    this.raycaster.setFromCamera(new THREE.Vector2(0, -0.1), E.camera);
    const rec = { id, variant: def.variants?.[0].id };
    if (def.mount === 'wall') {
      const hit = this.raycaster.intersectObjects(Object.values(this.room.walls), false)[0];
      const side = hit?.object.userData.side || R.accent || 'back';
      const S = this.room.sides[side];
      rec.side = side;
      rec.u = hit ? (S.along.x ? hit.point.x : hit.point.z) : (S.u0 + S.u1) / 2;
      rec.y = R.floor + 1.5;
    } else {
      const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -R.floor), new THREE.Vector3());
      const p = hit && hit.distanceTo(E.camera.position) < 6 ? hit : E.controls.target.clone();
      rec.x = p.x;
      rec.z = p.z;
      // face the camera
      rec.rot = Math.round((Math.atan2(E.camera.position.x - p.x, E.camera.position.z - p.z) / DEG) / 15) * 15;
    }
    this.cfg().items.push(rec);
    const it = await this.spawn(rec);
    if (it) this.select(it);
    this.save();
    this.renderItemsCount();
  }
  remove(it) {
    if (!it) return;
    this.itemsGroup.remove(it.root);
    this.items.splice(this.items.indexOf(it), 1);
    const list = this.cfg().items;
    list.splice(list.indexOf(it.rec), 1);
    if (this.sel === it) this.select(null);
    this.settle();
    this.save();
    this.renderItemsCount();
    this.engine.invalidate(3);
  }
  async duplicate(it) {
    const rec = structuredClone(it.rec);
    if (it.def.mount === 'wall') rec.u += it.size.x + 0.15;
    else rec.x += Math.max(0.3, it.size.x * 0.6);
    if (it.def.mount === 'surface') rec.y = undefined;
    this.cfg().items.push(rec);
    const n = await this.spawn(rec);
    if (n) this.select(n);
    this.save();
    this.renderItemsCount();
  }
  rotate(it, deg) {
    if (!it || it.def.mount === 'wall') return;
    const riders = this.riders(it);
    it.rec.rot = ((((it.rec.rot || 0) + deg) % 360) + 360) % 360;
    this.place(it, it.rec);
    this.carry(it, riders);
    this.settle();
    this.save();
    this.engine.invalidate(2);
  }
  async setVariant(it, v) {
    const rec = it.rec;
    rec.variant = v;
    this.itemsGroup.remove(it.root);
    this.items.splice(this.items.indexOf(it), 1);
    const n = await this.spawn(rec);
    if (n) this.select(n);
    this.settle();
    this.save();
  }
  async refurnish(styleId) {
    const c = this.cfg();
    this.select(null);
    for (const it of this.items) this.itemsGroup.remove(it.root);
    this.items = [];
    c.items = styleId === null ? [] : this.layout(styleId || c.style);
    await this.furnish();
    this.save();
    this.renderItemsCount();
    this.engine.invalidate(3);
  }
  setFinish(key, val) {
    const c = this.cfg();
    c.fin[key] = val;
    this.rebuildRoom();
    // wall pieces on a slatted accent wall stand 2 cm proud, furniture in front of the slats
    this.replaceAll();
    this.save();
  }
  replaceAll() {
    for (const it of this.items) if (it.def.mount !== 'surface') {
      const riders = this.riders(it);
      this.place(it, it.rec);
      this.carry(it, riders);
    }
    this.settle();
  }
  applyStyle(id) {
    const st = STYLES.find((s) => s.id === id);
    const c = this.cfg();
    c.style = id;
    c.fin = { ...c.fin, ...st.finish };
    this.rebuildRoom();
    this.replaceAll();
    this.save();
  }

  // ---------------------------------------------------------------- input: select, drag, keys
  installInput() {
    const el = this.engine.renderer.domElement;
    const ndc = (e) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const pickItem = (e) => {
      this.raycaster.setFromCamera(ndc(e), this.engine.camera);
      const hits = this.raycaster.intersectObjects(this.items.map((i) => i.root), true).filter((h) => h.object.visible && h.object.isMesh);
      // walls / furniture between the camera and the item block the pick
      const wallHit = this.raycaster.intersectObjects([...Object.values(this.room.walls), this.room.ceiling], true)[0];
      const h = hits.find((x) => !wallHit || x.distance < wallHit.distance + 0.03);
      if (!h) return null;
      let o = h.object;
      while (o && !o.userData.item) o = o.parent;
      const it = this.items.find((i) => i.root === o);
      // rugs lose to anything standing on them
      if (it?.def.under) {
        const other = hits.find((x) => {
          let p = x.object;
          while (p && !p.userData.item) p = p.parent;
          return p !== o;
        });
        if (other) {
          let p = other.object;
          while (p && !p.userData.item) p = p.parent;
          return { it: this.items.find((i) => i.root === p), hit: other };
        }
      }
      return it ? { it, hit: h } : null;
    };
    let drag = null;
    el.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.active || e.button !== 0 || !this.room) return;
        const p = pickItem(e);
        if (!p) {
          this.downAt = [e.clientX, e.clientY];
          return;
        }
        e.stopImmediatePropagation();
        this.select(p.it);
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
        const it = p.it, R = this.spec;
        drag = { it, id: e.pointerId, moved: false, riders: this.riders(it) };
        if (it.def.mount === 'wall') {
          drag.dy = it.root.position.y - p.hit.point.y;
          const S = this.room.sides[it.rec.side];
          drag.du = (S.along.x ? it.root.position.x : it.root.position.z) - (S.along.x ? p.hit.point.x : p.hit.point.z);
        } else {
          // drag on a horizontal plane through the grabbed point, so the point stays under the cursor (a floor
          // plane would put it far behind a tall piece and amplify every move); kept below eye level, where the
          // cursor ray would run almost parallel to it
          const py = Math.min(p.hit.point.y, this.engine.camera.position.y - 0.12);
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Math.max(R.floor, py));
          const at = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3()) || p.hit.point;
          drag.plane = plane;
          drag.off = new THREE.Vector3(it.root.position.x - at.x, 0, it.root.position.z - at.z);
        }
        el.style.cursor = 'grabbing';
      },
      { capture: true },
    );
    el.addEventListener('pointermove', (e) => {
      if (!this.active || !this.room) return;
      if (!drag) {
        if (e.buttons === 0) el.style.cursor = pickItem(e) ? 'grab' : '';
        return;
      }
      if (e.pointerId !== drag.id) return;
      drag.moved = true;
      const it = drag.it, rec = it.rec;
      this.raycaster.setFromCamera(ndc(e), this.engine.camera);
      if (it.def.mount === 'wall') {
        const hit = this.raycaster.intersectObjects(Object.values(this.room.walls), false)[0];
        if (!hit) return;
        const side = hit.object.userData.side;
        const S = this.room.sides[side];
        const u = S.along.x ? hit.point.x : hit.point.z;
        if (side !== rec.side) {
          rec.side = side;
          drag.du = 0;
        }
        rec.u = u + drag.du;
        rec.y = hit.point.y + drag.dy;
      } else {
        const at = this.raycaster.ray.intersectPlane(drag.plane, new THREE.Vector3());
        // no hit (ray above the plane) or a runaway point near the horizon: keep the piece where it is
        if (!at || at.distanceTo(this.engine.camera.position) > 14) return;
        let x = at.x + drag.off.x, z = at.z + drag.off.z;
        // pull the back of floor pieces flush with a wall when within 4 cm
        if (it.def.mount === 'floor' && !it.def.under) [x, z] = this.snapToWall(it, x, z);
        if (it.def.mount === 'surface') {
          // decor follows the cursor at its grab offset; it moves onto another surface only when the cursor is
          // over that surface's top (a table, shelf, the unit); otherwise it drops to what is below it
          const skip = new Set([it, ...drag.riders.map((r) => r.it)]);
          const targets = [this.room.floor, ...this.items.filter((i) => !skip.has(i) && i.def.mount !== 'ceiling').map((i) => i.root)];
          const h = this.raycaster.intersectObjects(targets, true).find((q) => q.object.visible);
          const up = h && h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.6;
          if (up && Math.abs(h.point.y - rec.y) > 0.02) {
            [x, z] = [h.point.x + drag.off.x, h.point.z + drag.off.z];
            rec.y = h.point.y;
            drag.plane.constant = -Math.min(h.point.y, this.engine.camera.position.y - 0.12);
          } else rec.y = this.surfaceY(x, z, it, rec.y + 0.05);
        }
        rec.x = x;
        rec.z = z;
      }
      this.place(it, rec);
      this.carry(it, drag.riders);
      this.engine.invalidate(2);
    });
    const up = (e) => {
      if (drag && e.pointerId === drag.id) {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        if (drag.moved) {
          this.settle();
          this.save();
        }
        drag = null;
        el.style.cursor = 'grab';
        return;
      }
      // a click (no orbit) on empty space clears the selection
      if (this.active && this.downAt && Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) < 4) this.select(null);
      this.downAt = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      if (!this.active || !this.sel || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') this.remove(this.sel);
      else if (e.key === 'q' || e.key === 'й') this.rotate(this.sel, -15);
      else if (e.key === 'e' || e.key === 'у') this.rotate(this.sel, 15);
      else if (e.key === 'Escape') this.select(null);
      else return;
      e.preventDefault();
    });
  }
  snapToWall(it, x, z) {
    const R = this.bounds(), s = it.size, rot = (it.rec.rot || 0) * DEG;
    const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
    const ex = c * s.x / 2 + sn * s.z / 2, ez = sn * s.x / 2 + c * s.z / 2;
    const d = 0.04;
    if (x - ex - R.x0 < d) x = R.x0 + ex + 0.005;
    if (R.x1 - (x + ex) < d) x = R.x1 - ex - 0.005;
    if (z - ez - R.z0 < d) z = R.z0 + ez + 0.005;
    if (R.z1 - (z + ez) < d) z = R.z1 - ez - 0.005;
    return [x, z];
  }

  // ---------------------------------------------------------------- selection toolbar
  select(it) {
    this.sel = it || null;
    this.selBox.visible = !!it;
    const bar = this.bar();
    if (!it) {
      bar.hidden = true;
      this.engine.invalidate(2);
      return;
    }
    const d = it.def;
    bar.innerHTML = `<b>${d.label}</b>
      ${d.variants ? `<span class="ib-sw">${d.variants.map((v) => `<button data-v="${v.id}" class="${v.id === it.rec.variant ? 'on' : ''}" title="${v.label}" style="background:${v.color}"></button>`).join('')}</span>` : ''}
      ${d.mount !== 'wall' ? `<button data-a="l" title="Повернуть (Q)">⟲</button><button data-a="r" title="Повернуть (E)">⟳</button>` : ''}
      <button data-a="dup" title="Копия">⧉</button><button data-a="del" title="Удалить (Delete)">✕</button>`;
    bar.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b || !this.sel) return;
      if (b.dataset.v) this.setVariant(this.sel, b.dataset.v);
      else if (b.dataset.a === 'l') this.rotate(this.sel, -45);
      else if (b.dataset.a === 'r') this.rotate(this.sel, 45);
      else if (b.dataset.a === 'dup') this.duplicate(this.sel);
      else if (b.dataset.a === 'del') this.remove(this.sel);
    };
    bar.hidden = false;
    this.placeBar();
    this.engine.invalidate(2);
  }
  bar() {
    if (!this._bar) {
      this._bar = document.createElement('div');
      this._bar.className = 'itembar';
      this._bar.hidden = true;
      document.querySelector('#stage').appendChild(this._bar);
    }
    return this._bar;
  }
  placeBar() {
    const b = this.selBox.box, E = this.engine;
    const p = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2).project(E.camera);
    const el = E.renderer.domElement, bar = this.bar();
    const x = ((p.x + 1) / 2) * el.clientWidth, y = ((1 - p.y) / 2) * el.clientHeight;
    const vis = p.z < 1;
    bar.style.transform = `translate(${Math.round(Math.min(Math.max(x, 140), el.clientWidth - 140))}px, ${Math.round(Math.min(Math.max(y - 14, 70), el.clientHeight - 80))}px) translate(-50%, -100%)`;
    bar.style.opacity = vis ? 1 : 0;
  }

  // ---------------------------------------------------------------- panel UI
  renderProject(el, P) {
    const R = this.spec;
    const area = (R.x1 - R.x0) * (R.z1 - R.z0);
    const hMax = Math.max(R.ceil(R.x0), R.ceil(R.x1), ...(R.breaks || []).map(R.ceil)) - R.floor;
    el.innerHTML = `
      <div class="eyebrow"><span>Интерьер</span> · <span>${P.name}</span></div>
      <h1>${R.title}</h1>
      <p class="tag">Отделка и расстановка мебели в ${R.titleIn}. Перетаскивайте предметы мышью: мебель — по полу, картины и полки — по стенам, вазы и книги — на столы и полки.</p>
      <dl class="specs">
        <div><dt>Площадь</dt><dd>${fmt(area)} м²</dd></div>
        <div><dt>Потолок</dt><dd>до ${fmt(hMax, 2)} м, ${R.breaks?.length ? 'двускатный' : 'односкатный'}</dd></div>
      </dl>`;
  }
  renderOptions(el) {
    const c = this.cfg(), f = c.fin;
    const sw = (group, it, on) => {
      const bg = it.thumb ? `url(${BASE}${THUMBS}${it.thumb}.png) center/cover` : it.color || 'repeating-linear-gradient(45deg,#e8e6e1 0 4px,#f6f5f2 4px 8px)';
      const tint = it.color && it.thumb ? `<u style="background:${it.color}"></u>` : '';
      return `<button class="sw ${on ? 'on' : ''}" data-f="${group}" data-v="${it.id}" title="${it.label}${it.note ? ' — ' + it.note : ''}"><i style="background:${bg}">${tint}</i><span>${it.label}${it.note ? `<small>${it.note}</small>` : ''}</span></button>`;
    };
    const pal = (g, off = false) => `<div class="pal ${off ? 'off' : ''}"><h3>${FINISHES[g].label}</h3><div class="sws">${FINISHES[g].items.map((it) => sw(g, it, f[g] === it.id)).join('')}</div></div>`;
    const wallItem = FINISHES.walls.items.find((w) => w.id === f.walls);
    const colors = `<div class="pal ${wallItem.colors ? '' : 'off'}"><h3>Цвет стен</h3><div class="dots">${WALL_COLORS.map((w) => `<button class="dot ${f.wallColor === w.id ? 'on' : ''}" data-f="wallColor" data-v="${w.id}" title="${w.label}" style="background:${w.color}"></button>`).join('')}</div></div>`;
    const floorItem = FINISHES.floor.items.find((w) => w.id === f.floor);
    const sec = (num, title, body, sub = '') => `<section class="opt"><h2><em>${num}</em>${title}${sub ? `<span>${sub}</span>` : ''}</h2>${body}</section>`;
    let html = '';
    html += sec(
      '01',
      'Стиль',
      `<div class="cards styles">${STYLES.map((s) => `<button class="card ${c.style === s.id ? 'on' : ''}" data-style="${s.id}"><b>${s.label}</b><small>${s.note}</small></button>`).join('')}</div>
       <div class="row-btns"><button class="btn ghost sm" data-act="furnish">Расставить мебель в стиле</button><button class="btn ghost sm" data-act="clear">Пустая комната</button></div>`,
      'отделка одним кликом',
    );
    html += sec('02', 'Стены', pal('walls') + colors + pal('accent'));
    html += sec('03', 'Пол', pal('floor') + pal('tone', !floorItem.wood));
    html += sec('04', 'Потолок', pal('ceiling') + pal('beams'));
    html += sec('05', 'Детали', pal('trim') + pal('curtains'));
    html += sec(
      '06',
      'Мебель и декор',
      `<div class="tabs">${CATEGORIES.map(([k, l]) => `<button data-cat="${k}" class="${this.cat === k ? 'on' : ''}">${l}</button>`).join('')}</div>
       <div class="items">${ITEMS.filter((i) => i.cat === this.cat).map((i) => `<button class="item" data-add="${i.id}" title="Добавить: ${i.label}"><i style="background-image:url(${this.thumb(i)})"></i><b>${i.label}</b>${i.note ? `<small>${i.note}</small>` : ''}</button>`).join('')}</div>
       <p class="note" id="items-count"></p>`,
      'клик — добавить',
    );
    el.innerHTML = html;
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.f) this.setFinish(b.dataset.f, b.dataset.v);
      else if (b.dataset.style) this.applyStyle(b.dataset.style);
      else if (b.dataset.act === 'furnish') this.refurnish(c.style);
      else if (b.dataset.act === 'clear') this.refurnish(null);
      else if (b.dataset.cat) this.cat = b.dataset.cat;
      else if (b.dataset.add) return this.addItem(b.dataset.add);
      else return;
      this.renderOptions(el);
    };
    this.renderItemsCount();
    this.makeThumbs(el);
  }
  renderItemsCount() {
    const el = document.querySelector('#items-count');
    if (el) el.textContent = `В комнате: ${this.cfg().items?.length || 0} предм. Выделите предмет, чтобы повернуть, сменить обивку, скопировать или удалить его (Q / E — поворот, Delete — удалить).`;
  }
  thumb(def) {
    if (!def.proc) return `${BASE}${THUMBS}${def.id}.png`;
    return this.thumbs[def.id] || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#efeee9"/></svg>');
  }
  /** Renders thumbnails of the procedural pieces once (offscreen, interior HDRI light). */
  async makeThumbs(el) {
    const todo = ITEMS.filter((i) => i.proc && !this.thumbs[i.id] && i.cat === this.cat);
    if (!todo.length) return;
    const env = await this.loadEnv('day');
    const r = this.engine.renderer, S = 192;
    const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f3f2ee');
    scene.environment = env;
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(2, 4, 3);
    scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    const px = new Uint8Array(S * S * 4);
    for (const def of todo) {
      const it = await createItem(def.id, def.variants?.[0].id, { map: env, intensity: 1 });
      scene.add(it.root);
      const b = new THREE.Box3().setFromObject(it.root), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
      const R = Math.max(sz.x, sz.y, sz.z) * 0.62 + 0.05;
      const dir = def.mount === 'wall' ? new THREE.Vector3(0.35, 0.15, 1) : def.cat === 'rug' ? new THREE.Vector3(0.6, 1.4, 1) : new THREE.Vector3(0.75, 0.55, 1);
      cam.position.copy(c).addScaledVector(dir.normalize(), R / Math.tan((15 * Math.PI) / 180));
      cam.lookAt(c);
      r.setRenderTarget(rt);
      r.render(scene, cam);
      r.readRenderTargetPixels(rt, 0, 0, S, S, px);
      r.setRenderTarget(null);
      scene.remove(it.root);
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
      ctx.putImageData(img, 0, 0);
      this.thumbs[def.id] = cv.toDataURL('image/jpeg', 0.85);
      const t = el.querySelector(`[data-add="${def.id}"] i`);
      if (t) t.style.backgroundImage = `url(${this.thumbs[def.id]})`;
    }
    rt.dispose();
    this.engine.invalidate(2);
  }

  /** Lines for the request dialog. */
  describe(pid) {
    const c = this.store[pid];
    if (!c) return [];
    const f = c.fin;
    const L = (g) => FINISHES[g].items.find((i) => i.id === f[g])?.label;
    const wc = WALL_COLORS.find((w) => w.id === f.wallColor)?.label;
    const wood = FINISHES.floor.items.find((i) => i.id === f.floor)?.wood;
    return [
      `Интерьер, стиль: ${STYLES.find((s) => s.id === c.style)?.label || '—'}`,
      `Стены: ${L('walls')}${FINISHES.walls.items.find((w) => w.id === f.walls).colors ? `, ${wc.toLowerCase()}` : ''}; акцент: ${L('accent').toLowerCase()}`,
      `Пол: ${L('floor')}${wood ? `, ${L('tone').toLowerCase()}` : ''}`,
      `Потолок: ${L('ceiling')}${f.beams !== 'none' ? `, балки (${L('beams').toLowerCase()})` : ''}`,
      `Плинтус и двери: ${L('trim').toLowerCase()}; шторы: ${L('curtains').toLowerCase()}`,
      `Мебель и декор: ${c.items?.length || 0} предм.`,
    ];
  }
}

/** Lamp items: point light and glowing shade / glass in the evening. */
function lightItem(it, on) {
  for (const L of it.lights) L.visible = on;
  for (const m of it.glow) {
    if (!m.emissive) continue;
    if (!m.userData.glow) m.emissive.set('#ffc58a');
    m.emissiveIntensity = on ? (m.userData.glow ? 2.2 : 3) : 0;
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}
