// Round 4: different vibes — serifs, script, slab, wide, mono. Flat, one accent colour.
(function () {
  const L = window.LOGOS;
  const f = document.createElement('link');
  f.rel = 'stylesheet';
  f.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Fraunces:opsz,wght@9..144,800&family=Playfair+Display:ital,wght@0,600;1,600&family=Yellowtail&family=Zilla+Slab:wght@700&family=Unbounded:wght@800&family=JetBrains+Mono:wght@700&family=Inter:wght@500;600&display=block';
  document.head.appendChild(f);

  const inl = (inner, extra = '') => `<span style="display:inline-flex;align-items:center;line-height:1;white-space:nowrap;${extra}">${inner}</span>`;
  const tail = (hx, hy, r, tx, ty, fill, op = 1) => {
    const dx = hx - tx, dy = hy - ty, len = Math.hypot(dx, dy), nx = -dy / len * r, ny = dx / len * r;
    return `<polygon points="${tx},${ty} ${hx + nx},${hy + ny} ${hx - nx},${hy - ny}" fill="${fill}" opacity="${op}"/>`;
  };
  const star = (cx, cy, R, fill) => {
    const r = R * 0.45, p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; p.push(`${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`); }
    return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
  };
  const sparkle = (cx, cy, R, fill) =>
    `<path d="M${cx} ${cy - R}Q${cx} ${cy} ${cx + R} ${cy}Q${cx} ${cy} ${cx} ${cy + R}Q${cx} ${cy} ${cx - R} ${cy}Q${cx} ${cy} ${cx} ${cy - R}Z" fill="${fill}"/>`;
  const light = (hex) => { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); if (h.length !== 6) return false; const n = parseInt(h, 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) > 170; };
  const COBALT = '#2F4BFF', AMBER = '#E89A00';

  // 1. Editorial italic: the full stop is a comet falling into place.
  L.sf_italic = {
    name: 'Editorial Italic', note: 'A light italic serif, like a magazine masthead. The full stop is a small comet, its tail trailing up and away.',
    accent: COBALT,
    dot(accent, s) { return `<svg width="${s * .62}" height="${s * .62}" viewBox="0 0 40 40" style="display:inline-block;vertical-align:baseline;overflow:visible;margin-left:${s * .03}px">${tail(7, 33, 6.5, 44, -4, accent, .9)}<circle cx="7" cy="33" r="7" fill="${accent}"/></svg>`; },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const F = size * 1.3;
      return `<span style="display:inline-block;line-height:1;white-space:nowrap;font:italic 400 ${F}px/1 'Instrument Serif',serif;letter-spacing:-.01em;color:${ink}">Comet${this.dot(accent, F * .5)}</span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="26" y="47" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="58" fill="${accent}">C</text>${tail(45, 44, 4.5, 58, 22, accent, .9)}<circle cx="45" cy="44" r="5" fill="${accent}"/></svg>`;
    },
  };

  // 2. Soft serif: warm and friendly, a twinkle over the t.
  L.sf_soft = {
    name: 'Soft Serif', note: 'A heavy, rounded serif with a small twinkle above the t. Warm and friendly, more boutique than tech.',
    accent: AMBER,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return `<span style="position:relative;display:inline-block;line-height:1;white-space:nowrap;font:800 ${size * 1.05}px/1 'Fraunces',serif;font-variation-settings:'opsz' 144;letter-spacing:-.03em;color:${ink};padding-right:${size * .32}px">comet<svg width="${size * .46}" height="${size * .46}" viewBox="0 0 40 40" style="position:absolute;right:${-size * .02}px;top:${-size * .22}px">${sparkle(22, 18, 17, accent)}${sparkle(6, 34, 6, accent)}</svg></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="25" y="50" text-anchor="middle" font-family="Fraunces" font-weight="800" font-size="56" fill="${accent}">c</text>${sparkle(46, 14, 11, accent)}</svg>`;
    },
  };

  // 3. Classic Didone caps with a hairline comet arc.
  L.sf_didone = {
    name: 'Classic Caps', note: 'High-contrast serif capitals, widely spaced, with a hairline comet arcing over them and “Video brochures” underneath. Feels premium and print-first.',
    accent: COBALT,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const w = size * 3.9;
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;white-space:nowrap;color:${ink}">
        <svg width="${w}" height="${size * .42}" viewBox="0 0 390 42" style="overflow:visible;margin-bottom:${size * .1}px"><path d="M40 40 Q200 2 334 8 Q200 12 40 40Z" fill="${accent}"/><circle cx="336" cy="10" r="6" fill="${accent}"/></svg>
        <span style="font:600 ${size}px/1 'Playfair Display',serif;letter-spacing:.2em;margin-right:-.2em">COMET</span>
        <span style="font:500 ${size * .19}px/1 Inter,sans-serif;letter-spacing:.42em;margin:${size * .22}px -.42em 0 0;opacity:.75">VIDEO BROCHURES</span></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="30" y="47" text-anchor="middle" font-family="Playfair Display" font-weight="600" font-size="46" fill="${accent}">C</text><path d="M6 20 Q30 4 50 9 Q30 8 6 20Z" fill="${accent}"/><circle cx="51" cy="9" r="3.6" fill="${accent}"/></svg>`;
    },
  };

  // 4. Seal: a round badge, like a stamp or a wax seal.
  L.seal = {
    name: 'Seal', note: 'A round badge with the name around the edge and a serif C with a comet in the middle. Works as a sticker, a stamp on the brochure box, or a social profile picture.',
    accent: COBALT,
    badge(ink, accent, s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 120 120"><defs><path id="sealp" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="60" cy="60" r="34" fill="none" stroke="${ink}" stroke-width="1"/>
        <text font-family="Inter" font-weight="600" font-size="10.5" fill="${ink}"><textPath href="#sealp" textLength="272" lengthAdjust="spacing">COMET ✦ VIDEO BROCHURES ✦</textPath></text>
        <text x="58" y="77" text-anchor="middle" font-family="Playfair Display" font-style="italic" font-weight="600" font-size="46" fill="${accent}">C</text>
        <circle cx="74" cy="47" r="4" fill="${accent}"/>${tail(74, 47, 3.6, 92, 34, accent, .85)}</svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.badge(ink, accent, size * 1.7)}<span style="font:italic 600 ${size}px/1 'Playfair Display',serif;color:${ink};letter-spacing:-.01em">Comet</span>`, `gap:${size * .28}px`);
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill="none" stroke="${accent}" stroke-width="2.6"/><text x="28" y="44" text-anchor="middle" font-family="Playfair Display" font-style="italic" font-weight="600" font-size="38" fill="${accent}">C</text><circle cx="41" cy="20" r="3.4" fill="${accent}"/>${tail(41, 20, 3, 55, 10, accent, .85)}</svg>`;
    },
  };

  // 5. Retro script with a swash that ends in a star.
  L.script = {
    name: 'Retro Script', note: 'A 1950s sign-painter script with a swash underneath that ends in a star. Fun and nostalgic, like a diner sign or a vintage postcard.',
    accent: AMBER,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const F = size * 1.35;
      return `<span style="position:relative;display:inline-block;line-height:1;white-space:nowrap;padding:0 ${size * .5}px ${size * .34}px 0">
        <span style="font:400 ${F}px/1 'Yellowtail',cursive;color:${ink};position:relative;z-index:1">Comet</span>
        <svg viewBox="0 0 300 40" preserveAspectRatio="none" style="position:absolute;left:${size * .3}px;right:0;bottom:0;width:calc(100% - ${size * .3}px);height:${size * .5}px;overflow:visible"><path d="M0 30 Q140 6 268 18 Q140 14 0 30Z" fill="${accent}"/></svg>
        <svg width="${size * .52}" height="${size * .52}" viewBox="0 0 40 40" style="position:absolute;right:${-size * .1}px;bottom:${size * .02}px">${star(20, 21, 19, accent)}</svg></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="27" y="46" text-anchor="middle" font-family="Yellowtail" font-size="52" fill="${accent}">C</text>${star(47, 15, 10, accent)}</svg>`;
    },
  };

  // 6. Slab label: the name printed on a solid tag.
  L.label = {
    name: 'Slab Label', note: 'A sturdy slab serif printed on a solid tag, with a small comet in the corner. Feels like a shipping label or a print shop’s stamp.',
    accent: COBALT,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const fg = light(accent) ? '#111' : '#fff';
      return `<span style="display:inline-flex;align-items:center;gap:${size * .2}px;line-height:1;white-space:nowrap;background:${accent};color:${fg};padding:${size * .2}px ${size * .34}px ${size * .2}px ${size * .26}px;border-radius:${size * .1}px">
        <svg width="${size * .62}" height="${size * .62}" viewBox="0 0 40 40">${tail(27, 13, 8, 2, 38, fg, .85)}<circle cx="27" cy="13" r="8.5" fill="${fg}"/></svg>
        <span style="font:700 ${size * .92}px/1 'Zilla Slab',serif;letter-spacing:.03em">COMET</span></span>`;
    },
    icon(accent = this.accent, s = 60) {
      const fg = light(accent) ? '#111' : '#fff';
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><rect x="3" y="3" width="54" height="54" rx="7" fill="${accent}"/><text x="27" y="44" text-anchor="middle" font-family="Zilla Slab" font-weight="700" font-size="40" fill="${fg}">C</text><circle cx="45" cy="17" r="5" fill="${fg}"/></svg>`;
    },
  };

  // 7. Wide: extended caps with speed slashes.
  L.wide = {
    name: 'Wide', note: 'Extra-wide, heavy capitals with three speed slashes in front. Bold and sporty, built to be read from across a trade-show floor.',
    accent: COBALT,
    slashes(accent, h) {
      return `<svg width="${h * 1.05}" height="${h}" viewBox="0 0 42 40"><polygon points="14,0 22,0 8,40 0,40" fill="${accent}" opacity=".35"/><polygon points="24,0 32,0 18,40 10,40" fill="${accent}" opacity=".65"/><polygon points="34,0 42,0 28,40 20,40" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.slashes(accent, size * .74)}<span style="font:800 ${size * .82}px/1 'Unbounded',sans-serif;letter-spacing:.01em;color:${ink}">COMET</span>`, `gap:${size * .2}px`);
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><g transform="translate(8 12) scale(.9)"><polygon points="14,0 22,0 8,40 0,40" fill="${accent}" opacity=".35"/><polygon points="24,0 32,0 18,40 10,40" fill="${accent}" opacity=".65"/><polygon points="34,0 42,0 28,40 20,40" fill="${accent}"/></g><circle cx="50" cy="40" r="5.5" fill="${accent}"/></svg>`;
    },
  };

  // 8. Terminal: monospace with a block cursor.
  L.mono = {
    name: 'Terminal', note: 'A monospace typeface with a solid cursor at the end, as if the name is being typed. Reads as software-made, precise and techy.',
    accent: COBALT,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`<span style="font:700 ${size * .9}px/1 'JetBrains Mono',monospace;letter-spacing:-.02em;color:${ink}">comet</span><span style="display:inline-block;width:${size * .46}px;height:${size * .78}px;background:${accent};margin-left:${size * .08}px;transform:translateY(${size * .04}px)"></span>`);
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="4" y="45" font-family="JetBrains Mono" font-weight="700" font-size="44" fill="${accent}">c</text><rect x="34" y="14" width="18" height="33" fill="${accent}"/></svg>`;
    },
  };
})();
