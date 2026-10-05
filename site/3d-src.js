import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------- real dimensions, from the "Video Card" dieline (cm) ----------
const W = 21.0, D = 14.8;            // each panel 210 x 148 mm (A5 landscape)
const TB = 0.70, TC = 0.25;          // screen panel and cover thickness
const SPINE = 1.0;                   // spine width when lying open
const SCR = {x: 6.08, y: 4.13, w: 9.70, h: 5.40};   // screen window, from the panel's top-left corner
const PX = -SPINE / 2, PY = (TB + TC) / 2;           // hinge pivot

const BRANDS = [
  ['Netflix', 'Netflix'], ['MicrosoftAzureAI', 'Azure'], ['SAP', 'SAP'], ['Salesforce', 'Salesforce'],
  ['Medtronic', 'Medtronic'], ['WellsFargo', 'Wells Fargo'], ['Ozempic', 'Ozempic'], ['Amazon', 'Amazon'],
];

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 40; controls.maxDistance = 140;
controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.35;
controls.autoRotate = true; controls.autoRotateSpeed = 0.5;

const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-18, 50, 30); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 16; key.shadow.blurSamples = 25; key.shadow.bias = -0.0005;
Object.assign(key.shadow.camera, {left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140}); scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0xe4e1dc, 0.45));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({opacity: 0.13}));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// soft contact shadow texture
const cs = document.createElement('canvas'); cs.width = cs.height = 128;
{const g = cs.getContext('2d'); const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);}
const contactTex = new THREE.CanvasTexture(cs);

// ---------- textures ----------
const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const cache = {};
function loadBrand(key) {
  if (cache[key]) return cache[key];
  const faces = ['front', 'inl', 'inr', 'back'];
  return cache[key] = Promise.all(faces.map(f => loader.loadAsync(`tex/${key}-${f}.jpg`))).then(ts => {
    const o = {};
    ts.forEach((t, i) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; o[faces[i]] = t; });
    o.edgeCover = edgeColour(o.front.image); o.edgeBase = edgeColour(o.inr.image);
    return o;
  });
}
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
    playAt: Infinity,
    update(t, dt) {
      if (intro === null) b.angle += (b.target - b.angle) * Math.min(1, dt * 3);
      const a = b.angle, o = a / Math.PI;
      pivot.rotation.z = a;
      // spine: upright strip when closed, flat strip when open
      const oo = Math.min(1, o * 1.6), sw = THREE.MathUtils.lerp(.5, SPINE, oo), sh = THREE.MathUtils.lerp(TB + TC, .24, oo);
      spine.scale.set(sw, sh, 1); spine.position.set(-sw / 2, sh / 2, 0);
      const left = -Math.max(0, Math.cos(Math.min(a, Math.PI)) < 0 ? -Math.cos(a) * W : 0) - Math.sin(Math.min(a, Math.PI / 2)) * 1.5;
      shadow.scale.set((W - left) * 1.15, D * 1.3, 1); shadow.position.x = (W + left) / 2;
      drawScreen(scr, b.img, t, t >= b.playAt && b.target > 0);
    },
  };
  return b;
}

// ---------- scene: one brochure, with an intro: lying closed, opening, then playing ----------
const OPEN = 1.80;                         // cover stands just past upright
const front = makeBrochure();
front.root.position.set(-W / 2 + 3, 0, 0);
scene.add(front.root);
front.playAt = Infinity;

const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const cam = {
  a: {pos: new THREE.Vector3(2, 58, 34), tgt: new THREE.Vector3(0, 0, 0)},
  b: {pos: new THREE.Vector3(10, 29, 56), tgt: new THREE.Vector3(-1, 7.5, -1)},
};
let intro = null;          // start time of the intro, ms
function startIntro() {
  intro = performance.now(); front.angle = front.target = 0; front.playAt = Infinity;
  controls.enabled = false; controls.autoRotate = false; spin.classList.remove('on');
}
function runIntro(now) {
  const t = (now - intro) / 1000;
  const k = ease((t - 0.6) / 2.2);                       // camera glide
  camera.position.lerpVectors(cam.a.pos, cam.b.pos, k);
  controls.target.lerpVectors(cam.a.tgt, cam.b.tgt, k);
  front.angle = front.target = OPEN * ease((t - 0.9) / 1.6);   // cover opens
  if (t > 2.6 && front.playAt === Infinity) { front.playAt = now; front.scr.t0 = now; }
  if (t > 3.0) { intro = null; controls.enabled = true; }
  camera.lookAt(controls.target);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 600 ? 38 : 26; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();
if (stage.clientWidth < 600) { cam.a.pos.set(0, 74, 46); cam.b.pos.set(9, 32, 68); cam.b.tgt.set(-1, 6, -1); }
camera.position.copy(cam.a.pos); controls.target.copy(cam.a.tgt);
controls.autoRotate = false;

// ---------- interaction ----------
const toggleBtn = document.getElementById('toggle');
toggleBtn.textContent = 'Replay';
const spin = document.getElementById('spin'); spin.classList.remove('on');
spin.onclick = () => { controls.autoRotate = !controls.autoRotate; spin.classList.toggle('on', controls.autoRotate); };
toggleBtn.onclick = () => startIntro();
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let pdown = null;
renderer.domElement.addEventListener('pointerdown', e => { pdown = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (intro !== null || !pdown || Math.hypot(e.clientX - pdown[0], e.clientY - pdown[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
  if (ray.intersectObject(front.root, true).length) {
    if (front.target > 0) { front.target = 0; front.playAt = Infinity; } else { front.target = OPEN; front.playAt = performance.now() + 1200; front.scr.t0 = front.playAt; }
  }
});
controls.addEventListener('start', () => { document.getElementById('hint').style.opacity = 0; });

const bar = document.getElementById('brands');
bar.innerHTML = '<span>Design</span>' + BRANDS.map(([k, n], i) => `<button data-b="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('');
async function setBrand(k) {
  const t = await loadBrand(k); front.setBrand(t);
  bar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.b === k));
  try { history.replaceState(null, '', '#brand=' + k); } catch (e) {}
}
bar.onclick = e => { const b = e.target.closest('button'); if (b) setBrand(b.dataset.b).then(startIntro); };

const clock = new THREE.Clock();
renderer.setAnimationLoop(t => {
  const dt = Math.min(clock.getDelta(), .05);
  if (window.__at != null) { if (intro === null) startIntro(); intro = t - window.__at * 1000; }
  if (intro !== null) runIntro(t); else controls.update();
  front.update(t, dt); renderer.render(scene, camera);
});

const start = (new URLSearchParams(location.hash.slice(1)).get('brand')) || 'Netflix';
setBrand(BRANDS.some(b => b[0] === start) ? start : 'Netflix').then(() => {
  document.getElementById('loading').remove();
  startIntro();
  window.__ready = true;
});
