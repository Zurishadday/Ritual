# Review: Taller Rueda Libre (contact-form page)

Reviewer: claude-opus-5-5 · 2026-10-13. Build reviewed: `servidor.mjs` + `public/` as delivered. I fixed nothing.

## How it was run

- Bash/PowerShell were mostly blocked in this session; only `node <script>` was allowed. All checks were Node scripts kept **outside** the build folder (`%TEMP%\review-scratch\t1..t7.mjs`). Each one started `node servidor.mjs` itself (with `PORT`, and `ADMIN_PASSWORD=clave-prueba` except where noted) and stopped it afterwards.
- HTTP probes used `fetch`, raw sockets (for unnormalised paths) and `http.request` with `localAddress: 127.0.x.y`, so I could act as many visitors with different IPs.
- Browser checks used **headless Edge driven through the DevTools protocol** at 375×740 (mobile emulation): real Tab/Enter key events, real mouse clicks, screenshots, `Emulation.setScriptExecutionDisabled` for the no-JS path, and dialogs accepted through CDP.
- Port 3000 was already in use before my first run (probably a process left by the build), so my servers ran on 3001. Not counted as a finding.
- `datos/` did not exist before the review. My scripts created it and deleted it again. All servers and Edge instances I started were stopped, and ports 3001 and 9333–9335 were free at the end.
- `lessons/TEMPLATE.md` is not in this folder. The candidate lessons below use five parts: Mistake / Why it happens / Rule / Detector question / How to check.

## Findings

| # | What broke | Evidence (command → result) | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | **The admin lockout counts the browser's normal "no credentials yet" request as a failed password and never clears on success.** After that, the *correct* password is refused for 15 min. | t1 §7b: 5× `GET /admin` with no `Authorization` header (each 401), then the correct password → **429 "Demasiados intentos fallidos, espera 15 minutos."** t1 §7d: 1 unauthenticated hit + 1 typo + **success 200**, then 3 more unauthenticated hits (e.g. opening admin in another browser or private window) → correct password → **429**. | The owner opens `/admin` from their phone and laptop, cancels the dialog once, and mistypes once. The next time, the right password gets "espera 15 minutos" and they can't read their messages. Anyone on the same IP (shared Wi-Fi, or everyone behind the reverse proxy the builder recommends, see #8) can lock the owner out with 5 requests that need no password. | security |
| 2 | **Deleting a message while visitors are submitting loses their messages.** The delete reads the whole file, writes a `.tmp` copy and renames it over the original. Anything appended in between disappears. | t2 §B: 5,000 messages on file, the owner deletes one while 30 visitors (distinct IPs) submit. **All 30 got `201 {"ok":true}`, only 27 of their messages were on disk afterwards** (total 5026, expected 5029). | A customer is told "¡Gracias!" but the owner never sees the message, because they happened to be cleaning up spam at that moment. Nobody finds out. | data |
| 3 | **A partial last line (e.g. from a crash or full disk) swallows the next visitor's message, and the next delete makes the loss permanent.** `appendFile` adds the new record to the end of the broken line. The reader silently skips the merged line. | t2 §C: file = 1 valid line + `{"id":"cortado",…"nombre":"Mar` (no newline). The visitor posts → **201**. `/admin` shows **"Mensajes recibidos (1)"**. Is "Visitante Siguiente" visible? **false**. After deleting the other message, does the file contain the visitor's text? **false**. | After one bad write, the next real customer's message vanishes without anyone being told: not the visitor, not the owner, and nothing appears in the console. | data |
| 4 | **The no-JS fallback works only on the happy path. Any error throws away what the person typed.** The error page's "Volver" link goes to `/#contacto`, which loads a fresh, empty form. | t7 (scripts disabled): good → `/api/contacto` "¡Gracias!…" saved 1 ✔. Bad email (`rosagmail.com` plus a long message) → page "No se envió · Escribe un correo válido. · Volver". Clicking Volver → `#contacto` with **fields = ["","","",""]**. Empty submit → error page as well (the form has `novalidate`, so the browser doesn't stop it). | On a phone where `app.js` didn't load, the customer types a long description of the problem with their bike, forgets the "@", and loses all of it. Many won't type it again. | form |
| 5 | **The rate limit counts rejected attempts, so a person fixing their mistakes is blocked on the attempt that would have worked.** | t7 (no JS): 5 POSTs in a minute (2 good, 2 rejected, 1 double-click), then a 6th, correct one → **"No se envió · Demasiados intentos, espera un minuto."** t1: request #6 → 429 even though only 2 messages had been saved. | A visitor without JS who gets the email wrong a few times gets "espera un minuto" when they finally get it right, and loses the text again (#4). | form |
| 6 | **After submitting with the keyboard, focus is lost to `<body>`, whether it succeeds or fails.** The button is disabled while the request runs, so focus falls off it. The next Tab leaves the page, and the one after that jumps to the top nav. | t5/t6/t7 (Edge, Tab to the button, then Enter): after a server error, `activeElement` = **BODY**. Next Tab → BODY, 2nd Tab → **"A Servicios", scrollY 0** (back at the top of the page). After success, focus = **BODY** as well. | A keyboard or screen-reader user who has to fix the email loses their place. Tabbing takes them to the browser UI and then to the top of the page, and they have to Tab back through the whole page to the form. | accessibility |
| 7 | **The browser and the server use different email rules.** `type=email` accepts `ana@gmail`, but the server's regex requires a dot. | t5: `juan@gmail` passes `checkValidity()`. Server → `400 "Escribe un correo válido."`, and focus is lost (#6). | A common typo (forgetting `.com`) gets past the in-page check and then fails after a round trip, with a vague message. It's recoverable with JS (the fields are kept). Without JS it costs the whole message (#4). | form |
| 8 | **All per-IP protections use `req.socket.remoteAddress`. Behind the reverse proxy the builder recommends, every visitor has the same IP.** The 5-messages-per-minute limit then applies to the whole site, and the login lockout (#1) applies to everyone. | Simulated with all clients on 127.0.0.1 (which is what Caddy or Nginx would look like): t1 — two different "visitors" from one IP: the 6th POST of the minute → **429**. t1 §7c: 20 wrong passwords → `{401: 5, 429: 15}`, then the correct password → **429**. There is no `X-Forwarded-For` handling. *(I did not run a real proxy.)* | Once it's published "con Caddy o Nginx" as the summary advises, the 6th customer in any minute is turned away, and one stranger can keep the owner out of `/admin` indefinitely. | security |
| 9 | **A bot flood buries the real message, and the owner has no way to clear it except one confirm dialog at a time.** The honeypot stops only bots that fill every field, and the per-IP limit stops only bots that use a single IP. | t6: 1,200 bot posts from 240 IPs (5 each) → **1200/1200 accepted**. `/admin` shows **"Mensajes recibidos (1201)"**. The real message is **card #201**. There are **1201 separate delete forms**, and no search, filter or bulk delete. Each delete rewrites the whole file (and races with new posts, #2). | The morning after a spam run, the owner scrolls through hundreds of cards looking for one customer, then clicks "Borrar" and "Aceptar" 1,200 times. | data |
| 10 | **The admin's claim about lockout behaviour is inaccurate.** It says "Después de 5 contraseñas incorrectas … bloqueada 15 minutos". In fact any 5 requests without valid credentials count, including the browser's automatic first request, and a correct password doesn't reset the count (#1). | See #1. | The owner trusts the description and doesn't expect to lock themselves out. | false claim |
| 11 | **"El borrado solo funciona desde la propia página de administración" is not quite true.** Cross-origin is blocked, but any client with the password and no `Origin` header can delete. | t1 §7e: `Origin: http://evil.example` → 403 ✔. With the password and no Origin → **303**, and the message was gone (`id0 still present? false`). | Low risk (it needs the password), but the claim overstates the protection. | false claim |
| 12 | A body over the 10 KB cap gets a dropped connection, not a 413 or 400. | t1: 100 KB JSON field → **`ECONNRESET`**, no HTTP response. | Doesn't affect the page (`maxlength` stops it), but an API client or proxy just sees a reset. | server |
| 13 | Non-string fields are coerced and saved. | t1: `{"nombre":["x"],"mensaje":{"a":1}}` → **201**, and the message is saved as `"[object Object]"`. | Junk entries in the inbox from scripted posts. | server |
| 14 | The nav links are small tap targets on mobile. | t5 at 375 px: Servicios / Visítanos / Contacto are **24 px tall** (61–64 px wide). Everything else is 48 px or more. | Easy to tap the wrong link with a thumb. This meets WCAG 2.5.8's 24 px minimum, but not the 44 px guideline. | mobile |
| 15 | Field errors are announced only by one generic sentence. There is no `aria-invalid` and no message tied to a field. | t5, empty submit: status "Completa todos los campos con un correo válido.", `[aria-invalid]` count **0**. Focus does move to the first invalid field ✔. | A screen-reader user hears "complete all fields" and has to work out which one is wrong. | accessibility |

### What held (tried, didn't break)

- **Startup and assets:** the server starts with no syntax errors. `/`, the CSS, the JS and all 4 SVGs return 200 with the right content types. Without `ADMIN_PASSWORD` the console prints a random password ("Contraseña de esta sesión: 029acb3eb470") ✔.
- **Form with JS** (Edge, 375 px):
  - Empty submit shows a message, puts focus on `nombre`, and the message is in view.
  - One-letter name plus `juangmail.com` shows a message, puts focus on `correo`, and keeps the values.
  - The good path shows "¡Gracias! Recibimos tu mensaje…" in the viewport, right under the button (screenshot `kb-after-error.png` / `f-ok.png`), and clears the form.
- **Double click:** a real double click saves **1** message, both with JS and without. But the server has no de-duplication: two parallel identical POSTs → 2 saved.
- **HTML in messages:** `<b>hola</b>` and `<img src=x onerror="alert(1)">` are shown as text in `/admin`. There were 0 `<img>` and 0 `<b>` elements and no dialog in Edge.
- **Server-side validation:**
  - Empty or null body → 400.
  - Bad email → 400.
  - `GET` / `PUT` on `/api/contacto` → 405.
  - Lengths are capped at 100 / 150 / 2000.
- **Static file server:**
  - `/../servidor.mjs` → 404, `/..%2f..%2fservidor.mjs` → 403, `/..%5cservidor.mjs` → 403, `/%2e%2e/servidor.mjs` → 404.
  - `/datos/mensajes.jsonl` → 404, and `/..%2fdatos%2fmensajes.jsonl` → 403.
  - `/C:/Windows/win.ini` → 404, and a malformed `%` escape → 400.
- **Admin access:** `/admin` without credentials or with wrong ones → 401. With the right ones → 200, plus `noindex` and `no-store`. Deleting through the page in Edge works: the confirm dialog is accepted, the message count goes from 4 to 3, and the browser lands back on `/admin`.
- **Mobile:** at 375 px, `scrollWidth` = `clientWidth` = 375, so there is no horizontal scroll, on the home page and in `/admin`. The service cards and the hours/address blocks are each in **1 column**.
- **Keyboard:** Tab order is nav → Escríbenos → nombre → correo → mensaje → button. The focus ring is visible on every stop: the browser default on the nav links, a 3 px green outline elsewhere (`k-nav-focus.png`). The form can be submitted with Enter.
- **Images:**
  - Alt text is useful ("Cadena y engranes de una bicicleta", …).
  - There are no `width`/`height` attributes, but CSS `aspect-ratio: 3/2` reserves the space. Measured CLS = **0.0000** after scrolling the whole page.
- **Contrast:**
  - Button 5.26:1, price 5.26:1, note 5.74:1, error text 7.33:1.
  - Hero text worst case (lightest SVG colour under the lightest overlay) is 4.95:1.
- **Concurrent writes:** 100 simultaneous posts from 100 IPs → 100 lines, all valid JSON.
- **Admin page scaling:** `/admin` time grows with the number of messages but stays small. Two runs:
  - 26 ms with 500 messages, 38 ms with 2k, 62 ms with 5k, 76 ms with 10k (4.2 MB of HTML).
  - A visitor's submit took 14–22 ms while an admin render was in flight.
- **Honeypot:** a bot that fills `web` gets `201 {"ok":true}` and nothing is saved, as claimed.

### Builder's claims, one by one

| Claim | Status |
|---|---|
| Runs with `node servidor.mjs`; "probable que haya algún error pequeño" | Runs. There were no startup or syntax errors. |
| Home page with a big image and the phrase | True (the image is an SVG drawing, as disclosed). |
| Three services with an image and a price | True. |
| Stacks into one column on mobile | True (measured). |
| "¡Gracias!" appears | True, with JS and without. |
| Password printed in the console, different on each start | True. |
| Messages in `datos/mensajes.jsonl`, created on first message | True. |
| Admin: newest first, delete button | True. But delete can lose concurrent messages (#2). |
| Max 5 messages per minute per IP | True, but it counts *attempts*, including rejected ones (#5), and it's per proxy IP once published (#8). |
| Honeypot discards silently | True. |
| 5 wrong passwords → 15-minute lock | **Inaccurate** (#1, #10). |
| Delete only from the admin page itself | **Overstated** (#11). |
| Form works without JavaScript | **Only on the happy path** (#4). |
| Per-IP limits reset on restart | True (in-memory `Map`). |

## Candidate lessons

Findings already covered by an existing lesson (no new lesson written):

| Finding | Covered by |
|---|---|
| #3 | **WEB-1** (damaged store takes the next record down) |
| #4 | **WEB-3** (untested fallback) |
| #6 | **WEB-4** (disabled button takes focus with it) |
| #9 | **WEB-2** (bots from day one) |
| #7 and #15 | Core **45** (error path), as one-off slips within it |
| #10 | Core **41**: the claim was checked in the source ("5 contraseñas incorrectas") rather than in the browser's real Basic-auth flow |

Findings #12, #13 and #14 are one-off slips.

### L-A · Rewrite-and-rename "delete" drops records appended during the rewrite

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

- **Mistake:** The delete operation read the whole message file, wrote a filtered copy to `.tmp` and renamed it over the original. Visitors' `appendFile` calls kept writing to the original during that window, and the rename threw their messages away. The visitors had already been told "¡Gracias!".
- **Why it happens:** "temp file plus rename" is learned as *the* safe way to write, which it is against crashes. But it only protects against *crashes*, not against other writers. The delete was serialised against other deletes (`bloqueo`), but not against appends, which used a separate code path.
- **Rule:** Every operation that writes to a store has to go through the same lock or queue, including plain appends, or else deletes must not rewrite (use tombstone records, compact later under the same lock).
- **Detector question:** Is there any other code path writing to this file while my rewrite is between "read" and "rename"? What happens to what it wrote?
- **How to check:** Seed a few thousand records, fire one delete plus 30 concurrent submits, and compare "told OK" against "on disk" (here 30 vs 27).

### L-B · An attempt limit that counts the browser's own handshake locks out the owner

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

- **Mistake:** The builder added a login lockout ("5 failures → 15 min") on HTTP Basic auth and recorded a failure on *every* 401. But a browser's first request to a Basic-auth page never carries credentials. Each visit, each cancelled dialog and each new browser therefore counted as a "wrong password". The check also runs *before* the password is tested, and success never clears the counter. The result was that the correct password got "espera 15 minutos".
- **Why it happens:** The limit was written from the server's point of view ("a request without valid auth is a failure") without walking through the real browser flow: challenge, prompt, retry.
- **Rule:** Count only requests that actually *present* credentials and fail. Clear the counter on success. Test the lockout with the real client, not just with crafted headers.
- **Detector question:** Walk the owner's normal day (open admin on two devices, cancel once, mistype once): how many "failures" has that recorded, and does the right password still work?
- **How to check:** Send N requests with no `Authorization` header, then the correct password, and expect 200. Then do success, a few unauthenticated hits, and success again, and expect 200 both times. (Here both got 429.)

### L-C · Per-IP limits are global behind the reverse proxy you recommended

origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

- **Mistake:** The rate limit and the login lockout were keyed on `req.socket.remoteAddress`, while the summary told the owner to publish behind Caddy or Nginx for HTTPS. Behind a proxy every visitor has the proxy's IP. "5 messages per minute per IP" becomes 5 per minute for the whole site, and one attacker's 5 bad logins lock out everyone, including the owner.
- **Why it happens:** It was tested (or imagined) only on localhost, where it looks right. The deployment advice and the IP logic were written separately and never compared.
- **Rule:** If the deploy advice puts a proxy in front, the per-IP code has to read a trusted forwarded header (only when the request comes from the proxy), or the limits have to be described as per-proxy.
- **Detector question:** In the deployment I'm recommending, what IP does this code see for two different visitors?
- **How to check:** Run two clients through the proxy (or simulate it with every client on 127.0.0.1). The second visitor should not be throttled by the first one's attempts. (Here: 6th POST → 429, and the correct password after a stranger's 5 bad ones → 429.)
