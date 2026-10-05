#!/usr/bin/env bash
# Deploy the vote page + API to wbg-apps. Run from the repo root.
set -euo pipefail
H=wbg-apps
ssh -o ConnectTimeout=5 $H 'mkdir -p /opt/comet-votes/static'
rsync -a server/server.py $H:/opt/comet-votes/
rsync -a --delete vote.html logos.js logos2.js logos3.js logos4.js logos5.js $H:/opt/comet-votes/static/
rsync -a server/comet-votes.service $H:/etc/systemd/system/
rsync -a server/comet-votes.caddy $H:/etc/caddy/apps/
ssh $H 'systemctl daemon-reload && systemctl enable --now comet-votes && systemctl restart comet-votes && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null && systemctl reload caddy && echo deployed'
