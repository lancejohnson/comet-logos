// Comet logo concepts. Each returns HTML (inline SVG mark + type) so it can be reused on the site mockups.
// opts: { ink: text colour, accent: override accent, size: px font size }
(function () {
  let uid = 0;
  const id = (p) => `${p}${++uid}`;

  const marks = {
    streak(accent, s) {
      const g = id('g');
      return `<svg width="${s * 1.05}" height="${s * 1.05}" viewBox="0 0 60 60" aria-hidden="true">
        <defs><linearGradient id="${g}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
        <polygon points="2,58 40,13 47,20" fill="url(#${g})"/>
        <polygon points="14,58 42,24 45,27" fill="url(#${g})" opacity=".55"/>
        <circle cx="45" cy="15" r="8" fill="${accent}"/>
        <circle cx="47" cy="13" r="2.6" fill="#fff" opacity=".85"/></svg>`;
    },
    playO(accent, s) {
      const g = id('g');
      return `<svg width="${s * 0.62}" height="${s * 0.74}" viewBox="6 0 50 60" style="overflow:visible;margin:0 .02em;transform:translateY(.06em)" aria-hidden="true">
        <defs><linearGradient id="${g}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>
        <polygon points="41.5,50.4 18.5,17.6 82,-6" fill="url(#${g})" opacity=".9"/>
        <circle cx="30" cy="34" r="22" fill="${accent}"/>
        <polygon points="24,23 24,45 42,34" fill="${accent==='#fff'?'#0008':'#fff'}"/></svg>`;
    },
    fold(accent, s, light) {
      return `<svg width="${s * 1.1}" height="${s * 1.1}" viewBox="0 0 64 64" aria-hidden="true">
        <polygon points="5,15 30,21 30,55 5,49" fill="${light}"/>
        <polygon points="34,21 59,15 59,49 34,55" fill="${accent}"/>
        <polygon points="42,28 42,42 53,35" fill="${accent==='#fff'?'#0008':'#fff'}"/></svg>`;
    },
    orbit(accent, s, ink) {
      const m = id('m');
      return `<svg width="${s * 0.92}" height="${s * 0.92}" viewBox="0 0 64 64" style="margin-right:.02em" aria-hidden="true">
        <defs><mask id="${m}"><rect width="64" height="64" fill="#fff"/><polygon points="34,32 64,6 64,58" fill="#000"/></mask></defs>
        <path fill-rule="evenodd" d="M32 4a28 28 0 1 0 .01 0Z M37 12a20 20 0 1 0 .01 0Z" fill="${ink}" mask="url(#${m})"/>
        <circle cx="52.5" cy="13" r="6.5" fill="${accent}"/></svg>`;
    },
    spark(accent, s) {
      const g = id('g');
      return `<svg width="${s * 1.0}" height="${s * 1.0}" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="${g}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
        <polygon points="37,17 47,27 2,62" fill="url(#${g})"/>
        <path d="M45 3 Q47 18 61 21 Q47 24 45 39 Q43 24 29 21 Q43 18 45 3Z" fill="${accent}"/></svg>`;
    },
    screen(accent, s) {
      return `<svg width="${s * 1.25}" height="${s * 0.97}" viewBox="0 0 72 56" aria-hidden="true">
        <rect x="24" y="8" width="44" height="34" rx="7" fill="${accent}"/>
        <polygon points="40,17 40,33 54,25" fill="${accent==='#fff'?'#0008':'#fff'}"/>
        <rect x="2" y="13" width="17" height="4" rx="2" fill="${accent}" opacity=".9"/>
        <rect x="8" y="23" width="11" height="4" rx="2" fill="${accent}" opacity=".6"/>
        <rect x="12" y="33" width="7" height="4" rx="2" fill="${accent}" opacity=".35"/>
        <rect x="34" y="46" width="24" height="4" rx="2" fill="${accent}" opacity=".35"/></svg>`;
    },
  };

  const row = (inner, gap = '.28em') => `<span style="display:inline-flex;align-items:center;gap:${gap};line-height:1;white-space:nowrap">${inner}</span>`;

  const LOGOS = {
    streak: {
      name: 'Streak', note: 'Cleaned-up version of today’s mark: a red comet head with a tapered tail, set in a clean geometric face.',
      accent: '#E8304A', font: "'Outfit', sans-serif",
      html({ ink = '#1B1B22', accent = this.accent, size = 48 } = {}) {
        return row(`${marks.streak(accent, size)}<span style="font:600 ${size}px/1 ${this.font};letter-spacing:.04em;color:${ink}">COMET</span>`, '.12em');
      },
      icon(accent = this.accent, s = 60) { return marks.streak(accent, s); },
    },
    playo: {
      name: 'Play-O', note: 'The “o” is a play button with a comet tail streaking over the word. Says “video” instantly.',
      accent: '#FF4D2E', font: "'Space Grotesk', sans-serif",
      html({ ink = '#141414', accent = this.accent, size = 48 } = {}) {
        const t = `font:700 ${size}px/1 ${this.font};letter-spacing:-.03em;color:${ink}`;
        return row(`<span style="${t}">c</span>${marks.playO(accent, size)}<span style="${t}">met</span>`, '0');
      },
      icon(accent = this.accent, s = 60) { return marks.playO(accent, s); },
    },
    fold: {
      name: 'Fold', note: 'An open brochure with the screen on the right panel. Literal, friendly, and works as a tiny icon.',
      accent: '#3550FF', light: '#9DAAFF', font: "'Fraunces', serif",
      html({ ink = '#121528', accent = this.accent, size = 48 } = {}) {
        return row(`${marks.fold(accent, size, this.light)}<span style="font:600 ${size}px/1 ${this.font};letter-spacing:-.02em;color:${ink}">Comet</span>`, '.18em');
      },
      icon(accent = this.accent, s = 60) { return marks.fold(accent, s, this.light); },
    },
    orbit: {
      name: 'Orbit C', note: 'The C is a tapering orbit with a red comet at its tip. Bold, corporate, Fortune 500-friendly.',
      accent: '#E8304A', font: "'Manrope', sans-serif",
      html({ ink = '#15161C', accent = this.accent, size = 48 } = {}) {
        return row(`${marks.orbit(accent, size, ink)}<span style="font:800 ${size}px/1 ${this.font};letter-spacing:.02em;color:${ink}">OMET</span>`, '0');
      },
      icon(accent = this.accent, s = 60, ink = '#15161C') { return marks.orbit(accent, s, ink); },
    },
    spark: {
      name: 'Spark', note: 'A four-point star with a long tail and an elegant italic serif. Premium, gift-like, made for executive mailers.',
      accent: '#E9A23B', font: "'Instrument Serif', serif",
      html({ ink = '#17140F', accent = this.accent, size = 48 } = {}) {
        return row(`${marks.spark(accent, size)}<span style="font:italic 400 ${size * 1.22}px/1 ${this.font};letter-spacing:-.01em;color:${ink}">comet</span>`, '.12em');
      },
      icon(accent = this.accent, s = 60) { return marks.spark(accent, s); },
    },
    screen: {
      name: 'Flying Screen', note: 'A video screen with speed lines. Reads as “video, delivered fast.” Tech-forward, works in one colour.',
      accent: '#6B3BFF', font: "'Archivo', sans-serif",
      html({ ink = '#14121C', accent = this.accent, size = 48 } = {}) {
        return row(`${marks.screen(accent, size)}<span style="display:inline-flex;flex-direction:column;gap:.12em"><span style="font:800 ${size}px/1 ${this.font};letter-spacing:-.02em;color:${ink}">COMET</span><span style="font:600 ${size * 0.2}px/1 ${this.font};letter-spacing:.32em;color:${ink};opacity:.6">VIDEO BROCHURES</span></span>`, '.16em');
      },
      icon(accent = this.accent, s = 60) { return marks.screen(accent, s); },
    },
  };

  window.LOGOS = LOGOS;
  // Auto-fill <span data-logo="streak" data-ink="#fff" data-size="28"></span>
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-logo]').forEach((el) => {
      const L = LOGOS[el.dataset.logo];
      el.innerHTML = L.html({ ink: el.dataset.ink, size: +(el.dataset.size || 28), accent: el.dataset.accent || L.accent });
    });
  });
})();
