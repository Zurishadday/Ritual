# Findings: Fisio Andares (blind review)

How it was started: `node servidor.mjs`, following the header comment in `servidor.mjs`. The build has no README. The server printed `Fisio Andares en http://127.0.0.1:3000`, the panel URL, and a generated password. All 8 static files returned 200 with correct types. The four images are SVG placeholders.

The destructive scenarios ran against fresh copies of the build, outside this folder (`review-clinic-scratch/h.mjs`, one copy per scenario, `ADMIN_PASSWORD` set from Node). Each copy got its own port. To get past the per-IP limit, requests that needed different visitors went out from source addresses 127.0.x.y.

No browser was available, so the mobile (375 px), keyboard/focus and on-screen rendering checks were **not run**. They are marked not-checked below and are not counted as findings.

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A damaged `solicitudes.json` is silently treated as empty. The next request overwrites it, so every earlier request is gone. | Wrote 3 records, truncated the file, started the server. The startup log had no warning. `POST /api/citas` returned 201, and the file then held **1 record** (the new one). | After a bad shutdown or a manual edit, the physio loses every pending appointment. Nothing tells them, and the patients who asked are never called back. | data |
| 2 | One failed write blocks every later write until restart (the `colaEscritura` promise stays rejected). Records accepted in memory then disappear when the server restarts. | Made the `.tmp` path a directory and sent a POST: 500. Removed the directory and sent 3 more POSTs: **500, 500, 500**. In memory: 5, on disk: 1. After restart: **1**. | One locked file or full disk (antivirus is common on Windows) and every later patient sees "Error del servidor" for days. The panel even shows requests that will vanish on restart. | data |
| 3 | The appointment rate limit (10 per IP per hour) is consumed **before** validation, and every validation round goes to the server, because the form has `novalidate` and no client checks. | 10 submits with a bad or empty phone: `400×10`. Then a correct one: **429** "Demasiadas solicitudes", nothing stored. In the main run, attempt #11 was also 429. | A patient who struggles with the phone field a few times is locked out for an hour, right when they finally get it right. A family or office sharing one IP is too. | form |
| 4 | The server accepts a time slot earlier today that has already passed. | At 09:11 local, `fecha: 2026-10-16, hora: 09:00` returned **201**. | A patient books "today 9:00" at noon. The clinic gets a request that can't be honoured. | form |
| 5 | Without JavaScript the form does nothing useful. It has no `action`/`method`, so a submit becomes `GET /?nombre=…`, and the hour `<select>` has no options in the static HTML. | `GET /?nombre=Ana&…` returned **200** with the same page; `solicitudes.json` did not exist afterwards (nothing stored). The static HTML has **0** `<option value="HH:MM">`. | With JS blocked or failed, the patient can't pick an hour. If they submit anyway, the page reloads blank and they think they booked. | form |
| 6 | There is a hard cap of 5000 stored requests, and the clinic has no way to delete any (only pending/confirmed/cancelled). | With 4999 records, one POST returned 201, and the next returned **503** "No podemos recibir más solicitudes ahora". `DELETE /api/solicitudes/<id>` returned 404 and `estado: borrada` returned 400. | Bots spread across IPs fill the store, and from then on every real patient is turned away for good. The physio has no button to clean it. | data |
| 7 | Malformed input crashes the handler to a 500 and logs a stack trace. | Body `null`: **500** (`TypeError: Cannot read properties of null (reading 'web')`). `Origin: null` header: **500**. `GET /%E0%A4%A`: **500**. | No patient harm, but it fills the log with errors and could hide real ones. | server |
| 8 | Duplicate submissions are not de-duplicated on the server. | Two identical POSTs sent at once returned `201,201`, stored **2**. The client disables the button while sending, which likely prevents this in a browser (not run). | A double tap on a slow connection or a retry after a timeout puts the same patient in the list twice. | data |
| 9 | Images have no `width`/`height` attributes. The alt text describes scenes the placeholders don't show. | `index.html` has 4 `<img>` without `width`/`height`. The hero alt says "Fisioterapeuta ayudando a un paciente…", but `portada.svg` is a gradient with circles and the text "Foto de ejemplo". CSS `aspect-ratio` does reserve space on the cards. | A screen-reader user is told about a photo that isn't there. Small layout shift risk once real photos replace the SVGs. | accessibility |
| 10 | No README or test instructions in the build, though the request asked "dime cómo lo pruebo". | The folder holds only `servidor.mjs` and `publico/`. Usage is a 2-line comment at the top of `servidor.mjs`. | The owner has to read code to learn where the password is and how to reach the site from a phone (`HOST=0.0.0.0` is not explained anywhere they would look). | false claim |

What held (tried, did not break):
- Server-side validation for empty fields, phone with letters, email without "@", past day, Sunday, 20:00, 100 KB fields (413), non-JSON (400) and unknown treatment. Each returns field-level messages.
- HTML in name and comment is stored raw, and `admin.js` only uses `textContent`/`append`. The CSP is `script-src 'self'`, so an inline `onerror` could not run even if injected. Not seen rendered (no browser).
- Path traversal: `/..%2f..%2fservidor.mjs` 403, `/..%5cservidor.mjs` 403, `/..%2fdatos%2fsolicitudes.json` 403, `/datos/solicitudes.json` 404, unknown path 404. Other methods on `/` return 405. Other methods on `/api/citas` return 401 (odd, but harmless).
- Login: 5 wrong passwords, then 429 for 15 minutes, which also blocks the right password. With no cookie or a forged cookie, the list and status changes return 401. A cross-origin status change with a valid cookie returns 403.
- Concurrency: 200 new requests from 200 IPs plus 20 status changes at once all succeeded. 201 on disk, 201 after restart.
- A crash mid-write leaves the main file intact (write to `.tmp`, then `rename`).
- Newest first: the later request was listed first.
- Load: with 4999 records, `GET /api/solicitudes` took 34 ms (2.2 MB), 20 in parallel took 136 ms, and a POST took 15 ms (it rewrites a 2.5 MB file). Rendering 5000 cards in a phone browser was not measured.
- Contrast (computed): white on the buttons 4.91:1, error text 5.95:1, footer 5.68:1. White hero text over the gradient ranges from 3.4:1 to 12:1 depending on where it falls on the overlay. Where it actually lands was not rendered.

Not checked (needs a browser): 375 px layout and horizontal scroll with a 100-character name (the server accepts it: 201), keyboard focus order and visibility, focus after submit or after a status change, the in-place visibility of the success and error messages.

---

## Candidate lessons

The `lessons/TEMPLATE.md` file is not in this folder. The five parts below follow the structure the guide describes: title, what happened, why it matters, the rule, and the detector question.

### Already covered
- Findings 1 and 2: **WEB-1** (a damaged store must not take the next record down with it). Both are exactly that: a corrupt file wipes history on the next write, and a failed write blocks every later write.
- Finding 3: **45** (error path) and **49** (a general rule, the per-IP limit, silently beats the form's specific field errors).
- Finding 5: **WEB-3**.
- Finding 6: **WEB-2**.
- Finding 8: **45** (two clicks). The server side is unproven in a browser.

### New: a time window checked only at day granularity
- **Title:** A booking rule that says "not in the past" must check the hour, not only the day.
- **What happened:** The server compared `fecha < today` and accepted `today 09:00` at 09:11. The client only sets `min` on the date input.
- **Why it matters:** The clinic receives appointments for slots that are already over, and the patient believes they booked one.
- **Rule:** When a request combines a day and a time, validate the combined moment against now, in the clinic's timezone, on the server.
- **Detector question:** If someone picks today and an hour that has already passed, does the server still accept it?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### New: a handler that assumes the shape of its input turns odd input into a 500
- **Title:** Parse, then check the type, before reading fields.
- **What happened:** A JSON body of `null`, an `Origin: null` header and a malformed `%` escape each caused an uncaught exception and a 500 with a stack trace in the log.
- **Why it matters:** Any scanner or broken client fills the log with errors. A real failure gets lost in the noise, and the client gets a misleading "server error" instead of a 400.
- **Rule:** Every value that comes from the request (body, headers, path) is untrusted. Check its type before using it, and answer a bad one with a 4xx.
- **Detector question:** What does each endpoint return for `null`, an array, a malformed header, and a malformed URL escape: a 4xx or a 500?
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
