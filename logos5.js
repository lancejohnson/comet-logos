// Round 5: more vibes — orbit serif, Garamond streak, art deco, marker, bubble, film strip, neon, arcade.
(function () {
  const L = window.LOGOS;
  const f = document.createElement('link');
  f.rel = 'stylesheet';
  f.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Cormorant+Garamond:ital,wght@1,700&family=Josefin+Sans:wght@400;600&family=Permanent+Marker&family=Fredoka:wght@700&family=Bebas+Neue&family=Monoton&family=Silkscreen:wght@700&display=block';
  document.head.appendChild(f);

  const inl = (inner, extra = '') => `<span style="display:inline-flex;align-items:center;line-height:1;white-space:nowrap;${extra}">${inner}</span>`;
  const tail = (hx, hy, r, tx, ty, fill, op = 1) => {
    const dx = hx - tx, dy = hy - ty, len = Math.hypot(dx, dy), nx = -dy / len * r, ny = dx / len * r;
    return `<polygon points="${tx},${ty} ${hx + nx},${hy + ny} ${hx - nx},${hy - ny}" fill="${fill}" opacity="${op}"/>`;
  };
  const star = (cx, cy, R, fill, extra = '') => {
    const r = R * 0.45, p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; p.push(`${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`); }
    return `<polygon points="${p.join(' ')}" fill="${fill}" ${extra}/>`;
  };
  const COBALT = '#2F4BFF', AMBER = '#E89A00';
  let uid = 0;

  // 1. Orbit serif: the o is a planet with a ring.
  L.orbit_serif = {
    name: 'Ringed O', note: 'A bold display serif where the o wears a tilted ring, like a planet. Space-y without being cartoonish.',
    accent: COBALT,
    o(ink, accent, F) {
      const w = F * .6, h = F * .62, cx = w / 2, cy = h - F * .23, rx = F * .36, ry = F * .095;
      const g = `transform="rotate(-18 ${cx} ${cy})"`;
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:baseline;overflow:visible;margin:0 ${F * .07}px 0 ${F * .05}px">
        <path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}" fill="none" stroke="${accent}" stroke-width="${F * .045}" ${g}/>
        <text x="${cx}" y="${h}" text-anchor="middle" font-family="DM Serif Display" font-size="${F}" fill="${ink}">o</text>
        <path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="${accent}" stroke-width="${F * .045}" ${g}/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const F = size * 1.2;
      return `<span style="display:inline-block;line-height:1;white-space:nowrap;font:400 ${F}px/1 'DM Serif Display',serif;letter-spacing:-.01em;color:${ink}">C${this.o(ink, accent, F)}met</span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><g transform="rotate(-18 30 31)"><path d="M3 31 A27 8 0 0 1 57 31" fill="none" stroke="${accent}" stroke-width="3.4"/></g><circle cx="30" cy="31" r="15" fill="${accent}"/><g transform="rotate(-18 30 31)"><path d="M3 31 A27 8 0 0 0 57 31" fill="none" stroke="${accent}" stroke-width="3.4"/></g></svg>`;
    },
  };

  // 2. Garamond streak: the t's crossbar flies off as a comet.
  L.garamond = {
    name: 'Garamond Streak', note: 'A bookish italic Garamond. The crossbar of the t stretches out to the right and becomes the comet. Literary and elegant.',
    accent: AMBER,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const F = size * 1.35, w = F * .95, h = F * .62;
      return `<span style="display:inline-block;line-height:1;white-space:nowrap;font:italic 700 ${F}px/1 'Cormorant Garamond',serif;color:${ink}">Comet<svg width="${w}" height="${h}" viewBox="0 0 95 62" style="display:inline-block;vertical-align:baseline;overflow:visible;margin-left:${-F * .1}px"><polygon points="0,26 84,15 85,22" fill="${accent}"/><circle cx="85" cy="18" r="6.5" fill="${accent}"/></svg></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="22" y="48" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-weight="700" font-size="56" fill="${accent}">C</text><polygon points="24,34 50,20 51,26" fill="${accent}"/><circle cx="51" cy="23" r="5" fill="${accent}"/></svg>`;
    },
  };

  // 3. Art deco: rays fanning over spaced capitals.
  L.deco = {
    name: 'Art Deco', note: 'Thin, widely spaced geometric capitals with a fan of rays rising behind them and a double rule below. 1920s Gatsby glamour.',
    accent: AMBER,
    rays(accent, w, h, n = 11) {
      let s = '';
      for (let i = 0; i < n; i++) { const a = Math.PI * (0.12 + 0.76 * i / (n - 1)), x = 50 - 48 * Math.cos(a), y = 50 - 48 * Math.sin(a); s += `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${accent}" stroke-width="${i % 2 ? 1.2 : 2.4}"/>`; }
      return `<svg width="${w}" height="${h}" viewBox="0 0 100 50" preserveAspectRatio="none">${s}<circle cx="50" cy="50" r="9" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;white-space:nowrap;color:${ink}">
        ${this.rays(accent, size * 2.2, size * .66)}
        <span style="font:400 ${size * .92}px/1 'Josefin Sans',sans-serif;letter-spacing:.32em;margin:${size * .12}px -.32em 0 0">COMET</span>
        <span style="display:block;width:100%;height:${size * .16}px;border-top:${Math.max(1, size * .03)}px solid ${accent};border-bottom:${Math.max(1, size * .03)}px solid ${accent};margin-top:${size * .14}px"></span></span>`;
    },
    icon(accent = this.accent, s = 60) {
      let r = '';
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8), x = 30 - 26 * Math.cos(a), y = 40 - 26 * Math.sin(a); r += `<line x1="30" y1="40" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${accent}" stroke-width="${i % 2 ? 1.6 : 3}"/>`; }
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60">${r}<circle cx="30" cy="40" r="6" fill="${accent}"/><rect x="6" y="46" width="48" height="2.4" fill="${accent}"/><rect x="6" y="51" width="48" height="2.4" fill="${accent}"/></svg>`;
    },
  };

  // 4. Marker: hand-lettered with a doodled comet.
  L.marker = {
    name: 'Marker', note: 'Hand-lettered in thick marker with a doodled comet looping in. Casual and human, like a sketch on a whiteboard.',
    accent: COBALT,
    doodle(accent, s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60" style="overflow:visible"><path d="M2 56 C14 52 10 40 20 40 C30 40 26 52 18 50 C10 48 22 30 40 22" fill="none" stroke="${accent}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>${star(46, 16, 12, 'none', `stroke="${accent}" stroke-width="3.4" stroke-linejoin="round"`)}</svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`<span style="font:400 ${size * 1.05}px/1 'Permanent Marker',cursive;color:${ink};transform:rotate(-3deg);display:inline-block">Comet</span>${this.doodle(accent, size * .95)}`, `gap:${size * .06}px`);
    },
    icon(accent = this.accent, s = 60) { return this.doodle(accent, s); },
  };

  // 5. Bubble: chunky rounded letters and a rounded comet.
  L.bubble = {
    name: 'Bubble', note: 'Chunky rounded letters and a soft, rounded comet. Friendly and playful, easy to love on a sticker or a kid-friendly brand.',
    accent: AMBER,
    mark(accent, s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><polygon points="8,52 36,18 44,28" fill="${accent}" stroke="${accent}" stroke-width="7" stroke-linejoin="round" opacity=".55"/><circle cx="41" cy="21" r="14" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.mark(accent, size * 1.05)}<span style="font:700 ${size}px/1 'Fredoka',sans-serif;letter-spacing:-.01em;color:${ink}">comet</span>`, `gap:${size * .12}px`);
    },
    icon(accent = this.accent, s = 60) { return this.mark(accent, s); },
  };

  // 6. Film strip: the name knocked out of a strip of film.
  L.film = {
    name: 'Film Strip', note: 'Tall condensed capitals cut out of a strip of film. Says “video” at a glance, with a movie-poster feel.',
    accent: COBALT,
    strip(accent, h, text = 'COMET') {
      const id = 'fm' + (++uid), W = 150, H = 62; let holes = '';
      for (let x = 6; x < W - 4; x += 12) holes += `<rect x="${x}" y="4" width="6" height="5" rx="1" fill="#000"/><rect x="${x}" y="${H - 9}" width="6" height="5" rx="1" fill="#000"/>`;
      return `<svg width="${h * W / H}" height="${h}" viewBox="0 0 ${W} ${H}"><mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/>${holes}<text x="${W / 2}" y="${H / 2 + 14.5}" text-anchor="middle" font-family="Bebas Neue" font-size="42" letter-spacing="3" fill="#000">${text}</text></mask><rect width="${W}" height="${H}" rx="3" fill="${accent}" mask="url(#${id})"/></svg>`;
    },
    html({ accent = this.accent, size = 48 } = {}) { return inl(this.strip(accent, size * 1.2)); },
    icon(accent = this.accent, s = 60) {
      const id = 'fi' + (++uid); let holes = '';
      for (let y = 6; y < 54; y += 12) holes += `<rect x="5" y="${y}" width="6" height="6" rx="1" fill="#000"/><rect x="49" y="${y}" width="6" height="6" rx="1" fill="#000"/>`;
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><mask id="${id}"><rect width="60" height="60" fill="#fff"/>${holes}<text x="30" y="45" text-anchor="middle" font-family="Bebas Neue" font-size="44" fill="#000">C</text></mask><rect x="1" y="1" width="58" height="58" rx="6" fill="${accent}" mask="url(#${id})"/></svg>`;
    },
  };

  // 7. Neon: multi-line 80s lettering.
  L.neon = {
    name: 'Neon Lines', note: 'Retro 1980s lettering drawn in parallel lines, like a neon sign or an arcade cabinet, with a small star.',
    accent: COBALT,
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return `<span style="position:relative;display:inline-block;line-height:1;white-space:nowrap;padding-right:${size * .4}px"><span style="font:400 ${size * 1.05}px/1 'Monoton',cursive;color:${accent};letter-spacing:.02em">COMET</span><svg width="${size * .38}" height="${size * .38}" viewBox="0 0 40 40" style="position:absolute;right:0;top:${-size * .12}px">${star(20, 21, 19, ink)}</svg></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><text x="27" y="49" text-anchor="middle" font-family="Monoton" font-size="50" fill="${accent}">C</text>${star(48, 13, 9, accent)}</svg>`;
    },
  };

  // 8. Arcade: pixel letters and an 8-bit comet.
  L.pixel = {
    name: 'Arcade', note: 'Pixel letters and an 8-bit comet, like a classic video game. Nostalgic and fun, and it suits the word “video”.',
    accent: COBALT,
    mark(accent, s) {
      const px = [[6, 1, 1], [7, 1, 1], [6, 2, 1], [7, 2, 1], [5, 1, 1], [6, 0, 1], [5, 2, .8], [6, 3, .8], [4, 3, .6], [5, 4, .6], [3, 4, .45], [4, 5, .45], [2, 6, .3], [1, 7, .2]];
      return `<svg width="${s}" height="${s}" viewBox="0 0 8 8" shape-rendering="crispEdges">${px.map(([x, y, o]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${accent}" opacity="${o}"/>`).join('')}</svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.mark(accent, size * .9)}<span style="font:700 ${size * .82}px/1 'Silkscreen',monospace;color:${ink};letter-spacing:.02em">COMET</span>`, `gap:${size * .2}px`);
    },
    icon(accent = this.accent, s = 60) { return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><g transform="translate(6 6)">${this.mark(accent, 48)}</g></svg>`; },
  };
})();
