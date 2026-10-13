# web · 2026-10 · claude-sonnet-5-5

Built by `claude-sonnet-5-5`, reviewed by `claude-opus-5-5`, 2 run(s), Claude Code 2.1.295, isolation: subscription, flags (checked with --probe?).

## Lessons of the package

- **The mistake happened in every run** (7): 41, 45, 46, 49, WEB-2, WEB-3, WEB-4. Confirmed with this model: `node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-10` for each.
- **The mistake happened in no run** (1): WEB-1. Candidates to demote for this model: check the evidence before anything else.
- **The mistake happened in some runs only** (1): 32. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · data · Atomic rename breaks on Windows when a reader outside the write queue has the file open, so a message is lost: 40 POSTs interleaved with 40 admin GETs -> POST {"201":39,"500":1}, saved 39; stderr: EPERM: operation not permitted, rename '...mensajes.json.tmp' -> '...mensajes.json'
- Run 1 · server · Per-IP limit keyed on socket address counts the recommended reverse proxy, not the person, and counts rejected typos: same IP: 5 rejected POSTs (correo a@b) then valid one -> 429; in the browser all POSTs come from 127.0.0.1 and the 6th message in a minute was not saved; LEEME recommends Caddy/nginx in front
- Run 1 · accessibility · White text on the orange CTA buttons fails WCAG AA contrast: white on #e8742c = 3.01:1, hover #cc5f1b = 4.02:1, button text 16px/600 (not large) needs 4.5:1
- Run 1 · data · A damaged mensajes.json makes every submission and the admin list fail with a generic 'Error interno': file truncated to 5000 B -> POST 500 {"error":"Error interno"}, GET /api/mensajes 500; log: SyntaxError: Unterminated string in JSON at position 5000
- Run 1 · false claim · Startup hints use bash syntax on a Windows setup, and with HOST=0.0.0.0 the banner prints localhost instead of the LAN IP: banner: 'Para fijar una propia: ADMIN_PASSWORD=tuclave node servidor.mjs'; HOST=0.0.0.0 -> 'Taller Rueda Libre en http://localhost:3112'; password differs per run (70i_OqMcz_73 vs yqHp0pTGtBnf)
- Run 1 · security · Admin Basic auth has no throttle or lockout: 50 wrong passwords in a row -> 50 x 401, no delay or lock
- Run 2 · data · An unreadable message store makes every new submission fail, with only a console stack trace as signal: mensajes.json truncated to '[{"id":"x","nombre":"Ana"' -> valid POST 500 'Error interno', admin GET 500, stderr SyntaxError
- Run 2 · accessibility · Hero headline over the photo has insufficient contrast at mobile width (crosses white bike frame and light sky): movil-arriba.png at 375px: white h1 over #fff frame (~1:1) and ~#f0b36a sky (~1.9:1); gradient covers only lower part of text block
- Run 2 · security · Admin Basic-auth login has no failed-attempt limit: 200 wrong passwords in a row -> 200 x 401 in 615 ms, none blocked
- Run 2 · server · Oversize body gets a connection reset instead of the intended 413: POST /api/contacto with 100 KB fields -> ECONNRESET (req.destroy() before responding)
- Run 2 · server · Non-string fields coerced and saved: {"nombre":{"a":1},...} -> 201, stored nombre '[object Object]'
- Run 2 · accessibility · Images have no declared width/height: 4/4 <img> width=null height=null; desktop fresh-load CLS 0.0731
- Run 2 · false claim · Publishing instruction given in bash syntax to a PowerShell user: Summary says 'usa HOST=0.0.0.0' next to a PowerShell example; in PowerShell it must be $env:HOST='0.0.0.0'

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
