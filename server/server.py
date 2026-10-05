#!/usr/bin/env python3
"""Comet logo votes: tiny public vote store + static page.

Served behind Caddy at app.whiteboardgeeks.com/comet-votes/ (prefix stripped).
  GET  /                 -> vote.html
  GET  /<name>.js        -> static logo scripts
  GET  /api/votes        -> {"people":[{"id","name","votes":{key:"y"|"n"},"updated"}]}
  PUT  /api/votes/<id>   -> body {"name": str, "votes": {key: "y"|"n"}}; upsert own row
  DELETE /api/votes/<id> -> remove own row
Each voter's browser makes a random id and keeps it, so a person can only edit their own row
(anyone holding the id could, but ids are 24+ random characters and never shown).
"""
import json, os, re, sqlite3, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, 'static')
DB = os.path.join(os.environ.get('STATE_DIRECTORY', HERE), 'votes.db')
PORT = int(os.environ.get('PORT', '8120'))
ID_RE = re.compile(r'^[A-Za-z0-9_-]{16,48}$')
KEY_RE = re.compile(r'^[a-z0-9_]{1,24}$')
MAX_PEOPLE, MAX_KEYS, MAX_BODY = 400, 80, 8192
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png'}
lock = threading.Lock()

def db():
    c = sqlite3.connect(DB)
    c.execute('create table if not exists people (id text primary key, name text not null, votes text not null, updated real not null)')
    return c

class H(BaseHTTPRequestHandler):
    server_version = 'comet-votes'
    def log_message(self, *a): pass

    def send(self, code, body=b'', ctype='application/json', cache='no-store'):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', cache)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)

    def do_OPTIONS(self): self.send(204)

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path == '/api/votes':
            with lock, db() as c:
                rows = c.execute('select id, name, votes, updated from people order by updated').fetchall()
            # ids are private: hand back a short public handle instead
            return self.send(200, {'people': [{'pid': r[0][:8], 'name': r[1], 'votes': json.loads(r[2]), 'updated': r[3]} for r in rows]})
        name = 'vote.html' if path in ('/', '/index.html') else path.lstrip('/')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', name) or name.startswith('.'):
            return self.send(404, {'error': 'not found'})
        fp = os.path.join(STATIC, name)
        if not os.path.isfile(fp): return self.send(404, {'error': 'not found'})
        with open(fp, 'rb') as f:
            return self.send(200, f.read(), TYPES.get(os.path.splitext(name)[1], 'application/octet-stream'), 'no-cache')
    do_HEAD = do_GET

    def _id(self):
        m = re.fullmatch(r'/api/votes/([^/]+)', self.path.split('?')[0])
        return m.group(1) if m and ID_RE.match(m.group(1)) else None

    def do_PUT(self):
        vid = self._id()
        if not vid: return self.send(400, {'error': 'bad id'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY: return self.send(413, {'error': 'too big'})
        try: data = json.loads(self.rfile.read(n))
        except Exception: return self.send(400, {'error': 'bad json'})
        name = ' '.join(str(data.get('name', '')).split())[:40]
        votes = data.get('votes')
        if not name: return self.send(400, {'error': 'name required'})
        if not isinstance(votes, dict) or len(votes) > MAX_KEYS: return self.send(400, {'error': 'bad votes'})
        votes = {k: v for k, v in votes.items() if isinstance(k, str) and KEY_RE.match(k) and v in ('y', 'n')}
        with lock, db() as c:
            exists = c.execute('select 1 from people where id=?', (vid,)).fetchone()
            if not exists and c.execute('select count(*) from people').fetchone()[0] >= MAX_PEOPLE:
                return self.send(429, {'error': 'full'})
            c.execute('insert into people (id, name, votes, updated) values (?,?,?,?) on conflict(id) do update set name=excluded.name, votes=excluded.votes, updated=excluded.updated',
                      (vid, name, json.dumps(votes), time.time()))
        self.send(200, {'ok': True, 'pid': vid[:8]})

    def do_DELETE(self):
        vid = self._id()
        if not vid: return self.send(400, {'error': 'bad id'})
        with lock, db() as c: c.execute('delete from people where id=?', (vid,))
        self.send(200, {'ok': True})

if __name__ == '__main__':
    db().close()
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
