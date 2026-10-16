# Findings: Fisio Andares (blind review)

How I started it: `node servidor.mjs`, as `LEEME.md` says. It printed the URL, the panel URL, and a generated password from `datos/clave-admin.txt`. For the heavier tests I started more copies of the same `servidor.mjs` from a launcher, using a temporary `DATA_DIR`, a different `PORT` and `ADMIN_PASSWORD`, so the per-IP limits would not affect each other. Browser checks ran in headless Chrome over the DevTools protocol at 375×800 (mobile emulation). The probe scripts are in `../ritual-review-BA7GY3/` and the screenshots in `../ritual-review-BA7GY3/shots/`. The build's own `node pruebas.mjs` passes 47/47.

Overall this is a careful build. Most of the guide's checks held:
- The server validates the data, not only the browser.
- Path traversal returns 404.
- HTML in a request shows as text.
- The JavaScript-off form works.
- Double clicks are de-duplicated.
- The login locks after 5 tries.
- Writes are queued and atomic.
- A damaged store is set aside and the next request is still saved.

The findings below are what did not hold.

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A corrected resubmission is silently thrown away and reported as success. The de-dup rule (same phone, treatment, day and hour within 2 minutes) overrides the new email and comment. | `formulario.mjs`: POST with `correo: corregido-MAL@…` → 201. Same phone/slot with `correo: corregido-bien@…` and a comment "perdón, el correo bueno es este" → **201**. Then `lista.mjs` shows only one record, with `corregido-MAL@ejemplo.com` and an empty comment. | A patient notices a typo in their email and sends the form again. The page says "¡Listo!", but the clinic only has the wrong email and never gets the note. The confirmation email bounces and the patient waits for a reply that never comes. | data |
| 2 | The clinic's page downloads and renders **every** request at once, with no paging. Every search keystroke rebuilds the whole list. | `panel-grande.mjs` (Chrome, 375 px): n=100 → cards visible in 68 ms. n=5000 → 1503 ms, keystroke 290 ms, clearing search 1175 ms. n=20000 → **5610 ms** to load, **3258 ms** per keystroke, 5262 ms to clear, page 8,236,045 px tall. Server side (`servidor-pruebas.mjs`): GET /api/admin/citas is 6.7 MB at 20000 records, and each POST rewrites the whole 7.2 MB file (10 parallel POSTs: 27 ms at 0 records → 174 ms at 20000). | After a year of requests, or one bot wave, the physiotherapist opens the panel on a phone, waits seconds for it to load, and the search box freezes on every letter. The warning at 1000 records says to delete old ones, but only cancelled or confirmed ones can be deleted in bulk (see #3). | server |
| 3 | Spam that gets past the honeypot can't be removed in bulk: bulk delete only exists for `cancelada` and `confirmada`. Each bot request must be cancelled one by one first. | `servidor-pruebas.mjs`: 40 bot-looking requests from one IP → `201x30 429x10` (30 saved). `DELETE /api/admin/citas?estado=pendiente` → `400 {"error":"Estado no válido."}`. | After a bot wave, the owner taps "Cancelar" on hundreds of cards, each a full re-render (see #2), before "Eliminar todas las canceladas" helps. Meanwhile real patients are buried among the bots and nobody calls them. | form |
| 4 | Per-IP limits use the socket address. Behind a reverse proxy, without `TRUST_PROXY=1`, every visitor shares one IP. 30 form posts per 10 minutes, or 5 wrong passwords per minute, from anyone then block **everyone**, the owner included. `TRUST_PROXY` only appears in a code comment, not in `LEEME.md`. | 31st valid request from one IP → 429 "Has enviado varias solicitudes seguidas…". After 5 wrong passwords, the **right** password → `429 Retry-After: 60` "Demasiados intentos…". `LEEME.md` lists PORT, HOST, ADMIN_PASSWORD and DATA_DIR, but not TRUST_PROXY. | Once hosted behind nginx or Cloudflare, 30 bot posts tell every real patient for 10 minutes that they "sent too many requests". Anyone who tries 5 passwords keeps the physiotherapist out of their own panel, minute after minute. | security |
| 5 | In the panel, when the owner taps "Confirmar" at the bottom of a long card (long email or comment), the "Confirmada" badge and the announcement end up above the screen. The only visible change is that the buttons rearrange and the left border turns green. | `navegador.mjs` after clicking Confirmar: `anuncioTop: -313`, the focused card's `top: -128`, viewport 800. Screenshot `shots/07-panel-confirmar-viewport.png` shows only the card body and "Cancelar / Volver a pendiente / Eliminar". | The owner isn't sure the tap worked. They may tap again (now "Cancelar" sits where "Confirmar" was) and cancel a patient they meant to confirm. | accessibility |
| 6 | Some tap targets are under 44 px tall at 375 px: the header menu links (39 px) and the big contact phone link (34 px). | `navegador.mjs` SMALL TAP TARGETS: `["A","Tratamientos",100,39]`, `["A","Pedir cita",72,39]`, `["A","Contacto",70,39]`, `["A","33 1234 5678",161,34]`. | Minor: on a phone, the nav links sit close together and can be mis-tapped. | mobile |
| 7 | With JavaScript on, server-side field errors (for example a phone with letters, which the browser lets through) appear only in the summary box. The field itself is not marked (`aria-invalid` stays null, no red border). | `navegador.mjs` PHONE LETTERS: summary "Escribe un teléfono válido…" gets focus; `telAriaInvalid: null`. Screenshot `shots/02-telefono-letras-viewport.png`. | Sighted users see the summary and the field together on screen, so it's fine for them. A screen-reader user hears the error but, tabbing to the phone field, gets no cue that this is the field to fix. | accessibility |

What I tried that held, with evidence:
- **Images:** all four load (`naturalWidth` > 0 in the full-page screenshot) and have `width`/`height` and useful alt text.
- **No horizontal scroll at 375 px:** `scrollWidth 375 = innerWidth`, on both the public page and the panel with an 80-character name, a long email and a 300-character comment.
- **Empty submit:** focus goes to "Nombre" with "Completa este campo".
- **Email without "@"** gets a native message. **Yesterday** gets "debe ser igual o posterior a 17/10/2026".
- **Sunday:** the help text turns red and submitting is blocked. **20:00** is not offered, and the server rejects it.
- **Server-side validation:** empty, past, today, Saturday, Sunday, 20:00, 17:30, Feb 30, 200 days ahead and a JSON array all get 400. A 100 KB body gets 413.
- **Other methods:** GET or PUT on /api/citas → 404. DELETE / → 405.
- **File server:** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cdatos%5cclave-admin.txt`, `/datos/solicitudes.json`, `/datos/` and a bad encoding all return the HTML 404 page.
- **Admin API without the password:** PATCH or DELETE without a cookie or with a forged cookie → 401.
- **Two quick clicks** → 1 fetch, and 1 record saved in parallel.
- **HTML in the name and comment:** shown as text in the panel (0 `<b>`, 0 `<img>`, no dialog).
- **JavaScript off:** the good path goes to "¡Recibimos tu solicitud!". A Sunday gets a readable error page with a "back" hint.
- **Keyboard:** every stop shows a 3 px amber outline. After a successful submit, focus is on the status message and the next Tab goes to "Nombre".
- **Races:** 20 concurrent posts plus a status change → 21 on disk, and the change is kept.
- **Crash:** a hard kill during writes leaves a valid JSON file.
- **Damaged file:** next post → 201, the panel shows a warning, and the damaged copy is kept.
- **Contrast:** the hero button is 8.79:1 (the CSS comment claims > 7:1, which is true). Green on white is 5.47:1. Gray help text on mint is 6.91:1.
- **The build's claims:** everything in `LEEME.md` and the code comments that I checked is true, apart from the TRUST_PROXY omission in #4.

Side effects of the review: running `node servidor.mjs` as documented created `datos/` in this folder, with `clave-admin.txt` and 5 test requests (one contains `<img onerror>`). The server I started on port 3000 **is still running**: the task stop ended its shell, but `GET :3000/` still answers 200, and my shell can't kill it. Stop it by hand. Port 3101 is down.

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so I used five parts: the mistake, why it happens, the rule, the detector question, and the example.

**Finding 1** is covered by **49** (a general rule must not silently beat the specific ones): the general de-dup rule overrides the person's specific, newer submission and still reports success. No new lesson.

**Finding 2** is covered by **46** (what runs on every request can't grow with the content). No new lesson.

**Finding 3** is covered by **WEB-2** (a public form gets bots from day one). No new lesson.

**Finding 5** is covered by **32** (something that works but can't be seen gets reported as broken). No new lesson.

**Finding 4** is a new candidate:

- **Title:** A per-IP limit behind a proxy is a limit on everyone
- **The mistake:** Rate limits and login lockouts are keyed by `req.socket.remoteAddress`. Once the site runs behind a reverse proxy, every visitor has the proxy's address. The limit meant for one abuser then blocks every patient, and the lockout meant for one attacker locks out the owner.
- **Why it happens:** On localhost every test client really is a different socket, or the only one, so the limit looks right. The proxy case lives in a comment or an env flag that the README never mentions, so whoever deploys never sets it.
- **The rule:** A limit keyed by client IP must state, in the run instructions, which address it uses and how to set it behind a proxy. A lockout must never stop the right password from someone the attacker can't impersonate (for example, lock per account plus IP, or add a delay instead of a hard block).
- **Detector question:** If every request arrived from the same address, who would this limit stop, and would the owner still get in?
- **Example:** Fisio Andares: the 31st post from one IP → 429 for everyone. After 5 wrong passwords, the right password → 429 for 60 s. TRUST_PROXY is missing from LEEME.md.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

Findings 6 and 7 are one-off slips, so they get no lessons.
