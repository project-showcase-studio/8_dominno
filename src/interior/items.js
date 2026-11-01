// Furniture and decor: Poly Haven glTF models (normalised to a mount pivot) and procedural pieces built here —
// upholstered sofas (dense soft geometry with piping, puckered seams and folds, a draped throw), a modular TV wall
// unit with books and glazed ceramics, TVs, rugs, oak shelves, a tripod floor lamp and framed posters.
// Every item is a Group facing +Z with its pivot at: floor/surface — bottom centre; wall — back centre (y = middle);
// ceiling — top centre.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BASE, surface, onTextureReady, mulberry } from '../materials.js';
import { box, metreUV } from '../geom.js';
import { ITEM } from './catalog.js';

const loader = new GLTFLoader();
const templates = new Map();

/** Loads (once) and normalises a Poly Haven model; resolves to a template Group. */
function loadModel(id) {
  if (!templates.has(id)) {
    templates.set(
      id,
      loader.loadAsync(`${BASE}interior/models/${id}/model.gltf`).then((gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = true;
          const fix = (m) => {
            // KHR transmission needs an extra scene pass per frame: thin glass reads the same as a clear coat here
            // (frame and lamp glass also ships as a dark textured blend layer that reads as an opaque sheet)
            if (m.transmission > 0 || /glass/i.test(m.name)) {
              const g = new THREE.MeshPhysicalMaterial({ color: m.color, roughness: Math.min(m.roughness, 0.08), metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, name: m.name });
              o.castShadow = false;
              return g;
            }
            if (m.map) m.map.anisotropy = 8;
            return m;
          };
          o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
        });
        return root;
      }),
    );
  }
  return templates.get(id);
}

/** Shifts the object so its bounds sit on the mount pivot. */
function normalise(obj, mount) {
  const holder = new THREE.Group();
  holder.add(obj);
  holder.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  const c = b.getCenter(new THREE.Vector3());
  if (mount === 'wall') obj.position.sub(new THREE.Vector3(c.x, c.y, b.min.z));
  else if (mount === 'ceiling') obj.position.sub(new THREE.Vector3(c.x, b.max.y, c.z));
  else obj.position.sub(new THREE.Vector3(c.x, b.min.y, c.z));
  holder.updateMatrixWorld(true);
  return holder;
}

/**
 * Creates an item instance: { root (Group), def, size (local bounds Vector3), lights: [PointLight], glow: [materials] }.
 * envMap: interior IBL applied to every material.
 */
export async function createItem(id, variant, env) {
  const def = ITEM[id];
  let obj;
  if (def.proc) obj = PROC[id](variantOf(def, variant));
  else {
    const t = await loadModel(id);
    obj = t.clone(true);
    // clone materials so evening glow / env do not leak between instances of the same model
    obj.traverse((o) => o.isMesh && (o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()));
    if (def.rot) obj.rotation.y = (def.rot * Math.PI) / 180;
  }
  const holder = normalise(obj, def.mount);
  const root = new THREE.Group();
  root.add(holder);
  const box3 = new THREE.Box3().setFromObject(holder);
  const size = box3.getSize(new THREE.Vector3());
  const glow = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (env) {
        m.envMap = env.map;
        m.envMapIntensity = env.intensity;
      }
      if (def.glow && def.glow.test(m.name || '')) glow.push(m);
      if (m.userData.glow) glow.push(m);
    }
  });
  const lights = [];
  if (def.light) {
    const L = new THREE.PointLight('#ffc98a', def.light.intensity, def.light.distance, 2);
    L.position.set(...def.light.at);
    L.visible = false;
    root.add(L);
    lights.push(L);
  }
  root.userData.item = { id, variant: variantOf(def, variant)?.id };
  return { root, def, size, box: box3, lights, glow };
}

const variantOf = (def, v) => (def.variants ? def.variants.find((x) => x.id === v) || def.variants[0] : null);

// ---------------------------------------------------------------- shared procedural materials
const cache = new Map();
const once = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));
function fabric(color, set = 'boucle') {
  return once('fab' + set + color, () => {
    // the weave reads as relief and soft tonal variation, not as the photographed pattern
    const m = surface(set, { color, albedo: false, normalScale: 1.3, roughness: 1, physical: true });
    m.sheen = 1;
    m.sheenRoughness = 0.55;
    m.sheenColor = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45);
    return m;
  });
}
const oak = () => once('oak', () => surface('oak', { tint: 'stain', color: '#b08657', keep: 0.75, contrast: 1.05, roughness: 0.55 }));
const oakDark = () => once('oakDark', () => surface('oak', { tint: 'stain', color: '#6b4a32', keep: 0.5, contrast: 1.1, roughness: 0.5 }));
const lacquer = (c) => once('lac' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
const blackMetal = () => once('blackMetal', () => new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: 0.42, metalness: 0.7 }));
const brass = () => once('brass', () => new THREE.MeshStandardMaterial({ color: '#c39a5a', roughness: 0.28, metalness: 1 }));
const plastic = (c) => once('pl' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.1 }));

const mesh = (g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = o.receiveShadow = true;
  return o;
};
const rbox = (w, h, d, r, seg = 4) => metreUV(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));

// ---------------------------------------------------------------- upholstery
/**
 * Soft upholstered block on a dense grid (3 cm), so the faces can deform: rounded edges (radius r), a crowned
 * filling on the two faces across the thin `axis`, bulging sides, a seat dip (`sag`), puckering along the seams and
 * soft folds over the faces (`wrinkle`, deterministic per `seed`). Returns { geo, seams: [CatmullRomCurve3] }.
 */
function softBox(w, h, d, { r = 0.04, axis = 'y', crown = 0.02, bulge = 0.008, sag = 0, wrinkle = 1, seed = 1, seams = true } = {}) {
  const ext = { x: w / 2, y: h / 2, z: d / 2 };
  const seg = (L) => Math.min(72, Math.max(4, Math.ceil(L / 0.03)));
  let g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  // round the box: clamp to the inner box, push out by r along the offset
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -ext.x + r, ext.x - r), THREE.MathUtils.clamp(v.y, -ext.y + r, ext.y - r), THREE.MathUtils.clamp(v.z, -ext.z + r, ext.z - r));
    const off = v.clone().sub(c);
    if (off.lengthSq() > 1e-12) v.copy(c).add(off.normalize().multiplyScalar(r));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal;
  const R = mulberry(seed * 7919 + 13);
  const ph = Array.from({ length: 8 }, () => R() * Math.PI * 2);
  const [a1, a2] = axis === 'y' ? ['x', 'z'] : axis === 'z' ? ['x', 'y'] : ['z', 'y']; // in-plane axes of the crowned faces
  const sm = (e0, e1, t) => THREE.MathUtils.smoothstep(t, e0, e1);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const N = new THREE.Vector3().fromBufferAttribute(n, i);
    const u = v[a1] / ext[a1], q = v[a2] / ext[a2], s = v[axis] / ext[axis];
    const fill = Math.max(0, 1 - u * u) * Math.max(0, 1 - q * q); // 1 in the middle of a face, 0 at its edges
    let disp = 0;
    // crowned faces (more on the top/front than the underside / back)
    disp += crown * fill * (s > 0 ? 1 : 0.45) * Math.abs(s) ** 2;
    // bulging sides
    disp += bulge * (1 - s * s) * Math.max(Math.abs(u), Math.abs(q)) ** 4;
    // seat dip, towards the front edge
    if (sag && s > 0) disp -= sag * Math.exp(-(u * u) * 2.2 - ((q - 0.25) ** 2) * 2.5) * s;
    // puckering along the seams: short creases across the edge, strongest at the edge, dying into the face
    const edge = Math.max(Math.abs(u), Math.abs(q));
    const along = Math.abs(u) > Math.abs(q) ? v[a2] : v[a1];
    const pk = sm(0.72, 1.0, edge) * (0.4 + 0.6 * Math.abs(s));
    disp += wrinkle * 0.0024 * pk * Math.sin(along * 105 + ph[0] + Math.sin(along * 23 + ph[1]) * 1.6) * (0.6 + 0.4 * Math.sin(along * 9 + ph[2]));
    // creases running in from the corners of the filled faces
    const cu = Math.abs(u) * Math.abs(q);
    disp -= wrinkle * 0.006 * sm(0.55, 0.95, cu) * Math.abs(s) * (0.5 + 0.5 * Math.sin(Math.atan2(q, u) * 14 + ph[3]));
    // soft folds over the faces
    disp += wrinkle * 0.0035 * fill * Math.abs(s) * Math.sin(v[a1] * 9 + ph[4]) * Math.sin(v[a2] * 7 + ph[5]);
    disp += wrinkle * 0.0015 * Math.sin(v[a1] * 31 + v[a2] * 17 + ph[6]) * Math.sin(v[a2] * 27 - ph[7]);
    v.addScaledVector(N, disp);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  metreUV(g);
  // welt seams around the two crowned faces, on the edge radius
  const curves = [];
  if (seams) {
    for (const sgn of [-1, 1]) {
      const k = r * (1 - Math.SQRT1_2);
      const A = ext[a1] - k, B = ext[a2] - k, cr = Math.max(0.005, r * 0.75);
      const pts = [];
      const corner = (cx, cy, a0) => {
        for (let j = 0; j <= 6; j++) {
          const a = a0 + (j / 6) * (Math.PI / 2);
          pts.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
        }
      };
      corner(A - cr, B - cr, 0);
      corner(-A + cr, B - cr, Math.PI / 2);
      corner(-A + cr, -B + cr, Math.PI);
      corner(A - cr, -B + cr, Math.PI * 1.5);
      const y = sgn * (ext[axis] - k);
      curves.push(new THREE.CatmullRomCurve3(pts.map(([x1, x2]) => {
        const o = new THREE.Vector3();
        o[a1] = x1;
        o[a2] = x2;
        o[axis] = y;
        return o;
      }), true, 'centripetal'));
    }
  }
  return { geo: g, seams: curves };
}

/** Adds a soft block with its welt piping to a group. */
function upholster(grp, F, w, h, d, opts, pos, rot = [0, 0, 0]) {
  const { geo, seams } = softBox(w, h, d, opts);
  const m = mesh(geo, F, ...pos, ...rot);
  grp.add(m);
  for (const cv of seams) {
    const t = metreUV(new THREE.TubeGeometry(cv, Math.ceil(cv.getLength() / 0.012), 0.0042, 8, true));
    const pm = mesh(t, F, ...pos, ...rot);
    pm.castShadow = false;
    grp.add(pm);
  }
  return m;
}

/**
 * Knitted throw draped over a sofa arm: down the outer side, over the top, down the inner side to the seat and
 * on across the seat cushion, with folds deepening towards the hems. armH: arm height above the seat top.
 */
function throwBlanket(color, armH, armW, len = 1.12, wid = 0.55) {
  const g = new THREE.PlaneGeometry(wid, len, 40, 110);
  const p = g.attributes.position;
  const top = armW + 0.03, L1 = 0.32, L2 = top, L3 = armH, L4 = len - L1 - L2 - L3;
  for (let i = 0; i < p.count; i++) {
    const z = p.getX(i), t = p.getY(i) + len / 2;
    let x, y, hang = 0;
    if (t < L1) [x, y, hang] = [-top / 2 - 0.012, -(L1 - t), 1 - t / L1];
    else if (t < L1 + L2) {
      const a = (t - L1) / L2;
      [x, y] = [-top / 2 - 0.012 + a * (top + 0.024), 0.012 + Math.sin(a * Math.PI) * 0.016];
    } else if (t < L1 + L2 + L3) [x, y] = [top / 2 + 0.012, -(t - L1 - L2)];
    else {
      // lying on the seat cushion, rumpled
      const q = t - L1 - L2 - L3;
      // clear of the cushion crown (≈ 3 cm in the middle), a soft ruck where it meets the arm
      const crown = 0.034 * Math.min(1, q / 0.12);
      [x, y, hang] = [top / 2 + 0.012 + q, -L3 + 0.008 + crown + Math.exp(-((q - 0.06) ** 2) / 0.0015) * 0.025, 0.4 * q / L4];
    }
    const fold = (Math.sin(z * 11 + t * 2.5) * 0.7 + Math.sin(z * 19 + 1.3) * 0.3) * 0.022 * hang + (Math.abs(z) / (wid / 2)) ** 6 * 0.008;
    if (t < L1) x -= fold;
    else if (t < L1 + L2) y += (Math.abs(z) / (wid / 2)) ** 6 * -0.006;
    else if (t < L1 + L2 + L3) x += Math.abs(fold);
    else y += Math.abs(fold) * 0.5;
    p.setXYZ(i, x, y, z + Math.sin(t * 6) * 0.01 * hang);
  }
  g.computeVertexNormals();
  metreUV(g);
  const mat = once('throw' + color, () => {
    const s = surface('boucle', { color, albedo: false, normalScale: 1.2, roughness: 1, physical: true, tile: [0.35, 0.35] });
    s.sheen = 1;
    s.sheenRoughness = 0.4;
    s.sheenColor = new THREE.Color(color).lerp(new THREE.Color('#fff'), 0.5);
    s.side = THREE.DoubleSide;
    return s;
  });
  return new THREE.Mesh(g, mat);
}

// ---------------------------------------------------------------- sofas
function sofa({ color }, corner = false) {
  const g = new THREE.Group();
  const F = fabric(color), legs = blackMetal();
  const W = corner ? 2.8 : 2.3, D = 0.96, armW = 0.2, seatY = 0.44, baseY = 0.13, baseH = 0.15;
  const chaise = corner ? { w: 0.98, d: 1.72 } : null;
  let seed = 1;
  // upholstered base (frame) on slim legs
  upholster(g, F, W - 0.02, baseH, D - 0.02, { r: 0.03, crown: 0.004, wrinkle: 0.3, seed: seed++ }, [0, baseY + baseH / 2, 0]);
  if (chaise) upholster(g, F, chaise.w - 0.02, baseH, chaise.d - D + 0.06, { r: 0.03, crown: 0.004, wrinkle: 0.3, seed: seed++ }, [W / 2 - chaise.w / 2, baseY + baseH / 2, D / 2 + (chaise.d - D) / 2 - 0.03]);
  const legAt = [[-W / 2 + 0.07, -D / 2 + 0.07], [-W / 2 + 0.07, D / 2 - 0.07], [W / 2 - 0.07, -D / 2 + 0.07], [W / 2 - 0.07, (chaise ? chaise.d - D / 2 : D / 2) - 0.07], [0, -D / 2 + 0.07]];
  if (chaise) legAt.push([W / 2 - chaise.w + 0.07, chaise.d - D / 2 - 0.07]);
  for (const [x, z] of legAt) {
    g.add(mesh(new THREE.CylinderGeometry(0.017, 0.011, baseY - 0.004, 20), legs, x, (baseY - 0.004) / 2 + 0.004, z));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 16), plastic('#202020'), x, 0.002, z)); // felt glide
  }
  // back frame and arms
  const deckY = baseY + baseH;
  upholster(g, F, W - 0.02, 0.44, 0.17, { r: 0.06, axis: 'z', crown: 0.01, wrinkle: 0.5, seed: seed++ }, [0, deckY + 0.22, -D / 2 + 0.095]);
  const arm = (x) => upholster(g, F, armW, 0.42, D - 0.01, { r: 0.075, axis: 'x', crown: 0.012, bulge: 0.01, wrinkle: 0.8, seed: seed++ }, [x, deckY + 0.21 - 0.03, 0.003]);
  arm(-W / 2 + armW / 2);
  if (!chaise) arm(W / 2 - armW / 2);
  // seat cushions with a used-in dip, on the deck
  const seatW = W - armW - (chaise ? chaise.w : armW), n = chaise ? 2 : 3, cw = seatW / n, x0 = -W / 2 + armW;
  const ch = seatY - deckY + 0.04;
  for (let i = 0; i < n; i++) upholster(g, F, cw - 0.006, ch, D - 0.19, { r: 0.05, crown: 0.028, sag: 0.014, bulge: 0.01, seed: seed++ }, [x0 + cw * (i + 0.5), deckY + ch / 2 - 0.005, 0.085]);
  if (chaise) upholster(g, F, chaise.w - 0.03, ch, chaise.d - 0.19, { r: 0.05, crown: 0.028, sag: 0.01, bulge: 0.01, seed: seed++ }, [W / 2 - chaise.w / 2 - 0.01, deckY + ch / 2 - 0.005, (chaise.d - D) / 2 + 0.085]);
  // loose back cushions leaning on the frame
  const nb = 3, bwid = (W - armW - (chaise ? 0.03 : armW)) / nb;
  for (let i = 0; i < nb; i++) upholster(g, F, bwid - 0.008, 0.48, 0.2, { r: 0.07, axis: 'z', crown: 0.045, bulge: 0.012, wrinkle: 1.2, seed: seed++ }, [x0 + bwid * (i + 0.5), seatY + 0.235, -D / 2 + 0.25], [-0.2, 0, 0]);
  // scatter pillows: thin at the edges, full in the middle, pinched corners
  const pillow = (c, set, x, rz, ry) => upholster(g, fabric(c, set), 0.46, 0.46, 0.08, { r: 0.02, axis: 'z', crown: 0.11, bulge: 0.004, wrinkle: 1.6, seed: seed++ }, [x, seatY + 0.25, -D / 2 + 0.42], [-0.32, ry, rz]);
  pillow('#e6e0d4', 'herringbone', x0 + 0.3, 0.06, 0.22);
  pillow('#9c8a6d', 'herringbone', x0 + seatW - 0.32, -0.08, -0.2);
  // knitted throw over the left arm
  const armTop = deckY + 0.39;
  const t = throwBlanket(color === '#4a4b4d' ? '#c9bfae' : '#8c8476', armTop - (seatY + 0.03), armW);
  t.position.set(-W / 2 + armW / 2, armTop, 0.12);
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  return g;
}

// ---------------------------------------------------------------- books: cloth boards, rounded spine with printed bands, page block
const BOOK_COLORS = ['#6f5a46', '#c9bfae', '#2f3d47', '#8a6d4a', '#d8d0c2', '#4a3f38', '#7c2f2a', '#3f5a4c'];
function spineAtlas() {
  return once('spineAtlas', () => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const x = c.getContext('2d');
    const cw = 128;
    BOOK_COLORS.forEach((col, i) => {
      const x0 = i * cw;
      x.fillStyle = col;
      x.fillRect(x0, 0, cw, 512);
      // cloth grain
      for (let k = 0; k < 900; k++) {
        x.fillStyle = `rgba(${k % 2 ? 255 : 0},${k % 2 ? 255 : 0},${k % 2 ? 255 : 0},0.035)`;
        x.fillRect(x0 + Math.random() * cw, Math.random() * 512, 1 + Math.random() * 2, 1);
      }
      const ink = ['#c8a65a', '#efe8da', '#1c1c1c'][i % 3];
      x.fillStyle = ink;
      // head/tail bands and a title block (abstract strokes standing for lettering)
      const bands = [[18, 4], [28, 2], [470, 2], [480, 4]];
      if (i % 2) bands.push([120, 30]);
      for (const [y, h] of bands) x.fillRect(x0 + 10, y, cw - 20, h);
      x.globalAlpha = 0.9;
      for (let k = 0; k < 7; k++) x.fillRect(x0 + cw / 2 - 26 + ((k * 37) % 9), 190 + k * 20, 44 - ((k * 13) % 17), 9);
      x.fillRect(x0 + cw / 2 - 18, 420, 36, 10);
      x.globalAlpha = 1;
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}
function pagesMat() {
  return once('pages', () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 16;
    const x = c.getContext('2d');
    x.fillStyle = '#efe7d6';
    x.fillRect(0, 0, 256, 16);
    for (let i = 0; i < 256; i += 2) {
      x.fillStyle = `rgba(120,100,70,${0.08 + Math.random() * 0.12})`;
      x.fillRect(i, 0, 1, 16);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 1); // ~ 0.4 mm per sheet line across the block
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  });
}
/** One book standing with its spine to +z; bottom at y = 0, x centred. Adds meshes to `grp`. */
function book(grp, { w, h, d, ci, x = 0, y = 0, z = 0, lean = 0, lie = false }) {
  const b = new THREE.Group();
  const coverM = once('cover' + ci, () => surface('herringbone', { color: BOOK_COLORS[ci], albedo: false, normalScale: 0.4, roughness: 0.75 }));
  const t = 0.0028, ov = 0.003; // board thickness, overhang of the boards over the pages
  for (const s of [-1, 1]) b.add(mesh(box(t, h, d - w / 2, { round: 0.0008 }), coverM, s * (w / 2 - t / 2), h / 2, -w / 4));
  b.add(mesh(box(w - 2 * t, h - 2 * ov, d - w / 2 - ov), pagesMat(), 0, h / 2, -w / 4 - ov / 2));
  // rounded spine: half cylinder, printed from the atlas column of this book
  const sp = new THREE.CylinderGeometry(w / 2, w / 2, h, 14, 1, true, -Math.PI / 2, Math.PI);
  const uv = sp.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (ci + 0.06 + uv.getX(i) * 0.88) / 8);
  sp.scale(1, 1, 0.55);
  const spm = once('spine', () => new THREE.MeshStandardMaterial({ map: spineAtlas(), roughness: 0.7, side: THREE.DoubleSide }));
  b.add(mesh(sp, spm, 0, h / 2, d / 2 - w / 2));
  if (lie) {
    b.rotation.z = Math.PI / 2;
    b.position.set(x, y + w / 2, z);
    grp.add(b);
  } else if (lean) {
    // tilted towards -x, resting on its lower left edge: x is that edge (the pivot on the shelf)
    const pivot = new THREE.Group();
    b.position.x = w / 2;
    pivot.add(b);
    pivot.rotation.z = lean;
    pivot.position.set(x, y, z);
    grp.add(pivot);
  } else {
    b.position.set(x, y, z);
    grp.add(b);
  }
}
/** A run of books on a shelf from x0 to at most x1 (depth d max), a small lying stack at the end. */
function bookRow(grp, x0, x1, y, z, seed, maxH = 0.27) {
  const R = mulberry(seed);
  let x = x0, lastH = 0; // the run starts against the case side
  const n = 4 + Math.floor(R() * 5);
  for (let i = 0; i < n && x < x1 - 0.06; i++) {
    const w = 0.018 + R() * 0.026, h = Math.min(maxH, 0.17 + R() * 0.1);
    book(grp, { w, h, d: 0.12 + R() * 0.05, ci: Math.floor(R() * 8), x: x + w / 2, y, z });
    x += w + 0.0015;
    lastH = h;
  }
  // the last book leans on the run: lower left edge on the shelf, its left face touching the top corner of the
  // last standing book (or, if that one is taller, its own top corner against that book's face)
  const lw = 0.022, lh = Math.min(maxH, lastH * 1.05, 0.24), a = 0.24;
  const reach = Math.min(lastH * Math.tan(a), lh * Math.sin(a));
  if (lastH > 0.1 && x - 0.0015 + reach + lw * Math.cos(a) < x1 - 0.12) {
    const xr = x - 0.0015; // right face of the last standing book
    book(grp, { w: lw, h: lh, d: 0.15, ci: Math.floor(R() * 8), x: xr + reach, y, z, lean: a });
    x = xr + reach + lw * Math.cos(a) + 0.03;
  }
  let sy = y;
  for (let k = 0; k < 3 && x < x1 - 0.17; k++) {
    const w = 0.02 + R() * 0.012;
    book(grp, { w, h: 0.2 - k * 0.015, d: 0.14 - k * 0.01, ci: Math.floor(R() * 8), x: x + 0.1, y: sy, z, lie: true });
    sy += w;
  }
}

// ---------------------------------------------------------------- glazed ceramics
function ceramic(profile, color, { seg = 96, rim = '#ffffff' } = {}) {
  const pts = profile.map(([a, b]) => new THREE.Vector2(a, b));
  const g = new THREE.LatheGeometry(pts, seg);
  // glaze pooling: darker towards the foot, lighter where it runs thin at the rim
  const p = g.attributes.position, top = Math.max(...profile.map((q) => q[1]));
  const col = new Float32Array(p.count * 3), c0 = new THREE.Color(color), c1 = new THREE.Color(color).multiplyScalar(0.72), c2 = new THREE.Color(rim);
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / top;
    const c = c1.clone().lerp(c0, THREE.MathUtils.smoothstep(t, 0.05, 0.45)).lerp(c2, THREE.MathUtils.smoothstep(t, 0.93, 1) * 0.35);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = once('glaze', () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide }));
  return mesh(g, m);
}
// vase profiles (radius, height), walls with thickness and an inner lip so the opening reads
const VASE = [
  [[0, 0], [0.045, 0], [0.05, 0.004], [0.066, 0.05], [0.068, 0.08], [0.058, 0.14], [0.034, 0.185], [0.026, 0.205], [0.03, 0.222], [0.032, 0.226], [0.027, 0.226], [0.022, 0.21], [0.02, 0.19], [0, 0.18]],
  [[0, 0], [0.03, 0], [0.034, 0.004], [0.04, 0.06], [0.044, 0.15], [0.04, 0.24], [0.03, 0.27], [0.031, 0.282], [0.026, 0.282], [0.023, 0.26], [0, 0.25]],
];

// ---------------------------------------------------------------- TV wall unit «стенка»: console, two tall cases, shelf
function cabinetMats(v) {
  const id = v?.id || 'white';
  const front = id === 'oak' ? oak() : id === 'graphite' ? lacquer('#3a3b3d') : lacquer('#eeeae2');
  return { carcass: id === 'oak' ? oak() : front, top: oak(), front, gap: plastic('#141414') };
}
function tvUnit(v) {
  const g = new THREE.Group();
  const m = cabinetMats(v);
  const cw = 0.42, ch = 2.1, cd = 0.38; // tall cases
  const W = 3.0, lw = W - 2 * cw, lh = 0.44, ld = 0.42, plinth = 0.06;
  const t = 0.022;
  // low console between the cases with four push-open fronts; the top sits on the carcass (no shared faces)
  g.add(mesh(box(lw - 0.06, plinth, ld - 0.08), m.gap, 0, plinth / 2, -0.03));
  g.add(mesh(rbox(lw - 0.002, lh - 0.03, ld - 0.022, 0.003), m.carcass, 0, plinth + (lh - 0.03) / 2, -0.011));
  g.add(mesh(rbox(lw - 0.002, 0.03, ld, 0.004), m.top, 0, plinth + lh - 0.015, 0));
  const fw = (lw - 0.014) / 4;
  for (let i = 0; i < 4; i++) g.add(mesh(rbox(fw - 0.004, lh - 0.046, 0.019, 0.003), m.front, -lw / 2 + 0.007 + fw * (i + 0.5), plinth + (lh - 0.046) / 2 + 0.004, ld / 2 - 0.0115));
  // tall cases: closed below, open shelves above. Sides stop under the top board, shelves sit between the sides
  // and in front of the back panel, so no two faces share a plane
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - cw / 2), z = -ld / 2 + cd / 2;
    g.add(mesh(box(cw - 0.06, plinth, cd - 0.08), m.gap, x, plinth / 2, z - 0.02));
    const sideH = ch - plinth - t;
    for (const s of [-1, 1]) g.add(mesh(box(t, sideH, cd), m.carcass, x + s * (cw / 2 - t / 2), plinth + sideH / 2, z));
    g.add(mesh(rbox(cw, t, cd, 0.003), m.top, x, ch - t / 2, z));
    const inW = cw - 2 * t - 0.001, back = 0.008;
    g.add(mesh(box(inW, sideH, back), m.carcass, x, plinth + sideH / 2, z - cd / 2 + back / 2));
    const shD = cd - back - 0.012;
    for (const y of [plinth, 0.9, 1.3, 1.7]) g.add(mesh(box(inW, t, shD), y === plinth ? m.carcass : m.top, x, y + t / 2, z - cd / 2 + back + shD / 2));
    g.add(mesh(rbox(cw - 2 * t - 0.006, 0.9 - plinth - t - 0.008, 0.019, 0.003), m.front, x, plinth + t + (0.9 - plinth - t) / 2, z + cd / 2 - 0.0095));
    // books standing on the shelves (bottom on the board), ceramics on the top shelf
    const sz = z - cd / 2 + back + 0.012 + 0.09;
    bookRow(g, x - cw / 2 + t + 0.012, x + cw / 2 - t - 0.01, 0.9 + t, sz, sx < 0 ? 11 : 23, 0.36);
    bookRow(g, x - cw / 2 + t + 0.012, x + cw / 2 - t - 0.01, 1.3 + t, sz, sx < 0 ? 37 : 41, 0.36);
    const vase = ceramic(VASE[sx < 0 ? 0 : 1], sx < 0 ? '#c46f4b' : '#d9d3c6');
    vase.position.set(x + (sx < 0 ? 0.06 : -0.05), 1.7 + t, sz - 0.02);
    g.add(vase);
  }
  // floating shelf over the TV, with a gap to the back
  g.add(mesh(rbox(lw - 0.1, 0.035, 0.25, 0.004), m.top, 0, 1.95, -ld / 2 + 0.13));
  return g;
}

function tvConsole(v) {
  const g = new THREE.Group();
  const m = cabinetMats(v);
  const W = 2.0, H = 0.36, D = 0.4;
  g.add(mesh(rbox(W, H - 0.03, D - 0.02, 0.004), m.carcass, 0, 0, D / 2 - 0.01));
  g.add(mesh(rbox(W + 0.004, 0.03, D, 0.004), m.top, 0, H / 2 - 0.015, D / 2));
  const fw = (W - 0.012) / 3;
  for (let i = 0; i < 3; i++) g.add(mesh(rbox(fw - 0.004, H - 0.04, 0.02, 0.003), m.front, -W / 2 + 0.006 + fw * (i + 0.5), -0.015, D - 0.01));
  return g;
}

// ---------------------------------------------------------------- TVs
let screenTex;
function screenMat() {
  return once('screen', () => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#050607', roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: '#ffffff', emissiveIntensity: 0.55 });
    // a landscape still on the screen: the horizon band of the day sky panorama
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 360;
      const x = c.getContext('2d');
      const sw = img.width * 0.22, sh = sw * (9 / 16);
      x.drawImage(img, img.width * 0.39, img.height * 0.5 - sh * 0.62, sw, sh, 0, 0, 640, 360);
      screenTex = new THREE.CanvasTexture(c);
      screenTex.colorSpace = THREE.SRGBColorSpace;
      m.emissiveMap = screenTex;
      m.needsUpdate = true;
      onTextureReady.forEach((f) => f());
    };
    img.src = `${BASE}hdri/day_bg.jpg`;
    return m;
  });
}
function tv(inch, stand = false) {
  const g = new THREE.Group();
  const w = inch * 0.0254 * 0.8716, h = inch * 0.0254 * 0.4903;
  const B = plastic('#121314');
  const z0 = stand ? 0 : 0.03; // wall bracket gap
  const panel = mesh(rbox(w + 0.012, h + 0.012, 0.024, 0.003), B, 0, 0, z0 + 0.012);
  g.add(panel);
  g.add(mesh(rbox(w * 0.55, h * 0.5, 0.03, 0.01), B, 0, -h * 0.08, z0 - 0.012));
  const scr = mesh(new THREE.PlaneGeometry(w, h), screenMat(), 0, 0, z0 + 0.0245);
  g.add(scr);
  g.add(mesh(box(0.04, 0.008, 0.004), plastic('#2a2b2d'), 0, -h / 2 - 0.004, z0 + 0.0245));
  if (stand) {
    for (const sx of [-1, 1]) {
      g.add(mesh(rbox(0.04, 0.012, 0.22, 0.004), blackMetal(), sx * w * 0.38, -h / 2 - 0.075, z0 + 0.03));
      g.add(mesh(rbox(0.03, 0.08, 0.012, 0.004), blackMetal(), sx * w * 0.38, -h / 2 - 0.035, z0 + 0.0));
    }
    g.position.y = h / 2 + 0.08;
  } else g.add(mesh(box(0.4, 0.3, 0.03), blackMetal(), 0, 0, 0.015));
  return g;
}
function soundbar() {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.9, 0.065, 0.1, 0.03), fabric('#2b2c2e', 'herringbone'), 0, 0.0325, 0));
  g.add(mesh(rbox(0.9, 0.012, 0.1, 0.005), plastic('#161718'), 0, 0.06, 0));
  return g;
}

// ---------------------------------------------------------------- rugs
function rug(v, shape) {
  const color = v?.color || '#d8cdb9';
  const s = new THREE.Shape();
  if (shape === 'round') s.absarc(0, 0, 1.1, 0, Math.PI * 2, false);
  else {
    const [w, d] = shape === 'runner' ? [1.6, 2.3] : [2.0, 3.0];
    const r = 0.04;
    s.moveTo(-w / 2 + r, -d / 2);
    s.lineTo(w / 2 - r, -d / 2);
    s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    s.lineTo(w / 2, d / 2 - r);
    s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    s.lineTo(-w / 2 + r, d / 2);
    s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    s.lineTo(-w / 2, -d / 2 + r);
    s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.006, bevelSegments: 2, curveSegments: 64 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.003, 0);
  metreUV(g);
  const m = mesh(g, fabric(color, shape === 'round' ? 'boucle' : 'herringbone'));
  m.castShadow = false;
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

// ---------------------------------------------------------------- shelves
function shelf(len) {
  const g = new THREE.Group();
  g.add(mesh(rbox(len, 0.036, 0.24, 0.004), oak(), 0, 0, 0.12));
  return g;
}

// ---------------------------------------------------------------- tripod floor lamp
function floorLamp() {
  const g = new THREE.Group();
  const top = 1.15, spread = 0.3;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const foot = new THREE.Vector3(Math.cos(a) * spread, 0, Math.sin(a) * spread), head = new THREE.Vector3(0, top, 0);
    const L = foot.distanceTo(head);
    const leg = mesh(new THREE.CylinderGeometry(0.014, 0.018, L, 16), oak());
    leg.position.copy(foot).add(head).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), head.clone().sub(foot).normalize());
    g.add(leg);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20), brass(), 0, top, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 12), blackMetal(), 0, top + 0.2, 0));
  // drum shade: linen, glowing in the evening
  const shadeM = once('shade', () => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#efe7d8', roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide, emissive: '#ffb871', emissiveIntensity: 0 });
    m.userData.glow = true;
    return m;
  });
  const shade = mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.32, 48, 1, true), shadeM, 0, top + 0.38, 0);
  shade.castShadow = false;
  g.add(shade);
  const bulbM = once('bulb', () => {
    const m = new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffd8a0', emissiveIntensity: 0 });
    m.userData.glow = true;
    return m;
  });
  g.add(mesh(new THREE.SphereGeometry(0.04, 20, 14), bulbM, 0, top + 0.36, 0));
  return g;
}

// ---------------------------------------------------------------- posters with generated art
function artTexture(kind) {
  return once('art' + kind, () => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 1024;
    const x = c.getContext('2d');
    if (kind === 'hills') {
      // layered hills under a warm sun, risograph palette
      x.fillStyle = '#efe6d6';
      x.fillRect(0, 0, 768, 1024);
      x.fillStyle = '#d9784f';
      x.beginPath();
      x.arc(470, 380, 120, 0, Math.PI * 2);
      x.fill();
      const layers = [['#c9a77c', 560, 0.006, 90], ['#8e8f6c', 650, 0.009, 70], ['#4f5a4c', 760, 0.012, 60], ['#2e3532', 880, 0.008, 40]];
      for (const [col, base, f, amp] of layers) {
        x.fillStyle = col;
        x.beginPath();
        x.moveTo(0, 1024);
        for (let px = 0; px <= 768; px += 8) x.lineTo(px, base - Math.sin(px * f + base) * amp - Math.sin(px * f * 2.3) * amp * 0.3);
        x.lineTo(768, 1024);
        x.fill();
      }
    } else {
      // geometry: arches and circles, Bauhaus-ish
      x.fillStyle = '#e9e4da';
      x.fillRect(0, 0, 768, 1024);
      const P = ['#1f2326', '#c4553b', '#d9a441', '#6f8b8c', '#b9b1a2'];
      x.fillStyle = P[3];
      x.fillRect(84, 520, 600, 420);
      x.fillStyle = P[0];
      x.beginPath();
      x.arc(384, 520, 300, Math.PI, 0);
      x.fill();
      x.fillStyle = P[1];
      x.beginPath();
      x.arc(384, 520, 170, Math.PI, 0);
      x.fill();
      x.fillStyle = P[2];
      x.beginPath();
      x.arc(560, 230, 70, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = P[4];
      x.fillRect(84, 760, 300, 180);
    }
    // paper grain
    const img = x.getImageData(0, 0, 768, 1024);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  });
}
function poster(kind) {
  const g = new THREE.Group();
  const [w, h, frameM] = kind === 'hills' ? [0.6, 0.8, oak()] : [0.7, 1.0, plastic('#18191a')];
  const fw = 0.022, fd = 0.03, mat = 0.06;
  for (const [x, y, bw, bh] of [[0, h / 2 - fw / 2, w, fw], [0, -h / 2 + fw / 2, w, fw], [-w / 2 + fw / 2, 0, fw, h - 2 * fw], [w / 2 - fw / 2, 0, fw, h - 2 * fw]]) g.add(mesh(rbox(bw, bh, fd, 0.003, 2), frameM, x, y, fd / 2));
  g.add(mesh(new THREE.PlaneGeometry(w - 2 * fw, h - 2 * fw), plastic('#f4f1ea'), 0, 0, 0.006));
  g.add(mesh(new THREE.PlaneGeometry(w - 2 * fw - 2 * mat, h - 2 * fw - 2 * mat), artTexture(kind), 0, 0, 0.007));
  const glass = once('frameGlass', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, transparent: true, opacity: 0.08, clearcoat: 1, depthWrite: false }));
  const gl = mesh(new THREE.PlaneGeometry(w - 2 * fw, h - 2 * fw), glass, 0, 0, fd - 0.004);
  gl.castShadow = false;
  g.add(gl);
  return g;
}

const PROC = {
  sofa_corner: (v) => sofa(v, true),
  sofa_straight: (v) => sofa(v, false),
  tv_unit: tvUnit,
  tv_console: tvConsole,
  tv65: () => tv(65),
  tv55: () => tv(55),
  tv55_stand: () => tv(55, true),
  soundbar,
  rug_rect: (v) => rug(v, 'rect'),
  rug_round: (v) => rug(v, 'round'),
  rug_runner: (v) => rug(v, 'runner'),
  shelf: () => shelf(1.2),
  shelf_long: () => shelf(2.0),
  floor_lamp: floorLamp,
  poster: () => poster('hills'),
  poster_b: () => poster('geo'),
};

export { oakDark };
