// CaçaBolets: arbres procedurals (tronc i branques amb escorça, i racimolls de fulles o d'acícules en
// targetes amb transparència) i les seves versions llunyanes ("impostors": una imatge del mateix arbre
// amb el color i la normal de cada píxel, que s'il·lumina igual que l'arbre de debò).
import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------
// Textures dibuixades amb canvas
// ---------------------------------------------------------------------------
// Atles de fullatge 2×2: [0] fulles planifòlies (neutres: el color el posa cada arbre), [1] acícules de pi,
// [2] branquilló d'avet, [3] herba.
export const CELL = { broad: 0, pine: 1, fir: 2, grass: 3 };
export function makeFoliageTexture() {
  const S = 1024, H = S / 2, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const r = rng(7);
  const cell = (i, fn) => { g.save(); g.translate((i % 2) * H, Math.floor(i / 2) * H); g.beginPath(); g.rect(0, 0, H, H); g.clip(); fn(); g.restore(); };
  // Fulles: el·lipses en branquetes, en tons de gris clar amb una mica de verd.
  cell(0, () => {
    g.lineCap = 'round';
    for (let b = 0; b < 7; b++) {
      const x0 = H / 2 + (r() - 0.5) * 60, y0 = H * 0.92, ang = -Math.PI / 2 + (r() - 0.5) * 1.6, len = H * (0.35 + r() * 0.3);
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      g.strokeStyle = 'rgb(90,80,70)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let k = 0; k < 30; k++) {
        const t = 0.15 + 0.85 * r(), x = x0 + (x1 - x0) * t + (r() - 0.5) * 46, y = y0 + (y1 - y0) * t + (r() - 0.5) * 46;
        const l = 140 + r() * 100, w = 5 + r() * 4, h = 11 + r() * 7;
        g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
        // Fulla amb degradat (més clara al centre), nervi i una mica de variació de to.
        const gr = g.createLinearGradient(-w, 0, w, 0);
        const hue = r() * 0.15;
        gr.addColorStop(0, `rgb(${l * (0.62 + hue) | 0},${l * 0.78 | 0},${l * 0.5 | 0})`);
        gr.addColorStop(0.5, `rgb(${l * (0.9 + hue) | 0},${l | 0},${l * 0.72 | 0})`);
        gr.addColorStop(1, `rgb(${l * (0.7 + hue) | 0},${l * 0.85 | 0},${l * 0.55 | 0})`);
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -h); g.quadraticCurveTo(w * 1.4, 0, 0, h); g.quadraticCurveTo(-w * 1.4, 0, 0, -h); g.fill();
        g.strokeStyle = `rgba(40,50,20,0.35)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -h); g.lineTo(0, h); g.stroke();
        g.restore();
      }
    }
  });
  // Acícules de pi: feixos radials.
  cell(1, () => {
    for (let b = 0; b < 9; b++) {
      const cx = H * (0.25 + r() * 0.5), cy = H * (0.25 + r() * 0.5);
      for (let k = 0; k < 70; k++) {
        const a = r() * Math.PI * 2, l = 40 + r() * 70, gl = 70 + r() * 70;
        g.strokeStyle = `rgb(${gl * 0.55 | 0},${gl | 0},${gl * 0.45 | 0})`; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * l * 0.5 + (r() - 0.5) * 10, cy + Math.sin(a) * l * 0.5, cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke();
      }
    }
  });
  // Avet: branquilló pla amb acícules curtes a banda i banda.
  cell(2, () => {
    for (let b = 0; b < 9; b++) {
      const y0 = H * (0.08 + b * 0.105), ang = (r() - 0.5) * 0.5;
      g.save(); g.translate(H / 2, y0); g.rotate(ang);
      g.strokeStyle = 'rgb(70,60,45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-H * 0.45, 0); g.lineTo(H * 0.45, 0); g.stroke();
      for (let k = 0; k < 160; k++) {
        const x = -H * 0.45 + r() * H * 0.9, s = r() < 0.5 ? -1 : 1, l = 22 + r() * 20, gl = 55 + r() * 55;
        g.strokeStyle = `rgb(${gl * 0.5 | 0},${gl | 0},${gl * 0.55 | 0})`; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, s * l); g.stroke();
      }
      g.restore();
    }
  });
  // Herba: matolls de fulles que s'aprimen, d'alçades diferents (el contorn no ha de ser un rectangle).
  cell(3, () => {
    for (let t = 0; t < 5; t++) {
      const bx = H * (0.2 + 0.6 * r()), tuftH = H * (0.45 + r() * 0.5);
      for (let k = 0; k < 26; k++) {
        const x = bx + (r() - 0.5) * H * 0.18, h = tuftH * (0.35 + r() * 0.65), lean = (r() - 0.5) * 1.1 * h, w = 2.5 + r() * 3;
        const gl = 70 + r() * 120, yel = r() < 0.25;
        g.fillStyle = yel ? `rgb(${gl | 0},${gl * 0.9 | 0},${gl * 0.45 | 0})` : `rgb(${gl * 0.7 | 0},${gl | 0},${gl * 0.4 | 0})`;
        g.beginPath(); g.moveTo(x - w, H); g.quadraticCurveTo(x + lean * 0.3, H - h * 0.55, x + lean, H - h); g.quadraticCurveTo(x + lean * 0.3 + w * 0.3, H - h * 0.5, x + w, H); g.fill();
      }
    }
  });
  // Els píxels transparents prenen el color mitjà de la seva cel·la: així els mipmaps no enfosqueixen les vores.
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let c = 0; c < 4; c++) {
    const x0 = (c % 2) * H, y0 = Math.floor(c / 2) * H;
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + H; x++) { const i = (y * S + x) * 4; if (d[i + 3] > 128) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; } }
    if (!n) continue;
    sr /= n; sg /= n; sb /= n;
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + H; x++) { const i = (y * S + x) * 4; if (d[i + 3] < 8) { d[i] = sr; d[i + 1] = sg; d[i + 2] = sb; } }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.premultiplyAlpha = false;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
export function makeBarkTexture() {
  const W = 256, H = 512, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), r = rng(11);
  g.fillStyle = 'rgb(150,140,130)'; g.fillRect(0, 0, W, H);
  // Plaques i escletxes verticals.
  for (let k = 0; k < 700; k++) {
    const x = r() * W, y = r() * H, w = 6 + r() * 22, h = 20 + r() * 70, l = 110 + r() * 90;
    g.fillStyle = `rgb(${l | 0},${l * 0.94 | 0},${l * 0.88 | 0})`;
    g.fillRect(x, y, w, h); g.fillRect(x - W, y, w, h); g.fillRect(x, y - H, w, h);
  }
  g.strokeStyle = 'rgba(30,25,20,0.7)';
  for (let k = 0; k < 60; k++) {
    let x = r() * W, y = 0; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, y);
    while (y < H) { y += 10 + r() * 20; x += (r() - 0.5) * 8; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------
class Builder {
  constructor() { this.b = { pos: [], nor: [], uv: [], col: [], idx: [] }; this.l = { pos: [], nor: [], uv: [], col: [], idx: [] }; }
  // Tub entre dos punts (escorça). c0/c1: color de vèrtex (per al to de l'escorça al llarg del tronc).
  tube(p0, p1, r0, r1, sides, v0, v1, c0 = [1, 1, 1], c1 = c0) {
    const B = this.b, base = B.pos.length / 3;
    const axis = new THREE.Vector3().subVectors(p1, p0).normalize();
    const tmp = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(axis, tmp).normalize(), w = new THREE.Vector3().crossVectors(axis, u);
    for (let e = 0; e < 2; e++) {
      const p = e ? p1 : p0, rr = e ? r1 : r0, c = e ? c1 : c0;
      for (let s = 0; s <= sides; s++) {
        const a = s / sides * Math.PI * 2, n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a));
        B.pos.push(p.x + n.x * rr, p.y + n.y * rr, p.z + n.z * rr);
        B.nor.push(n.x, n.y, n.z);
        B.uv.push(s / sides * Math.max(1, Math.round(rr * 8)), e ? v1 : v0);
        B.col.push(...c);
      }
    }
    for (let s = 0; s < sides; s++) {
      const a = base + s, b = a + 1, c = base + sides + 1 + s, d = c + 1;
      B.idx.push(a, c, b, b, c, d);
    }
  }
  // Targeta de fullatge: quadrat de costat "size" a p, orientat amb la normal n; la normal d'il·luminació
  // es barreja amb la direcció des del centre de la capçada perquè el volum es vegi arrodonit.
  card(p, n, up, size, cell, center, ao, aspect = 1) {
    const L = this.l, base = L.pos.length / 3;
    const nn = n.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, nn);
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    right.normalize();
    const vup = new THREE.Vector3().crossVectors(nn, right).normalize();
    const radial = new THREE.Vector3().subVectors(p, center);
    radial.y *= 0.6;
    radial.normalize().multiplyScalar(0.75).addScaledVector(nn, 0.25).normalize();
    const cu = (cell % 2) * 0.5, cv = Math.floor(cell / 2) * 0.5;
    const hw = size * 0.5 * aspect, hh = size * 0.5;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of corners) {
      L.pos.push(p.x + right.x * sx * hw + vup.x * sy * hh, p.y + right.y * sx * hw + vup.y * sy * hh, p.z + right.z * sx * hw + vup.z * sy * hh);
      L.nor.push(radial.x, radial.y, radial.z);
      // V invertit: el canvas té l'origen a dalt.
      L.uv.push(cu + (sx * 0.5 + 0.5) * 0.5, 1 - (cv + (0.5 - sy * 0.5) * 0.5));
      L.col.push(ao, ao, ao);
    }
    L.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  geo(which) {
    const A = which === 'bark' ? this.b : this.l, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(A.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(A.col, 3));
    g.setIndex(A.idx);
    g.computeBoundingSphere();
    return g;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const randDir = r => V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();

// Pi roig / pi negre: tronc recte i nu, capçada a la part alta amb verticils de branques.
function buildPine(r) {
  const B = new Builder(), H = 12 + r() * 3, crown0 = H * 0.5, center = V(0, H * 0.78, 0);
  const lean = V((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4);
  const at = h => V(lean.x * h / H + Math.sin(h * 0.7) * 0.08, h, lean.z * h / H);
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const h0 = H * i / segs, h1 = H * (i + 1) / segs;
    // L'escorça del pi roig és ataronjada a dalt.
    const c0 = h0 > H * 0.55 ? [1.35, 0.85, 0.6] : [0.8, 0.72, 0.65], c1 = h1 > H * 0.55 ? [1.35, 0.85, 0.6] : [0.8, 0.72, 0.65];
    B.tube(at(h0), at(h1), 0.28 * (1 - h0 / H) + 0.04, 0.28 * (1 - h1 / H) + 0.04, 7, h0 / 2, h1 / 2, c0, c1);
  }
  for (let h = crown0; h < H - 0.6; h += 0.75 + r() * 0.35) {
    const rel = (h - crown0) / (H - crown0), n = 4 + Math.floor(r() * 2);
    const len = 0.9 + 2.8 * Math.pow(1 - rel, 0.8) * (0.8 + r() * 0.4);
    for (let k = 0; k < n; k++) {
      const a = (k / n + r() * 0.2) * Math.PI * 2, up = 0.15 + r() * 0.25;
      const dir = V(Math.cos(a), up, Math.sin(a)).normalize();
      const p0 = at(h), p1 = p0.clone().addScaledVector(dir, len);
      B.tube(p0, p1, 0.06 * (1 - rel) + 0.03, 0.015, 4, 0, len / 2, [1.2, 0.8, 0.6]);
      const nc = 3 + Math.floor(len * 1.4);
      for (let c = 0; c < nc; c++) {
        const t = 0.35 + 0.65 * (c + r()) / nc;
        const p = p0.clone().addScaledVector(dir, len * t).add(V((r() - 0.5) * 0.4, (r() - 0.2) * 0.4, (r() - 0.5) * 0.4));
        const ao = 0.55 + 0.45 * Math.min(1, p.distanceTo(center) / 3.2);
        B.card(p, randDir(r).add(V(0, 0.6, 0)), V(0, 1, 0), 1.4 + r() * 0.6, CELL.pine, center, ao);
      }
    }
  }
  for (let c = 0; c < 6; c++) {
    const p = at(H - 0.4).add(V((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8));
    B.card(p, randDir(r), V(0, 1, 0), 1.3, CELL.pine, center, 1);
  }
  return { B, H, R: 4 };
}
// Avet: con dens fins a baix, branques que pengen una mica.
function buildFir(r) {
  const B = new Builder(), H = 13 + r() * 3, center = V(0, H * 0.45, 0);
  for (let i = 0; i < 8; i++) B.tube(V(0, H * i / 8, 0), V(0, H * (i + 1) / 8, 0), 0.3 * (1 - i / 8) + 0.03, 0.3 * (1 - (i + 1) / 8) + 0.03, 7, i, i + 1, [0.75, 0.7, 0.68]);
  for (let h = H * 0.1; h < H - 0.4; h += 0.55 + r() * 0.2) {
    const rel = h / H, n = 5 + Math.floor(r() * 2), len = 0.4 + 2.9 * (1 - rel) * (0.85 + r() * 0.3);
    for (let k = 0; k < n; k++) {
      const a = (k / n + r() * 0.25) * Math.PI * 2, droop = -0.12 - r() * 0.15;
      const dir = V(Math.cos(a), droop, Math.sin(a)).normalize();
      const p0 = V(0, h, 0), p1 = p0.clone().addScaledVector(dir, len);
      B.tube(p0, p1, 0.04, 0.012, 4, 0, len, [0.7, 0.62, 0.55]);
      const nc = 2 + Math.floor(len * 2.2);
      for (let c = 0; c < nc; c++) {
        const t = 0.15 + 0.7 * (c + r()) / nc, p = p0.clone().addScaledVector(dir, len * t);
        const ao = 0.4 + 0.6 * Math.min(1, Math.hypot(p.x, p.z) / (0.5 + 2.9 * (1 - rel)));
        // Branquillons inclinats al llarg de la branca (de costat també s'han de veure).
        const nrm = randDir(r).add(V(0, 0.7, 0));
        B.card(p, nrm, dir, 1.2 + r() * 0.5, CELL.fir, center, ao);
      }
    }
  }
  return { B, H, R: 3.3 };
}
// Pi pinyer / pi blanc: tronc tort que s'obre en branques, capçada ampla i plana.
function buildUmbrella(r) {
  const B = new Builder(), H = 8 + r() * 3, split = H * (0.5 + r() * 0.1);
  const top = V((r() - 0.5) * 1.2, split, (r() - 0.5) * 1.2), center = V(top.x, H - 1.0, top.z);
  B.tube(V(0, 0, 0), V(top.x * 0.5, split * 0.5, top.z * 0.5), 0.32, 0.26, 7, 0, 2, [0.85, 0.75, 0.68]);
  B.tube(V(top.x * 0.5, split * 0.5, top.z * 0.5), top, 0.26, 0.2, 7, 2, 4, [0.85, 0.75, 0.68]);
  const nl = 3 + Math.floor(r() * 2);
  for (let k = 0; k < nl; k++) {
    const a = (k / nl + r() * 0.2) * Math.PI * 2, rad = 2.2 + r() * 1.6;
    const tip = V(top.x + Math.cos(a) * rad, H - 1.2 + r() * 0.5, top.z + Math.sin(a) * rad);
    B.tube(top, tip, 0.15, 0.06, 5, 0, 3, [0.85, 0.75, 0.68]);
    for (let c = 0; c < 26; c++) {
      const u = r() * Math.PI * 2, d = Math.sqrt(r()) * 2.3;
      const p = V(tip.x + Math.cos(u) * d, tip.y + 0.4 + (r() - 0.35) * 1.5 * (1 - d / 2.8), tip.z + Math.sin(u) * d);
      const ao = 0.55 + 0.45 * Math.min(1, (p.y - (H - 1.8)) / 1.4);
      B.card(p, randDir(r).add(V(0, 1.2, 0)), V(0, 1, 0), 1.5 + r() * 0.6, CELL.pine, center, ao);
    }
  }
  return { B, H, R: 5 };
}
// Planifoli (alzina, roure, faig): tronc que es divideix en braços, capçada arrodonida.
function buildBroad(r) {
  const B = new Builder(), H = 10 + r() * 3, fork = H * (0.42 + r() * 0.12), center = V(0, H * 0.7, 0);
  const BK = [0.7, 0.68, 0.66];
  // Tronc lleugerament tort fins a la forca.
  const t0 = V(0, 0, 0), t1 = V((r() - 0.5) * 0.4, fork * 0.5, (r() - 0.5) * 0.4), t2 = V((r() - 0.5) * 0.5, fork, (r() - 0.5) * 0.5);
  B.tube(t0, t1, 0.4, 0.33, 9, 0, 2, BK); B.tube(t1, t2, 0.33, 0.27, 9, 2, 4, BK);
  const tips = [];
  // Branca corbada: tres trams que es van redreçant cap amunt; al final, 2-3 branques filles.
  const grow = (p, dir, len, rad, depth) => {
    let q = p.clone(), d = dir.clone(), rr = rad;
    for (let sgm = 0; sgm < 3; sgm++) {
      d.add(randDir(r).multiplyScalar(0.25)).add(V(0, 0.12, 0)).normalize();
      const q1 = q.clone().addScaledVector(d, len / 3);
      B.tube(q, q1, rr, rr * 0.85, depth > 1 ? 6 : 4, 0, len / 3, BK);
      q = q1; rr *= 0.85;
    }
    if (depth === 0) { tips.push(q); return; }
    const n = 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const nd = d.clone().add(randDir(r).multiplyScalar(0.8)).add(V(0, 0.2, 0)).normalize();
      grow(q, nd, len * (0.62 + r() * 0.15), rr * 0.7, depth - 1);
    }
  };
  const nl = 3 + Math.floor(r() * 2);
  for (let k = 0; k < nl; k++) {
    const a = (k / nl + r() * 0.2) * Math.PI * 2, el = 0.7 + r() * 0.3;
    grow(t2, V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).normalize(), 2.6 + r() * 0.8, 0.2, 3);
  }
  for (const t of tips) {
    for (let c = 0; c < 6; c++) {
      const p = t.clone().add(randDir(r).multiplyScalar(0.2 + r() * 1.0));
      const ao = 0.45 + 0.55 * Math.min(1, p.distanceTo(center) / 3.6);
      B.card(p, randDir(r), V(0, 1, 0), 1.7 + r() * 0.6, CELL.broad, center, ao);
    }
  }
  return { B, H, R: 4.5 };
}
const BUILDERS = { pine: buildPine, fir: buildFir, umbrella: buildUmbrella, broad: buildBroad };
export const KINDS = Object.keys(BUILDERS);
export const VARIANTS = 2;
export function buildTree(kind, variant) {
  const { B, H, R } = BUILDERS[kind](rng(1000 + KINDS.indexOf(kind) * 17 + variant * 101));
  return { bark: B.geo('bark'), leaf: B.geo('leaf'), H, R };
}

// ---------------------------------------------------------------------------
// Impostors: s'enfoca cada arbre de costat i se'n guarda el color (amb transparència) i la normal.
// ---------------------------------------------------------------------------
const BAKE_VS = /* glsl */`
in vec3 position; in vec3 normal; in vec2 uv; in vec3 color;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix;
out vec2 vUv; out vec3 vN; out vec3 vCol;
void main() { vUv = uv; vN = normalize(normalMatrix * normal); vCol = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BAKE_FS = /* glsl */`
precision highp float;
uniform sampler2D uMap; uniform vec3 uTint; uniform float uNormalPass; uniform float uLeaf;
in vec2 vUv; in vec3 vN; in vec3 vCol;
layout(location = 0) out vec4 outColor;
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec4 t = texture(uMap, vUv);
  if (uLeaf > 0.5 && t.a < 0.5) discard;
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  if (uLeaf > 0.5) n = normalize(vN);
  if (uNormalPass > 0.5) outColor = vec4(n * 0.5 + 0.5, 1.0);
  // Color lineal amb l'oclusió (vertex color). Es guarda amb arrel quadrada per no perdre els foscos en 8 bits.
  else outColor = vec4(sqrt(t.rgb * vCol * uTint), 1.0);
}`;
export function bakeImpostors(renderer, foliageTex, barkTex, trees) {
  const cellW = 256, cellH = 512, n = trees.length;
  const mk = () => new THREE.WebGLRenderTarget(cellW * n, cellH, { type: THREE.UnsignedByteType, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const albedo = mk(), normal = mk();
  const scene = new THREE.Scene();
  const mat = (map, leaf) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: BAKE_VS, fragmentShader: BAKE_FS, side: THREE.DoubleSide,
    uniforms: { uMap: { value: map }, uTint: { value: new THREE.Color(1, 1, 1) }, uNormalPass: { value: 0 }, uLeaf: { value: leaf ? 1 : 0 } } });
  const leafMat = mat(foliageTex, true), barkMat = mat(barkTex, false);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const sizes = [];
  const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
  renderer.autoClear = false;
  for (const [target, pass] of [[albedo, 0], [normal, 1]]) {
    leafMat.uniforms.uNormalPass.value = barkMat.uniforms.uNormalPass.value = pass;
    target.viewport.set(0, 0, cellW * n, cellH);
    renderer.setRenderTarget(target);
    renderer.setClearColor(pass ? 0x8080ff : 0x000000, 0);
    renderer.clear();
    trees.forEach((t, i) => {
      scene.clear();
      scene.add(new THREE.Mesh(t.bark, barkMat), new THREE.Mesh(t.leaf, leafMat));
      t.leaf.computeBoundingBox(); t.bark.computeBoundingBox();
      const bb = t.leaf.boundingBox.clone().union(t.bark.boundingBox);
      const half = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z)) + 0.2;
      const top = bb.max.y + 0.2;
      // Ample = meitat de l'alt (la cel·la fa 256×512).
      const hw = Math.max(half, top / 4), hh = hw * 4;
      cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = 0; cam.updateProjectionMatrix();
      cam.position.set(0, 0, 50); cam.lookAt(0, 0, 0);
      target.viewport.set(i * cellW, 0, cellW, cellH);
      renderer.setRenderTarget(target);
      renderer.clearDepth();
      renderer.render(scene, cam);
      sizes.push(hw * 2, hh);
    });
  }
  renderer.setRenderTarget(null);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.autoClear = prevAuto;
  leafMat.dispose(); barkMat.dispose();
  return { albedo: albedo.texture, normal: normal.texture, sizes: sizes.slice(0, n * 2), n, rt: { albedo, normal } };
}

// ---------------------------------------------------------------------------
// Textures del terra de prop (es repeteixen; el shader les barreja segons el bosc, el pendent i el soroll)
// ---------------------------------------------------------------------------
function tileCanvas(S, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  // Cada forma es dibuixa també desplaçada perquè la textura es repeteixi sense costures.
  const wrap = fn => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  draw(g, wrap, S);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
export function makeGroundTextures() {
  const S = 512;
  const r = rng(23);
  const blotches = (g, wrap, n, rad, col) => {
    for (let k = 0; k < n; k++) {
      const x = r() * S, y = r() * S, rr = rad * (0.4 + r()), c = col();
      wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
    }
  };
  // Fullaraca d'alzinar i roureda.
  const litter = tileCanvas(S, (g, wrap) => {
    g.fillStyle = 'rgb(62,48,34)'; g.fillRect(0, 0, S, S);
    blotches(g, wrap, 40, 60, () => `rgba(${30 + r() * 30 | 0},${24 + r() * 20 | 0},${16 + r() * 12 | 0},0.6)`);
    for (let k = 0; k < 1400; k++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI * 2, l = 7 + r() * 9, w = 3 + r() * 4;
      const t = r(), c = t < 0.4 ? [120 + r() * 50, 80 + r() * 30, 40 + r() * 20] : t < 0.75 ? [90 + r() * 40, 70 + r() * 25, 45 + r() * 15] : [70 + r() * 30, 68 + r() * 30, 40 + r() * 15];
      wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.beginPath(); g.ellipse(0, 0, w, l, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(30,20,10,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -l); g.lineTo(0, l); g.stroke(); g.restore(); });
    }
    g.lineCap = 'round';
    for (let k = 0; k < 40; k++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = 20 + r() * 50;
      wrap(() => { g.strokeStyle = `rgb(${50 + r() * 30 | 0},${38 + r() * 20 | 0},${28 | 0})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
    }
  });
  // Pinassa (acícules seques) de pineda i avetosa.
  const needles = tileCanvas(S, (g, wrap) => {
    g.fillStyle = 'rgb(70,50,32)'; g.fillRect(0, 0, S, S);
    blotches(g, wrap, 30, 70, () => `rgba(${40 + r() * 20 | 0},${28 + r() * 14 | 0},${18},0.5)`);
    g.lineCap = 'round';
    for (let k = 0; k < 4500; k++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = 8 + r() * 14, c = 110 + r() * 80;
      wrap(() => { g.strokeStyle = `rgb(${c | 0},${c * 0.68 | 0},${c * 0.4 | 0})`; g.lineWidth = 1 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
    }
    for (let k = 0; k < 8; k++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI;
      wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgb(85,58,35)'; g.beginPath(); g.ellipse(0, 0, 8, 15, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(40,25,10,0.8)'; for (let i = -12; i < 13; i += 4) { g.beginPath(); g.moveTo(-8, i); g.lineTo(8, i + 3); g.stroke(); } g.restore(); });
    }
  });
  // Herba (neutra: el to el dona el color de la zona; aquí només la textura).
  const grass = tileCanvas(S, (g, wrap) => {
    g.fillStyle = 'rgb(105,112,70)'; g.fillRect(0, 0, S, S);
    blotches(g, wrap, 50, 50, () => r() < 0.5 ? `rgba(70,80,40,0.5)` : `rgba(140,135,85,0.4)`);
    g.lineCap = 'round';
    for (let k = 0; k < 6000; k++) {
      const x = r() * S, y = r() * S, a = -Math.PI / 2 + (r() - 0.5) * 1.6, l = 6 + r() * 12, c = 80 + r() * 110;
      wrap(() => { g.strokeStyle = `rgb(${c * 0.85 | 0},${c | 0},${c * 0.5 | 0})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
    }
  });
  // Roca i terra.
  const rock = tileCanvas(S, (g, wrap) => {
    g.fillStyle = 'rgb(118,112,104)'; g.fillRect(0, 0, S, S);
    blotches(g, wrap, 90, 80, () => { const c = 70 + r() * 90; return `rgba(${c | 0},${c * 0.96 | 0},${c * 0.9 | 0},0.55)`; });
    for (let k = 0; k < 2500; k++) {
      const x = r() * S, y = r() * S, c = 60 + r() * 120, s = 1 + r() * 3;
      wrap(() => { g.fillStyle = `rgb(${c | 0},${c * 0.95 | 0},${c * 0.88 | 0})`; g.fillRect(x, y, s, s); });
    }
    g.strokeStyle = 'rgba(35,32,30,0.7)';
    for (let k = 0; k < 30; k++) {
      let x = r() * S, y = r() * S; const pts = [[x, y]];
      for (let i = 0; i < 8; i++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; pts.push([x, y]); }
      wrap(() => { g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.stroke(); });
    }
  });
  return { litter, needles, grass, rock };
}

// Mates de terra: dues targetes creuades d'herba o de fulles, per a la vegetació baixa de prop.
export function groundCoverGeometry() {
  const B = new Builder();
  const c = V(0, 0.2, 0);
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3;
    const n = V(Math.cos(a), 0.25, Math.sin(a));
    B.card(V(0, 0.5, 0), n, V(0, 1, 0), 1, CELL.grass, c, 1);
  }
  // Normals cap amunt: l'herba es veu il·luminada com el terra.
  const g = B.geo('leaf'), nor = g.attributes.normal;
  for (let i = 0; i < nor.count; i++) nor.setXYZ(i, 0, 1, 0);
  // Base més fosca (oclusió).
  const pos = g.attributes.position, col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const ao = 0.45 + 0.55 * Math.min(1, y); col.setXYZ(i, ao, ao, ao); }
  return g;
}
export function shrubGeometry() {
  const B = new Builder(), r = rng(5), c = V(0, 0.5, 0);
  for (let k = 0; k < 22; k++) {
    const p = V((r() - 0.5) * 1.3, 0.25 + r() * 0.75, (r() - 0.5) * 1.3);
    B.card(p, randDir(r).add(V(0, 0.5, 0)), V(0, 1, 0), 0.5 + r() * 0.3, CELL.broad, c, 0.5 + 0.5 * p.y);
  }
  return B.geo('leaf');
}
