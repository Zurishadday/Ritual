# Findings: Fisio Andares (blind review)

**Build reviewed:** `servidor.mjs`, `publico/*` and `prueba.mjs`. There is no README. The only start instructions are the comment on `servidor.mjs:1` ("node servidor.mjs") and `prueba.mjs:1` ("node prueba.mjs").

**How it was run:**
- `node servidor.mjs` on its default port 3000. This created `datos/clave.txt` in the build folder.
- More instances through `revision/lanzar.mjs`, using `PORT`/`DATOS_DIR` in temp folders.
- HTTP checks with node scripts in `revision/`.
- A browser in headless Chrome over CDP (`revision/formulario.mjs`, `revision/depurar.mjs`, `revision/navegador.mjs`). Screenshots are in `revision/shots/`.
- `node prueba.mjs` (the builder's own test): 26/26 OK.

All servers I started were stopped at the end. Ports 3000 and 3101–3104 were checked and are down.

## Table

| # | What broke | Evidence | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | **The clinic's page never shows a single request.** As soon as one request exists, `admin.js` crashes while drawing the first card. `tarjeta()` creates the badge `<span>` without the class `insignia`, so `pintarEstado()` gets `querySelector('.insignia') === null`. The owner can't see, confirm, cancel or delete anything from the page. | Plain `node servidor.mjs`, then one POST of a valid request (`{"ok":true,...}`), then log in at `/admin.html` in Chrome (`node revision/depurar.mjs 3000 <clave>`): `panel hidden= false \| items= 0 \| contador= ""`. Calling `cargar()` gives `TypeError: Cannot set properties of null (setting 'textContent') at pintarEstado (admin.js:56) at tarjeta (admin.js:119)`. Screenshot: `shots/admin-mobile-top.png` shows the header and buttons over an empty list. | The physiotherapist logs in and sees an empty panel with no message. She thinks nobody has asked for an appointment, while patients wait for a call that never comes. The main requirement ("vea las solicitudes… y pueda marcarlas") does not work at all. | form / false claim |
| 2 | **The admin error goes to an invisible place.** When `cargar()` throws after a successful login, the message is written into `#error-login`, which is inside the login view that was just hidden. | Same run: `error-login= "Cannot set properties of null (setting 'textContent')"`, while `vista-login` is hidden and `vista-panel` is shown. | The owner gets no sign that anything failed, so she has no reason to call for help. | accessibility |
| 3 | **A stranger can lock the owner out of her own panel.** Besides the 5-per-IP limit, a global bucket `'*'` allows 30 failures per minute across all IPs. After that, everyone gets 429, including the owner with the right password from a clean IP. | `node revision/admin-checks.mjs 3101 <clave> global`: `35 wrong passwords from 7 IPs -> {"401":25,"429":10}` then `owner, from a different IP, correct password -> 429 {"error":"Demasiados intentos. Espera un minuto..."}`. It was still locked when the next script tried to log in seconds later. | Anyone who sends ~30 bad logins a minute keeps the clinic out of its own appointment list for as long as they want. | security |
| 4 | **The anti-duplicate rule silently drops a different request.** If a second request has the same phone, treatment, date and hour as an active one, it is answered "¡Solicitud recibida!" but not saved, even when its comment is new. | `node revision/servidor-checks.mjs 3101`: resending the same slot with `comentario: 'Olvidé decir: tengo marcapasos'` returned `200 <h1>¡Solicitud recibida!</h1>`. The admin list (`admin-checks.mjs list`) shows only one "Doble Clic" entry, with `""` as comment. | A patient adds an important medical detail (a pacemaker), is told it was received, and the physiotherapist never sees it. | data |
| 5 | **The appointment rate limit counts rejected attempts.** The limit is 6 per IP per 10 min, and `anotar()` runs before validation. A person who fails 6 times on server-only checks (phone with letters, an hour already gone today, more than 120 days ahead) is blocked even when the 7th try is correct. The whole clinic behind one NAT/proxy also shares the 6. | `servidor-checks.mjs`: attempts 1–6 `422 telefono`, then `attempt 7 (now correct) -> 429 "Has enviado muchas solicitudes seguidas…"`. | A patient who struggles with the phone field gets locked out at the moment they get it right, and has to call. In an office or family on shared Wi-Fi, the 7th person in 10 minutes is refused. | server |
| 6 | **The builder's tests claim something about the screen without looking at it.** `prueba.mjs:80` prints "el HTML del nombre se guarda como texto (se muestra con textContent)". It only checks the JSON API, and the page does not show any request (#1). | `node prueba.mjs` → `OK el HTML del nombre se guarda como texto (se muestra con textContent)` and `Todo bien`, while the browser shows 0 cards. | The owner is told "it's tested and it works" and finds out it doesn't on her first real day. | false claim |
| 7 | The phone number must be changed in three places, but the comment names two. `servidor.mjs:10` says "cámbialo también en publico/index.html", but `publico/app.js:12` also hardcodes `TEL_TEXTO = '55 0000 0000'`. | Read plus run: the JS error message in `formulario.mjs` (network-error path) uses `TEL_TEXTO`. Grep finds the literal in three files. | After she replaces the placeholder as instructed, the "call us" message in the form still shows the fake number. | false claim |
| 8 | No README and no "how to test" in the build. The startup log also says the password comes from `datos/clave.txt` even when `DATOS_DIR` points elsewhere. | `Glob **/*`: no README. Console: `Contraseña (de datos/clave.txt): …` while running with `DATOS_DIR=C:/…/fisio-rev1`. | The owner doesn't know how to start it, where the password is, or how to check it works. The request explicitly asked "dime cómo lo pruebo". | false claim |
| 9 | On mobile, the hero subtitle sits partly over the light stick-figure arm in the SVG. White text on about rgb(126,166,163) is about 2.7:1. | `shots/mobile-top.png`, at 375 px: "para tu" over the figure's arm. The blend was computed from `portada.svg` (white @.85, image @.55 over #0a4d49). | Hard to read in sunlight for part of a line. The text shadow helps, but it is still below 4.5:1. | accessibility |
| 10 | (minor) Inconsistent error format on traversal: `/..%2f..%2fservidor.mjs` returns a JSON 404, while other missing paths return the HTML 404 page. `PUT /api/citas` gives 404 instead of 405. | `servidor-checks.mjs`: `/..%2f..%2fservidor.mjs -> 404 application/json`, `PUT /api/citas -> 404`. | Nothing leaks; only the error format is inconsistent. One-off. | server |

### What held (ran, did not break)

- **Load:** all 4 images load, and each has `width`/`height`. Cards have useful alt text; the hero image has `alt=""` because it is decorative under the text.
- **Form error paths (Chrome, 375 px):** empty, phone with letters (caught by the server), email without "@", past day, Sunday, and an hour already gone today. Each showed an error summary in view with focus on it, a message per field, and a next Tab that lands on a link to the field. 20:00 and 18:00 can't be picked in the `<select>`. The server rejects 20:00, 18:00, 08:30, 10:15, Sunday, Saturday, past dates, Feb 30 and dates more than 120 days ahead.
- **Good path:** a success box in view, focus on it, and the next Tab goes to "Pedir otra cita".
- **Double clicks:** a real mouse double click, three quick `click()`s, and two parallel no-JS posts each saved one request.
- **XSS:** the no-JS result page escapes `<script>`. The admin code uses `textContent`, and no alert fired, but because of #1 nothing was rendered, so the admin side was not really exercised.
- **Server without the page:** no fields → 422; 100 KB → 413; comment over 500 characters → 422; bad JSON → 400.
- **File server:** `/../servidor.mjs`, `%2f`, `%5c` and `%2e%2e` all give 404. `/datos/`, `/datos/citas.jsonl` and `/img` give 404.
- **Admin without a session:** GET, PATCH, DELETE and a forged cookie all get 401.
- **Login burst:** 60 parallel wrong passwords from one IP gave `{"401":5,"429":55}`.
- **Appointment burst:** 200 parallel valid requests from one IP gave `{"201":6,"429":194}`.
- **Concurrency:** 150 posts from 150 IPs plus 11 status changes at the same time ended with 161 lines, all valid. 20 status changes plus 20 posts on a 20,000-record store gave `patch {"200":20} post {"201":20}`, total 20020.
- **Damaged store:** a truncated last line moved to `citas.corruptas.log`, and the next 20 requests saved. The only alert is a console warning.
- **Scale:** with 20,000 records, the list call takes 8–13 ms and returns 98 KB (capped at the 300 newest). One status change takes 21–52 ms, because it rewrites the whole 6.5 MB file.
- **app.js blocked:** the form posts natively. On success it shows a "¡Solicitud recibida!" page. On error it shows a page with the reasons, and Back keeps the typed data.
- **Keyboard:** the focus ring is a 3 px orange outline on every stop. Enter on the button submits.
- **Mobile, public page:** no horizontal scroll at 375 px (`scrollWidth 375`).

### Not checkable here

- **Mobile and keyboard on the clinic page with a very long name:** the list never renders (#1), so there is nothing to measure. The panel without cards has no horizontal scroll. The code puts `overflow-wrap:anywhere` only on `.comentario`, not on the `h2` name or the email link.

## Candidate lessons

### Candidate A: An admin view tested only through its API

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

This is covered by **lesson 41** (Check in the format the reader actually sees). I am proposing it as a new *example* for 41, not as a new lesson.

**The idea.** A screen that turns data into cards needs at least one test that opens it with real data. An API test that passes says nothing about the page.

**Example.** A clinic's admin panel was "tested" by `fetch('/api/admin/citas')` and a line that said the name "is shown with textContent". The page itself threw a TypeError on the first card (a class name missing on one element), so the owner saw an empty panel. The error message went into the hidden login view.

**Detector question.** Did I open this screen with at least one real record and see the record on it, or did I only check the endpoint that feeds it?

**Warning sign.** "The API returns the right list, so the page shows it."

**What to do.** Seed one record, open the page in a browser (headless is enough), and assert the visible text of the first card. Also send any render error to a place that is visible in the current view.

### Candidate B: A global lockout is a lock the attacker holds

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

This refines **WEB-5**. The per-IP limit held; the extra global limit created a new failure. It also matches **lesson 49**: the general bucket silently overrides the per-IP decision.

**The idea.** A login limit shared by everyone lets anyone lock out the real user. Limit per IP or per account, and never let a stranger's failures block a correct password from somewhere else.

**Example.** The clinic login allowed 5 failures per IP plus 30 per minute in total. 35 wrong passwords from 7 addresses made the owner's correct password, from an eighth address, return "Demasiados intentos" for as long as the attack continued.

**Detector question.** If someone else fails this login 100 times a minute, can the real owner still get in?

**Warning sign.** "I'll add a global cap too, just in case."

**What to do.** Keep a per-IP limit with backoff. If you want a global signal, alert on it or slow responses down, but don't refuse. Test it with failures from several addresses followed by a correct login from a new one.

### Candidate C: Deduplication that answers "received" must not drop new content

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

This is closest to **lesson 49** (a general rule silently beats the specific ones), but it is about stored data, so I propose it as a new web lesson.

**The idea.** When a server treats a submission as a duplicate, it may only drop fields that are identical. If anything differs, it must save the new data or say clearly that it did not.

**Example.** An appointment form called a request a duplicate when phone, treatment, day and hour matched. A patient resent the form to add "I have a pacemaker". The page said "¡Solicitud recibida!", and the comment was thrown away.

**Detector question.** If the second submission differs in a field the key doesn't include, where does that field end up, and what does the person see?

**Warning sign.** "Same person, same slot: it's the same request."

**What to do.** Dedupe on the full payload, or a client token per form load. Merge or append changed fields, and test a resend with a changed comment.

### Candidate D: A rate limit that counts the user's own mistakes

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web`

This is close to **lesson 45** (someone walks the error path too) and **WEB-2**; I propose it as a sharpening of WEB-2.

**The idea.** An anti-bot limit on a public form must not spend the budget of a real person who is correcting mistakes, or of everyone sharing one IP.

**Example.** The appointment form allowed 6 posts per IP per 10 minutes, counting rejected ones. 6 tries with a mistyped phone, then a correct 7th: "Has enviado muchas solicitudes seguidas".

**Detector question.** How many times can one honest person get a field wrong before the form refuses them, and how many people share that limit?

**Warning sign.** "6 in 10 minutes is plenty for a human."

**What to do.** Count only accepted submissions (or weigh rejected ones less), key the limit with the honeypot and the content too, and walk the "fail N times, then succeed" path in a test.

## Note on what the builder probably said

The builder's message was not visible (blind review). In the build itself: `prueba.mjs` prints "Todo bien", and every line it prints is true *for the API*. The claims that the clinic's page works (comments in `admin.js` such as "se inserta siempre con textContent", and `prueba.mjs:80` "se muestra") are not true on screen.
