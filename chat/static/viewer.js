// Comet 3D brochure viewer for the chat. One WebGL canvas, moved into whichever message shows it.
// Brochure geometry is copied from site/3d-src.js (built from the "Video Card" dieline, cm).
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 21.0, D = 14.8, TB = 0.70, TC = 0.25, SPINE = 1.0;
const SCR = {x: 6.08, y: 4.13, w: 9.70, h: 5.40};
const PX = 0, PY = TB, OPEN = 1.80;
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

// soft contact shadow texture
const cs = document.createElement('canvas'); cs.width = cs.height = 128;
{const g = cs.getContext('2d'); const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);}
const contactTex = new THREE.CanvasTexture(cs);

function edgeColour(img) {   // average of the artwork's outer border, used for the board edges
  const c = document.createElement('canvas'); c.width = 64; c.height = 45; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 45);
  const d = g.getImageData(0, 0, 64, 45).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let y = 0; y < 45; y++) for (let x = 0; x < 64; x++) if (x < 2 || y < 2 || x > 61 || y > 42) { const i = (y * 64 + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  return new THREE.Color(`rgb(${r / n | 0},${gg / n | 0},${b / n | 0})`).convertSRGBToLinear().multiplyScalar(0.8);
}

// ---------- the screen: plays a stand-in clip (slow pan over the cover art) ----------
function makeScreen() {
  const c = document.createElement('canvas'); c.width = 960; c.height = 540;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return {c, g: c.getContext('2d'), tex, t0: performance.now()};
}
function drawScreen(s, img, t, on) {
  const g = s.g, w = 960, h = 540;
  if (!on || !img) { g.fillStyle = '#050506'; g.fillRect(0, 0, w, h); s.tex.needsUpdate = true; return; }
  const sec = ((t - s.t0) / 1000) % 10, k = sec / 10;
  const z = 1.18 - 0.14 * k, iw = img.width, ih = img.height;
  const sw = iw / z, sh = sw * h / w;
  g.drawImage(img, (iw - sw) * (0.2 + 0.6 * k), Math.max(0, (ih - sh) / 2), sw, Math.min(ih, sh), 0, 0, w, h);
  const since = (t - s.t0) / 1000;
  const fade = since < 1 ? since : Math.min(1, sec / 0.6, (10 - sec) / 0.6);
  g.fillStyle = `rgba(0,0,0,${since < 1 ? 1 - fade : (1 - fade) * .55})`; g.fillRect(0, 0, w, h);
  if (since < 0.25) { g.fillStyle = `rgba(255,255,255,${0.6 * (1 - since / 0.25)})`; g.fillRect(0, 0, w, h); }
  g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(36, h - 30, w - 72, 5); g.fillStyle = '#fff'; g.fillRect(36, h - 30, (w - 72) * k, 5);
  s.tex.needsUpdate = true;
}

// ---------- one brochure ----------
const basis = (u, v, n) => new THREE.Matrix4().makeBasis(u, v, n);
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
function face(mat, w, h, m4, pos) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.setRotationFromMatrix(m4); p.position.copy(pos); p.receiveShadow = true; return p; }
const FACE_UP = basis(X, Z.clone().negate(), Y);                           // art upright, seen from above
const FACE_DOWN_FLIP = basis(X.clone().negate(), Z.clone().negate(), Y.clone().negate()); // reads upright after a half turn

function makeBrochure() {
  const root = new THREE.Group();
  const edgeB = new THREE.MeshPhysicalMaterial({color: 0x222222, roughness: .7});
  const edgeC = new THREE.MeshPhysicalMaterial({color: 0x222222, roughness: .7});
  const print = () => new THREE.MeshPhysicalMaterial({roughness: .58, clearcoat: .18, clearcoatRoughness: .4});
  const m = {front: print(), inl: print(), inr: print(), back: print()};

  // screen panel (stays on the table), spans x 0..W
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, TB, D, 3, 0.06), edgeB);
  base.position.set(W / 2, TB / 2, 0); base.castShadow = base.receiveShadow = true; root.add(base);
  root.add(face(m.inr, W - .04, D - .04, FACE_UP, new THREE.Vector3(W / 2, TB + .002, 0)));
  root.add(face(m.back, W - .04, D - .04, FACE_DOWN_FLIP, new THREE.Vector3(W / 2, -.002, 0)));

  // screen: glowing display plus a thin glass layer
  const scr = makeScreen();
  const cx = SCR.x + SCR.w / 2, cz = -D / 2 + SCR.y + SCR.h / 2;
  const screenMesh = face(new THREE.MeshBasicMaterial({map: scr.tex, toneMapped: false}), SCR.w, SCR.h, FACE_UP, new THREE.Vector3(cx, TB + .006, cz));
  const glass = face(new THREE.MeshPhysicalMaterial({color: 0x000000, transparent: true, opacity: .18, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2.2}), SCR.w + .1, SCR.h + .1, FACE_UP, new THREE.Vector3(cx, TB + .01, cz));
  root.add(screenMesh, glass);

  // cover: closed it lies on the screen panel; it turns half a turn about the spine
  const pivot = new THREE.Group(); pivot.position.set(PX, PY, 0); root.add(pivot);
  const cover = new THREE.Group(); cover.position.set(W / 2 - PX, TB + TC / 2 - PY, 0); pivot.add(cover);
  const coverBox = new THREE.Mesh(new RoundedBoxGeometry(W, TC, D, 3, 0.05), edgeC); coverBox.castShadow = coverBox.receiveShadow = true; cover.add(coverBox);
  cover.add(face(m.front, W - .04, D - .04, FACE_UP, new THREE.Vector3(0, TC / 2 + .002, 0)));
  cover.add(face(m.inl, W - .04, D - .04, FACE_DOWN_FLIP, new THREE.Vector3(0, -TC / 2 - .002, 0)));

  // spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(1, 1, D - .02), edgeC); spine.castShadow = true; root.add(spine);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: contactTex, transparent: true, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .01; root.add(shadow);

  const b = {root, m, edgeB, edgeC, scr, screenMesh, pivot, spine, shadow, angle: 0, target: 0, img: null,
    setBrand(t) { for (const k of ['front', 'inl', 'inr', 'back']) { m[k].map = t[k]; m[k].needsUpdate = true; } edgeB.color.copy(t.edgeBase); edgeC.color.copy(t.edgeCover); b.img = t.front.image; scr.t0 = performance.now(); },
    playAt: Infinity, manual: false, screenOn: false, wasOn: false,
    update(t, dt) {
      if (!b.manual) b.angle += (b.target - b.angle) * Math.min(1, dt * 3);
      const a = b.angle, o = a / Math.PI;
      pivot.rotation.z = a;
      // spine: upright strip when closed, flat strip when open
      // spine: a strip from the panel's bottom-left edge to the cover's outer hinge edge
      const ex = -TC * Math.sin(a), ey = TB + TC * Math.cos(a), len = Math.max(.05, Math.hypot(ex, ey));
      spine.scale.set(.14, len, 1); spine.rotation.z = Math.atan2(-ex, ey);
      spine.position.set(ex / 2 - .07 * Math.cos(spine.rotation.z), ey / 2 - .07 * Math.sin(spine.rotation.z), 0);
      const left = -Math.max(0, Math.cos(Math.min(a, Math.PI)) < 0 ? -Math.cos(a) * W : 0) - Math.sin(Math.min(a, Math.PI / 2)) * 1.5;
      shadow.scale.set((W - left) * 1.15, D * 1.3, 1); shadow.position.x = (W + left) / 2;
      const on = b.manual ? b.screenOn : (t >= b.playAt && b.target > 0);
      if (on && !b.wasOn) scr.t0 = t; b.wasOn = on;
      drawScreen(scr, b.img, t, on);
    },
  };
  return b;
}


// ---------- one shared scene ----------
let renderer, scene, camera, controls, b, host, t0 = null, maxAniso = 1;
const A = [[2, 52, 30], [0, 0, 0]], B = [[9, 25, 49], [-1, 7, -1]];
const AP = [[0, 60, 38], [0, 0, 0]], BP = [[7, 25, 50], [-1, 6.5, -1]];
const narrow = () => (host?.clientWidth || 800) < 560;
function init() {
  renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: /[?&]test/.test(location.search)});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  maxAniso = renderer.capabilities.getMaxAnisotropy();
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
  camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {enableDamping: true, enablePan: false, enableZoom: false, minPolarAngle: 0.15, maxPolarAngle: 1.35});
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-18, 50, 30); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 16; key.shadow.blurSamples = 25; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, {left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140}); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe4e1dc, 0.45));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({opacity: 0.13}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  b = makeBrochure(); b.root.position.set(-W / 2 + 3, 0, 0); scene.add(b.root);
  // tap to open / close
  let down = null; const ray = new THREE.Raycaster(), p = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect(); p.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(p, camera);
    if (ray.intersectObject(b.root, true).length) toggle();
  });
  new ResizeObserver(resize).observe(document.body);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(now => {
    if (!host) return;
    const dt = Math.min(clock.getDelta(), .05);
    if (t0 !== null) {
      const t = (now - t0) / 1000, k = ease((t - .6) / 2.2), [P, Q] = narrow() ? [AP, BP] : [A, B];
      camera.position.lerpVectors(new THREE.Vector3(...P[0]), new THREE.Vector3(...Q[0]), k);
      controls.target.lerpVectors(new THREE.Vector3(...P[1]), new THREE.Vector3(...Q[1]), k); camera.lookAt(controls.target);
      b.angle = OPEN * ease((t - .9) / 1.6); b.screenOn = t > 2.6;
      if (t > 3.1) { t0 = null; controls.enabled = true; b.manual = false; b.target = OPEN; b.playAt = 0; }
    } else controls.update();
    b.update(now, dt);
    renderer.render(scene, camera);
  });
}
function resize() {
  if (!host) return; const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 560 ? 38 : 28; camera.updateProjectionMatrix();
}
function toTexture(src) {
  if (src instanceof HTMLCanvasElement) { const t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return Promise.resolve(t); }
  return new THREE.TextureLoader().loadAsync(src).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; });
}
export function mount(el) { if (!renderer) init(); host = el; el.appendChild(renderer.domElement); resize(); }
export async function setFaces(faces) { // {front, inl, inr, back}: URLs or canvases
  if (!renderer) init();
  const o = {}; for (const k of ['front', 'inl', 'inr', 'back']) o[k] = await toTexture(faces[k] || faces.front);
  o.edgeCover = edgeColour(o.front.image); o.edgeBase = edgeColour(o.inr.image);
  b.setBrand(o);
}
export function replay() { t0 = performance.now(); b.manual = true; b.screenOn = false; b.angle = 0; controls.enabled = false; const P = narrow() ? AP : A; camera.position.set(...P[0]); controls.target.set(...P[1]); }
export function toggle() { b.manual = false; t0 = null; controls.enabled = true; if (b.target > 0) { b.target = 0; b.playAt = Infinity; } else { b.target = OPEN; b.playAt = performance.now() + 1100; } }

// test hook: freeze rendering so headless screenshots don't wait on the animation loop
window.__comet3d = {freeze() { renderer?.setAnimationLoop(null); renderer?.render(scene, camera); }};
window.__comet3d.state = () => ({angle: b?.angle, target: b?.target, manual: b?.manual, t0, host: !!host});
