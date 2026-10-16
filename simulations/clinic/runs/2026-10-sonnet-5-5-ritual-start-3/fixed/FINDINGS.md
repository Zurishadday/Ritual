# Findings: Fisio Andares (blind review)

Build started the way the README says (`node servidor.mjs`), through a wrapper (`start.mjs`) that only sets `PORT`, `DATOS_DIR` and `CONTRASENA_ADMIN` and then imports `servidor.mjs`. I used ports 4810–4813 and temporary data folders, never the build's `datos/`. Browser checks ran in headless Chrome, driven over the DevTools protocol from Node. Review scripts and screenshots are in `../ritual-review-xE18MU/` (outside the build). Date of the run: Friday 2026-10-16, clinic time 10:19.

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A double click on «Pedir cita» saves the request, then shows a full-page error. The first click succeeds and `form.reset()` empties the form. The `enviando` guard is released in `finally`, so the second click validates the now-empty form and `limpiarTodo()` deletes the success message. | Headless Chrome, two clicks about 150 ms apart on `#enviar`: `resultado: 'Revisa los campos marcados en rojo y vuelve a intentar.'`, six field errors (`err-nombre=Escribe tu nombre.` …), focus on `nombre`. The panel then lists «Lucía Gómez» once, so the request was saved. Screenshot `shots/good-path.png`. | The patient sees every field in red and «Revisa los campos…» even though the clinic received the request. They type everything again and send a second request, or they give up thinking it failed. | form |
| 2 | Without JavaScript, two clicks save two requests. The server has no duplicate check. | `cita.js` blocked through `Network.setBlockedURLs`, two native clicks: page `Solicitud recibida`, `saved records named "Doble Sin JS": 2`. With curl, two identical POSTs at once returned `[201, 201]`. | The clinic sees the same patient twice. It may confirm both slots or phone them twice. | data |
| 3 | The global cap of 100 requests per hour is something bots can switch on. 20 IPs × 5 requests fill it in about a second, and after that every real patient gets a 429 for nearly an hour. | `node flood.mjs 4810 20` → `bot statuses { '201': 95, '429': 25 } in 1376 ms`. Then a patient from a new IP gets `429 {"error":"Hay muchas solicitudes… intenta de nuevo en unos minutos."}` and `Retry-After: 3349`. | One cheap bot run shuts the booking form for an hour. Patients can't book online and the clinic only sees bot requests. | security |
| 4 | The 429 message says «intenta de nuevo en unos minutos». The server's own `Retry-After` is 3349 s (about 56 min). | `curl -i … --interface 127.0.0.201` → `Retry-After: 3349` plus that body. | The patient retries every few minutes for an hour, gets rejected each time, and stops trusting the site. | false claim |
| 5 | The login brute-force limit is per request, not per attacker. Parallel guesses all get answered, and nothing ever blocks. | `node login-checks.mjs` → sequential: `401/1011ms 401/2022ms 401/3008ms` (the delay works one at a time). Parallel: `300 wrong … in 5196 ms -> ~3464 guesses/min`, then the correct password still gets `200` in 12 ms. | If the owner sets a short password (the README invites them to edit the file or set `CONTRASENA_ADMIN`), it can be guessed. That exposes patients' names, phones, emails and health notes. | security |
| 6 | The README promises «a quien falla más de 5 veces por minuto se le hace esperar cada vez más». That is true only for someone who waits for each answer (see #5). | Same run as #5. | The owner believes the panel is protected against guessing when it isn't. | false claim |
| 7 | When the store can't be written to, only the server console knows. The patient is told to call, but the owner's panel shows nothing. | `citas.jsonl` made read-only → the patient gets `500 {"error":"No pudimos guardar tu solicitud. Por favor llámanos…"}`. The panel API returns `conteo` unchanged and `danadas= 1` (left over from the earlier cut-line test). It has no field for write failures. | If the disk fills up or a permission changes, every booking fails. The owner sees a quiet, empty panel and thinks nobody is booking. | data |
| 8 | After a successful admin login, focus falls on `<body>`. The login form is hidden and nothing receives focus. | Headless Chrome at 375 px, correct password: `focus: 'BODY'`. (A wrong password keeps focus on `contrasena`, which is fine.) | A screen-reader or keyboard user gets no announcement that they're in. The next Tab starts at the top of the document. | accessibility |
| 9 | The hero subtitle sits over the light figure in the illustration with about 2.5:1 contrast (white on the blended `#85aaa6`). | Screenshots `shots/desktop-top.png` and `shots/public-375-top.png`: «deporte.» and «rodilla,» cross the figure. Computed: `white on figure 2.53`. | People with low vision, or anyone reading a phone in daylight, can't read part of the line that says what the clinic does. | accessibility |
| 10 | Choosing a treatment after choosing an hour silently clears the hour if the session wouldn't end by 18:00. | Chose hour `17:30`, then treatment `rodilla` → `hora` = `""`. Only the help line changes, to «La sesión dura 60 min…». | The patient may not notice that their hour is gone until submitting and seeing «Elige una hora.» It's recoverable. | form |
| 11 | Fields that are too long are cut on the server and still answered with 201. | curl with a 9,000-character comment → `201 {"ok":true…}`. The stored comment is 500 characters. A 101-character name was stored as 100 characters. The browser's `maxlength` prevents this in normal use. | Only clients that bypass the page are affected. The patient is not told that part of the text was dropped. | server |
| 12 | Two links on the public page are smaller than 44 px tall at 375 px: the brand link «Fisio Andares» (31 px) and the skip link (42 px). | `small targets public [ [ 'Saltar al contenido', 172, 42 ], [ 'Fisio Andares', 125, 31 ] ]`. | Minor: small chance of a mis-tap on the logo. | mobile |

### What held (tried, did not break)

- **Page and images.** `/` → 200, all 4 images load (`complete:true`, `naturalWidth>0`). Each has a descriptive Spanish alt text and declared `width`/`height`.
- **Form error paths in the browser.**
  - Empty form: six inline errors, focus on `nombre`.
  - Phone with letters and email without "@": both inline errors, focus on `telefono`.
  - Sunday: «Atendemos de lunes a viernes…».
  - Past day: «Ese día ya pasó…».
  - 20:00: not offered in the `<select>`.
  - In each case the fields keep what was typed.
- **Server validation without the page.**
  - Empty body, empty fields or a JSON array → 422 with every field error.
  - Phone with letters, email without @, past day, Sunday, 20:00 and 18:00 → 422 with the right message.
  - 100 KB → 413.
  - Bad JSON → 400.
  - PUT → 404 JSON.
- **File server.**
  - `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs` → 404, with no file leaked.
  - `/datos/` and `/datos/citas.jsonl` → 404.
  - A missing page → a friendly 404.
- **HTML injection.**
  - `<b>hola</b>` and `<img src=x onerror="alert(1)">` in the name and comment are shown as text in the panel: `imgsInList: 0, boldInList: 0`, no dialog fired.
  - The no-JS error page escapes them too (`esc()`), and the response sends a CSP header.
- **Admin without a session.** List, change status, delete and bulk delete → 401. A forged cookie → 401.
- **Mobile at 375 px.** No horizontal scroll on the public page (`375 vs 375`) or on the panel with a 100-character name and a long email. Both wrap (`shots/admin-375.png`). Every panel button is at least 44 px.
- **Keyboard.**
  - Every stop shows a 3 px outline.
  - Keyboard submit (Tab to «Pedir cita», Enter) leaves focus on `#resultado` with the success text in view.
  - Confirming a request in the panel shows «Guardado: confirmada.» next to the button, and focus stays on «Confirmar».
- **Without JavaScript.**
  - Browser validation stops an empty form.
  - A Sunday returns a server page with the error next to the date and every value kept (`shots/nojs-error.png`).
  - Fixing the date gives «Solicitud recibida».
- **Data.**
  - 40 simultaneous requests from 40 IPs, mixed with 10 status changes → 41 records in memory and the same 41 after a hard kill and restart.
  - A cut line left at the end of the file (as after a crash mid-append), both after a restart and while running: the next request is saved, the cut line is copied to `lineas-danadas.txt`, and the panel warns.
- **Volume.** With 100,000 stored requests (23 MB):
  - startup takes 329 ms
  - the first panel page takes 9 ms
  - 20 parallel full-scan searches take 68 ms
  - a page at offset 99,000 takes 10 ms
  - a new request takes 14 ms

## Candidate lessons

### Finding 3: new lesson

### WEB-?. A shared limit against bots is a switch the bots can flip

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** A limit that counts everyone together ("at most 100 per hour in total") doesn't stop bots. It hands them a way to turn the service off for real people. Once the shared quota is full, the bot has won, whatever its messages say.

**Example.** A clinic's booking form allowed 5 requests per IP every 10 minutes, plus a global cap of 100 per hour "against bots from many IPs". Twenty source addresses sending 5 valid requests each filled the global cap in 1.4 seconds. The next real patient, from a fresh IP, got «Hay muchas solicitudes… intenta de nuevo en unos minutos» with `Retry-After: 3349`. The form was closed for about an hour, and the only requests in the panel were the bots'.

**Detector question.** If an attacker fills this shared limit on purpose, who gets rejected next: the attacker, or the next real person?

**Warning sign.** "This total cap is a last line of defense; it will never be reached by normal traffic."

**What to do.** Don't reject on a shared counter. Past a threshold, keep accepting the requests but mark them as suspicious, or add friction for everyone (a challenge, a delay), or alert the owner. Test the limit by filling it from several IPs and then sending one real request.

### Findings 1 and 2: covered by lesson 45, with a proposed refinement

Lesson 45 ("two clicks") covers both. Proposed missing case for its example: *the guard against a second click was released the moment the first one succeeded, and the form had been emptied. So the second click validated an empty form and replaced «recibimos tu solicitud» with every field in red. Without JavaScript there was no guard at all, and the server saved both.* What to do: keep the form locked, or replace it with the confirmation, after a success. And make the server reject an identical request seconds after the first (for example, same phone + date + hour within a minute). Finding 1 is also an instance of lesson 32: a save that worked is shown as a failure.

### Finding 5: covered by WEB-5

Covered by WEB-5. Refinement: *a delay per failed attempt doesn't limit anything if the attacker sends attempts in parallel. Count the failures per IP and refuse once the count is over the limit, without waiting.*

### Finding 7: refines WEB-1

Refines WEB-1 ("who finds out"). The cut-line case held. The store that can't be written at all is the missing case: every next record fails, and only the console knows. Proposed What to do: when a save fails, record it somewhere the owner looks (a banner in the panel, a counter of failed saves since startup), not only in `console.error`.

### Finding 8: covered by WEB-4

Covered by WEB-4. Variant to add: hiding the form that holds focus (the login form after a successful login) drops focus exactly like disabling the button does.

### Findings 4, 6, 9, 10, 11, 12: no lesson

These are one-off slips, with no lesson proposed.
