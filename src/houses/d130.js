// dominno130 (ДОМИННО) — single-storey barnhouse 6 × 8 m with a mezzanine (антресоль), 50.96 m² building area.
// Dimensions follow the published project DOMINNO30 (dominno.ru/dominno-30): shell 5.788 m wide, eave +2.900,
// ridge +5.255, side panels 294 mm; the glazed gable sits 1.2 m inside the frame over the covered terrace, the
// rear gable 0.26 m with the entrance porch. Finishes follow the renders: graphite profiled sheet on the roof and
// side walls, grey «Штиль» boards on the gables and soffits, a dark frame face.
import * as THREE from 'three';
import {
  makeKit, baseMaterials, wallFrame, planken, shell, piles, deck, blockSteps, snowGuard, eaveGutter,
  placeOpenings, cutsOf, sconces, M, box,
} from './kit.js';

const HW = 2.894; // half of the 5.788 m shell
const TW = 0.294; // side panel with cladding
const FL = 0.6; // finished floor above the ground
const YB = FL - 0.27; // bottom edge of the cladding
const YE = FL + 2.9, YR = FL + 5.255; // eave / ridge (outer)
const ZR = -3.37, ZF = 3.37; // shell (frame) ends
const ZW = ZR + 0.26; // rear gable wall (outer face)
const ZG = 2.18; // glazed front gable (outer face)
const ZD = 4.0; // edge of the terrace deck beyond the frame
const THK = 0.22; // gable wall

export const D130 = {
  id: 'd130',
  views: {
    main: [[9.6, 3.2, 11.8], [0.0, 2.5, 0.6]],
    terrace: [[2.6, 1.75, 7.6], [-0.4, 2.2, 1.6]],
    facade: [[0, 2.9, 14.5], [0, 2.7, 0.5]],
    back: [[-7.8, 2.6, -9.6], [-0.8, 2.2, -2.8]],
    top: [[10.5, 13.5, 12], [0, 1.5, 0.3]],
  },
  path: [[0, 4.9], [0, 8.3], [2.4, 11.4], [3.3, 16]],
  hardscape: { apron: 1.15, border: true },
  shrubs: [
    // on the lawn just outside the slab border
    { m: 'bush1', height: 0.9, x: -5.45, z: 3.4, rotY: 0.4 },
    { m: 'bush3', height: 0.6, x: -5.35, z: 2.3, rotY: 2.0 },
    { m: 'bush2', height: 1.1, x: 5.6, z: -1.3, rotY: 1.2 },
    { m: 'bush3', height: 0.75, x: 5.45, z: -2.6, rotY: 2.6 },
    { m: 'bush1', height: 1.0, x: -5.55, z: -2.2, rotY: 3.1 },
  ],
  globes: [[-3.45, 4.35, 0.5], [-3.95, 4.0, 0.32], [3.55, 4.45, 0.46], [3.05, 4.9, 0.3]],
  sun: [0.55, 0.84],
  materials: baseMaterials,
  build,
};

function build(cfg, mats = baseMaterials()) {
  const K = makeKit(mats, 130);
  const B = K.batch;
  const o = cfg.opts;
  const lights = [];
  const xi0 = -HW + TW, xi1 = HW - TW; // inner faces of the side panels
  K.interior = { x0: xi0 + 0.02, x1: xi1 - 0.02, z0: ZW + THK, z1: ZG - THK };

  // ---------------------------------------------------------------- shell: side walls + roof, frame at both ends
  const S = shell(K, {
    pts: [[-HW, YB], [-HW, YE], [0, YR], [HW, YE], [HW, YB]],
    t: [TW, 0.3, 0.3, TW],
    z0: ZR, z1: ZF,
    finish: o.finish, roof: o.roof, roofType: cfg.roofType,
    recesses: [[ZG, ZF], [ZR, ZW]],
    ring: 'flash',
  });
  const soffit = (X) => S.topAt(X);

  // ---------------------------------------------------------------- gables (local x from the outer left edge)
  const clad = cfg.clad === 'planken' ? { bw: 0.138, gap: 0.009, kind: 'board' } : { bw: 0.136, gap: 0.0015, kind: 'board' };
  const cladKey = o.finish ? 'clad' : 'greenboard';
  const cladOpts = o.finish ? clad : { bw: 1.196, gap: 0.004, th: 0.012 };
  const head = (X) => soffit(X) - 0.46; // upper lights follow the roof line
  const trapezoid = (x0, x1, y0, toX) => [[x0, y0], [x1, y0], [x1, head(toX(x1))], [x0, head(toX(x0))]];
  // the double-height space behind the upper lights: ceiling follows the roof slope
  const upRoom = (x0, x1, y0, toX) => ({
    floor: FL + 2.3 - y0, ceil: soffit(toX(x0)) - 0.1 - y0, ceilR: soffit(toX(x1)) - 0.1 - y0, depth: 3.2, ext: 0.4, furniture: false,
  });

  // front (terrace) gable — big fixed light + glazed door, trapezoid lights above
  const Ff = wallFrame([-HW, ZG], [1, 0], [0, 1]);
  const fX = (x) => x - HW;
  const yT = FL - 0.03; // terrace level
  const front = [
    { x0: 1.06, x1: 2.79, y: FL, h: 2.1, cols: [1], opens: [false], door: true, curtains: true },
    { x0: 3.83, x1: 4.79, y: FL, h: 2.1, entrance: true, style: 'glass', handleSide: -1, curtains: true },
    { poly: trapezoid(1.06, 2.79, FL + 2.4, fX), room: upRoom(1.06, 2.79, FL + 2.4, fX) },
    { poly: trapezoid(3.83, 4.79, FL + 2.4, fX), room: upRoom(3.83, 4.79, FL + 2.4, fX) },
  ];
  // the boards stop at the lintel panels (dark band 2.1–2.4 with the sconces)
  const frontCuts = [
    { poly: [[1.06, yT], [2.79, yT], [2.79, head(fX(2.79))], [1.06, head(fX(1.06))]] },
    { poly: [[3.83, yT], [4.79, yT], [4.79, head(fX(4.79))], [3.83, head(fX(3.83))]] },
  ];
  planken(K, Ff, { x0: TW, x1: 2 * HW - TW, y0: yT, top: (x) => soffit(fX(x)) - 0.004, openings: cutsOf(frontCuts), key: cladKey, ...cladOpts });
  lintel(K, Ff, 1.06, 2.79, FL + 2.1, FL + 2.4, o.finish);
  lintel(K, Ff, 3.83, 4.79, FL + 2.1, FL + 2.4, o.finish);
  // rear gable (seen from behind: local x from the right outer edge) — tall light with a trapezoid above, entrance door
  const Fr = wallFrame([HW, ZW], [-1, 0], [0, -1]);
  const rX = (x) => HW - x;
  const rear = [
    { x0: 1.32, x1: 2.3, y: FL, h: 2.1, cols: [1], opens: [true], door: true },
    { poly: trapezoid(1.32, 2.3, FL + 2.4, rX), room: upRoom(1.32, 2.3, FL + 2.4, rX) },
    { x0: 4.4, x1: 5.3, y: FL - 0.03, h: 2.13, entrance: true, style: 'panel', handleSide: 1, room: false },
  ];
  const rearCuts = [
    { poly: [[1.32, FL], [2.3, FL], [2.3, head(rX(2.3))], [1.32, head(rX(1.32))]] },
    { x0: 4.4, x1: 5.3, y: FL - 0.03, h: 2.13 },
  ];
  planken(K, Fr, { x0: TW, x1: 2 * HW - TW, y0: YB, top: (x) => soffit(rX(x)) - 0.004, openings: cutsOf(rearCuts), key: cladKey, ...cladOpts });
  lintel(K, Fr, 1.32, 2.3, FL + 2.1, FL + 2.4, o.finish);

  // windows & doors
  const roomFor = (op) => (op.poly ? {} : { floor: FL - op.y, ceil: FL + 2.7 - op.y, depth: 3.0, furniture: op.curtains ? 'sofa' : false });
  placeOpenings(K, Ff, front, { thk: THK, glazed: o.windows, roomFor });
  placeOpenings(K, Fr, rear, { thk: THK, glazed: o.windows, roomFor });
  lights.push(...sconces(K, Ff, [[1.925, FL + 2.25], [4.31, FL + 2.25]]));
  lights.push(...sconces(K, Fr, [[1.81, FL + 2.25], [3.9, FL + 2.55]]));

  // ---------------------------------------------------------------- roof drainage and snow guards (roof option)
  if (o.roof) {
    const t = Math.atan2(YR - YE, HW);
    for (const s of [-1, 1]) {
      eaveGutter(K, {
        a: [s * (HW + 0.085), YE - 0.07, ZR + 0.05], b: [s * (HW + 0.085), YE - 0.07, ZF - 0.05], out: [s, 0, 0],
        downs: [{ t: 0.03, wall: [s * HW, ZR + 0.25], ground: 0 }],
      });
      const d = 0.55; // from the eave, up the slope
      const p = [s * (HW - d * Math.cos(t)), YE + d * Math.sin(t) + 0.03];
      snowGuard(K, [p[0], p[1], ZR + 0.25], [p[0], p[1], ZF - 0.25], [-s * Math.sin(t), Math.cos(t), 0], [s * Math.cos(t), -Math.sin(t), 0]);
    }
  }

  // ---------------------------------------------------------------- foundation, floor panel
  piles(K, { x0: -HW, x1: HW, z0: ZR, z1: ZF, yTop: FL - 0.22, nx: 2, nz: 3 });
  B.add('backing', box(2 * HW - 0.08, 0.2, ZG - ZW - 0.02), M(0, FL - 0.115, (ZG + ZW) / 2));

  // ---------------------------------------------------------------- terrace (covered part + deck beyond the frame) and steps
  const yd = FL - 0.03;
  deck(K, { x0: xi0 + 0.005, x1: xi1 - 0.005, z0: ZG + 0.01, z1: ZF, y: yd, dir: 'x', boards: o.finish, rim: [] });
  deck(K, { x0: -HW, x1: HW, z0: ZF, z1: ZD, y: yd, dir: 'x', boards: o.finish, rim: ['+x', '-x', '+z'] });
  piles(K, { x0: -HW, x1: HW, z0: ZF, z1: ZD, yTop: yd - 0.028 - 0.15, nx: 2, nz: 0, sill: false, size: 0.2, inset: 0.3 });
  const stepsF = blockSteps(K, { x: 0, z: ZD, dir: [0, 1], w: 2 * HW, yTop: yd, n: 2, boards: o.finish });
  // entrance porch at the rear gable
  const px0 = -HW + TW + 0.01, px1 = -0.3, pz0 = ZW - 1.21;
  // floor of the rear recess under the frame, the porch runs on from it
  deck(K, { x0: xi0 + 0.005, x1: xi1 - 0.005, z0: ZR + 0.015, z1: ZW - 0.01, y: yd, dir: 'x', boards: o.finish, rim: ['-z'] });
  deck(K, { x0: px0, x1: px1, z0: pz0, z1: ZR + 0.015, y: yd, dir: 'z', boards: o.finish, rim: ['+x', '-z'] });
  piles(K, { x0: px0, x1: px1, z0: pz0, z1: ZR, yTop: yd - 0.028 - 0.15, nx: 1, nz: 1, sill: false, size: 0.2, inset: 0.2 });
  const stepsR = blockSteps(K, { x: (px0 + px1) / 2, z: pz0, dir: [0, -1], w: px1 - px0, yTop: yd, n: 2, boards: o.finish });

  // ---------------------------------------------------------------- interior: the living room behind the glazed gable
  // walls at the inner faces of the side panels and the gable, partition 3.7 m in; ceiling under the roof slopes
  const zIn = ZG - THK - 0.005, rev = THK - 0.14 + 0.005; // reveal depth up to the PVC frames (set back 70 mm)
  const interior = {
    title: 'Гостиная', titleIn: 'гостиной со вторым светом',
    floor: FL, x0: xi0 + 0.005, x1: xi1 - 0.005, z0: zIn - 3.7, z1: zIn,
    ceil: (X) => soffit(X) - 0.1, breaks: [0], accent: 'left', tvU: -0.05,
    openings: {
      front: front.map((op) => (op.poly
        ? { poly: op.poly.map(([x, y]) => [fX(x), y]), depth: rev }
        : { u0: fX(op.x0), u1: fX(op.x1), y0: op.y, y1: op.y + op.h, depth: rev })),
    },
    door: { side: 'back', u: 1.75, w: 0.8, h: 2.0 },
  };

  const group = B.build(mats);
  group.name = 'dominno130';
  return {
    group, mats, lights, interior, entry: [0, ZD + 0.9],
    bounds: { x0: -HW - 0.05, x1: HW + 0.05, z0: pz0 - 0.9, z1: ZD + 0.85 },
    meta: { FL },
    // paved landings at the foot of the steps (the path starts from the front one)
    landings: [
      { x0: -1.21, x1: 1.21, z: ZD + stepsF.length, dir: 1 },
      { x0: px0, x1: px1, z: pz0 - stepsR.length, dir: -1 },
    ],
  };
}

/** Dark lintel panel between the lower and upper lights (metal when finished, fibrolite otherwise). */
function lintel(K, Fr, x0, x1, y0, y1, finished) {
  const k = finished ? 'flash' : 'greenboard';
  K.batch.add(k, box(x1 - x0, y1 - y0, 0.03), new THREE.Matrix4().multiplyMatrices(Fr, M((x0 + x1) / 2, (y0 + y1) / 2, -0.035)));
}
