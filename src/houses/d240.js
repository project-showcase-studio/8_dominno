// dominno240 (ДОМИННО) — single-storey barnhouse 14.5 × 18 m with a mezzanine study, 187.62 m² building area.
// Dimensions follow the published project DOMINNO140 (dominno.ru/dominno-140): a tall living wing 6.2 × 13.1 m
// under a mono-pitch roof (+5.743 → +3.806) framed 1.0 / 1.8 m beyond its glazed gables over two terraces, and a
// bedroom wing 8.2 × 8.3 m under a lower mono-pitch (+4.485 → +2.689) with the entrance porch; ribbon clerestories
// light the living room above the bedroom roof. Finishes follow the renders: white plaster frames, natural pine
// «Штиль» boards in alternating tones, graphite profiled sheet on the roofs and long walls.
import * as THREE from 'three';
import {
  makeKit, baseMaterials, wallFrame, planken, boardBand, shell, piles, deck, blockSteps, snowGuard, eaveGutter,
  placeOpenings, cutsOf, sconces, M, box,
} from './kit.js';
import { addChimney, addVent } from '../parts.js';

// plan coordinates of the drawing (x → right, z → down the sheet, metres), centred on the site origin
const OX = -7.22, OZ = -7.3;
const FL = 0.6, YB = FL - 0.27;
// living wing
const XA = 8.24 + OX, XB = 14.448 + OX;
const AZ0 = -1.02 + OZ, AZ1 = 14.87 + OZ; // frame ends
const AG0 = 0 + OZ, AG1 = 13.1 + OZ; // glazed gables (outer faces)
const AH = FL + 5.743, AL = FL + 3.806; // roof: high side (junction) → low side
// bedroom wing
const XL = 0 + OX;
const LZ0 = 1.45 + OZ, LZ1 = 11.6 + OZ;
const LG0 = 2.35 + OZ, LG1 = 10.68 + OZ;
const LH = FL + 4.485, LL = FL + 2.689;
const TW = 0.3, THK = 0.24;

export const D240 = {
  id: 'd240',
  views: {
    main: [[14.5, 5.4, 19.5], [0.6, 2.4, 1.2]],
    terrace: [[5.3, 1.8, 13.4], [3.4, 2.4, 5.6]],
    facade: [[-1.0, 3.6, 25.5], [-0.4, 2.8, 2.0]],
    back: [[-12.5, 4.2, -15.5], [0.4, 2.4, -2.0]],
    top: [[16.5, 20, 19], [0, 1.5, 0.6]],
  },
  path: [[-1.2 + OX + 6.5, 13.3 + OZ], [6.1 + OX, 15.4 + OZ], [8.3 + OX, 17.6 + OZ], [8.0 + OX, 24 + OZ]],
  hardscape: { apron: 0.6, border: false },
  shrubs: [
    { m: 'bush1', height: 1.0, x: 0.9 + OX, z: 12.7 + OZ, rotY: 0.4 },
    { m: 'bush3', height: 0.7, x: 2.1 + OX, z: 12.5 + OZ, rotY: 2.0 },
    { m: 'bush2', height: 1.2, x: -1.2 + OX, z: 9.5 + OZ, rotY: 1.2 },
    { m: 'bush3', height: 0.8, x: 15.6 + OX, z: 9.6 + OZ, rotY: 2.6 },
    { m: 'bush1', height: 1.15, x: 15.7 + OX, z: 3.2 + OZ, rotY: 3.1 },
    { m: 'bush2', height: 0.9, x: 1.4 + OX, z: 0.9 + OZ, rotY: 0.8 },
  ],
  globes: [[3.4 + OX, 12.4 + OZ, 0.5], [3.9 + OX, 12.75 + OZ, 0.34], [15.15 + OX, 15.4 + OZ, 0.48], [-0.4 + OX, 1.2 + OZ, 0.42]],
  sun: [0.62, 0.78],
  materials: baseMaterials,
  build,
};

function build(cfg, mats = baseMaterials()) {
  const K = makeKit(mats, 240);
  const B = K.batch;
  const o = cfg.opts;
  const lights = [];
  const cladKey = o.finish ? 'clad' : 'greenboard';
  const clad = !o.finish ? { bw: 1.196, gap: 0.004, th: 0.012 } : cfg.clad === 'planken' ? { bw: 0.138, gap: 0.009 } : { bw: 0.136, gap: 0.0015 };
  // alternating board tones as on the renders (Teknos in two shades)
  const tone = (s) => (o.finish ? (x) => (Math.floor((x + s) / 1.12) % 2 ? 1.12 : 0.84) : undefined);
  const yd = FL - 0.03;

  // ---------------------------------------------------------------- living wing shell
  const tan = (AH - AL) / (XB - XA);
  const holesA = [
    // ribbon clerestories over the bedroom roof (junction wall)
    ...[[5.86, 7.21], [7.35, 8.63], [8.84, 10.11]].map(([a, b]) => ({ seg: 0, z0: a + OZ, z1: b + OZ, y0: FL + 4.709, y1: FL + 5.109 })),
    // kitchen and pantry windows in wood-clad insets on the long wall
    { seg: 2, z0: 6.06 + OZ, z1: 7.56 + OZ, y0: YB, y1: FL + 2.3 },
    { seg: 2, z0: 4.43 + OZ, z1: 5.24 + OZ, y0: YB, y1: FL + 2.3 },
  ];
  const SA = shell(K, {
    pts: [[XA, YB], [XA, AH], [XB, AL], [XB, YB]],
    t: [TW, 0.36, TW], z0: AZ0, z1: AZ1,
    finish: o.finish, roof: o.roof, roofType: cfg.roofType,
    recesses: [[AG1, AZ1], [AZ0, AG0]], ring: 'surround', holes: holesA,
  });
  // ---------------------------------------------------------------- bedroom wing shell (abuts the living wing)
  const SL = shell(K, {
    pts: [[XL, YB], [XL, LL], [XA, LH]],
    t: [TW, 0.34], z0: LZ0, z1: LZ1, clipX: XA,
    finish: o.finish, roof: o.roof, roofType: cfg.roofType,
    recesses: [[LG1, LZ1], [LZ0, LG0]], ring: 'surround',
  });
  // abutment flashing where the bedroom roof meets the living-wing wall
  if (o.roof) B.add('flash', box(0.004, 0.16, LZ1 - LZ0), M(XA - 0.026, LH + 0.06, (LZ0 + LZ1) / 2));

  // ---------------------------------------------------------------- living wing gables
  const headA = (X) => SA.topAt(X) - 0.25;
  // front (terrace 1), local x from the junction side
  const FA = wallFrame([XA, AG1], [1, 0], [0, 1]);
  const aX = (x) => XA + x;
  const col = (x0, x1, y0, toX, inset = 0) => [[x0, y0], [x1, y0], [x1, headA(toX(x1)) - inset], [x0, headA(toX(x0)) - inset]];
  // double-height living room behind the upper lights: ceiling follows the roof slope
  const upRoom = (x0, x1, y0, toX) => ({
    floor: FL + 2.6 - y0, ceil: SA.topAt(toX(x0)) - 0.12 - y0, ceilR: SA.topAt(toX(x1)) - 0.12 - y0, depth: 4.0, ext: 0.3, furniture: false,
  });
  const frontA = [
    { x0: 0.36, x1: 2.46, y: FL, h: 2.3, cols: [0.52, 0.48], opens: [false, true], door: true, curtains: true },
    { x0: 3.77, x1: 4.68, y: FL, h: 2.3, cols: [1], opens: [true], door: true, curtains: true },
    { poly: col(0.36, 1.395, FL + 2.93, aX), room: upRoom(0.36, 1.395, FL + 2.93, aX) },
    { poly: col(1.425, 2.46, FL + 2.93, aX), room: upRoom(1.425, 2.46, FL + 2.93, aX) },
    { poly: col(3.77, 4.68, FL + 2.93, aX), room: upRoom(3.77, 4.68, FL + 2.93, aX) },
  ];
  const frontACuts = [{ poly: col(0.36, 2.46, yd, aX) }, { poly: col(3.77, 4.68, yd, aX) }];
  planken(K, FA, { x0: TW, x1: XB - XA - TW, y0: yd, top: (x) => SA.topAt(aX(x)) - 0.004, openings: cutsOf(frontACuts), key: cladKey, tone: tone(0.4), ...clad });
  mullion(K, FA, 1.41, FL + 2.93, (x) => headA(aX(x)), o);
  for (const [a, b] of [[0.36, 2.46], [3.77, 4.68]]) band(K, FA, a, b, FL + 2.3, FL + 2.93, o);
  // rear (terrace 2), local x from the low side (seen from behind)
  const RA = wallFrame([XB, AG0], [-1, 0], [0, -1]);
  const rX = (x) => XB - x;
  const rearA = [
    { x0: 1.11, x1: 2.81, y: FL, h: 2.3, cols: [0.5, 0.5], opens: [true, false], door: true, curtains: true },
    { x0: 4.39, x1: 5.09, y: FL, h: 2.3, cols: [1], opens: [true], door: true },
    { poly: col(4.39, 5.09, FL + 2.85, rX), room: upRoom(4.39, 5.09, FL + 2.85, rX) },
  ];
  const rearACuts = [{ x0: 1.11, x1: 2.81, y: yd, h: FL + 2.3 - yd }, { poly: col(4.39, 5.09, yd, rX) }];
  planken(K, RA, { x0: TW, x1: XB - XA - TW, y0: yd, top: (x) => SA.topAt(rX(x)) - 0.004, openings: cutsOf(rearACuts), key: cladKey, tone: tone(0.1), ...clad });
  band(K, RA, 4.39, 5.09, FL + 2.3, FL + 2.85, o);

  // ---------------------------------------------------------------- bedroom wing gables
  const FLW = wallFrame([XL, LG1], [1, 0], [0, 1]);
  const frontL = [
    { x0: 1.4, x1: 3.1, y: FL, h: 2.3, cols: [0.5, 0.5], opens: [true, false], door: true, curtains: true, furniture: 'bed' },
    { x0: 5.03, x1: 5.96, y: FL + 0.9, h: 1.4, cols: [1], opens: [true], room: { furniture: false } },
    { x0: 6.53, x1: 7.43, y: yd, h: 2.33, entrance: true, style: 'glass', handleSide: -1 },
  ];
  planken(K, FLW, { x0: TW, x1: XA - XL, y0: YB, top: (x) => SL.topAt(XL + x) - 0.004, openings: cutsOf(frontL), key: cladKey, tone: tone(0.7), ...clad });
  const RL = wallFrame([XA, LG0], [-1, 0], [0, -1]);
  const rearL = [
    { x0: 1.21, x1: 2.03, y: FL + 0.9, h: 1.4, cols: [1], opens: [true], room: { furniture: false } },
    { x0: 2.79, x1: 3.6, y: FL + 0.9, h: 1.4, cols: [1], opens: [true], room: { furniture: false } },
    { x0: 5.16, x1: 6.96, y: FL, h: 2.3, cols: [0.5, 0.5], opens: [false, true], door: true, curtains: true, furniture: 'bed' },
  ];
  planken(K, RL, { x0: 0, x1: XA - XL - TW, y0: YB, top: (x) => SL.topAt(XA - x) - 0.004, openings: cutsOf(rearL), key: cladKey, tone: tone(0.2), ...clad });

  // ---------------------------------------------------------------- windows & doors
  const roomFor = (op) => (op.poly ? {} : { floor: FL - op.y, ceil: FL + 2.75 - op.y, depth: 3.4, furniture: op.furniture || (op.curtains ? 'sofa' : false) });
  const glazed = o.windows;
  K.interior = { x0: XA + TW + 0.02, x1: XB - TW - 0.02, z0: AG0 + THK, z1: AG1 - THK };
  placeOpenings(K, FA, frontA, { thk: THK, glazed, roomFor });
  placeOpenings(K, RA, rearA, { thk: THK, glazed, roomFor });
  K.interior = { x0: XL + TW + 0.02, x1: XA - 0.02, z0: LG0 + THK, z1: LG1 - THK };
  placeOpenings(K, FLW, frontL, { thk: THK, glazed, roomFor });
  placeOpenings(K, RL, rearL, { thk: THK, glazed, roomFor });
  // long wall of the living wing (seen from +x: local x from the far frame end)
  K.interior = { x0: XA + TW + 0.02, x1: XB - TW - 0.02, z0: AG0 + THK, z1: AG1 - THK };
  const SW = wallFrame([XB, AZ1], [0, -1], [1, 0]);
  const sx = (z) => AZ1 - (z + OZ);
  for (const [z0, z1, cols] of [[6.06, 7.56, [0.5, 0.5]], [4.43, 5.24, [1]]]) {
    const x0 = sx(z1), x1 = sx(z0);
    // wood panel under the sill inside the inset
    planken(K, SW, { x0, x1, y0: YB + 0.02, top: FL + 0.9 - 0.02, key: cladKey, tone: tone(0.3), ...clad, ...(o.finish ? { bw: 0.13 } : {}) });
    placeOpenings(K, SW, [{ x0, x1, y: FL + 0.9, h: 1.4, cols, opens: cols.map((_, i) => i === 0), room: { furniture: false } }], { thk: TW, glazed, roomFor });
  }
  // clerestories (seen from -x: local x from the rear frame end)
  const CW = wallFrame([XA, AZ0], [0, 1], [-1, 0]);
  for (const [a, b] of [[5.86, 7.21], [7.35, 8.63], [8.84, 10.11]]) {
    const x0 = a + OZ - AZ0, x1 = b + OZ - AZ0;
    placeOpenings(K, CW, [{ x0, x1, y: FL + 4.709, h: 0.4, cols: [1], opens: [false], room: false }], { thk: TW, glazed, roomFor });
  }

  lights.push(...sconces(K, FA, [[3.25, FL + 2.55], [5.2, FL + 2.55]]));
  lights.push(...sconces(K, RA, [[1.96, FL + 2.6]]));
  lights.push(...sconces(K, FLW, [[6.98, FL + 2.6], [4.4, FL + 2.45]]));
  lights.push(...sconces(K, RL, [[2.41, FL + 2.45], [4.38, FL + 2.45]]));

  // ---------------------------------------------------------------- roof drainage, snow guards, chimney, vents
  if (o.roof) {
    const ta = Math.atan(tan), tl = Math.atan((LH - LL) / (XA - XL));
    eaveGutter(K, {
      a: [XB + 0.085, AL - 0.08, AZ0 + 0.05], b: [XB + 0.085, AL - 0.08, AZ1 - 0.05], out: [1, 0, 0],
      downs: [{ t: 0.025, wall: [XB, AZ0 + 0.35], ground: 0 }, { t: 0.975, wall: [XB, AZ1 - 0.35], ground: 0 }],
    });
    eaveGutter(K, {
      a: [XL - 0.085, LL - 0.08, LZ0 + 0.05], b: [XL - 0.085, LL - 0.08, LZ1 - 0.05], out: [-1, 0, 0],
      downs: [{ t: 0.03, wall: [XL, LZ0 + 0.3], ground: 0 }, { t: 0.97, wall: [XL, LZ1 - 0.3], ground: 0 }],
    });
    const da = 0.7, pa = [XB - da * Math.cos(ta), AL + da * Math.sin(ta) + 0.035];
    snowGuard(K, [pa[0], pa[1], AZ0 + 0.3], [pa[0], pa[1], AZ1 - 0.3], [Math.sin(ta), Math.cos(ta), 0], [Math.cos(ta), -Math.sin(ta), 0]);
    const pl = [XL + da * Math.cos(tl), LL + da * Math.sin(tl) + 0.035];
    snowGuard(K, [pl[0], pl[1], LZ0 + 0.3], [pl[0], pl[1], LZ1 - 0.3], [-Math.sin(tl), Math.cos(tl), 0], [-Math.cos(tl), -Math.sin(tl), 0]);
    const roofA = (X) => AH - (X - XA) * tan + 0.03;
    const roofL = (X) => LL + (X - XL) * ((LH - LL) / (XA - XL)) + 0.03;
    addChimney(K, { x: 8.95 + OX, z: 12.0 + OZ, yRoof: roofA(8.95 + OX), yTop: FL + 6.15, slope: -Math.atan(tan) });
    addVent(K, { x: 5.9 + OX, z: 3.6 + OZ, yRoof: roofL(5.9 + OX), slope: Math.atan((LH - LL) / (XA - XL)) });
    addVent(K, { x: 6.55 + OX, z: 4.6 + OZ, yRoof: roofL(6.55 + OX), h: 0.6, slope: Math.atan((LH - LL) / (XA - XL)) });
    addVent(K, { x: 12.4 + OX, z: 3.0 + OZ, yRoof: roofA(12.4 + OX), h: 0.6, slope: -Math.atan(tan) });
  }

  // ---------------------------------------------------------------- foundation and floor panels
  piles(K, { x0: XA, x1: XB, z0: AZ0, z1: AZ1, yTop: FL - 0.22, nx: 2, nz: 7 });
  piles(K, { x0: XL, x1: XA - 0.02, z0: LZ0, z1: LZ1, yTop: FL - 0.22, nx: 3, nz: 4 });
  B.add('backing', box(XB - XA - 0.08, 0.2, AG1 - AG0 - 0.02), M((XA + XB) / 2, FL - 0.115, (AG0 + AG1) / 2));
  B.add('backing', box(XA - XL - 0.08, 0.2, LG1 - LG0 - 0.02), M((XL + XA) / 2, FL - 0.115, (LG0 + LG1) / 2));

  // ---------------------------------------------------------------- terraces, porch, steps
  const xi0 = XA + TW, xi1 = XB - TW;
  // terrace 1: covered part, deck beyond the frame, two broad steps
  const T1 = 16.0 + OZ;
  deck(K, { x0: xi0 + 0.005, x1: xi1 - 0.005, z0: AG1 + 0.01, z1: AZ1, y: yd, dir: 'x', boards: o.finish, rim: [] });
  deck(K, { x0: XA, x1: XB, z0: AZ1, z1: T1, y: yd, dir: 'x', boards: o.finish, rim: ['+x', '-x', '+z'] });
  piles(K, { x0: XA, x1: XB, z0: AZ1, z1: T1, yTop: yd - 0.028 - 0.15, nx: 3, nz: 1, sill: false, size: 0.2, inset: 0.25 });
  blockSteps(K, { x: (XA + XB) / 2, z: T1, dir: [0, 1], w: XB - XA, yTop: yd, n: 2, boards: o.finish });
  // terrace 2: covered part + a strip beyond, narrow stair down
  const T2 = -1.51 + OZ;
  deck(K, { x0: xi0 + 0.005, x1: xi1 - 0.005, z0: AZ0, z1: AG0 - 0.01, y: yd, dir: 'x', boards: o.finish, rim: [] });
  deck(K, { x0: XA, x1: XB, z0: T2, z1: AZ0, y: yd, dir: 'x', boards: o.finish, rim: ['-x', '+x', '-z'] });
  piles(K, { x0: XA, x1: XB, z0: T2, z1: AZ0, yTop: yd - 0.028 - 0.15, nx: 3, nz: 0, sill: false, size: 0.2, inset: 0.22 });
  blockSteps(K, { x: 12.44 + OX, z: T2, dir: [0, -1], w: 1.8, yTop: yd, n: 2, boards: o.finish });
  // floors of the bedroom wing recesses under the frame (front one runs on into the porch)
  const li0 = XL + TW + 0.005, li1 = XA - 0.01;
  deck(K, { x0: li0, x1: li1, z0: LG1 + 0.01, z1: LZ1, y: yd, dir: 'x', boards: o.finish, rim: ['+z'] });
  deck(K, { x0: li0, x1: li1, z0: LZ0 + 0.015, z1: LG0 - 0.01, y: yd, dir: 'x', boards: o.finish, rim: ['-z'] });
  // entrance porch of the bedroom wing
  const P0 = 4.27 + OX, P1 = XA - 0.01, PZ = 11.98 + OZ;
  deck(K, { x0: P0, x1: P1, z0: LZ1, z1: PZ, y: yd, dir: 'x', boards: o.finish, rim: ['-x', '+z'] });
  piles(K, { x0: P0, x1: P1, z0: LZ1, z1: PZ, yTop: yd - 0.028 - 0.15, nx: 2, nz: 0, sill: false, size: 0.2, inset: 0.25 });
  blockSteps(K, { x: (P0 + P1) / 2, z: PZ, dir: [0, 1], w: P1 - P0, yTop: yd, n: 2, boards: o.finish });

  const group = B.build(mats);
  group.name = 'dominno240';
  return {
    group, mats, lights, entry: [(P0 + P1) / 2, PZ + 0.95],
    bounds: { x0: XL - 0.05, x1: XB + 0.05, z0: T2 - 0.9, z1: T1 + 0.9 },
    meta: { FL },
  };
}

/** Horizontal board band between the window tiers (fibrolite in the domokomplekt state). */
function band(K, Fr, x0, x1, y0, y1, o) {
  if (o.finish) boardBand(K, Fr, { x0, x1, y0, y1, key: 'accent' });
  else K.batch.add('greenboard', box(x1 - x0, y1 - y0, 0.012), new THREE.Matrix4().multiplyMatrices(Fr, M((x0 + x1) / 2, (y0 + y1) / 2, -0.006)));
}

/** Post between two upper lights sharing one opening. */
function mullion(K, Fr, x, y0, head, o) {
  if (!o.windows) return;
  const h = head(x) - y0;
  K.batch.add('frame', box(0.03, h, 0.07), new THREE.Matrix4().multiplyMatrices(Fr, M(x, y0 + h / 2, -0.105)));
}

