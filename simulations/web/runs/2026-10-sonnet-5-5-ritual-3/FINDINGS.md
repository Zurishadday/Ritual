# Findings: Taller Rueda Libre

Reviewer: claude-opus-5-5 · 2026-10. Build by claude-sonnet-5-5.

How it was run: `node servidor.mjs` started through a Node launcher that sets `PORT`/`ADMIN_PASS` (ports 3417–3423, restarted between groups so the per-IP limit started fresh each time). I sent raw HTTP probes from Node scripts (`sondas.mjs`, `datos.mjs`, `proxy.mjs`) and drove headless Chrome over CDP from Node (`navegador.mjs`) at 375×740 (mobile) and 1280×800, with screenshots. The scripts live outside the build, in `%TEMP%\revisor-rl\`. I changed nothing in the build. Note: `datos/` now holds test messages and a `mensajes.json.dañado-*` file from the damaged-store test.

## What held (tested, no finding)

- **Page loads, all images show:** the page and all 4 SVGs return 200, with `complete && naturalWidth>0` in Chrome.
- **Alt text:** every image has useful alt text. There are no `width`/`height` attributes, but the cards use `aspect-ratio: 3/2` and the hero uses `min-height: 60vh`, so the space is reserved before load.
- **File server:**
  - `/../servidor.mjs` and `/%2e%2e/servidor.mjs` → 404.
  - `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs` and `/..%2fdatos%2fmensajes.json` → 403.
  - `/datos/mensajes.json` and `/noexiste` → 404. A bad escape `/%E0%A4%A` → 400.
- **Methods:** `GET`/`PUT /api/contacto`, `DELETE /` and `POST /admin` → 405.
- **Server validation:** `{}` → 400 "Escribe tu nombre", an empty body → 400 "Datos inválidos", `null` → 400.
- **HTML injection:** `<b>hola</b>`, `<img src=x onerror="alert(1)">` and `"><script>…@x.co` show up in `/admin` as `&lt;b&gt;…`, `&lt;img … onerror=&quot;…`, and the same inside `href="mailto:&quot;&gt;&lt;script…"`. They show as text and nothing runs.
- **Admin:** a request without credentials gets 401 with `WWW-Authenticate: Basic`. Five wrong passwords → 401 ×5, and the 6th → 429.
- **Concurrent writes:** 10 simultaneous POSTs plus 10 admin GETs → all 201/200, and 10 messages saved. The write is temp file + rename, so a crash mid-write leaves at most a stale `.tmp` and the old file stays intact.
- **Double click (browser):** two quick clicks on "Enviar mensaje" saved 1 message, because the button is disabled synchronously.
- **Damaged `mensajes.json`:** the next POST → 201 and is saved. The damaged file is kept as `mensajes.json.dañado-<ts>`, with its contents intact.
- **Mobile 375 px:** `scrollWidth/innerWidth = 375/375` and no element is wider than the view.
- **Keyboard:**
  - Tab order: brand → 3 nav links → Escríbenos → nombre → correo → mensaje → Enviar. The honeypot is skipped.
  - Every stop has a visible outline. Enter on the button submits (+1 saved), and focus moves to the "¡Gracias!" status.
- **Sticky header vs. anchors:** after tapping "Contacto", the `h2` top is at 100 px and the header ends at 49 px, so the heading isn't hidden.
- **Error messages (JS path):** for an empty form and for `correo: ana`, the message "Completa todos los campos." / "Escribe un correo válido." appears next to the button, inside the viewport (top 602 of 740).

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | Without JavaScript, the form saves the message but the person never sees a confirmation. On an error they see no message and the form comes back empty. | Chrome, scripts disabled. Good submit → URL `/?enviado=1#contacto`, `#aviso-servidor` still `hidden`, "Gracias" on screen: `false`, saved +1. Empty submit → URL `/?error=Escribe%20tu%20nombre…`, aviso hidden, the error text isn't on screen, and the form is blank (screenshot `sinjs-vacio.png`). The notice is only filled in by `app.js`, which is exactly what is missing in this path. | When app.js fails to load (or a strict browser blocks scripts), the visitor submits and sees the same empty form. They think it failed and send it again (duplicates), or they give up. On an error, the message they typed is gone and they don't know why. | form / false claim |
| 2 | 5 rejected submissions use up the 10-minute quota, so the corrected message is refused. | `sondas.mjs tipo`: 5× `{correo:"luisgmail.com"}` → 400 ×5, then `{correo:"luis@gmail.com"}` → **429** "Demasiados mensajes. Intenta más tarde." The limit runs before validation, so it counts invalid posts. | A customer who makes typos a few times fixes the last one and gets told to come back later. That is a lost customer. | form |
| 3 | The browser and the server disagree on what a valid email is. `luis@gmail` passes the browser and fails on the server. After that error, focus is lost. | Chrome: `correo: luis@gmail` → request sent, server 400 "Escribe un correo válido.", `document.activeElement` = BODY, and the next Tab is still BODY. The server regex requires a dot, but `type=email` doesn't. | The person gets an error only after a round trip, with no field marked (`aria-invalid` count 0) and focus dropped to the page. A keyboard or screen-reader user loses their place. Each try also uses up their quota (#2). | form / accessibility |
| 4 | Behind the HTTPS proxy the builder recommends, every visitor shares one IP. After 5 messages from anyone, the whole site's form is closed for 10 minutes, and one attacker locks the owner out of `/admin`. | `proxy.mjs` (a minimal reverse proxy setting X-Forwarded-For): visitors 203.0.113.1–7 → `201 201 201 201 201 429 429`. Attacker 198.51.100.9 sends 5 bad passwords → 401 ×5, then the owner from 203.0.113.50 with the **correct** password → **429**. The key is `req.socket.remoteAddress`. | Once deployed as the summary says, the 6th customer of the morning can't write. Anyone can keep the owner out of the admin page forever by sending 5 wrong passwords a minute. | security / server |
| 5 | The admin lockout also blocks the correct password from the same IP. | `sondas.mjs admin`: after 5 bad passwords from 127.0.0.1, `admin:clave-prueba` from 127.0.0.1 → 429. From ::1 → 200. | If the owner mistypes a few times, or shares a Wi-Fi/NAT with whoever is guessing, they are locked out with the right password. Combined with #4, this hits every visitor. | security |
| 6 | The admin page shows every message on one page with no paging, search or delete, and every save rewrites the whole file. | `datos.mjs escala`: 1 000 messages → admin 49 ms, 0.4 MB HTML. 20 000 → 131 ms, 7.2 MB, 20 parallel = 1.3 s. 40 000 → 224 ms, **14.4 MB HTML**, post 92 ms, 20 parallel admins = 2.7 s. The honeypot and the per-IP limit exist, but rotating-IP bots get through. | After a bot wave, the owner opens a 14 MB page on their phone, scrolls to find the one real customer, and has to hand-edit JSON to clean up. | data / server |
| 7 | When the store is damaged, the owner isn't told. Old messages disappear from `/admin` with only a console line. | Wrote a truncated `mensajes.json` with "Mensaje real de ayer", then POST + admin → admin shows "Mensajes recibidos (0)", then "(1)". `/admin` doesn't mention the damage (`/dañado\|respaldo/` false). Only `console.error` in a terminal the owner may not watch. | The owner thinks yesterday's customers never wrote and doesn't follow up. The messages sit in `datos/mensajes.json.dañado-…` unseen. | data |
| 8 | An oversized body gets a dropped connection instead of the promised 413 "Mensaje demasiado largo." | `sondas.mjs servidor`: a 100 KB JSON or form POST → `ERR ECONNRESET`. `req.destroy()` runs before the 413 response is written. | In the no-JS path, the browser shows a generic "connection reset" page instead of a Spanish message. Only reachable with very long multibyte text, so this is a slip. | server |
| 9 | The mobile nav links are 21 px tall tap targets. | Chrome at 375 px: Servicios 52×21, Visítanos 54×21, Contacto 54×21, brand 107×30 (all < 44 px). | A customer on their phone taps "Visítanos" and gets "Servicios", or has to zoom. | mobile / accessibility |
| 10 | The focus ring is amber `#f2a900` on white: 2.0:1, below the 3:1 non-text contrast guideline. | `getComputedStyle(...).outlineColor` = `rgb(242,169,0)` on every stop. Luminance 0.473 vs. white 1.0 → (1.05/0.523) = 2.0:1. | A low-vision keyboard user loses track of which field they are in, mainly on the white form fields. | accessibility |
| 11 | The hero headline sits on top of the white bicycle's strokes on mobile. | Screenshot `movil-arriba.png` (375 px): white "Taller Rueda Libre" and the subtitle cross the white wheel/frame lines. The gradient only darkens the bottom. | It is still readable, but the main phrase looks cluttered on the phone, where most visitors land. Minor. | mobile |
| 12 | The builder's summary says "Funciona también sin JavaScript" and "valida … con límites de tamaño", but neither is true from the person's side. | See #1 (no confirmation and no error without JS) and #8 (no 413 is returned). The other claims checked true: console prints URL/user/password, 5/10 min limit, 5 failed logins → block, escaping, atomic write, damaged file set aside. The builder was honest that it never ran the code. | The owner relies on the no-JS fallback and the "message too long" text, and their customers hit neither. | false claim |
| 13 | The server doesn't deduplicate: two identical POSTs at the same instant are both saved. | `sondas.mjs doble`: `Promise.all` of 2 identical posts → 201, 201, and 2 "Doble / dos clics" records in `mensajes.json`. The browser button prevents it in the JS path. In the no-JS path, nothing prevents a double submit. | Without JS, a double tap creates duplicate messages in the admin list. Minor. | data |

## Lessons check

| Lesson | Verdict | Evidence |
|---|---|---|
| 32 | broke | Without JS a good submit saves (+1) but nothing visible changes (`#aviso-servidor` hidden), so it will be reported as broken (#1). The JS path held: the status is visible next to the button. |
| 41 | broke | The builder stated "Funciona también sin JavaScript" from the code. On screen, the no-JS submit shows nothing (#1, #12). |
| 45 | broke | Typo path: `luis@gmail` → server error with focus on BODY. After 5 rejected tries, the corrected email → 429 (#2, #3). |
| 46 | broke | Admin and every save read the whole file: 40 000 messages → 14.4 MB HTML, 224 ms, 2.7 s for 20 at once (#6). |
| 49 | broke | The general per-IP limit runs before validation and overrides the specific "fix the field and resend" answer → 429 on the corrected message (#2). |
| WEB-2 | broke | No delete, search or paging. With 40 000 messages, `/admin` is one 14.4 MB page (#6). |
| WEB-3 | broke | Scripts disabled → `?enviado=1` / `?error=…` are never shown (#1). |
| WEB-4 | broke | After a server-side error the button is re-enabled, but `activeElement` = BODY and the next Tab is still BODY (#3). |
| WEB-5 | held | 5 bad passwords → 401 ×5, the 6th → 429. (Side effects in #4/#5.) |
| WEB-1 | held | Damaged file → the next POST is 201 and saved, and the damaged file is kept. Gap: the owner isn't told (#7), which refines WEB-1's "who finds out" half. |

## Candidate lessons

Covered by existing lessons, so no new lesson:
- #1 → WEB-3, lesson 32 and lesson 41.
- #2 → lesson 49, lesson 45.
- #6 → lesson 46, WEB-2.
- #7 → refines WEB-1: the detector's second half ("who finds out") broke. Suggested sharpening: "the owner sees it in the place they already look (the admin page), not in a console".
- #3's focus loss → WEB-4.

Not lessons (one-off slips): #8, #10, #11, #13.

### A per-client limit must know who the client is where the app will actually run

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: security` · `packages: web, apps`

**The idea.** A rate limit or lockout keyed on "the client" is only as good as the way the client is identified in production. Behind a proxy, load balancer or shared NAT, the socket address is the same for everyone. Then the limit turns into a switch that one person can flip for all users, including the owner.

**Example.** A workshop's contact form limited 5 messages per IP per 10 minutes, and the admin page locked an IP after 5 wrong passwords. Both used `req.socket.remoteAddress`. The builder's own summary recommended putting the site behind Caddy/nginx for HTTPS. Through a minimal reverse proxy, the 6th and 7th distinct visitors got 429. After an attacker sent 5 bad passwords, the owner, with the correct password and from a different real IP, also got 429.

**Detector question.** In the deployment I'm recommending, what value does this limit see as "the client" for two different real people? If it's the same, who can block whom?

**Warning sign.** "It's per IP, so one abuser only blocks themselves", said while also writing "put it behind a proxy".

**What to do.** Decide the client key for the real deployment. Take it from the trusted proxy's forwarded header only when the request comes from that proxy, and from the socket otherwise. Test the limit through a proxy with two simulated clients. For logins, never let failed attempts from others block a correct credential. Slow down per account plus per client instead of a hard IP lockout.

### Two validators for one field must accept the same values

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** When the browser checks a field and the server checks it again, the rules must match. If the server is stricter, people pass the instant check and fail later, after a round trip, with worse feedback and side effects (a quota used, focus lost).

**Example.** A contact form used `type=email`, which accepts `luis@gmail`. The server's regex required a dot after the `@`. The person submitted, saw "Escribe un correo válido." after the request, with no field marked and focus dropped to the page body. The rejected request also counted toward the 5-per-10-minutes limit.

**Detector question.** Is there a value the browser accepts and the server rejects (or the reverse)? What does the person see and lose when they hit it?

**Warning sign.** "The browser already validates it; the server is just a backstop", said while the two rules were written separately.

**What to do.** Write the rule once and use it on both sides (the same regex and length limits in `pattern`/`maxlength` and on the server), or loosen the server to match the browser. Test the boundary values (`a@b`, 100 vs. 101 chars, multibyte text) against both. Make server errors point at the field (`aria-invalid`, focus on it), and don't let rejected input count against a rate limit.
