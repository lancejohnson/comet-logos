// Comet AI designer — chat front end. Talks to chat/server.py.
import * as viewer from './viewer.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FACES = {front: 'Cover', inl: 'Inside left', inr: 'Screen page', back: 'Back'};
const STYLES = ['Clean', 'Bold', 'Photo'];

// ---------------------------------------------------------------- state
const st = {brief: null, id: null, covers: [], chosen: null, faces: {}, logo: null, upload: null,
  paper: 'a5', screen: '7', qty: 250, cover: 'soft', busy: false, inr: null, priceEl: null, stageMsg: null};

// ---------------------------------------------------------------- chat plumbing
function add(cls, html) {
  document.body.classList.add('chatting');
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html; $('thread').appendChild(d);
  requestAnimationFrame(() => d.scrollIntoView({block: 'end', behavior: 'smooth'}));
  return d;
}
const say = html => add('bot', html);
function working(label) {
  const el = say(`<div class="work"><i></i><span><b>${esc(label)}</b> <span class="sec"></span></span></div>`), t = Date.now();
  const iv = setInterval(() => { const s = Math.round((Date.now() - t) / 1000); if (s > 2) el.querySelector('.sec').textContent = s + ' s'; }, 1000);
  return {el, done(html) { clearInterval(iv); if (html === undefined) el.remove(); else el.innerHTML = html; }};
}
async function api(path, body) {
  const r = await fetch(path, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {});
  const j = await r.json().catch(() => ({error: 'Server error ' + r.status}));
  if (!r.ok || j.error) throw new Error(j.error || r.status);
  return j;
}
async function poll(job, onPart) {
  const seen = new Set();
  for (;;) {
    const j = await api('api/job/' + job);
    for (const [k, v] of Object.entries(j.results)) if (!seen.has(k)) { seen.add(k); onPart?.(k, v); }
    if (j.done) return j;
    await sleep(1500);
  }
}
function hold(on) { st.busy = on; $('send').disabled = on; }

// ---------------------------------------------------------------- logo → PNG (works for SVG too)
function rasterize(src) {
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.naturalWidth || 600, h = img.naturalHeight || 200; const k = Math.min(1, 900 / Math.max(w, h)) || 1;
      if (w < 300) { const up = 600 / w; w *= up; h *= up; } else { w *= k; h *= k; }
      const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try { res(c.toDataURL('image/png')); } catch (e) { res(null); }
    };
    img.onerror = () => res(null); img.src = src;
  });
}
async function brandLogo(b) {
  if (st.upload) return st.upload;
  if (b.logo_svg) {
    let s = b.logo_svg; if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const vb = s.match(/viewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (vb && !/<svg[^>]*\swidth=/.test(s)) s = s.replace('<svg', `<svg width="${vb[1] * 4}" height="${vb[2] * 4}"`);
    s = s.replace(/currentColor/g, b.colors?.dark || '#111');
    const png = await rasterize('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)); if (png) return png;
  }
  if (b.logo_url) return rasterize('api/logo?url=' + encodeURIComponent(b.logo_url));
  return null;
}
function isLight(hex) { const n = parseInt((hex || '#fff').slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; }

// ---------------------------------------------------------------- the screen page: AI background + screen, buttons, label, logo drawn exactly
const SCR = {x: 365, y: 248, w: 580, h: 324}, BTN = {y: 707, r: 31, xs: [411, 535, 659, 783, 907]};
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function composeInr(bgUrl, b, logo) {
  const c = document.createElement('canvas'); c.width = 1260; c.height = 888; const g = c.getContext('2d'), col = b.colors || {};
  if (bgUrl) g.drawImage(await loadImg(bgUrl), 0, 0, 1260, 888); else { g.fillStyle = col.dark || '#15151a'; g.fillRect(0, 0, 1260, 888); }
  g.fillStyle = '#060607'; roundRect(g, SCR.x - 6, SCR.y - 6, SCR.w + 12, SCR.h + 12, 10); g.fill();
  const btn = col.primary && !isLight(col.primary) ? col.primary : (col.accent || '#E50914');
  BTN.xs.forEach((x, i) => {
    g.fillStyle = btn; g.beginPath(); g.arc(x, BTN.y, BTN.r, 0, 7); g.fill(); g.fillStyle = '#fff'; icon(g, i, x, BTN.y);
  });
  const label = (b.screen_label || 'Watch').split(/\s+/);
  g.fillStyle = '#fff'; g.font = '700 50px Archivo, sans-serif'; g.textBaseline = 'middle';
  const lh = 58, y0 = SCR.y + SCR.h / 2 - (label.length - 1) * lh / 2;
  label.slice(0, 2).forEach((w, i) => { let fs = 50; while (g.measureText(w).width > 280 && fs > 26) { fs -= 2; g.font = `700 ${fs}px Archivo, sans-serif`; } g.fillText(w, 60, y0 + i * lh); });
  if (logo) {
    const im = await loadImg(logo).catch(() => null);
    if (im) {
      const maxW = 220, maxH = 110, k = Math.min(maxW / im.width, maxH / im.height), w = im.width * k, h = im.height * k;
      const cx = (SCR.x + SCR.w + 1260) / 2, cy = SCR.y + SCR.h / 2;
      g.fillStyle = 'rgba(255,255,255,.94)'; roundRect(g, cx - w / 2 - 14, cy - h / 2 - 12, w + 28, h + 24, 12); g.fill();
      g.drawImage(im, cx - w / 2, cy - h / 2, w, h);
    }
  }
  return c;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function icon(g, i, x, y) {
  const tri = (x0, dir) => { g.beginPath(); g.moveTo(x0, y - 10); g.lineTo(x0 + 13 * dir, y); g.lineTo(x0, y + 10); g.fill(); };
  if (i === 0) { g.fillRect(x - 13, y - 10, 3.5, 20); tri(x + 1, -1); tri(x + 13, -1); }
  if (i === 1) { tri(x - 13, 1); tri(x - 1, 1); g.fillRect(x + 10, y - 10, 3.5, 20); }
  if (i === 2) { tri(x - 11, 1); g.fillRect(x + 4, y - 10, 3.5, 20); g.fillRect(x + 10, y - 10, 3.5, 20); }
  if (i > 2) { g.beginPath(); g.moveTo(x - 14, y - 5); g.lineTo(x - 8, y - 5); g.lineTo(x - 1, y - 11); g.lineTo(x - 1, y + 11); g.lineTo(x - 8, y + 5); g.lineTo(x - 14, y + 5); g.fill();
    g.fillRect(x + 4, y - 1.75, 11, 3.5); if (i === 4) g.fillRect(x + 7.75, y - 5.5, 3.5, 11); }
}

// ---------------------------------------------------------------- brief card
function briefCard(b, logo) {
  const c = b.colors || {}, dark = b.logo_on === 'dark';
  return `<div class="brief">${logo ? `<div class="logo${dark ? ' dark' : ''}"><img src="${logo}" alt="${esc(b.brand_name)} logo"></div>` : ''}
    <div class="sw">${['primary', 'secondary', 'accent', 'dark', 'light'].filter(k => c[k]).map(k => `<span title="${k} ${c[k]}" style="background:${c[k]}"></span>`).join('')}</div>
    <div class="meta"><b>“${esc(b.cover_headline)}”</b>${esc(b.fonts?.headline || '')}${b.fonts?.headline && b.tone ? ' · ' : ''}${esc(b.tone || '')}</div></div>`;
}

// ---------------------------------------------------------------- design flow
async function design(request, urls) {
  if (!urls.length && (!request || request.split(/\s+/).length < 4) && !st.upload) {
    say('<p>What’s your website? Paste it here and I’ll pull your logo, colours and fonts. You can also attach your logo with the paperclip.</p>'); $('msg').focus(); return;
  }
  hold(true);
  try {
    const w = working(urls.length ? `Reading ${urls[0].replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '')}` : 'Working out a brief');
    const b = await api('api/brief', {request, urls});
    st.brief = b; st.logo = await brandLogo(b);
    w.done(`<p>${esc(b.summary || `Here’s what I found for ${b.brand_name}.`)}</p>${briefCard(b, st.logo)}`);
    if (!st.logo) say('<p class="fine">I couldn’t get a clean copy of your logo, so the designs will spell out the name. Attach your logo with the paperclip for the real one.</p>');
    await covers();
  } catch (e) { say(`<p class="err">That didn’t work: ${esc(e.message)}. Try again, or paste a different link.</p>`); }
  hold(false);
}

async function covers() {
  const msg = say(`<p>Three covers coming up — about 30 seconds.</p><div class="covers">${STYLES.map((s, i) => `<button disabled data-cover="${i}"><div class="img shimmer"></div><span>${s}</span></button>`).join('')}</div>`);
  const r = await api('api/covers', {brief: st.brief, logo: st.logo});
  st.id = r.id; st.covers = []; st.chosen = null; st.faces = {}; setHash();
  const j = await poll(r.job, (k, url) => {
    const i = +k.slice(5); st.covers[i] = url;
    const btn = msg.querySelector(`[data-cover="${i}"]`); btn.disabled = false;
    btn.querySelector('.img').classList.remove('shimmer'); btn.querySelector('.img').innerHTML = `<img src="${url}" alt="${STYLES[i]} cover">`;
  });
  msg.querySelector('p').textContent = Object.keys(j.errors).length === 3 ? 'The designer didn’t respond. Try again in a minute.' : 'Pick a cover, or tell me what to change.';
  msg.querySelectorAll('[data-cover]').forEach(b => { if (!st.covers[+b.dataset.cover]) b.remove(); });
}

async function choose(i, el) {
  if (st.busy || !st.id) return;
  el?.closest('.covers')?.querySelectorAll('[data-cover]').forEach(b => b.classList.toggle('on', b === el));
  hold(true);
  st.chosen = i; st.faces = {front: st.covers[i]}; st.inr = await composeInr(null, st.brief, st.logo);
  showStage(`Here it is in 3D. Drag to turn it, tap to open or close.`, true);
  try {
    const r = await api('api/faces', {id: st.id, cover: i}); setHash();
    const j = await poll(r.job, (k, url) => { st.faces[k] = url; refreshFaces(k); });
    st.stageMsg.querySelector('.badge')?.remove();
    if (Object.keys(j.errors).length) say(`<p class="err">${Object.keys(j.errors).map(k => FACES[k]).join(', ')} didn’t come out. Say “redo the ${FACES[Object.keys(j.errors)[0]].toLowerCase()}” to try again.</p>`);
    say(`<p>That’s the whole brochure. Want changes? Just say what — “make it darker”, “change the headline to …”. Or pick a size:</p>`);
    priceCard();
  } catch (e) { say(`<p class="err">${esc(e.message)}</p>`); }
  hold(false);
}

let faceTextures = {};
async function refreshFaces(k) {
  if (k === 'inr' || !k) st.inr = await composeInr(st.faces.inr, st.brief, st.logo);
  const f = {...st.faces, inr: st.inr};
  for (const key of ['inl', 'back']) if (!f[key]) f[key] = st.inr;
  await viewer.setFaces(f);
  renderPages();
  if (st.priceEl) renderPrice();
}
function renderPages() {
  const el = st.stageMsg?.querySelector('.pages'); if (!el) return;
  el.innerHTML = Object.keys(FACES).map(k => `<figure data-face="${k}">${k === 'inr' ? '' : st.faces[k] ? `<img src="${st.faces[k]}" alt="">` : '<img class="shimmer" alt="">'}<figcaption>${FACES[k]}</figcaption></figure>`).join('');
  const fig = el.querySelector('[data-face="inr"]'); const c = document.createElement('canvas'); c.width = 630; c.height = 444;
  c.getContext('2d').drawImage(st.inr, 0, 0, 630, 444); fig.prepend(c);
}
function showStage(text, loading) {
  st.stageMsg?.querySelector('.stage canvas')?.remove();
  st.stageMsg = say(`<p>${esc(text)}</p><div class="stage">${loading ? '<div class="badge"><i></i>Making the inside and back</div>' : ''}<div class="hint">Drag to turn · tap to open</div></div>
    <div class="pages"></div>
    <div class="chips"><button data-say="Make it darker">Make it darker</button><button data-say="Change the headline">Change the headline</button><button data-say="Use a photo on the cover">Photo cover</button><button data-act="replay">Replay</button><button data-say="Show me sizes and prices">Sizes and prices</button></div>`);
  viewer.mount(st.stageMsg.querySelector('.stage'));
  refreshFaces().then(() => viewer.replay());
}

async function edit(what, faces) {
  if (!st.id) return design(what, []);
  if (st.chosen === null) { st.brief._request = (st.brief._request || '') + '. Change: ' + what; hold(true); try { await covers(); } finally { hold(false); } return; }
  hold(true);
  const names = (faces || Object.keys(FACES)).filter(k => st.faces[k]);
  const w = working(`Changing the ${names.map(k => FACES[k].toLowerCase()).join(', ')}`);
  try {
    const r = await api('api/edit', {id: st.id, edit: what, faces: names});
    const j = await poll(r.job, (k, url) => { st.faces[k] = url; refreshFaces(k); });
    w.done(Object.keys(j.errors).length ? `<p class="err">Some pages didn’t change: ${Object.keys(j.errors).map(k => FACES[k]).join(', ')}.</p>` : undefined);
    showStage('Updated. Anything else?', false);
  } catch (e) { w.done(`<p class="err">${esc(e.message)}</p>`); }
  hold(false);
}

// ---------------------------------------------------------------- pricing (sizes from Allen Meihao's quote; prices are placeholders)
const PAPER = [{id: 'card', name: 'Business card', w: 89, h: 51, def: '2.4', screens: ['2.4']},
  {id: 'a5', name: 'A5', w: 210, h: 148, def: '7', screens: ['4.5', '5', '7']},
  {id: 'a4', name: 'A4', w: 297, h: 210, def: '10', screens: ['10']}];
const SCREEN = [{id: '2.4', name: '2.4-inch', w: 48.8, h: 36.6, p: [29, 22, 17, 13, 11, 9]},
  {id: '4.5', name: '4.5-inch', w: 99.6, h: 56, p: [44, 35, 28, 23, 19, 16]},
  {id: '5', name: '5-inch', w: 110.7, h: 62.3, p: [48, 38, 31, 25, 21, 17]},
  {id: '7', name: '7-inch', w: 152, h: 85, p: [64, 50, 38, 29, 23, 18]},
  {id: '10', name: '10-inch', w: 221, h: 124, p: [108, 90, 76, 64, 58, 54]}];
const HARD = [4, 3, 2, 1, 1, 1], QTY = [25, 50, 100, 250, 500, 1000];
const IN = 25.4, inch = mm => (mm / IN).toFixed(1).replace(/\.0$/, ''), money = n => '$' + Math.round(n).toLocaleString('en-US');
const P = () => PAPER.find(p => p.id === st.paper), S = () => SCREEN.find(s => s.id === st.screen);
const tier = n => QTY.reduce((a, q, i) => n >= q ? i : a, 0);
const unit = (s, i) => s.p[i] + (st.cover === 'hard' ? HARD[i] : 0);

let uid = 0;
const img = (href, x, y, w, h, clip) => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${clip ? ` clip-path="url(#${clip})"` : ''}/>`;
const shadow = (x, y, w, h) => `<rect x="${x + 2}" y="${y + 3}" width="${w}" height="${h}" rx="1.5" fill="rgba(0,0,0,.2)" filter="url(#blur)"/>`;
function art() {
  return {cover: st.faces.front || 'site/img/pc/cover.webp', inl: st.faces.inl || 'site/img/pc/inside.webp', inr: st.inr?.toDataURL ? (st._inrUrl ||= st.inr.toDataURL('image/jpeg', .8)) : null};
}
function closed(x, y, p) { const id = 'k' + (++uid), a = art();
  return shadow(x, y, p.w, p.h) + `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${p.w}" height="${p.h}" rx="1.2"/></clipPath></defs>${img(a.cover, x, y, p.w, p.h, id)}`; }
function open(x, y, p, s) {
  const id = 'c' + (++uid), a = art(), W = p.w, H = p.h, bx = x + W, col = st.brief?.colors || {};
  const exact = p.id === 'a5' && s.id === '7' && a.inr;
  const sx = bx + (W - s.w) / 2, sy = y + (H - s.h - 14) / 2 - (s.h > H * .7 ? -7 : 0), r = Math.max(1.6, Math.min(4, s.h * .055));
  let right;
  if (exact) right = img(a.inr, bx, y, W, H, id + 'r') + img(a.cover, bx + 365 / 6, y + 248 / 6, 580 / 6, 324 / 6, id + 's');
  else {
    right = `<rect x="${bx}" y="${y}" width="${W}" height="${H}" fill="${col.dark || '#2a2525'}"/><rect x="${sx - 1.2}" y="${sy - 1.2}" width="${s.w + 2.4}" height="${s.h + 2.4}" rx="1" fill="#0b0b0b"/>${img(a.cover, sx, sy, s.w, s.h, id + 's')}`;
    if (s.h + 16 <= H - 4) for (let i = 0; i < 5; i++) right += `<circle cx="${sx + s.w / 2 + (i - 2) * r * 3}" cy="${sy + s.h + 7}" r="${r}" fill="${col.primary && !isLight(col.primary) ? col.primary : '#E50914'}"/>`;
  }
  const scr = exact ? [bx + 365 / 6, y + 248 / 6, 580 / 6, 324 / 6] : [sx, sy, s.w, s.h];
  return `<defs><clipPath id="${id}l"><rect x="${x}" y="${y}" width="${W}" height="${H}"/></clipPath><clipPath id="${id}r"><rect x="${bx}" y="${y}" width="${W}" height="${H}"/></clipPath><clipPath id="${id}s"><rect x="${scr[0]}" y="${scr[1]}" width="${scr[2]}" height="${scr[3]}"/></clipPath></defs>
   ${shadow(x, y, W * 2, H)}${img(a.inl, x, y, W, H, id + 'l')}${right}<line x1="${bx}" y1="${y}" x2="${bx}" y2="${y + H}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>`;
}
const PH = {name: 'iPhone 16', w: 71.6, h: 147.6};
function phone(x, y) {
  return `<rect x="${x + 1.5}" y="${y + 2.5}" width="71.6" height="147.6" rx="11" fill="rgba(0,0,0,.2)" filter="url(#blur)"/><rect x="${x}" y="${y}" width="71.6" height="147.6" rx="11" fill="#1d1d1f"/>
  <rect x="${x + 2.6}" y="${y + 2.6}" width="66.4" height="142.4" rx="8.6" fill="url(#phonescr)"/><rect x="${x + 27}" y="${y + 5.5}" width="17.6" height="5.2" rx="2.6" fill="#000"/>
  <text x="${x + 35.8}" y="${y + 40}" font-size="15" font-weight="300" fill="rgba(255,255,255,.9)" font-family="Archivo" text-anchor="middle">9:41</text>
  ${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<rect x="${x + 9 + c * 14.5}" y="${y + 60 + r * 16}" width="10" height="10" rx="2.6" fill="rgba(255,255,255,.28)"/>`).join('')).join('')}`;
}
function ruler(x, y, n) {
  let t = `<rect x="${x}" y="${y}" width="${n * IN}" height="14" fill="#F3D35B" stroke="#d1b23f" stroke-width=".4"/>`;
  for (let i = 0; i <= n * 4; i++) { const xx = x + i * IN / 4, h = i % 4 === 0 ? 7 : i % 2 === 0 ? 5 : 3; t += `<line x1="${xx}" y1="${y}" x2="${xx}" y2="${y + h}" stroke="#4a3d00" stroke-width=".45"/>`; if (i % 4 === 0 && i > 0 && i < n * 4) t += `<text x="${xx}" y="${y + 12}" font-size="5" text-anchor="middle" fill="#4a3d00" font-family="Archivo">${i / 4}</text>`; }
  return t + `<text x="${x + n * IN - 3}" y="${y + 12}" font-size="5" text-anchor="end" fill="#4a3d00" font-family="Archivo">inches</text>`;
}
function drawing() {
  uid = 0; const p = P(), s = S(), G = 14, LS = Math.max(6.5, Math.max(PH.w + G + p.w, 2 * p.w) * .032);
  const L = (x, y, t) => `<text x="${x}" y="${y}" font-family="Archivo" font-size="${LS}" font-weight="700" fill="#333" text-anchor="middle">${t}</text>`;
  const H = Math.max(PH.h, p.h), bx = PH.w + G;
  let body = phone(0, H - PH.h) + closed(bx, H - p.h, p) + L(PH.w / 2, H + LS + 2, PH.name) + L(bx + p.w / 2, H + LS + 2, `${p.name}, closed`);
  const y2 = H + LS + 13; body += open(0, y2, p, s) + L(p.w, y2 + p.h + LS + 2, `${p.name}, open`);
  const y3 = y2 + p.h + LS + 9, Wd = Math.max(bx + p.w, 2 * p.w), n = Math.max(4, Math.floor(Wd / IN)); body += ruler(0, y3, n);
  return `<svg viewBox="-6 -6 ${Wd + 12} ${y3 + 28}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
   <linearGradient id="phonescr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b6cff"/><stop offset="1" stop-color="#b14bd8"/></linearGradient></defs>${body}</svg>`;
}
function priceCard() { st.priceEl?.remove(); st.priceEl = say('<div class="price"></div>'); renderPrice(); }
function renderPrice() {
  const el = st.priceEl?.querySelector('.price'); if (!el) return;
  st._inrUrl = null;
  const p = P(), s = S(), i = tier(st.qty), u = unit(s, i), n = Math.max(25, st.qty);
  let tip = '';
  for (let j = i + 1; j < QTY.length; j++) { const tot = unit(s, j) * QTY[j]; if (tot <= u * n) { tip = `${QTY[j].toLocaleString()} cost ${money(tot)} in total — less than ${n.toLocaleString()} at ${money(u)} each. You get ${(QTY[j] - n).toLocaleString()} more for ${money(u * n - tot)} less.`; } }
  if (!tip && i < QTY.length - 1) { const j = i + 1, more = unit(s, j) * QTY[j] - u * n; if (more / (u * n) < .35) tip = `At ${QTY[j].toLocaleString()} the price drops to ${money(unit(s, j))} each (${money(more)} more in total).`; }
  el.innerHTML = `<div><h4>Size</h4><div class="chips">${PAPER.map(q => `<button class="${q.id === p.id ? 'on' : ''}" data-paper="${q.id}">${q.name}<small>${inch(q.w)} × ${inch(q.h)} in</small></button>`).join('')}</div></div>
   <div><h4>Screen</h4><div class="chips">${SCREEN.map(q => `<button class="${q.id === s.id ? 'on' : ''} ${p.screens.includes(q.id) ? '' : 'off'}" data-screen="${q.id}">${q.name}</button>`).join('')}</div></div>
   <div class="draw">${drawing()}</div>
   <div class="dims"><span>Closed <b>${inch(p.w)} × ${inch(p.h)} in</b></span><span>Open <b>${inch(p.w * 2)} × ${inch(p.h)} in</b></span><span>Screen <b>${s.name}</b></span></div>
   <div><h4>Cover</h4><div class="chips"><button class="${st.cover === 'soft' ? 'on' : ''}" data-cov="soft">Softcover</button><button class="${st.cover === 'hard' ? 'on' : ''}" data-cov="hard">Hardcover</button></div></div>
   <div><h4>How many</h4><div class="chips">${QTY.map((q, k) => `<button class="${QTY.includes(n) && q === n ? 'on' : ''}" data-qty="${q}">${q.toLocaleString()}<small>${money(unit(s, k))} each</small></button>`).join('')}</div></div>
   <div class="total"><b>${money(u * n)}</b><span>${n.toLocaleString()} brochures · ${money(u)} each</span></div>
   ${tip ? `<div class="tip">${tip}</div>` : ''}
   <div><button class="buy" data-act="order">${st.id ? 'Order these' : 'Design yours first'}</button></div>`;
}
function orderForm() {
  if (!st.id) { say('<p>Paste your website and I’ll design yours first — it takes about a minute.</p>'); $('msg').focus(); return; }
  const p = P(), s = S(), n = Math.max(25, st.qty), u = unit(s, tier(n));
  const m = say(`<p>${n.toLocaleString()} × ${p.name}, ${s.name} screen, ${st.cover === 'hard' ? 'hardcover' : 'softcover'} — ${money(u * n)}. Where should we send the proof?</p>
    <form class="order"><input type="email" required placeholder="you@company.com" autocomplete="email"><input placeholder="Name and company" autocomplete="name"><button class="buy">Send me the proof</button></form>
    <p class="fine">No payment yet. We’ll email a print proof and checkout link.</p>`);
  m.querySelector('form').onsubmit = async e => {
    e.preventDefault(); const [em, nm] = m.querySelectorAll('input');
    await api('api/order', {design: st.id, email: em.value, name: nm.value, paper: p.id, screen: s.id, cover: st.cover, qty: n, total: u * n, link: location.href}).catch(() => {});
    m.innerHTML = `<p>Thanks. We’ll email the proof to <b>${esc(em.value)}</b> within one business day.</p>`;
  };
}

// ---------------------------------------------------------------- router
async function send(text) {
  if (!text.trim() || st.busy) return;
  add('me', esc(text)); $('msg').value = ''; autosize();
  const site = text.match(/(?:https?:\/\/)?(?:[\w-]+\.)+(?:com|io|co|net|org|ai|us|app|dev|biz|info|health|edu)(?:\/\S*)?/i);
  if (site && !st.id) return design(text, [site[0]]);   // first website: skip the router, start designing
  const t = working('…'); t.el.querySelector('b').textContent = '';
  let r;
  try {
    r = await api('api/chat', {message: text, state: {brand: st.brief?.brand_name, has_covers: !!st.covers.length, cover_chosen: st.chosen !== null, pages: Object.keys(st.faces), paper: st.paper, screen: st.screen, qty: st.qty, cover: st.cover}});
  } catch (e) { t.done(`<p class="err">${esc(e.message)}</p>`); return; }
  t.done(r.reply ? `<p>${esc(r.reply)}</p>` : undefined);
  if (r.paper && PAPER.some(p => p.id === r.paper)) { st.paper = r.paper; st.screen = P().def; }
  if (r.screen && SCREEN.some(s => s.id === r.screen)) { st.screen = r.screen; if (!P().screens.includes(st.screen)) st.paper = PAPER.find(p => p.screens.includes(st.screen)).id; }
  if (r.qty) st.qty = Math.max(25, Math.round(r.qty));
  if (r.action === 'design') return design(r.request || text, r.urls || []);
  if (r.action === 'edit') return edit(r.edit || text, r.faces);
  if (r.action === 'price') return priceCard();
  if (r.action === 'order') return orderForm();
}

// ---------------------------------------------------------------- restore a design from the link (#d=id)
function setHash() { history.replaceState(null, '', st.id ? '#d=' + st.id : location.pathname); }
async function restore(id) {
  try {
    const d = await api('api/design/' + id);
    st.id = d.id; st.brief = d.brief; st.chosen = d.chosen ?? null; st.faces = d.faces || {};
    st.covers = [0, 1, 2].map(i => `files/${d.id}/cover${i}.jpg`);
    st.logo = d.has_logo ? `files/${d.id}/logo.png` : null;
    say(`<p>Welcome back. Here’s the design for ${esc(d.brief.brand_name)}.</p>${briefCard(d.brief, st.logo)}`);
    if (st.chosen === null) {
      say(`<p>Pick a cover, or tell me what to change.</p><div class="covers">${STYLES.map((s, i) => `<button data-cover="${i}"><div class="img"><img src="${st.covers[i]}" alt=""></div><span>${s}</span></button>`).join('')}</div>`);
    } else { showStage('Drag to turn it, tap to open or close.', false); priceCard(); }
  } catch (e) { history.replaceState(null, '', location.pathname); }
}

// ---------------------------------------------------------------- wiring
const msg = $('msg');
if (innerWidth < 600) msg.placeholder = 'Your website, or your idea';
function autosize() { msg.style.height = 'auto'; msg.style.height = Math.min(140, msg.scrollHeight) + 'px'; }
msg.addEventListener('input', autosize);
msg.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(msg.value); } });
$('form').onsubmit = e => { e.preventDefault(); send(msg.value); };
$('clip').onclick = () => $('file').click();
$('file').onchange = async () => {
  const f = $('file').files[0]; if (!f) return;
  const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
  st.upload = await rasterize(url) || url; st.logo = st.upload;
  $('attached').hidden = false; $('attached').textContent = `Logo attached: ${f.name}`;
  if (!document.body.classList.contains('chatting')) msg.placeholder = 'Now paste your website, or describe your brochure';
};
$('restart').onclick = () => { location.hash = ''; location.reload(); };
document.addEventListener('click', e => {
  const s = e.target.closest('[data-say]'); if (s) { if (s.dataset.say === 'Design one from my website') { add('me', s.dataset.say); design('', []); } else send(s.dataset.say); return; }
  const c = e.target.closest('[data-cover]'); if (c && !c.disabled) { choose(+c.dataset.cover, c); return; }
  const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'replay') viewer.replay(); if (a.dataset.act === 'order') orderForm(); return; }
  const b = e.target.closest('.price button'); if (!b) return;
  if (b.dataset.paper) { st.paper = b.dataset.paper; st.screen = P().def; }
  if (b.dataset.screen) { st.screen = b.dataset.screen; if (!P().screens.includes(st.screen)) st.paper = PAPER.find(p => p.screens.includes(st.screen)).id; }
  if (b.dataset.cov) st.cover = b.dataset.cov;
  if (b.dataset.qty) st.qty = +b.dataset.qty;
  renderPrice();
});
// reel
const imgs = [...document.querySelectorAll('#reel img')]; let ri = 0;
setInterval(() => { if (document.body.classList.contains('chatting')) return; const o = imgs[ri]; o.classList.remove('on'); o.classList.add('out'); setTimeout(() => o.classList.remove('out'), 700); ri = (ri + 1) % imgs.length; imgs[ri].classList.add('on'); }, 2600);
$('navlogo').innerHTML = window.LOGOS?.ss_clean ? LOGOS.ss_clean.html({ink: '#0F1222', accent: '#2F4BFF', size: 22}) : '<b>Comet</b>';
const hd = location.hash.match(/d=([a-z0-9]+)/); if (hd) restore(hd[1]);
else if (location.hash === '#pricing') { history.replaceState(null, '', location.pathname); add('me', 'Get pricing'); say('<p>Here are the sizes and sample prices. Paste your website any time and I’ll put your own design on it.</p>'); priceCard(); }
