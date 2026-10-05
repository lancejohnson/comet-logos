# Brand → 3D video brochure: image prompts

Turns **a sentence from the customer + their website (or brand-guideline link)** into the four
printed faces of the Comet A5 video card, which `site/3d.html` wraps onto the 3D model. Optional
last step: a photoreal "3D product shot" made from a screenshot of the model.

Recommended model: **Gemini 2.5 Flash Image ("Nano Banana")** — fast (~5–10 s), takes several
reference images, holds a layout. Works the same with GPT Image 1 or FLUX Kontext.

## The model the art has to fit

| face | file | what it is |
|---|---|---|
| Front cover | `tex/<Key>-front.jpg` | Closed card, cover up. Logo + headline + hero image. |
| Inside left | `tex/<Key>-inl.jpg` | Back of the cover, seen when open. Message / 3 benefits / call to action. |
| Inside right | `tex/<Key>-inr.jpg` | Screen panel. Video screen in the middle, 5 buttons below. |
| Back | `tex/<Key>-back.jpg` | Underside. Logo, website, phone, quiet pattern. |

- Every face: **1260 × 888 px**, landscape, 210 × 148 mm (A5). 60 px = 1 cm. Keep text 60 px from every edge (bleed/rounded corners).
- Screen window on the inside right: **x 365–947, y 248–572 px** (580 × 324). The 3D model draws the live video there, so the art under it is never seen — leave it plain dark.
- Buttons row on the inside right: 5 circles, Ø ~62 px, centres y ≈ 707, x ≈ 411 / 535 / 659 / 783 / 907 (back, forward, play/pause, volume down, volume up).
- Board edges take the average colour of each face's border — so let the border run in a brand colour, not white-to-transparent.

Generate at 3:2, then centre-crop to 1260 × 888 (crop 28 px off each side). The layout prompts
below already keep important things inside that crop.

---

## Step 1 — Brand brief (text model with web access, ~10 s)

Input: `{{USER_REQUEST}}`, `{{BRAND_URLS}}` (website, brand-guideline PDF, LinkedIn, anything).

```
You are a brand designer preparing a print brief for a small A5 video brochure.

Customer's request, in their words:
{{USER_REQUEST}}

Read these sources: {{BRAND_URLS}}

Return ONLY this JSON. Take colours, fonts and logo from the sources; never invent a logo.
If the guidelines conflict with the website, the guidelines win. If something is missing,
choose what fits the site and say so in "assumptions".

{
  "brand_name": "",
  "logo_url": "",                     // direct link to the best PNG/SVG logo
  "logo_on": "light|dark",            // which background the logo is drawn for
  "colors": {"primary": "#", "secondary": "#", "accent": "#", "dark": "#", "light": "#"},
  "fonts": {"headline": "", "body": "", "fallback_style": "geometric sans | humanist sans | serif | ..."},
  "imagery_style": "",                // one line, e.g. "flat vector illustrations, soft shadows, people with laptops"
  "tone": "",                         // 3 adjectives
  "audience": "",
  "cover_headline": "",               // max 5 words
  "cover_subline": "",                // max 8 words, may be empty
  "inside_left_title": "",            // max 5 words
  "inside_left_points": ["", "", ""], // max 6 words each
  "cta": "",                          // max 4 words, e.g. "Book a demo"
  "website": "",
  "phone": "",
  "screen_label": "",                 // max 2 words beside the screen, e.g. "Watch now"
  "do_not": [""],                     // brand rules, e.g. "never put logo on red"
  "assumptions": [""]
}
```

---

## Step 2 — The four faces (image model, all four in parallel, ~10 s total)

Attach to every call, in this order:
1. **Logo** (`logo_url`)
2. **Layout reference** — the same face from an existing set (e.g. `tex/Salesforce-front.jpg`, `tex/Netflix-inr.jpg`)
3. Optional: 1–2 screenshots of the customer's website for style

Shared header (put in front of each face prompt):

```
Flat, front-on print artwork for one face of an A5 landscape video brochure (210 x 148 mm),
3:2 landscape image, edge to edge, no mockup, no perspective, no device, no shadow around the
card, no paper border. Brand: {{brand_name}}. Colours only from: primary {{primary}},
secondary {{secondary}}, accent {{accent}}, dark {{dark}}, light {{light}}. Typography in the
style of {{fonts.headline}} ({{fallback_style}}), crisp and correctly spelled.
Imagery: {{imagery_style}}. Tone: {{tone}}.
Use the attached logo (image 1) exactly as given — do not redraw, restyle or recolour it.
Image 2 shows the layout to follow; copy its composition, not its brand.
Keep all text and the logo at least 5% in from the top and bottom edges and 7% in from the
left and right edges.
Avoid: {{do_not}}
```

### Front cover
```
FRONT COVER. Logo top-left, about 25% of the width. Headline "{{cover_headline}}" large,
left-aligned, in the left half, vertically centred. Subline "{{cover_subline}}" under it,
smaller (omit if empty). Right half: one bold hero visual about "{{USER_REQUEST}}" in the
brand's imagery style, running off the right edge. Background {{light}} or a soft brand
gradient. No other text.
```

### Inside left (back of the cover)
```
INSIDE LEFT PAGE. Title "{{inside_left_title}}" top-left. Below it three short points, each
with a simple line icon in {{accent}}:
1. {{inside_left_points[0]}}
2. {{inside_left_points[1]}}
3. {{inside_left_points[2]}}
Bottom-left: a pill-shaped button in {{primary}} reading "{{cta}}". Right third: a calm
supporting image or brand pattern. Background {{light}}. No other text.
```

### Inside right (screen panel)
```
INSIDE RIGHT PAGE, the panel that holds a video screen. Background {{dark}} with a subtle
brand gradient or texture; outer border in {{primary}} or {{dark}}.
In the centre, an empty flat black rectangle, 46% of the width and 36% of the height, its
top edge 28% down from the top — nothing drawn inside it.
Below it, centred, a row of five evenly spaced solid circles in {{primary}}, each about 5% of
the width, with white media icons: previous, fast-forward, play/pause, volume down, volume up.
Left of the screen, "{{screen_label}}" in large white type. Right of the screen, the logo.
No other text.
```

### Back cover
```
BACK COVER. Quiet: background {{primary}} or {{dark}} with a faint large brand pattern.
Logo centred, about 30% of the width. Under it, small: "{{website}}" and "{{phone}}".
No other text.
```

### Fix-up (re-run one face, ~5 s)
```
Keep this image exactly as it is except: {{what is wrong}}. Do not change the layout,
colours, logo or any other text.
```

**Post-process in code, not the model:** centre-crop to 1260 × 888; on the inside right, paint
black over x 365–947 / y 248–572 so the screen lines up; if the logo came out even slightly off,
paste the real logo file over it. Save as `site/tex/<Key>-{front,inl,inr,back}.jpg` and add
`['<Key>', '<Label>']` to `BRANDS` in `site/3d-src.js`.

---

## Step 3 (optional) — Photoreal 3D product shots (~10 s each)

For ads, emails and the website hero. Attach: (1) a screenshot of the model in `3d.html`
showing the new design (any view), (2) the front-cover art, (3) the inside-right art.

```
Photorealistic product photograph of the exact object in image 1: an A5 landscape hardcover
video brochure, about 7 mm thick, with a built-in video screen. Keep its shape, proportions,
thickness, rounded corners and screen position exactly as in image 1. Printed artwork: the
cover is image 2, the screen page is image 3 — reproduce them faithfully, including the logo
and text, without changing them.
Scene: {{SCENE}}.
Soft daylight from the upper left, gentle contact shadow, shallow depth of field, matte
laminated print with a soft sheen, glass screen with a faint reflection, lit screen showing
{{SCREEN_CONTENT}}. 3:2, no extra text, no watermark, no hands unless the scene asks for them.
```

Scenes that work:
- `opened to about 120° and standing like a desk card on a light oak desk, laptop out of focus behind`
- `closed, cover up, on a white seamless background, seen from 30° above` (catalogue shot)
- `held open in one hand at a trade-show booth, booth out of focus`
- `three of them in a row on a conference table, middle one open, screen lit`
- `resting at an angle in an open black presentation box, 290 x 200 x 60 mm`

`{{SCREEN_CONTENT}}` default: `a still from the brand's product video: {{imagery_style}}`.

---

## Rules that keep it fast and on-brand

- One text call + four parallel image calls ≈ 20 s from request to a turning 3D model.
- Short text only: image models still misspell long copy. Headlines ≤ 5 words; anything longer goes in the video.
- Always pass the real logo; paste it in code if it drifts. Never let the model draw a logo from the brand name.
- Brand guidelines > website > the model's taste. Hex values go in the prompt, not colour names.
- Big-brand demos (Netflix, Salesforce…) are sales mockups only — don't publish them as customer work.
