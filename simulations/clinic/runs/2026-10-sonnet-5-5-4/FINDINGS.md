# Review: Fisio Andares (blind review)

**How the build was started:** the folder has no README. The first-line comment in `servidor.mjs` says `node servidor.mjs`. The server prints its address and an admin password (`ADMIN_PASSWORD`, or a random one printed at startup). I started it with `node _revisor/arrancar.mjs 3210`, a launcher that sets `PORT=3210 ADMIN_PASSWORD=clave-revisor`. For the browser checks I drove headless Chrome over CDP from Node scripts in `_revisor/`. Screenshots are in `_revisor/capturas/`. Tests that damage data ran on a copy (`_revisor/copia`).

**Reviewer artefacts left in the folder:** `_revisor/` and `datos/solicitudes.json`. The second file was created by the requests I sent to the server. Nothing in the build was edited.

## Findings

| # | What broke | Evidence | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | The build's own test script deletes the clinic's saved requests | Ran `prueba.mjs` in a copy that held one real-looking request. Before: `datos/ = ['solicitudes.json']`. After: `datos/ = ENOENT`. Lines 5 and 32 run `rm('datos', {recursive:true})` relative to the working directory. | The owner runs "the test" on the live folder, as the build suggests, and every patient request is gone. There is no warning and no backup. | data |
| 2 | A damaged store is silently replaced, and all old requests are lost | `datos.mjs` step 1: wrote 3 requests, truncated the JSON, started the server, sent one POST. Result: `POST -> 201`, file now has 1 record ("3 old ones were there"). `servidor.mjs:29` swallows the parse error with `catch { /* primer arranque */ }`. | After a hand edit or a bad disk write, the next patient's booking overwrites the whole history. Nobody is told. | data |
| 3 | One failed write breaks every later save until restart. Patients get errors for requests that the admin page still shows, and those requests are lost on restart. | `datos.mjs` step 2: made the temp write fail once (EISDIR, like a full disk), then fixed the disk. Results: `2b 500`, `2c 500`, `2d 500`. The file stayed at 1 record. The admin page showed `4 records: A4,A3,A2,A1`. After restart it showed `1 records: A1`. Cause: the rejected `cola` promise is never recovered. | A patient sees "No se pudo enviar" and retries, which creates duplicates in memory. The owner sees the requests and confirms them, then a restart erases them. | data |
| 4 | The form does nothing without JavaScript: the data goes into the URL and nothing is saved | Chrome with scripts disabled, filled the form, clicked Enviar. URL became `/?nombre=Sin+JS&telefono=5551234567&correo=sinjs%40ejemplo.com&...&hora=`, saved 0, message `""`, scrollY 0. The hour `<select>` only has "Elige primero el tratamiento", so an hour can't be picked at all. (`_revisor/capturas/sinjs.png`) | If app.js fails to load (slow phone, blocker, CDN-less error), the page jumps to the top and the patient believes the request was sent. Their name, phone and email are now in the browser history and the server logs. | form |
| 5 | A server-side error appears off-screen and focus drops to `<body>` | Phone `abc-defg-hij` passes the browser's check (`type=tel`, required only), and the server rejects it. Result: `telefono: Escribe un teléfono válido.`, focus `BODY`, error top at `-76px` (above the viewport) while the button stays in view. Same with phone `12` and a forced 20:00. (`telefono.png`) | The patient taps Enviar and nothing visible changes near them. They tap again, or give up thinking the site is broken. | form |
| 6 | After submitting, focus is lost and the next Tab jumps past the form | Enter on the submit button: result shown, focus `BODY`. Double click: focus `BODY`, and the next Tab goes to `A "00 0000 0000"`. The button is disabled during the fetch, which drops focus. The admin Confirmar/Cancelar buttons behave the same: focus `BODY` after each action because `pintar()` re-renders the list. | A keyboard or screen-reader user isn't told where they are after sending. Their next Tab lands in the footer contact area. | accessibility |
| 7 | The admin page at 375 px scrolls sideways and cuts off a request with a long name | 375 px, 100-character name. `scrollWidth 994`, widest element `ARTICLE.sol` at right 994. The screenshot shows the name, email, comment and the "Volver a pendiente" button clipped. `.sol p` has `overflow-wrap:anywhere`, but `.sol h3` does not, and the grid item grows. (`admin-movil.png`) | On their phone, the owner can't read the email of that request or reach one of its buttons without scrolling sideways. One bot entry with a long name breaks every card's width. | mobile |
| 8 | Inherited object keys are accepted as a treatment, and the hour check is skipped | `curl`-equivalent POST with `tratamiento:"constructor", hora:"23:00"` returned `201`. The admin page shows `"function Object() { [native code] } · 19/10/2026 a las 23:00"`. `d.tratamiento in TRATAMIENTOS` matches prototype keys, and `ini + Function > CIERRE` is a string comparison that is always false. | A bot or a crafted request books a nonsense treatment at 23:00, and the owner sees JavaScript source in their list. | server |
| 9 | The server accepts dates in the past (yesterday, and earlier today) | POST with yesterday `2026-10-15` → `201`. Today at 09:00 (already past) → `201`. A week ago → 400. The check is `fecha < now-24h` in UTC. | Requests for yesterday arrive. The owner has to contact the patient to reschedule. | server |
| 10 | The server accepts off-grid times | `hora:"09:07"` → `201`. The page only offers :00/:30 slots. | Odd times appear in the owner's list. Minor. | server |
| 11 | The public form has no bot defence, the admin has no delete, and at 5000 requests the form is dead for everyone | No honeypot, no per-IP limit on `/api/solicitudes`. Cross-site `Content-Type: text/plain` POST → `201`. Two parallel identical POSTs → `201 / 201`. With 4990 stored + 10 more, the next POST returned `503` ("Servicio saturado"). The admin UI only has Confirmar/Cancelar/Pendiente and no delete. | A bot fills 5000 entries in minutes. After that, every real patient gets "No se pudo enviar", and the owner can't clear the list from the page. | security |
| 12 | Body `null` crashes the handler (500) | POST body `null` → `500 {"error":"Error del servidor."}` (TypeError in `validar`). `GET /%` → `500` (URIError from `decodeURIComponent`), logged as a stack trace. | No patient impact, but anyone can fill the logs with stack traces. | server |
| 13 | White hero text sits over a light part of the illustration on mobile | At 375 px (`movil.png`), the end of "recuperar tu rodilla… rendir" overlaps the light figure (#d9a785) where the overlay is only ~25 % opaque. Computed contrast white vs blended `#a4886d` ≈ 3.3:1, which is below 4.5:1 for 18 px text. On desktop the text is over the dark part (OK). | A patient reading the slogan in sunlight loses the last words of each line. | accessibility |
| 14 | Images have no declared `width`/`height` | `[...document.images]` → `attrW/H=null/null` for all 4. CSS `aspect-ratio` covers the cards, and the hero is absolutely positioned, so I saw no layout shift. | Minor. A slow connection may jump if the CSS arrives late. | accessibility |
| 15 | Missing / misleading instructions | No README, even though the request said "dime cómo lo pruebo". The startup hint `ADMIN_PASSWORD=tuclave node servidor.mjs` doesn't work in PowerShell or cmd on Windows. The random password changes on every restart, which logs the owner out. | On Windows, the owner copies the hint, gets an error, and has to read the console after each restart to log in. | false claim |
| 16 | The login lockout is per IP, so the owner is locked out too | 8 wrong passwords: `401×5, 429×3`. The right password straight after also returned `429`, and it stayed locked for the full 5 minutes. | Behind a proxy or shared Wi-Fi, one attacker locks the owner out. Minor, but the trade-off isn't documented. | security |

### What held (tested)

- **Good path:** POST returns 201 and the success message is shown in view.
- **Empty submit:** all six fields show an error and focus goes to `nombre`.
- **Browser-side checks:** email without "@", a Sunday and a past date each show an inline message and focus the field.
- **Hour list:** the hour select only offers slots that end by 18:00 (rodilla stops at 17:00). Changing the treatment clears an invalid hour.
- **Double click in the browser:** saved 1.
- **HTML in requests:** `<b>hola</b><img onerror>` is shown as literal text in the admin page, no dialog fired and no `<img>` in the list. A CSP header is also present.
- **Server validation:** the server rejects `{}`, letters in the phone, an email without "@", a Sunday, 20:00, 100 KB (`413`), `PUT` (404) and `DELETE` (405).
- **File server:** `/../servidor.mjs` → 404, `/..%2f..%2fservidor.mjs` → 403, `/datos/solicitudes.json` → 404, a missing file → 404.
- **Admin auth:** the admin API returns 401 without a cookie or with a forged one. The brute-force lockout triggers after 5 tries.
- **Concurrency:** 50 parallel POSTs plus 5 PATCHes leave 51 records in the file, with no loss.
- **Scale:** the admin GET takes 36 ms with 4990 records (2 MB), and one POST takes 18 ms.
- **Ordering:** the list shows the newest requests first.
- **Desktop:** 375 px public page has no horizontal scroll (`scrollWidth 375`).
- **Keyboard:** every Tab stop has a visible outline.

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so the five parts below follow the usual shape: mistake, why it happens, detector question, what to do instead, evidence.

### A. A test script must never touch the live data folder

- **Mistake:** the project's test deletes `datos/` relative to the working directory before and after it runs.
- **Why:** the author tests in a clean folder and forgets that the owner will run the test where the real data lives.
- **Detector question:** if the owner runs the test today, in the folder where patients' requests are, what is left afterwards?
- **Do instead:** point the test at its own temp directory (an env var for the data path plus `mkdtemp`). Never `rm` a path the real server also uses.
- **Evidence:** finding 1.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### B. A write queue must survive one failed write

- **Mistake:** a promise chain serialises writes, and one rejection poisons every later write. The in-memory state and the disk silently diverge.
- **Why:** `queue = queue.then(write)` looks correct on the happy path.
- **Detector question:** if one write fails (disk full for a second), does the next request still get saved, and does the user who got the error really have nothing saved?
- **Do instead:** `queue = queue.catch(()=>{}).then(write)`. Push to memory only after the write succeeds, or roll back.
- **Evidence:** finding 3.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- Related to WEB-1, but that lesson covers a damaged *store*. This one is a damaged *queue* with a healthy store, so I am proposing it as new.

### C. Lookups against a plain object must not match inherited keys

- **Mistake:** `value in OBJ` and `OBJ[value]` with user input also match `constructor`, `toString` and similar keys, and that bypasses later checks.
- **Detector question:** what happens if the user sends `constructor` or `__proto__` as the choice?
- **Do instead:** use `Object.hasOwn`, a `Map`, or `Object.create(null)`.
- **Evidence:** finding 8.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Existing lessons that cover the other findings

- Finding 2 → **WEB-1**.
- Finding 4 → **WEB-3**.
- Finding 5 → **32 / 45**.
- Finding 6 → **WEB-4**.
- Finding 7 → **41** (the build's checks never looked at the rendered admin page).
- Finding 11 → **WEB-2**.
- Finding 16 → **WEB-5**: it held, and this is its trade-off.
- Findings 9, 10, 12, 13, 14 and 15 are one-off slips.
