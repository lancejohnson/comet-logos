# Comet AI designer chat (prototype)

One chat that joins the three pieces: **brand → designs** (`prompts/brand-to-3d.md`), the **3D brochure**
(`site/3d-src.js` geometry, copied into `static/viewer.js`) and the **size + price calculator** (`site/pricing.html`).

Flow: website or words → brief (logo, colours, fonts, copy) → 3 covers (Clean / Bold / Photo) → pick one →
inside left, screen page, back → live 3D model + size drawing beside an iPhone 16 → quantity → "Order these" (email capture).
Typed messages go through a small router (`/api/chat`) that decides: design, edit, price, order or just answer.

- **Models:** ChatGPT (`gpt-5.5` + `image_generation`) through Pi's Codex login in `~/.pi/agent/auth.json`.
  That's a personal plan — fine for this private prototype, **not** for public traffic. Swap `codex()` in `server.py`
  for an API key before Google Ads.
- **Speed:** brief ~10 s, three covers ~30 s in parallel, the other three pages ~35 s, an edit ~30 s.
- **Screen page:** the model only paints the background; the screen, five buttons, label and logo are drawn in the
  browser (`composeInr` in `app.js`) at the dieline positions, so they always line up with the 3D model.
- **Data:** `~/.local/share/comet-chat/designs/<id>/` (brief, logo, pages); orders in `orders.jsonl`.
  Every design has a link: `/#d=<id>`.
- **Prices are placeholders** (same tables as `site/pricing.html`).

## Run on agentbox

    git clone https://github.com/lancejohnson/comet-logos ~/apps/comet-logos
    ln -sf ~/apps/comet-logos/chat/comet-chat.service ~/.config/systemd/user/
    systemctl --user daemon-reload && systemctl --user enable --now comet-chat
    tailscale serve --bg --https=8450 http://127.0.0.1:8131     # tailnet only

Update: `git -C ~/apps/comet-logos pull && systemctl --user restart comet-chat`.
