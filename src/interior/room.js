// Room shell of the interior mode, built inside the house at the real wall planes: walls cut around the actual
// window and door openings of the facade (reveals and sills up to the PVC frames, so the house's own glazing and
// the site are seen through them), the ceiling under the roof slope, skirting, an interior door, curtains on rails,
// decorative beams, accent-wall slats and (dominno240) the fireplace under the chimney.
//
// spec (world coordinates, from the house build): { x0, x1, z0, z1 (inner faces), floor, ceil(x), breaks: [x],
//   openings: { front|back|left|right: [{ u0, u1, y0, y1 } | { poly: [[u, y]...] }, depth] }, door: { side, u, w, h },
//   fireplace: { x, z }, accent: side }
// u runs along +x on the front/back walls and along +z on the left/right walls.
import * as THREE from 'three';
import { Batch, box, M, metreUV, RoundedBoxGeometry } from '../geom.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Side frames: point (u, y, d) → world, d = distance behind the wall face (into the wall). */
export function sides(R) {
  const cx = R.ceil;
  return {
    back: { u0: R.x0, u1: R.x1, n: V3(0, 0, 1), at: (u, y, d = 0) => V3(u, y, R.z0 - d), top: (u) => cx(u), along: V3(1, 0, 0) },
    front: { u0: R.x0, u1: R.x1, n: V3(0, 0, -1), at: (u, y, d = 0) => V3(u, y, R.z1 + d), top: (u) => cx(u), along: V3(1, 0, 0) },
    left: { u0: R.z0, u1: R.z1, n: V3(1, 0, 0), at: (u, y, d = 0) => V3(R.x0 - d, y, u), top: () => cx(R.x0), along: V3(0, 0, 1) },
    right: { u0: R.z0, u1: R.z1, n: V3(-1, 0, 0), at: (u, y, d = 0) => V3(R.x1 + d, y, u), top: () => cx(R.x1), along: V3(0, 0, 1) },
  };
}

/** Opening outline [[u, y]...] counter-clockwise in (u, y). */
function outline(o) {
  const p = o.poly ? o.poly.map((q) => [...q]) : [[o.u0, o.y0], [o.u1, o.y0], [o.u1, o.y1], [o.u0, o.y1]];
  let a = 0;
  for (let i = 0; i < p.length; i++) a += p[i][0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * p[i][1];
  return a < 0 ? p.reverse() : p;
}
const bboxOf = (p) => ({ u0: Math.min(...p.map((q) => q[0])), u1: Math.max(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), y1: Math.max(...p.map((q) => q[1])) });

/** Triangles of world points, wound so their normal is `n`. */
function triGeo(pts, tris, n, uvs) {
  const pos = [], uv = [];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    e1.subVectors(pts[b], pts[a]);
    e2.subVectors(pts[c], pts[a]);
    const order = e1.cross(e2).dot(n) < 0 ? [a, c, b] : [a, b, c];
    for (const i of order) {
      pos.push(pts[i].x, pts[i].y, pts[i].z);
      uv.push(uvs[i][0], uvs[i][1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const nn = new Float32Array(pos.length);
  for (let i = 0; i < nn.length; i += 3) nn.set([n.x, n.y, n.z], i);
  g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
  return g;
}
const quad = (P, n, uvs) => triGeo(P, [[0, 1, 2], [0, 2, 3]], n, uvs);

/**
 * Builds the room. fin: resolved finish { accent (id), beams, curtains, slats } and mats: material map with keys
 * wall, accent, floor, ceil, reveal, sill, skirting, beam, slat, slatBack, door, doorGap, handle, curtain, sheer,
 * rail, hearth, steel, fireGlass, fire, firebox, downlight.
 * Returns { group, walls: {side: mesh}, floor, ceiling, downlights: [{pos, n}], fire, sides }.
 */
export function buildRoom(R, fin, mats) {
  const B = new Batch();
  const S = sides(R);
  const FL = R.floor;
  const out = { walls: {}, downlights: [], sides: S };
  const wallMeshes = [];

  // ---------------------------------------------------------------- walls with openings
  for (const [side, s] of Object.entries(S)) {
    const ops = (R.openings[side] || []).map((o) => ({ ...o, pts: outline(o) }));
    const breaks = side === 'front' || side === 'back' ? (R.breaks || []).filter((b) => b > s.u0 + 1e-3 && b < s.u1 - 1e-3) : [];
    const us = [s.u0, ...breaks, s.u1];
    const yb = FL - 0.03;
    const contour = [[s.u0, yb], [s.u1, yb], ...us.slice().reverse().map((u) => [u, s.top(u)])];
    const holes = ops.map((o) => o.pts);
    const tri = THREE.ShapeUtils.triangulateShape(contour.map(([u, y]) => new THREE.Vector2(u, y)), holes.map((h) => h.map(([u, y]) => new THREE.Vector2(u, y))));
    const flat = [...contour, ...holes.flat()];
    const g = triGeo(flat.map(([u, y]) => s.at(u, y)), tri, s.n, flat);
    const accent = R.accent === side && fin.accent !== 'same';
    const key = accent ? (fin.accent === 'slats' ? 'slatBack' : 'accent') : 'wall';
    const mesh = new THREE.Mesh(g, mats[key]);
    mesh.name = 'wall-' + side;
    mesh.userData.side = side;
    mesh.receiveShadow = mesh.castShadow = true;
    out.walls[side] = mesh;
    wallMeshes.push(mesh);

    // reveals to the PVC frames, sills, thresholds
    for (const o of ops) {
      const D = o.depth ?? 0.1;
      const bb = bboxOf(o.pts);
      const floorLevel = bb.y0 <= FL + 0.02;
      const sill = !floorLevel && !o.poly && !o.high;
      const c = [(bb.u0 + bb.u1) / 2, (bb.y0 + bb.y1) / 2];
      for (let i = 0; i < o.pts.length; i++) {
        const p = o.pts[i], q = o.pts[(i + 1) % o.pts.length];
        const bottom = Math.abs(p[1] - q[1]) < 1e-4 && Math.abs(p[1] - bb.y0) < 1e-4;
        if (bottom && sill) continue;
        // inward normal of the edge (towards the opening centre), as a world direction
        let nu = -(q[1] - p[1]), ny = q[0] - p[0];
        if (nu * (c[0] - p[0]) + ny * (c[1] - p[1]) < 0) [nu, ny] = [-nu, -ny];
        const n = s.along.clone().multiplyScalar(nu).add(V3(0, ny, 0)).normalize();
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const P = [s.at(p[0], p[1], 0), s.at(q[0], q[1], 0), s.at(q[0], q[1], D), s.at(p[0], p[1], D)];
        B.add(bottom && floorLevel ? 'floor' : 'reveal', quad(P, n, [[0, 0], [L, 0], [L, D], [0, D]]));
      }
      if (sill) {
        const w = bb.u1 - bb.u0 + 0.08, dep = D + 0.05, t = 0.03;
        const g2 = box(w, t, dep, { round: 0.004 });
        const ctr = s.at((bb.u0 + bb.u1) / 2, bb.y0 - t / 2 + 0.004, D / 2 - 0.025);
        const rotY = Math.atan2(s.n.x, s.n.z);
        B.add('sill', g2, M(ctr.x, ctr.y, ctr.z, 0, rotY, 0));
      }
    }

    // skirting, broken at floor-level openings and the door
    const gaps = ops.map((o) => bboxOf(o.pts)).filter((b) => b.y0 <= FL + 0.02).map((b) => [b.u0, b.u1]);
    if (R.door && R.door.side === side) gaps.push([R.door.u - R.door.w / 2 - 0.08, R.door.u + R.door.w / 2 + 0.08]);
    if (R.fireplace && R.fireplace.side === side) gaps.push([R.fireplace.u - 0.66, R.fireplace.u + 0.66]);
    gaps.sort((a, b) => a[0] - b[0]);
    let u = s.u0;
    const runs = [];
    for (const [a, b] of gaps) {
      if (a > u + 0.05) runs.push([u, a]);
      u = Math.max(u, b);
    }
    if (s.u1 > u + 0.05) runs.push([u, s.u1]);
    const rotY = Math.atan2(s.n.x, s.n.z);
    const sh = 0.08, st = 0.016;
    for (const [a, b] of runs) {
      const ctr = s.at((a + b) / 2, FL + sh / 2, -st / 2);
      B.add('skirting', box(b - a, sh, st, { round: 0.003 }), M(ctr.x, ctr.y, ctr.z, 0, rotY, 0));
    }

    // accent: vertical oak slats on black felt, cut around the openings
    if (accent && fin.accent === 'slats') {
      const pitch = 0.07, sw = 0.04, sd = 0.022; // wide-pitch panels: no moiré at room distances
      const blocks = ops.map((o) => bboxOf(o.pts)).map((b) => ({ ...b, u0: b.u0 - 0.02, u1: b.u1 + 0.02, y0: b.y0 - 0.02, y1: b.y1 + 0.02 }));
      if (R.door && R.door.side === side) blocks.push({ u0: R.door.u - R.door.w / 2 - 0.09, u1: R.door.u + R.door.w / 2 + 0.09, y0: FL - 1, y1: FL + R.door.h + 0.09 });
      for (let uc = s.u0 + pitch / 2 + 0.01; uc < s.u1 - sw / 2 - 0.005; uc += pitch) {
        const top = Math.min(s.top(uc - sw / 2), s.top(uc + sw / 2)) - 0.005;
        let segs = [[FL + 0.002, top]];
        for (const b of blocks) {
          if (uc + sw / 2 < b.u0 || uc - sw / 2 > b.u1) continue;
          segs = segs.flatMap(([y0, y1]) => [[y0, Math.min(y1, b.y0)], [Math.max(y0, b.y1), y1]]).filter(([y0, y1]) => y1 - y0 > 0.05);
        }
        for (const [y0, y1] of segs) {
          const ctr = s.at(uc, (y0 + y1) / 2, -sd / 2);
          const g3 = box(sw, y1 - y0, sd, { round: 0.002 });
          metreUV(g3, { grainAxis: 'y' });
          B.add('slat', g3, M(ctr.x, ctr.y, ctr.z, 0, rotY, 0));
        }
      }
    }
  }

  // ---------------------------------------------------------------- floor & ceiling
  const fl = new THREE.PlaneGeometry(R.x1 - R.x0 + 0.02, R.z1 - R.z0 + 0.02);
  fl.rotateX(-Math.PI / 2);
  fl.translate((R.x0 + R.x1) / 2, FL, (R.z0 + R.z1) / 2);
  metreUV(fl);
  const floor = new THREE.Mesh(fl, mats.floor);
  floor.name = 'floor';
  floor.receiveShadow = true;
  out.floor = floor;

  const xs = [R.x0, ...(R.breaks || []).filter((b) => b > R.x0 && b < R.x1), R.x1];
  const ceilParts = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    const P = [V3(a, R.ceil(a), R.z0), V3(b, R.ceil(b), R.z0), V3(b, R.ceil(b), R.z1), V3(a, R.ceil(a), R.z1)];
    const slope = (R.ceil(b) - R.ceil(a)) / (b - a);
    const n = V3(slope, -1, 0).normalize();
    const L = Math.hypot(b - a, R.ceil(b) - R.ceil(a));
    // u across the slope (along z, the board direction of a lining ceiling), v down the slope
    ceilParts.push(quad(P, n, [[R.z0, 0], [R.z0, L], [R.z1, L], [R.z1, 0]].map(([z, v]) => [z, v + i * 7.3])));
  }
  const ceiling = new THREE.Group();
  for (const g of ceilParts) {
    const m = new THREE.Mesh(g, mats.ceil);
    m.receiveShadow = m.castShadow = true;
    ceiling.add(m);
  }
  ceiling.name = 'ceiling';
  out.ceiling = ceiling;

  // decorative beams following the slope (and a ridge beam under a gable)
  if (fin.beams !== 'none') {
    const bw = 0.12, bh = 0.18;
    for (let z = R.z0 + 0.55; z < R.z1 - 0.3; z += 1.15) {
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], ya = R.ceil(a), yb = R.ceil(b);
        const L = Math.hypot(b - a, yb - ya), ang = Math.atan2(yb - ya, b - a);
        const g4 = box(L, bh, bw, { round: 0.006 });
        metreUV(g4, { grainAxis: 'x' });
        const nx = Math.sin(ang), ny = -Math.cos(ang); // downward normal of the slope
        B.add('beam', g4, M((a + b) / 2 + nx * bh / 2, (ya + yb) / 2 + ny * bh / 2, z, 0, 0, ang));
      }
    }
    for (const x of xs.slice(1, -1)) {
      const g5 = box(0.16, 0.22, R.z1 - R.z0, { round: 0.006 });
      metreUV(g5, { grainAxis: 'z' });
      B.add('beam', g5, M(x, R.ceil(x) - 0.11, (R.z0 + R.z1) / 2));
    }
  }

  // recessed downlights on a grid, clear of the beams
  {
    const nx = Math.max(2, Math.round((R.x1 - R.x0) / 1.5)), nz = Math.max(2, Math.round((R.z1 - R.z0) / 1.6));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = R.x0 + ((i + 0.5) * (R.x1 - R.x0)) / nx, z = R.z0 + ((j + 0.5) * (R.z1 - R.z0)) / nz + (fin.beams !== 'none' ? 0.55 : 0);
        if (z > R.z1 - 0.3) continue;
        if (xs.slice(1, -1).some((b) => Math.abs(b - x) < 0.25)) continue;
        const e = 0.02, slope = (R.ceil(x + e) - R.ceil(x - e)) / (2 * e);
        const n = V3(slope, -1, 0).normalize();
        const pos = V3(x, R.ceil(x), z);
        const q = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), n);
        const mtx = new THREE.Matrix4().compose(pos.clone().addScaledVector(n, 0.002), q, V3(1, 1, 1));
        const ring = new THREE.CylinderGeometry(0.048, 0.048, 0.006, 32);
        B.add('handle', ring, mtx);
        const disc = new THREE.CircleGeometry(0.036, 32);
        disc.rotateX(Math.PI / 2);
        B.add('downlight', disc, new THREE.Matrix4().multiplyMatrices(mtx, M(0, -0.0035, 0)));
        out.downlights.push({ pos: pos.clone().addScaledVector(n, 0.03), n });
      }
  }

  // ---------------------------------------------------------------- interior door (closed, in the partition)
  if (R.door) {
    const s = S[R.door.side], { u, w, h } = R.door, rotY = Math.atan2(s.n.x, s.n.z);
    const at = (du, y, d) => s.at(u + du, FL + y, d);
    const put = (key, g, du, y, d) => {
      const p = at(du, y, d);
      B.add(key, g, M(p.x, p.y, p.z, 0, rotY, 0));
    };
    const cw = 0.07, ct = 0.014;
    // casing (наличник) on three sides
    put('sill', box(cw, h + cw, ct, { round: 0.003 }), -w / 2 - cw / 2, (h + cw) / 2, -ct / 2);
    put('sill', box(cw, h + cw, ct, { round: 0.003 }), w / 2 + cw / 2, (h + cw) / 2, -ct / 2);
    put('sill', box(w + 2 * cw, cw, ct, { round: 0.003 }), 0, h + cw / 2, -ct / 2);
    // shadow gap and the flush leaf with two milled grooves
    put('doorGap', box(w, h, 0.004), 0, h / 2, -0.002);
    put('door', box(w - 0.008, h - 0.006, 0.02, { round: 0.002 }), 0, h / 2 + 0.003, -0.012);
    for (const gy of [0.68, 1.36]) put('doorGap', box(w - 0.2, 0.004, 0.003), 0, gy * (h / 2.0), -0.0225);
    // lever handle on a round rosette, lock rosette below
    const hs = -1, hx = hs * (w / 2 - 0.075);
    const ros = new THREE.CylinderGeometry(0.025, 0.025, 0.008, 32);
    ros.rotateX(Math.PI / 2);
    put('handle', ros, hx, 1.0, -0.026);
    put('handle', ros.clone(), hx, 0.86, -0.026);
    const neck = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 20);
    neck.rotateX(Math.PI / 2);
    put('handle', neck, hx, 1.0, -0.05);
    put('handle', box(0.13, 0.016, 0.016, { round: 0.007 }), hx - hs * 0.06, 1.0, -0.073);
    const key = new THREE.CylinderGeometry(0.006, 0.006, 0.01, 16);
    key.rotateX(Math.PI / 2);
    put('doorGap', key, hx, 0.86, -0.031);
    // hinges
    for (const hy of [0.2, h - 0.25]) put('handle', new THREE.CylinderGeometry(0.007, 0.007, 0.1, 16), -hs * (w / 2 - 0.004), hy, -0.024);
  }

  // ---------------------------------------------------------------- curtains on ceiling rails over the full-height lights
  if (fin.curtains !== 'none') {
    for (const [side, s] of Object.entries(S)) {
      const rects = (R.openings[side] || []).filter((o) => !o.poly && !o.high);
      if (!rects.length) continue;
      const rotY = Math.atan2(s.n.x, s.n.z);
      // group openings closer than 0.6 m onto one rail
      const sorted = rects.map((o) => ({ ...o })).sort((a, b) => a.u0 - b.u0);
      const rails = [];
      for (const o of sorted) {
        const last = rails[rails.length - 1];
        if (last && o.u0 - last.u1 < 0.6) Object.assign(last, { u1: Math.max(last.u1, o.u1), y1: Math.max(last.y1, o.y1) });
        else rails.push({ ...o });
      }
      for (const r of rails) {
        const a = Math.max(s.u0 + 0.05, r.u0 - 0.3), b = Math.min(s.u1 - 0.05, r.u1 + 0.3);
        const yr = Math.min(r.y1 + 0.16, Math.min(s.top(a), s.top(b)) - 0.06);
        const L = b - a, H = yr - FL - 0.015;
        const rail = new THREE.CylinderGeometry(0.011, 0.011, L, 16);
        rail.rotateZ(Math.PI / 2);
        let p = s.at((a + b) / 2, yr + 0.02, -0.14);
        B.add('rail', rail, M(p.x, p.y, p.z, 0, rotY, 0));
        for (const e of [a + 0.01, b - 0.01]) {
          p = s.at(e, yr + 0.02, -0.07);
          B.add('rail', box(0.014, 0.014, 0.14), M(p.x, p.y, p.z, 0, rotY, 0));
          p = s.at(e, yr + 0.02, -0.14);
          B.add('rail', new THREE.SphereGeometry(0.016, 16, 10), M(p.x, p.y, p.z));
        }
        // gathered side panels (pleats as a sine) and a sheer across
        const panel = (pw, amp, freq, key, du, dz) => {
          const g = new THREE.PlaneGeometry(pw, H, Math.ceil(pw * 60), 6);
          const pp = g.attributes.position;
          for (let i = 0; i < pp.count; i++) {
            const x = pp.getX(i), y = pp.getY(i);
            const flare = 1 + 0.25 * (0.5 - y / H); // pleats open slightly towards the hem
            pp.setZ(i, Math.sin((x + du) * freq * Math.PI * 2) * amp * flare);
          }
          g.computeVertexNormals();
          metreUV(g);
          p = s.at(du, FL + 0.015 + H / 2, dz);
          B.add(key, g, M(p.x, p.y, p.z, 0, rotY, 0));
        };
        const pw = Math.min(0.55, L * 0.22);
        panel(pw, 0.03, 9, 'curtain', a + pw / 2 + 0.02, -0.15);
        panel(pw, 0.03, 9, 'curtain', b - pw / 2 - 0.02, -0.15);
        panel(L - 0.04, 0.012, 14, 'sheer', (a + b) / 2, -0.11);
      }
    }
  }

  // ---------------------------------------------------------------- fireplace (dominno240): steel box on a stone hearth, flue to the ceiling
  if (R.fireplace) {
    const s = S[R.fireplace.side], u = R.fireplace.u, rotY = Math.atan2(s.n.x, s.n.z);
    const base = s.at(u, FL, 0);
    const T = (x, y, z) => new THREE.Matrix4().multiplyMatrices(M(base.x, base.y, base.z, 0, rotY, 0), M(x, y, z));
    // local: x along the wall, y up, z into the room
    B.add('hearth', box(1.3, 0.08, 0.78, { round: 0.006 }), T(0, 0.04, 0.39));
    const bw = 0.86, bh = 0.62, bd = 0.46, by = 0.08 + 0.1;
    for (const sx of [-1, 1]) for (const sz of [0, 1]) B.add('steel', box(0.04, 0.1, 0.04, { round: 0.004 }), T(sx * (bw / 2 - 0.06), 0.08 + 0.05, 0.08 + sz * (bd - 0.12)));
    const body = new RoundedBoxGeometry(bw, bh, bd, 3, 0.025);
    metreUV(body);
    B.add('steel', body, T(0, by + bh / 2, 0.04 + bd / 2));
    // door frame and glass, firebox lining, logs
    const fz = 0.04 + bd + 0.002;
    B.add('steel', box(bw - 0.08, 0.05, 0.02, { round: 0.003 }), T(0, by + bh - 0.07, fz));
    B.add('steel', box(bw - 0.08, 0.06, 0.02, { round: 0.003 }), T(0, by + 0.07, fz));
    B.add('steel', box(0.05, bh - 0.12, 0.02, { round: 0.003 }), T(-(bw / 2 - 0.065), by + bh / 2, fz));
    B.add('steel', box(0.05, bh - 0.12, 0.02, { round: 0.003 }), T(bw / 2 - 0.065, by + bh / 2, fz));
    B.add('handle', box(0.02, 0.18, 0.02, { round: 0.008 }), T(bw / 2 - 0.065, by + bh / 2, fz + 0.03));
    B.add('firebox', box(bw - 0.12, bh - 0.14, 0.01), T(0, by + bh / 2, 0.08));
    B.add('firebox', box(bw - 0.12, 0.01, bd - 0.1), T(0, by + 0.09, 0.04 + bd / 2));
    for (const [x, y, r, a] of [[-0.12, 0.13, 0.045, 0.2], [0.1, 0.13, 0.042, -0.25], [0, 0.19, 0.04, 0.05]]) {
      const log = new THREE.CylinderGeometry(r, r * 1.05, 0.42, 18);
      log.rotateZ(Math.PI / 2);
      log.rotateY(a);
      B.add('log', log, T(x, by + y, 0.04 + bd / 2));
    }
    const glassG = new THREE.PlaneGeometry(bw - 0.18, bh - 0.18);
    B.add('fireGlass', glassG, T(0, by + bh / 2, fz + 0.012));
    // flame card behind the glass (animated in interior.js)
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.2, bh - 0.22), mats.fire);
    fire.applyMatrix4(T(0, by + bh / 2 - 0.01, 0.04 + bd / 2 + 0.02));
    fire.name = 'fire';
    out.fire = { mesh: fire, pos: s.at(u, FL + by + bh / 2, -(0.04 + bd + 0.25)) };
    // flue with a ceiling collar
    const fx = s.at(u, 0, -(0.04 + bd / 2));
    const top = R.ceil(fx.x);
    const y0 = FL + by + bh;
    B.add('steel', new THREE.CylinderGeometry(0.1, 0.1, top - y0, 40), M(fx.x, (y0 + top) / 2, fx.z));
    B.add('steel', new THREE.CylinderGeometry(0.16, 0.16, 0.02, 40), M(fx.x, top - 0.01, fx.z));
    for (let y = y0 + 0.6; y < top - 0.3; y += 0.9) B.add('steel', new THREE.CylinderGeometry(0.104, 0.104, 0.016, 40), M(fx.x, y, fx.z));
  }

  const group = B.build(mats, { castShadow: true, receiveShadow: true });
  group.name = 'room';
  for (const m of wallMeshes) group.add(m);
  group.add(floor, ceiling);
  if (out.fire) group.add(out.fire.mesh);
  group.traverse((o) => {
    if (o.isMesh && (o.material === mats.sheer || o.material === mats.fireGlass || o.material === mats.fire || o.material === mats.downlight)) o.castShadow = false;
  });
  out.group = group;
  return out;
}
