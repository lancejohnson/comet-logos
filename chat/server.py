#!/usr/bin/env python3
"""Comet AI designer chat — prototype server.

Text and images come from ChatGPT through Pi's Codex login (~/.pi/agent/auth.json, key
"openai-codex"). That is a personal plan: fine for a private prototype on the tailnet, NOT for
public traffic. For the public site, swap codex() for an API key; nothing else changes.

Stdlib only. Run:  python3 chat/server.py   (PORT=8131 by default)
"""
import base64, json, os, re, subprocess, threading, time, uuid, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html import unescape

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(REPO, 'chat', 'static')
DATA = os.path.expanduser(os.environ.get('COMET_DATA', '~/.local/share/comet-chat'))
AUTH = os.path.expanduser('~/.pi/agent/auth.json')
MODEL = os.environ.get('COMET_MODEL', 'gpt-5.5')
QUALITY = os.environ.get('COMET_IMAGE_QUALITY', 'medium')
PORT = int(os.environ.get('PORT', 8131))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'
os.makedirs(os.path.join(DATA, 'designs'), exist_ok=True)
POOL = ThreadPoolExecutor(max_workers=8)
JOBS = {}

# ---------------------------------------------------------------- model calls
def codex(content, instructions, tools=None, tool_choice=None, effort='low', timeout=300):
    """One Responses call through the ChatGPT backend. Returns (text, [png bytes])."""
    a = json.load(open(AUTH))['openai-codex']
    body = {'model': MODEL, 'instructions': instructions, 'input': [{'role': 'user', 'content': content}],
            'reasoning': {'effort': effort}, 'stream': True, 'store': False}
    if tools: body['tools'] = tools
    if tool_choice: body['tool_choice'] = tool_choice
    req = urllib.request.Request('https://chatgpt.com/backend-api/codex/responses', data=json.dumps(body).encode(), headers={
        'Authorization': 'Bearer ' + a['access'], 'chatgpt-account-id': a['accountId'], 'OpenAI-Beta': 'responses=experimental',
        'originator': 'codex_cli_rs', 'Content-Type': 'application/json', 'Accept': 'text/event-stream'})
    text, imgs, err, t0 = '', [], None, time.time()
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'model {e.code}: {e.read()[:300].decode(errors="replace")}')
    for line in r:
        s = line.decode(errors='replace').strip()
        if not s.startswith('data:'): continue
        try: ev = json.loads(s[5:])
        except ValueError: continue
        t = ev.get('type', '')
        if t == 'response.output_text.delta': text += ev.get('delta', '')
        elif t == 'response.output_item.done':
            it = ev.get('item') or {}
            if it.get('type') == 'image_generation_call' and it.get('result'): imgs.append(base64.b64decode(it['result']))
        elif t in ('response.failed', 'error'): err = json.dumps(ev)[:400]
    print(f'{time.strftime("%H:%M:%S")} codex {"image" if tools else "text"} {time.time() - t0:.1f}s {"ERR " + err[:120] if err else ""}', flush=True)
    if err and not text and not imgs: raise RuntimeError(err)
    return text, imgs

def json_from(text):
    m = re.search(r'\{.*\}', text, re.S)
    if not m: raise RuntimeError('no JSON in reply: ' + text[:200])
    return json.loads(m.group(0))

def data_url(path):
    ext = path.rsplit('.', 1)[-1].lower(); mime = {'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp'}.get(ext, 'png')
    return f'data:image/{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

IMG_INSTR = ('You operate an image generator for a print designer. Call the image_generation tool exactly once, '
             'passing the user\'s brief through faithfully (you may tighten wording, never drop constraints). '
             'Never ask questions. Do not reply with text.')

def make_image(prompt, refs, out, fidelity=True):
    """Generate one face, save it cropped to 1260x888 (A5 landscape, 60 px per cm)."""
    content = [{'type': 'input_text', 'text': prompt}] + [{'type': 'input_image', 'image_url': u} for u in refs]
    tool = {'type': 'image_generation', 'size': '1536x1024', 'quality': QUALITY, 'background': 'opaque', 'output_format': 'png'}
    if refs and fidelity: tool['input_fidelity'] = 'high'
    last = None
    for attempt in range(2):
        try:
            _, imgs = codex(content, IMG_INSTR, tools=[tool], tool_choice={'type': 'image_generation'})
            if imgs: break
            last = RuntimeError('no image returned')
        except RuntimeError as e:
            last = e
            if 'input_fidelity' in str(e): tool.pop('input_fidelity', None)
        imgs = []
    if not imgs: raise last
    raw = out + '.raw.png'; open(raw, 'wb').write(imgs[0])
    # flatten any transparency onto white first (transparent pixels otherwise turn into noise in the JPEG)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=white:s=1260x888', '-i', raw, '-filter_complex',
                    '[1]scale=1260:888:force_original_aspect_ratio=increase,crop=1260:888,format=rgba[f];[0][f]overlay=shortest=1',
                    '-frames:v', '1', '-q:v', '3', out], check=True, timeout=60)
    os.remove(raw)
    return out

# ---------------------------------------------------------------- website reading
def fetch(url, limit=1_500_000, timeout=12):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(limit), r.headers.get('Content-Type', ''), r.geturl()

def read_site(url):
    if not re.match(r'https?://', url): url = 'https://' + url
    body, ctype, final = fetch(url)
    if 'pdf' in ctype: return {'url': final, 'note': 'PDF brand guidelines (text not extracted)'}
    h = body.decode('utf-8', 'replace')
    abs_ = lambda u: urllib.parse.urljoin(final, unescape(u))
    meta = lambda n: (re.search(r'<meta[^>]+(?:name|property)=["\']%s["\'][^>]*content=["\']([^"\']*)' % n, h, re.I) or [None, ''])[1]
    logos = []
    for tag in re.findall(r'<img\b[^>]*>', h, re.I):
        src = re.search(r'\b(?:src|data-src)=["\']([^"\']+)', tag, re.I)
        if src and re.search(r'logo|brand|header', tag, re.I): logos.append(abs_(src.group(1)))
    for rel, href in re.findall(r'<link[^>]+rel=["\']([^"\']*icon[^"\']*)["\'][^>]*href=["\']([^"\']+)', h, re.I):
        logos.append(abs_(href))
    svgs = []
    for m in re.finditer(r'<svg\b.*?</svg>', h, re.S | re.I):
        ctx = h[max(0, m.start() - 400):m.start()] + m.group(0)[:300]
        if re.search(r'logo|brand|home', ctx, re.I) and 200 < len(m.group(0)) < 40000 and len(svgs) < 3: svgs.append(m.group(0))
    for i, v in enumerate(svgs): logos.append(f'inline-svg-{i}')
    og = meta('og:image')
    css = h
    for href in re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)', h, re.I)[:4]:
        try: css += fetch(abs_(href), 600_000, 6)[0].decode('utf-8', 'replace')
        except Exception: pass
    cols = {}
    for c in re.findall(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', css):
        c = c.lower(); c = ''.join(x * 2 for x in c) if len(c) == 3 else c; cols[c] = cols.get(c, 0) + 1
    fonts = {}
    for f in re.findall(r'font-family\s*:\s*([^;}{]+)', css, re.I):
        f = f.split(',')[0].strip(' "\''); fonts[f] = fonts.get(f, 0) + 1
    fonts.update({f.replace('+', ' '): 99 for f in re.findall(r'fonts\.googleapis\.com/css2?\?family=([A-Za-z+]+)', h)})
    text = re.sub(r'<(script|style|svg|noscript)[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    text = re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', text))).strip()
    title = (re.search(r'<title[^>]*>(.*?)</title>', h, re.S | re.I) or [None, ''])[1]
    return {'url': final, 'title': unescape(title.strip()), 'description': meta('description') or meta('og:description'),
            'site_name': meta('og:site_name'), 'theme_color': meta('theme-color'), 'og_image': abs_(og) if og else '',
            'logo_candidates': list(dict.fromkeys(logos))[:12], '_svgs': svgs,
            'colors_by_frequency': sorted(cols.items(), key=lambda x: -x[1])[:24],
            'fonts': sorted(fonts.items(), key=lambda x: -x[1])[:8], 'text': text[:3500]}

BRIEF_INSTR = '''You are a brand designer preparing a print brief for a small A5 landscape video brochure
(a printed card with a built-in video screen). Use the website data you are given; never invent a logo URL —
logo_url must be one of logo_candidates (prefer a header wordmark — an inline-svg-N or an img with logo in it — over a favicon) or "". If brand guidelines
conflict with the website, guidelines win. Pick real brand colours from colors_by_frequency/theme_color, skipping
plain greys unless the brand is monochrome. Copy must be short: image models misspell long text.
Return ONLY JSON:
{"brand_name":"","logo_url":"","logo_on":"light|dark","colors":{"primary":"#","secondary":"#","accent":"#","dark":"#","light":"#"},
"fonts":{"headline":"","body":"","fallback_style":""},"imagery_style":"","tone":"","audience":"",
"cover_headline":"(max 5 words)","cover_subline":"(max 8 words or empty)","inside_left_title":"(max 5 words)",
"inside_left_points":["(max 6 words)","",""],"cta":"(max 4 words)","website":"","phone":"","screen_label":"(max 2 words)",
"hero_idea":"(one sentence: the hero visual for the cover)","do_not":[],"summary":"(one friendly sentence to the customer about what you found)"}'''

def make_brief(request, urls):
    sites = []
    for u in urls[:3]:
        try: sites.append(read_site(u))
        except Exception as e: sites.append({'url': u, 'error': str(e)[:200]})
    svgs = sites[0].pop('_svgs', []) if sites else []
    for x in sites[1:]: x.pop('_svgs', None)
    prompt = f'Customer request, in their words:\n{request or "(none)"}\n\nWebsite data (inline-svg-N = an inline SVG found in the page header, often the real wordmark):\n{json.dumps(sites)[:16000]}'
    text, _ = codex([{'type': 'input_text', 'text': prompt}], BRIEF_INSTR, effort='low', timeout=120)
    brief = json_from(text); brief['_request'] = request; brief['_urls'] = urls
    m = re.fullmatch(r'inline-svg-(\d+)', brief.get('logo_url') or '')
    if m: brief['logo_svg'] = svgs[int(m.group(1))] if int(m.group(1)) < len(svgs) else ''; brief['logo_url'] = ''
    return brief

# ---------------------------------------------------------------- face prompts (see prompts/brand-to-3d.md)
DIRECTIONS = [
    ('Clean', 'Light background ({light}) with generous white space; logo top-left; headline large on the left half; one crisp hero visual on the right half.'),
    ('Bold', 'Full-bleed {primary} background; headline very large in white or {light}, left-aligned; logo top-left; a bold graphic hero shape on the right that bleeds off the edge.'),
    ('Photo', 'Full-bleed photographic scene of the hero idea; a smooth dark gradient on the left third so the white headline reads; logo top-left.'),
]

def header(b):
    c = b.get('colors', {}); f = b.get('fonts', {})
    return (f"Flat, front-on print artwork for one face of an A5 landscape video brochure (210 x 148 mm). 3:2 landscape image, "
            f"edge to edge. No mockup, no perspective, no device, no hands, no shadow around the card, no border. "
            f"Brand: {b.get('brand_name')}. Colours only from: primary {c.get('primary')}, secondary {c.get('secondary')}, "
            f"accent {c.get('accent')}, dark {c.get('dark')}, light {c.get('light')}. Typography in the style of "
            f"{f.get('headline')} ({f.get('fallback_style')}), crisp, correctly spelled, no other words than those given. "
            f"Imagery: {b.get('imagery_style')}. Tone: {b.get('tone')}. "
            f"Image 1 is the brand logo: reproduce it exactly as given — do not redraw, restyle or recolour it. "
            f"Keep all text and the logo at least 6% in from the top and bottom edges and 8% in from the left and right edges. "
            f"Avoid: {', '.join(b.get('do_not') or []) or 'nothing extra'}.\n")

def cover_prompt(b, i):
    name, d = DIRECTIONS[i]
    return header(b) + (f"FRONT COVER, {name} style. {d.format(**b.get('colors', {}))} Headline: \"{b.get('cover_headline')}\". "
        + (f"Subline, smaller, under it: \"{b.get('cover_subline')}\". " if b.get('cover_subline') else '')
        + f"Hero idea: {b.get('hero_idea') or b.get('_request')}. No other text.")

def face_prompt(b, face):
    c = b.get('colors', {}); pts = (b.get('inside_left_points') or []) + ['', '', '']
    same = 'The attached full-page artwork is the front cover of this same brochure: match its colours, typography and visual style exactly, but do not copy its layout or words. '
    if face == 'inl':
        return header(b) + same + (f"INSIDE LEFT PAGE (back of the cover). Title \"{b.get('inside_left_title')}\" top-left. Below it three short points, "
            f"each with a simple line icon in {c.get('accent')}: 1. {pts[0]} 2. {pts[1]} 3. {pts[2]}. Bottom-left: a pill-shaped button in "
            f"{c.get('primary')} reading \"{b.get('cta')}\". Right third: a calm supporting image or brand pattern. No other text.")
    if face == 'inr':
        return header(b).replace('Image 1 is the brand logo: reproduce it exactly as given — do not redraw, restyle or recolour it. ', '') + same + (
            f"INSIDE RIGHT PAGE, background art only. A dark, calm brand background in {c.get('dark')} with a subtle gradient, texture or large soft "
            f"brand shapes in {c.get('primary')} / {c.get('secondary')}, reaching all four edges, darkest in the middle. Absolutely NO text, NO letters, "
            f"NO logo, NO screen, NO buttons, NO objects — a video screen, buttons, a label and the logo are added on top later.")
    return header(b) + same + (f"BACK COVER. Quiet: background {c.get('primary')} or {c.get('dark')} with a faint large brand pattern. Logo centred, about 30% of the width. "
        f"Under it, small: \"{b.get('website')}\"" + (f" and \"{b.get('phone')}\"" if b.get('phone') else '') + ". No other text.")

# ---------------------------------------------------------------- jobs
def ddir(did): return os.path.join(DATA, 'designs', re.sub(r'[^a-z0-9]', '', did))
def load(did): return json.load(open(os.path.join(ddir(did), 'design.json')))
def save(did, d): json.dump(d, open(os.path.join(ddir(did), 'design.json'), 'w'), indent=1)
LOCK = threading.Lock()

def run_job(tasks):
    """tasks: list of (key, fn). Runs in parallel; job holds key -> url or error."""
    jid = uuid.uuid4().hex[:12]; job = JOBS[jid] = {'done': False, 'results': {}, 'errors': {}, 'started': time.time()}
    def one(k, fn):
        try: job['results'][k] = fn()
        except Exception as e: job['errors'][k] = str(e)[:300]
    def all_():
        list(POOL.map(lambda t: one(*t), tasks)); job['done'] = True; job['seconds'] = round(time.time() - job['started'])
    threading.Thread(target=all_, daemon=True).start()
    return jid

def file_url(did, name): return f'/files/{did}/{name}?v={int(time.time())}'

def save_png_dataurl(s, path):
    m = re.match(r'data:image/\w+;base64,(.*)', s or '', re.S)
    if m: open(path, 'wb').write(base64.b64decode(m.group(1))); return True
    return False

def start_covers(body):
    did = uuid.uuid4().hex[:10]; os.makedirs(ddir(did)); b = body['brief']
    d = {'id': did, 'brief': b, 'covers': [], 'faces': {}, 'created': time.time()}
    has_logo = save_png_dataurl(body.get('logo'), os.path.join(ddir(did), 'logo.png'))
    d['has_logo'] = has_logo; save(did, d)
    refs = [data_url(os.path.join(ddir(did), 'logo.png'))] if has_logo else []
    def cover(i):
        def fn():
            p = cover_prompt(b, i) if has_logo else cover_prompt(b, i).replace('Image 1 is the brand logo', 'No logo image is attached; set the brand name as a simple wordmark')
            make_image(p, refs, os.path.join(ddir(did), f'cover{i}.jpg'))
            return file_url(did, f'cover{i}.jpg')
        return fn
    return did, run_job([(f'cover{i}', cover(i)) for i in range(len(DIRECTIONS))])

def start_faces(body):
    did = body['id']; d = load(did); i = int(body.get('cover', 0)); b = d['brief']; dd = ddir(did)
    src = os.path.join(dd, f'cover{i}.jpg'); dst = os.path.join(dd, 'front.jpg')
    open(dst, 'wb').write(open(src, 'rb').read())
    d['chosen'] = i; d['faces'] = {'front': file_url(did, 'front.jpg')}; save(did, d)
    logo = [data_url(os.path.join(dd, 'logo.png'))] if d.get('has_logo') else []
    def face(k):
        def fn():
            p = face_prompt(b, k)
            if not logo: p = p.replace('Image 1 is the brand logo: reproduce it exactly as given — do not redraw, restyle or recolour it. ', 'Set the brand name as a simple wordmark where a logo is asked for. ')
            make_image(p, ([] if k == 'inr' else logo) + [data_url(dst)], os.path.join(dd, f'{k}.jpg'))
            with LOCK:
                d2 = load(did); d2['faces'][k] = file_url(did, f'{k}.jpg'); save(did, d2)
            return d2['faces'][k]
        return fn
    return run_job([(k, face(k)) for k in ('inl', 'inr', 'back')])

def start_edit(body):
    did = body['id']; d = load(did); dd = ddir(did); what = body['edit']
    faces = [f for f in body.get('faces') or ['front', 'inl', 'inr', 'back'] if f in d['faces']]
    logo = [data_url(os.path.join(dd, 'logo.png'))] if d.get('has_logo') else []
    def face(k):
        def fn():
            p = (f"Edit image 1, one printed face of a brochure. Change only this: {what}. Keep the layout, logo, brand colours "
                 f"and every other word exactly as they are, spelled the same. Keep it flat, front-on, edge to edge."
                 + (' Image 2 is the real logo: if the logo is visible, it must match image 2 exactly.' if logo else ''))
            if k == 'inr': p += ' Keep the large empty area in the middle and the strip below it empty.'
            make_image(p, [data_url(os.path.join(dd, f'{k}.jpg'))] + logo, os.path.join(dd, f'{k}.jpg'))
            with LOCK:
                d2 = load(did); d2['faces'][k] = file_url(did, f'{k}.jpg'); save(did, d2)
            return d2['faces'][k]
        return fn
    return run_job([(k, face(k)) for k in faces])

# ---------------------------------------------------------------- chat router
ROUTER_INSTR = '''You are the Comet AI designer, a friendly chat assistant on cometvid.com. Comet sells video brochures:
printed cards with a built-in video screen that plays when opened. Sizes: Business card (3.5x2 in, 2.4-inch screen),
A5 (8.3x5.8 in; 4.5, 5 or 7-inch screen), A4 (11.7x8.3 in; 10-inch screen). Softcover or hardcover. Minimum order 25.
Quantity breaks: 25, 50, 100, 250, 500, 1000. Sample prices per brochure (A5 7-inch, softcover): $64, $50, $38, $29, $23, $18.
Prices on this prototype are samples, not final. If you do not know something (turnaround, shipping, video length), say the
team will confirm. Design is free.
Decide what to do with the customer's message, given the current state. Return ONLY JSON:
{"reply":"(1-2 short sentences, plain words, no exclamation marks)",
 "action":"design|edit|price|order|none",
 "urls":["websites or guideline links found in the message"],
 "request":"(for design: what they want, in their words)",
 "edit":"(for edit: the change, as an instruction)",
 "faces":["front","inl","inr","back"] (for edit: which faces it touches; front=cover, inl=inside left, inr=screen page, back=back),
 "paper":"card|a5|a4|null","screen":"2.4|4.5|5|7|10|null","qty":null or number}
Use action "design" when they give a website or describe a brochure and no design exists yet, or ask for a new one.
Use "edit" when a design exists and they want it changed. Use "price" for size, screen, quantity or cost questions.
Use "order" when they want to order. Otherwise "none" and answer in reply.'''

def route(body):
    msg = body.get('message', '')[:2000]; state = json.dumps(body.get('state') or {})[:3000]
    text, _ = codex([{'type': 'input_text', 'text': f'State: {state}\nCustomer: {msg}'}], ROUTER_INSTR, effort='low', timeout=60)
    out = json_from(text)
    found = re.findall(r'(?:https?://)?(?:[\w-]+\.)+(?:com|io|co|net|org|ai|us|app|dev|biz|info|health|edu)(?:/[^\s]*)?', msg)
    out['urls'] = list(dict.fromkeys((out.get('urls') or []) + found))
    return out

# ---------------------------------------------------------------- HTTP
class H(BaseHTTPRequestHandler):
    def log_message(self, f, *a): pass
    def send(self, code, data, ctype='application/json', cache='no-store'):
        if not isinstance(data, (bytes, bytearray)): data = json.dumps(data).encode()
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', cache); self.end_headers(); self.wfile.write(data)
    def file(self, path):
        if not os.path.isfile(path): return self.send(404, {'error': 'not found'})
        ext = path.rsplit('.', 1)[-1]
        ct = {'html': 'text/html; charset=utf-8', 'js': 'text/javascript', 'css': 'text/css', 'jpg': 'image/jpeg', 'png': 'image/png',
              'webp': 'image/webp', 'svg': 'image/svg+xml', 'json': 'application/json'}.get(ext, 'application/octet-stream')
        self.send(200, open(path, 'rb').read(), ct, 'no-cache')
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); p = u.path
        if p in ('/', '/index.html'): return self.file(os.path.join(STATIC, 'index.html'))
        if p.startswith('/static/'): return self.file(os.path.join(STATIC, os.path.basename(p)))
        if p.startswith('/site/img/'): return self.file(os.path.join(REPO, 'site', 'img', os.path.basename(p)))
        if re.fullmatch(r'/logos\d?\.js', p): return self.file(os.path.join(REPO, p[1:]))
        m = re.fullmatch(r'/files/([a-z0-9]+)/([a-z0-9]+\.(?:jpg|png))', p)
        if m: return self.file(os.path.join(ddir(m.group(1)), m.group(2)))
        m = re.fullmatch(r'/api/job/([a-f0-9]+)', p)
        if m:
            j = JOBS.get(m.group(1))
            return self.send(200, {k: v for k, v in j.items() if k != 'started'} | {'elapsed': round(time.time() - j['started'])}) if j else self.send(404, {'error': 'no job'})
        m = re.fullmatch(r'/api/design/([a-z0-9]+)', p)
        if m:
            try: return self.send(200, load(m.group(1)))
            except Exception: return self.send(404, {'error': 'no design'})
        if p == '/api/logo':  # same-origin proxy so the browser can turn any logo (incl. SVG) into a PNG
            url = urllib.parse.parse_qs(u.query).get('url', [''])[0]
            if not re.match(r'https?://', url): return self.send(400, {'error': 'bad url'})
            try:
                body, ct, _ = fetch(url, 3_000_000, 10)
                if not re.match(r'image/', ct) and not body.lstrip().startswith(b'<svg') and b'<svg' not in body[:500]: return self.send(415, {'error': 'not an image'})
                return self.send(200, body, ct if ct.startswith('image/') else 'image/svg+xml', 'max-age=3600')
            except Exception as e: return self.send(502, {'error': str(e)[:200]})
        self.send(404, {'error': 'not found'})
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        if n > 8_000_000: return self.send(413, {'error': 'too big'})
        try: body = json.loads(self.rfile.read(n) or b'{}')
        except ValueError: return self.send(400, {'error': 'bad json'})
        try:
            if self.path == '/api/chat': return self.send(200, route(body))
            if self.path == '/api/brief': return self.send(200, make_brief(body.get('request', ''), body.get('urls') or []))
            if self.path == '/api/covers':
                did, jid = start_covers(body); return self.send(200, {'id': did, 'job': jid})
            if self.path == '/api/faces': return self.send(200, {'job': start_faces(body)})
            if self.path == '/api/edit': return self.send(200, {'job': start_edit(body)})
            if self.path == '/api/order':
                body['at'] = time.strftime('%Y-%m-%d %H:%M:%S'); body['ip'] = self.headers.get('X-Forwarded-For', self.client_address[0])
                with open(os.path.join(DATA, 'orders.jsonl'), 'a') as f: f.write(json.dumps(body) + '\n')
                return self.send(200, {'ok': True})
        except Exception as e:
            return self.send(500, {'error': str(e)[:400]})
        self.send(404, {'error': 'not found'})

if __name__ == '__main__':
    print(f'Comet chat on http://127.0.0.1:{PORT}  data {DATA}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
