# Findings: Fisio Andares (blind review)

Build started as its README says: `node servidor.mjs`. It started on :3000 and printed a generated password. Extra instances were started on :3101 with temp `DATOS_DIR` and `ADMIN_PASSWORD` (`_revision/r2.mjs`). The probe scripts are in `_revision/` (r1 = HTTP probes, r2 = panel/concurrency/crash/load, r3 = contrast + no-JS page). The build's files were not changed. Note: running r1 against :3000 created `datos/clave.txt` and `datos/citas.jsonl`, which hold the review's test requests.

There was no browser here. Mobile (375 px), keyboard/focus, and what is visible on screen were **not checked**. The panel's `admin.js` was run in a minimal DOM stub (Node `vm`) against the live API. That is not a real browser.

## What held (tried, no defect)

- The page and all 4 images load (200, `image/svg+xml`). Each `<img>` has descriptive alt text plus `width`/`height`.
- Server-side validation works without the page. Empty body: 400 with every field error. Phone `abc-defg-hij`, email without `@`, 2026-10-05 (past), a Sunday, and 20:00 all get 400 with a specific message. Body over 10 KB: 413. `text/plain`: 415. PUT/GET `/api/citas`: 404. DELETE `/`: 405.
- Double submit: two identical simultaneous POSTs both returned 201, but only 1 was saved (`saved = 1`).
- HTML in name/comment is stored raw. The panel builds it with `textContent` (stub showed `innerHTML` used 0 times; the heading text is the literal `<b>hola</b><img …>`). The CSP `script-src 'self'` would also block inline `onerror`.
- File server: `/../servidor.mjs` 404, `/..%2f..%2fservidor.mjs` 403, `/..%5cdatos%5cclave.txt` 403, `/datos/citas.jsonl` 404, `/privado/admin.html` 404, unknown path 404 page with a link home.
- Admin API without a session: list, PATCH, and bulk delete all return 401. A forged `sid` also gets 401.
- Login: wrong passwords 1–4 get 401. The 5th and later get 429 "Espera 5 minutos".
- Concurrency: 40 simultaneous new requests plus 10 simultaneous PATCHes all succeeded. After a restart: total 50, 10 confirmed, 40 pending. Nothing was lost.
- Crash mid-write (truncated last line, then SIGKILL): on restart the server logs `AVISO: 1 línea(s) dañada(s)`. The next request got 201 and is visible.
- Load: 100,000 records (42 MB). Startup 237 ms, default panel view 6 ms, empty filter (full scan) 38 ms, 50 parallel full scans 175 ms, POST 12 ms.
- Contrast: white on green buttons 6.02:1, error red 6.54:1 / 5.90:1, muted text 6.54:1. On mobile the hero text sits below the photo. On desktop it sits on a 93% white box.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A bot flood across many IPs fills the global cap (100/hour), then **every** real patient is refused, and the message blames them | r2 §2: 110 bot POSTs from 127.0.0.2–12 → `bots saved 99 refused 11`. A new patient from fresh IP 127.0.0.50 → `429 {"error":"Enviaste muchas solicitudes seguidas. Llámanos…"}` | A patient sending their first and only request is told "you sent too many requests in a row" and can't book for up to an hour. | security |
| 2 | The owner can't find the one real request among bot entries. The only cleanup is "delete all of this status", and it took the real one too | r2 §2: `pendientes count 100`, `real one on first page of 50? false`, `?q=Real` ignored (returns 50). Bulk delete → `eliminadas: 100`, `real patient still there? false` | The owner either reads 100 entries one by one or deletes everything, including the real patient, who never gets a call. | data |
| 3 | One stored record with a missing field makes the panel show **zero** requests | r2 §4c: one appended line `{"id":…,"creada":…,"nombre":"Sin telefono"}` → panel `articulos: 0`, `aviso: "No se pudieron cargar las solicitudes: Cannot read properties of undefined (reading 'split')"`, while the filters say `Todas (52)` | After a hand edit of `citas.jsonl` (the README encourages handling that file) or an old record, the owner sees no requests at all, only a JS error message. | data |
| 4 | A store failure is visible only in the server console. The owner is never told | r2 §4d/e: read-only `citas.jsonl` → visitor gets `500 "No pudimos guardar tu solicitud. Por favor llámanos…"`. The panel API returns only `["citas","hayMas","cuentas"]`, with no warning. The `AVISO` about damaged lines also goes only to the console. | Every visitor is told to phone, and the owner keeps seeing an unchanged panel and doesn't know bookings are failing. | data |
| 5 | Login lockout is per IP and also blocks the correct password, so whoever shares the IP can lock the owner out | r2 §1e: 5 wrong passwords from 127.0.0.1, then the correct password → `429` | The README says to serve it "detrás de HTTPS" (normally a reverse proxy, so every client has the same IP). Then anyone can lock the owner out every 5 minutes. The same applies to the 10-per-IP patient limit: 10 bookings from anyone in 10 minutes block everyone. | security |
| 6 | Without JS, a rejected form sends the person to a page whose only link reloads an **empty** form | r3: no-JS POST with a Sunday → `400 … <li>Atendemos de lunes a viernes…</li> … <a href="/#cita">Volver al formulario y corregir</a>`. `dia.min` is set only by app.js, so without JS the browser also accepts past dates | The person types everything again (name, phone, email, comment). Many will give up. | form |
| 7 | The README promises times up to 17:30. The server rejects 17:30 | r1: POST `hora: "17:30"` → `400 {"hora":"Elige una hora entre las 9:00 y las 17:00."}`. README step 3: "lunes a viernes, 9:00 a 17:30". Page: "de 9:00 a 18:00". Label: "9:00 a 17:00" | The owner testing as instructed gets an error, and three different hour ranges are stated. | false claim |
| 8 | `GET /admin/login` is a dead end | r1: `GET /admin/login -> 405 "No permitido … Método no permitido."` (no link) | After one wrong password the address bar shows `/admin/login`. Pressing Enter there or opening it from history shows "Método no permitido" with no way back. | server |
| 9 | Over-long fields sent directly to the API are silently truncated instead of rejected | r1: 9 KB comment → `201 {"ok":true}`. The server keeps 500 chars (`limpiar(d.comentario, 500)`) | Low impact, because the page caps at `maxlength=500`. An API client's text is cut without notice. | server |
| 10 | Input borders are slightly below the 3:1 non-text contrast guideline | r3: `#8a9a95` on white = 2.94:1 | Low-vision users may struggle to see where the fields are. | accessibility |

## Candidate lessons

### L-a · A global abuse cap must not turn into a shutdown for real users
origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

1. **What happened:** A global "100 saved requests per hour" cap was meant to stop bots spread across many IPs. 100 bot posts used it up, and the next real patient got 429 with a message saying *they* had sent too many.
2. **Why it happens:** The cap protects the owner's inbox from volume, but it measures everyone together. So the attacker's volume is charged to the honest user. The message was copied from the per-IP limit.
3. **The rule:** A shared limit must not refuse the person in front of you because of other people's traffic. Either it degrades gracefully (accept but flag/quarantine, CAPTCHA only once the cap is hit, notify the owner), or its message tells the truth and offers the phone number.
4. **How to check:** Fill the cap from N different source addresses, then send one valid request from a new address. Read the status and the message.
5. **Detector question:** If bots use up this limit, what does the next real person see, and is the message true for *them*?

This is related to WEB-2 (bots from day one), but WEB-2 is about the owner sorting bots. This one is about a real user being shut out. Finding 5 (shared-IP lockout) is the same kind of failure for the login.

### L-b · The panel must render around a bad record, not die on it
origin: lab · claude-sonnet-5-5 · 2026-10
packages: web, apps

1. **What happened:** The server skips damaged *lines* carefully. But one line that parsed and lacked `telefono`/`dia` threw inside the panel's render loop, and the owner saw 0 of 52 requests.
2. **Why it happens:** Robustness was added at the parse layer only. The renderer trusts that every record that parsed has the full shape.
3. **The rule:** Validate shape at load (or render each record in its own try) so one bad record shows as "incomplete record" and the rest still appear. Tell the owner in the UI, not only in the console.
4. **How to check:** Append one valid-JSON record with a field missing, restart, and open the panel.
5. **Detector question:** If one stored record is missing a field, how many records does the owner still see?

Already covered by **WEB-1** (a damaged store must not take the next record down / who finds out). Findings 3 and 4 are instances of it. I'm proposing L-b only as a sharpening of WEB-1 to include "records that parse but are incomplete", not as a separate lesson.

### L-c · The no-JS fallback must keep what the person typed
origin: lab · claude-sonnet-5-5 · 2026-10
packages: web

Covered by **WEB-3** (a fallback nobody tested is not a fallback). The fallback was tested and does work, but the error path loses all input. I suggest adding to WEB-3's check: "submit an invalid form with JS off; are the fields still filled?"

The false README claim (finding 7) is a one-off slip. The 405 dead end (8), silent truncation (9) and border contrast (10) are one-off slips with no lesson.
