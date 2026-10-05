// Round 3: shooting-star logos, flat (no gradients), black + red, Archivo.
(function () {
  const L = window.LOGOS;
  const A = "'Archivo', sans-serif";
  const inl = (inner, extra = '') => `<span style="display:inline-flex;align-items:center;line-height:1;white-space:nowrap;${extra}">${inner}</span>`;
  // Tapered tail polygon from tip (tx,ty) to the tangents of a head circle (hx,hy,r).
  const tail = (hx, hy, r, tx, ty, fill, op = 1) => {
    const dx = hx - tx, dy = hy - ty, len = Math.hypot(dx, dy), nx = -dy / len * r, ny = dx / len * r;
    return `<polygon points="${tx},${ty} ${hx + nx},${hy + ny} ${hx - nx},${hy - ny}" fill="${fill}" opacity="${op}"/>`;
  };
  const star = (cx, cy, R, fill) => {
    const r = R * 0.46, p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; p.push(`${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`); }
    return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
  };
  const basic = (accent, s, tailFill = accent, op = 1) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 60 60">${tail(43, 17, 10, 3, 57, tailFill, op)}<circle cx="43" cy="17" r="10" fill="${accent}"/></svg>`;
  const word = (ink, size, text = 'comet', ls = '-.03em', w = 700) => `<span style="font:${w} ${size}px/1 ${A};letter-spacing:${ls};color:${ink}">${text}</span>`;

  L.ss_clean = {
    name: 'Shooting Star', note: 'Round one’s Streak, made flat: one solid tapered tail and a round red head. No gradient, so it prints in one colour.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) { return inl(`${basic(accent, size * 1.05)}${word(ink, size)}`, `gap:${size * .14}px`); },
    icon(accent = this.accent, s = 60) { return basic(accent, s); },
  };

  L.ss_twotone = {
    name: 'Two-Tone Tail', note: 'Same shooting star, with the tail in the text colour and only the head in red. Calmer, more corporate.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) { return inl(`${basic(accent, size * 1.05, ink)}${word(ink, size)}`, `gap:${size * .14}px`); },
    icon(accent = this.accent, s = 60, ink = '#fff') { return basic(accent, s, accent === '#fff' ? '#fff' : ink); },
  };

  L.ss_ohead = {
    name: 'Comet O', note: 'The O in COMET is the comet’s head, with its tail streaking back over the C. The logo is the word.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const d = size * .74, R = 30;
      const svg = `<svg width="${d}" height="${d}" viewBox="0 0 60 60" style="overflow:visible;margin:0 ${size * .04}px;position:relative;z-index:0">${tail(30, 30, 27, -96, -14, accent, .9)}<circle cx="30" cy="30" r="${R}" fill="${accent}"/></svg>`;
      return inl(`<span style="position:relative;z-index:2;font:800 ${size}px/1 ${A};color:${ink};letter-spacing:.01em">C</span>${svg}${word(ink, size, 'MET', '.01em', 800)}`, `padding-top:${size * .45}px;padding-left:${size * .2}px`);
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60">${tail(38, 38, 15, 2, 14, accent, .9)}<circle cx="38" cy="38" r="15" fill="${accent}"/></svg>`;
    },
  };

  L.ss_under = {
    name: 'Streak Underline', note: 'A comet streaks under the wordmark from left to right. Reads as speed and delivery.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const w = size * 2.62;
      return `<span style="display:inline-flex;flex-direction:column;align-items:flex-start;gap:${size * .1}px;line-height:1">${word(ink, size)}<svg width="${w}" height="${size * .26}" viewBox="0 0 262 26">${tail(250, 13, 11, 0, 13, accent)}<circle cx="250" cy="13" r="11" fill="${accent}"/></svg></span>`;
    },
    icon(accent = this.accent, s = 60) { return `<svg width="${s}" height="${s}" viewBox="0 0 60 60">${tail(46, 30, 9, 4, 30, accent)}<circle cx="46" cy="30" r="9" fill="${accent}"/></svg>`; },
  };

  L.ss_speed = {
    name: 'Speed Lines', note: 'A red head with three tapering lines behind it, the classic shooting-star drawing. Lively but still simple.',
    accent: '#E8304A',
    mark(accent, s, lines = accent) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60">
        ${tail(40, 20, 4.5, 2, 44, lines)}${tail(44, 26, 4, 14, 54, lines, .7)}${tail(36, 14, 3.4, 10, 32, lines, .45)}
        <circle cx="44" cy="17" r="11" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) { return inl(`${this.mark(accent, size * 1.05)}${word(ink, size)}`, `gap:${size * .14}px`); },
    icon(accent = this.accent, s = 60) { return this.mark(accent, s); },
  };

  L.ss_star = {
    name: 'Star Trail', note: 'A five-point star leading a solid tail. The most “shooting star” of the set, and still flat.',
    accent: '#E8304A',
    mark(accent, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 60 60">${tail(42, 19, 7, 3, 57, accent)}${star(43, 18, 15, accent)}</svg>`; },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) { return inl(`${this.mark(accent, size * 1.05)}${word(ink, size)}`, `gap:${size * .12}px`); },
    icon(accent = this.accent, s = 60) { return this.mark(accent, s); },
  };

  L.ss_arc = {
    name: 'Arc', note: 'A comet arcs over the wordmark and lands above the t. Feels like motion without adding a separate symbol.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const w = size * 2.7, h = size * .62;
      return `<span style="position:relative;display:inline-block;line-height:1;padding-top:${h * .78}px">
        <svg width="${w}" height="${h}" viewBox="0 0 270 62" style="position:absolute;left:0;top:0;overflow:visible"><path d="M0 60 Q120 -2 252 12 Q120 14 0 60Z" fill="${accent}"/><circle cx="252" cy="16" r="11" fill="${accent}"/></svg>${word(ink, size)}</span>`;
    },
    icon(accent = this.accent, s = 60) { return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><path d="M4 52 Q14 16 44 14 Q18 22 4 52Z" fill="${accent}"/><circle cx="45" cy="14" r="9" fill="${accent}"/></svg>`; },
  };
})();
