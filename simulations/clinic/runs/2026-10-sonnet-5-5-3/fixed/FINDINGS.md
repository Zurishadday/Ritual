# Findings: Fisio Andares (blind review)

**How it was run.** The build has no README. The only start instructions are in the comment at the top of `servidor.mjs` (`node servidor.mjs`, optional `PORT`, `HOST`, `ADMIN_PASSWORD`) and in the console output, which prints the URL, `/admin` and a generated password. Every test ran against fresh byte-identical copies of the build in a scratch folder (`…/Temp/review-fisio/runs/*`), one server per test, started from Node with `PORT`/`ADMIN_PASSWORD` set. HTTP checks used Node `fetch` and `http.request`. Browser checks used headless Chrome 375 px / 1280 px, driven over CDP from Node scripts (`…/review-fisio/scripts/{http,nav,nav2,nav3}.mjs`). Screenshots are in `…/review-fisio/shots/`. "Today" was Fri 2026-10-16. Nothing in the build was changed. All servers were stopped at the end (ports 3101/3201/3230/3240/3250 checked: down).

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | **The login form stays on screen after logging in.** `form { display: grid }` in `estilos.css:46` beats the UA `[hidden]` rule, so `#acceso hidden` has no effect. | Chrome, after a correct login: `acceso hidden=true acceso display=grid acceso height=338` and `panel top 486`. Screenshot `admin-375-after-login.png` shows the password box and "Entrar" above "Solicitudes de cita". "Salir" also leaves both forms rendered (`acceso display grid`). | The physiotherapist logs in and still sees an empty password box at the top of the page (focus stays in it). They think the login failed and type it again. On a phone the requests start below the fold. | form |
| 2 | **The public form shuts off for good at 5,000 stored requests, and nobody is told.** `MAX_SOLICITUDES = 5000` counts confirmed and cancelled requests too, and the panel shows no warning. | Seeded 4,999 → `submit 201`, then the next one gets `503 {"error":"No podemos recibir más solicitudes ahora. Llámanos."}`. With 20,000 seeded, every submission gets 503. | At about 15 requests a day the clinic hits the cap in under a year. A bot hits it much sooner (finding 3). After that every patient sees "we can't take more requests" and the owner sees a normal-looking panel. The only way out is to delete requests one at a time. | data |
| 3 | **Bot volume can't be managed.** There is a honeypot, but any bot that leaves it empty gets 10 saves per hour per IP. The panel has no bulk delete, no search and no paging. Each delete is one click plus a `confirm()` dialog. Identical concurrent submissions are not de-duplicated. | `honeypot 201 {"ok":true}` (silently dropped, good). One IP: 10 valid saves, then `429`. Two identical POSTs at once → `201,201`, `saved Doble 2`. One IP at 240/day fills the 5,000 cap in about 21 days (finding 2). `admin.js:122` deletes one item per click after `confirm()`. | After a spam wave the owner scrolls a list of thousands of cards to find the one real patient. Clearing it takes thousands of click+confirm pairs at ~1 s each (finding 7). | security |
| 4 | **After a failed submit the errors are mostly off-screen, and the visible message doesn't say which field is wrong.** Focus is not moved to the first invalid field. | Chrome, empty submit. 375 px: `resultado="Revisa los datos." errors=nombre(OFFSCREEN),telefono(OFFSCREEN),correo(OFFSCREEN),tratamiento(OFFSCREEN),fecha(visible),hora(visible) focus=BODY`. 1280 px with a bad phone: `errors=telefono(OFFSCREEN),correo(visible)`. Screenshot `empty-submit-375.png`. | On a phone, a patient who mistyped the phone number sees only "Revisa los datos." under the button. Nothing red is visible. They have to guess, scroll up and find the line. Some will give up and not book. | form |
| 5 | **Focus is lost to `<body>` after every submit** (success or error), because the focused button is disabled while the request is in flight. | Keyboard-only run: `after Enter … focus=BODY`, `activeElement after submit: BODY … inView=false`, and the next Tab goes to `A[Llamar: 00 0000 0000]`, past the form. A mouse click shows the same `focus=BODY`. | A keyboard or screen-reader user hears nothing focused after "Enviar". The next Tab jumps out of the form, so fixing an error means hunting backwards for the field. | accessibility |
| 6 | **The owner's panel loses focus after Confirmar/Cancelar.** `pintar()` rebuilds the whole list and destroys the focused button. | `focused before Enter: BUTTON[Confirmar]` → `after Confirmar via Enter -> focus: BODY`, and the next Tab goes to `A[55 1234 5678]` in some card. | Working through requests by keyboard, the owner is thrown out of place after every action and has to Tab back through the list. | accessibility |
| 7 | **The panel downloads and re-renders every request on every load and every click.** There is no paging or limit. | At 4,999 requests: `GET /api/solicitudes` sends 2.18 MB. In the browser, `cargar()+paint 930 ms`, filter click `933 ms`, one Confirmar click `955 ms` until repaint, and the page is 2,246,764 px tall. Server time stays low: 35 ms at 4,999, 55 ms at 20,000. | With a busy history every confirm freezes the phone for about a second, and the newest requests are buried in an endless scroll. | data |
| 8 | **Horizontal scroll in the panel on mobile, and on desktop.** Text from users is not wrapped (`overflow-wrap` is not set). | Request with an unbroken comment and a long email. At 375 px: `scrollWidth=1137 clientWidth=375`. At 1280 px: `scrollWidth=1322 clientWidth=1265`. Screenshot `admin-375-full.png`: the comment runs ~1,000 px off the card. The public page is fine: `scrollWidth=375`. | One request with a pasted URL or a run of characters makes the whole panel slide sideways on the owner's phone. Every card becomes harder to read and tap. | mobile |
| 9 | **Rate limits are keyed only on IP, so one network counts as one person.** Ten valid appointment requests per hour are allowed per IP. Five wrong passwords lock out *everyone* on that IP for 15 minutes, the owner included. | `submission 6 429` (the 11th valid request from one IP). Login: `sequential 401,401,401,401,401,429,429,429`, then the owner with the **correct** password gets `429 {"error":"Demasiados intentos. Espera 15 minutos."}`. | Patients behind one mobile-carrier NAT, or the reception PC booking for several callers, get "Demasiadas solicitudes" after 10. Anyone on the clinic's Wi-Fi who guesses 5 times locks the owner out of her own panel. | server |
| 10 | **Without JavaScript, an error throws away everything typed.** The server's error page links "Volver" to `/#cita`, which loads an empty form. | JS off, bad phone + comment → `/api/citas`: "No pudimos enviar la solicitud … Escribe un teléfono válido. Volver". After clicking Volver: `values: {"nombre":"","telefono":"",…,"comentario":""}`. | A patient on a blocked-JS or flaky connection fixes one digit and has to retype the name, email, date, hour and comment. | form |
| 11 | **Without JavaScript, the admin login sends the password in the URL.** `<form id="acceso">` has no `method`/`action`, so it falls back to GET. | JS off, type password, press Enter → `url: http://127.0.0.1:3250/admin?clave=clave-prueba`. The page stays on the login form. | If `admin.js` fails to load, the owner's password lands in the browser history and address bar (and in any proxy or server log), and she still can't get in. | security |
| 12 | **A damaged store empties the panel without telling the owner.** The damaged file is copied and the next record is saved (good), but the only notice is a console line. | Seeded a truncated `solicitudes.json` → log `AVISO: … dañado … Se guardó una copia en …solicitudes.danado-…json`. Next submit `201`. The panel lists only `"Siguiente"`. Yesterday's requests are gone from view, with no message in the UI. | The owner opens the panel, sees one request, and never calls back the patients from before. Nobody looks at the server console. | data |
| 13 | **The focus indicator is too faint.** The outline `#8cc9bb` is 1.88:1 against white and 1.71:1 against the form's `#eef6f3` background. WCAG non-text contrast asks for 3:1. | Contrast computed from `estilos.css:49`: `focus ring #8cc9bb vs white 1.88 vs #eef6f3 1.71`. Keyboard run: every form control's outline is `solid 3px rgb(140, 201, 187)`. | A keyboard user with low vision can't tell which field they're in, especially inside the pale-green form section. | accessibility |
| 14 | The images have no declared `width`/`height`. | Chrome: `["/img/portada.svg",true,240,null,null,…]`, and `null,null` for all 4 images. | The page jumps as images load on a slow phone. Mitigated for the cards by `aspect-ratio: 3/2`. | accessibility |
| 15 | The request "dime cómo lo pruebo" has no answer in the delivered files. There is no README, only a one-line usage comment. The password exists only in console output or `datos/clave-admin.txt`. | Glob of the build: `servidor.mjs`, `publico/*` only. | The physiotherapist doesn't know where the password is after the terminal closes, or how to try the panel. | false claim |
| 16 | `tratamiento` sent as an array is accepted and stored as an array (`Object.hasOwn` coerces it to a string). | `tratamiento=[rodilla] 201 {"ok":true}` | Harmless today (the panel coerces it back). A one-off slip that only matters for later code. | data |
| 17 | A 100 KB body gets the connection reset instead of a clean 413. The next keep-alive request on that socket also fails. | `100KB ECONNRESET` over a fresh socket. Over a fetch pool, `413`, then the *next* unrelated request gets `fetch failed … ECONNRESET`. | Not reachable from the page (`maxlength`). An API client sees a spurious network error. One-off. | server |

### Checked and held

- **Load and images:** all assets return 200. The 4 SVGs load (`complete=true`). The alt text is descriptive. Hero and button text pass contrast (white on `#2f7d6d` is 4.91, hero text ≥5.3, error text 5.95).
- **Server validation without the page:** empty JSON returns `400 JSON inválido`, and an empty form gets an HTML error list. Bad phone, email without "@", Sunday, Saturday, past date, `2026-02-30`, 20:00, 17:30 and a 501-character comment all get 400 with a field message. A foreign `Origin` gets 403. `PUT /` gets 405. Other methods on `/api/citas` get 401.
- **Sunday in the date picker:** the inline message appears on `change`. **Double click** on submit saved **1** request.
- **HTML in the name and comment:** shown as text (`&lt;b&gt;hola…`), 0 dialogs, 0 `img`/`b` elements in the list. The CSP also blocks inline handlers.
- **File server:** `/../servidor.mjs` and `/..\servidor.mjs` return 404 (normalized inside `publico`). `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs` and `/..%2fdatos%2fclave-admin.txt` return 403. `/datos/solicitudes.json` returns 404. Bad percent-encoding returns 400. The server keeps running.
- **Confirm/cancel/delete/list without a session** return 401 (no cookie or a fake cookie).
- **Brute force:** 50 and 1,000 parallel wrong passwords → exactly 5×401, the rest 429.
- **Concurrent writes:** 8 submissions plus a status change at once → all 9 OK, 10 on disk, status kept. The write is atomic (tmp + rename) and serialized. A stale partial `.tmp` doesn't block the next save. A failing write returns `500 "No pudimos guardar…"`, the record is not kept in memory, and the next write after the fault clears succeeds.
- **No JS / `cita.js` blocked:** the form posts natively and the server answers with an HTML page ("Solicitud enviada" / an error list).
- **Public page at 375 px:** no horizontal scroll.

## Candidate lessons

`lessons/TEMPLATE.md` is not present in this folder, so each lesson uses five parts: **title, detector question, what happened, the rule, how to check.**

Covered by existing lessons, so no new lesson is written:

- #1 → **49**
- #2/#3 → **WEB-2** (the cap angle gets its own lesson below)
- #4 → **45**
- #5 and #6 → **WEB-4**
- #7 → **46**
- #12 → **WEB-1** (its "who finds out" half)

Findings 14–17 are one-off slips.

### L-A · A safety cap that shuts off the public form is an outage nobody sees
- **Detector question:** When this limit is reached, who gets refused, and how does the owner find out before patients do?
- **What happened:** `MAX_SOLICITUDES = 5000` counts every stored request, including handled ones. On reaching it, every visitor gets 503 forever. The panel shows nothing, and a single IP can reach the cap in about 3 weeks.
- **The rule:** Any limit that refuses real users must count only what is still relevant. It must warn the owner well before it triggers, where the owner actually looks, and there must be a way to get back under it in one action.
- **How to check:** Seed the store to the limit minus one, submit twice from the page, then open the owner's view and look for a warning.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-B · A per-IP limit treats a whole network as one person, and lets an attacker lock out the owner
- **Detector question:** If 20 honest people share one IP, or an attacker shares the owner's, who gets blocked?
- **What happened:** Appointment requests are capped at 10/hour per IP. Login is capped at 5 failures per 15 min per IP, and the lockout applies to the correct password too: the owner got 429 after someone else's 5 failures.
- **The rule:** Key limits on what is being protected (the account, the form's content), not only on the address. Never let failures by others block a correct login from the owner. Prefer delay or a captcha over a hard lockout.
- **How to check:** From one IP, send 11 valid requests. Then send 5 wrong passwords followed by the correct one.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-C · Text typed by strangers must wrap wherever it is shown
- **Detector question:** What does the owner's view look like at 375 px when a field holds 150 characters with no spaces?
- **What happened:** The panel showed an unbroken comment and email unwrapped: `scrollWidth=1137` at 375 px. The test of the public page alone (no overflow) passed.
- **The rule:** Every element that displays user input gets `overflow-wrap: anywhere` (or equivalent). Test views with hostile-length data, not just the sample data.
- **How to check:** Seed one record with a 150-character unbroken token in every text field, then compare `document.documentElement.scrollWidth` with `clientWidth` at 375 px.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-D · The no-JS path has to be safe and finishable, not just "it posts"
- **Detector question:** With JavaScript off, does every form use POST to a real endpoint, and after a server-side error can the person fix one field without retyping the rest?
- **What happened:** The appointment form's native fallback works, but its error page's "Volver" reloads an empty form. The admin login form has no `method`, so without JS it sends `?clave=<password>` in the URL.
- **The rule:** Every `<form>` declares `method="post"` and an `action` that works without JS. A server-rendered error must re-render the form with the submitted values (escaped) and the errors next to the fields.
- **How to check:** Disable JS, submit each form once with one wrong field. Look at the URL bar and at whether the other values survived.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-E · A focus ring has to be visible against what it sits on
- **Detector question:** What is the contrast between the focus outline and the backgrounds it actually appears on?
- **What happened:** The custom outline `#8cc9bb` replaced the browser default. It measured 1.88:1 on white and 1.71:1 on the form's tinted background, against a 3:1 requirement.
- **The rule:** A custom focus style must reach ≥3:1 against every adjacent background it can appear over. Otherwise keep the UA default.
- **How to check:** Tab through the page and compute the contrast of the computed `outline-color` against the section's background.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

## Lessons checklist (see verdicts.json)

| Lesson | Verdict |
|---|---|
| 32 | held |
| 41 | broke |
| 45 | broke |
| 46 | broke |
| 49 | broke |
| WEB-2 | broke |
| WEB-3 | held |
| WEB-4 | broke |
| WEB-5 | held (but see #9: the owner can be locked out by others) |
| WEB-1 | held (but see #12: nobody is told) |
