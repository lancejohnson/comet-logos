// Round 2 logo concepts: flat, one or two colours, no sparkles, gradients or italics.
(function () {
  const L = window.LOGOS;
  const inl = (inner, extra = '') => `<span style="display:inline-flex;align-items:center;line-height:1;white-space:nowrap;${extra}">${inner}</span>`;
  const A = "'Archivo', sans-serif";

  L.doto = {
    name: 'Red O', note: 'All-caps wordmark where the O is a plain red dot. The simplest possible mark; the dot doubles as the icon.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const t = `font:800 ${size}px/1 ${A};letter-spacing:.01em;color:${ink}`;
      return inl(`<span style="${t}">C</span><span style="display:inline-block;width:${size * .68}px;height:${size * .68}px;border-radius:50%;background:${accent};margin:0 ${size * .05}px"></span><span style="${t}">MET</span>`);
    },
    icon(accent = this.accent, s = 60, ink = '#fff') {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="${accent === '#fff' ? '#fff' : accent}"/></svg>`;
    },
  };

  L.trail = {
    name: 'Dot Trail', note: 'A comet drawn with four dots getting smaller. Reads at any size, prints in one colour, easy to animate.',
    accent: '#E8304A',
    mark(accent, s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><circle cx="43" cy="17" r="11" fill="${accent}"/><circle cx="26" cy="32" r="6" fill="${accent}"/><circle cx="15" cy="42" r="3.6" fill="${accent}"/><circle cx="8" cy="49" r="2" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.mark(accent, size * 1.05)}<span style="font:700 ${size}px/1 ${A};letter-spacing:-.03em;color:${ink};margin-left:${size * .12}px">comet</span>`);
    },
    icon(accent = this.accent, s = 60) { return this.mark(accent, s); },
  };

  L.screeno = {
    name: 'Screen O', note: 'Lowercase wordmark where the o is a small landscape screen. Says “video” without a play button.',
    accent: '#2E5BFF',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const t = `font:700 ${size}px/1 ${A};letter-spacing:-.03em;color:${ink}`;
      return `<span style="white-space:nowrap;line-height:1"><span style="${t}">c</span><span style="display:inline-block;width:${size * .66}px;height:${size * .47}px;border-radius:${size * .09}px;background:${accent};margin:0 ${size * .04}px 0 ${size * .03}px;vertical-align:baseline"></span><span style="${t}">met</span></span>`;
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><rect x="8" y="16" width="44" height="30" rx="6" fill="${accent}"/></svg>`;
    },
  };

  L.playc = {
    name: 'Play C', note: 'A heavy C with a play triangle sitting in its opening. Works as a stand-alone icon and on the brochure cover.',
    accent: '#111',
    mark(ink, s, accent = '#E8304A') {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><path d="M46 14 A22 22 0 1 0 46 46" fill="none" stroke="${ink}" stroke-width="10"/><polygon points="25,20 25,40 42,30" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = '#E8304A', size = 48 } = {}) {
      return inl(`${this.mark(ink, size * 1.05, accent)}<span style="font:700 ${size}px/1 ${A};letter-spacing:-.02em;color:${ink};margin-left:${size * .14}px">comet</span>`);
    },
    icon(accent = '#E8304A', s = 60, ink = '#111') { return this.mark(accent === '#fff' ? '#fff' : ink, s, accent); },
  };

  L.bezel = {
    name: 'Bezel', note: 'The word sits inside a black screen with a small red power light. Looks like the product itself.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const bg = ink === '#fff' || ink === '#FFFFFF' ? '#fff' : '#111';
      const fg = bg === '#fff' ? '#111' : '#fff';
      return inl(`<span style="display:inline-flex;align-items:center;gap:${size * .28}px;background:${bg};color:${fg};font:700 ${size * .8}px/1 ${A};letter-spacing:-.02em;padding:${size * .2}px ${size * .32}px ${size * .24}px;border-radius:${size * .16}px">comet<span style="width:${size * .14}px;height:${size * .14}px;border-radius:50%;background:${accent}"></span></span>`);
    },
    icon(accent = this.accent, s = 60) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><rect x="6" y="14" width="48" height="32" rx="6" fill="${accent === '#fff' ? '#fff' : '#111'}" stroke="#fff" stroke-opacity=".25"/><circle cx="46" cy="38" r="3" fill="${accent === '#fff' ? '#111' : accent}"/></svg>`;
    },
  };

  L.tile = {
    name: 'Tile', note: 'A black square with a lowercase c and a red dot, next to a plain wordmark. Built to be an app icon and a favicon.',
    accent: '#E8304A',
    tileSvg(accent, s, bg = '#111', fg = '#fff') {
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60"><rect width="60" height="60" rx="12" fill="${bg}"/><path d="M40 21 A13 13 0 1 0 40 39" fill="none" stroke="${fg}" stroke-width="7"/><circle cx="44" cy="17" r="5" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const dark = ink === '#fff';
      return inl(`${this.tileSvg(accent, size * 1.05, dark ? '#fff' : ink, dark ? '#111' : '#fff')}<span style="font:700 ${size}px/1 ${A};letter-spacing:-.02em;color:${ink};margin-left:${size * .22}px">Comet</span>`);
    },
    icon(accent = this.accent, s = 60) { return accent === '#fff' ? this.tileSvg('#111', s, '#fff', '#111') : this.tileSvg(accent, s); },
  };

  L.lineb = {
    name: 'Line Brochure', note: 'A one-line drawing of an open brochure with the screen filled in red. Friendly and literal without being cartoonish.',
    accent: '#E8304A',
    mark(accent, s, ink) {
      return `<svg width="${s * 1.2}" height="${s}" viewBox="0 0 72 60"><path d="M36 14 L6 8 V48 L36 54 L66 48 V8 Z M36 14 V54" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><rect x="42" y="18" width="18" height="14" rx="2" fill="${accent}"/></svg>`;
    },
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      return inl(`${this.mark(accent, size * 0.95, ink)}<span style="font:700 ${size}px/1 ${A};letter-spacing:-.02em;color:${ink};margin-left:${size * .18}px">Comet</span>`);
    },
    icon(accent = this.accent, s = 60, ink = '#fff') { return this.mark(accent, s * .8, accent === '#fff' ? '#fff' : ink); },
  };

  L.frame = {
    name: 'Viewfinder', note: 'The wordmark framed by four camera-viewfinder corners. Video-production feel, very quiet.',
    accent: '#E8304A',
    html({ ink = '#111', accent = this.accent, size = 48 } = {}) {
      const c = (pos) => `<span style="position:absolute;width:${size * .26}px;height:${size * .26}px;border-color:${accent};border-style:solid;border-width:0;${pos}"></span>`;
      const w = Math.max(2, size * .07);
      return inl(`<span style="position:relative;display:inline-block;padding:${size * .26}px ${size * .34}px">
        ${c(`left:0;top:0;border-left-width:${w}px;border-top-width:${w}px`)}${c(`right:0;top:0;border-right-width:${w}px;border-top-width:${w}px`)}
        ${c(`left:0;bottom:0;border-left-width:${w}px;border-bottom-width:${w}px`)}${c(`right:0;bottom:0;border-right-width:${w}px;border-bottom-width:${w}px`)}
        <span style="font:700 ${size}px/1 ${A};letter-spacing:.02em;color:${ink}">COMET</span></span>`);
    },
    icon(accent = this.accent, s = 60, ink = '#fff') {
      const k = accent === '#fff' ? '#fff' : accent;
      return `<svg width="${s}" height="${s}" viewBox="0 0 60 60" fill="none" stroke="${k}" stroke-width="5"><path d="M8 20V8h12M40 8h12v12M52 40v12H40M20 52H8V40"/><circle cx="30" cy="30" r="7" fill="${accent === '#fff' ? '#fff' : ink}" stroke="none"/></svg>`;
    },
  };
})();
