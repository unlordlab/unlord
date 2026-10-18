// Nieve: paseo en primera persona por una cordillera nevada.
//
// Piezas:
//  - El relieve se genera en la GPU (ruido periódico, así el mundo se repite
//    sin bordes) y se lee de vuelta para la física, los árboles y las rocas.
//  - El terreno es un clipmap: anillos concéntricos de malla cada vez más
//    gruesos que siguen a la cámara, con transición suave entre niveles.
//  - Cielo, niebla y nieve comparten las mismas funciones de color, para que
//    el horizonte, la bruma y el cielo encajen.
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constantes del mundo
// ---------------------------------------------------------------------------
const WORLD = 8192;            // metros que cubre una tesela del mundo (se repite)
const HM = 2048;               // resolución del mapa de alturas (4 m por texel)
const DENS = 512;              // resolución del mapa de bosque/rocas
const ALT0 = 1150;             // altitud del punto más bajo, solo para el HUD
const EYE = 1.7;               // altura de los ojos
const CLIP_N = 64;             // medio lado de cada anillo del clipmap, en celdas
const CLIP_LEVELS = 9;         // 0,5 m … 128 m por celda
const CLIP_S0 = 0.5;

const qs = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const statusEl = document.getElementById('status');
const enterBtn = document.getElementById('enter');
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

function fail(msg) {
  const e = document.getElementById('error');
  e.querySelector('p').textContent = msg;
  e.style.display = 'grid';
  throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Parámetros y panel
// ---------------------------------------------------------------------------
const params = {
  intensity:  { g: 'g-snow', label: 'Intensidad',          min: 0,   max: 1,   step: 0.01, v: 0.45 },
  flakeSize:  { g: 'g-snow', label: 'Tamaño de copo',      min: 0.4, max: 2.5, step: 0.01, v: 1.0 },
  fallSpeed:  { g: 'g-snow', label: 'Velocidad de caída',  min: 0.3, max: 2.5, step: 0.01, v: 1.0 },
  accumulation:{ g: 'g-snow', label: 'Nieve acumulada',    min: 0,   max: 1,   step: 0.01, v: 0.7 },
  windSpeed:  { g: 'g-wind', label: 'Velocidad',           min: 0,   max: 1,   step: 0.01, v: 0.25 },
  windDir:    { g: 'g-wind', label: 'Dirección (°)',       min: 0,   max: 360, step: 1,    v: 70 },
  gusts:      { g: 'g-wind', label: 'Rachas',              min: 0,   max: 1,   step: 0.01, v: 0.4 },
  drift:      { g: 'g-wind', label: 'Ventisca a ras de suelo', min: 0, max: 1, step: 0.01, v: 0.3 },
  hour:       { g: 'g-sky',  label: 'Hora',                min: 0,   max: 24,  step: 0.01, v: 10.5, fmt: v => {
    const h = Math.floor(v), m = Math.floor((v - h) * 60); return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`; } },
  clouds:     { g: 'g-sky',  label: 'Nubes',               min: 0,   max: 1,   step: 0.01, v: 0.55 },
  fog:        { g: 'g-sky',  label: 'Niebla',              min: 0,   max: 1,   step: 0.01, v: 0.35 },
  exposure:   { g: 'g-sky',  label: 'Exposición',          min: 0.3, max: 2,   step: 0.01, v: 1.0 },
};

const presets = {
  despejado: { intensity: 0.0,  clouds: 0.12, fog: 0.15, windSpeed: 0.12, gusts: 0.3, drift: 0.1, hour: 11.0, exposure: 1.0 },
  nevada:    { intensity: 0.6,  clouds: 0.85, fog: 0.5,  windSpeed: 0.25, gusts: 0.4, drift: 0.3, hour: 12.5, exposure: 1.05 },
  ventisca:  { intensity: 1.0,  clouds: 1.0,  fog: 0.85, windSpeed: 0.95, gusts: 0.85, drift: 0.95, hour: 12.0, exposure: 1.1 },
  atardecer: { intensity: 0.06, clouds: 0.35, fog: 0.3,  windSpeed: 0.12, gusts: 0.3, drift: 0.1, hour: 18.4, exposure: 1.1 },
  noche:     { intensity: 0.2,  clouds: 0.2,  fog: 0.2,  windSpeed: 0.15, gusts: 0.3, drift: 0.15, hour: 23.0, exposure: 1.2 },
};

const inputs = {}, refresh = {};
for (const [key, p] of Object.entries(params)) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="p-${key}">${p.label}<output></output></label>
    <input id="p-${key}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.v}">`;
  document.getElementById(p.g).appendChild(row);
  const input = row.querySelector('input'), out = row.querySelector('output');
  const fmt = () => { out.textContent = p.fmt ? p.fmt(p.v) : (p.step >= 1 ? String(Math.round(p.v)) : p.v.toFixed(2)); };
  input.addEventListener('input', () => { p.v = parseFloat(input.value); tween = null; fmt(); });
  fmt();
  inputs[key] = input; refresh[key] = fmt;
}
function setParam(k, v) { params[k].v = v; inputs[k].value = v; refresh[k](); }

// Los ajustes predefinidos se interpolan en unos segundos: el tiempo "cambia".
let tween = null;
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const target = presets[b.dataset.preset], from = {};
  for (const k in target) from[k] = params[k].v;
  // La hora va por el camino corto alrededor del reloj.
  if (Math.abs(target.hour - from.hour) > 12) from.hour += target.hour > from.hour ? 24 : -24;
  tween = { from, target, t0: performance.now(), dur: 3500 };
}));
function updateTween(now) {
  if (!tween) return;
  const t = Math.min(1, (now - tween.t0) / tween.dur), e = t * t * (3 - 2 * t);
  for (const k in tween.target) {
    let v = tween.from[k] + (tween.target[k] - tween.from[k]) * e;
    if (k === 'hour') v = ((v % 24) + 24) % 24;
    setParam(k, v);
  }
  if (t >= 1) tween = null;
}
const panel = document.getElementById('panel');
document.getElementById('toggle').addEventListener('click', e => {
  panel.classList.toggle('hidden');
  e.target.textContent = panel.classList.contains('hidden') ? 'mostrar' : 'ocultar';
});

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { fail('Este navegador no puede usar WebGL2.'); }
const gl = renderer.getContext();
if (!(gl instanceof WebGL2RenderingContext)) fail('Este navegador no puede usar WebGL2.');
if (!renderer.extensions.has('EXT_color_buffer_float')) fail('La tarjeta gráfica no admite texturas de coma flotante (EXT_color_buffer_float).');
const floatLinear = renderer.extensions.has('OES_texture_float_linear');
const fixedQuality = parseFloat(qs.get('q'));
let pixelRatio = fixedQuality > 0 ? fixedQuality : Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.25, 30000);
camera.rotation.order = 'YXZ';
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------------------------------------------------------------------------
// Uniformes compartidos por todos los materiales
// ---------------------------------------------------------------------------
const U = {
  uTime: { value: 0 },
  uWorld: { value: WORLD },
  uHMSize: { value: HM },
  uHeightTex: { value: null },
  uDetailTex: { value: null },
  uNormalTex: { value: null },
  uShadowTex: { value: null },
  uDensityTex: { value: null },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uLightDir: { value: new THREE.Vector3(0, 1, 0) },
  uLightCol: { value: new THREE.Color() },
  uSunGlow: { value: new THREE.Color() },
  uZenith: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uAmbient: { value: new THREE.Color() },
  uNight: { value: 0 },
  uCloud: { value: 0.5 },
  uCloudOff: { value: new THREE.Vector2() },
  uFogDensity: { value: 0.002 },
  uFogFalloff: { value: 0.006 },
  uFogBase: { value: 0 },
  uHaze: { value: 0.00004 },
  uAccum: { value: 0.7 },
  uWindDir: { value: new THREE.Vector2(1, 0) },
  uWindStr: { value: 0 },
};

// ---------------------------------------------------------------------------
// GLSL compartido
// ---------------------------------------------------------------------------
const GLSL_HASH = /* glsl */`
float nzHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

// Altura del terreno: B-spline cúbica sobre el mapa de alturas (suave, sin facetas)
// más dos capas de detalle que se repiten cada pocos metros.
const GLSL_TERRAIN = /* glsl */`
uniform sampler2D uHeightTex;
uniform sampler2D uDetailTex;
uniform float uWorld;
uniform float uHMSize;
float hBase(vec2 xz) {
  vec2 st = xz / uWorld * uHMSize - 0.5;
  vec2 i = floor(st), f = st - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 s0 = w0 + w1, s1 = w2 + w3;
  vec2 t0 = (i - 0.5 + w1 / s0) / uHMSize;
  vec2 t1 = (i + 1.5 + w3 / s1) / uHMSize;
  return s0.y * (s0.x * texture(uHeightTex, t0).r + s1.x * texture(uHeightTex, vec2(t1.x, t0.y)).r)
       + s1.y * (s0.x * texture(uHeightTex, vec2(t0.x, t1.y)).r + s1.x * texture(uHeightTex, t1).r);
}
float hDetail(vec2 xz) {
  return (texture(uDetailTex, xz / 41.0).r - 0.5) * 1.1 + (texture(uDetailTex, xz / 6.3 + 0.37).r - 0.5) * 0.14;
}
float terrainH(vec2 xz) { return hBase(xz) + hDetail(xz); }
`;

// Cielo y niebla. Todo en espacio lineal, antes del tone mapping.
const GLSL_SKY = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uSunGlow;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform float uFogBase;
uniform float uHaze;
vec3 skyBase(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.45));
  // Bajo el horizonte (casi nunca se ve: lo tapan las montañas).
  c = mix(c, uHorizon * 0.75, smoothstep(0.0, -0.2, y));
  float mu = max(dot(rd, uSunDir), 0.0);
  float horizonBoost = 1.0 - 0.6 * clamp(y, 0.0, 1.0);
  c += uSunGlow * (0.18 * pow(mu, 4.0) + 0.45 * pow(mu, 24.0)) * horizonBoost;
  return c;
}
vec3 fogColorFor(vec3 rd) {
  return skyBase(vec3(rd.x, max(rd.y, 0.0) * 0.35, rd.z));
}
vec3 applyFog(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float dist = length(d);
  vec3 rd = d / max(dist, 1e-3);
  // Niebla de altura con integral analítica: más densa en los valles.
  float a = uFogDensity * exp(-uFogFalloff * (cameraPosition.y - uFogBase));
  float k = uFogFalloff * rd.y * dist;
  float hf = a * dist * (abs(k) > 1e-4 ? (1.0 - exp(-k)) / k : 1.0);
  float tau = hf + uHaze * dist;
  return mix(col, fogColorFor(rd), 1.0 - exp(-tau));
}
`;

// ---------------------------------------------------------------------------
// Pases de generación a pantalla completa
// ---------------------------------------------------------------------------
const passScene = new THREE.Scene();
const passCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
passQuad.frustumCulled = false;
passScene.add(passQuad);
const PASS_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
function runPass(material, target) {
  passQuad.material = material;
  renderer.setRenderTarget(target);
  renderer.render(passScene, passCam);
  renderer.setRenderTarget(null);
}

// Relieve: ruido de gradiente periódico (la tesela se repite sin costuras),
// cordales con ruido "ridged" y laderas erosionadas con FBM amortiguado por derivadas.
const GEN_FS = /* glsl */`
uniform float uSeed;
uniform float uSize;
varying vec2 vUv;
${GLSL_HASH}
vec2 grd(vec2 i, float per) {
  i = mod(i, per);
  float a = nzHash12(i + vec2(uSeed * 7.13, per * 0.37)) * 6.2831853;
  return vec2(cos(a), sin(a));
}
vec3 gnd(vec2 x, float per) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = grd(i, per), gb = grd(i + vec2(1, 0), per), gc = grd(i + vec2(0, 1), per), gd = grd(i + vec2(1, 1), per);
  float va = dot(ga, f), vb = dot(gb, f - vec2(1, 0)), vc = dot(gc, f - vec2(0, 1)), vd = dot(gd, f - vec2(1, 1));
  float v = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd);
  vec2 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd)
         + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va);
  return vec3(v, d);
}
float fbmP(vec2 x, float per, int oct) {
  float a = 0.0, b = 0.5;
  for (int i = 0; i < 8; i++) { if (i >= oct) break; a += b * gnd(x, per).x; x *= 2.0; per *= 2.0; b *= 0.5; }
  return a;
}
float heightAt(vec2 uv) {
  vec2 warp = vec2(fbmP(uv * 4.0, 4.0, 5), fbmP(uv * 4.0 + vec2(17.3, 9.1), 4.0, 5));
  vec2 q = uv + warp * 0.05;
  float macro = fbmP(q * 3.0 + 3.3, 3.0, 4) * 1.7 + 0.5;
  float mask = smoothstep(0.1, 0.85, macro);
  float r = 0.0, w = 1.0, amp = 0.55;
  vec2 x = q * 5.0; float per = 5.0;
  for (int i = 0; i < 8; i++) {
    float n = 1.0 - abs(gnd(x + 4.1, per).x * 1.45);
    n = n * n;
    float nn = n * w;
    r += nn * amp;
    w = clamp(nn * 1.8, 0.0, 1.0);
    amp *= 0.5; x *= 2.0; per *= 2.0;
  }
  float e = 0.0; vec2 ds = vec2(0.0); amp = 0.5;
  x = q * 10.0; per = 10.0;
  for (int i = 0; i < 9; i++) {
    vec3 n = gnd(x + 1.7, per);
    ds += n.yz * 0.7;
    e += amp * n.x / (1.0 + dot(ds, ds));
    amp *= 0.5; x *= 2.0; per *= 2.0;
  }
  float m = mask * (0.8 * r + 0.35 * e) + 0.1 * e + 0.06 * macro;
  m = max(m, 0.0);
  return 1500.0 * pow(m, 1.55);
}
void main() {
  // Cada píxel guarda 4 texels consecutivos en una fila: así se lee como RGBA.
  vec2 px = floor(gl_FragCoord.xy);
  float y = (px.y + 0.5) / uSize;
  gl_FragColor = vec4(
    heightAt(vec2((px.x * 4.0 + 0.5) / uSize, y)),
    heightAt(vec2((px.x * 4.0 + 1.5) / uSize, y)),
    heightAt(vec2((px.x * 4.0 + 2.5) / uSize, y)),
    heightAt(vec2((px.x * 4.0 + 3.5) / uSize, y)));
}`;

// Normales de base, curvatura (cóncavo > 0) y oclusión ambiental por horizonte.
const DERIVED_FS = /* glsl */`
uniform sampler2D uH;
uniform float uSize;
uniform float uCell;
varying vec2 vUv;
float H(vec2 o) { return texture(uH, vUv + o / uSize).r; }
void main() {
  float h = H(vec2(0));
  float hl = H(vec2(-1, 0)), hr = H(vec2(1, 0)), hd = H(vec2(0, -1)), hu = H(vec2(0, 1));
  vec3 n = normalize(vec3(hl - hr, 2.0 * uCell, hd - hu));
  float c1 = (H(vec2(-3, 0)) + H(vec2(3, 0)) + H(vec2(0, -3)) + H(vec2(0, 3))) * 0.25 - h;
  float c2 = (H(vec2(-8, 0)) + H(vec2(8, 0)) + H(vec2(0, -8)) + H(vec2(0, 8))) * 0.25 - h;
  float curv = c1 * 0.6 + c2 * 0.25;
  float occ = 0.0;
  for (int d = 0; d < 8; d++) {
    float a = float(d) * 0.785398 + 0.3;
    vec2 dir = vec2(cos(a), sin(a));
    float m = 0.0;
    for (int s = 1; s <= 5; s++) {
      float r = pow(2.2, float(s));
      float dh = H(dir * r) - h;
      m = max(m, dh / (r * uCell));
    }
    occ += m / sqrt(1.0 + m * m);
  }
  float ao = 1.0 - occ / 8.0;
  gl_FragColor = vec4(n.x, n.z, curv, ao);
}`;

// Sombra del relieve: rayo hacia el sol sobre el mapa de alturas, con penumbra.
const SHADOW_FS = /* glsl */`
uniform sampler2D uH;
uniform vec3 uL;
uniform float uWorldSize;
varying vec2 vUv;
void main() {
  if (uL.y <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float lh = length(uL.xz);
  vec2 dir = lh > 1e-4 ? uL.xz / lh : vec2(1.0, 0.0);
  float slope = uL.y / max(lh, 1e-4);
  float h0 = texture(uH, vUv).r + 3.0;
  float res = 1.0, t = 6.0;
  for (int i = 0; i < 110; i++) {
    float hh = texture(uH, vUv + dir * t / uWorldSize).r;
    float ray = h0 + t * slope;
    res = min(res, clamp((ray - hh) / (t * 0.035) + 0.5, 0.0, 1.0));
    if (res <= 0.0 || ray > 2600.0) break;
    t = t * 1.055 + 4.0;
    if (t > 6000.0) break;
  }
  gl_FragColor = vec4(res * res * (3.0 - 2.0 * res), 0.0, 0.0, 1.0);
}`;

// Densidad de bosque (R) y de rocas (G). La GPU lo usa para el bosque lejano y la CPU
// (tras leerlo) para colocar los árboles y las rocas cercanos: así ambos coinciden.
const DENSITY_FS = /* glsl */`
uniform sampler2D uH;
uniform float uHSize;
uniform float uCell;
uniform float uTreeline;
uniform float uSeed;
varying vec2 vUv;
${GLSL_HASH}
float vn(vec2 x, float per) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = nzHash12(mod(i, per) + uSeed), b = nzHash12(mod(i + vec2(1, 0), per) + uSeed);
  float c = nzHash12(mod(i + vec2(0, 1), per) + uSeed), d = nzHash12(mod(i + vec2(1, 1), per) + uSeed);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  float h = texture(uH, vUv).r;
  float t = 1.0 / uHSize;
  float dx = (texture(uH, vUv + vec2(t, 0)).r - texture(uH, vUv - vec2(t, 0)).r) / (2.0 * uCell);
  float dz = (texture(uH, vUv + vec2(0, t)).r - texture(uH, vUv - vec2(0, t)).r) / (2.0 * uCell);
  float ny = 1.0 / sqrt(1.0 + dx * dx + dz * dz);
  float clear = vn(vUv * 60.0, 60.0) * 0.65 + vn(vUv * 240.0, 240.0) * 0.35;
  float tl = uTreeline + (vn(vUv * 25.0, 25.0) - 0.5) * 140.0;
  float tree = smoothstep(tl + 40.0, tl - 90.0, h) * smoothstep(0.78, 0.9, ny) * smoothstep(0.38, 0.6, clear);
  float rock = smoothstep(0.93, 0.72, ny) * 0.7 + smoothstep(tl, tl + 250.0, h) * 0.3 * vn(vUv * 120.0, 120.0);
  gl_FragColor = vec4(tree, rock, 0.0, 1.0);
}`;

function passMaterial(fs, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: PASS_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
}

// ---------------------------------------------------------------------------
// Ruido de detalle (CPU): textura periódica que usan GPU y física por igual
// ---------------------------------------------------------------------------
function makeDetail(size, seed) {
  const data = new Float32Array(size * size);
  const lattice = (per, s) => {
    const g = new Float32Array(per * per);
    let x = (seed * 9301 + s * 49297) >>> 0;
    for (let i = 0; i < g.length; i++) { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; g[i] = (x >>> 8) / 16777216; }
    return g;
  };
  const octs = [[8, 0.5], [16, 0.25], [32, 0.13], [64, 0.07], [128, 0.05]];
  const lats = octs.map(([per], i) => lattice(per, i + 1));
  let norm = 0;
  for (const [, a] of octs) norm += a;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    octs.forEach(([per, amp], o) => {
      const fx = x / size * per, fy = y / size * per;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      let ux = fx - ix, uy = fy - iy;
      ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
      const L = lats[o], g = (i, j) => L[((j % per) * per) + (i % per)];
      const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
      v += amp * ((a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy);
    });
    data[y * size + x] = v / norm;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Estado del mundo (CPU)
// ---------------------------------------------------------------------------
const world = {
  H: null,            // Float32Array HM*HM
  detail: null,       // Float32Array DETAIL*DETAIL
  dens: null,         // Float32Array DENS*DENS*4
  treeline: 600,
  minH: 0, maxH: 1,
  seed: parseInt(qs.get('seed'), 10) || 7,
};
const DETAIL = 256;

const wrap = (v, n) => ((v % n) + n) % n;
function hBaseCPU(x, z) {
  const H = world.H;
  const sx = x / WORLD * HM - 0.5, sz = z / WORLD * HM - 0.5;
  const ix = Math.floor(sx), iz = Math.floor(sz);
  const fx = sx - ix, fz = sz - iz;
  const bw = f => { const f2 = f * f, f3 = f2 * f; return [(1 - f) ** 3 / 6, (3 * f3 - 6 * f2 + 4) / 6, (-3 * f3 + 3 * f2 + 3 * f + 1) / 6, f3 / 6]; };
  const wx = bw(fx), wz = bw(fz);
  let h = 0;
  for (let j = 0; j < 4; j++) {
    const row = wrap(iz - 1 + j, HM) * HM;
    let r = 0;
    for (let i = 0; i < 4; i++) r += wx[i] * H[row + wrap(ix - 1 + i, HM)];
    h += wz[j] * r;
  }
  return h;
}
function sampleRepeat(data, n, u, v, stride = 1, ch = 0) {
  const sx = u * n - 0.5, sy = v * n - 0.5;
  const ix = Math.floor(sx), iy = Math.floor(sy);
  const fx = sx - ix, fy = sy - iy;
  const g = (i, j) => data[(wrap(j, n) * n + wrap(i, n)) * stride + ch];
  return (g(ix, iy) * (1 - fx) + g(ix + 1, iy) * fx) * (1 - fy) + (g(ix, iy + 1) * (1 - fx) + g(ix + 1, iy + 1) * fx) * fy;
}
function hDetailCPU(x, z) {
  return (sampleRepeat(world.detail, DETAIL, x / 41, z / 41) - 0.5) * 1.1
       + (sampleRepeat(world.detail, DETAIL, x / 6.3 + 0.37, z / 6.3 + 0.37) - 0.5) * 0.14;
}
const heightAt = (x, z) => hBaseCPU(x, z) + hDetailCPU(x, z);
const densityAt = (x, z, ch) => sampleRepeat(world.dens, DENS, x / WORLD, z / WORLD, 4, ch);

// ---------------------------------------------------------------------------
// Generación del mundo
// ---------------------------------------------------------------------------
const heightTex = new THREE.DataTexture(new Float32Array(HM * HM), HM, HM, THREE.RedFormat, THREE.FloatType);
heightTex.wrapS = heightTex.wrapT = THREE.RepeatWrapping;
heightTex.magFilter = heightTex.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
heightTex.generateMipmaps = false;
U.uHeightTex.value = heightTex;

const genRT = new THREE.WebGLRenderTarget(HM / 4, HM, { type: THREE.FloatType, depthBuffer: false });
genRT.texture.minFilter = genRT.texture.magFilter = THREE.NearestFilter;
const normalRT = new THREE.WebGLRenderTarget(HM, HM, { type: THREE.HalfFloatType, depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
const shadowRT = new THREE.WebGLRenderTarget(1024, 1024, { type: THREE.UnsignedByteType, depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
const densRT = new THREE.WebGLRenderTarget(DENS, DENS, { type: THREE.FloatType, depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
for (const rt of [normalRT, shadowRT, densRT]) { rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter; rt.texture.generateMipmaps = false; }
if (!floatLinear) densRT.texture.minFilter = densRT.texture.magFilter = THREE.NearestFilter;
U.uNormalTex.value = normalRT.texture;
U.uShadowTex.value = shadowRT.texture;
U.uDensityTex.value = densRT.texture;

const detailTex = new THREE.DataTexture(new Float32Array(DETAIL * DETAIL), DETAIL, DETAIL, THREE.RedFormat, THREE.FloatType);
detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
detailTex.magFilter = detailTex.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
U.uDetailTex.value = detailTex;

const genMat = passMaterial(GEN_FS, { uSeed: { value: 0 }, uSize: { value: HM } });
const derivedMat = passMaterial(DERIVED_FS, { uH: { value: heightTex }, uSize: { value: HM }, uCell: { value: WORLD / HM } });
const shadowMat = passMaterial(SHADOW_FS, { uH: { value: heightTex }, uL: { value: new THREE.Vector3(0, 1, 0) }, uWorldSize: { value: WORLD } });
const densMat = passMaterial(DENSITY_FS, { uH: { value: heightTex }, uHSize: { value: HM }, uCell: { value: WORLD / HM }, uTreeline: { value: 600 }, uSeed: { value: 0 } });

function generateWorld(seed) {
  world.seed = seed;
  world.detail = makeDetail(DETAIL, seed);
  detailTex.image.data.set(world.detail);
  detailTex.needsUpdate = true;

  genMat.uniforms.uSeed.value = seed;
  runPass(genMat, genRT);
  const H = new Float32Array(HM * HM);
  renderer.readRenderTargetPixels(genRT, 0, 0, HM / 4, HM, H);
  world.H = H;
  heightTex.image.data = H;
  heightTex.needsUpdate = true;

  // Percentiles aproximados para colocar el límite del bosque.
  const sample = [];
  for (let i = 0; i < H.length; i += 997) sample.push(H[i]);
  sample.sort((a, b) => a - b);
  const pct = p => sample[Math.floor(p * (sample.length - 1))];
  world.minH = pct(0); world.maxH = pct(1);
  world.treeline = pct(0.25) + 0.22 * (pct(0.97) - pct(0.25));
  U.uFogBase.value = pct(0.15);

  runPass(derivedMat, normalRT);
  densMat.uniforms.uTreeline.value = world.treeline;
  densMat.uniforms.uSeed.value = seed * 3.7;
  runPass(densMat, densRT);
  world.dens = new Float32Array(DENS * DENS * 4);
  renderer.readRenderTargetPixels(densRT, 0, 0, DENS, DENS, world.dens);
  lastShadowDir.set(0, 0, 0);
}

// Punto de partida: un rellano bajo y llano con una gran cumbre a la vista.
function findSpawn() {
  let best = null;
  const rnd = mulberry(world.seed * 77 + 1);
  for (let k = 0; k < 900; k++) {
    const x = (rnd() - 0.5) * WORLD, z = (rnd() - 0.5) * WORLD;
    const h = hBaseCPU(x, z);
    if (h > world.treeline - 60 || h < world.minH + 30) continue;
    const s = Math.hypot(hBaseCPU(x + 6, z) - hBaseCPU(x - 6, z), hBaseCPU(x, z + 6) - hBaseCPU(x, z - 6)) / 12;
    if (s > 0.12) continue;
    if (densityAt(x, z, 0) > 0.35) continue;
    let top = -1e9, yaw = 0;
    for (let a = 0; a < 24; a++) {
      const ang = a / 24 * Math.PI * 2;
      for (const r of [600, 1100, 1700, 2400]) {
        const hh = hBaseCPU(x + Math.sin(ang) * r, z + Math.cos(ang) * r) - h;
        const score = hh / Math.sqrt(r);
        if (score > top) { top = score; yaw = ang; }
      }
    }
    if (!best || top > best.top) best = { x, z, yaw, top };
  }
  return best || { x: 0, z: 0, yaw: 0 };
}

function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash3(i, j, k) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647) + world.seed * 1013;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Inyección en los materiales de three.js: nieve, sombra del relieve y niebla
// ---------------------------------------------------------------------------
function injectCommon(shader, { snowOnTop = false, sway = false } = {}) {
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
        float g = uWindStr * (0.55 + 0.45 * sin(uTime * 1.3 + ph)) + 0.08 * uWindStr * sin(uTime * 4.1 + ph * 3.0);
        transformed.xz += uWindDir * bend * g * 0.35;
      #endif` : ''}`)
    .replace('#include <fog_vertex>', `
      vec4 wpos4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos4 = instanceMatrix * wpos4;
      #endif
      vWPos = (modelMatrix * wpos4).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform sampler2D uShadowTex; uniform sampler2D uDetailTex; uniform float uWorld; uniform float uAccum; uniform vec3 uAmbient;
      varying vec3 vWPos; varying vec3 vLPos;
      ${GLSL_HASH}
      ${GLSL_SKY}`)
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float tShadow = texture(uShadowTex, vWPos.xz / uWorld).r;
      ${snowOnTop ? `
      vec3 wN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
      float sn = texture(uDetailTex, vLPos.xz * 0.37 + vLPos.y * 0.21).r;
      float snowAmt = smoothstep(0.2, 0.55, wN.y + (sn - 0.5) * 0.7) * (0.35 + 0.65 * uAccum);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.93), snowAmt);
      roughnessFactor = mix(roughnessFactor, 0.7, snowAmt);` : ''}`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.directDiffuse *= tShadow;
      reflectedLight.directSpecular *= tShadow;`)
    .replace('#include <opaque_fragment>', `outgoingLight = applyFog(outgoingLight, vWPos);
      #include <opaque_fragment>`)
    .replace('#include <fog_fragment>', '');
}

// ---------------------------------------------------------------------------
// Terreno: clipmap
// ---------------------------------------------------------------------------
function gridGeometry(n) {
  const side = 2 * n + 1;
  const pos = new Float32Array(side * side * 3);
  let p = 0;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { pos[p++] = i; pos[p++] = 0; pos[p++] = j; }
  const idx = [];
  for (let j = 0; j < 2 * n; j++) for (let i = 0; i < 2 * n; i++) {
    const a = j * side + i, b = a + side, c = a + 1, d = b + 1;
    // Diagonal alterna para que la malla sea simétrica.
    if ((i + j) & 1) idx.push(a, b, c, c, b, d); else idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(side * side * 3).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
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
  const lu = {
    uScale: { value: CLIP_S0 * 2 ** L },
    uOrigin: { value: new THREE.Vector2() },
    uHalf: { value: CLIP_N * CLIP_S0 * 2 ** L },
    uPrevOrigin: { value: new THREE.Vector2() },
    uPrevHalf: { value: L > 0 ? CLIP_N * CLIP_S0 * 2 ** (L - 1) : -1 },
    uScaleF: { value: CLIP_S0 * 2 ** L },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
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
        uniform sampler2D uNormalTex; uniform sampler2D uDensityTex;
        uniform vec3 uLightDir; uniform vec3 uLightCol; uniform float uHMSize; uniform float uNight;
        float hDetailF(vec2 xz) {
          return (texture(uDetailTex, xz / 41.0).r - 0.5) * 1.1 + (texture(uDetailTex, xz / 6.3 + 0.37).r - 0.5) * 0.14
               + (texture(uDetailTex, xz / 1.3 + 0.71).r - 0.5) * 0.025;
        }`)
      .replace('#include <clipping_planes_fragment>', `
        if (uPrevHalf > 0.0) { vec2 pd = abs(vWPos.xz - uPrevOrigin); if (max(pd.x, pd.y) < uPrevHalf - uScaleF * 0.6) discard; }
        #include <clipping_planes_fragment>`)
      .replace('float tShadow = texture(uShadowTex, vWPos.xz / uWorld).r;', `float tShadow = texture(uShadowTex, vWPos.xz / uWorld).r;
        vec2 p = vWPos.xz;
        float camDist = length(vWPos - cameraPosition);
        vec4 nd = texture(uNormalTex, p / uWorld);
        vec3 nb = normalize(vec3(nd.x, sqrt(max(1.0 - nd.x * nd.x - nd.y * nd.y, 0.0)), nd.y));
        vec2 gB = -nb.xz / max(nb.y, 0.05);
        float e = 0.06;
        vec2 gD = vec2(hDetailF(p + vec2(e, 0.0)) - hDetailF(p - vec2(e, 0.0)), hDetailF(p + vec2(0.0, e)) - hDetailF(p - vec2(0.0, e))) / (2.0 * e);
        // Ondulaciones del viento en la nieve (sastrugi), alargadas en la dirección del viento.
        vec2 wdir = normalize(vec2(0.42, 0.91));
        vec2 rp = vec2(dot(p, wdir), dot(p, vec2(-wdir.y, wdir.x)));
        float re = 0.05;
        float r0 = texture(uDetailTex, vec2(rp.x / 9.0, rp.y / 1.4)).r;
        float rx = texture(uDetailTex, vec2((rp.x + re) / 9.0, rp.y / 1.4)).r;
        float ry = texture(uDetailTex, vec2(rp.x / 9.0, (rp.y + re) / 1.4)).r;
        vec2 gR = vec2(rx - r0, ry - r0) / re * 0.1;
        gR = gR.x * wdir + gR.y * vec2(-wdir.y, wdir.x);
        gD += gR * (1.0 - smoothstep(15.0, 90.0, camDist));
        gD *= 1.0 - smoothstep(40.0, 400.0, camDist);
        vec3 N = normalize(vec3(-(gB.x + gD.x), 1.0, -(gB.y + gD.y)));
        float curv = nd.z, ao = nd.w;
        float n1 = texture(uDetailTex, p / 23.0).r, n2 = texture(uDetailTex, p / 3.1).r, n3 = texture(uDetailTex, p / 150.0).r;

        // Dónde se queda la nieve: poca pendiente, zonas cóncavas, sotavento.
        float thr = mix(0.88, 0.5, uAccum);
        // Canales de nieve verticales en las paredes y más nieve cuanto más alto.
        float streak = texture(uDetailTex, vec2((p.x + p.y) * 0.012 + n3 * 0.3, vWPos.y * 0.0025)).r;
        float steep = 1.0 - smoothstep(0.55, 0.85, nb.y);
        float cover = nb.y + (n1 - 0.5) * 0.2 + (n3 - 0.5) * 0.12 + clamp(curv * 0.03, -0.12, 0.15)
                    + steep * (streak - 0.45) * 0.45 + clamp(vWPos.y / 1500.0, 0.0, 1.0) * 0.06;
        float snow = smoothstep(thr - 0.05, thr + 0.04, cover);
        snow *= smoothstep(thr - 0.2, thr - 0.05, N.y + (n2 - 0.5) * 0.1);

        float strata = texture(uDetailTex, vec2(vWPos.y * 0.03 + n1 * 0.9 + n3 * 2.0, (p.x - p.y) * 0.0015)).r;
        vec3 rock = mix(vec3(0.05, 0.048, 0.046), vec3(0.2, 0.185, 0.17), 0.4 + 0.25 * strata + 0.35 * n3);
        // Estrías verticales y manchas de óxido/liquen.
        float stria = texture(uDetailTex, vec2((p.x - p.y) * 0.05, vWPos.y * 0.006)).r;
        rock *= 0.55 + 0.6 * stria + 0.35 * n2 * n1;
        rock = mix(rock, rock * vec3(1.25, 1.0, 0.78), smoothstep(0.55, 0.8, n3) * 0.6);
        rock *= mix(1.0, 0.6, (1.0 - ao) * 0.8);
        vec3 snowCol = vec3(0.9, 0.93, 0.97) * (0.94 + 0.06 * n2);
        vec3 albedo = mix(rock, snowCol, snow);

        // Bosque visto de lejos: los árboles de verdad solo existen cerca.
        float dens = texture(uDensityTex, p / uWorld).r;
        float farF = smoothstep(380.0, 520.0, camDist);
        vec3 forest = mix(vec3(0.03, 0.045, 0.035), vec3(0.45, 0.48, 0.5), 0.35 * uAccum * n1);
        albedo = mix(albedo, forest, dens * farF * (0.75 + 0.25 * n2));
        albedo *= 1.0 - dens * (1.0 - farF) * 0.12;

        diffuseColor.rgb = albedo;
        roughnessFactor = mix(0.92, 0.72, snow);
        normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
        nonPerturbedNormal = normal;
        float snowMask = snow * (1.0 - dens * farF);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // Destellos de cristales de hielo: cambian al moverse la cámara.
        vec3 Vv = normalize(cameraPosition - vWPos);
        vec3 Hh = normalize(uLightDir + Vv);
        vec2 cellG = floor(p * 40.0);
        float rnd = nzHash12(cellG + floor(Vv.xz * 14.0) * 7.31);
        float glint = step(0.997, rnd) * (1.0 - smoothstep(4.0, 45.0, camDist)) * snowMask * pow(max(dot(N, Hh), 0.0), 4.0);
        totalEmissiveRadiance += uLightCol * glint * 7.0 * (1.0 - 0.6 * uNight);`)
      .replace('reflectedLight.directSpecular *= tShadow;', `reflectedLight.directSpecular *= tShadow;
        reflectedLight.indirectDiffuse *= mix(0.45, 1.0, ao);
        // La nieve en sombra deja pasar algo de luz y se tiñe de azul.
        reflectedLight.indirectDiffuse += snowMask * uAmbient * vec3(0.25, 0.38, 0.65) * 0.25 * (1.0 - tShadow * 0.5);`);
  };
  mat.customProgramCacheKey = () => 'terrain';

  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, U, lu);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uScale; uniform vec2 uOrigin; uniform float uHalf;
        ${GLSL_TERRAIN}`)
      .replace('#include <begin_vertex>', TERRAIN_VERTEX);
  };
  depthMat.customProgramCacheKey = () => 'terrain-depth';

  const mesh = new THREE.Mesh(gridGeo, mat);
  mesh.customDepthMaterial = depthMat;
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  // El relieve se sombrea con su propia textura; el mapa de sombras es para árboles y rocas.
  mesh.castShadow = false;
  mesh.userData.lu = lu;
  scene.add(mesh);
  terrainLevels.push(mesh);
}

function updateClipmap(cx, cz) {
  let prev = null;
  for (let L = 0; L < CLIP_LEVELS; L++) {
    const lu = terrainLevels[L].userData.lu;
    const snap = 2 * lu.uScale.value;
    lu.uOrigin.value.set(Math.floor(cx / snap) * snap, Math.floor(cz / snap) * snap);
    if (prev) lu.uPrevOrigin.value.copy(prev);
    prev = lu.uOrigin.value;
  }
}

// ---------------------------------------------------------------------------
// Cielo
// ---------------------------------------------------------------------------
const skyMat = new THREE.ShaderMaterial({
  uniforms: U,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; uniform float uNight; uniform float uCloud; uniform vec2 uCloudOff; uniform vec3 uLightCol; uniform vec3 uAmbient; uniform vec3 uLightDir;
    varying vec3 vDir;
    ${GLSL_HASH}
    ${GLSL_SKY}
    float vnoise(vec2 x) {
      vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(nzHash12(i), nzHash12(i + vec2(1, 0)), u.x), mix(nzHash12(i + vec2(0, 1)), nzHash12(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) { float a = 0.0, b = 0.5; for (int i = 0; i < 6; i++) { a += b * vnoise(p); p = p * 2.03 + 17.1; b *= 0.5; } return a; }
    void main() {
      vec3 rd = normalize(vDir);
      vec3 col = skyBase(rd);
      float mu = dot(rd, uSunDir);
      // Disco solar (se apaga con nubes densas).
      col += uSunGlow * smoothstep(0.99985, 0.99995, mu) * 60.0 * (1.0 - uCloud * 0.85);
      // Estrellas y luna.
      if (uNight > 0.01 && rd.y > 0.0) {
        vec3 sd = rd * 300.0;
        vec2 g = floor(vec2(atan(sd.z, sd.x) * 160.0, asin(rd.y) * 160.0));
        float s = nzHash12(g);
        float tw = 0.7 + 0.3 * sin(uTime * 3.0 + s * 50.0);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.996, 1.0, s) * tw * uNight * 0.9 * smoothstep(0.0, 0.15, rd.y) * (1.0 - uCloud);
        float mm = dot(rd, uLightDir);
        col += vec3(0.8, 0.85, 0.95) * smoothstep(0.9997, 0.99985, mm) * uNight * 3.0 * (1.0 - uCloud * 0.9);
        col += vec3(0.4, 0.5, 0.7) * pow(max(mm, 0.0), 60.0) * uNight * 0.15;
      }
      // Capa de nubes a unos 3 km.
      if (rd.y > 0.0) {
        vec2 cp = rd.xz / (rd.y + 0.06) * 1.3 + uCloudOff;
        float n = fbm(cp * 0.9);
        float cov = mix(0.75, 0.25, uCloud);
        float c = smoothstep(cov - 0.1, cov + 0.3, n);
        c = mix(c, 1.0, smoothstep(0.75, 1.0, uCloud) * 0.85);
        float thick = smoothstep(cov, cov + 0.5, fbm(cp * 0.9 + vec2(0.4, 0.2)));
        vec3 cLit = uAmbient * 1.15 + uLightCol * 0.35 * (1.0 - thick * 0.7) * (0.6 + 0.6 * pow(max(mu, 0.0), 6.0));
        vec3 cloudCol = mix(cLit, uAmbient * 0.6, thick * 0.6);
        float fade = smoothstep(0.0, 0.12, rd.y);
        col = mix(col, cloudCol, c * fade);
        col = mix(col, fogColorFor(rd), (1.0 - fade) * c * 0.6);
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat);
sky.scale.setScalar(20000);
sky.renderOrder = -10;
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Luces
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const SH = 90;
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 1600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.06;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);

// ---------------------------------------------------------------------------
// Árboles y rocas
// ---------------------------------------------------------------------------
function conifer(tiers, seg, rnd) {
  const pos = [], col = [], idx = [];
  const add = (x, y, z, c) => { pos.push(x, y, z); col.push(...c); return pos.length / 3 - 1; };
  const bark = [0.07, 0.045, 0.03], needle = [0.022, 0.042, 0.028], needleDark = [0.012, 0.025, 0.018];
  // Tronco.
  const tb = pos.length / 3;
  for (let s = 0; s <= seg; s++) {
    const a = s / seg * Math.PI * 2;
    add(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28, bark);
    add(Math.cos(a) * 0.1, 7, Math.sin(a) * 0.1, bark);
  }
  for (let s = 0; s < seg; s++) { const a = tb + s * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  // Pisos de ramas: conos que cuelgan, cada vez más pequeños.
  for (let t = 0; t < tiers; t++) {
    const k = t / tiers;
    const y0 = 1.3 + k * 7.8;
    const R = 2.7 * (1 - k * 0.85) * (0.9 + rnd() * 0.2);
    const h = 2.6 * (1 - k * 0.35);
    const base = pos.length / 3;
    const apex = add(0, y0 + h, 0, needle);
    for (let s = 0; s <= seg; s++) {
      const a = s / seg * Math.PI * 2 + t * 0.7;
      const r = R * (0.82 + rnd() * 0.3);
      const droop = -0.35 - rnd() * 0.35;
      add(Math.cos(a) * r * 0.55, y0 + h * 0.4, Math.sin(a) * r * 0.55, needle);
      add(Math.cos(a) * r, y0 + droop, Math.sin(a) * r, needleDark);
    }
    for (let s = 0; s < seg; s++) {
      const m0 = base + 1 + s * 2, m1 = m0 + 2;
      idx.push(apex, m1, m0);
      idx.push(m0, m1, m0 + 1, m0 + 1, m1, m1 + 1);
    }
    // Cara inferior para que el árbol no se vea hueco desde abajo.
    const under = add(0, y0 - 0.1, 0, needleDark);
    for (let s = 0; s < seg; s++) { const o0 = base + 2 + s * 2, o1 = o0 + 2; idx.push(under, o0, o1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function boulder(rnd) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const o = [rnd() * 10, rnd() * 10, rnd() * 10];
  const n3 = (x, y, z) => Math.sin(x * 1.7 + o[0]) * Math.sin(y * 2.3 + o[1]) * Math.sin(z * 1.9 + o[2])
    + 0.5 * Math.sin(x * 4.1 + o[1]) * Math.sin(y * 3.7 + o[2]) * Math.sin(z * 4.3 + o[0]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let r = 1 + 0.22 * n3(x, y, z);
    // Facetas: aplana un poco hacia planos aleatorios.
    r = Math.min(r, 1.05 - 0.15 * Math.abs(Math.sin(x * 3 + y * 2)));
    p.setXYZ(i, x * r * 1.2, y * r * 0.75, z * r);
  }
  g.deleteAttribute('uv');
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = 0.08 + 0.05 * Math.abs(n3(p.getX(i) * 2, p.getY(i) * 2, p.getZ(i) * 2)); c.set([v, v * 0.97, v * 0.93], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

function propMaterial(sway) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = s => injectCommon(s, { snowOnTop: true, sway });
  m.customProgramCacheKey = () => 'prop' + sway;
  return m;
}
const treeRnd = mulberry(99);
const TREE_NEAR = 170, TREE_FAR = 520, TREE_CELL = 8.5;
const treeNear = new THREE.InstancedMesh(conifer(8, 11, treeRnd), propMaterial(true), 2600);
const treeFar = new THREE.InstancedMesh(conifer(4, 6, treeRnd), propMaterial(true), 14000);
const ROCK_R = 260, ROCK_CELL = 13;
const rocks = new THREE.InstancedMesh(boulder(mulberry(5)), propMaterial(false), 2000);
for (const m of [treeNear, treeFar, rocks]) {
  m.frustumCulled = false;
  m.count = 0;
  m.castShadow = m !== treeFar;
  m.receiveShadow = true;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m);
}
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
const tmpC = new THREE.Color();
let propCenter = { x: 1e9, z: 1e9 };

function updateProps(cx, cz, force = false) {
  if (!force && Math.hypot(cx - propCenter.x, cz - propCenter.z) < 30) return;
  propCenter = { x: cx, z: cz };
  const cells = WORLD / TREE_CELL;
  let nN = 0, nF = 0;
  const r = Math.ceil(TREE_FAR / TREE_CELL);
  const ci = Math.floor(cx / TREE_CELL), cj = Math.floor(cz / TREE_CELL);
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    const wi = wrap(i, cells), wj = wrap(j, cells);
    const x = (i + hash3(wi, wj, 1)) * TREE_CELL, z = (j + hash3(wi, wj, 2)) * TREE_CELL;
    const d = Math.hypot(x - cx, z - cz);
    if (d > TREE_FAR) continue;
    const dens = densityAt(x, z, 0);
    if (hash3(wi, wj, 3) > dens * 0.95) continue;
    const s = 0.55 + hash3(wi, wj, 4) * 0.9 + (dens > 0.7 ? 0.25 : 0);
    tmpP.set(x, heightAt(x, z) - 0.25 * s, z);
    tmpQ.setFromAxisAngle(yAxis, hash3(wi, wj, 5) * Math.PI * 2);
    const lean = 0.95 + hash3(wi, wj, 6) * 0.1;
    tmpS.set(s * lean, s * (0.9 + hash3(wi, wj, 7) * 0.3), s * lean);
    tmpM.compose(tmpP, tmpQ, tmpS);
    const tint = 0.8 + hash3(wi, wj, 8) * 0.45;
    tmpC.setRGB(tint, tint * (0.95 + hash3(wi, wj, 9) * 0.1), tint);
    if (d < TREE_NEAR && nN < treeNear.instanceMatrix.count) { treeNear.setMatrixAt(nN, tmpM); treeNear.setColorAt(nN, tmpC); nN++; }
    else if (nF < treeFar.instanceMatrix.count) { treeFar.setMatrixAt(nF, tmpM); treeFar.setColorAt(nF, tmpC); nF++; }
  }
  treeNear.count = nN; treeFar.count = nF;

  const rc = WORLD / ROCK_CELL;
  const rr = Math.ceil(ROCK_R / ROCK_CELL);
  const ri = Math.floor(cx / ROCK_CELL), rj = Math.floor(cz / ROCK_CELL);
  let nR = 0;
  for (let j = rj - rr; j <= rj + rr; j++) for (let i = ri - rr; i <= ri + rr; i++) {
    const wi = wrap(i, rc), wj = wrap(j, rc);
    const x = (i + hash3(wi, wj, 11)) * ROCK_CELL, z = (j + hash3(wi, wj, 12)) * ROCK_CELL;
    if (Math.hypot(x - cx, z - cz) > ROCK_R) continue;
    const dens = densityAt(x, z, 1) * 0.5 + 0.008;
    if (hash3(wi, wj, 13) > dens) continue;
    const s = 0.4 + Math.pow(hash3(wi, wj, 14), 2.5) * 3.8;
    tmpP.set(x, heightAt(x, z) - 0.35 * s, z);
    tmpQ.setFromEuler(new THREE.Euler(hash3(wi, wj, 15) * 0.4, hash3(wi, wj, 16) * 6.3, hash3(wi, wj, 17) * 0.4));
    tmpS.set(s, s, s);
    tmpM.compose(tmpP, tmpQ, tmpS);
    tmpC.setRGB(1, 1, 1);
    if (nR < rocks.instanceMatrix.count) { rocks.setMatrixAt(nR, tmpM); rocks.setColorAt(nR, tmpC); nR++; }
  }
  rocks.count = nR;
  for (const m of [treeNear, treeFar, rocks]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Copos de nieve en 3D y nieve levantada por el viento
// ---------------------------------------------------------------------------
const FLAKES = 90000, DRIFTS = 24000;
function particleGeo(n, seed) {
  const r = mulberry(seed);
  const a = new Float32Array(n * 4);
  for (let i = 0; i < a.length; i++) a[i] = r();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(a, 4));
  return g;
}
const flakeU = {
  uBox: { value: new THREE.Vector3(70, 36, 70) },
  uOffset: { value: new THREE.Vector3() },
  uFlake: { value: 1 },
  uTurb: { value: 0.4 },
  uProj: { value: 800 },
  uAlpha: { value: 1 },
};
const PARTICLE_FS = /* glsl */`
  uniform vec3 uLightCol; uniform vec3 uAmbient;
  varying float vAlpha; varying vec3 vW; varying float vLit;
  ${GLSL_SKY}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    if (a < 0.004) discard;
    vec3 col = 0.9 * (uAmbient * 0.42 + uLightCol * 0.28 * vLit);
    col = applyFog(col, vW);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const flakeMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...flakeU },
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */`
    attribute vec4 aSeed;
    uniform vec3 uBox; uniform vec3 uOffset; uniform float uFlake; uniform float uTurb; uniform float uProj; uniform float uTime; uniform float uAlpha;
    uniform sampler2D uShadowTex; uniform float uWorld;
    varying float vAlpha; varying vec3 vW; varying float vLit;
    void main() {
      float r = aSeed.w;
      vec3 p = aSeed.xyz * uBox;
      p += uOffset * vec3(0.85 + 0.3 * r, 0.75 + 0.5 * r, 0.85 + 0.3 * r);
      float w = uTime * (0.6 + r * 1.2) + r * 40.0;
      p.x += sin(w) * uTurb * 0.7;
      p.z += cos(w * 0.8 + 1.3) * uTurb * 0.7;
      p.y += sin(w * 1.3) * uTurb * 0.25;
      p = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5 + cameraPosition;
      vW = p;
      vec4 mv = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z;
      float size = uFlake * (0.012 + 0.022 * r * r);
      float px = size * uProj / max(dist, 0.05);
      gl_PointSize = clamp(px, 1.2, 40.0);
      float horiz = length(p.xz - cameraPosition.xz);
      vAlpha = clamp(px / 1.2, 0.0, 1.0) * smoothstep(0.25, 0.9, dist) * (1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, horiz)) * uAlpha;
      vLit = texture(uShadowTex, p.xz / uWorld).r;
    }`,
  fragmentShader: PARTICLE_FS,
});
const flakes = new THREE.Points(particleGeo(FLAKES, 3), flakeMat);
flakes.frustumCulled = false;
flakes.renderOrder = 5;
scene.add(flakes);

const driftU = { uDriftOff: { value: new THREE.Vector2() }, uDriftAmt: { value: 0 } };
const driftMat = new THREE.ShaderMaterial({
  uniforms: { ...U, ...flakeU, ...driftU },
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */`
    attribute vec4 aSeed;
    uniform vec2 uDriftOff; uniform float uDriftAmt; uniform float uProj; uniform float uTime; uniform vec2 uWindDir; uniform float uWindStr;
    uniform sampler2D uShadowTex;
    varying float vAlpha; varying vec3 vW; varying float vLit;
    ${GLSL_TERRAIN}
    void main() {
      float r = aSeed.w;
      float box = 56.0;
      vec2 xz = aSeed.xy * box + uDriftOff * (0.7 + 0.6 * r);
      xz += vec2(sin(uTime * 2.0 + r * 30.0), cos(uTime * 1.7 + r * 20.0)) * 0.6;
      xz = mod(xz - cameraPosition.xz + box * 0.5, box) - box * 0.5 + cameraPosition.xz;
      float lift = pow(aSeed.z, 3.0) * (0.3 + 2.2 * uWindStr) + 0.03;
      lift *= 0.6 + 0.4 * sin(uTime * 3.0 + r * 60.0);
      vec3 p = vec3(xz.x, terrainH(xz) + lift, xz.y);
      vW = p;
      vec4 mv = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z;
      float px = (0.03 + 0.05 * r) * uProj / max(dist, 0.05);
      gl_PointSize = clamp(px, 1.0, 50.0);
      float horiz = length(xz - cameraPosition.xz);
      vAlpha = 0.35 * uDriftAmt * smoothstep(0.4, 1.2, dist) * (1.0 - smoothstep(box * 0.3, box * 0.5, horiz)) * clamp(px, 0.0, 1.0);
      vLit = texture(uShadowTex, p.xz / uWorld).r;
    }`,
  fragmentShader: PARTICLE_FS,
});
const drifts = new THREE.Points(particleGeo(DRIFTS, 4), driftMat);
drifts.frustumCulled = false;
drifts.renderOrder = 4;
scene.add(drifts);

// ---------------------------------------------------------------------------
// Luz según la hora y el tiempo
// ---------------------------------------------------------------------------
const C = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const lerpC = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lastShadowDir = new THREE.Vector3();
let shadowDirty = 0;

function updateLighting(dt) {
  const hour = params.hour.v;
  const ang = (hour - 6) / 12 * Math.PI;           // 6h amanece, 18h anochece
  const elev = Math.sin(ang) * 0.95;                // ~54° a mediodía
  const az = (hour / 24) * Math.PI * 2 + 0.6;
  const ce = Math.cos(Math.asin(Math.max(-1, Math.min(1, elev))));
  const sunDir = new THREE.Vector3(Math.sin(az) * ce, elev, Math.cos(az) * ce).normalize();
  U.uSunDir.value.copy(sunDir);

  const day = smooth(-0.1, 0.25, sunDir.y);
  const golden = Math.max(0, 1 - Math.abs(sunDir.y - 0.05) / 0.2);
  const night = 1 - smooth(-0.2, 0.0, sunDir.y);
  const cloud = Math.max(params.clouds.v, params.intensity.v * 0.95);
  const overcast = smooth(0.35, 1.0, cloud);

  // Sol: blanco al mediodía, anaranjado al ocaso; se apaga bajo el horizonte.
  const sunCol = lerpC(C(1.0, 0.95, 0.88), C(1.0, 0.5, 0.24), golden).multiplyScalar(smooth(-0.04, 0.1, sunDir.y) * 3.2);
  let zen = lerpC(C(0.004, 0.007, 0.018), C(0.09, 0.2, 0.5), day);
  let hor = lerpC(C(0.012, 0.018, 0.035), C(0.5, 0.62, 0.78), day);
  hor = lerpC(hor, C(0.85, 0.5, 0.35), golden * 0.55);
  zen = lerpC(zen, C(0.18, 0.2, 0.36), golden * 0.35);
  const glow = lerpC(C(1.0, 0.9, 0.75), C(1.0, 0.45, 0.2), golden).multiplyScalar(day * (1 - overcast * 0.8) * 1.6);

  // Cielo cubierto: todo hacia el gris, más claro de día.
  const grey = (hor.r + hor.g + hor.b) / 3 * 0.85 + (zen.r + zen.g + zen.b) / 3 * 0.15;
  zen = lerpC(zen, C(grey * 0.92, grey * 0.96, grey * 1.04), overcast * 0.9);
  hor = lerpC(hor, C(grey, grey * 1.02, grey * 1.06), overcast * 0.85);

  // Luna: luz fría por la noche, desde otra dirección.
  const moonDir = new THREE.Vector3(-sunDir.x, Math.max(0.45, -sunDir.y), -sunDir.z).normalize();
  const moonCol = C(0.32, 0.4, 0.62).multiplyScalar(0.55 * night);
  const useMoon = sunDir.y < -0.02;
  const lightDir = useMoon ? moonDir : sunDir;
  const lightCol = useMoon ? moonCol : sunCol.clone();
  lightCol.multiplyScalar(1 - overcast * 0.78);
  if (useMoon) zen.add(C(0.006, 0.01, 0.022).multiplyScalar(night)), hor.add(C(0.01, 0.014, 0.028).multiplyScalar(night));

  const amb = lerpC(zen, hor, 0.55).multiplyScalar(1.6);
  U.uZenith.value.copy(zen);
  U.uHorizon.value.copy(hor);
  U.uSunGlow.value.copy(glow);
  U.uLightDir.value.copy(lightDir);
  U.uLightCol.value.copy(lightCol);
  U.uAmbient.value.copy(amb);
  U.uNight.value = night;
  U.uCloud.value = cloud;

  sun.color.copy(lightCol);
  sun.intensity = 1;
  hemi.color.copy(amb).multiplyScalar(1.05);
  hemi.groundColor.copy(amb).multiplyScalar(0.55).add(lightCol.clone().multiplyScalar(0.08 * Math.max(lightDir.y, 0)));
  hemi.intensity = 1;

  // Niebla: bruma de fondo siempre, más la de la nevada y la de valle.
  const intensity = params.intensity.v;
  U.uHaze.value = 1 / 60000 + intensity * intensity * (1 / 700) + params.fog.v * (1 / 9000);
  U.uFogDensity.value = params.fog.v * 0.004;
  U.uFogFalloff.value = 1 / 180;
  U.uAccum.value = params.accumulation.v;
  renderer.toneMappingExposure = params.exposure.v * (useMoon ? 1.8 : 1.0);

  // La sombra del relieve solo se recalcula si la luz se ha movido.
  shadowDirty += dt;
  if (lastShadowDir.distanceTo(lightDir) > 0.003 && shadowDirty > 0.15) {
    shadowMat.uniforms.uL.value.copy(lightDir);
    runPass(shadowMat, shadowRT);
    lastShadowDir.copy(lightDir);
    shadowDirty = 0;
  }
}

// ---------------------------------------------------------------------------
// Sonido: viento (ruido filtrado) y pasos sobre nieve
// ---------------------------------------------------------------------------
const audio = {
  ctx: null, wind: null, windGain: null, whistle: null, whistleGain: null, steps: [], master: null,
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = this.ctx = new Ctx();
    this.master = ctx.createGain();
    this.master.gain.value = document.getElementById('sound').checked ? 1 : 0;
    this.master.connect(ctx.destination);
    // Ruido marrón para el viento.
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    this.wind = ctx.createBiquadFilter(); this.wind.type = 'lowpass'; this.wind.frequency.value = 500;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    src.connect(this.wind).connect(this.windGain).connect(this.master);
    src.start();
    // Silbido agudo con las rachas.
    const wbuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const wd = wbuf.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    const wsrc = ctx.createBufferSource(); wsrc.buffer = wbuf; wsrc.loop = true;
    this.whistle = ctx.createBiquadFilter(); this.whistle.type = 'bandpass'; this.whistle.Q.value = 8; this.whistle.frequency.value = 900;
    this.whistleGain = ctx.createGain(); this.whistleGain.gain.value = 0;
    wsrc.connect(this.whistle).connect(this.whistleGain).connect(this.master);
    wsrc.start();
    // Pasos: ráfagas de crujidos granulares.
    for (let v = 0; v < 4; v++) {
      const n = Math.floor(ctx.sampleRate * 0.22);
      const b = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = b.getChannelData(0);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const env = Math.pow(1 - t, 2.2) * Math.min(1, t * 30);
        const grain = Math.random() < 0.08 ? (Math.random() * 2 - 1) * 2.5 : (Math.random() * 2 - 1) * 0.4;
        lp += (grain - lp) * 0.55;
        d[i] = lp * env * 0.5;
      }
      this.steps.push(b);
    }
  },
  update(wind, gust) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.05 + wind * 0.55 * gust, t, 0.3);
    this.wind.frequency.setTargetAtTime(250 + wind * 900 * gust, t, 0.3);
    this.whistleGain.gain.setTargetAtTime(Math.max(0, wind - 0.4) * 0.12 * gust, t, 0.4);
    this.whistle.frequency.setTargetAtTime(700 + gust * 500, t, 0.5);
  },
  step(volume) {
    if (!this.ctx || !this.steps.length) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.steps[Math.floor(Math.random() * this.steps.length)];
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    const g = this.ctx.createGain(); g.gain.value = volume;
    s.connect(f).connect(g).connect(this.master);
    s.start();
  },
};
document.getElementById('sound').addEventListener('change', e => {
  if (audio.master) audio.master.gain.value = e.target.checked ? 1 : 0;
});

// ---------------------------------------------------------------------------
// Jugador
// ---------------------------------------------------------------------------
const player = { x: 0, z: 0, y: 0, vy: 0, yaw: 0, pitch: 0, ground: true, fly: false, step: 0, bob: 0, speed: 0 };
const keys = new Set();
let playing = false;
const touchMove = { x: 0, y: 0 };

function respawn() {
  const s = findSpawn();
  player.x = s.x; player.z = s.z; player.yaw = s.yaw + Math.PI; player.pitch = 0.08;
  player.y = heightAt(s.x, s.z); player.vy = 0; player.fly = false;
  updateProps(player.x, player.z, true);
}

addEventListener('keydown', e => {
  if (!playing) return;
  keys.add(e.code);
  if (e.code === 'KeyF') player.fly = !player.fly;
  if (e.code === 'Space' && player.ground && !player.fly) { player.vy = 4.2; player.ground = false; }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

document.addEventListener('mousemove', e => {
  if (!playing || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022));
});

function setPlaying(on) {
  playing = on;
  document.body.classList.toggle('playing', on);
  overlay.classList.toggle('off', on);
  if (!on) keys.clear();
}
enterBtn.addEventListener('click', () => {
  audio.start();
  enterBtn.textContent = 'Seguir caminando';
  if (isTouch) { setPlaying(true); return; }
  const p = canvas.requestPointerLock();
  if (p && p.catch) p.catch(() => setPlaying(true));
});
document.addEventListener('pointerlockchange', () => setPlaying(document.pointerLockElement === canvas));
document.getElementById('pause').addEventListener('click', () => setPlaying(false));
document.getElementById('respawn').addEventListener('click', respawn);
document.getElementById('newworld').addEventListener('click', () => {
  statusEl.textContent = 'Generando…';
  setTimeout(() => { generateWorld(world.seed + 1); respawn(); statusEl.textContent = ''; }, 30);
});

// Táctil: joystick a la izquierda, arrastrar para mirar en el resto.
(() => {
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  let stickId = null, lookId = null, lx = 0, ly = 0;
  canvas.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      const r = stick.getBoundingClientRect();
      if (stickId === null && t.clientX < r.right + 40 && t.clientY > r.top - 40) stickId = t.identifier;
      else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        const r = stick.getBoundingClientRect();
        let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        touchMove.x = dx; touchMove.y = -dy;
        knob.style.transform = `translate(${dx * 37}px, ${dy * 37}px)`;
      } else if (t.identifier === lookId) {
        player.yaw -= (t.clientX - lx) * 0.005;
        player.pitch = Math.max(-1.4, Math.min(1.4, player.pitch - (t.clientY - ly) * 0.005));
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; touchMove.x = touchMove.y = 0; knob.style.transform = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);
})();

function updatePlayer(dt) {
  let fx = 0, fz = 0;
  if (playing) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    fx += touchMove.x; fz += touchMove.y;
  }
  const len = Math.hypot(fx, fz);
  if (len > 1) { fx /= len; fz /= len; }
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  // Adelante es -z en el espacio de la cámara.
  let dx = (-sy * fz + cy * fx), dz = (-cy * fz - sy * fx);

  if (player.fly) {
    const sp = run ? 260 : 60;
    const cp = Math.cos(player.pitch), spp = Math.sin(player.pitch);
    player.x += (-sy * cp * fz + cy * fx) * sp * dt;
    player.z += (-cy * cp * fz - sy * fx) * sp * dt;
    player.y += spp * fz * sp * dt;
    if (keys.has('Space')) player.y += sp * 0.5 * dt;
    if (keys.has('KeyC') || keys.has('ControlLeft')) player.y -= sp * 0.5 * dt;
    const g = heightAt(player.x, player.z);
    player.y = Math.max(player.y, g + 0.3);
    player.speed = 0;
  } else {
    let sp = run ? 7.5 : 3.2;
    const g0 = heightAt(player.x, player.z);
    // Cuesta arriba se va más lento; las paredes muy empinadas no se pueden subir.
    if (len > 0.01) {
      const ahead = heightAt(player.x + dx * 0.8, player.z + dz * 0.8);
      const grade = (ahead - g0) / 0.8;
      if (grade > 0) sp *= Math.max(0.15, 1 - grade * 0.9);
      if (grade > 1.5) sp = 0;
    }
    player.x += dx * sp * dt;
    player.z += dz * sp * dt;
    const g = heightAt(player.x, player.z);
    player.vy -= 9.8 * dt;
    player.y += player.vy * dt;
    if (player.y <= g) { player.y = g; player.vy = 0; player.ground = true; }
    else if (player.ground && player.y - g < 0.6 && player.vy <= 0) { player.y = g; player.vy = 0; }
    else player.ground = false;
    player.speed = sp * len;
    // Pasos y balanceo de la cabeza.
    if (player.ground && player.speed > 0.2) {
      const stride = run ? 1.1 : 0.75;
      const prev = player.step;
      player.step += player.speed * dt / stride;
      if (Math.floor(player.step) !== Math.floor(prev)) audio.step(run ? 0.9 : 0.6);
    }
  }
  // El mundo se repite: mantener la posición dentro de una tesela.
  const half = WORLD / 2;
  if (player.x > half) player.x -= WORLD; else if (player.x < -half) player.x += WORLD;
  if (player.z > half) player.z -= WORLD; else if (player.z < -half) player.z += WORLD;

  const bobAmt = player.fly ? 0 : Math.min(1, player.speed / 3);
  player.bob += (bobAmt - player.bob) * Math.min(1, dt * 6);
  const ph = player.step * Math.PI;
  camera.position.set(player.x, player.y + (player.fly ? 0 : EYE) + Math.abs(Math.sin(ph)) * 0.05 * player.bob, player.z);
  camera.rotation.set(player.pitch, player.yaw, Math.sin(ph) * 0.006 * player.bob);
}

// ---------------------------------------------------------------------------
// Bucle
// ---------------------------------------------------------------------------
let last = performance.now(), simTime = 0, frames = 0, fpsT = last, fps = 60;
const offset = new THREE.Vector3(), driftOff = new THREE.Vector2(), cloudOff = new THREE.Vector2();
let windX = 0, windZ = 0, gustNow = 1;
const compass = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  simTime += dt;
  updateTween(now);
  if (document.getElementById('timeflow').checked && !tween) setParam('hour', (params.hour.v + dt / 30) % 24);

  // Viento con rachas.
  const g = params.gusts.v;
  gustNow = 1 + g * (0.55 * Math.sin(simTime * 0.53) * Math.sin(simTime * 0.21 + 1.7) + 0.25 * Math.sin(simTime * 1.9 + Math.sin(simTime * 0.7) * 2));
  const wd = params.windDir.v * Math.PI / 180;
  const ws = params.windSpeed.v * 14 * Math.max(0.2, gustNow);
  windX += (Math.cos(wd) * ws - windX) * Math.min(1, dt * 1.5);
  windZ += (Math.sin(wd) * ws - windZ) * Math.min(1, dt * 1.5);
  const wl = Math.hypot(windX, windZ);
  U.uWindDir.value.set(windX / (wl || 1), windZ / (wl || 1));
  U.uWindStr.value = Math.min(1.5, wl / 14);
  U.uTime.value = simTime;

  const fall = params.fallSpeed.v * 1.1;
  offset.x += windX * dt; offset.z += windZ * dt; offset.y -= fall * dt;
  // Mantener los desplazamientos pequeños para no perder precisión (la caja es periódica).
  const box = flakeU.uBox.value;
  offset.x %= box.x * 1000; offset.z %= box.z * 1000; offset.y %= box.y * 1000;
  flakeU.uOffset.value.copy(offset);
  driftOff.x = (driftOff.x + windX * 1.4 * dt) % 56000; driftOff.y = (driftOff.y + windZ * 1.4 * dt) % 56000;
  driftU.uDriftOff.value.copy(driftOff);
  driftU.uDriftAmt.value = params.drift.v * Math.min(1, params.windSpeed.v * 1.6 + 0.1);
  cloudOff.x += windX * dt * 0.0006; cloudOff.y += windZ * dt * 0.0006;
  U.uCloudOff.value.copy(cloudOff);
  flakeU.uFlake.value = params.flakeSize.v;
  flakeU.uTurb.value = 0.2 + params.gusts.v;
  flakeU.uProj.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const inten = params.intensity.v;
  flakes.geometry.setDrawRange(0, Math.floor(FLAKES * Math.pow(inten, 1.3)));
  flakes.visible = inten > 0.001;
  drifts.visible = driftU.uDriftAmt.value > 0.01;

  updatePlayer(dt);
  updateLighting(dt);
  updateClipmap(camera.position.x, camera.position.z);
  updateProps(player.x, player.z);
  audio.update(Math.min(1, params.windSpeed.v), Math.max(0.2, gustNow));

  sky.position.copy(camera.position);
  // Sombra que sigue al jugador, ajustada a la rejilla de texels para que no tiemble.
  const ld = U.uLightDir.value;
  const texel = (2 * SH) / sun.shadow.mapSize.x;
  const sx = Math.round(player.x / texel) * texel, sz = Math.round(player.z / texel) * texel;
  sun.target.position.set(sx, player.y, sz);
  sun.position.set(sx + ld.x * 700, player.y + ld.y * 700, sz + ld.z * 700);

  renderer.render(scene, camera);

  frames++;
  if (now - fpsT > 1000) {
    fps = frames * 1000 / (now - fpsT);
    frames = 0; fpsT = now;
    if (!(fixedQuality > 0)) {
      const max = Math.min(window.devicePixelRatio || 1, 1.5);
      let pr = pixelRatio;
      if (fps < 40 && pr > 0.5) pr = Math.max(0.5, pr * 0.85);
      else if (fps > 57 && pr < max) pr = Math.min(max, pr * 1.07);
      if (pr !== pixelRatio) { pixelRatio = pr; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); }
    }
  }
  const alt = Math.round(ALT0 + player.y - world.minH);
  const head = compass[Math.round(wrap(-player.yaw, Math.PI * 2) / (Math.PI / 4)) % 8];
  hud.textContent = `${alt.toLocaleString('es-ES')} m · ${params.hour.fmt(params.hour.v)} · ${head}${player.fly ? ' · volando' : ''}` +
    (qs.has('fps') ? ` · ${fps.toFixed(0)} fps` : '');
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
setTimeout(() => {
  try {
    generateWorld(world.seed);
  } catch (e) {
    console.error(e);
    fail('No se pudo generar el terreno: ' + e.message);
  }
  respawn();
  enterBtn.disabled = false;
  enterBtn.textContent = 'Entrar';
  requestAnimationFrame(frame);
}, 50);

// Ganchos para pruebas automáticas.
window.__nieve = { params, setParam, player, world, heightAt, respawn, setPlaying, presets: id => document.querySelector(`[data-preset=${id}]`).click() };
