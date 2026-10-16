# Findings: Fisio Andares build

Reviewer: blind review, 2026-10-15. The build has no README. The only start instruction in its files is `servidor.mjs:1` ("Uso: node servidor.mjs"). On start, the server prints the URL and the admin password.

All runs used scratch copies of the folder (`%TEMP%/rv-p83k/...`), so the build's own `datos/` was never written to. Browser checks used headless Chrome driven over CDP from Node (375×740 mobile emulation and 1280×800). The original folder is unchanged except for this file and `verdicts.json`.

## What held (tried and did not break)

- **Load and images:** page loads at 375 and 1280 px. All 4 images load (`naturalWidth > 0`), each has alt text and a declared `width`/`height`. No horizontal scroll (`scrollWidth 375 == clientWidth 375`).
- **Form with JS, error paths:**
  - Empty submit: a summary box appears above the form, an error shows under each field, focus goes to `#nombre`, and both are in view.
  - Phone `abc 1234 567`, email without `@`, Sunday, past date: each focuses the bad field with its message next to it. Typed values are kept.
  - 20:00 cannot be chosen: the hour list only offers 09:00–17:00.
- **Double click on submit:** the browser sent 1 request. Two identical simultaneous POSTs via API returned `201,201`, but only 1 record was saved.
- **Server-side validation (curl/fetch, no page):** `{}`, phone with letters, email without `@`, past date, Sunday, 20:00, 17:30, array instead of string and broken JSON all return 400 with per-field errors. A 100 KB body returns 413.
- **HTML in name and comment:** `<b>hola</b><img src=x onerror="alert(1)">` is shown as literal text on the clinic's page. There were 0 injected `img`/`b` elements and 0 dialogs.
- **File server:**
  - `/../servidor.mjs` and `/%2e%2e/datos/clave.txt` return 404.
  - `/..%2f..%2fservidor.mjs` and `/..%5cservidor.mjs` return 403.
  - `/datos/solicitudes.json`, `/datos/` and `/no-existe` return a 404 page; a bad `%` encoding returns 400; `DELETE /` returns 405.
- **Clinic page auth:** PATCH/DELETE without a session, or with a forged cookie, return 401. Wrong passwords: `401,401,401,401,401,429,429…`.
- **Clinic page at 375 px** with an 80-character name, a 112-character email and a 480-character comment with no spaces: no horizontal scroll, and the widest element ends at 359 px.
- **Keyboard:** every Tab stop shows a 3 px amber outline. Enter submits the form. After success, focus is on the visible success message and the next Tab goes to `#nombre`. On the clinic page, Enter on "Confirmar" keeps focus on that button (`aria-pressed=true`), and both the card label and the notice change in view.
- **Without JavaScript:** a valid submit redirects 303 to `/gracias.html`. An invalid one shows a page that lists the errors.
- **Concurrency and crashes:**
  - 40 new requests and 10 status changes sent at once: 41/41 saved, and the last status written wins.
  - The server was SIGKILLed mid-burst of 300 POSTs. All 40 requests that got a 201 were in a parseable file, no `.tmp` was left, and the next request after restart saved.
  - A truncated or empty JSON store is moved aside with a console warning, and the next request saves.
- **Builder's own `prueba.mjs`** (run against a copy on port 3489 via `BASE`): 23/23 OK.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A store that is valid JSON but holds a bad record takes down every later submission | Wrote `[null]` to `datos/solicitudes.json` and started the server. First visitor POST: `500 {"mensaje":"Algo salió mal en el servidor…"}`; second visitor: `500`. Console only: `TypeError: Cannot read properties of null (reading 'estado')`. `cargar()` only checks `Array.isArray`. | After one bad hand-edit or partial restore, every patient sees "Algo salió mal" and no request is saved until someone reads the server console. The owner sees nothing in her panel. | data |
| 2 | A bot flood closes the form to real patients, and the owner has no way to bulk-clean | 520 POSTs from 520 loopback addresses (honeypot empty): `{"201":501,"503":19}`. Then a real patient: `503 "Ahora mismo no podemos recibir más solicitudes en línea. Por favor llámanos."` `DELETE /api/admin/citas` returns 404 (no bulk route). The panel deletes one at a time, each behind a `confirm()`. The 500 cap is checked outside the write queue (501 saved). | One night of bots and nobody can book online the next morning. The owner must click Eliminar and OK 500 times to reopen the form. | security |
| 3 | The server-wide CSP silently blocks the error page's own "Volver al formulario" handler, so everything typed is lost | With `app.js` blocked (JS on), submitting a Sunday showed the error page. Clicking "Volver" logged: `Executing inline event handler violates the following Content Security Policy directive 'default-src 'self''`. It landed on `/#cita` with `nombre: ""` and `comentario: ""`. The same empty form appears with JS fully off. | A patient on a flaky connection (app.js didn't load) who picked a Sunday reads the error, taps Volver, and finds name, phone, email and comment all blank. Many will give up. | form |
| 4 | The submission limit is per socket address, so patients who share an address block each other | After 5 accepted requests from 127.0.0.1, 3 different new patients sent at once got `201,429,429`. `ipDe()` uses `req.socket.remoteAddress`. Behind any reverse proxy or host load balancer, every patient has the proxy's address. Duplicate double-clicks also consume the quota. | Once deployed behind a typical host, the 6th patient in any 10-minute window (clinic-wide) gets "Has enviado muchas solicitudes seguidas". The same happens on a shared office or family Wi-Fi. | server |
| 5 | Shipped test scripts wipe the clinic's real requests | A copy with 3 saved requests, then `node prueba-danado.mjs`: "Todo bien", and afterwards `solicitudes.json = []`. `prueba-carga.mjs` ends with the same `writeFile(..., '[]')`. The only warning is a code comment. | The owner (or a helper) runs "the test" on the live machine, as the builder told her to test, and every pending appointment request is gone with no backup. | data |
| 6 | The address, phone, prices and durations are invented but shown as facts, with no placeholder marker | `index.html`: "Av. Andares 1234, Col. Puerta de Hierro, Zapopan", `tel:+523312345678`, "$650 MXN / 50 minutos" etc. A grep for `ejemplo\|placeholder\|reemplaza\|cambia` finds nothing in the page files. The request gave none of these. | If published as-is, patients call a number that isn't the clinic's, go to a made-up address, and expect prices she never set. | false claim |
| 7 | White text over the hero image is low contrast | Composited the hero (SVG at opacity .55 over `#14503f`) in the browser and sampled behind the text. At 375 px, `h1` worst 2.47 (mean 3.26) and 16 px `p` worst 2.47 (mean 3.30). At 1280 px, `p` (20 px, normal weight) worst 3.02 (mean 3.46). The 16 px paragraph needs 4.5:1; text-shadow does not count. | On a phone in sunlight, or for someone with low vision, the line saying what the clinic does is hard to read. | accessibility |
| 8 | The clinic's page re-sends and re-draws every request ever received, on every load and every click | 5,000 saved: panel draws in 918 ms; filter back + one "Confirmar" takes 1,744 ms; list is 1.6 MB. 50,000 saved: list is 16.6 MB (server sends it in ~110 ms); panel draws in 9,318 ms; one "Confirmar" takes ~9 s more (18,416 ms with a filter change). Each POST rewrites the whole file: 13 ms at 5k, 61 ms at 50k. No paging and no archive. | After a few years (or one flood), the owner waits seconds on her phone for every confirm, and loads megabytes on mobile data. | data |
| 9 | Login lockout is per address only, and any password is accepted | From 127.0.0.1: `401×5` then `429`, even for the right password (`429 "Espera 60 segundos"`). From `::1` on the same machine, the next wrong password got 401 (not 429), so a new counter. Server started with `CLAVE_ADMIN=1`: login with `"1"` returned 200, with no length check. The password is printed to stdout on every start. | The generated 12-hex password is strong, but if she sets her own short one, an attacker with many addresses (an IPv6 /64 is 2^64 of them) is unlimited. Anyone who sees the host's logs has the password. | security |
| 10 | No-JS errors for oversize or untyped bodies come back as raw JSON | Form-encoded POST without `Accept: application/json` and a 100 KB comment: `413 {"mensaje":"Cuerpo demasiado grande"}`. A body with no Content-Type: `400 {"mensaje":"Datos no válidos"}`. | Rare (maxlength stops it in normal use). A no-JS user who hits it sees a JSON string instead of a page. One-off slip. | form |
| 11 | No upper bound on the date | `fecha: 2099-01-05` (a Monday): `201 {"ok":true}`. | A mistyped year (e.g. 2062) is accepted, and the owner gets a request she can't place. One-off slip. | server |
| 12 | Wrong method on the API answers 404, not 405 | `PUT /api/citas` and `GET /api/citas`: `404 {"mensaje":"No encontrado."}`. | Nobody affected in practice. One-off slip. | server |

## Candidate lessons

The `lessons/TEMPLATE.md` referenced by the guide is not in this folder. Each lesson below uses five parts: what happened, why it happens, detector question, the rule, and how to check it.

Findings already covered by an existing lesson:
- #1 → **WEB-1** (a damaged store must not take the next record down).
- #2 → **WEB-2** (public form gets bots from day one).
- #3 → **49** (a general rule must not silently beat the specific ones: a site-wide CSP beats the page's inline handler). Also **41**: the builder checked the no-JS path with `fetch` (status 303/400), never as the page a reader clicks through.
- #8 → **46** (what runs on every request can't grow with the content).
- #9 → **WEB-5**: the attempt limit exists. The per-address keying and the weak-password acceptance are a refinement of WEB-5, not a new lesson.
- #10, #11, #12: one-off slips, no lesson.

### Candidate: Rate limits keyed on the socket address throttle everyone behind one address
- **What happened:** The appointment form allowed 5 accepted requests per `req.socket.remoteAddress` per 10 minutes. On loopback, the 6th distinct patient got 429. Behind the reverse proxy that most hosts put in front of Node, every patient shares one address, so the whole clinic gets 5 bookings per 10 minutes.
- **Why it happens:** The limit is written and tested on a laptop, where each test client really has its own address. Nobody asks what address the server sees once deployed.
- **Detector question:** Behind a proxy, or for ten people on the same Wi-Fi, what address does this limit see, and what happens to the 6th honest person?
- **Rule:** Key a public-form limit on something per person (phone or email plus slot), or apply it only to rejected or suspicious submissions. If it must be per address, document the proxy header it trusts and make the 429 message offer the phone number.
- **How to check:** Send N+1 valid, different requests from one address and confirm the (N+1)th real person is still served, or gets a message with a way forward.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: Test scripts that reset the data store must not run against real data
- **What happened:** `prueba-danado.mjs` and `prueba-carga.mjs` sit next to `servidor.mjs` and write `[]` to `datos/solicitudes.json` when they finish. Run on a copy holding 3 requests, they printed "Todo bien" and left 0. The only warning is a source comment.
- **Why it happens:** The builder writes tests that use the app's own data folder, because that is the simplest setup, then ships them as "how to test".
- **Detector question:** If the owner runs every script in this folder on the live machine tomorrow, is any real record gone afterwards?
- **Rule:** Tests run against a temporary data directory (passed by env or argument) and never touch the real store. Otherwise they refuse to run when the store is non-empty, or back it up and restore it.
- **How to check:** Put one real-looking record in the store, run each shipped script, and diff the store afterwards.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: Invented business facts must be marked as placeholders
- **What happened:** The request gave no address, phone, prices or session lengths. The page shows a specific street address, a dialable `tel:` link, "$650 MXN" and "50 minutos", all invented, with nothing in the page or the code marking them as placeholders.
- **Why it happens:** A finished-looking page needs those fields. Filling them is easy, and flagging them feels like clutter.
- **Detector question:** Which facts on this page did the person not give me, and would they notice each one before publishing?
- **Rule:** Every invented business fact is visibly marked as an example (on the page or in one config block with a TODO), and the hand-off message lists each one.
- **How to check:** List every phone, address, price, duration and name on the page, and trace each to the request. Anything without a source must carry a placeholder marker.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate: Measure text-over-image contrast on the composited pixels
- **What happened:** The hero puts white text over an illustration at opacity .55 on dark green and relies on `text-shadow`. Measured on the composited pixels behind the text, the 16 px paragraph is 2.47–3.30:1, where 4.5:1 is needed.
- **Why it happens:** Contrast is judged from the CSS colors (white on `#14503f` looks fine at about 8:1), not from what is actually behind the glyphs once the image shows through.
- **Detector question:** What are the lightest pixels behind each line of overlay text, at the narrowest and widest layout?
- **Rule:** For text over images, guarantee contrast with a solid or gradient scrim behind the text and measure the worst case. Shadows don't count.
- **How to check:** In the browser, draw the background as composited onto a canvas, sample inside each text element's client rects, and report the minimum ratio against the text color.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
