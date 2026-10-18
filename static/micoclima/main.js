// Micoclima 3D: relleu real de Catalunya, el temps dels últims dies (Open-Meteo)
// i una estimació d'on poden sortir bolets, tot en una escena 3D on es pot volar o caminar.
//
// Dades:
//  - Relleu: Terrain Tiles (format "terrarium") d'AWS. Dues capes: una de detall
//    (zoom 13, ~14 km, ~14 m/píxel) i una de context (zoom 11, ~58 km).
//  - Temps: Open-Meteo, una graella de 3×3 punts sobre la zona, 60 dies enrere i 7 endavant.
//  - Bosc: no hi ha mapa real de vegetació; s'estima per altitud, orientació i zona.
//
// Coordenades del món: metres, x cap a l'est, z cap al sud, origen al centre de la zona.
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Configuració
// ---------------------------------------------------------------------------
const ZONES = [
  { id: 'montseny',   nom: 'Montseny',                     lat: 41.775, lon: 2.405 },
  { id: 'guilleries', nom: 'Les Guilleries',               lat: 41.925, lon: 2.47 },
  { id: 'bergueda',   nom: 'Berguedà · Rasos de Peguera',  lat: 42.13,  lon: 1.79 },
  { id: 'solsones',   nom: 'Solsonès · Port del Comte',    lat: 42.17,  lon: 1.55 },
  { id: 'ripolles',   nom: 'Ripollès · Vall de Camprodon', lat: 42.30,  lon: 2.37 },
  { id: 'cerdanya',   nom: 'Cerdanya · La Molina',         lat: 42.34,  lon: 1.93 },
  { id: 'aran',       nom: "Vall d'Aran",                  lat: 42.72,  lon: 0.80 },
  { id: 'prades',     nom: 'Muntanyes de Prades',          lat: 41.33,  lon: 1.03 },
  { id: 'ports',      nom: 'Els Ports',                    lat: 40.80,  lon: 0.32 },
];

// Tipus de vegetació estimada. "tree": forma dels arbres que s'hi planten.
const VEG = [
  { id: 'conreu',   nom: 'Prats i conreus',             tree: null },
  { id: 'alzinar',  nom: 'Alzinar',                     tree: 'broad', ever: true },
  { id: 'pinblanc', nom: 'Pineda de pi blanc i pinyer', tree: 'umbrella' },
  { id: 'roureda',  nom: 'Roureda',                     tree: 'broad' },
  { id: 'fageda',   nom: 'Fageda',                      tree: 'broad' },
  { id: 'piroig',   nom: 'Pineda de pi roig',           tree: 'pine' },
  { id: 'avetosa',  nom: 'Avetosa',                     tree: 'fir' },
  { id: 'pinegre',  nom: 'Pineda de pi negre',          tree: 'pine' },
  { id: 'prat',     nom: 'Prats alpins',                tree: null },
  { id: 'roca',     nom: 'Roca i tarteres',             tree: null },
  { id: 'matollar', nom: 'Matollar',                    tree: null },
  { id: 'urba',     nom: 'Zona urbana',                 tree: null },
  { id: 'aigua',    nom: 'Aigua',                       tree: null },
];

// Mapa de cobertes del sòl de Catalunya 2024 (ICGC): codi, nom, color exacte de la llegenda del WMS,
// família de bosc (con: coníferes, dec: caducifolis, scl: esclerofil·les) i densitat d'arbres.
const COBERTES = [
  [111, 'Conreus herbacis', [255, 255, 0]], [112, 'Horta, vivers i conreus forçats', [204, 255, 51]],
  [113, 'Vinyes', [175, 91, 21]], [114, 'Oliverars', [128, 128, 0]], [115, 'Altres conreus llenyosos', [205, 205, 0]],
  [116, 'Conreus en transformació', [255, 255, 204]],
  [221, 'Bosc dens de coníferes', [51, 204, 51], 'con', 1], [222, 'Bosc dens de caducifolis', [102, 255, 51], 'dec', 1],
  [223, "Bosc dens d'esclerofil·les", [104, 144, 24], 'scl', 1], [224, 'Matollar', [150, 125, 95]],
  [225, 'Bosc clar de coníferes', [25, 230, 30], 'con', 0.45], [226, 'Bosc clar de caducifolis', [180, 255, 155], 'dec', 0.45],
  [227, "Bosc clar d'esclerofil·les", [170, 165, 0], 'scl', 0.45], [228, 'Prats i herbassars', [195, 195, 160]],
  [229, 'Bosc de ribera', [0, 255, 155], 'dec', 0.7], [230, 'Sòl nu forestal', [255, 150, 50]],
  [231, 'Zona cremada', [40, 40, 40]], [232, 'Roquissars i congestes', [121, 121, 122]], [233, 'Platja', [245, 223, 120]],
  [234, 'Zona humida', [50, 150, 255]],
  [341, 'Casc urbà', [255, 0, 125]], [342, 'Eixample', [255, 83, 205]], [343, 'Zona urbana laxa', [255, 164, 226]],
  [344, 'Edificacions aïllades', [255, 200, 226]], [345, 'Zona residencial aïllada', [255, 180, 180]], [346, 'Zona verda', [15, 55, 0]],
  [347, 'Zona industrial o comercial', [115, 0, 85]], [348, "Zona esportiva o d'oci", [98, 0, 196]], [349, "Zona d'extracció o abocador", [74, 149, 149]],
  [350, 'Zona en transformació', [255, 0, 240]], [351, 'Xarxa viària', [173, 170, 202]], [352, 'Sòl nu urbà', [255, 230, 230]],
  [353, 'Zona aeroportuària', [103, 98, 154]], [354, 'Xarxa ferroviària', [74, 70, 110]], [355, 'Zona portuària', [47, 45, 70]],
  [461, 'Embassament', [111, 111, 255]], [462, 'Llac o llacuna', [0, 0, 220]], [463, "Curs d'aigua", [0, 0, 100]],
  [464, 'Bassa', [24, 95, 148]], [465, 'Canal artificial', [18, 70, 109]], [466, 'Mar', [0, 0, 128]],
].map(([code, nom, rgb, fam, dens]) => ({ code, nom, rgb, fam: fam || null, dens: dens || 0 }));
const NO_COVER = 255;
// Tipus de vegetació (no forestal) de cada classe de coberta.
function coverVeg(c, h) {
  if (c.code < 200) return VI.conreu;
  if (c.code === 224 || c.code === 231) return VI.matollar;
  if (c.code === 228 || c.code === 234) return h > 1500 ? VI.prat : VI.conreu;
  if (c.code === 230 || c.code === 232 || c.code === 233) return VI.roca;
  if (c.code < 400) return VI.urba;
  return VI.aigua;
}
const VI = Object.fromEntries(VEG.map((v, i) => [v.id, i]));

// Bolets: hàbitat (afinitat per tipus de bosc), temperatura del sòl òptima,
// pluja necessària en ~20 dies (mm) i temporada (mesos, pot donar la volta a l'any).
const BOLETS = [
  { id: 'rovello',   nom: 'Rovelló',             llati: 'Lactarius sanguifluus / deliciosus', color: '#d9661f',
    hab: { pinblanc: 1, piroig: 0.9, pinegre: 0.5, avetosa: 0.3, alzinar: 0.2 }, t: [9, 18], pluja: 40, mesos: [9, 12] },
  { id: 'cep',       nom: 'Cep',                 llati: 'Boletus edulis', color: '#7a4a24',
    hab: { fageda: 1, avetosa: 0.9, piroig: 0.8, roureda: 0.6, pinegre: 0.5, alzinar: 0.25 }, t: [11, 20], pluja: 50, mesos: [8, 11] },
  { id: 'rossinyol', nom: 'Rossinyol',           llati: 'Cantharellus cibarius', color: '#f0b42a',
    hab: { roureda: 1, fageda: 0.8, alzinar: 0.7, piroig: 0.5 }, t: [12, 22], pluja: 35, mesos: [6, 11] },
  { id: 'camagroc',  nom: 'Camagroc',            llati: 'Craterellus lutescens', color: '#a87a3a',
    hab: { piroig: 1, avetosa: 0.7, pinegre: 0.6, fageda: 0.4 }, t: [4, 12], pluja: 45, mesos: [10, 12] },
  { id: 'llenega',   nom: 'Llenega negra',       llati: 'Hygrophorus latitatus', color: '#55524f',
    hab: { piroig: 1, pinegre: 0.9, pinblanc: 0.4 }, t: [2, 10], pluja: 35, mesos: [11, 1], frost: true },
  { id: 'trompeta',  nom: 'Trompeta de la mort', llati: 'Craterellus cornucopioides', color: '#2a2422',
    hab: { fageda: 1, roureda: 0.7, alzinar: 0.4 }, t: [7, 16], pluja: 50, mesos: [9, 11] },
];

const Z_DET = 13, Z_CTX = 11, TILES = 4, TEX = TILES * 256;   // 1024 × 1024
const GRID = 256;                                             // resolució del mapa de bosc i de probabilitat
const LAPSE = -0.0058;                                        // °C per metre
const PAST_DAYS = 60, SHOW_PAST = 30, FORECAST_DAYS = 7;

const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wrap = (v, n) => ((v % n) + n) % n;

function setLoading(p, text) {
  $('progress').style.width = Math.round(p * 100) + '%';
  if (text) $('loadText').textContent = text;
}
function fail(msg) {
  $('loadText').textContent = msg;
  $('loading').classList.remove('off');
  throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Renderer i escena
// ---------------------------------------------------------------------------
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { fail('Aquest navegador no pot fer servir WebGL2.'); }
if (!(renderer.getContext() instanceof WebGL2RenderingContext)) fail('Aquest navegador no pot fer servir WebGL2.');
const floatLinear = renderer.extensions.has('OES_texture_float_linear');
const fixedQuality = parseFloat(qs.get('q'));
let pixelRatio = fixedQuality > 0 ? fixedQuality : Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 90000);
camera.rotation.order = 'YXZ';
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  drawChart();
});

// ---------------------------------------------------------------------------
// Uniformes compartits
// ---------------------------------------------------------------------------
const U = {
  uTime: { value: 0 },
  uDetTex: { value: null }, uDetOrigin: { value: new THREE.Vector2() }, uDetSize: { value: 1 },
  uCtxTex: { value: null }, uCtxOrigin: { value: new THREE.Vector2() }, uCtxSize: { value: 1 },
  uNoiseTex: { value: null },
  uDetN: { value: null }, uCtxN: { value: null },
  uOrthoDet: { value: null }, uOrthoCtx: { value: null }, uUseOrtho: { value: 0 },
  uVegTex: { value: null },
  uIndexTex: { value: null },
  uShadowTex: { value: null },
  uOverlay: { value: 1 },
  uIdxColor: { value: new THREE.Color() },
  uSnowLine: { value: 9999 },
  uSnowAmt: { value: 0 },
  uWet: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uLightDir: { value: new THREE.Vector3(0, 1, 0) },
  uLightCol: { value: new THREE.Color() },
  uSunGlow: { value: new THREE.Color() },
  uZenith: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uAmbient: { value: new THREE.Color() },
  uNight: { value: 0 },
  uCloud: { value: 0.3 },
  uCloudOff: { value: new THREE.Vector2() },
  uFogDensity: { value: 0 },
  uFogFalloff: { value: 1 / 200 },
  uFogBase: { value: 0 },
  uHaze: { value: 1 / 60000 },
  uWindDir: { value: new THREE.Vector2(1, 0) },
  uWindStr: { value: 0 },
};

// ---------------------------------------------------------------------------
// GLSL compartit
// ---------------------------------------------------------------------------
const GLSL_HASH = /* glsl */`
float nzHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

// Alçada: B-spline cúbica sobre la capa de detall, fosa amb la de context a les vores,
// més un soroll petit perquè de prop el terra no sigui llis.
const GLSL_TERRAIN = /* glsl */`
uniform sampler2D uDetTex; uniform vec2 uDetOrigin; uniform float uDetSize;
uniform sampler2D uCtxTex; uniform vec2 uCtxOrigin; uniform float uCtxSize;
uniform sampler2D uNoiseTex;
float bspline(sampler2D tex, vec2 uv) {
  vec2 st = uv * ${TEX}.0 - 0.5;
  vec2 i = floor(st), f = st - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 s0 = w0 + w1, s1 = w2 + w3;
  vec2 t0 = (i - 0.5 + w1 / s0) / ${TEX}.0;
  vec2 t1 = (i + 1.5 + w3 / s1) / ${TEX}.0;
  return s0.y * (s0.x * texture(tex, t0).r + s1.x * texture(tex, vec2(t1.x, t0.y)).r)
       + s1.y * (s0.x * texture(tex, vec2(t0.x, t1.y)).r + s1.x * texture(tex, t1).r);
}
float detWeight(vec2 xz) {
  vec2 uv = (xz - uDetOrigin) / uDetSize;
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return smoothstep(0.0, 0.035, e);
}
float hMacro(vec2 xz) {
  float hc = bspline(uCtxTex, (xz - uCtxOrigin) / uCtxSize);
  float w = detWeight(xz);
  if (w <= 0.0) return hc;
  return mix(hc, bspline(uDetTex, (xz - uDetOrigin) / uDetSize), w);
}
float hNoise(vec2 xz) {
  return (texture(uNoiseTex, xz / 37.0).r - 0.5) * 0.9 + (texture(uNoiseTex, xz / 5.3 + 0.37).r - 0.5) * 0.12;
}
float terrainH(vec2 xz) { return max(hMacro(xz), 0.0) + hNoise(xz); }
`;

const GLSL_SKY = /* glsl */`
uniform vec3 uSunDir; uniform vec3 uSunGlow; uniform vec3 uZenith; uniform vec3 uHorizon;
uniform float uFogDensity; uniform float uFogFalloff; uniform float uFogBase; uniform float uHaze;
vec3 skyBase(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.45));
  c = mix(c, uHorizon * 0.75, smoothstep(0.0, -0.2, y));
  float mu = max(dot(rd, uSunDir), 0.0);
  c += uSunGlow * (0.18 * pow(mu, 4.0) + 0.45 * pow(mu, 24.0)) * (1.0 - 0.6 * clamp(y, 0.0, 1.0));
  return c;
}
vec3 fogColorFor(vec3 rd) { return skyBase(vec3(rd.x, max(rd.y, 0.0) * 0.35, rd.z)); }
vec3 applyFog(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float dist = length(d);
  vec3 rd = d / max(dist, 1e-3);
  float a = uFogDensity * exp(-uFogFalloff * (cameraPosition.y - uFogBase));
  float k = uFogFalloff * rd.y * dist;
  float hf = a * dist * (abs(k) > 1e-4 ? (1.0 - exp(-k)) / k : 1.0);
  return mix(col, fogColorFor(rd), 1.0 - exp(-(hf + uHaze * dist)));
}
`;

// ---------------------------------------------------------------------------
// Utilitats de CPU
// ---------------------------------------------------------------------------
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash3(i, j, k) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Soroll de valor periòdic (textura de 256², també la fa servir la GPU).
const NOISE = 256;
const noiseData = (() => {
  const data = new Float32Array(NOISE * NOISE);
  const octs = [[8, 0.5], [16, 0.25], [32, 0.13], [64, 0.07], [128, 0.05]];
  const lats = octs.map(([per], o) => { const r = mulberry(17 + o * 31); return Float32Array.from({ length: per * per }, r); });
  let norm = 0; for (const [, a] of octs) norm += a;
  for (let y = 0; y < NOISE; y++) for (let x = 0; x < NOISE; x++) {
    let v = 0;
    octs.forEach(([per, amp], o) => {
      const fx = x / NOISE * per, fy = y / NOISE * per, ix = Math.floor(fx), iy = Math.floor(fy);
      let ux = fx - ix, uy = fy - iy; ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
      const L = lats[o], g = (i, j) => L[(j % per) * per + (i % per)];
      v += amp * ((g(ix, iy) * (1 - ux) + g(ix + 1, iy) * ux) * (1 - uy) + (g(ix, iy + 1) * (1 - ux) + g(ix + 1, iy + 1) * ux) * uy);
    });
    data[y * NOISE + x] = v / norm;
  }
  return data;
})();
function sampleRepeat(data, n, u, v) {
  const sx = u * n - 0.5, sy = v * n - 0.5, ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
  const g = (i, j) => data[wrap(j, n) * n + wrap(i, n)];
  return (g(ix, iy) * (1 - fx) + g(ix + 1, iy) * fx) * (1 - fy) + (g(ix, iy + 1) * (1 - fx) + g(ix + 1, iy + 1) * fx) * fy;
}
function sampleClamp(data, n, u, v, stride = 1, ch = 0) {
  const sx = clamp(u, 0, 1) * n - 0.5, sy = clamp(v, 0, 1) * n - 0.5;
  const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
  const g = (i, j) => data[(clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)) * stride + ch];
  return (g(ix, iy) * (1 - fx) + g(ix + 1, iy) * fx) * (1 - fy) + (g(ix, iy + 1) * (1 - fx) + g(ix + 1, iy + 1) * fx) * fy;
}
function bsplineCPU(H, u, v) {
  const sx = u * TEX - 0.5, sz = v * TEX - 0.5, ix = Math.floor(sx), iz = Math.floor(sz);
  const bw = f => { const f2 = f * f, f3 = f2 * f; return [(1 - f) ** 3 / 6, (3 * f3 - 6 * f2 + 4) / 6, (-3 * f3 + 3 * f2 + 3 * f + 1) / 6, f3 / 6]; };
  const wx = bw(sx - ix), wz = bw(sz - iz);
  let h = 0;
  for (let j = 0; j < 4; j++) {
    const row = clamp(iz - 1 + j, 0, TEX - 1) * TEX;
    let r = 0;
    for (let i = 0; i < 4; i++) r += wx[i] * H[row + clamp(ix - 1 + i, 0, TEX - 1)];
    h += wz[j] * r;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Estat de la zona carregada
// ---------------------------------------------------------------------------
const Z = {
  zone: null,
  det: null, ctx: null,           // Float32Array TEX*TEX d'alçades
  detOrigin: [0, 0], detSize: 1,
  ctxOrigin: [0, 0], ctxSize: 1,
  veg: null, cover: null,         // Uint8Array / Float32Array GRID*GRID
  gh: null, north: null, slope: null,
  weather: null,                  // dades processades d'Open-Meteo
  index: null,                    // Float32Array GRID*GRID per al dia i bolet actuals
  sampleWeather: false,
  geo: null,                      // { cx, cy, res }: conversió entre metres i lat/lon (zoom de detall)
  places: [],                     // cims, pobles i refugis
};

function detWeightCPU(x, z) {
  const u = (x - Z.detOrigin[0]) / Z.detSize, v = (z - Z.detOrigin[1]) / Z.detSize;
  return smooth(0, 0.035, Math.min(u, 1 - u, v, 1 - v));
}
function hMacroCPU(x, z) {
  const hc = bsplineCPU(Z.ctx, clamp((x - Z.ctxOrigin[0]) / Z.ctxSize), clamp((z - Z.ctxOrigin[1]) / Z.ctxSize));
  const w = detWeightCPU(x, z);
  if (w <= 0) return hc;
  const hd = bsplineCPU(Z.det, (x - Z.detOrigin[0]) / Z.detSize, (z - Z.detOrigin[1]) / Z.detSize);
  return hc + (hd - hc) * w;
}
const hNoiseCPU = (x, z) => (sampleRepeat(noiseData, NOISE, x / 37, z / 37) - 0.5) * 0.9 + (sampleRepeat(noiseData, NOISE, x / 5.3 + 0.37, z / 5.3 + 0.37) - 0.5) * 0.12;
const heightAt = (x, z) => Math.max(hMacroCPU(x, z), 0) + hNoiseCPU(x, z);
const gridUV = (x, z) => [(x - Z.detOrigin[0]) / Z.detSize, (z - Z.detOrigin[1]) / Z.detSize];
function gridCell(x, z) {
  const [u, v] = gridUV(x, z);
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1;
  return Math.floor(v * GRID) * GRID + Math.floor(u * GRID);
}

// ---------------------------------------------------------------------------
// Relleu: teselles terrarium
// ---------------------------------------------------------------------------
const TILE_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const lonToPx = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
const latToPx = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z; };
const pxToLon = (px, z) => px / (256 * 2 ** z) * 360 - 180;
const pxToLat = (py, z) => { const n = Math.PI - 2 * Math.PI * py / (256 * 2 ** z); return 180 / Math.PI * Math.atan(Math.sinh(n)); };

function worldToLatLon(x, z) {
  return [pxToLat(Z.geo.cy + z / Z.geo.res, Z_DET), pxToLon(Z.geo.cx + x / Z.geo.res, Z_DET)];
}
function latLonToWorld(lat, lon) {
  return [(lonToPx(lon, Z_DET) - Z.geo.cx) * Z.geo.res, (latToPx(lat, Z_DET) - Z.geo.cy) * Z.geo.res];
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('No s\'ha pogut descarregar ' + url));
    img.src = url;
  });
}

async function loadLayer(zone, z, onTile) {
  const cx = lonToPx(zone.lon, z), cy = latToPx(zone.lat, z);
  const tx0 = Math.round(cx / 256 - TILES / 2), ty0 = Math.round(cy / 256 - TILES / 2);
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const jobs = [];
  for (let j = 0; j < TILES; j++) for (let i = 0; i < TILES; i++) {
    jobs.push(loadImage(TILE_URL(z, tx0 + i, ty0 + j)).then(img => { g.drawImage(img, i * 256, j * 256); onTile(); }));
  }
  await Promise.all(jobs);
  const px = g.getImageData(0, 0, TEX, TEX).data;
  const H = new Float32Array(TEX * TEX);
  for (let k = 0; k < H.length; k++) H[k] = (px[k * 4] * 256 + px[k * 4 + 1] + px[k * 4 + 2] / 256) - 32768;
  // Metres per píxel a la latitud de la zona (Mercator).
  const res = 40075016.686 * Math.cos(zone.lat * Math.PI / 180) / (256 * 2 ** z);
  const origin = [(tx0 * 256 - cx) * res, (ty0 * 256 - cy) * res];
  return { H, origin, size: TEX * res, res, cx, cy, tx0, ty0 };
}

// Cobertes del sòl: una imatge del WMS de l'ICGC exactament sobre el requadre de detall (1024², ~14 m/píxel).
// Cada color de la llegenda és una classe; els píxels sense dades (fora de Catalunya) queden en blanc.
async function loadCobertes(det) {
  const R = 20037508.342789244, s = 2 * R / (256 * 2 ** Z_DET);
  const minx = det.tx0 * 256 * s - R, maxx = (det.tx0 + TILES) * 256 * s - R;
  const maxy = R - det.ty0 * 256 * s, miny = R - (det.ty0 + TILES) * 256 * s;
  const url = 'https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms?' + new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', LAYERS: 'cobertes_2024', STYLES: '', CRS: 'EPSG:3857',
    BBOX: [minx, miny, maxx, maxy].map(v => v.toFixed(2)).join(','), WIDTH: TEX, HEIGHT: TEX, FORMAT: 'image/png',
  });
  const img = await loadImage(url);
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, TEX, TEX).data;
  const cls = new Uint8Array(TEX * TEX).fill(NO_COVER);
  const lut = new Map();
  let found = 0;
  for (let k = 0; k < TEX * TEX; k++) {
    if (px[k * 4 + 3] < 128) continue;
    const key = (px[k * 4] << 16) | (px[k * 4 + 1] << 8) | px[k * 4 + 2];
    let c = lut.get(key);
    if (c === undefined) {
      // El color més proper de la llegenda (les vores poden venir suavitzades).
      let bd = 1e9; c = NO_COVER;
      COBERTES.forEach((cb, i) => { const d = (cb.rgb[0] - px[k * 4]) ** 2 + (cb.rgb[1] - px[k * 4 + 1]) ** 2 + (cb.rgb[2] - px[k * 4 + 2]) ** 2; if (d < bd) { bd = d; c = i; } });
      if (bd > 2500) c = NO_COVER;
      lut.set(key, c);
    }
    cls[k] = c;
    if (c !== NO_COVER) found++;
  }
  if (found < TEX * TEX * 0.05) throw new Error('Zona sense cobertes del sòl');
  return cls;
}
function coverClassAt(x, z) {
  if (!Z.cls) return NO_COVER;
  const [u, v] = gridUV(x, z);
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return NO_COVER;
  return Z.cls[Math.floor(v * TEX) * TEX + Math.floor(u * TEX)];
}
// Passa les classes (1024²) a la graella del model (256²): densitat de bosc, família dominant i coberta principal.
function applyCobertes(cls) {
  Z.cls = cls;
  const B = TEX / GRID;
  const fam = { con: 0, dec: 0, scl: 0 };
  const counts = new Map();
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const k = j * GRID + i;
    fam.con = fam.dec = fam.scl = 0;
    counts.clear();
    let none = 0, dens = 0;
    for (let b = 0; b < B; b++) for (let a = 0; a < B; a++) {
      const c = cls[(j * B + b) * TEX + i * B + a];
      if (c === NO_COVER) { none++; continue; }
      const cb = COBERTES[c];
      if (cb.fam) { fam[cb.fam] += cb.dens; dens += cb.dens; }
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    if (none > B * B / 2) continue;                       // sense dades: es queda l'ortofoto o l'estimació
    const n = B * B - none;
    const forest = dens / n;
    let main = 0, mc = -1;
    for (const [c, m] of counts) if (m > mc) { mc = m; main = c; }
    Z.vegReal[k] = 1;
    Z.clsMain[k] = main;
    if (forest >= 0.2) {
      const f = fam.con >= fam.dec && fam.con >= fam.scl ? 'con' : fam.dec >= fam.scl ? 'dec' : 'scl';
      Z.veg[k] = f === 'con' ? Z.conType[k] : f === 'dec' ? Z.decType[k] : VI.alzinar;
      Z.cover[k] = clamp(forest * 1.1);
    } else {
      Z.veg[k] = coverVeg(COBERTES[main], Z.gh[k]);
      Z.cover[k] = 0;
    }
  }
}

// Ortofoto de l'ICGC: les mateixes teselles que el relleu, al zoom 14 (detall, ~7 m/píxel) i 11 (context).
const ORTO_URL = (z, x, y) => `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/${z}/${x}/${y}.png`;
async function loadOrthoLayer(zone, zHeights, zOrtho, onTile) {
  const k = 2 ** (zOrtho - zHeights), n = TILES * k;
  const cx = lonToPx(zone.lon, zHeights), cy = latToPx(zone.lat, zHeights);
  const tx0 = Math.round(cx / 256 - TILES / 2) * k, ty0 = Math.round(cy / 256 - TILES / 2) * k;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n * 256;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#3a4030'; g.fillRect(0, 0, cv.width, cv.height);
  let ok = 0;
  const jobs = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    jobs.push(loadImage(ORTO_URL(zOrtho, tx0 + i, ty0 + j)).then(img => { g.drawImage(img, i * 256, j * 256, 256, 256); ok++; }).catch(() => {}).finally(onTile));
  }
  await Promise.all(jobs);
  if (ok < jobs.length * 0.5) throw new Error('Ortofoto incompleta');
  return cv;
}
function canvasTexture(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
// Bosc segons l'ortofoto: píxels foscos i verdosos. El tipus de bosc continua sent estimat.
function applyOrthoForest(cv) {
  const small = document.createElement('canvas');
  small.width = small.height = GRID;
  const g = small.getContext('2d', { willReadFrequently: true });
  g.drawImage(cv, 0, 0, GRID, GRID);
  const d = g.getImageData(0, 0, GRID, GRID).data;
  for (let k = 0; k < GRID * GRID; k++) {
    const r = d[k * 4] / 255, gg = d[k * 4 + 1] / 255, b = d[k * 4 + 2] / 255;
    const lum = 0.3 * r + 0.55 * gg + 0.15 * b;
    const forest = smooth(0.42, 0.24, lum) * smooth(-0.04, 0.03, gg - r) * smooth(-0.06, 0.02, gg - b);
    if (forest > 0.25 && Z.slope[k] < 1.2) {
      Z.veg[k] = Z.vegTree[k];
      Z.cover[k] = clamp(forest * 1.3);
    } else {
      if (VEG[Z.veg[k]].tree) Z.veg[k] = Z.gh[k] > 1700 ? VI.prat : Z.slope[k] > 0.9 ? VI.roca : VI.conreu;
      Z.cover[k] = 0;
    }
  }
}

// Pendents (dh/dx, dh/dz) precalculades: així el fragment shader no ha de mostrejar el relleu 4 vegades.
function makeSlopeTexture(H, res) {
  const S = new Float32Array(TEX * TEX * 2);
  for (let j = 0; j < TEX; j++) for (let i = 0; i < TEX; i++) {
    const at = (a, b) => Math.max(H[clamp(b, 0, TEX - 1) * TEX + clamp(a, 0, TEX - 1)], 0);
    const k = (j * TEX + i) * 2;
    S[k] = (at(i + 1, j) - at(i - 1, j)) / (2 * res);
    S[k + 1] = (at(i, j + 1) - at(i, j - 1)) / (2 * res);
  }
  const t = new THREE.DataTexture(S, TEX, TEX, THREE.RGFormat, THREE.FloatType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

function makeHeightTexture(H) {
  const t = new THREE.DataTexture(H, TEX, TEX, THREE.RedFormat, THREE.FloatType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const noiseTex = new THREE.DataTexture(noiseData, NOISE, NOISE, THREE.RedFormat, THREE.FloatType);
noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
noiseTex.magFilter = noiseTex.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
noiseTex.needsUpdate = true;
U.uNoiseTex.value = noiseTex;

// ---------------------------------------------------------------------------
// Temps: Open-Meteo
// ---------------------------------------------------------------------------
const HOURLY = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'snowfall', 'cloud_cover',
  'wind_speed_10m', 'wind_direction_10m', 'soil_temperature_6cm', 'soil_moisture_3_to_9cm'];

function gridPoints() {
  // 3×3 punts repartits pel requadre de detall.
  const pts = [];
  const zDet = Z_DET, z = Z.zone;
  const cx = lonToPx(z.lon, zDet), cy = latToPx(z.lat, zDet);
  const res = 40075016.686 * Math.cos(z.lat * Math.PI / 180) / (256 * 2 ** zDet);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const x = Z.detOrigin[0] + Z.detSize * (0.12 + 0.38 * i);
    const zz = Z.detOrigin[1] + Z.detSize * (0.12 + 0.38 * j);
    pts.push({ x, z: zz, lat: pxToLat(cy + zz / res, zDet), lon: pxToLon(cx + x / res, zDet) });
  }
  return pts;
}

async function loadWeather() {
  const pts = gridPoints();
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: pts.map(p => p.lat.toFixed(4)).join(','),
    longitude: pts.map(p => p.lon.toFixed(4)).join(','),
    hourly: HOURLY.join(','),
    past_days: PAST_DAYS,
    forecast_days: FORECAST_DAYS,
    timezone: 'Europe/Madrid',
  });
  let json = null;
  if (!qs.has('offline')) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      json = await r.json();
      if (!Array.isArray(json)) json = [json];
    } catch (e) {
      console.warn('Open-Meteo no disponible:', e);
      json = null;
    }
  }
  Z.sampleWeather = !json;
  if (!json) json = sampleWeather(pts);
  processWeather(json, pts);
}

// Dades d'exemple, només si no hi ha connexió amb Open-Meteo (la interfície ho indica).
function sampleWeather(pts) {
  const now = new Date();
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - PAST_DAYS * 864e5;
  const n = (PAST_DAYS + FORECAST_DAYS) * 24;
  const r = mulberry(4242);
  const storms = [];
  for (let d = 0; d < PAST_DAYS + FORECAST_DAYS; d++) if (r() < 0.16) storms.push({ d, mm: 4 + r() * 30, len: 4 + r() * 18 });
  return pts.map((p, k) => {
    const hourly = { time: [] };
    for (const v of HOURLY) hourly[v] = [];
    let moist = 0.22;
    for (let h = 0; h < n; h++) {
      const t = start + h * 36e5, day = Math.floor(h / 24), hr = h % 24;
      hourly.time.push(new Date(t).toISOString().slice(0, 16));
      const doy = (new Date(t).getUTCMonth() * 30.5 + new Date(t).getUTCDate());
      const base = 12 - 9 * Math.cos((doy - 20) / 365 * 2 * Math.PI);
      const temp = base + 5 * Math.sin((hr - 9) / 24 * 2 * Math.PI) - k * 0.3;
      let pr = 0;
      for (const s of storms) if (day === s.d && hr >= 12 && hr < 12 + s.len) pr += s.mm / s.len * (0.8 + 0.4 * r());
      moist = clamp(moist * 0.9985 + pr * 0.004, 0.08, 0.42);
      hourly.temperature_2m.push(temp);
      hourly.relative_humidity_2m.push(clamp(70 + pr * 6 - (temp - 10) * 1.5, 30, 100));
      hourly.precipitation.push(pr);
      hourly.snowfall.push(temp < 0.5 ? pr * 0.7 : 0);
      hourly.cloud_cover.push(clamp(30 + pr * 25 + 30 * Math.sin(day * 1.3), 0, 100));
      hourly.wind_speed_10m.push(8 + 10 * Math.abs(Math.sin(h * 0.05)));
      hourly.wind_direction_10m.push(300 + 40 * Math.sin(h * 0.02));
      hourly.soil_temperature_6cm.push(base + 1.5 + 1.5 * Math.sin((hr - 12) / 24 * 2 * Math.PI));
      hourly.soil_moisture_3_to_9cm.push(moist);
    }
    return { elevation: 900 + k * 40, utc_offset_seconds: 0, hourly };
  });
}

function processWeather(json, pts) {
  const first = json[0];
  const off = (first.utc_offset_seconds || 0) * 1000;
  const times = first.hourly.time.map(s => Date.parse(s + 'Z') - off);   // UTC ms
  const nH = times.length, nD = Math.floor(nH / 24);
  const P = json.map((loc, k) => {
    const h = loc.hourly;
    const get = v => Float32Array.from(h[v], x => (x == null ? NaN : x));
    const o = { x: pts[k].x, z: pts[k].z, elev: loc.elevation };
    for (const v of HOURLY) o[v] = get(v);
    // Agregats diaris.
    o.dRain = new Float32Array(nD); o.dSnow = new Float32Array(nD); o.dTmin = new Float32Array(nD);
    o.dTmean = new Float32Array(nD); o.dSoilT = new Float32Array(nD); o.dSoilM = new Float32Array(nD);
    for (let d = 0; d < nD; d++) {
      let rain = 0, snow = 0, tmin = 99, tsum = 0, st = 0, sm = 0, ns = 0, nm = 0;
      for (let i = d * 24; i < d * 24 + 24; i++) {
        rain += o.precipitation[i] || 0; snow += o.snowfall[i] || 0;
        const t = o.temperature_2m[i]; if (!isNaN(t)) { tmin = Math.min(tmin, t); tsum += t; }
        if (!isNaN(o.soil_temperature_6cm[i])) { st += o.soil_temperature_6cm[i]; ns++; }
        if (!isNaN(o.soil_moisture_3_to_9cm[i])) { sm += o.soil_moisture_3_to_9cm[i]; nm++; }
      }
      o.dRain[d] = rain; o.dSnow[d] = snow; o.dTmin[d] = tmin; o.dTmean[d] = tsum / 24;
      o.dSoilT[d] = ns ? st / ns : o.dTmean[d]; o.dSoilM[d] = nm ? sm / nm : 0.2;
    }
    return o;
  });
  // Índex de "avui" a la sèrie (hora més propera a ara).
  const now = Date.now();
  let nowIdx = 0;
  for (let i = 0; i < nH; i++) if (times[i] <= now) nowIdx = i;
  const firstShown = Math.max(0, Math.floor(nowIdx / 24) - SHOW_PAST) * 24;
  Z.weather = { P, times, nH, nD, nowIdx, firstShown, off };
}

// Variables d'un dia per a cada punt de la graella, per al model de bolets.
function dayAggregates(d) {
  return Z.weather.P.map(o => {
    // Pluja "efectiva": la de fa 2–24 dies, amb més pes cap als 8–12 dies.
    let r = 0, wsum = 0;
    for (let k = 2; k <= 24; k++) {
      const w = Math.exp(-(((k - 10) / 7) ** 2));
      wsum += w;
      if (d - k >= 0) r += o.dRain[d - k] * w;
    }
    const rainEff = r / wsum * 20;
    let rain20 = 0; for (let k = 0; k < 20; k++) if (d - k >= 0) rain20 += o.dRain[d - k];
    let st = 0, ns = 0; for (let k = 0; k < 5; k++) if (d - k >= 0) { st += o.dSoilT[d - k]; ns++; }
    const tmins = []; for (let k = 0; k < 7; k++) if (d - k >= 0) tmins.push(o.dTmin[d - k]);
    let snow10 = 0; for (let k = 0; k < 10; k++) if (d - k >= 0) snow10 += o.dSnow[d - k];
    let tm3 = 0, n3 = 0; for (let k = 0; k < 3; k++) if (d - k >= 0) { tm3 += o.dTmean[d - k]; n3++; }
    return { rainEff, rain20, soilT: st / Math.max(ns, 1), soilM: o.dSoilM[d], tmins, snow10, tmean3: tm3 / Math.max(n3, 1), elev: o.elev };
  });
}
// Interpolació bilineal sobre la graella 3×3 (per u,v dins del requadre de detall).
function gridWeights(u, v) {
  const gx = clamp((u - 0.12) / 0.38, 0, 1.999), gy = clamp((v - 0.12) / 0.38, 0, 1.999);
  const i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  return [[j * 3 + i, (1 - fx) * (1 - fy)], [j * 3 + i + 1, fx * (1 - fy)], [(j + 1) * 3 + i, (1 - fx) * fy], [(j + 1) * 3 + i + 1, fx * fy]];
}
function hourlyAt(x, z, h, v) {
  const [u, vv] = gridUV(x, z);
  let s = 0;
  for (const [k, w] of gridWeights(clamp(u), clamp(vv))) { const val = Z.weather.P[k][v][h]; s += (isNaN(val) ? 0 : val) * w; }
  return s;
}
const gridElevAt = (x, z) => { const [u, v] = gridUV(x, z); let s = 0; for (const [k, w] of gridWeights(clamp(u), clamp(v))) s += Z.weather.P[k].elev * w; return s; };

// ---------------------------------------------------------------------------
// Vegetació estimada i model de bolets
// ---------------------------------------------------------------------------
function buildVegetation() {
  const z = Z.zone;
  Z.veg = new Uint8Array(GRID * GRID);
  Z.cover = new Float32Array(GRID * GRID);
  Z.gh = new Float32Array(GRID * GRID);
  Z.north = new Float32Array(GRID * GRID);
  Z.slope = new Float32Array(GRID * GRID);
  Z.vegTree = new Uint8Array(GRID * GRID);
  Z.conType = new Uint8Array(GRID * GRID);
  Z.decType = new Uint8Array(GRID * GRID);
  Z.vegReal = new Uint8Array(GRID * GRID);
  Z.clsMain = new Uint8Array(GRID * GRID).fill(NO_COVER);
  Z.cls = null;
  const cell = Z.detSize / GRID;
  // Humitat de la zona: més fagedes cap al nord-est (Montseny, Garrotxa, Ripollès).
  const humidZone = clamp((z.lon - 1.0) / 1.5) * 0.7 + clamp((z.lat - 41.5) / 1.2) * 0.3;
  const pyrenees = smooth(42.15, 42.4, z.lat);
  const g = (h, c, w) => Math.exp(-(((h - c) / w) ** 2));
  const scores = new Float32Array(VEG.length);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const x = Z.detOrigin[0] + (i + 0.5) * cell, zz = Z.detOrigin[1] + (j + 0.5) * cell;
    const h = Math.max(hMacroCPU(x, zz), 0);
    const dx = (hMacroCPU(x + cell, zz) - hMacroCPU(x - cell, zz)) / (2 * cell);
    const dz = (hMacroCPU(x, zz + cell) - hMacroCPU(x, zz - cell)) / (2 * cell);
    const slope = Math.hypot(dx, dz);
    // Orientació: la normal apunta "cap avall"; nord és -z.
    // Una vessant obaga (cara nord) baixa cap a -z, és a dir, dh/dz > 0.
    const north = slope > 0.02 ? clamp(dz / slope, -1, 1) * Math.min(1, slope * 4) : 0;
    const south = -north;
    const k = j * GRID + i;
    Z.gh[k] = h; Z.north[k] = north; Z.slope[k] = slope;
    const n = t => sampleRepeat(noiseData, NOISE, x / 2300 + t * 0.37, zz / 2300 + t * 0.61);
    const humid = clamp(humidZone + north * 0.35 + (n(9) - 0.5) * 0.4);
    scores[VI.conreu] = h < 700 && slope < 0.12 ? 0.9 * smooth(0.45, 0.7, n(1)) : 0;
    scores[VI.alzinar] = g(h, 450, 420) * (0.75 + 0.35 * south) * (0.7 + 0.6 * n(2));
    scores[VI.pinblanc] = g(h, 350, 330) * (0.6 + 0.5 * south) * (1.1 - humid * 0.6) * (0.6 + 0.7 * n(3));
    scores[VI.roureda] = g(h, 900, 300) * (0.7 + 0.6 * n(4));
    scores[VI.fageda] = g(h, 1200, 300) * (0.15 + 1.3 * humid) * (0.6 + 0.6 * Math.max(north, 0)) * (0.7 + 0.6 * n(5));
    scores[VI.piroig] = g(h, 1400, 380) * (0.8 + 0.5 * n(6));
    scores[VI.avetosa] = g(h, 1600, 230) * (0.15 + 1.1 * Math.max(north, 0)) * (0.2 + 0.9 * pyrenees) * (0.6 + 0.7 * n(7));
    scores[VI.pinegre] = g(h, 2000, 280) * (0.15 + 0.95 * pyrenees) * (0.8 + 0.4 * n(8));
    scores[VI.prat] = g(h, 2450, 330) + (h > 2100 ? 0.35 : 0) + (h > 1500 && slope < 0.2 ? 0.25 * smooth(0.55, 0.75, n(10)) : 0);
    scores[VI.roca] = smooth(0.85, 1.25, slope) * 1.5 + smooth(2550, 2800, h);
    let best = 0, bestTree = VI.alzinar;
    for (let t = 1; t < VEG.length; t++) {
      if (scores[t] > scores[best]) best = t;
      if (VEG[t].tree && scores[t] > scores[bestTree]) bestTree = t;
    }
    Z.veg[k] = best;
    Z.vegTree[k] = bestTree;
    // El millor tipus dins de cada família, per quan el mapa de cobertes digui quina família hi ha.
    Z.conType[k] = [VI.pinblanc, VI.piroig, VI.avetosa, VI.pinegre].reduce((a, b) => scores[b] > scores[a] ? b : a);
    Z.decType[k] = scores[VI.fageda] > scores[VI.roureda] ? VI.fageda : VI.roureda;
    const isForest = VEG[best].tree != null;
    // Clarianes i densitat del bosc.
    Z.cover[k] = isForest ? clamp(scores[best] * 1.4) * smooth(0.2, 0.42, n(11)) * (1 - smooth(0.9, 1.3, slope)) : 0;
  }
}

function seasonScore(sp, date) {
  const doy = (date.getMonth()) + (date.getDate() - 1) / 31;   // mes fraccionari 0..12
  const m0 = sp.mesos[0] - 1, m1 = sp.mesos[1];                  // [inici, final)
  const inside = m0 <= m1 ? doy >= m0 && doy < m1 : doy >= m0 || doy < m1;
  if (inside) return 1;
  const dist = Math.min(wrap(m0 - doy, 12), wrap(doy - m1, 12));
  return Math.exp(-((dist / 0.7) ** 2));
}

function computeIndex(day, sp) {
  const W = Z.weather;
  const agg = dayAggregates(day);
  const date = new Date(W.times[Math.min(day * 24 + 12, W.nH - 1)]);
  const season = seasonScore(sp, date);
  const idx = new Float32Array(GRID * GRID);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const k = j * GRID + i;
    const hab = (sp.hab[VEG[Z.veg[k]].id] || 0) * Z.cover[k];
    if (hab < 0.02) continue;
    const ws = gridWeights((i + 0.5) / GRID, (j + 0.5) / GRID);
    let rainEff = 0, soilT = 0, soilM = 0, elev = 0;
    for (const [p, w] of ws) { const a = agg[p]; rainEff += a.rainEff * w; soilT += a.soilT * w; soilM += a.soilM * w; elev += a.elev * w; }
    const dh = Z.gh[k] - elev;
    const ts = soilT + LAPSE * dh;
    const [t0, t1] = sp.t;
    const tScore = smooth(t0 - 4, t0, ts) * (1 - smooth(t1, t1 + 4, ts));
    const north = Z.north[k];
    // Els obacs guarden més la humitat.
    const water = clamp(0.7 * smooth(sp.pluja * 0.35, sp.pluja, rainEff * (1 + 0.25 * north)) + 0.3 * smooth(0.1, 0.3, soilM));
    let frosts = 0;
    for (let d = 0; d < agg[0].tmins.length; d++) {
      let tm = 0; for (const [p, w] of ws) tm += agg[p].tmins[d] * w;
      if (tm + LAPSE * dh < -1.5) frosts++;
    }
    const frostF = Math.exp(-(sp.frost ? 0.15 : 0.6) * frosts);
    const slopeF = 1 - smooth(0.6, 1.0, Z.slope[k]);
    idx[k] = clamp(hab * water * tScore * frostF * season * slopeF * 1.15);
  }
  return idx;
}

// Millors llocs: màxims locals del mapa de probabilitat, separats entre ells.
function bestSpots(idx, n = 5) {
  const B = 32, bs = GRID / B, cand = [];
  for (let bj = 0; bj < B; bj++) for (let bi = 0; bi < B; bi++) {
    let m = 0, mk = -1;
    for (let j = bj * bs; j < (bj + 1) * bs; j++) for (let i = bi * bs; i < (bi + 1) * bs; i++) { const v = idx[j * GRID + i]; if (v > m) { m = v; mk = j * GRID + i; } }
    if (mk >= 0) cand.push({ v: m, k: mk });
  }
  cand.sort((a, b) => b.v - a.v);
  const cell = Z.detSize / GRID, out = [];
  for (const c of cand) {
    if (c.v < 0.2) break;
    const x = Z.detOrigin[0] + ((c.k % GRID) + 0.5) * cell, z = Z.detOrigin[1] + (Math.floor(c.k / GRID) + 0.5) * cell;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 1500)) continue;
    out.push({ x, z, v: c.v, veg: Z.veg[c.k], h: Z.gh[c.k] });
    if (out.length >= n) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Textures derivades: color del bosc (depèn de la data) i probabilitat
// ---------------------------------------------------------------------------
const vegTex = new THREE.DataTexture(new Uint8Array(GRID * GRID * 4), GRID, GRID, THREE.RGBAFormat, THREE.UnsignedByteType);
vegTex.magFilter = vegTex.minFilter = THREE.LinearFilter;
vegTex.wrapS = vegTex.wrapT = THREE.ClampToEdgeWrapping;
vegTex.colorSpace = THREE.NoColorSpace;
U.uVegTex.value = vegTex;
const indexTex = new THREE.DataTexture(new Float32Array(GRID * GRID), GRID, GRID, THREE.RedFormat, THREE.FloatType);
indexTex.magFilter = indexTex.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
indexTex.wrapS = indexTex.wrapT = THREE.ClampToEdgeWrapping;
U.uIndexTex.value = indexTex;

// Color de copa de cada bosc segons la tardor (0 = estiu, 1 = plena tardor, 2 = fulles caigudes).
function autumnPhase(date) {
  const doy = (date - new Date(date.getFullYear(), 0, 1)) / 864e5;
  if (doy < 270) return 0;
  if (doy < 315) return (doy - 270) / 45;
  if (doy < 345) return 1 + (doy - 315) / 30;
  return 2;
}
function canopyColor(v, phase, n) {
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * clamp(t));
  const id = VEG[v].id;
  switch (id) {
    case 'alzinar': return [0.07, 0.09, 0.045];
    case 'pinblanc': return [0.1, 0.12, 0.055];
    case 'roureda': return phase < 1 ? mix([0.09, 0.13, 0.04], [0.32, 0.22, 0.07], phase * (0.7 + 0.5 * n)) : mix([0.32, 0.22, 0.07], [0.2, 0.15, 0.09], phase - 1);
    case 'fageda': return phase < 1 ? mix([0.08, 0.14, 0.04], [0.48, 0.2, 0.05], phase * (0.8 + 0.4 * n)) : mix([0.48, 0.2, 0.05], [0.2, 0.15, 0.12], phase - 1);
    case 'piroig': return [0.065, 0.09, 0.05];
    case 'avetosa': return [0.035, 0.06, 0.035];
    case 'pinegre': return [0.055, 0.075, 0.045];
    default: return [0.1, 0.1, 0.06];
  }
}
function groundColor(v, phase, n) {
  switch (VEG[v].id) {
    case 'conreu': return [0.2 + 0.1 * n, 0.19 + 0.05 * n, 0.1];
    case 'prat': return [0.17 + 0.05 * n, 0.15, 0.08];
    case 'roca': return [0.2, 0.19, 0.17];
    case 'matollar': return [0.13, 0.12, 0.07];
    case 'urba': return [0.25, 0.24, 0.23];
    case 'aigua': return [0.02, 0.05, 0.08];
    default: return [0.12, 0.1, 0.07];
  }
}
function updateVegTexture(date) {
  const phase = autumnPhase(date);
  const d = vegTex.image.data;
  const cell = Z.detSize / GRID;
  for (let k = 0; k < GRID * GRID; k++) {
    const x = Z.detOrigin[0] + ((k % GRID) + 0.5) * cell, z = Z.detOrigin[1] + (Math.floor(k / GRID) + 0.5) * cell;
    const n = sampleRepeat(noiseData, NOISE, x / 900, z / 900);
    const c = Z.cover[k] > 0.05 ? canopyColor(Z.veg[k], phase, n) : groundColor(Z.veg[k], phase, n);
    const g = groundColor(Z.veg[k], phase, n);
    const cov = Z.cover[k];
    for (let ch = 0; ch < 3; ch++) d[k * 4 + ch] = Math.round(clamp(Math.sqrt(c[ch] * cov + g[ch] * (1 - cov))) * 255);
    d[k * 4 + 3] = Math.round(cov * 255);
  }
  vegTex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Ombra del relleu (raigs sobre el mapa d'alçades, a la GPU)
// ---------------------------------------------------------------------------
const passScene = new THREE.Scene();
const passCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
passQuad.frustumCulled = false;
passScene.add(passQuad);
const shadowRT = new THREE.WebGLRenderTarget(1024, 1024, { depthBuffer: false });
shadowRT.texture.minFilter = shadowRT.texture.magFilter = THREE.LinearFilter;
U.uShadowTex.value = shadowRT.texture;
const shadowMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uL: { value: new THREE.Vector3(0, 1, 0) } },
  depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec3 uL;
    varying vec2 vUv;
    ${GLSL_TERRAIN}
    float hFast(vec2 xz) {
      float hc = texture(uCtxTex, (xz - uCtxOrigin) / uCtxSize).r;
      float w = detWeight(xz);
      return max(mix(hc, texture(uDetTex, (xz - uDetOrigin) / uDetSize).r, w), 0.0);
    }
    void main() {
      if (uL.y <= 0.0) { gl_FragColor = vec4(0.0); return; }
      vec2 xz = uDetOrigin + vUv * uDetSize;
      float lh = length(uL.xz);
      vec2 dir = lh > 1e-4 ? uL.xz / lh : vec2(1.0, 0.0);
      float slope = uL.y / max(lh, 1e-4);
      float h0 = hFast(xz) + 4.0;
      float res = 1.0, t = 10.0;
      for (int i = 0; i < 110; i++) {
        float ray = h0 + t * slope;
        float hh = hFast(xz + dir * t);
        res = min(res, clamp((ray - hh) / (t * 0.03) + 0.5, 0.0, 1.0));
        if (res <= 0.0 || ray > 3400.0) break;
        t = t * 1.05 + 6.0;
        if (t > 20000.0) break;
      }
      gl_FragColor = vec4(res * res * (3.0 - 2.0 * res), 0.0, 0.0, 1.0);
    }`,
});
const lastShadowDir = new THREE.Vector3();
function updateTerrainShadow(dir) {
  if (lastShadowDir.distanceTo(dir) < 0.004) return;
  lastShadowDir.copy(dir);
  shadowMat.uniforms.uL.value.copy(dir);
  passQuad.material = shadowMat;
  renderer.setRenderTarget(shadowRT);
  renderer.render(passScene, passCam);
  renderer.setRenderTarget(null);
}

// ---------------------------------------------------------------------------
// Injecció comuna als materials de three.js: ombra del relleu i boira
// ---------------------------------------------------------------------------
function injectCommon(shader, { sway = false, snow = false } = {}) {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
      uniform float uTime; uniform vec2 uWindDir; uniform float uWindStr;
      varying vec3 vWPos; varying vec3 vLPos;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vLPos = position;
      ${sway ? `
      #ifdef USE_INSTANCING
        vec3 ip = instanceMatrix[3].xyz;
        float ph = dot(ip.xz, vec2(0.13, 0.17));
        float bend = (position.y / 10.0) * (position.y / 10.0);
        transformed.xz += uWindDir * bend * uWindStr * (0.55 + 0.45 * sin(uTime * 1.3 + ph)) * 0.25;
      #endif` : ''}`)
    .replace('#include <fog_vertex>', `
      vec4 wpos4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos4 = instanceMatrix * wpos4;
      #endif
      vWPos = (modelMatrix * wpos4).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform sampler2D uShadowTex; uniform vec2 uDetOrigin; uniform float uDetSize; uniform vec3 uAmbient;
      uniform float uSnowLine; uniform float uSnowAmt; uniform sampler2D uNoiseTex; uniform float uWet;
      varying vec3 vWPos; varying vec3 vLPos;
      ${GLSL_HASH}
      ${GLSL_SKY}
      float terrainShadowAt(vec3 wp) {
        vec2 uv = (wp.xz - uDetOrigin) / uDetSize;
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 1.0;
        return texture(uShadowTex, uv).r;
      }`)
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float tShadow = terrainShadowAt(vWPos);
      ${snow ? `
      vec3 wN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
      float sn = texture(uNoiseTex, vLPos.xz * 0.37 + vLPos.y * 0.21).r;
      float snowAmt = smoothstep(0.25, 0.6, wN.y + (sn - 0.5) * 0.6) * uSnowAmt * smoothstep(uSnowLine - 120.0, uSnowLine + 80.0, vWPos.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.88, 0.92), snowAmt);` : ''}
      diffuseColor.rgb *= 1.0 - uWet * 0.25;`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.directDiffuse *= tShadow;
      reflectedLight.directSpecular *= tShadow;`)
    .replace('#include <opaque_fragment>', `outgoingLight = applyFog(outgoingLight, vWPos);
      #include <opaque_fragment>`)
    .replace('#include <fog_fragment>', '');
}

// ---------------------------------------------------------------------------
// Terreny: clipmap
// ---------------------------------------------------------------------------
const CLIP_N = 64, CLIP_LEVELS = 10, CLIP_S0 = 1;
function gridGeometry(n) {
  const side = 2 * n + 1, pos = new Float32Array(side * side * 3), nor = new Float32Array(side * side * 3);
  let p = 0;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { pos[p] = i; pos[p + 2] = j; nor[p + 1] = 1; p += 3; }
  const idx = [];
  for (let j = 0; j < 2 * n; j++) for (let i = 0; i < 2 * n; i++) {
    const a = j * side + i, b = a + side, c = a + 1, d = b + 1;
    if ((i + j) & 1) idx.push(a, b, c, c, b, d); else idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
const TERRAIN_VERTEX = /* glsl */`
  vec2 gp = position.xz;
  vec2 wxz = gp * uScale + uOrigin;
  vec2 dd = abs(wxz - uOrigin) / uHalf;
  float morph = clamp((max(dd.x, dd.y) - 0.78) / 0.17, 0.0, 1.0);
  wxz -= mod(gp, 2.0) * uScale * morph;
  vec3 transformed = vec3(wxz.x, terrainH(wxz), wxz.y);
`;
const terrainLevels = [];
const gridGeo = gridGeometry(CLIP_N);
for (let L = 0; L < CLIP_LEVELS; L++) {
  const s = CLIP_S0 * 2 ** L;
  const lu = {
    uScale: { value: s }, uScaleF: { value: s },
    uOrigin: { value: new THREE.Vector2() }, uHalf: { value: CLIP_N * s },
    uPrevOrigin: { value: new THREE.Vector2() }, uPrevHalf: { value: L > 0 ? CLIP_N * s / 2 : -1 },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = shader => {
    injectCommon(shader);
    Object.assign(shader.uniforms, lu);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uScale; uniform vec2 uOrigin; uniform float uHalf;
        ${GLSL_TERRAIN}`)
      .replace(/#include <begin_vertex>[\s\S]*?vLPos = position;/, `${TERRAIN_VERTEX}
        vLPos = transformed;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <packing>', `#include <packing>
        uniform vec2 uPrevOrigin; uniform float uPrevHalf; uniform float uScaleF;
        uniform sampler2D uVegTex; uniform sampler2D uIndexTex; uniform float uOverlay; uniform vec3 uIdxColor;
        uniform vec3 uLightDir; uniform vec3 uLightCol; uniform float uNight;
        uniform sampler2D uDetN; uniform sampler2D uCtxN;
        uniform sampler2D uOrthoDet; uniform sampler2D uOrthoCtx; uniform float uUseOrtho;
        ${GLSL_TERRAIN.replace('uniform sampler2D uNoiseTex;', '').replace('uniform vec2 uDetOrigin;', '').replace('uniform float uDetSize;', '')}
        vec3 heatRamp(float x) {
          vec3 c = mix(vec3(1.0, 0.95, 0.63), vec3(1.0, 0.7, 0.23), smoothstep(0.15, 0.45, x));
          c = mix(c, vec3(0.94, 0.35, 0.11), smoothstep(0.45, 0.7, x));
          return mix(c, vec3(0.69, 0.06, 0.25), smoothstep(0.7, 0.95, x));
        }`)
      .replace('#include <clipping_planes_fragment>', `
        if (uPrevHalf > 0.0) { vec2 pd = abs(vWPos.xz - uPrevOrigin); if (max(pd.x, pd.y) < uPrevHalf - uScaleF * 0.6) discard; }
        #include <clipping_planes_fragment>`)
      .replace('float tShadow = terrainShadowAt(vWPos);', `float tShadow = terrainShadowAt(vWPos);
        vec2 p = vWPos.xz;
        float camDist = length(vWPos - cameraPosition);
        vec2 sl = mix(texture(uCtxN, (p - uCtxOrigin) / uCtxSize).rg, texture(uDetN, (p - uDetOrigin) / uDetSize).rg, detWeight(p));
        float e = 0.35;
        vec2 gN = vec2(hNoise(p + vec2(e, 0.0)) - hNoise(p - vec2(e, 0.0)), hNoise(p + vec2(0.0, e)) - hNoise(p - vec2(0.0, e))) / (2.0 * e);
        gN *= 1.0 - smoothstep(30.0, 300.0, camDist);
        vec3 N = normalize(vec3(-(sl.x + gN.x), 1.0, -(sl.y + gN.y)));
        float n1 = texture(uNoiseTex, p / 61.0).r, n2 = texture(uNoiseTex, p / 7.3).r, n3 = texture(uNoiseTex, p / 900.0).r;
        vec2 guv = (p - uDetOrigin) / uDetSize;
        float inDet = detWeight(p);
        vec4 vg = texture(uVegTex, guv);
        vec3 alb = vg.rgb * vg.rgb;                      // guardat amb arrel quadrada
        float forest = vg.a;
        // Fora de la zona de detall: color aproximat per altitud.
        float hh = vWPos.y;
        vec3 outCol = mix(vec3(0.07, 0.09, 0.045), vec3(0.055, 0.075, 0.045), smoothstep(800.0, 1500.0, hh));
        outCol = mix(outCol, vec3(0.17, 0.15, 0.08), smoothstep(1900.0, 2300.0, hh));
        outCol = mix(outCol, vec3(0.2, 0.19, 0.17), smoothstep(2500.0, 2800.0, hh));
        alb = mix(outCol, alb, inDet);
        forest = mix(smoothstep(2100.0, 1700.0, hh) * 0.7, forest, inDet);
        if (uUseOrtho > 0.5) {
          vec3 oc = texture(uOrthoCtx, clamp((p - uCtxOrigin) / uCtxSize, 0.0, 1.0)).rgb;
          vec3 od = texture(uOrthoDet, clamp(guv, 0.0, 1.0)).rgb;
          // La foto ja porta ombres i llum; s'aclareix una mica perquè la il·luminació no la torni a enfosquir.
          alb = mix(oc, od, inDet) * 1.15;
        }
        // Textura de copes d'arbre i de terra.
        alb *= mix(0.85 + 0.3 * n2, 0.8 + 0.6 * n2 * n1, forest);
        float steep = 1.0 - smoothstep(0.55, 0.8, N.y);
        alb = mix(alb, vec3(0.16, 0.15, 0.14) * (0.7 + 0.6 * n1), steep * 0.8);
        if (hh < 0.6) alb = vec3(0.02, 0.05, 0.08);       // mar
        // Neu per sobre de la cota de neu.
        float snow = uSnowAmt * smoothstep(uSnowLine - 100.0, uSnowLine + 100.0, hh + (n1 - 0.5) * 160.0);
        snow *= smoothstep(0.45, 0.7, N.y) * mix(1.0, 0.55, forest);
        alb = mix(alb, vec3(0.86, 0.89, 0.93), snow);
        // Capa de probabilitat de bolets.
        float idx = texture(uIndexTex, guv).r * inDet;
        // De prop s'amaga, perquè quan es camina el terra s'ha de veure natural.
        float ov = smoothstep(0.08, 0.25, idx) * uOverlay * smoothstep(80.0, 300.0, camDist);
        alb = mix(alb, heatRamp(idx) * 0.75, ov * 0.7);
        diffuseColor.rgb = alb * (1.0 - uWet * 0.3);
        roughnessFactor = mix(0.95, 0.8, snow);
        normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
        nonPerturbedNormal = normal;
        float overlayGlow = ov * smoothstep(0.2, 0.9, idx);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += heatRamp(idx) * overlayGlow * (0.04 + 0.25 * uNight) * (uAmbient + 0.2);`)
      .replace('reflectedLight.directSpecular *= tShadow;', `reflectedLight.directSpecular *= tShadow;
        reflectedLight.indirectDiffuse *= mix(1.0, 0.65, forest * 0.6 + steep * 0.3);`);
  };
  mat.customProgramCacheKey = () => 'mico-terrain';
  const mesh = new THREE.Mesh(gridGeo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.userData.lu = lu;
  scene.add(mesh);
  terrainLevels.push(mesh);
}
function updateClipmap(cx, cz) {
  let prev = null;
  for (const m of terrainLevels) {
    const lu = m.userData.lu, snap = 2 * lu.uScale.value;
    lu.uOrigin.value.set(Math.floor(cx / snap) * snap, Math.floor(cz / snap) * snap);
    if (prev) lu.uPrevOrigin.value.copy(prev);
    prev = lu.uOrigin.value;
  }
}

// ---------------------------------------------------------------------------
// Cel
// ---------------------------------------------------------------------------
const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
  uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: false,
  vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; uniform float uNight; uniform float uCloud; uniform vec2 uCloudOff;
    uniform vec3 uLightCol; uniform vec3 uAmbient; uniform vec3 uLightDir;
    varying vec3 vDir;
    ${GLSL_HASH}
    ${GLSL_SKY}
    float vnoise(vec2 x) { vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(nzHash12(i), nzHash12(i + vec2(1, 0)), u.x), mix(nzHash12(i + vec2(0, 1)), nzHash12(i + vec2(1, 1)), u.x), u.y); }
    float fbm(vec2 p) { float a = 0.0, b = 0.5; for (int i = 0; i < 6; i++) { a += b * vnoise(p); p = p * 2.03 + 17.1; b *= 0.5; } return a; }
    void main() {
      vec3 rd = normalize(vDir);
      vec3 col = skyBase(rd);
      float mu = dot(rd, uSunDir);
      col += uSunGlow * smoothstep(0.99985, 0.99995, mu) * 60.0 * (1.0 - uCloud * 0.9);
      if (uNight > 0.01 && rd.y > 0.0) {
        vec2 g = floor(vec2(atan(rd.z, rd.x) * 160.0, asin(rd.y) * 160.0));
        float s = nzHash12(g);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.996, 1.0, s) * (0.7 + 0.3 * sin(uTime * 3.0 + s * 50.0)) * uNight * 0.9 * smoothstep(0.0, 0.15, rd.y) * (1.0 - uCloud);
        float mm = dot(rd, uLightDir);
        col += vec3(0.8, 0.85, 0.95) * smoothstep(0.9997, 0.99985, mm) * uNight * 3.0 * (1.0 - uCloud * 0.9);
      }
      if (rd.y > 0.0) {
        vec2 cp = rd.xz / (rd.y + 0.06) * 1.3 + uCloudOff;
        float n = fbm(cp * 0.9);
        float cov = mix(0.78, 0.22, uCloud);
        float c = smoothstep(cov - 0.1, cov + 0.3, n);
        c = mix(c, 1.0, smoothstep(0.8, 1.0, uCloud) * 0.85);
        float thick = smoothstep(cov, cov + 0.5, fbm(cp * 0.9 + vec2(0.4, 0.2)));
        vec3 cLit = uAmbient * 1.15 + uLightCol * 0.35 * (1.0 - thick * 0.7) * (0.6 + 0.6 * pow(max(mu, 0.0), 6.0));
        float fade = smoothstep(0.0, 0.12, rd.y);
        col = mix(col, mix(cLit, uAmbient * 0.6, thick * 0.6), c * fade);
        col = mix(col, fogColorFor(rd), (1.0 - fade) * c * 0.6);
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.scale.setScalar(80000);
sky.renderOrder = -10;
sky.frustumCulled = false;
scene.add(sky);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const SH = 80;
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 1600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.06;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Arbres i bolets (instanciats al voltant de la càmera)
// ---------------------------------------------------------------------------
function mergeParts(parts) {
  const pos = [], col = [], idx = [];
  for (const { geo, color, matrix } of parts) {
    const g = geo.index ? geo : geo;
    const p = g.attributes.position, base = pos.length / 3;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      pos.push(v.x, v.y, v.z);
      const c = typeof color === 'function' ? color(v) : color;
      col.push(c[0], c[1], c[2]);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}
const M4 = (x, y, z, sx, sy, sz, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));
function lumpy(geo, amp, seed) {
  const p = geo.attributes.position, r = mulberry(seed);
  const o = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * (Math.sin(x * 3.1 + o[0]) * Math.sin(y * 2.7 + o[1]) * Math.sin(z * 3.3 + o[2]));
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return geo;
}
const BARK = [0.06, 0.04, 0.03];
// Conífera alta (pi roig, pi negre): tronc nu i capçada a dalt.
function pineGeo() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.16, 0.3, 11, 7), color: [0.12, 0.06, 0.035], matrix: M4(0, 5.5, 0, 1, 1, 1) }];
  for (let t = 0; t < 4; t++) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(1, 1), 0.18, t + 1), color: [0.075, 0.115, 0.05],
    matrix: M4(Math.sin(t * 2.1) * 0.5, 8.5 + t * 1.3, Math.cos(t * 2.1) * 0.5, 2.3 - t * 0.35, 1.3, 2.3 - t * 0.35) });
  return mergeParts(parts);
}
// Avet: con dens fins a baix.
function firGeo() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.12, 0.28, 3, 6), color: BARK, matrix: M4(0, 1.5, 0, 1, 1, 1) }];
  for (let t = 0; t < 6; t++) parts.push({ geo: new THREE.ConeGeometry(2.6 - t * 0.38, 3.2, 9), color: [0.05, 0.085, 0.05], matrix: M4(0, 2.4 + t * 1.75, 0, 1, 1, 1, t) });
  return mergeParts(parts);
}
// Pi pinyer / pi blanc: capçada ampla i aplanada.
function umbrellaGeo() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.18, 0.3, 7, 7), color: [0.1, 0.06, 0.035], matrix: M4(0, 3.5, 0, 1, 1, 1) }];
  for (let t = 0; t < 4; t++) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(1, 1), 0.2, 10 + t), color: [0.09, 0.13, 0.05],
    matrix: M4(Math.cos(t * 1.6) * 1.6, 7.2 + (t % 2) * 0.4, Math.sin(t * 1.6) * 1.6, 2.4, 1.0, 2.4) });
  return mergeParts(parts);
}
// Planifoli (alzina, roure, faig): capçada arrodonida de blocs. El color ve de la instància.
function broadGeo() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.2, 0.35, 5, 7), color: [0.3, 0.27, 0.24], matrix: M4(0, 2.5, 0, 1, 1, 1) }];
  for (let t = 0; t < 6; t++) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(1, 1), 0.25, 20 + t), color: [1, 1, 1],
    matrix: M4(Math.cos(t * 1.1) * 1.5, 5.6 + Math.sin(t * 2.3) * 1.0, Math.sin(t * 1.1) * 1.5, 2.0, 1.7, 2.0) });
  return mergeParts(parts);
}
function propMaterial(sway) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = s => injectCommon(s, { sway, snow: true });
  m.customProgramCacheKey = () => 'mico-prop' + sway;
  return m;
}
const TREES = {
  pine: new THREE.InstancedMesh(pineGeo(), propMaterial(true), 6000),
  fir: new THREE.InstancedMesh(firGeo(), propMaterial(true), 6000),
  umbrella: new THREE.InstancedMesh(umbrellaGeo(), propMaterial(true), 6000),
  broad: new THREE.InstancedMesh(broadGeo(), propMaterial(true), 8000),
};
for (const m of Object.values(TREES)) { m.frustumCulled = false; m.count = 0; m.castShadow = true; m.receiveShadow = true; scene.add(m); }

// Bolet: barret + peu. El barret pren el color de l'espècie; el peu és clar.
const capGeo = (() => { const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.55, 1); g.translate(0, 0.9, 0); return g; })();
const stemGeo = (() => { const g = new THREE.CylinderGeometry(0.28, 0.36, 1, 8); g.translate(0, 0.5, 0); return g; })();
const capMesh = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 3000);
const stemMesh = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.8 }), 3000);
for (const m of [capMesh, stemMesh]) {
  m.material.onBeforeCompile = s => injectCommon(s);
  m.material.customProgramCacheKey = () => 'mico-shroom';
  m.frustumCulled = false; m.count = 0; m.castShadow = false; m.receiveShadow = true;
  scene.add(m);
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0), tmpC = new THREE.Color();
let propCenter = { x: 1e9, z: 1e9 }, propsDirty = true;
const TREE_R = 420, TREE_CELL = 6.5, SHROOM_R = 45, SHROOM_CELL = 1.3;

function updateProps(cx, cz, date) {
  if (!propsDirty && Math.hypot(cx - propCenter.x, cz - propCenter.z) < 25) return;
  propsDirty = false;
  propCenter = { x: cx, z: cz };
  const counts = { pine: 0, fir: 0, umbrella: 0, broad: 0 };
  const phase = autumnPhase(date);
  const r = Math.ceil(TREE_R / TREE_CELL), ci = Math.floor(cx / TREE_CELL), cj = Math.floor(cz / TREE_CELL);
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    const x = (i + hash3(i, j, 1)) * TREE_CELL, z = (j + hash3(i, j, 2)) * TREE_CELL;
    if (Math.hypot(x - cx, z - cz) > TREE_R) continue;
    const k = gridCell(x, z);
    if (k < 0) continue;
    let v = Z.veg[k];
    const ci = coverClassAt(x, z);
    if (ci !== NO_COVER) {
      // Amb mapa de cobertes, l'arbre hi és si aquell punt (14 m) és bosc, amb la densitat de la classe.
      const cb = COBERTES[ci];
      if (!cb.fam || hash3(i, j, 3) > cb.dens * 0.85) continue;
      v = cb.fam === 'con' ? Z.conType[k] : cb.fam === 'dec' ? Z.decType[k] : VI.alzinar;
    } else if (!VEG[v].tree || hash3(i, j, 3) > Z.cover[k] * 0.85) continue;
    const kind = VEG[v].tree;
    const mesh = TREES[kind];
    if (counts[kind] >= mesh.instanceMatrix.count) continue;
    const s = 0.6 + hash3(i, j, 4) * 0.7;
    tmpP.set(x, heightAt(x, z) - 0.3, z);
    tmpQ.setFromAxisAngle(yAxis, hash3(i, j, 5) * Math.PI * 2);
    tmpS.set(s, s * (0.85 + hash3(i, j, 6) * 0.35), s);
    tmpM.compose(tmpP, tmpQ, tmpS);
    const n = hash3(i, j, 7);
    if (kind === 'broad') {
      const c = canopyColor(v, phase, n);
      const k2 = 2.2;   // la copa es veu més clara que la mitjana del bosc des de dalt
      tmpC.setRGB(c[0] * k2, c[1] * k2, c[2] * k2);
    } else {
      const t = 0.8 + n * 0.45;
      tmpC.setRGB(t, t, t);
    }
    mesh.setMatrixAt(counts[kind], tmpM);
    mesh.setColorAt(counts[kind], tmpC);
    counts[kind]++;
  }
  for (const [kind, m] of Object.entries(TREES)) {
    m.count = counts[kind];
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  updateShrooms(cx, cz);
}

function updateShrooms(cx, cz) {
  let n = 0;
  const sp = BOLETS[state.species];
  const col = new THREE.Color(sp.color);
  if (Z.index && mode === 'walk') {
    const r = Math.ceil(SHROOM_R / SHROOM_CELL), ci = Math.floor(cx / SHROOM_CELL), cj = Math.floor(cz / SHROOM_CELL);
    for (let j = cj - r; j <= cj + r && n < capMesh.instanceMatrix.count; j++) for (let i = ci - r; i <= ci + r; i++) {
      const x = (i + hash3(i, j, 31)) * SHROOM_CELL, z = (j + hash3(i, j, 32)) * SHROOM_CELL;
      if (Math.hypot(x - cx, z - cz) > SHROOM_R) continue;
      const [u, v] = gridUV(x, z);
      if (u < 0 || v < 0 || u > 1 || v > 1) continue;
      const idx = sampleClamp(Z.index, GRID, u, v);
      // Surten en grups: un soroll de "colònies" modula la probabilitat.
      const colony = sampleRepeat(noiseData, NOISE, x / 23 + 0.5, z / 23 + 0.2);
      if (hash3(i, j, 33) > idx * idx * 0.35 * smooth(0.45, 0.7, colony)) continue;
      const s = 0.07 + hash3(i, j, 34) * 0.08;
      tmpP.set(x, heightAt(x, z) - 0.01, z);
      tmpQ.setFromAxisAngle(yAxis, hash3(i, j, 35) * 6.28);
      tmpS.set(s, s * (0.8 + hash3(i, j, 36) * 0.5), s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      capMesh.setMatrixAt(n, tmpM); stemMesh.setMatrixAt(n, tmpM);
      tmpC.copy(col).multiplyScalar(0.8 + hash3(i, j, 37) * 0.4);
      capMesh.setColorAt(n, tmpC);
      n++;
      if (n >= capMesh.instanceMatrix.count) break;
    }
  }
  capMesh.count = stemMesh.count = n;
  capMesh.instanceMatrix.needsUpdate = stemMesh.instanceMatrix.needsUpdate = true;
  if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
  state.shroomsNear = n;
}

// ---------------------------------------------------------------------------
// Pluja i neu
// ---------------------------------------------------------------------------
const RAIN = 40000, SNOWN = 60000;
const precipU = { uBox: { value: new THREE.Vector3(80, 50, 80) }, uOffset: { value: new THREE.Vector3() }, uProj: { value: 800 }, uAmt: { value: 0 } };
function seedsGeo(n, perVertex, seed) {
  const r = mulberry(seed), a = new Float32Array(n * perVertex * 4), end = new Float32Array(n * perVertex);
  for (let i = 0; i < n; i++) {
    const s = [r(), r(), r(), r()];
    for (let v = 0; v < perVertex; v++) { a.set(s, (i * perVertex + v) * 4); end[i * perVertex + v] = v; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * perVertex * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(a, 4));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  return g;
}
const PRECIP_FS = /* glsl */`
  uniform vec3 uLightCol; uniform vec3 uAmbient;
  varying float vAlpha; varying vec3 vW;
  ${GLSL_SKY}
  void main() {
    float a = vAlpha;
    #ifdef SNOWFLAKE
      a *= smoothstep(0.5, 0.12, length(gl_PointCoord - 0.5));
    #endif
    if (a < 0.004) discard;
    vec3 col = 0.9 * (uAmbient * 0.42 + uLightCol * 0.25);
    gl_FragColor = vec4(applyFog(col, vW), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const PRECIP_VS_HEAD = /* glsl */`
  attribute vec4 aSeed; attribute float aEnd;
  uniform vec3 uBox; uniform vec3 uOffset; uniform float uProj; uniform float uTime; uniform float uAmt;
  varying float vAlpha; varying vec3 vW;
  vec3 basePos(float speedK) {
    float r = aSeed.w;
    vec3 p = aSeed.xyz * uBox + uOffset * vec3(1.0, speedK * (0.8 + 0.4 * r), 1.0);
    return mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5 + cameraPosition;
  }`;
const rainMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...precipU, uVel: { value: new THREE.Vector3(0, -9, 0) } },
  transparent: true, depthWrite: false,
  vertexShader: /* glsl */`${PRECIP_VS_HEAD}
    uniform vec3 uVel;
    void main() {
      vec3 p = basePos(1.0);
      p -= normalize(uVel) * aEnd * (0.35 + 0.25 * aSeed.w);  // gota estirada en la direcció de caiguda
      vW = p;
      vec4 mv = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float horiz = length(p.xz - cameraPosition.xz);
      vAlpha = 0.28 * step(aSeed.w * 0.999, uAmt) * smoothstep(0.5, 2.0, -mv.z) * (1.0 - smoothstep(uBox.x * 0.3, uBox.x * 0.5, horiz));
    }`,
  fragmentShader: PRECIP_FS,
});
const rain = new THREE.LineSegments(seedsGeo(RAIN, 2, 7), rainMat);
const snowMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...precipU },
  defines: { SNOWFLAKE: 1 },
  transparent: true, depthWrite: false,
  vertexShader: /* glsl */`${PRECIP_VS_HEAD}
    void main() {
      vec3 p = basePos(0.12);
      float w = uTime * (0.6 + aSeed.w * 1.2) + aSeed.w * 40.0;
      p.x += sin(w) * 0.5; p.z += cos(w * 0.8) * 0.5;
      vW = p;
      vec4 mv = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float px = (0.015 + 0.02 * aSeed.w * aSeed.w) * uProj / max(-mv.z, 0.05);
      gl_PointSize = clamp(px, 1.2, 40.0);
      float horiz = length(p.xz - cameraPosition.xz);
      vAlpha = step(aSeed.w * 0.999, uAmt) * clamp(px / 1.2, 0.0, 1.0) * smoothstep(0.3, 1.0, -mv.z) * (1.0 - smoothstep(uBox.x * 0.3, uBox.x * 0.5, horiz));
    }`,
  fragmentShader: PRECIP_FS,
});
const snowfall = new THREE.Points(seedsGeo(SNOWN, 1, 8), snowMat);
for (const m of [rain, snowfall]) { m.frustumCulled = false; m.renderOrder = 5; scene.add(m); }

// ---------------------------------------------------------------------------
// Sol: posició astronòmica real
// ---------------------------------------------------------------------------
function sunDirection(ms, lat, lon) {
  const rad = Math.PI / 180, d = (ms - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = wrap(18.697374558 + 24.06570982441908 * d, 24);
  const H = (gmst * 15 + lon) * rad - ra, la = lat * rad;
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(H));   // des del nord, cap a l'est
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

// ---------------------------------------------------------------------------
// Il·luminació i temps per a l'hora actual
// ---------------------------------------------------------------------------
const C = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const lerpC = (a, b, t) => a.clone().lerp(b, clamp(t));
const wx = { temp: 10, rh: 70, pr: 0, snow: 0, cloud: 30, wind: 5, wdir: 0, soilT: 10, soilM: 0.2 };

function updateWeatherAndLight(dt) {
  const W = Z.weather, h = Math.round(state.t);
  const x = camera.position.x, z = camera.position.z;
  for (const [key, v] of [['temp', 'temperature_2m'], ['rh', 'relative_humidity_2m'], ['pr', 'precipitation'], ['snow', 'snowfall'],
    ['cloud', 'cloud_cover'], ['wind', 'wind_speed_10m'], ['soilT', 'soil_temperature_6cm'], ['soilM', 'soil_moisture_3_to_9cm']]) wx[key] = hourlyAt(x, z, h, v);
  wx.wdir = Z.weather.P[4].wind_direction_10m[h] || 0;
  const gElev = gridElevAt(x, z);
  const tCam = wx.temp + LAPSE * (camera.position.y - gElev);

  const ms = W.times[0] + state.t * 36e5;
  const sunDir = sunDirection(ms, Z.zone.lat, Z.zone.lon);
  U.uSunDir.value.copy(sunDir);
  const day = smooth(-0.1, 0.25, sunDir.y);
  const golden = Math.max(0, 1 - Math.abs(sunDir.y - 0.05) / 0.2);
  const night = 1 - smooth(-0.2, 0.0, sunDir.y);
  const precipOvercast = smooth(0.0, 1.5, wx.pr);
  const cloud = clamp(Math.max(wx.cloud / 100, precipOvercast));
  const overcast = smooth(0.4, 1.0, cloud);

  const sunCol = lerpC(C(1.0, 0.95, 0.88), C(1.0, 0.5, 0.24), golden).multiplyScalar(smooth(-0.04, 0.1, sunDir.y) * 3.2);
  let zen = lerpC(C(0.004, 0.007, 0.018), C(0.09, 0.2, 0.5), day);
  let hor = lerpC(C(0.012, 0.018, 0.035), C(0.5, 0.62, 0.78), day);
  hor = lerpC(hor, C(0.85, 0.5, 0.35), golden * 0.55);
  zen = lerpC(zen, C(0.18, 0.2, 0.36), golden * 0.35);
  const glow = lerpC(C(1.0, 0.9, 0.75), C(1.0, 0.45, 0.2), golden).multiplyScalar(day * (1 - overcast * 0.8) * 1.6);
  const grey = (hor.r + hor.g + hor.b) / 3 * 0.85 + (zen.r + zen.g + zen.b) / 3 * 0.15;
  zen = lerpC(zen, C(grey * 0.92, grey * 0.96, grey * 1.04), overcast * 0.9);
  hor = lerpC(hor, C(grey, grey * 1.02, grey * 1.06), overcast * 0.85);
  const moonDir = new THREE.Vector3(-sunDir.x, Math.max(0.45, -sunDir.y), -sunDir.z).normalize();
  const useMoon = sunDir.y < -0.02;
  const lightDir = useMoon ? moonDir : sunDir;
  const lightCol = useMoon ? C(0.32, 0.4, 0.62).multiplyScalar(0.5 * night) : sunCol.clone();
  lightCol.multiplyScalar(1 - overcast * 0.8);
  if (useMoon) { zen.add(C(0.006, 0.01, 0.022).multiplyScalar(night)); hor.add(C(0.01, 0.014, 0.028).multiplyScalar(night)); }
  const amb = lerpC(zen, hor, 0.55).multiplyScalar(1.6);
  U.uZenith.value.copy(zen); U.uHorizon.value.copy(hor); U.uSunGlow.value.copy(glow);
  U.uLightDir.value.copy(lightDir); U.uLightCol.value.copy(lightCol); U.uAmbient.value.copy(amb);
  U.uNight.value = night; U.uCloud.value = cloud;
  sun.color.copy(lightCol);
  hemi.color.copy(amb).multiplyScalar(1.05);
  hemi.groundColor.copy(amb).multiplyScalar(0.5);
  renderer.toneMappingExposure = useMoon ? 1.9 : 1.0;
  updateTerrainShadow(lightDir);

  // Boira: humitat alta i poc vent → boira de vall; la pluja i la neu treuen visibilitat.
  const fogK = smooth(88, 100, wx.rh) * (1 - smooth(10, 30, wx.wind));
  U.uFogDensity.value = fogK * 0.012;
  U.uFogBase.value = gElev - 150;
  U.uFogFalloff.value = 1 / 160;
  U.uHaze.value = 1 / 70000 + smooth(0, 4, wx.pr) / 5000 + fogK / 15000;
  U.uWet.value = clamp(precipOvercast + smooth(0.28, 0.4, wx.soilM) * 0.5);

  // Vent.
  const wd = (wx.wdir + 180) * Math.PI / 180;   // la direcció és d'on bufa
  const ws = wx.wind / 3.6;
  U.uWindDir.value.set(Math.sin(wd), -Math.cos(wd));
  U.uWindStr.value = clamp(ws / 12, 0, 1.5);
  U.uCloudOff.value.x += Math.sin(wd) * ws * dt * 0.00015; U.uCloudOff.value.y -= Math.cos(wd) * ws * dt * 0.00015;

  // Precipitació: neu si fa fred a l'altura de la càmera.
  const isSnow = tCam < 0.8 || (wx.snow > 0.05 && tCam < 2);
  const amt = clamp(Math.sqrt(wx.pr / 6));
  const fall = isSnow ? 1.1 : 9;
  precipU.uOffset.value.x += Math.sin(wd) * ws * dt;
  precipU.uOffset.value.z -= Math.cos(wd) * ws * dt;
  precipU.uOffset.value.y -= fall * dt;
  for (const k of ['x', 'y', 'z']) precipU.uOffset.value[k] %= 80000;
  rainMat.uniforms.uVel.value.set(Math.sin(wd) * ws, -fall, -Math.cos(wd) * ws);
  precipU.uAmt.value = amt;
  rain.visible = !isSnow && amt > 0.01;
  snowfall.visible = isSnow && amt > 0.01;
  precipU.uProj.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  audio.update(amt, isSnow, ws);
}

// ---------------------------------------------------------------------------
// So (opcional): vent i pluja amb soroll filtrat
// ---------------------------------------------------------------------------
const audio = {
  ctx: null, on: false,
  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = this.ctx = new Ctx();
    const noise = (brown) => {
      const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
    };
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'lowpass'; this.windF.frequency.value = 400;
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    noise(true).connect(this.windF).connect(this.windG).connect(this.master);
    this.rainF = ctx.createBiquadFilter(); this.rainF.type = 'bandpass'; this.rainF.frequency.value = 2500; this.rainF.Q.value = 0.4;
    this.rainG = ctx.createGain(); this.rainG.gain.value = 0;
    noise(false).connect(this.rainF).connect(this.rainG).connect(this.master);
    // Ocells de dia, molt suaus: piulades curtes a l'atzar.
    this.birds = setInterval(() => {
      if (!this.on || U.uNight.value > 0.5 || precipU.uAmt.value > 0.2 || Math.random() < 0.5) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime, f = 2500 + Math.random() * 2500;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (0.7 + Math.random() * 0.6), t + 0.12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.2);
    }, 700);
  },
  update(amt, isSnow, ws) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, k = this.on ? 1 : 0;
    this.windG.gain.setTargetAtTime(k * (0.04 + clamp(ws / 15) * 0.5), t, 0.5);
    this.windF.frequency.setTargetAtTime(200 + ws * 60, t, 0.5);
    this.rainG.gain.setTargetAtTime(k * (isSnow ? 0 : amt * 0.25), t, 0.5);
  },
};
$('sound').addEventListener('click', e => {
  audio.start();
  audio.on = !audio.on;
  if (audio.ctx) audio.ctx.resume();
  e.target.textContent = audio.on ? 'So: sí' : 'So: no';
});

// ---------------------------------------------------------------------------
// Estat, interfície i línia de temps
// ---------------------------------------------------------------------------
const state = { zone: 0, species: 0, t: 0, day: -1, playing: false, shroomsNear: 0, spots: [] };
let mode = 'fly';

$('zone').innerHTML = ZONES.map((z, i) => `<option value="${i}">${z.nom}</option>`).join('');
$('species').innerHTML = BOLETS.map((b, i) => `<option value="${i}">${b.nom}</option>`).join('');
function showSpeciesInfo() {
  const b = BOLETS[state.species];
  const mesos = ['gen', 'febr', 'març', 'abr', 'maig', 'juny', 'jul', 'ag', 'set', 'oct', 'nov', 'des'];
  const habs = Object.entries(b.hab).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k]) => VEG[VI[k]].nom.toLowerCase());
  $('speciesInfo').innerHTML = `<span class="bolet"><span class="dot" style="background:${b.color}"></span><i>${b.llati}</i></span>
    ${habs.join(', ')} · sòl a ${b.t[0]}–${b.t[1]} °C · ${mesos[b.mesos[0] - 1]}–${mesos[(b.mesos[1] + 11) % 12]}`;
  U.uIdxColor.value.set(b.color);
}
$('species').addEventListener('change', e => { state.species = +e.target.value; showSpeciesInfo(); refreshDay(true); });
$('zone').addEventListener('change', e => { state.zone = +e.target.value; loadZone(ZONES[state.zone]); });
let terrainStyle = 'orto';
function setTerrainStyle(st) {
  if (st === 'orto' && !Z.hasOrtho) st = 'est';
  U.uUseOrtho.value = st === 'orto' ? 1 : 0;
  $('styleOrto').classList.toggle('on', st === 'orto');
  $('styleEst').classList.toggle('on', st !== 'orto');
}
$('styleOrto').addEventListener('click', () => { terrainStyle = 'orto'; setTerrainStyle('orto'); });
$('styleEst').addEventListener('click', () => { terrainStyle = 'est'; setTerrainStyle('est'); });
$('overlay').addEventListener('change', e => { U.uOverlay.value = e.target.checked ? 1 : 0; buildMinimapBase(); });
$('toggleSide').addEventListener('click', e => { $('side').classList.toggle('collapsed'); e.target.textContent = $('side').classList.contains('collapsed') ? '+' : '−'; });

const timeInput = $('time');
timeInput.addEventListener('input', () => { state.t = +timeInput.value; state.playing = false; $('play').textContent = '▶ Reproduir'; });
$('play').addEventListener('click', () => {
  state.playing = !state.playing;
  if (state.playing && state.t >= +timeInput.max - 1) state.t = +timeInput.min;
  $('play').textContent = state.playing ? '❚❚ Pausa' : '▶ Reproduir';
});
$('today').addEventListener('click', () => { state.t = Z.weather.nowIdx; timeInput.value = state.t; });

const fmtDate = new Intl.DateTimeFormat('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const fmtDay = new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const fmtNum = (v, d = 0) => v.toLocaleString('ca-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function refreshDay(force = false) {
  const day = Math.floor(state.t / 24);
  if (!force && day === state.day) return;
  state.day = day;
  const W = Z.weather;
  const date = new Date(W.times[Math.min(day * 24 + 12, W.nH - 1)]);
  updateVegTexture(date);
  Z.index = computeIndex(day, BOLETS[state.species]);
  indexTex.image.data.set(Z.index);
  indexTex.needsUpdate = true;
  // Cota de neu: si ha nevat els darrers dies, a l'altura on la mitjana de 3 dies és 0 °C.
  const agg = dayAggregates(day)[4];
  U.uSnowAmt.value = smooth(0.2, 3, agg.snow10);
  U.uSnowLine.value = agg.elev + (agg.tmean3 - 0.5) / -LAPSE;
  state.spots = bestSpots(Z.index);
  renderSpots();
  buildMinimapBase();
  propsDirty = true;
  drawChart();
}

function renderSpots() {
  const sp = BOLETS[state.species];
  $('spots').innerHTML = state.spots.length
    ? state.spots.map((s, i) => `<li data-i="${i}"><span>${i + 1}. ${VEG[s.veg].nom}, ${fmtNum(s.h)} m</span><b>${Math.round(s.v * 100)}%</b></li>`).join('')
    : `<li class="muted">Avui no hi ha llocs amb bones condicions per al ${sp.nom.toLowerCase()}.</li>`;
  $('spots').querySelectorAll('li[data-i]').forEach(li => li.addEventListener('click', () => goToSpot(state.spots[+li.dataset.i])));
  // Etiquetes 3D.
  const box = $('labels');
  box.innerHTML = '';
  state.spots.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML = `<span class="dot" style="background:${sp.color};margin-right:5px;vertical-align:-1px"></span>${i + 1} · ${Math.round(s.v * 100)}%`;
    el.addEventListener('click', () => goToSpot(s));
    box.appendChild(el);
    s.el = el;
    s.y = heightAt(s.x, s.z);
  });
}
const proj = new THREE.Vector3();
function updateLabels() {
  for (const s of state.spots) {
    proj.set(s.x, s.y + 60, s.z).project(camera);
    const d = Math.hypot(s.x - camera.position.x, s.z - camera.position.z);
    const visible = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1 && d > 120;
    s.el.style.display = visible ? '' : 'none';
    if (visible) { s.el.style.left = ((proj.x + 1) / 2 * innerWidth) + 'px'; s.el.style.top = ((1 - proj.y) / 2 * innerHeight) + 'px'; }
  }
}

function verdict(v) {
  if (v >= 0.65) return ['Molt bones condicions', '#ff8a4a'];
  if (v >= 0.4) return ['Bones condicions', '#ffb84a'];
  if (v >= 0.2) return ['Condicions justes', '#e6d27a'];
  if (v > 0.05) return ['Poc probable', '#a9b3a2'];
  return ['Gairebé impossible', '#7d8578'];
}
function updateInfo() {
  const W = Z.weather, x = player.x, z = player.z;
  const k = gridCell(x, z);
  const ms = W.times[0] + Math.round(state.t) * 36e5;
  $('date').textContent = fmtDate.format(new Date(ms));
  const dd = Math.floor(state.t / 24) - Math.floor(W.nowIdx / 24);
  $('rel').textContent = (dd === 0 ? 'avui' : dd < 0 ? `fa ${-dd} ${dd === -1 ? 'dia' : 'dies'}` : `previsió, d'aquí a ${dd} ${dd === 1 ? 'dia' : 'dies'}`)
    + (Z.sampleWeather ? ' · DADES D\'EXEMPLE' : '');
  const sp = BOLETS[state.species];
  if (k < 0) {
    $('here').textContent = 'Fora de la zona d\'anàlisi';
    $('hereIdx').textContent = '—'; $('hereVerdict').textContent = '';
  } else {
    const [u, v] = gridUV(x, z);
    const idx = sampleClamp(Z.index, GRID, u, v);
    const [txt, col] = verdict(idx);
    $('here').textContent = `${sp.nom} · ${VEG[Z.veg[k]].nom}`;
    $('hereIdx').textContent = `${Math.round(idx * 100)}%`;
    $('hereIdx').style.color = col;
    $('hereVerdict').textContent = txt + (mode === 'walk' && state.shroomsNear ? ` · ${state.shroomsNear} bolets a prop` : '');
  }
  const [u, v] = gridUV(x, z);
  const agg = dayAggregates(Math.floor(state.t / 24));
  let rain20 = 0, soilT = 0, soilM = 0, elev = 0, frosts = 0;
  const ws = gridWeights(clamp(u), clamp(v));
  for (const [p, w] of ws) { rain20 += agg[p].rain20 * w; soilT += agg[p].soilT * w; soilM += agg[p].soilM * w; elev += agg[p].elev * w; }
  const h = heightAt(x, z);
  for (let d = 0; d < agg[0].tmins.length; d++) { let tm = 0; for (const [p, w] of ws) tm += agg[p].tmins[d] * w; if (tm + LAPSE * (h - elev) < -1.5) frosts++; }
  const tHere = wx.temp + LAPSE * (h - gridElevAt(x, z));
  const sky = wx.pr > 0.1 ? (tHere < 0.8 ? 'neva' : 'plou') : wx.rh > 96 ? 'boira' : wx.cloud > 75 ? 'ennuvolat' : wx.cloud > 35 ? 'núvols i clarianes' : 'serè';
  $('wNow').textContent = `${fmtNum(tHere)} °C · ${sky}`;
  $('wRain').textContent = `${fmtNum(rain20)} mm`;
  $('wSoilT').textContent = `${fmtNum(soilT + LAPSE * (h - elev), 1)} °C`;
  $('wSoilM').textContent = `${fmtNum(soilM * 100)} %`;
  $('wFrost').textContent = String(frosts);
  $('wAlt').textContent = `${fmtNum(h)} m`;
  const ci = coverClassAt(x, z);
  $('wCover').textContent = ci !== NO_COVER ? `${COBERTES[ci].nom} (ICGC 2024)` : Z.hasOrtho && k >= 0 ? 'segons l\'ortofoto' : 'estimada';
  const [lat, lon] = worldToLatLon(x, z);
  $('wPos').textContent = `${lat.toFixed(4).replace('.', ',')}° N, ${Math.abs(lon).toFixed(4).replace('.', ',')}° ${lon >= 0 ? 'E' : 'O'}`;
  $('gmaps').href = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;
  $('wNear').textContent = nearestPlaceText(x, z);
}

// Gràfic: pluja diària (barres) i temperatura del sòl (línia), amb el dia actual marcat.
const chart = $('chart');
function drawChart() {
  if (!Z.weather) return;
  const W = Z.weather, dpr = window.devicePixelRatio || 1;
  const w = chart.clientWidth, h = chart.clientHeight;
  chart.width = w * dpr; chart.height = h * dpr;
  const g = chart.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  const d0 = W.firstShown / 24, d1 = W.nD, n = d1 - d0;
  const P = W.P[4];
  const bw = w / n;
  let maxR = 10; for (let d = d0; d < d1; d++) maxR = Math.max(maxR, P.dRain[d]);
  const todayD = Math.floor(W.nowIdx / 24);
  g.fillStyle = 'rgba(255,255,255,.05)';
  g.fillRect((todayD + 1 - d0) * bw, 0, (d1 - todayD - 1) * bw, h);
  for (let d = d0; d < d1; d++) {
    const r = P.dRain[d], bh = r / maxR * (h - 14);
    g.fillStyle = d > todayD ? 'rgba(120,170,230,.45)' : 'rgba(120,170,230,.85)';
    g.fillRect((d - d0) * bw + 1, h - 12 - bh, Math.max(1, bw - 2), bh);
  }
  g.strokeStyle = 'rgba(240,176,74,.9)'; g.lineWidth = 1.5; g.beginPath();
  let tmin = 99, tmax = -99; for (let d = d0; d < d1; d++) { tmin = Math.min(tmin, P.dSoilT[d]); tmax = Math.max(tmax, P.dSoilT[d]); }
  for (let d = d0; d < d1; d++) {
    const y = h - 14 - (P.dSoilT[d] - tmin) / Math.max(1, tmax - tmin) * (h - 22);
    const x = (d - d0 + 0.5) * bw;
    d === d0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '10px ui-monospace, monospace';
  for (let d = d0; d < d1; d += Math.max(1, Math.round(n / 8))) g.fillText(fmtDay.format(new Date(W.times[d * 24 + 12])), (d - d0) * bw + 2, h - 1);
  g.fillText(`pluja (fins a ${fmtNum(maxR)} mm/dia)`, 4, 10);
  g.fillStyle = 'rgba(240,176,74,.9)'; g.fillText('temperatura del sòl', 4 + g.measureText(`pluja (fins a ${fmtNum(maxR)} mm/dia)`).width + 12, 10);
  const xs = (state.t / 24 - d0) * bw;
  g.fillStyle = '#fff'; g.fillRect(xs - 1, 12, 2, h - 24);
}
chart.addEventListener('click', e => {
  const W = Z.weather, r = chart.getBoundingClientRect();
  const d0 = W.firstShown / 24, n = W.nD - d0;
  state.t = clamp(Math.round(((e.clientX - r.left) / r.width * n + d0) * 24 - 12), +timeInput.min, +timeInput.max);
  timeInput.value = state.t;
});

// ---------------------------------------------------------------------------
// Orientació: noms de llocs (OpenStreetMap), minimapa i brúixola
// ---------------------------------------------------------------------------
const PLACE_KINDS = {
  peak:    { maxDist: 26000, prio: 3 },
  town:    { maxDist: 26000, prio: 4 },
  village: { maxDist: 12000, prio: 2 },
  hamlet:  { maxDist: 3500,  prio: 1 },
  hut:     { maxDist: 5000,  prio: 1 },
  saddle:  { maxDist: 4000,  prio: 0 },
};

// Cims, pobles i refugis de la zona amb l'API d'Overpass. Es desa al navegador per no repetir la consulta.
async function loadPlaces(zone, token) {
  const pad = 0.3 * Z.detSize;
  const [n, w] = worldToLatLon(Z.detOrigin[0] - pad, Z.detOrigin[1] - pad);
  const [sLat, e] = worldToLatLon(Z.detOrigin[0] + Z.detSize + pad, Z.detOrigin[1] + Z.detSize + pad);
  const bbox = `${sLat.toFixed(4)},${w.toFixed(4)},${n.toFixed(4)},${e.toFixed(4)}`;
  const key = 'micoclima-llocs-v1-' + zone.id;
  let elements = null;
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 30 * 864e5) elements = c.el; } catch (e) { /* sense emmagatzematge */ }
  if (!elements && !qs.has('offline')) {
    const q = `[out:json][timeout:25];(
      node["natural"="peak"]["name"](${bbox});
      node["place"~"^(town|village|hamlet)$"]["name"](${bbox});
      node["tourism"="alpine_hut"]["name"](${bbox});
      node["natural"="saddle"]["name"](${bbox});
    );out body;`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctrl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      elements = (await r.json()).elements || [];
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), el: elements })); } catch (e) { /* ple o bloquejat */ }
    } catch (e) {
      console.warn('Overpass no disponible:', e);
      elements = null;
    }
  }
  if (token !== loadToken) return;
  const places = [];
  for (const el of elements || []) {
    const t = el.tags || {};
    const kind = t.natural === 'peak' ? 'peak' : t.natural === 'saddle' ? 'saddle' : t.tourism === 'alpine_hut' ? 'hut' : t.place;
    if (!PLACE_KINDS[kind]) continue;
    const [x, z] = latLonToWorld(el.lat, el.lon);
    const ele = parseFloat(String(t.ele || '').replace(',', '.'));
    places.push({ name: t['name:ca'] || t.name, kind, x, z, ele: isFinite(ele) ? ele : null });
  }
  // Sense noms (sense connexió): els cims més destacats que es veuen al relleu.
  if (!places.some(p => p.kind === 'peak')) places.push(...autoPeaks());
  // Els cims amb nom primer, de més alt a més baix; així en tenim pocs i importants.
  places.sort((a, b) => PLACE_KINDS[b.kind].prio - PLACE_KINDS[a.kind].prio || (b.ele || 0) - (a.ele || 0));
  Z.places = places.slice(0, 160);
  renderPlaceLabels();
}

function autoPeaks() {
  const out = [], cell = Z.detSize / GRID, R = 14;
  for (let j = R; j < GRID - R; j += 2) for (let i = R; i < GRID - R; i += 2) {
    const h = Z.gh[j * GRID + i];
    let top = true, low = h;
    for (let dj = -R; dj <= R && top; dj += 2) for (let di = -R; di <= R; di += 2) {
      const v = Z.gh[(j + dj) * GRID + i + di];
      if (v > h) { top = false; break; }
      low = Math.min(low, v);
    }
    if (top && h - low > 150) out.push({ name: null, kind: 'peak', x: Z.detOrigin[0] + (i + 0.5) * cell, z: Z.detOrigin[1] + (j + 0.5) * cell, ele: Math.round(h) });
  }
  return out.sort((a, b) => b.ele - a.ele).slice(0, 12);
}

function renderPlaceLabels() {
  const box = $('places');
  box.innerHTML = '';
  for (const p of Z.places) {
    const el = document.createElement('div');
    el.className = 'place ' + p.kind;
    const icon = p.kind === 'peak' ? '▲ ' : p.kind === 'hut' ? '⌂ ' : p.kind === 'saddle' ? '◇ ' : '';
    const ele = p.ele != null ? `${fmtNum(p.ele)} m` : '';
    el.innerHTML = p.name ? `${icon}${p.name}${ele && p.kind !== 'town' && p.kind !== 'village' && p.kind !== 'hamlet' ? `<small>${ele}</small>` : ''}` : `${icon}${ele}`;
    el.style.display = 'none';
    box.appendChild(el);
    p.el = el;
    p.y = heightAt(p.x, p.z);
    p.visible = false;
  }
  occlT = 0;
}

// Cada pocs fotogrames es comprova quins noms tapa el relleu; la posició a la pantalla s'actualitza sempre.
let occlT = 0;
const placeProj = new THREE.Vector3();
function updatePlaceLabels(now) {
  if (!Z.places.length) return;
  const cam = camera.position;
  if (now - occlT > 300) {
    occlT = now;
    for (const p of Z.places) {
      const d = Math.hypot(p.x - cam.x, p.z - cam.z);
      p.visible = d < PLACE_KINDS[p.kind].maxDist && d > 30;
      if (!p.visible) continue;
      // Línia de visió: si el terreny talla el raig, no es mostra.
      const ty = p.y + 12, steps = 28;
      for (let k = 1; k < steps; k++) {
        const t = k / steps, x = cam.x + (p.x - cam.x) * t, z = cam.z + (p.z - cam.z) * t, y = cam.y + (ty - cam.y) * t;
        if (heightAt(x, z) > y + 3) { p.visible = false; break; }
      }
    }
  }
  const boxes = [];
  for (const p of Z.places) {
    let show = p.visible;
    if (show) {
      placeProj.set(p.x, p.y + 12, p.z).project(camera);
      show = placeProj.z < 1 && Math.abs(placeProj.x) < 1.05 && Math.abs(placeProj.y) < 1.05;
    }
    if (show) {
      const sx = (placeProj.x + 1) / 2 * innerWidth, sy = (1 - placeProj.y) / 2 * innerHeight;
      // Sense solapaments: els de més prioritat (que van primer) guanyen.
      const w = ((p.name || '').length + 4) * 6.6, r = { l: sx - w / 2, r: sx + w / 2, t: sy - 30, b: sy };
      if (boxes.some(o => r.l < o.r && r.r > o.l && r.t < o.b && r.b > o.t)) show = false;
      else { boxes.push(r); p.el.style.left = sx + 'px'; p.el.style.top = sy + 'px'; }
    }
    p.el.style.display = show ? '' : 'none';
  }
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
function dirName(dx, dz) { return DIRS[Math.round(wrap(Math.atan2(dx, -dz), Math.PI * 2) / (Math.PI / 4)) % 8]; }
function nearestPlaceText(x, z) {
  let best = null, bd = Infinity;
  for (const p of Z.places) {
    if (!p.name || !['town', 'village', 'hamlet', 'hut'].includes(p.kind)) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return '—';
  if (bd < 250) return best.name;
  return `${best.name} (${bd < 1000 ? fmtNum(Math.round(bd / 10) * 10) + ' m' : fmtNum(bd / 1000, 1) + ' km'} al ${dirName(best.x - x, best.z - z)})`;
}

// Minimapa: relleu ombrejat, bosc i probabilitat; s'actualitza quan canvia el dia o el bolet.
const minimap = $('minimap');
const mmBase = document.createElement('canvas');
mmBase.width = mmBase.height = GRID;
const mmHeat = document.createElement('canvas');
mmHeat.width = mmHeat.height = GRID;
let mmMode = 'topo', mmZoom = 14;
const topoCache = new Map();
const TOPO_URL = (z, x, y) => `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/MON3857NW/${z}/${x}/${y}.png`;
function topoTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  let t = topoCache.get(key);
  if (!t) {
    t = { img: new Image(), ok: false };
    t.img.crossOrigin = 'anonymous';
    t.img.onload = () => { t.ok = true; };
    t.img.src = TOPO_URL(z, x, y);
    topoCache.set(key, t);
    if (topoCache.size > 300) topoCache.delete(topoCache.keys().next().value);
  }
  return t;
}
function setMinimapMode(m) {
  mmMode = m;
  $('mmTopo').classList.toggle('on', m === 'topo');
  $('mmZone').classList.toggle('on', m === 'zone');
  $('mmIn').disabled = $('mmOut').disabled = m !== 'topo';
  lastScale = '';
}
$('mmTopo').addEventListener('click', () => setMinimapMode('topo'));
$('mmZone').addEventListener('click', () => setMinimapMode('zone'));
$('mmIn').addEventListener('click', () => { mmZoom = Math.min(16, mmZoom + 1); lastScale = ''; });
$('mmOut').addEventListener('click', () => { mmZoom = Math.max(11, mmZoom - 1); lastScale = ''; });
let lastScale = '';
function setScale(metersPerPx) {
  const km = [0.25, 0.5, 1, 2, 5, 10].find(k => k * 1000 / metersPerPx > 40) || 10;
  const txt = `${Math.round(km * 1000 / metersPerPx)}|${km}`;
  if (txt === lastScale) return;
  lastScale = txt;
  $('scale').innerHTML = `<span style="display:inline-block;width:${Math.round(km * 1000 / metersPerPx)}px;border-bottom:2px solid #ccc;margin-right:4px;vertical-align:middle"></span>${km < 1 ? km * 1000 + ' m' : km + ' km'}`;
}
function buildMinimapBase() {
  const g = mmBase.getContext('2d'), img = g.createImageData(GRID, GRID), d = img.data;
  const cell = Z.detSize / GRID, vd = vegTex.image.data;
  const ramp = x => {
    const m = (a, b, t) => a.map((v, i) => v + (b[i] - v) * clamp(t));
    let c = m([255, 242, 160], [255, 179, 58], smooth(0.15, 0.45, x));
    c = m(c, [240, 90, 28], smooth(0.45, 0.7, x));
    return m(c, [176, 16, 63], smooth(0.7, 0.95, x));
  };
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const k = j * GRID + i;
    const hL = Z.gh[j * GRID + Math.max(i - 1, 0)], hR = Z.gh[j * GRID + Math.min(i + 1, GRID - 1)];
    const hU = Z.gh[Math.max(j - 1, 0) * GRID + i], hD = Z.gh[Math.min(j + 1, GRID - 1) * GRID + i];
    // Llum des del nord-oest, com als mapes topogràfics.
    const shade = clamp(0.78 + ((hL - hR) + (hU - hD)) / (2 * cell) * 0.9, 0.25, 1.35);
    let c = [vd[k * 4] * 1.5, vd[k * 4 + 1] * 1.5, vd[k * 4 + 2] * 1.5].map(v => v * shade);
    if (Z.gh[k] <= 0.5) c = [40, 70, 100];
    const idx = Z.index ? Z.index[k] : 0;
    if (idx > 0.08 && U.uOverlay.value) { const r = ramp(idx), a = smooth(0.08, 0.3, idx) * 0.75; c = c.map((v, n) => v + (r[n] * shade - v) * a); }
    d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Només la probabilitat, transparent on és baixa: va a sobre del mapa topogràfic.
  const gh = mmHeat.getContext('2d'), hi = gh.createImageData(GRID, GRID), hd = hi.data;
  for (let k = 0; k < GRID * GRID; k++) {
    const idx = Z.index ? Z.index[k] : 0;
    if (idx <= 0.08) continue;
    const r = ramp(idx);
    hd[k * 4] = r[0]; hd[k * 4 + 1] = r[1]; hd[k * 4 + 2] = r[2]; hd[k * 4 + 3] = Math.round(smooth(0.08, 0.3, idx) * 170);
  }
  gh.putImageData(hi, 0, 0);
  lastScale = '';
}
function drawMinimap() {
  if (!Z.gh || minimap.clientWidth === 0) return;
  const dpr = window.devicePixelRatio || 1, W = minimap.clientWidth;
  if (minimap.width !== Math.round(W * dpr)) { minimap.width = minimap.height = Math.round(W * dpr); }
  const g = minimap.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = true;
  let toPx;
  if (mmMode === 'topo') {
    // Mapa topogràfic de l'ICGC centrat en tu (1 píxel lògic de tesela = 1 píxel CSS).
    const k = 2 ** (mmZoom - Z_DET), resZ = Z.geo.res / k;
    const gx = (Z.geo.cx + player.x / Z.geo.res) * k, gy = (Z.geo.cy + player.z / Z.geo.res) * k;
    g.fillStyle = '#e8e6df'; g.fillRect(0, 0, W, W);
    for (let ty = Math.floor((gy - W / 2) / 256); ty <= Math.floor((gy + W / 2) / 256); ty++)
      for (let tx = Math.floor((gx - W / 2) / 256); tx <= Math.floor((gx + W / 2) / 256); tx++) {
        const t = topoTile(mmZoom, tx, ty);
        if (t.ok) g.drawImage(t.img, tx * 256 - gx + W / 2, ty * 256 - gy + W / 2, 256, 256);
      }
    toPx = (x, z) => [W / 2 + (x - player.x) / resZ, W / 2 + (z - player.z) / resZ];
    if (U.uOverlay.value) {
      const [ox, oy] = toPx(Z.detOrigin[0], Z.detOrigin[1]);
      g.globalAlpha = 0.75;
      g.drawImage(mmHeat, ox, oy, Z.detSize / resZ, Z.detSize / resZ);
      g.globalAlpha = 1;
    }
    setScale(resZ);
  } else {
    g.drawImage(mmBase, 0, 0, W, W);
    toPx = (x, z) => [(x - Z.detOrigin[0]) / Z.detSize * W, (z - Z.detOrigin[1]) / Z.detSize * W];
    setScale(Z.detSize / W);
  }
  g.font = '9px ui-monospace, monospace';
  g.textAlign = 'center';
  for (const p of mmMode === 'zone' ? Z.places : []) {
    if (!['peak', 'town', 'village'].includes(p.kind)) continue;
    const [px, py] = toPx(p.x, p.z);
    if (px < 0 || py < 0 || px > W || py > W) continue;
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2.5;
    if (p.kind === 'peak') { g.beginPath(); g.moveTo(px, py - 3); g.lineTo(px + 3, py + 2); g.lineTo(px - 3, py + 2); g.closePath(); g.stroke(); g.fill(); }
    else { g.beginPath(); g.arc(px, py, p.kind === 'town' ? 3 : 2, 0, 7); g.stroke(); g.fill(); }
    if (p.name && (p.kind !== 'peak' || p.ele > 0)) { g.strokeText(p.name, px, py - 5); g.fillText(p.name, px, py - 5); }
  }
  const sp = BOLETS[state.species];
  state.spots.forEach((s, i) => {
    const [px, py] = toPx(s.x, s.z);
    g.fillStyle = sp.color; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 8px ui-monospace, monospace'; g.fillText(String(i + 1), px, py + 3);
  });
  // Tu: punt amb el con de visió.
  let [px, py] = toPx(player.x, player.z);
  const outside = px < 0 || py < 0 || px > W || py > W;
  px = clamp(px, 6, W - 6); py = clamp(py, 6, W - 6);
  const a = Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)), half = THREE.MathUtils.degToRad(camera.fov * camera.aspect / 2);
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.beginPath(); g.moveTo(px, py); g.arc(px, py, 34, a - Math.min(half, 1.2), a + Math.min(half, 1.2)); g.closePath(); g.fill();
  g.fillStyle = outside ? '#999' : '#3fa9ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 10px ui-monospace, monospace';
  g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2.5; g.strokeText('N', W - 10, 13); g.fillText('N', W - 10, 13);
}
minimap.addEventListener('click', e => {
  const r = minimap.getBoundingClientRect();
  const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  let x, z;
  if (mmMode === 'topo') {
    const resZ = Z.geo.res / 2 ** (mmZoom - Z_DET);
    x = player.x + (u - 0.5) * r.width * resZ; z = player.z + (v - 0.5) * r.height * resZ;
  } else { x = Z.detOrigin[0] + u * Z.detSize; z = Z.detOrigin[1] + v * Z.detSize; }
  if (mode === 'fly') teleport(x, z, Math.max(150, player.y - heightAt(player.x, player.z)));
  else teleport(x, z, 0);
});

// Brúixola: cap on mires, amb els punts cardinals i la direcció dels millors llocs.
const compass = $('compass');
function drawCompass() {
  const dpr = window.devicePixelRatio || 1, W = compass.clientWidth, H = compass.clientHeight;
  if (!W) return;
  if (compass.width !== Math.round(W * dpr)) { compass.width = Math.round(W * dpr); compass.height = Math.round(H * dpr); }
  const g = compass.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const heading = THREE.MathUtils.radToDeg(wrap(-player.yaw, Math.PI * 2)), span = 120;
  const X = deg => W / 2 + ((((deg - heading) % 360) + 540) % 360 - 180) / span * W;
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.15, 'rgba(0,0,0,.35)'); grad.addColorStop(0.85, 'rgba(0,0,0,.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  for (let d = 0; d < 360; d += 15) {
    const x = X(d);
    if (x < 0 || x > W) continue;
    const card = d % 45 === 0;
    g.fillStyle = `rgba(255,255,255,${card ? 0.95 : 0.45})`;
    g.fillRect(x - 0.5, H - (card ? 9 : 5), 1, card ? 9 : 5);
    if (card) { g.font = (d % 90 === 0 ? 'bold 12px' : '10px') + ' ui-monospace, monospace'; g.fillText(DIRS[d / 45], x, 13); }
  }
  const sp = BOLETS[state.species];
  state.spots.forEach((s, i) => {
    const deg = THREE.MathUtils.radToDeg(wrap(Math.atan2(s.x - player.x, -(s.z - player.z)), Math.PI * 2));
    const x = X(deg);
    if (x < 6 || x > W - 6) return;
    g.fillStyle = sp.color; g.beginPath(); g.arc(x, H - 13, 5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 8px ui-monospace, monospace'; g.fillText(String(i + 1), x, H - 10);
  });
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2 - 5, H); g.lineTo(W / 2 + 5, H); g.lineTo(W / 2, H - 6); g.fill();
}

// ---------------------------------------------------------------------------
// Càmera: volar i caminar
// ---------------------------------------------------------------------------
const player = { x: 0, z: 0, y: 1500, yaw: 0, pitch: -0.3, vy: 0, step: 0 };
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  keys.add(e.code);
  if (e.code === 'KeyF') setMode(mode === 'fly' ? 'walk' : 'fly');
  if (e.code === 'Space' && mode === 'walk' && player.vy === 0) player.vy = 4;
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let dragging = false, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  player.yaw += (e.clientX - lx) * 0.004;
  player.pitch = clamp(player.pitch + (e.clientY - ly) * 0.004, -1.5, 1.5);
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (mode === 'fly') { // la roda avança o recula
    const f = -Math.sign(e.deltaY) * Math.max(30, (player.y - heightAt(player.x, player.z)) * 0.15);
    player.x += -Math.sin(player.yaw) * Math.cos(player.pitch) * f;
    player.z += -Math.cos(player.yaw) * Math.cos(player.pitch) * f;
    player.y += Math.sin(player.pitch) * f;
  }
}, { passive: false });
// Doble clic: anar al punt del terreny assenyalat.
canvas.addEventListener('dblclick', e => {
  const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let t = 1;
  for (let i = 0; i < 400 && t < 60000; i++) {
    const p = o.clone().addScaledVector(d, t);
    const hh = heightAt(p.x, p.z);
    if (p.y < hh) { teleport(p.x, p.z, mode === 'fly' ? 200 : 0); return; }
    t += Math.max(1, (p.y - hh) * 0.5);
  }
});
let touchStick = null;
canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) touchStick = { y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }; }, { passive: true });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && touchStick) { const y = (e.touches[0].clientY + e.touches[1].clientY) / 2; touchStick.dy = touchStick.y - y; }
}, { passive: true });
canvas.addEventListener('touchend', () => { touchStick = null; });

function setMode(m) {
  mode = m;
  $('modeFly').classList.toggle('on', m === 'fly');
  $('modeWalk').classList.toggle('on', m === 'walk');
  if (m === 'walk') { player.y = heightAt(player.x, player.z); player.pitch = Math.max(-0.5, Math.min(0.3, player.pitch)); }
  else player.y = Math.max(player.y, heightAt(player.x, player.z) + 250);
  propsDirty = true;
}
$('modeFly').addEventListener('click', () => setMode('fly'));
$('modeWalk').addEventListener('click', () => setMode('walk'));

function teleport(x, z, above) {
  player.x = x; player.z = z;
  player.y = heightAt(x, z) + above;
  propsDirty = true;
}
function goToSpot(s) {
  // Arribar caminant al lloc, mirant cap avall del pendent.
  setMode('walk');
  teleport(s.x, s.z, 0);
  const dx = heightAt(s.x + 5, s.z) - heightAt(s.x - 5, s.z), dz = heightAt(s.x, s.z + 5) - heightAt(s.x, s.z - 5);
  player.yaw = Math.atan2(dx, dz);
  player.pitch = -0.15;
}

function updatePlayer(dt) {
  let f = 0, s = 0, u = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
  if (keys.has('KeyE')) u += 1;
  if (keys.has('KeyQ')) u -= 1;
  if (touchStick && touchStick.dy) f += clamp(touchStick.dy / 80, -1, 1);
  const fast = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const ground = heightAt(player.x, player.z);
  if (mode === 'fly') {
    const agl = Math.max(20, player.y - ground);
    const sp = clamp(agl * 0.8, 40, 2500) * (fast ? 3 : 1);
    const cp = Math.cos(player.pitch), spp = Math.sin(player.pitch);
    player.x += (-sy * cp * f + cy * s) * sp * dt;
    player.z += (-cy * cp * f - sy * s) * sp * dt;
    player.y += (spp * f + u) * sp * dt;
    player.y = Math.max(player.y, heightAt(player.x, player.z) + 3);
  } else {
    const sp = fast ? 6 : 1.6;
    const len = Math.hypot(f, s) || 1;
    const dx = (-sy * f + cy * s) / len * sp * dt, dz = (-cy * f - sy * s) / len * sp * dt;
    const g1 = heightAt(player.x + dx, player.z + dz);
    if ((g1 - ground) / Math.max(1e-3, Math.hypot(dx, dz)) < 1.2) { player.x += dx; player.z += dz; }
    player.vy -= 9.8 * dt;
    player.y += player.vy * dt;
    const g = heightAt(player.x, player.z);
    if (player.y <= g) { player.y = g; player.vy = 0; }
    if (f || s) player.step += sp * dt / 0.75;
  }
  // No sortir de la zona de context.
  player.x = clamp(player.x, Z.ctxOrigin[0] + 500, Z.ctxOrigin[0] + Z.ctxSize - 500);
  player.z = clamp(player.z, Z.ctxOrigin[1] + 500, Z.ctxOrigin[1] + Z.ctxSize - 500);
  const bob = mode === 'walk' ? Math.abs(Math.sin(player.step * Math.PI)) * 0.04 : 0;
  camera.position.set(player.x, player.y + (mode === 'walk' ? 1.7 + bob : 0), player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

// ---------------------------------------------------------------------------
// Càrrega d'una zona
// ---------------------------------------------------------------------------
let loadToken = 0;
async function loadZone(zone) {
  const token = ++loadToken;
  $('loading').classList.remove('off');
  $('notice').textContent = '';
  setLoading(0.02, `Descarregant el relleu de ${zone.nom}…`);
  Z.zone = zone;
  let tiles = 0;
  const tick = () => { tiles++; setLoading(0.02 + tiles / 32 * 0.6); };
  let det, ctx;
  try {
    [det, ctx] = await Promise.all([loadLayer(zone, Z_DET, tick), loadLayer(zone, Z_CTX, tick)]);
  } catch (e) {
    console.error(e);
    fail('No s\'ha pogut descarregar el relleu. Comprova la connexió i torna-ho a provar.');
  }
  if (token !== loadToken) return;
  Z.det = det.H; Z.ctx = ctx.H;
  Z.detOrigin = det.origin; Z.detSize = det.size;
  Z.ctxOrigin = ctx.origin; Z.ctxSize = ctx.size;
  Z.geo = { cx: det.cx, cy: det.cy, res: det.res };
  Z.places = [];
  renderPlaceLabels();
  if (U.uDetTex.value) U.uDetTex.value.dispose();
  if (U.uCtxTex.value) U.uCtxTex.value.dispose();
  for (const k of ['uDetN', 'uCtxN']) if (U[k].value) U[k].value.dispose();
  U.uDetTex.value = makeHeightTexture(Z.det);
  U.uCtxTex.value = makeHeightTexture(Z.ctx);
  U.uDetN.value = makeSlopeTexture(Z.det, det.res);
  U.uCtxN.value = makeSlopeTexture(Z.ctx, ctx.res);
  U.uDetOrigin.value.set(...Z.detOrigin); U.uDetSize.value = Z.detSize;
  U.uCtxOrigin.value.set(...Z.ctxOrigin); U.uCtxSize.value = Z.ctxSize;
  lastShadowDir.set(0, 0, 0);

  setLoading(0.66, 'Estimant el bosc…');
  await new Promise(r => setTimeout(r, 20));
  buildVegetation();
  setLoading(0.7, 'Descarregant l\'ortofoto de l\'ICGC…');
  try {
    let n = 0;
    const tick2 = () => { n++; setLoading(0.7 + n / 80 * 0.05); };
    const [od, oc] = await Promise.all([loadOrthoLayer(zone, Z_DET, 14, tick2), loadOrthoLayer(zone, Z_CTX, Z_CTX, tick2)]);
    if (token !== loadToken) return;
    for (const k of ['uOrthoDet', 'uOrthoCtx']) if (U[k].value) U[k].value.dispose();
    U.uOrthoDet.value = canvasTexture(od);
    U.uOrthoCtx.value = canvasTexture(oc);
    applyOrthoForest(od);
    Z.hasOrtho = true;
  } catch (e) {
    console.warn('Sense ortofoto:', e);
    Z.hasOrtho = false;
  }
  setTerrainStyle(Z.hasOrtho && terrainStyle === 'orto' ? 'orto' : 'est');
  setLoading(0.76, 'Descarregant el mapa de cobertes del sòl de l\'ICGC…');
  try {
    const cls = await loadCobertes(det);
    if (token !== loadToken) return;
    applyCobertes(cls);
  } catch (e) {
    console.warn('Sense cobertes del sòl:', e);
  }
  loadPlaces(zone, token);
  setLoading(0.75, 'Descarregant el temps d\'Open-Meteo…');
  await loadWeather();
  if (token !== loadToken) return;
  if (Z.sampleWeather) $('notice').textContent = 'No s\'ha pogut connectar amb Open-Meteo: es mostren dades d\'exemple, no reals.';

  const W = Z.weather;
  timeInput.min = W.firstShown; timeInput.max = W.nH - 1;
  state.t = W.nowIdx; timeInput.value = state.t;
  state.day = -1;
  setLoading(0.9, 'Calculant on poden sortir bolets…');
  await new Promise(r => setTimeout(r, 20));
  refreshDay(true);

  // Vista inicial: des de l'aire, mirant cap al millor lloc (o el centre).
  const target = state.spots[0] || { x: 0, z: 0 };
  const ang = 0.6;
  player.x = target.x + Math.sin(ang) * 3500; player.z = target.z + Math.cos(ang) * 3500;
  player.x = clamp(player.x, Z.detOrigin[0], Z.detOrigin[0] + Z.detSize);
  player.z = clamp(player.z, Z.detOrigin[1], Z.detOrigin[1] + Z.detSize);
  const th = heightAt(target.x, target.z);
  player.y = Math.max(heightAt(player.x, player.z) + 700, th + 900);
  player.yaw = Math.atan2(player.x - target.x, player.z - target.z);
  player.pitch = -Math.atan2(player.y - th, Math.hypot(player.x - target.x, player.z - target.z));
  setMode('fly');
  player.y = Math.max(heightAt(player.x, player.z) + 700, th + 900);
  setLoading(1, 'Llest');
  setTimeout(() => $('loading').classList.add('off'), Z.sampleWeather ? 2500 : 300);
}

// ---------------------------------------------------------------------------
// Bucle
// ---------------------------------------------------------------------------
let last = performance.now(), simTime = 0, frames = 0, fpsT = last, infoT = 0, minimapT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!Z.weather) return;
  simTime += dt;
  U.uTime.value = simTime;
  if (state.playing) {
    state.t += dt * 12;   // mitja jornada per segon
    if (state.t >= +timeInput.max) { state.t = +timeInput.max; state.playing = false; $('play').textContent = '▶ Reproduir'; }
    timeInput.value = Math.round(state.t);
  }
  refreshDay();
  updatePlayer(dt);
  updateWeatherAndLight(dt);
  updateClipmap(camera.position.x, camera.position.z);
  updateProps(player.x, player.z, new Date(Z.weather.times[0] + state.t * 36e5));
  sky.position.copy(camera.position);
  const ld = U.uLightDir.value, texel = (2 * SH) / sun.shadow.mapSize.x;
  const sx = Math.round(player.x / texel) * texel, sz = Math.round(player.z / texel) * texel;
  sun.target.position.set(sx, player.y, sz);
  sun.position.set(sx + ld.x * 700, player.y + ld.y * 700, sz + ld.z * 700);
  // Ombres de prop només quan es camina (de lluny no es veuen).
  sun.castShadow = mode === 'walk';
  renderer.render(scene, camera);
  updateLabels();
  updatePlaceLabels(now);
  drawCompass();
  if (now - minimapT > 120) { minimapT = now; drawMinimap(); }
  infoT += dt;
  if (infoT > 0.25) { infoT = 0; updateInfo(); if (state.playing) drawChart(); }

  frames++;
  if (now - fpsT > 1000) {
    const fps = frames * 1000 / (now - fpsT);
    frames = 0; fpsT = now;
    if (!(fixedQuality > 0)) {
      const max = Math.min(window.devicePixelRatio || 1, 1.5);
      let pr = pixelRatio;
      if (fps < 40 && pr > 0.5) pr = Math.max(0.5, pr * 0.85);
      else if (fps > 57 && pr < max) pr = Math.min(max, pr * 1.07);
      if (pr !== pixelRatio) { pixelRatio = pr; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); }
    }
  }
}

showSpeciesInfo();
const startZone = Math.max(0, ZONES.findIndex(z => z.id === qs.get('zona')));
state.zone = startZone;
$('zone').value = startZone;
const startSp = BOLETS.findIndex(b => b.id === qs.get('bolet'));
if (startSp >= 0) { state.species = startSp; $('species').value = startSp; showSpeciesInfo(); }
loadZone(ZONES[startZone]).then(() => requestAnimationFrame(frame)).catch(e => console.error(e));

// Ganxos per a proves automàtiques.
window.__mico = { Z, state, player, setMode, goToSpot, teleport, heightAt };
