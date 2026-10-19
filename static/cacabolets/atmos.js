// CaçaBolets: cel, atmosfera i núvols.
//
// - Atmosfera física (Hillaire 2020, "A Scalable and Production Ready Sky and Atmosphere Rendering
//   Technique"): taules de transmitància i de dispersió múltiple, i una taula de la volta del cel que es
//   refà cada fotograma. La perspectiva aèria (el blau de les muntanyes llunyanes) es calcula a cada
//   píxel a partir de la profunditat de l'escena.
// - Núvols volumètrics: una capa de cúmuls amb la base, el gruix i la cobertura que donen les dades
//   del temps, traçada a mitja resolució i acumulada entre fotogrames.
// - Postprocés: bloom, ACES i gra.
//
// Unitats: l'escena és en metres (y = altitud sobre el nivell del mar); l'atmosfera, en quilòmetres.
import * as THREE from 'three';

const RG = 6360, RT = 6460;                          // radi del planeta i del límit de l'atmosfera, km
const RAY_S = [5.802e-3, 13.558e-3, 33.1e-3];         // dispersió de Rayleigh, 1/km
const MIE_S = 3.996e-3, MIE_E = 4.44e-3;              // dispersió i extinció de Mie, 1/km
const OZ_A = [0.65e-3, 1.881e-3, 0.085e-3];           // absorció de l'ozó, 1/km
export const SUN_E = 3.2;                             // il·luminància del sol (unitats de l'escena)
const EARTH_R = 6.36e6;

const GLSL_ATMOS = /* glsl */`
#define PI 3.141592653589793
const float RG = ${RG.toFixed(1)}, RT = ${RT.toFixed(1)};
const vec3 RAY_S = vec3(${RAY_S.join(', ')});
const float MIE_S = ${MIE_S}, MIE_E = ${MIE_E};
const vec3 OZ_A = vec3(${OZ_A.join(', ')});
uniform float uMieScale;
void medium(float h, out vec3 scatR, out float scatM, out vec3 ext) {
  float dR = exp(-h / 8.0), dM = exp(-h / 1.2) * uMieScale, dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
  scatR = RAY_S * dR; scatM = MIE_S * dM;
  ext = scatR + vec3(MIE_E * dM) + OZ_A * dO;
}
// Distància a l'esfera de radi R des d'un punt a distància r del centre, amb cosinus mu respecte de la vertical.
float sphereFar(float r, float mu, float R) { float d = r * r * (mu * mu - 1.0) + R * R; return d < 0.0 ? -1.0 : -r * mu + sqrt(d); }
float sphereNear(float r, float mu, float R) { float d = r * r * (mu * mu - 1.0) + R * R; return d < 0.0 ? -1.0 : -r * mu - sqrt(d); }
float phaseR(float c) { return 3.0 / (16.0 * PI) * (1.0 + c * c); }
float phaseHG(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5)); }
float phaseM(float c) { const float g = 0.8; float g2 = g * g;
  return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + c * c)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
// Parametrització de Bruneton per a la taula de transmitància.
vec2 transUV(float r, float mu) {
  float H = sqrt(RT * RT - RG * RG), rho = sqrt(max(r * r - RG * RG, 0.0));
  float d = max(sphereFar(r, mu, RT), 0.0), dmin = RT - r, dmax = rho + H;
  return vec2((d - dmin) / (dmax - dmin), rho / H);
}
uniform sampler2D uTransLUT; uniform sampler2D uMsLUT;
vec3 transmittance(float r, float mu) {
  // Si el raig toca el terra, el sol no s'hi veu (amb una vora suau per al crepuscle).
  float muH = -sqrt(max(1.0 - (RG / r) * (RG / r), 0.0));
  return texture(uTransLUT, transUV(r, mu)).rgb * smoothstep(muH - 0.004, muH + 0.004, mu);
}
vec3 multiScat(float r, float muS) {
  vec2 uv = vec2(muS * 0.5 + 0.5, (r - RG) / (RT - RG));
  uv = vec2(0.5 / 32.0) + uv * (31.0 / 32.0);
  return texture(uMsLUT, uv).rgb;
}
// Llum dispersada i transmitància entre ro i ro + rd·tMax (km, ro relatiu al centre del planeta).
void integrateAtmos(vec3 ro, vec3 rd, float tMax, vec3 sunDir, float sunE, int N, float jit, out vec3 L, out vec3 T) {
  float r = length(ro), mu = dot(ro, rd) / r;
  float tTop = sphereFar(r, mu, RT), tG = sphereNear(r, mu, RG);
  if (tG > 0.0) tMax = min(tMax, tG);
  tMax = min(tMax, max(tTop, 0.0));
  L = vec3(0.0); T = vec3(1.0);
  if (tMax <= 0.0) return;
  float c = dot(rd, sunDir), pR = phaseR(c), pM = phaseM(c);
  float tPrev = 0.0;
  for (int i = 0; i < 64; i++) {
    if (i >= N) break;
    // Mostres més denses a prop: hi ha més aire i és on es nota.
    float f = (float(i) + jit) / float(N), t = tMax * f * f;
    float tn = tMax * ((float(i) + 1.0) / float(N)) * ((float(i) + 1.0) / float(N));
    float dt = tn - tPrev; tPrev = tn;
    vec3 p = ro + rd * t; float rp = length(p); vec3 up = p / rp;
    float muS = dot(up, sunDir);
    vec3 sR, ext; float sM;
    medium(rp - RG, sR, sM, ext);
    vec3 S = sunE * ((sR * pR + sM * pM) * transmittance(rp, muS) + (sR + sM) * multiScat(rp, muS));
    vec3 sT = exp(-ext * dt);
    L += T * (S - S * sT) / max(ext, vec3(1e-7));
    T *= sT;
  }
}
`;

const VS = /* glsl */`
in vec3 position; in vec2 uv; out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function pass(fs, uniforms, defines = {}) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, defines, depthTest: false, depthWrite: false,
    vertexShader: VS,
    fragmentShader: `precision highp float; precision highp int; precision highp sampler3D;\nin vec2 vUv; layout(location = 0) out vec4 outColor;\n` + fs,
  });
}
function floatRT(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, ...opts,
  });
}

// ---------------------------------------------------------------------------
// Soroll 3D per als núvols (es genera a la GPU una sola vegada)
// ---------------------------------------------------------------------------
const GLSL_NOISE3 = /* glsl */`
uniform float uLayer; uniform float uSize;
vec3 hash33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
// Worley periòdic, invertit (1 als punts).
float worley(vec3 p, float period) {
  vec3 id = floor(p), f = fract(p); float md = 1.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 o = vec3(x, y, z);
    vec3 d = o + hash33(mod(id + o, period)) - f;
    md = min(md, dot(d, d));
  }
  return 1.0 - sqrt(md);
}
float grad3(vec3 p, float period) {
  vec3 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n[8];
  for (int k = 0; k < 8; k++) {
    vec3 o = vec3(k & 1, (k >> 1) & 1, (k >> 2) & 1);
    vec3 g = normalize(hash33(mod(i + o, period)) * 2.0 - 1.0);
    n[k] = dot(g, f - o);
  }
  return mix(mix(mix(n[0], n[1], u.x), mix(n[2], n[3], u.x), u.y), mix(mix(n[4], n[5], u.x), mix(n[6], n[7], u.x), u.y), u.z);
}
float perlinFbm(vec3 p, float period) {
  float a = 0.0, amp = 1.0, sum = 0.0;
  for (int o = 0; o < 6; o++) { a += amp * grad3(p, period); sum += amp; p *= 2.0; period *= 2.0; amp *= 0.5; }
  return a / sum;
}
float worleyFbm(vec3 p, float period) { return worley(p, period) * 0.625 + worley(p * 2.0, period * 2.0) * 0.25 + worley(p * 4.0, period * 4.0) * 0.125; }
float remap(float x, float a, float b, float c, float d) { return c + (x - a) / (b - a) * (d - c); }
`;
const shapeNoiseFS = GLSL_NOISE3 + /* glsl */`
void main() {
  vec3 p = vec3(vUv, (uLayer + 0.5) / uSize);
  float pf = clamp(perlinFbm(p * 4.0, 4.0) * 0.9 + 0.5, 0.0, 1.0);
  float w4 = worleyFbm(p * 4.0, 4.0);
  float pw = clamp(remap(pf, 0.0, 1.0, w4, 1.0), 0.0, 1.0);
  outColor = vec4(pw, w4, worleyFbm(p * 8.0, 8.0), worleyFbm(p * 16.0, 16.0));
}`;
const detailNoiseFS = GLSL_NOISE3 + /* glsl */`
void main() {
  vec3 p = vec3(vUv, (uLayer + 0.5) / uSize);
  outColor = vec4(worleyFbm(p * 2.0, 2.0), worleyFbm(p * 4.0, 4.0), worleyFbm(p * 8.0, 8.0), 1.0);
}`;

// ---------------------------------------------------------------------------
// Passos de les taules de l'atmosfera
// ---------------------------------------------------------------------------
const transFS = GLSL_ATMOS + /* glsl */`
void main() {
  float H = sqrt(RT * RT - RG * RG), rho = H * vUv.y, r = sqrt(rho * rho + RG * RG);
  float dmin = RT - r, dmax = rho + H, d = dmin + vUv.x * (dmax - dmin);
  float mu = d == 0.0 ? 1.0 : clamp((H * H - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
  vec3 od = vec3(0.0);
  const int N = 40;
  float dt = d / float(N);
  for (int i = 0; i < N; i++) {
    float t = (float(i) + 0.5) * dt;
    float h = sqrt(r * r + t * t + 2.0 * r * mu * t) - RG;
    vec3 sR, ext; float sM; medium(h, sR, sM, ext);
    od += ext * dt;
  }
  outColor = vec4(exp(-od), 1.0);
}`;
// Dispersió múltiple: aproximació de Hillaire (contribució de 2n ordre amplificada per la sèrie geomètrica).
const msFS = GLSL_ATMOS + /* glsl */`
void main() {
  vec2 uv = (vUv - 0.5 / 32.0) * (32.0 / 31.0);
  float muS = uv.x * 2.0 - 1.0, r = RG + clamp(uv.y, 0.0, 1.0) * (RT - RG) + 0.01;
  vec3 sunDir = vec3(sqrt(max(1.0 - muS * muS, 0.0)), muS, 0.0);
  vec3 ro = vec3(0.0, r, 0.0);
  vec3 L2 = vec3(0.0), fms = vec3(0.0);
  const int SQ = 8; const int N = 20;
  for (int a = 0; a < SQ; a++) for (int b = 0; b < SQ; b++) {
    float th = PI * (float(a) + 0.5) / float(SQ), ph = acos(1.0 - 2.0 * (float(b) + 0.5) / float(SQ));
    vec3 rd = vec3(cos(th) * sin(ph), cos(ph), sin(th) * sin(ph));
    float mu = rd.y;
    float tTop = sphereFar(r, mu, RT), tG = sphereNear(r, mu, RG);
    float tMax = tG > 0.0 ? tG : tTop;
    float dt = tMax / float(N);
    vec3 T = vec3(1.0), L = vec3(0.0), f = vec3(0.0);
    for (int i = 0; i < N; i++) {
      float t = (float(i) + 0.5) * dt;
      vec3 p = ro + rd * t; float rp = length(p);
      vec3 sR, ext; float sM; medium(rp - RG, sR, sM, ext);
      vec3 sc = sR + sM;
      vec3 sT = exp(-ext * dt);
      vec3 S = sc * transmittance(rp, dot(p / rp, sunDir)) / (4.0 * PI);
      L += T * (S - S * sT) / max(ext, vec3(1e-7));
      f += T * (sc - sc * sT) / max(ext, vec3(1e-7));
      T *= sT;
    }
    if (tG > 0.0) {   // rebot al terra (albedo 0,3)
      vec3 p = ro + rd * tMax; float rp = length(p);
      L += T * transmittance(rp, dot(p / rp, sunDir)) * max(dot(p / rp, sunDir), 0.0) * 0.3 / PI;
    }
    L2 += L; fms += f / (4.0 * PI);
  }
  float n = float(SQ * SQ);
  L2 *= 4.0 * PI / n * (1.0 / (4.0 * PI)); fms *= 4.0 * PI / n;
  outColor = vec4(L2 / (1.0 - fms), 1.0);
}`;
// Volta del cel vista des de l'altura de la càmera (192×108, longitud relativa al sol).
const GLSL_SKYVIEW = /* glsl */`
uniform sampler2D uSkyLUT;
vec2 skyUV(vec3 rd, vec3 sunDir, float r) {
  float vh = sqrt(max(r * r - RG * RG, 0.0)), beta = acos(clamp(vh / r, -1.0, 1.0)), zh = PI - beta;
  float vz = acos(clamp(rd.y, -1.0, 1.0));
  float v;
  if (vz < zh) { float c = vz / zh; c = 1.0 - c; c = sqrt(c); c = 1.0 - c; v = c * 0.5; }
  else { float c = (vz - zh) / beta; c = sqrt(max(c, 0.0)); v = c * 0.5 + 0.5; }
  vec2 a = rd.xz, s = sunDir.xz;
  float la = length(a), ls = length(s);
  float cl = (la > 1e-4 && ls > 1e-4) ? dot(a, s) / (la * ls) : 1.0;
  float u = sqrt(clamp(-cl * 0.5 + 0.5, 0.0, 1.0));
  return vec2(u, v);
}
vec3 skyLookup(vec3 rd, vec3 sunDir, float r) {
  vec2 uv = skyUV(rd, sunDir, r);
  uv = vec2(0.5 / 192.0, 0.5 / 108.0) + uv * vec2(191.0 / 192.0, 107.0 / 108.0);
  return texture(uSkyLUT, uv).rgb;
}
`;
const skyFS = GLSL_ATMOS + /* glsl */`
uniform vec3 uSunDir; uniform float uCamR; uniform float uSunE;
void main() {
  vec2 uv = (vUv - vec2(0.5 / 192.0, 0.5 / 108.0)) * vec2(192.0 / 191.0, 108.0 / 107.0);
  float r = uCamR;
  float vh = sqrt(max(r * r - RG * RG, 0.0)), beta = acos(clamp(vh / r, -1.0, 1.0)), zh = PI - beta;
  float vz;
  if (uv.y < 0.5) { float c = 1.0 - 2.0 * uv.y; c = 1.0 - c * c; vz = zh * (1.0 - c) ; vz = zh * (1.0 - (1.0 - 2.0 * uv.y) * (1.0 - 2.0 * uv.y)); }
  else { float c = uv.y * 2.0 - 1.0; vz = zh + beta * c * c; }
  float cl = -(uv.x * uv.x * 2.0 - 1.0), sl = sqrt(max(1.0 - cl * cl, 0.0));
  // Sistema local: el sol al pla x-y.
  vec3 sunL = vec3(sqrt(max(1.0 - uSunDir.y * uSunDir.y, 0.0)), uSunDir.y, 0.0);
  vec3 rd = vec3(sin(vz) * cl, cos(vz), sin(vz) * sl);
  vec3 L, T;
  integrateAtmos(vec3(0.0, r, 0.0), rd, 1e5, sunL, uSunE, 30, 0.3, L, T);
  outColor = vec4(L, 1.0);
}`;

// ---------------------------------------------------------------------------
// Núvols
// ---------------------------------------------------------------------------
// Mapa de cobertura 2D (també el fan servir els materials per a les ombres dels núvols).
export const GLSL_CLOUDMAP = /* glsl */`
uniform float uCloudBase; uniform float uCloudTop; uniform float uCloudCov; uniform vec2 uCloudWind;
float cloudMap(vec2 xz, sampler2D noiseTex) {
  vec2 p = xz + uCloudWind;
  float n = texture(noiseTex, p / 14000.0).r * 0.5 + texture(noiseTex, p / 5200.0 + 0.31).r * 0.3 + texture(noiseTex, p / 2100.0 + 0.73).r * 0.2;
  n = smoothstep(0.25, 0.75, n);
  float c = uCloudCov;
  return smoothstep(1.0 - c - 0.3, 1.0 - c + 0.3, n) * min(1.0, c * 1.5 + 0.3);
}
// Ombra dels núvols sobre un punt (projecció cap al sol fins a mitja capa).
float cloudShadow(vec3 wp, vec3 lightDir, sampler2D noiseTex) {
  if (uCloudCov < 0.01 || lightDir.y < 0.02) return 1.0;
  float mid = mix(uCloudBase, uCloudTop, 0.35);
  if (wp.y > mid) return 1.0;
  vec2 xz = wp.xz + lightDir.xz / lightDir.y * (mid - wp.y);
  float m = cloudMap(xz, noiseTex);
  float thick = (uCloudTop - uCloudBase) / max(lightDir.y, 0.15);
  return mix(1.0, exp(-m * thick * 0.004), smoothstep(0.0, 0.3, m));
}
`;
const cloudFS = GLSL_ATMOS + GLSL_SKYVIEW + GLSL_CLOUDMAP + /* glsl */`
uniform sampler2D uDepth; uniform sampler2D uHist; uniform sampler2D uNoiseTex;
uniform sampler3D uShape; uniform sampler3D uDetail;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform mat4 uPrevViewProj; uniform vec3 uCamPos;
uniform vec3 uSunDir; uniform float uSunE; uniform vec3 uAmbTop; uniform vec3 uAmbBottom;
uniform float uFrame; uniform float uHistOk; uniform vec2 uRes; uniform float uDensity; uniform float uNightLight;
uniform vec3 uMoonDir; uniform float uHaze;
#define STEPS ${'${STEPS}'}
float remap(float x, float a, float b, float c, float d) { return c + (x - a) / (b - a) * (d - c); }
float altOf(vec3 p) { vec2 h = p.xz - uCamPos.xz; return p.y + dot(h, h) / (2.0 * ${EARTH_R.toFixed(1)}); }
float density(vec3 p, bool fine) {
  float alt = altOf(p);
  float hf = (alt - uCloudBase) / (uCloudTop - uCloudBase);
  if (hf <= 0.0 || hf >= 1.0) return 0.0;
  float wm = cloudMap(p.xz, uNoiseTex);
  if (wm <= 0.002) return 0.0;
  // Perfil vertical de cúmul: base plana, cim arrodonit (més alt on el núvol és més dens).
  float prof = smoothstep(0.0, 0.08, hf) * (1.0 - smoothstep(0.15 + 0.75 * wm, 0.15 + 0.75 * wm + 0.25, hf));
  // El vent desplaça més el cim que la base.
  vec3 q = vec3(p.x + uCloudWind.x + hf * 400.0, alt, p.z + uCloudWind.y);
  vec4 s = texture(uShape, q / 5200.0);
  float lowF = s.g * 0.625 + s.b * 0.25 + s.a * 0.125;
  // Bonys de perlin-worley tallats amb el worley de baixa freqüència (els valors s'han ajustat a la
  // distribució real de la textura: r entre 0,56 i 0,84; lowF entre 0,29 i 0,60).
  float base = smoothstep(0.58, 0.8, s.r);
  base = clamp(remap(base, (1.0 - lowF) * 0.6, 1.0, 0.0, 1.0), 0.0, 1.0) * prof;
  float c = remap(base, 1.0 - wm, 1.0, 0.0, 1.0) * smoothstep(0.0, 0.35, wm);
  if (c <= 0.0) return 0.0;
  if (fine) {
    vec3 d = texture(uDetail, q / 780.0 + vec3(0.0, uFrame * 0.0, 0.0)).rgb;
    float hfF = d.r * 0.625 + d.g * 0.25 + d.b * 0.125;
    float er = mix(hfF, 1.0 - hfF, clamp(hf * 3.0, 0.0, 1.0));
    c = remap(c, er * 0.55, 1.0, 0.0, 1.0);
  }
  return clamp(c, 0.0, 1.0);
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
const vec3 KERNEL[6] = vec3[6](vec3(0.38, -0.72, 0.58), vec3(-0.81, 0.29, -0.51), vec3(0.67, 0.42, -0.61),
  vec3(-0.25, -0.33, 0.91), vec3(0.12, 0.88, 0.46), vec3(-0.59, -0.65, -0.48));
// Interval del raig dins la capa de núvols (esferes concèntriques amb el planeta).
vec2 slab(vec3 rd) {
  float R = ${EARTH_R.toFixed(1)}, r = R + uCamPos.y, mu = rd.y;
  float b = r * mu;
  float cB = (uCamPos.y - uCloudBase) * (2.0 * R + uCamPos.y + uCloudBase);
  float cT = (uCamPos.y - uCloudTop) * (2.0 * R + uCamPos.y + uCloudTop);
  float dB = b * b - cB, dT = b * b - cT;
  float tTopFar = dT >= 0.0 ? -b + sqrt(dT) : -1.0;
  float tTopNear = dT >= 0.0 ? cT / (-b - sqrt(dT)) : -1.0;
  float tBaseFar = dB >= 0.0 ? -b + sqrt(dB) : -1.0;
  float tBaseNear = dB >= 0.0 ? cB / (-b - sqrt(dB)) : -1.0;
  if (uCamPos.y < uCloudBase) return vec2(tBaseFar, tTopFar);
  if (uCamPos.y > uCloudTop) {
    if (dT < 0.0 || tTopNear < 0.0) return vec2(-1.0);
    return vec2(tTopNear, (dB >= 0.0 && tBaseNear > 0.0) ? tBaseNear : tTopFar);
  }
  return vec2(0.0, (dB >= 0.0 && tBaseNear > 0.0) ? tBaseNear : tTopFar);
}
vec3 viewRay(vec2 uv, out float sceneDist) {
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0); v /= v.w;
  vec3 dirV = normalize(v.xyz);
  float d = texture(uDepth, uv).r;
  sceneDist = 1e9;
  if (d < 1.0) {
    vec4 pv = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); pv /= pv.w;
    sceneDist = length(pv.xyz);
  }
  return normalize(mat3(uCamWorld) * dirV);
}
void main() {
  float sceneDist;
  vec3 rd = viewRay(vUv, sceneDist);
  vec2 seg = slab(rd);
  seg.y = min(seg.y, min(sceneDist, 70000.0));
  vec3 L = vec3(0.0); float T = 1.0; float tMean = 0.0, wMean = 0.0;
  if (uCloudCov > 0.005 && seg.y > seg.x && seg.y > 0.0) {
    seg.x = max(seg.x, 0.0);
    float jit = hash12(gl_FragCoord.xy + vec2(uFrame * 7.31, uFrame * 3.17));
    // Passos que creixen amb la distància: fins a prop, llunyans a l'horitzó.
    float t = seg.x;
    float dt = max(50.0, t * 0.035);
    t += dt * jit;
    float cth = dot(rd, uSunDir);
    vec3 light = uSunDir.y > -0.05 ? uSunDir : uMoonDir;
    float cl = dot(rd, light);
    float pSun = mix(phaseHG(cl, 0.8), phaseHG(cl, -0.25), 0.3);
    float sigma = uDensity;
    for (int i = 0; i < STEPS; i++) {
      if (t > seg.y || T < 0.015) break;
      dt = max(50.0, t * 0.035);
      vec3 p = uCamPos + rd * t;
      // Salt ràpid on el mapa de cobertura és buit.
      if (cloudMap(p.xz, uNoiseTex) <= 0.002) { t += dt * 2.5; continue; }
      float dens = density(p, t < 25000.0);
      if (dens <= 0.0) { t += dt; continue; }
      float alt = altOf(p);
      float hf = clamp((alt - uCloudBase) / (uCloudTop - uCloudBase), 0.0, 1.0);
      // Llum cap al sol: 6 passos que s'allarguen.
      // Mostres en un con al voltant de la direcció del sol (evita les estries alineades amb la llum).
      float od = 0.0, ls = 60.0, ld = 0.0;
      for (int j = 0; j < 6; j++) {
        ld += ls;
        vec3 lp = p + light * ld + KERNEL[j] * ls * 0.6;
        od += density(lp, false) * ls; ls *= 1.8;
      }
      od *= sigma;
      float rS = RG + alt / 1000.0;
      vec3 sunRad = light == uSunDir ? uSunE * transmittance(rS, light.y) : vec3(uNightLight);
      // Dispersió múltiple aproximada (octaves de Wrenninge) i "powder" per als marges foscos.
      float ms = 0.0, a = 1.0, b = 1.0, cc = 1.0;
      for (int k = 0; k < 3; k++) { ms += b * exp(-od * a) * mix(phaseHG(cl, 0.8 * cc), phaseHG(cl, -0.25 * cc), 0.3); a *= 0.45; b *= 0.55; cc *= 0.5; }
      float powder = 1.0 - exp(-dens * sigma * 160.0);
      vec3 amb = mix(uAmbBottom, uAmbTop, hf) * (0.55 + 0.45 * hf);
      float se = dens * sigma;
      vec3 S = se * (sunRad * ms * mix(0.55, 1.0, powder) * 4.0 * PI * 0.25 + amb);
      float sT = exp(-se * dt);
      L += T * (S - S * sT) / max(se, 1e-6);
      tMean += t * T * (1.0 - sT); wMean += T * (1.0 - sT);
      T *= sT;
      t += dt;
    }
  }
  // Perspectiva aèria sobre el núvol: a la seva distància, una part de la llum és la del cel.
  if (wMean > 0.0) {
    float d = tMean / wMean;
    vec3 skyC = skyLookup(rd, uSunDir, RG + uCamPos.y / 1000.0);
    float ta = exp(-d * (uHaze + 1.0 / 42000.0));
    L = mix(skyC * (1.0 - T), L, ta);
  }
  vec4 cur = vec4(L, T);
  // Acumulació temporal: es reprojecta amb el punt mitjà del núvol (o molt lluny si no n'hi ha).
  float dRep = wMean > 0.0 ? tMean / wMean : (seg.y > seg.x && seg.y > 0.0 ? 0.5 * (max(seg.x, 0.0) + seg.y) : 50000.0);
  vec4 pp = uPrevViewProj * vec4(uCamPos + rd * dRep, 1.0);
  vec2 puv = pp.xy / pp.w * 0.5 + 0.5;
  if (uHistOk > 0.5 && pp.w > 0.0 && all(greaterThan(puv, vec2(0.002))) && all(lessThan(puv, vec2(0.998)))) {
    vec4 h = texture(uHist, puv);
    cur = mix(cur, h, 0.82);
  }
  outColor = cur;
}`;

// ---------------------------------------------------------------------------
// Composició: cel, perspectiva aèria, boira i núvols
// ---------------------------------------------------------------------------
const compFS = GLSL_ATMOS + GLSL_SKYVIEW + /* glsl */`
uniform sampler2D uScene; uniform sampler2D uDepth; uniform sampler2D uClouds; uniform sampler2D uNoiseTex;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos;
uniform vec3 uSunDir; uniform float uSunE; uniform float uNight; uniform float uTime; uniform float uCirrus; uniform vec2 uCloudWind;
uniform vec3 uLightDir; uniform vec3 uLightCol; uniform vec3 uAmbient;
uniform float uFogDensity; uniform float uFogFalloff; uniform float uFogBase; uniform float uHaze; uniform float uOvercast;
uniform float uFrame; uniform float uApSteps;
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
uniform vec2 uCloudTexel;
// Els núvols es tracen a mitja resolució amb soroll: es filtren en llegir-los.
vec4 cloudsAt(vec2 uv) {
  vec2 o = uCloudTexel * 0.75;
  return 0.25 * (texture(uClouds, uv + vec2(o.x, o.y)) + texture(uClouds, uv + vec2(-o.x, o.y))
               + texture(uClouds, uv + vec2(o.x, -o.y)) + texture(uClouds, uv + vec2(-o.x, -o.y)));
}
vec3 fogColor(vec3 rd) {
  return uAmbient * 0.95 + uLightCol * phaseHG(dot(rd, uLightDir), 0.55) * 2.2 * (1.0 - uOvercast * 0.8);
}
void main() {
  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); v /= v.w;
  vec3 rd = normalize(mat3(uCamWorld) * normalize(v.xyz));
  float d = texture(uDepth, vUv).r;
  float rCam = RG + max(uCamPos.y, 0.0) / 1000.0;
  vec3 col;
  float dist;
  if (d >= 1.0) {
    // Cel.
    col = skyLookup(rd, uSunDir, rCam);
    float mu = dot(rd, uSunDir);
    float sunA = 0.99996;
    if (mu > sunA) {
      float x = clamp((mu - sunA) / (1.0 - sunA), 0.0, 1.0);
      float limb = 0.4 + 0.6 * sqrt(x);
      col += uSunE * transmittance(rCam, uSunDir.y) * 2500.0 * limb * smoothstep(0.0, 0.08, x);
    }
    // Cirrus: una capa fina a 9 km.
    if (rd.y > 0.0 && uCirrus > 0.01) {
      vec2 cp = rd.xz / (rd.y + 0.05) * 9000.0 + uCloudWind * 2.5;
      float n = texture(uNoiseTex, cp / 40000.0).r * 0.55 + texture(uNoiseTex, cp / vec2(9000.0, 15000.0) + 0.4).r * 0.3
              + texture(uNoiseTex, cp / 3300.0 + 0.7).r * 0.15;
      float c = smoothstep(0.75 - uCirrus * 0.35, 0.95 - uCirrus * 0.3, n) * smoothstep(0.02, 0.25, rd.y) * 0.45;
      vec3 cl = uSunE * transmittance(RG + 9.0, uSunDir.y) * (0.12 + phaseHG(mu, 0.6) * 0.6) + uAmbient * 0.6;
      col = mix(col, cl, c);
    }
    // Estrelles i lluna.
    if (uNight > 0.01 && rd.y > 0.0) {
      vec2 g = floor(vec2(atan(rd.z, rd.x) * 220.0, asin(rd.y) * 220.0));
      float s = h12(g);
      col += vec3(0.85, 0.9, 1.0) * smoothstep(0.997, 1.0, s) * (0.7 + 0.3 * sin(uTime * 3.0 + s * 50.0)) * uNight * 0.6 * smoothstep(0.0, 0.15, rd.y);
      col += vec3(0.004, 0.007, 0.016) * uNight;
      float mm = dot(rd, uLightDir);
      col += vec3(0.8, 0.85, 0.95) * (smoothstep(0.99994, 0.99997, mm) * 6.0 + pow(max(mm, 0.0), 600.0) * 0.04) * uNight;
    }
    dist = 30000.0;
    vec4 c = cloudsAt(vUv);
    col = col * c.a + c.rgb;
    // Boira i calitja també sobre el cel prop de l'horitzó.
  } else {
    vec4 pv = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); pv /= pv.w;
    dist = length(pv.xyz);
    col = texture(uScene, vUv).rgb;
    // Perspectiva aèria: llum dispersada per l'aire entre la càmera i el punt.
    vec3 L, T;
    integrateAtmos(vec3(0.0, rCam, 0.0), rd, dist / 1000.0, uSunDir, uSunE, int(uApSteps), ign(gl_FragCoord.xy), L, T);
    col = col * T + L;
    vec4 c = cloudsAt(vUv);
    col = col * c.a + c.rgb;
  }
  // Boira de vall (exponencial amb l'altura) i calitja de la pluja.
  float a = uFogDensity * exp(-uFogFalloff * (uCamPos.y - uFogBase));
  float k = uFogFalloff * rd.y * dist;
  float hf = a * dist * (abs(k) > 1e-4 ? (1.0 - exp(-k)) / k : 1.0);
  col = mix(col, fogColor(rd), 1.0 - exp(-(hf + uHaze * dist)));
  outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Bloom (filtre dual de Kawase) i sortida
// ---------------------------------------------------------------------------
const downFS = /* glsl */`
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uFirst;
void main() {
  vec2 o = uTexel * 0.5;
  vec3 c = texture(uTex, vUv).rgb * 4.0 + texture(uTex, vUv + vec2(-o.x, -o.y)).rgb + texture(uTex, vUv + vec2(o.x, -o.y)).rgb
         + texture(uTex, vUv + vec2(-o.x, o.y)).rgb + texture(uTex, vUv + vec2(o.x, o.y)).rgb;
  c /= 8.0;
  if (uFirst > 0.5) { float l = max(max(c.r, c.g), c.b); c *= smoothstep(1.2, 4.0, l) / max(l, 1e-4) * min(l, 60.0); }
  outColor = vec4(c, 1.0);
}`;
const upFS = /* glsl */`
uniform sampler2D uTex; uniform vec2 uTexel;
void main() {
  vec2 o = uTexel * 0.5;
  vec3 c = texture(uTex, vUv + vec2(-o.x * 2.0, 0.0)).rgb + texture(uTex, vUv + vec2(-o.x, o.y)).rgb * 2.0
         + texture(uTex, vUv + vec2(0.0, o.y * 2.0)).rgb + texture(uTex, vUv + vec2(o.x, o.y)).rgb * 2.0
         + texture(uTex, vUv + vec2(o.x * 2.0, 0.0)).rgb + texture(uTex, vUv + vec2(o.x, -o.y)).rgb * 2.0
         + texture(uTex, vUv + vec2(0.0, -o.y * 2.0)).rgb + texture(uTex, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  outColor = vec4(c / 12.0, 1.0);
}`;
// Exposició automàtica: luminància logarítmica mitjana de la imatge, adaptada a poc a poc.
const lumFS = /* glsl */`
uniform sampler2D uTex;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // El centre pesa més que les vores.
  vec2 q = vUv - 0.5; float w = 1.0 - dot(q, q) * 1.5;
  outColor = vec4(log(max(l, 1e-4)) * w, w, 0.0, 1.0);
}`;
const adaptFS = /* glsl */`
uniform sampler2D uLum; uniform sampler2D uPrev; uniform float uK; uniform float uFirst;
void main() {
  vec2 m = textureLod(uLum, vec2(0.5), 10.0).rg;
  float target = m.x / max(m.y, 1e-3);
  float prev = texture(uPrev, vec2(0.5)).r;
  outColor = vec4(uFirst > 0.5 ? target : mix(prev, target, uK), 0.0, 0.0, 1.0);
}`;
const finalFS = /* glsl */`
uniform sampler2D uTex; uniform sampler2D uBloom; uniform float uExposure; uniform float uBloomStr; uniform float uFrame;
uniform sampler2D uAdapt; uniform float uAuto;
vec3 aces(vec3 x) {
  const mat3 m1 = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 m2 = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  vec3 v = m1 * x;
  vec3 a = v * (v + 0.0245786) - 0.000090537, b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(m2 * (a / b), 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 c = texture(uTex, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStr;
  float avg = exp(texture(uAdapt, vec2(0.5)).r);
  // Adaptació parcial: de dia un bosc ombrívol s'aclareix, però la nit continua sent fosca.
  float ae = mix(1.0, clamp(pow(0.11 / avg, 0.7), 0.6, 3.0), uAuto);
  c = aces(c * uExposure * ae / 0.6);
  // Vinyeta suau.
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.35;
  c = srgb(c);
  // Gra (també evita les bandes del cel).
  c += (h12(gl_FragCoord.xy + fract(uFrame * 0.137) * 97.0) - 0.5) / 160.0;
  outColor = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------------------
// CPU: transmitància i colors del cel per a la il·luminació de l'escena
// ---------------------------------------------------------------------------
function mediumJS(h, mie) {
  const dR = Math.exp(-h / 8), dM = Math.exp(-h / 1.2) * mie, dO = Math.max(0, 1 - Math.abs(h - 25) / 15);
  return [0, 1, 2].map(c => RAY_S[c] * dR + MIE_E * dM + OZ_A[c] * dO);
}
function transJS(r, mu, mie) {
  const muH = -Math.sqrt(Math.max(1 - (RG / r) ** 2, 0));
  if (mu < muH - 0.004) return [0, 0, 0];
  const d = -r * mu + Math.sqrt(Math.max(r * r * (mu * mu - 1) + RT * RT, 0)), N = 24, dt = d / N;
  const od = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * dt, h = Math.sqrt(r * r + t * t + 2 * r * mu * t) - RG;
    const e = mediumJS(h, mie);
    for (let c = 0; c < 3; c++) od[c] += e[c] * dt;
  }
  const k = Math.min(1, Math.max(0, (mu - (muH - 0.004)) / 0.008));
  return od.map(o => Math.exp(-o) * k);
}
// Radiància del cel (dispersió simple, amb un factor per a la múltiple) en una direcció.
function skyJS(r, rd, sun, mie) {
  const mu = rd[1], tTop = -r * mu + Math.sqrt(Math.max(r * r * (mu * mu - 1) + RT * RT, 0));
  const N = 12, dt = tTop / N, c = rd[0] * sun[0] + rd[1] * sun[1] + rd[2] * sun[2];
  const pR = 3 / (16 * Math.PI) * (1 + c * c), g = 0.8, pM = 3 / (8 * Math.PI) * ((1 - g * g) * (1 + c * c)) / ((2 + g * g) * (1 + g * g - 2 * g * c) ** 1.5);
  const L = [0, 0, 0], T = [1, 1, 1];
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * dt, p = [rd[0] * t, r + rd[1] * t, rd[2] * t], rp = Math.hypot(...p), h = rp - RG;
    const muS = (p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2]) / rp;
    const st = transJS(rp, muS, mie), e = mediumJS(h, mie), dR = Math.exp(-h / 8), dM = Math.exp(-h / 1.2) * mie;
    for (let k = 0; k < 3; k++) {
      const S = (RAY_S[k] * dR * pR + MIE_S * dM * pM) * st[k] * 1.35 + (RAY_S[k] * dR + MIE_S * dM) * 0.012 * Math.max(0.05, sun[1] + 0.2);
      const sT = Math.exp(-e[k] * dt);
      L[k] += T[k] * S * (1 - sT) / e[k];
      T[k] *= sT;
    }
  }
  return L.map(v => v * SUN_E);
}

// ---------------------------------------------------------------------------
export function createAtmos(renderer, U, { quality = 1 } = {}) {
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const run = (mat, target, layer = 0) => { quad.material = mat; renderer.setRenderTarget(target, layer); renderer.render(qScene, qCam); };

  const shared = { uMieScale: { value: 1 } };
  const transRT = floatRT(256, 64, { type: THREE.FloatType });
  const msRT = floatRT(32, 32, { type: THREE.FloatType });
  const skyRT = floatRT(192, 108);
  const LUT = { uTransLUT: { value: transRT.texture }, uMsLUT: { value: msRT.texture }, uSkyLUT: { value: skyRT.texture } };
  const transMat = pass(transFS, { ...shared });
  const msMat = pass(msFS, { ...shared, ...LUT });
  const skyMat = pass(skyFS, { ...shared, ...LUT, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uCamR: { value: RG + 0.5 }, uSunE: { value: SUN_E } });
  let lutMie = -1;
  function updateLUTs(mie) {
    if (Math.abs(mie - lutMie) < 0.04 * lutMie) return;
    lutMie = mie; shared.uMieScale.value = mie;
    run(transMat, transRT); run(msMat, msRT);
  }

  // Soroll 3D.
  function noise3D(size, fs) {
    const rt = new THREE.WebGL3DRenderTarget(size, size, size, { depthBuffer: false, type: THREE.UnsignedByteType });
    const t = rt.texture;
    t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    const m = pass(fs, { uLayer: { value: 0 }, uSize: { value: size } });
    for (let l = 0; l < size; l++) { m.uniforms.uLayer.value = l; run(m, rt, l); }
    m.dispose();
    return rt;
  }
  const shapeRT = noise3D(quality > 0.5 ? 128 : 64, shapeNoiseFS);
  const detailRT = noise3D(32, detailNoiseFS);

  // Objectius de render.
  let W = 1, H = 1;
  const depthTex = new THREE.DepthTexture(1, 1, THREE.FloatType);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: depthTex, depthBuffer: true });
  const hdrRT = floatRT(1, 1);
  const cloudRT = [floatRT(1, 1), floatRT(1, 1)];
  const bloomRT = [];
  for (let i = 0; i < 5; i++) bloomRT.push(floatRT(1, 1));
  let cloudIdx = 0, histOk = 0, frame = 0;
  const prevViewProj = new THREE.Matrix4();

  const cloudU = {
    ...shared, ...LUT,
    uDepth: { value: depthTex }, uHist: { value: null }, uNoiseTex: U.uNoiseTex,
    uShape: { value: shapeRT.texture }, uDetail: { value: detailRT.texture },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uPrevViewProj: { value: prevViewProj }, uCamPos: { value: new THREE.Vector3() },
    uSunDir: U.uSunDir, uMoonDir: U.uLightDir, uSunE: { value: SUN_E }, uAmbTop: { value: new THREE.Color() }, uAmbBottom: { value: new THREE.Color() },
    uFrame: { value: 0 }, uHistOk: { value: 0 }, uRes: { value: new THREE.Vector2() }, uDensity: { value: 0.12 }, uNightLight: { value: 0.02 },
    uCloudBase: U.uCloudBase, uCloudTop: U.uCloudTop, uCloudCov: U.uCloudCov, uCloudWind: U.uCloudWind, uHaze: U.uHaze,
  };
  const cloudMat = pass(cloudFS.replace("${STEPS}", String(quality > 0.5 ? 72 : 40)), cloudU);
  const compU = {
    ...shared, ...LUT,
    uScene: { value: sceneRT.texture }, uDepth: { value: depthTex }, uClouds: { value: null }, uNoiseTex: U.uNoiseTex,
    uInvProj: cloudU.uInvProj, uCamWorld: cloudU.uCamWorld, uCamPos: cloudU.uCamPos,
    uSunDir: U.uSunDir, uSunE: { value: SUN_E }, uNight: U.uNight, uTime: U.uTime, uCirrus: { value: 0 }, uCloudWind: U.uCloudWind,
    uLightDir: U.uLightDir, uLightCol: U.uLightCol, uAmbient: U.uAmbient,
    uFogDensity: U.uFogDensity, uFogFalloff: U.uFogFalloff, uFogBase: U.uFogBase, uHaze: U.uHaze, uOvercast: { value: 0 },
    uCloudTexel: { value: new THREE.Vector2() }, uFrame: cloudU.uFrame, uApSteps: { value: quality > 0.5 ? 10 : 6 },
  };
  const compMat = pass(compFS, compU);
  const downMat = pass(downFS, { uTex: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 0 } });
  const upMat = pass(upFS, { uTex: { value: null }, uTexel: { value: new THREE.Vector2() } });
  upMat.blending = THREE.AdditiveBlending; upMat.transparent = true;
  const lumRT = floatRT(64, 32, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const adaptRT = [floatRT(1, 1, { type: THREE.FloatType }), floatRT(1, 1, { type: THREE.FloatType })];
  let adaptIdx = 0, adaptFirst = 1, lastT = performance.now();
  const lumMat = pass(lumFS, { uTex: { value: hdrRT.texture } });
  const adaptMat = pass(adaptFS, { uLum: { value: lumRT.texture }, uPrev: { value: null }, uK: { value: 0.05 }, uFirst: { value: 1 } });
  const finalMat = pass(finalFS, { uTex: { value: hdrRT.texture }, uBloom: { value: null }, uExposure: { value: 1 }, uBloomStr: { value: 0.06 }, uFrame: cloudU.uFrame,
    uAdapt: { value: null }, uAuto: { value: 1 } });

  function setSize(w, h) {
    if (w === W && h === H) return;
    W = w; H = h;
    sceneRT.setSize(w, h); hdrRT.setSize(w, h);
    const cw = Math.max(1, Math.ceil(w / 2)), ch = Math.max(1, Math.ceil(h / 2));
    for (const rt of cloudRT) rt.setSize(cw, ch);
    let bw = w, bh = h;
    for (const rt of bloomRT) { bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1); rt.setSize(bw, bh); }
    histOk = 0;
  }

  // Colors per a la il·luminació de l'escena (a la CPU).
  function lighting(sunDir, camAlt, mie) {
    const r = RG + Math.max(camAlt, 0) / 1000, s = [sunDir.x, sunDir.y, sunDir.z];
    const t = transJS(r, sunDir.y, mie);
    const sunCol = new THREE.Color(t[0] * SUN_E, t[1] * SUN_E, t[2] * SUN_E);
    const zen = new THREE.Color(...skyJS(r, [0, 1, 0], s, mie));
    // Horitzó: mitjana de quatre direccions a 6° d'elevació.
    const hor = new THREE.Color(0, 0, 0);
    for (let a = 0; a < 4; a++) {
      const az = a * Math.PI / 2 + 0.4, el = 0.1;
      hor.add(new THREE.Color(...skyJS(r, [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)], s, mie)));
    }
    hor.multiplyScalar(0.25);
    return { sunCol, zen, hor };
  }

  // Render complet d'un fotograma. renderScene() dibuixa l'escena al destí actiu.
  function render(camera, renderScene, { cirrus = 0, overcast = 0, exposure = 1, ambTop, ambBottom, nightLight = 0.02 }) {
    frame++;
    const camAlt = camera.position.y;
    skyMat.uniforms.uSunDir.value.copy(U.uSunDir.value);
    skyMat.uniforms.uCamR.value = RG + Math.max(camAlt, 0) / 1000;
    run(skyMat, skyRT);

    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderScene();

    camera.updateMatrixWorld();
    cloudU.uInvProj.value.copy(camera.projectionMatrixInverse);
    cloudU.uCamWorld.value.copy(camera.matrixWorld);
    cloudU.uCamPos.value.copy(camera.position);
    cloudU.uFrame.value = frame % 1000;
    cloudU.uHistOk.value = histOk;
    if (ambTop) cloudU.uAmbTop.value.copy(ambTop);
    if (ambBottom) cloudU.uAmbBottom.value.copy(ambBottom);
    cloudU.uNightLight.value = nightLight;
    const src = cloudRT[cloudIdx], dst = cloudRT[1 - cloudIdx];
    cloudU.uHist.value = src.texture;
    cloudU.uRes.value.set(dst.width, dst.height);
    run(cloudMat, dst);
    cloudIdx = 1 - cloudIdx; histOk = 1;
    prevViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    compU.uClouds.value = dst.texture;
    compU.uCloudTexel.value.set(1 / dst.width, 1 / dst.height);
    compU.uCirrus.value = cirrus;
    compU.uOvercast.value = overcast;
    run(compMat, hdrRT);

    // Bloom.
    let srcT = hdrRT;
    for (let i = 0; i < bloomRT.length; i++) {
      downMat.uniforms.uTex.value = srcT.texture;
      downMat.uniforms.uTexel.value.set(1 / srcT.width, 1 / srcT.height);
      downMat.uniforms.uFirst.value = i === 0 ? 1 : 0;
      run(downMat, bloomRT[i]);
      srcT = bloomRT[i];
    }
    for (let i = bloomRT.length - 1; i > 0; i--) {
      upMat.uniforms.uTex.value = bloomRT[i].texture;
      upMat.uniforms.uTexel.value.set(1 / bloomRT[i].width, 1 / bloomRT[i].height);
      renderer.setRenderTarget(bloomRT[i - 1]);
      quad.material = upMat; renderer.autoClear = false; renderer.render(qScene, qCam); renderer.autoClear = true;
    }
    // Exposició automàtica.
    run(lumMat, lumRT);
    const now = performance.now(), dts = Math.min(0.5, (now - lastT) / 1000); lastT = now;
    adaptMat.uniforms.uPrev.value = adaptRT[adaptIdx].texture;
    adaptMat.uniforms.uK.value = 1 - Math.exp(-dts * 1.6);
    adaptMat.uniforms.uFirst.value = adaptFirst; adaptFirst = 0;
    run(adaptMat, adaptRT[1 - adaptIdx]);
    adaptIdx = 1 - adaptIdx;
    finalMat.uniforms.uAdapt.value = adaptRT[adaptIdx].texture;
    finalMat.uniforms.uBloom.value = bloomRT[0].texture;
    finalMat.uniforms.uExposure.value = exposure;
    run(finalMat, null);
  }

  return { render, setSize, updateLUTs, lighting, resetHistory: () => { histOk = 0; }, sceneRT, debug: { shapeRT, detailRT, transRT, msRT, skyRT, cloudRT } };
}
