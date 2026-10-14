# Findings: Taller Rueda Libre

Reviewer: claude-opus-5-5 · 2026-10-13

## How this was run

- I copied the build to a scratch folder (`%TEMP%\rv-rueda`) so the test data would not land in the build folder. I started it the way the builder said (`node servidor.mjs`), on port 3100 through a one-line wrapper that sets `PORT`.
- For raw HTTP checks I used `rv-tools/http.mjs`, a Node script. It uses `fetch` and also raw sockets, so paths like `/../` reach the server without being normalized.
- For browser checks I used `rv-tools/cdp.mjs`, which drives headless Edge over the DevTools protocol with real mouse, keyboard and text-input events. It checked 375×812 (mobile) and 1280×900, with JavaScript on and off. I saved screenshots in `rv-tools/shots/` and looked at them.
- Notes on the harness:
  - The `web-check.mjs` the builder mentions is not in the folder.
  - `lessons/TEMPLATE.md` is not in the folder either, so the candidate lessons below use five parts: mistake, what it costs a person, detector question, habit, check.
  - My first browser run gave false failures because `html { scroll-behavior: smooth }` moved the button after I had measured where it was. I fixed my script and ran it again. Those false failures are **not** counted as findings.

## What held (tested, no problem)

- **Page and images:**
  - All 4 images load: `portada.svg 1600x900 complete=true`, and each card image is 800x600.
  - Every image has descriptive alt text and `width`/`height` attributes.
- **Form, good path:** I typed a fixed email and clicked.
  - The status shows `"¡Gracias! Recibimos tu mensaje…"` 16 px below the button, it gets focus, and the form is cleared. One line was saved.
- **Form, empty submit (keyboard Enter):**
  - Three field errors appear: `["Escribe tu nombre.","Escribe tu correo.","Escribe tu mensaje."]`.
  - Focus goes to `#nombre`, which is in view, and the next Tab goes to `#correo`.
- **Form, most common error** (name `A`, email `anagmail.com`):
  - The person sees `"Revisa el correo; debe verse como nombre@ejemplo.com."` under the field and a red border (screenshot `mobile-common-error.png`). Focus is on `#correo`.
  - Everything they typed is kept. After fixing the email, the send succeeds.
- **Double and triple clicks:** two quick clicks saved 1 message, and three clicks 30 ms apart saved 1 message. The button is never disabled (`btnDisabled:false`).
- **HTML in the message:**
  - Admin shows `<b>hola</b> <img src=x onerror="alert(1)">` as literal text.
  - In admin, `document.querySelectorAll('.mensaje b').length = 0` and no dialog fired.
- **Server-side validation:**
  - `{}` → 400 with three errors. An empty body → 400. `null` → 400. 5 KB fields → 400 "muy largo".
  - A filled honeypot gets 200 and nothing is saved.
  - A foreign `Origin` → 403.
  - `PUT /api/contacto` and `DELETE /contacto` → 404. That is acceptable, though 405 would be more precise.
- **File server:** none of these leak anything; each returns `404 … no source`:
  - `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e/servidor.mjs`
  - `/datos/mensajes.jsonl`, `/datos/clave-admin.txt`, `/..%2fdatos%2fclave-admin.txt`
  - `/img`, `/no-existe`
- **Admin protection:**
  - `GET /admin` without credentials → `401 Basic realm=…`.
  - 10 wrong passwords in a row → `401 ×6, then 429 ×4`.
- **Mobile at 375 px:**
  - The page has no horizontal scroll (`scrollWidth/clientWidth = 375/375`), and neither does the admin page.
  - Body and inputs use 16 px text.
- **Keyboard:**
  - The Tab order is: brand → Servicios → Visítanos → Contacto → Escríbenos → nombre → correo → mensaje → button.
  - Every stop shows `outline=solid 3px`, and the honeypot never gets focus.
- **Contrast:**
  - Looking at the screenshots (`desktop-top.png`, `mobile-top.png`), the white headline sits on the dark lower gradient and is clearly readable. The white-on-#c2410c button is about 5.2:1.
  - I did not measure pixels under the small "TALLER RUEDA LIBRE" label. By eye it is readable.
- **Without JavaScript:**
  - The good path lands on `/contacto | Gracias` and saves 1 message.
  - A server-side error (`a@b`) shows the "No pudimos enviar" page with the error message, and the form is prefilled with `A,a@b,hola sin javascript`.
  - An empty submit is stopped by the browser's native `required` check (`active=nombre`).
- **Damaged store:**
  - I appended a half-written line, then posted a message, and got `200 {"ok":true}`.
  - The new record sits on its own line (`file tail`), and admin shows `Hay 1 línea(s) dañada(s)…`.
- **Saved data under concurrency:** 12 simultaneous POSTs gave exactly the expected number of saved lines, with nothing lost or interleaved, because `appendFileSync` is synchronous.
- **Admin cost per request:**
  - With 8 lines: 33.8 ms for 1 request, 38.5 ms for 20 concurrent requests.
  - With 1008 lines: 47.0 ms and 84.2 ms.
  - With 4998 lines (the cap): 62.6 ms and 139.4 ms.
  - The home page stays at about 10 ms. The cost is bounded by the 5000-message cap.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | Bots can fill the inbox, and the owner has no practical way to find the real message among them. The honeypot and the per-IP limit only stop a naive bot sending from one IP. | `http.mjs seed 1000` then `http.mjs admin` → `1007 mensaje(s)… Página 1 de 21`, with no search, no filter and no bulk select. Deleting is one `Borrar` per message or `Borrar todos…`. At the cap: `http.mjs flood` → `200,200,503,503…`, and a real customer gets `503 "Ahora mismo no podemos recibir mensajes. Pasa por el taller"`. | After a spam wave from many IPs, the owner has to page through 21 or more pages, clicking Borrar 1000 times, or wipe everything, including the one real customer. Once 5000 bot messages pile up, real customers are turned away with no warning to the owner except the console and the admin page. | form / data |
| 2 | Bodies over 16 KB never receive the coded 413 or "Mensaje demasiado grande" page. The server calls `req.destroy()` and then tries to answer, so the connection is reset. | `http.mjs form`: `api 100KB fields -> FETCH-ERROR ECONNRESET`; `form 100KB fields -> FETCH-ERROR ECONNRESET` | Someone who pastes a long text with JavaScript off gets the browser's "connection was reset" page instead of the friendly page with a "Volver" link, and loses what they typed. | server |
| 3 | Malformed percent-encoding in the URL crashes path decoding with a 500. | `RAW /%E0%A4%A -> HTTP/1.1 500 Internal Server Error` (`decodeURIComponent` throws inside `estatico`) | A mistyped or truncated link shows "Algo salió mal" instead of "Página no encontrada", and every scanner hit writes a stack trace to the console log. | server |
| 4 | Both rate limits allow 6, not the 5 the summary claims. The code checks `n > max` before incrementing. | Login: `10 wrong passwords in a row -> 401,401,401,401,401,401,429,…` (6 tries). Contact: 5 saves from the browser, and the flood still got one more `200` before 429. | Low direct harm, one extra try. But the owner is told "5", and anyone tuning or auditing the limit is off by one. | false claim |
| 5 | Damaged lines count toward the 5000 cap and can never be removed from admin. Both `Borrar` and `Borrar todos` keep them. | After `corrupt` plus seeding, admin shows `4999 mensaje(s)`, `Hay 1 línea(s) dañada(s)` and `El buzón está lleno`. `borrar()` keeps any line `analizar()` rejects. | Each crash-damaged line permanently takes one slot. The owner is told the lines "siguen en datos/mensajes.jsonl" but has no way to clear them from the admin page, which is the only tool they were given. | data |
| 6 | Mobile navigation tap targets are shorter than 44 px. | `cdp.mjs`: `mobile tap targets <44px tall -> ["Rueda Libre 107x29","Servicios 68x38","Visítanos 70x38","Contacto 70x38"]` | On a phone, a thumb aimed at "Visítanos" can hit "Servicios". This is minor because the links are well spaced. | mobile |
| 7 | The no-JavaScript error page shows the error text, but it does not tie the error to the field and does not move focus. | `nojs server-error page -> … aria-invalid=0 \| autofocus/focus=BODY` | A screen-reader user with JS off lands at the top of a new page and has to find which field is wrong. Sighted users are fine. | accessibility |

Other observations, not counted as findings:

- The rule `.caja.admin { max-width: 52rem }` never applies, because `pagina()` puts `admin` on `<body>`, not on `main.caja`. The computed `maxWidth` is `704px`. This is cosmetic only.
- The rate limits are per `req.socket.remoteAddress`. If the site is ever deployed behind a reverse proxy, every visitor would share one bucket: 6 messages per 10 minutes for the whole site. I did not test this; it is a deployment risk.

## Builder's summary vs. what is there

- "No pude ejecutar nada… no doy el trabajo por verificado": **true.** Nothing was run, and `web-check.mjs` is not in the folder.
- Honeypot, 5000-message cap, 50 per page, single and full delete, the `POST /contacto` fallback with prefilled form, errors not counting toward the limit, and the leading-newline write with damaged lines skipped: **true, verified by running** (see "What held").
- "Un límite de 5 envíos por IP cada 10 minutos" and "bloquea tras 5 fallos por minuto": **false by one.** Both allow 6 (finding 4).
- "El foco va al estado o al primer campo con error": **true** (`#correo` after an error, `#estado` after success).

## Candidate lessons

Finding 1 is already covered by **WEB-2** ("A public form gets bots from day one"), so I did not write a new lesson for it. Findings 3, 5, 6 and 7 are one-off slips.

### Candidate: An error reply sent after you kill the connection never arrives

- **Mistake:** The code rejects an oversized request by destroying the socket and then writes a friendly error response that can no longer be delivered. The error path looks complete when you read it, but it never reaches anyone.
- **What it costs a person:** They get a browser-level "connection reset" page instead of the message and the way back that were written for them, and with JavaScript off they lose what they typed.
- **Detector question:** When this request is rejected, did I see the client actually receive the status code and body I wrote, or did I only read the line that sends it?
- **Habit:** For every reject branch (too big, wrong type, too many), trigger it from outside with `curl`/`fetch` and look at the status line the client gets.
- **Check:** `fetch` with a body over the limit returns a 413 with the intended body, not `ECONNRESET`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: A limit is only what it is at N and N+1

- **Mistake:** The builder states a limit ("5 tries") and implements check-then-increment with `>`, so the real limit is one more than stated, and nobody ever sends attempt N+1 to see what happens.
- **What it costs a person:** The owner trusts a number that is not true. For security limits, the stated strength is overstated. For abuse limits, one more message gets through per window than the owner was told.
- **Detector question:** If I send exactly N, then N+1, then N+2 requests, which response number gets blocked first?
- **Habit:** Every numeric limit you claim in a summary gets a loop test that prints the status code of each attempt.
- **Check:** `for i in 1..N+2` prints statuses, and the first block appears at attempt N+1 as stated.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
