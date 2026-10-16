# Findings: Fisio Andares build

Reviewer: blind review, 2026-10-16. The build was started as its README says (`node servidor.mjs`, port 3000). For isolated runs, a separate copy was started with `PORT`/`DATA_DIR` set from inside a Node launcher. Browser checks ran in headless Chrome, driven over the DevTools protocol from Node scripts kept outside the build folder (`%TEMP%\revisor-clinic\`). Nothing in the build was changed. Side effect: the README start created `datos/` (with `clave-admin.txt`) in the build folder.

The build's own `node pruebas.mjs` passed 44/44.

## Summary

This is a careful build. Every check below held:

- The form handles all of its error paths in the browser, and the server re-validates each one.
- A double click saves one request.
- Injected HTML shows as plain text and never runs.
- Path traversal requests all return 404.
- Login is rate-limited.
- The page and the panel fit 375 px with no horizontal scroll.
- Focus is visible on every control and lands on the result after submitting.
- The form works without JavaScript.
- Writes are atomic.

The real problems are in what happens as data grows or arrives in an unusual shape, and in how the limits are keyed.

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A store that parses but holds one bad entry takes every new request down. Only an unparseable file is handled. | `datos.mjs` wrote `[null]` to `solicitudes.json` and restarted. Visitor `POST /api/citas` → **500** "No pudimos guardar tu solicitud…". Admin `GET /api/admin/citas` → **500** "Algo salió mal". Server log: `TypeError: Cannot read properties of null (reading 'tratamiento')`. By contrast, an empty file and a truncated file → 201 plus a visible warning in the panel. | After a hand edit or a partial restore leaves one bad item, every patient who books online gets "llámanos". The owner's panel shows only a generic error. Nobody sees why except in the server console, and requests are lost until someone opens the JSON. | data |
| 2 | Hard cap of 5,000 stored requests. Past it, the public form refuses every booking, and the owner is never told. | `datos.mjs`, with 4,990 seeded records plus 10 real ones: request #5001 → **503** `{"error":"Por ahora no podemos recibir más solicitudes en línea. Llámanos por teléfono, por favor."}`. Confirmed and cancelled requests count toward the cap and are never archived. The panel only deletes one at a time, each behind a `confirm()`. | About a year in, at roughly 13 requests a day (or within hours of a bot flood that dodges the honeypot), every new patient sees "we can't take more requests". Nothing in the panel says so, and freeing space means thousands of single deletions. | data |
| 3 | No way to triage a flood: no search and no bulk delete. The only filter is by status. | `admin.js` UI exercised in `navegador.mjs`. The filters are Todas/Pendientes/Confirmadas/Canceladas, and "Eliminar" works per card with `confirm()`. With 5,000 cards the panel takes 1.9 s to render (`volumen.mjs`). | After 1,000 fake requests that skip the hidden field, the owner scrolls through 1,000 "Pendiente" cards to find the one real patient, then deletes the rest one by one. | form |
| 4 | Submission and login limits are keyed only on the socket IP, shared by everyone behind one address. | `datos.mjs` step 1: eight *different* people (different names and phones) from 127.0.0.1 → `201 201 201 201 201 429 429 429`. The code uses `req.socket.remoteAddress` and ignores proxy headers. | Behind a reverse proxy or shared hosting, the whole site takes 5 bookings per 10 minutes, and the 6th patient is told "has enviado varias solicitudes seguidas". The same applies to a family or office on one Wi-Fi. Someone typing 5 wrong passwords a minute from that same address also keeps the owner out of her panel. | server |
| 5 | The hero "Pedir cita" button barely stands out from the photo behind it. | Computed: button fill `#0f766e` against hero background `#134e4a` = **1.73:1** (non-text contrast needs 3:1). Visible in `desk-top.png` and `m375-top.png`. The button's own text is fine at 5.47:1. | A person with low vision sees floating "Pedir cita" text and may not recognise it as the main button. | accessibility |
| 6 | The server silently truncates over-long fields instead of rejecting them. | JSON `POST` with a 15,000-char `nombre` → **201** `{"ok":true}`, stored as 80 chars. `correo` is cut to 120 chars before validation, so an over-long address can become a different "valid" one (e.g. losing `.mx`). The browser's `maxlength` prevents this in the UI. | Rare, API-only. The clinic could write to the wrong address with no error anywhere. One-off slip. | server |

## Checks that held (with evidence)

- **Load and images:** `GET /` → 200. All 4 images loaded (`naturalWidth>0`), each with a descriptive Spanish `alt` and `width`/`height` attributes (1600×900, 800×600).
- **Empty submit:** native validation. Focus goes to `nombre`, 6 fields flagged, 0 stored.
- **Phone with letters (`33 12ab 5678`):** the browser lets it through. The server returns 400, and the message "Revisa estos datos: Escribe un teléfono válido…" appears above the form, takes focus, and is in the viewport. All values are kept (`m375-phone-error.png`).
- **Email without @:** native message, focus on `correo`.
- **Sunday:** the help text turns red as soon as the date is picked ("Atendemos de lunes a viernes…"), submit is blocked, and focus goes to `fecha`.
- **Past date:** `min=2026-10-17` blocks it ("El valor debe ser igual o posterior a 17/10/2026").
- **20:00:** not offered. Setting it leaves `value=""`.
- **Server-side validation (no page):** empty → 400 with 6 errors. Sunday, past date, today, 20:00, phone with letters, and email without @ → each 400 with the correct message. 100 KB fields → 413. `text/plain` → 400 page. `PUT`/`GET /api/citas` → 404. `POST /` → 405.
- **Double click:** two real mouse clicks → **1** saved.
- **HTML injection:** `<b>hola</b><img src=x onerror="alert(1)">` in the name and comment shows literally in the success message and in the panel. The card has 0 `<img>` and 0 `<b>`, and no dialog fired.
- **File server:** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e/servidor.mjs`, `/..%5cdatos%5cclave-admin.txt`, `/datos/`, `/datos/solicitudes.json`, `/no-existe` and `/img/` all → 404 HTML page.
- **Admin without a password:** `GET`/`PATCH`/`DELETE` → 401.
- **Brute force:** 8 wrong passwords in a row → `401 401 401 401 429(retry 60) ×4`.
- **Mobile 375 px:** `scrollWidth 375 vs 375` on the public page and on the panel, including with an 77-character unbroken name, a 100+ character email and a 300-character comment (`m375-admin-long.png`, everything wraps).
- **Keyboard:** every Tab stop shows an amber outline. The honeypot is skipped. Tab → submit, Enter → focus on the success box, next Tab → `nombre`. In the panel, Enter on "Confirmar" → focus on the same card, now showing "Confirmada".
- **Without JavaScript (`app.js` blocked):**
  - An invalid submit lands on a readable error page listing both errors, and Back returns the form with every value kept.
  - A valid submit lands on `/cita-enviada.html`, and 1 is saved.
- **Concurrency:** 40 simultaneous POSTs from 40 addresses plus 4 PATCHes → 41 on disk (expected 41), and the status change persisted.
- **Kill -9 during a burst:** the file is still valid. After a restart, the next request → 201.
- **Volume:** with 4,990 records, the list API takes 27 ms (1.9 MB) and a POST takes 34 ms (rewrites a 2 MB file). The browser panel takes 0.9 s at 2,500 and 1.9 s at 5,000 (linear), capped by finding 2.
- **README claims:** start command, password file and console print, data path and `HOST=0.0.0.0` are all true. The `app.js` comment "Sin JavaScript el formulario también funciona" is true. The `admin.js` comment "nunca como HTML" is true. The `servidor.mjs` comment "para que la siguiente solicitud no se pierda" is **only partly true** (see finding 1).

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so each lesson below uses five parts: title, what happened, why it happens, the rule, and a detector question.

### Finding 1: already covered by **WEB-1** (A damaged store must not take the next record down with it)

No new lesson. Suggested addition to WEB-1's examples: "damaged" includes a file that parses but holds an entry of the wrong shape (`[null]`), not only a file that fails `JSON.parse`.

### Finding 2: new

- **Title:** A safety cap must not silently close the front door
- **What happened:** To keep the store small, the server refuses new public requests once 5,000 are stored. Confirmed and cancelled ones count too, nothing archives them, and the owner gets no warning. Request #5001 → 503 "no podemos recibir más solicitudes".
- **Why it happens:** The cap is written as a guard against abuse, and the builder tests that it triggers, not who meets it first or who would know.
- **The rule:** Every limit needs an owner-facing signal before it is hit, and an exit (archive, bulk clear). When it is hit, the public path should degrade in a way the owner sees first.
- **Detector question:** When this limit is reached a year from now, who hits it first, and how does the owner find out before a customer does?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Finding 3: covered by **WEB-2** (A public form gets bots from day one)

No new lesson. The build added a honeypot and a per-IP limit, but no way to find the real request among the fake ones or delete the fakes in bulk.

### Finding 4: new

- **Title:** A per-IP limit is a per-everyone limit behind a shared address
- **What happened:** The submit limit (5 per 10 minutes) and the login lockout are keyed on `req.socket.remoteAddress`. Eight different people from one address got `201×5, 429×3`. Behind a reverse proxy, the whole site shares one address.
- **Why it happens:** Rate limits are tested from one machine, where "one IP" and "one person" look the same.
- **The rule:** Decide what the limit is really keyed on (person, session, address) and test it with two different people on the same address. Behind a proxy, use the trusted forwarded address, and never let a lockout aimed at an attacker also lock out the owner.
- **Detector question:** If two real people share this address (office, home Wi-Fi, a proxy), does the second one get blocked for what the first one did?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Finding 5: new (small, but a recurring pattern)

- **Title:** The main button must stand out from what it sits on
- **What happened:** Contrast was checked for the button's text (5.47:1), but not for the button against the hero behind it (1.73:1).
- **Why it happens:** Contrast checks are run on text and background pairs, and the edge of the control is forgotten when its fill matches the photo's palette.
- **The rule:** Check non-text contrast (≥3:1) for the main call-to-action against the surface it actually sits on, at every breakpoint.
- **Detector question:** If the text inside the main button were blurred out, could you still find the button on the photo?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

Finding 6 is a one-off slip, so no lesson.
