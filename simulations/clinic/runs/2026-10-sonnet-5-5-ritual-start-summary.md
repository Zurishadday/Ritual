# clinic · 2026-10 · claude-sonnet-5-5 · Ritual without its close

Built by `claude-sonnet-5-5` with Ritual loaded (its hooks, with the close turned off; CLAUDE.md stays off, as in every run), reviewed by `claude-opus-5-5`, 4 run(s), Claude Code 2.1.296, isolation: subscription, flags (checked with --probe?), blind review.

## Spend

- Run 1 · builder 19 turns · $0.6914925999999999 · 38420 output tokens · 1 denied tool call(s) · reviewer 68 turns · $2.540783 · 50688 output tokens · 3 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes)
- Run 2 · builder 22 turns · $0.5552075 · 33773 output tokens · 1 denied tool call(s) · reviewer 37 turns · $1.7806727999999998 · 39696 output tokens · 2 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes)
- Run 3 · builder 25 turns · $0.6513833999999998 · 39074 output tokens · 1 denied tool call(s) · reviewer 68 turns · $2.806744200000001 · 54590 output tokens · 6 denied tool call(s) · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)
- Run 4 · builder 20 turns · $0.5367976 · 32669 output tokens · reviewer 62 turns · $2.7524333999999993 · 57238 output tokens · 4 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s)

## Lessons of the package

- **The mistake happened in every run** (2): 41, WEB-2. Confirmed with this model: `node scripts/maintain.mjs seen <id> claude-sonnet-5-5 2026-10` for each.
- **The mistake happened in no run** (4): 45, WEB-3, WEB-4, WEB-5. Candidates to demote for this model: check the evidence before anything else.
- **The mistake happened in some runs only** (4): 32, 46, 49, WEB-1. They stay as they are.
- **Not checked** (0)

## New mistakes

- Run 1 · data · Deduplication answers 'received' but silently drops a resend's new comment: node revision/servidor-checks.mjs 3101: resend same phone/treatment/slot with comentario 'tengo marcapasos' -> 200 '¡Solicitud recibida!'; admin list shows one 'Doble Clic' entry with comentario ""
- Run 1 · security · Global login lockout lets any stranger keep the owner out of her panel: node revision/admin-checks.mjs 3101 <clave> global -> owner's correct password from a fresh IP -> 429 'Demasiados intentos'
- Run 1 · server · Appointment rate limit counts rejected attempts, blocking a person who finally gets it right: node revision/servidor-checks.mjs 3101: 6x 422 (phone typo) then correct request -> 429 'Has enviado muchas solicitudes seguidas'
- Run 1 · accessibility · Render error after login is written into the hidden login view, so the owner sees an empty panel and no message: node revision/depurar.mjs 3000 <clave> -> 'panel hidden= false | error-login= "Cannot set properties of null (setting textContent)" | items= 0'
- Run 1 · false claim · Phone placeholder hardcoded in three files while the comment names two; no README / how-to-test: servidor.mjs:10 says change it also in publico/index.html; publico/app.js:12 TEL_TEXTO='55 0000 0000' is not mentioned; Glob **/* finds no README
- Run 2 · mobile · User-typed text that doesn't wrap blows the mobile layout of the screen that shows it: navegador.mjs J: panel at 375px with a 100-char name/long email -> scrollWidth 2953, innerWidth 1500; screenshot m375-admin.png shows the page zoomed out to unreadable size
- Run 2 · accessibility · CSS selector built from user data breaks on a quote and drops keyboard focus: navegador.mjs J: Confirmar on name containing '"' -> SyntaxError 'is not a valid selector' (admin.js:109), focus now BODY; normal name keeps focus on BUTTON«Confirmar»
- Run 2 · server · Allow-list lookup on a plain object accepts prototype keys: sondas.mjs: POST /api/citas tratamiento:'toString' -> 200 resumen without tratamiento; '__proto__' -> 200 tratamiento:{}; both saved
- Run 2 · form · No-JS error page throws away everything the person typed: navegador.mjs K (scripts off): one bad phone -> error page; 'Volver al formulario' -> /#cita with nombre value ""
- Run 2 · security · Login attempt limit also blocks the correct password, so anyone on the owner's IP can lock her out: navegador.mjs J: 5 wrong passwords, then correct password -> 'Demasiados intentos. Espera 58 segundos.'
- Run 3 · mobile · Visitor-typed text without overflow-wrap makes the admin panel overflow sideways on a phone: CDP 375px mobile, request with 'Maximiliano'x9 name and 300-char unbroken comment: scrollWidth 3046 vs innerWidth 1500, page zoomed out (panel-375.png)
- Run 3 · form · A same-day hour that has already passed is accepted as a booking: at 10:02 Fri 2026-10-16: POST /api/citas fecha=2026-10-16 hora=09:00 -> 201 {"ok":true}; browser showed 'Listo, recibimos tu solicitud'
- Run 3 · server · Server judges 'today' by its own timezone, not the clinic's: same request fecha=2026-10-16 hora=09:00: 201 with local TZ, 422 'Ese día ya pasó' with TZ=Asia/Tokyo
- Run 3 · security · Per-IP limits ignore proxies and let anyone on the owner's IP lock the owner out: after 5 bad logins from 127.0.8.8 the correct password from the same IP -> 429 'Espera 60 segundos'; X-Forwarded-For varied -> still 401x5,429x2; HOST defaults to 127.0.0.1 so public use needs a proxy where all visitors share one IP
- Run 3 · form · No-JS error page loses everything the person typed and oversized posts return raw JSON: POST without Accept json, Sunday -> 422 HTML whose only way back is <a href="/#cita"> (fresh empty form); 100 KB no-JS post -> 413 {"error":"El mensaje es demasiado largo."}
- Run 3 · mobile · Main 'call us' link is a small tap target on mobile: 375px: phone link 141x30 px, 'Acceso del consultorio' 169x22 px
- Run 3 · false claim · No README or test instructions although the request asked how to test; password printed to console on every start: no README in folder; prueba.mjs ends 'Todo bien (parte 1)' with no part 2; node servidor.mjs prints 'Contraseña del panel: QUwBomoZj292'
- Run 4 · form · The no-JS error page's only button throws away everything the person typed: cita.js blocked, Sunday submit -> server HTML error page; click 'Volver al formulario' -> nombre "" and comentario ""
- Run 4 · server · Server accepts prototype keys as treatments and objects as names: POST tratamiento '__proto__' -> 201, 'toString' -> 201; nombre {} -> 201 saved as '[object Object]'; nombre {toString:1} -> 500
- Run 4 · accessibility · Hero subtitle text below 4.5:1 on a phone: 375px, lightest pixel behind 'Fisioterapia personalizada para' line -> 3.86:1 (19.2px regular text)
- Run 4 · accessibility · Focus outline nearly invisible on the dark hero: #1a5fd0 outline vs hero overlay background -> 1.84:1 (needs 3:1)

A new mistake becomes a lesson only if it broke in every run: compare the runs' FINDINGS.md by meaning.
