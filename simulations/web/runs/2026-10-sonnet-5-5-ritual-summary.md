# web · 2026-10 · claude-sonnet-5-5 · with Ritual

Built by `claude-sonnet-5-5` with Ritual loaded (its hooks; CLAUDE.md stays off, as in every run), reviewed by `claude-opus-5-5`, 3 run(s), Claude Code 2.1.296, isolation: subscription, flags (checked with --probe?).

## Spend

- Run 1 · builder 19 turns · $0.25821760000000005 · 15772 output tokens · reviewer 35 turns · $2.2063670000000006 · 58284 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)
- Run 2 · builder 18 turns · $0.2692647 · 16990 output tokens · reviewer 44 turns · $2.0315516 · 46794 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)
- Run 3 · builder 20 turns · $0.2651426 · 17150 output tokens · reviewer 52 turns · $1.7077030000000002 · 36942 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)

## Lessons of the package

- **The mistake happened in every run** (5): 41, 49, WEB-2, WEB-3, WEB-4. Confirmed with this model: `node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-10` for each.
- **The mistake happened in no run** (0)
- **The mistake happened in some runs only** (5): 32, 45, 46, WEB-5, WEB-1. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · data · Rewrite-and-rename delete drops messages appended during the rewrite: 5000 msgs, 1 admin delete + 30 concurrent visitor POSTs -> all 30 got 201, only 27 on disk (5026 vs expected 5029)
- Run 1 · security · Login lockout counts the browser's credential-less first request as a failure and never resets on success, locking out the owner: 1 unauthenticated GET + 1 typo + success(200) + 3 unauthenticated GETs -> correct password 429 'espera 15 minutos'
- Run 1 · security · Per-IP rate limit and lockout keyed on socket address become global behind the reverse proxy the builder recommends: All clients on 127.0.0.1 (proxy simulation): 6th POST in a minute from a different visitor -> 429; correct password after 5 bad ones by someone else -> 429; no X-Forwarded-For handling
- Run 1 · form · Browser and server validate email with different rules: 'juan@gmail' passes type=email checkValidity() but server returns 400 'Escribe un correo válido.'
- Run 2 · accessibility · White hero text over an image checked by eye on desktop only; unreadable where the crop is light on mobile: node contrast.mjs 3417: worst white-on-background contrast at 375px subtitle 2.07:1, H1 2.66:1; 768px subtitle 2.73:1; 1280px subtitle 4.10:1 (need 4.5 / 3)
- Run 2 · mobile · Mobile nav links are 25px tall tap targets: node browser.mjs 3417 mobile: Servicios/Horarios/Contacto height 25px, width ~60px at 375px
- Run 2 · accessibility · Form errors don't mark the offending field (no aria-invalid, no style, focus stays on button): node browser2.mjs 3417 formjs: after bad email all fields aria-invalid=null, border rgb(170,170,170), focus BUTTON
- Run 2 · server · Server accepts non-string fields and 500s on a JSON null body: node probe.mjs 3417 raw: body 'null' -> 500 Error interno; {nombre:12345, mensaje:{a:1}} -> 201 stored as '[object Object]'
- Run 3 · security · Per-IP rate limit and admin lockout keyed on socket address collapse behind the recommended proxy: proxy.mjs: visitors 203.0.113.1-7 -> 201 x5, 429, 429; attacker 5 bad passwords then owner with correct password from another IP -> 429
- Run 3 · form · Browser and server email rules disagree (type=email accepts luis@gmail, server regex rejects): Chrome: 'luis@gmail' passes client check, server returns 400 'Escribe un correo válido.', aria-invalid count 0, focus BODY
- Run 3 · security · Admin lockout blocks the correct password from the same IP: after 5 bad passwords from 127.0.0.1, admin:clave-prueba from 127.0.0.1 -> 429; from ::1 -> 200
- Run 3 · server · Oversized body gets a connection reset instead of the promised 413 message: 100 KB JSON or form POST to /api/contacto -> ERR ECONNRESET (req.destroy before 413 written)
- Run 3 · mobile · Mobile nav tap targets are 21 px tall: Chrome 375 px: Servicios 52x21, Visítanos 54x21, Contacto 54x21, brand 107x30
- Run 3 · accessibility · Focus ring #f2a900 on white has 2.0:1 contrast: computed outlineColor rgb(242,169,0) on all Tab stops; luminance 0.473 vs white -> 2.0:1 (< 3:1)
- Run 3 · data · Owner is not told when the message store was damaged; old messages vanish from /admin: damaged file -> /admin shows 'Mensajes recibidos (0)' with no notice; only console.error mentions the backup

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
