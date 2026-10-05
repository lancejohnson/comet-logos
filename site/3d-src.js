import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------- real dimensions, from the "Video Card" dieline (cm) ----------
const W = 21.0, D = 14.8;            // each panel 210 x 148 mm (A5 landscape)
const TB = 0.70, TC = 0.25;          // screen panel and cover thickness
const SPINE = 1.0;                   // spine width when lying open
const SCR = {x: 6.08, y: 4.13, w: 9.70, h: 5.40};   // screen window, from the panel's top-left corner
const PX = 0, PY = TB;           // hinge: the cover turns about the top-left edge of the screen panel, so there is never a gap

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
controls.autoRotate = false; controls.autoRotateSpeed = 0.5;

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

// =====================================================================
// Views. Each one sets up its own scene; switching view reloads the page.
// =====================================================================
const VIEWS = [['intro', 'Intro'], ['slider', 'Slider'], ['scroll', 'Scroll story'], ['display', 'Desk display'], ['lineup', 'Lineup'], ['two', 'Two brochures']];
const params = new URLSearchParams(location.hash.slice(1));
const VIEW = VIEWS.some(v => v[0] === params.get('view')) ? params.get('view') : 'intro';
document.body.classList.add('v-' + VIEW);
const OPEN = 1.80;
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const seg = (p, a, b) => ease((p - a) / (b - a));
const phone = () => stage.clientWidth < 600;
const isPhone = phone();
const brochures = [];
const add = b => { brochures.push(b); return b; };

const toggleBtn = document.getElementById('toggle'), spin = document.getElementById('spin');
spin.onclick = () => { controls.autoRotate = !controls.autoRotate; spin.classList.toggle('on', controls.autoRotate); };
const hint = document.getElementById('hint');
controls.addEventListener('start', () => { hint.style.opacity = 0; });
const capEl = document.getElementById('cap');

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 600 ? 38 : 26; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();
window.__cam = (p, t) => { controls.autoRotate = false; setCam(p, t); };
function setCam(pos, tgt) { camera.position.set(...pos); controls.target.set(...tgt); camera.lookAt(controls.target); }

// tap on a brochure to open or close it (used by several views)
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let pdown = null, onTap = null;
renderer.domElement.addEventListener('pointerdown', e => { pdown = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!onTap || !pdown || Math.hypot(e.clientX - pdown[0], e.clientY - pdown[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = brochures.find(b => ray.intersectObject(b.holder || b.root, true).length); if (hit) onTap(hit);
});
const tapOpenClose = (openTo = OPEN) => b => { if (b.target > 0) { b.target = 0; b.playAt = Infinity; } else { b.target = openTo; b.playAt = performance.now() + 1100; } };

// a holder lets a brochure flip and spin about its own centre
function withHolder(b) {
  const h = new THREE.Group(); h.add(b.root); b.root.position.set(-W / 2, 0, 0); b.holder = h; scene.add(h); return b;
}

let tick = () => {};          // per-frame hook for the active view
let brandTargets = () => brochures;

// ---------- Intro: lies closed, opens, screen powers on ----------
function viewIntro() {
  const b = add(makeBrochure()); b.root.position.set(-W / 2 + 3, 0, 0); scene.add(b.root);
  const A = isPhone ? [[0, 74, 46], [0, 0, 0]] : [[2, 58, 34], [0, 0, 0]];
  const B = isPhone ? [[9, 32, 68], [-1, 6, -1]] : [[10, 29, 56], [-1, 7.5, -1]];
  let t0 = null;
  const start = () => { t0 = performance.now(); b.manual = true; b.screenOn = false; b.angle = 0; controls.enabled = false; };
  toggleBtn.onclick = start; onTap = b2 => { b.manual = false; tapOpenClose()(b2); };
  tick = now => {
    if (t0 === null) return;
    const t = (now - t0) / 1000, k = ease((t - .6) / 2.2);
    camera.position.lerpVectors(new THREE.Vector3(...A[0]), new THREE.Vector3(...B[0]), k);
    controls.target.lerpVectors(new THREE.Vector3(...A[1]), new THREE.Vector3(...B[1]), k); camera.lookAt(controls.target);
    b.angle = OPEN * ease((t - .9) / 1.6); b.screenOn = t > 2.6;
    if (t > 3.1) { t0 = null; controls.enabled = true; b.manual = false; b.target = OPEN; b.playAt = 0; }
    return true;
  };
  setCam(...A); start();
}

// ---------- Slider / Scroll story: one timeline, flat > open > closed > back > all the way round ----------
const STEPS = [[0, 'Closed'], [.12, 'Opens'], [.3, 'Plays'], [.46, 'Closes'], [.6, 'Back'], [.76, 'All round']];
const CAPTIONS = [[0, 'Your design on the cover.'], [.12, 'Open it.'], [.28, 'The video starts by itself.'], [.46, 'Closes flat, fits a mailer.'], [.6, 'Printed on the back too.'], [.76, 'Every side is yours.']];
function timelineBrochure() {
  const b = withHolder(add(makeBrochure())); b.manual = true;
  return p => {
    // open to flat (π) and back
    const open = seg(p, .12, .28) * (1 - seg(p, .46, .58));
    b.angle = Math.PI * open; b.screenOn = p > .25 && p < .5;
    // flip over to show the back, spin all the way round, flip back
    const flip = seg(p, .6, .72) * (1 - seg(p, .93, 1));
    const spinK = seg(p, .76, .92);
    const h = b.holder;
    h.rotation.set(0, 0, 0);
    h.rotation.z = Math.PI * flip;
    h.position.set(0, Math.sin(Math.PI * flip) * 7 + (TB + TC) * flip, 0);
    h.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI * 2 * spinK);
    // keep the open spread centred
    b.root.position.x = -W / 2 + (W / 2) * open;
  };
}
function viewSlider() {
  const pose = timelineBrochure();
  setCam(isPhone ? [0, 40, 54] : [0, 40, 56], [0, 1, 0]);
  const scrub = document.getElementById('scrub'), range = document.getElementById('range'), play = document.getElementById('play'), steps = document.getElementById('steps');
  scrub.hidden = false; steps.innerHTML = STEPS.map(s => `<span>${s[1]}</span>`).join('');
  hint.textContent = 'Drag the slider, or drag the brochure to turn it.';
  let playing = true, p = 0, last = performance.now();
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; };
  range.oninput = () => { playing = false; play.textContent = 'Play'; p = range.value / 1000; };
  toggleBtn.onclick = () => { p = 0; playing = true; play.textContent = 'Pause'; };
  tick = now => {
    const dt = (now - last) / 1000; last = now;
    if (playing) { p = (p + dt / 16) % 1; range.value = p * 1000; }
    pose(p);
    steps.querySelectorAll('span').forEach((el, i) => el.classList.toggle('on', p >= STEPS[i][0] && (i === STEPS.length - 1 || p < STEPS[i + 1][0])));
  };
}
function viewScroll() {
  const pose = timelineBrochure();
  controls.enabled = false;
  setCam(isPhone ? [0, 56, 76] : [0, 40, 56], [0, 1, 0]);
  hint.textContent = 'Scroll'; hint.style.bottom = '8px';
  const track = document.getElementById('track');
  let shown = -1;
  tick = () => {
    const r = track.getBoundingClientRect(), span = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / span)) * .999;
    pose(p);
    let i = 0; CAPTIONS.forEach((c, j) => { if (p >= c[0]) i = j; });
    if (i !== shown) { shown = i; capEl.style.opacity = 0; setTimeout(() => { capEl.textContent = CAPTIONS[i][1]; capEl.style.opacity = 1; }, 180); }
    hint.style.opacity = p > .02 ? 0 : 1;
  };
}

// ---------- Desk display: stood up like a card on a desk, on a slow turntable ----------
function viewDisplay() {
  const b = add(makeBrochure());
  // stand it on its long bottom edge; the hinge is vertical
  b.root.rotation.set(Math.PI / 2, 0, 0); b.root.position.set(0, D / 2, 0);
  const g = new THREE.Group(); g.add(b.root); scene.add(g); b.holder = g;
  b.shadow.visible = false;
  b.target = b.angle = 2.2; b.playAt = 0;   // opened like a greeting card, screen facing out
  // turn so the screen panel faces the camera
  g.rotation.y = -0.55; g.position.set(-3, 0, 2);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, .4, 96), new THREE.MeshPhysicalMaterial({color: 0xf4f4f5, roughness: .5, clearcoat: .3}));
  disc.position.y = -.2; disc.receiveShadow = true; scene.add(disc); ground.visible = false;   // the disc takes the shadow; two surfaces at one height flicker
  scene.add(g); g.position.y = 0;
  setCam(isPhone ? [0, 30, 96] : [0, 20, 70], [0, 6, 0]);
  onTap = tapOpenClose(2.2);
  controls.autoRotate = true; controls.autoRotateSpeed = 1.2; spin.classList.add('on');
  toggleBtn.onclick = () => { b.target = 0; b.playAt = Infinity; setTimeout(() => { b.target = 2.2; b.playAt = performance.now() + 900; }, 1300); };
}

// ---------- Lineup: three designs side by side, all playing ----------
function viewLineup() {
  const keys = ['Netflix', 'MicrosoftAzureAI', 'Ozempic'];
  const xs = isPhone ? [[0, 0, -34], [0, 0, 0], [0, 0, 34]] : [[-40, 0, -4], [0, 0, 0], [40, 0, -4]];
  keys.forEach((k, i) => {
    const b = add(makeBrochure()); b.root.position.set(xs[i][0] - W / 2 + 3, 0, xs[i][2]); b.root.rotation.y = isPhone ? 0 : (1 - i) * 0.18; scene.add(b.root);
    b.target = OPEN; b.playAt = performance.now() + 1200 + i * 350; b.brandKey = k;
    loadBrand(k).then(t => b.setBrand(t));
  });
  brochures.forEach((b, i) => { b.angle = 0; });
  brandTargets = () => [];
  document.getElementById('brands').style.display = 'none';
  setCam(isPhone ? [8, 120, 104] : [0, 46, 96], [0, 3, 0]);
  onTap = tapOpenClose();
  toggleBtn.onclick = () => brochures.forEach((b, i) => { b.target = 0; b.playAt = Infinity; setTimeout(() => { b.target = OPEN; b.playAt = performance.now() + 1100; }, 1200 + i * 250); });
}

// ---------- Two brochures: the first version, one open flat and one standing ----------
function viewTwo() {
  // the same design twice: one standing open at the back like a desk card, screen playing;
  // one lying closed in front, cover up. Tap the closed one to open it flat.
  const f = add(makeBrochure());
  const fw = new THREE.Group(); fw.add(f.root); f.root.position.set(-W / 2, 0, -D / 2 + D / 2); fw.position.set(3, 0, 11); fw.rotation.y = .12; scene.add(fw); f.holder = fw;
  f.target = f.angle = 0;
  const st = add(makeBrochure()); st.shadow.visible = false;
  st.root.rotation.set(Math.PI / 2, 0, 0); st.root.position.set(0, D / 2, 0);
  const wrap = new THREE.Group(); wrap.add(st.root); wrap.position.set(-2, 0, -13); wrap.rotation.y = -.55; scene.add(wrap); st.holder = wrap;
  st.target = st.angle = 2.2; st.playAt = performance.now() + 900;
  setCam(isPhone ? [4, 24, 62] : [8, 22, 70], isPhone ? [-0.5, 5, 0] : [0, 5, 0]);
  onTap = b => { if (b === f) tapOpenClose(Math.PI)(b); else tapOpenClose(2.2)(b); };
  controls.autoRotate = false;
  hint.textContent = 'Drag to turn. Tap the closed one to open it.';
  toggleBtn.onclick = () => { f.target = 0; f.playAt = Infinity; st.target = 0; st.playAt = Infinity; setTimeout(() => { st.target = 2.2; st.playAt = performance.now() + 900; }, 1300); };
  window.__openFront = () => onTap(f);
}

({intro: viewIntro, slider: viewSlider, scroll: viewScroll, display: viewDisplay, lineup: viewLineup, two: viewTwo})[VIEW]();

// ---------- toolbar ----------
const vbar = document.getElementById('views');
vbar.innerHTML = '<span>View</span>' + VIEWS.map(([k, n]) => `<button data-v="${k}" class="${k === VIEW ? 'on' : ''}">${n}</button>`).join('');
const bar = document.getElementById('brands');
bar.innerHTML = '<span>Design</span>' + BRANDS.map(([k, n]) => `<button data-b="${k}">${n}</button>`).join('');
let brand = BRANDS.some(b => b[0] === params.get('brand')) ? params.get('brand') : 'Netflix';
const writeHash = () => { try { history.replaceState(null, '', `#view=${VIEW}&brand=${brand}`); } catch (e) {} };
vbar.onclick = e => { const b = e.target.closest('button'); if (!b) return; location.hash = `view=${b.dataset.v}&brand=${brand}`; location.reload(); };
async function setBrand(k) {
  brand = k; const t = await loadBrand(k);
  brandTargets(k).forEach(b => b.setBrand(t));
  showBrand(k);
}
function showBrand(k) { brand = k; bar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.b === k)); writeHash(); }
bar.onclick = e => { const b = e.target.closest('button'); if (b) setBrand(b.dataset.b); };

const clock = new THREE.Clock();
renderer.setAnimationLoop(t => {
  const dt = Math.min(clock.getDelta(), .05);
  const driving = tick(t);  // views that steer the camera return true
  if (!driving && controls.enabled) controls.update();
  brochures.forEach(b => b.update(t, dt));
  renderer.render(scene, camera);
});
(VIEW === 'lineup' ? Promise.all(['Netflix', 'MicrosoftAzureAI', 'Ozempic'].map(loadBrand)) : setBrand(brand)).then(() => {
  document.getElementById('loading').remove(); window.__ready = true;
});
