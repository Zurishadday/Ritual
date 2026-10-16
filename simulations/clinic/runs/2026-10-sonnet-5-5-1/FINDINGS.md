# Findings: Fisio Andares build

Reviewed blind, without the builder's final message. Nothing in the build was changed. All probe scripts are in `%TEMP%\review-clinic\` (`api.mjs`, `navegador.mjs`, `formulario.mjs`, `datos.mjs`, `escala.mjs`, `sinjs.mjs`). Browser checks used headless Chrome driven over the DevTools protocol, so the mobile, keyboard and no-JS rows below come from runs, not from reading code. Clock during the review: Thu 2026-10-15, 21:03 (UTC-6).

**How to start it:** there is no README. The only instruction is the comment on line 1 of `servidor.mjs` (`node servidor.mjs`). Port 3000 is the default (or `PORT`). The admin page is `/admin` and the default password is `fisio2026` (or `ADMIN_PASSWORD`). `prueba.mjs` is an undocumented smoke test.

**What held up:**
- The page loads and all 4 images render (naturalWidth 200/225).
- Path traversal is blocked: `/..%2f..%2fservidor.mjs` → 403, `/../servidor.mjs` → 404, `/datos/solicitudes.json` → 404, a broken `%` escape → 400.
- The server checks every field on its own: empty `{}`, no body, letters in the phone, a missing "@", Sunday, a past day, 20:00, 17:30, 2030-02-30, an array in place of the name and a 100 KB field all get rejected (400/413).
- Two quick clicks saved 1 request.
- `<b>hola</b><img src=x onerror="alert(1)">` shows as plain text in the admin page: 0 `img`/`b` nodes and no dialog fired.
- Admin calls without a token, or with a fake one, get 401.
- 60 simultaneous POSTs plus 20 simultaneous PATCHes: 61 records both in memory and on disk.
- A kill -9 during a burst left a valid file, and the next POST after restart saved (201).
- The public page has no horizontal scroll at 375 px (375/375).
- Text and button contrast is fine: white on green 5.17:1, gray text 5.28:1, error red 6.17:1.

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | One failed disk write breaks saving until restart, and the lost requests still show up in the admin page | `datos.mjs`: the write was blocked once (`solicitudes.json.tmp` made a directory) → `POST` 500. The block was then removed, yet the next 3 POSTs → `[500,500,500]` and the PATCH → 500. Count was `in memory / on disk [65,61]`, the owner saw "Durante fallo" in the list → `true`. After restart: `[61,false]`. Cause: `cola = cola.then(...)` never recovers from a rejected promise. | After one disk hiccup (full disk, antivirus lock on Windows), every patient gets "Error del servidor" until someone restarts the server. Patients who retry appear as duplicates in the owner's list. The owner sees the requests, calls nobody about the failure, and all of them vanish on the next restart. | data |
| 2 | A damaged data file stops the server from starting | `datos.mjs`: `solicitudes.json` cut in half, then start → `exited 1`, stderr `<anonymous_script>:367` (JSON.parse). The next visitor's POST → `ECONNREFUSED`. | One bad byte in the file takes the whole site down, not just the booking form. No visitor can book or even see the page, and nothing tells the owner why. | data |
| 3 | Mistakes count against the per-IP limit, so a patient who mistypes gets locked out for an hour | `api.mjs`: 10 POSTs with a bad phone from one IP, then a correct one → `[400 ×10, 429]` "Demasiadas solicitudes. Intenta más tarde." The limit is applied before validation, and successful requests count too. | A patient who types their phone wrong a few times (letters, too few digits) is told to come back later and gives up. A family or office on one connection gets 10 bookings an hour between them. If the server runs behind a proxy (the default `HOST=127.0.0.1` suggests it), every visitor shares one IP, so the whole clinic gets 10 requests an hour. | form |
| 4 | Today's hours that have already passed can be booked | `api.mjs` at 21:03: `fecha 2026-10-15, hora 09:00` → `201`. In the browser: "Hoy Pasado" → "¡Solicitud enviada!". | A patient books "today 9:00" in the evening and is told it was sent. The owner gets a request for a slot that has already gone by. | form |
| 5 | Without JavaScript, the form throws the data away and puts it in the URL | `sinjs.mjs` (JS off): the hour list holds only `['Elige…']`. After submit the URL is `/?nombre=Sin+JS&telefono=5551112222&correo=nojs%40ej.mx&…`, the page is back at the top, the fields are empty, `saved on server 0`, and no message is shown. | The patient thinks they asked for an appointment, but nothing arrived. Their name, phone and email now sit in browser history and server/proxy logs. | form |
| 6 | Error messages appear off-screen, and on some errors focus is lost | `formulario.mjs` at 375×800. Empty submit → focus `INPUT[nombre]`, but "Completa todos los campos obligatorios." has `msgInView:false`. Email without "@" → same (`msgInView:false`). Phone with letters → message shown, focus `BODY`. No field is ever marked `aria-invalid` (`invalidMarked:0`). Screenshot `vacio-375.png`: an empty, focused Nombre field with no text explaining why. | On a phone, the patient is sent to the name field with no reason given. If they filled the name and only the phone was wrong, they don't know what to fix. | form |
| 7 | After submitting, focus falls to the top of the page | `navegador.mjs`: after a successful keyboard submit → focus `BODY`. The next Tab goes to `A (000) 000 0000`, past the form. Admin: after "Confirmar" with Enter → focus `BODY`, and the next Tab lands on the first card's "Confirmar". | A keyboard or screen-reader user loses their place after every submit. When the owner confirms several requests in a row by keyboard, each Enter sends them back to the top of the list. | accessibility |
| 8 | A long name breaks the admin page on mobile | `navegador.mjs`, admin at 375 px: `scrollWidth/clientWidth [991,375]`. Screenshot `admin-375.png`: "MariaMariaMaria…" runs off the card. `.solicitud h2` has no `overflow-wrap` (the `dd` cells do). | One long (or spam) name makes the owner's whole list scroll sideways on the phone, and the badge and buttons are pushed around. | mobile |
| 9 | The admin list sends and draws every request ever received | `datos.mjs`, server side. With 5,000 requests: GET 46 ms / 2.1 MB. With 50,000: GET 174 ms / 21.6 MB, 10 GETs at once 2,080 ms, 20 POSTs at once 4,194 ms (each POST rewrites the whole file). `escala.mjs`, browser at 375 px: 500 → 93 ms, 5,000 → 542 ms, 20,000 → 4,695 ms to paint, with a page 6.1 million px tall. | After a few months of bots, the owner waits seconds for the list on their phone and scrolls through thousands of cards to find today's real patient. Patients' submits slow down as the file grows. | server |
| 10 | No defense against spam and no way to clean up | Admin panel at 5,000–20,000 requests: `no filter/search/delete controls: true`. `DELETE /api/admin/citas/x` with a valid token → 404 (no route). The form has no honeypot or similar. The only brake is per IP: 60 different addresses → 60 accepted. | When bots find the form, the owner can only mark spam "cancelada" one card at a time. The spam stays in the list and the file forever. | security |
| 11 | The admin password is hard-coded and nothing forces a change | `servidor.mjs:15` `CLAVE_DEFAULT = 'fisio2026'`. `navegador.mjs` logged in with `fisio2026` on a server started with no env → panel loaded. The only warning is a console line. | If the owner starts it the way the request says (`node servidor.mjs`), anyone who reads the code or guesses the obvious password sees every patient's name, phone and email. | security |
| 12 | The login limit is per IP only, and it also locks out the owner | `api.mjs`: 12 wrong passwords from one IP → `401×10, 429, 429`, then the **right** password from the same IP → `429`. 100 guesses spread over 12 addresses → all 100 checked in 2.1 s. | An attacker with a few addresses gets about 1,000 guesses an hour per address. Anyone sharing the owner's IP (or the proxy) can lock the owner out of their own panel for 15 minutes. | security |
| 13 | The visible focus ring is too faint | Computed contrast of the focus outline `#8ccbc1`: 1.84:1 on white, 1.73:1 on the form's cream (WCAG non-text needs 3:1). The date input's last segment showed `outline=none` while focused. | A sighted keyboard user can barely see which field or button is active. | accessibility |
| 14 | Small tap targets on mobile | `navegador.mjs` at 375 px: nav links 38 px tall, logo 29 px, and the "call us" phone link 27 px tall (under 44 px). | The phone link, the one thing a mobile visitor most likely wants to tap, is a thin target. | mobile |
| 15 | Images have no declared size | `navegador.mjs`: every `<img>` has `width:null, height:null` and is 200–225 px wide natively but drawn at 341–375 px. | The page jumps as the illustrations load, and a tap can hit the wrong spot. | accessibility |
| 16 | The address and phone are placeholders, and the call button dials a fake number | `index.html:111-112`: "Calle Ejemplo 123", `href="tel:+520000000000"`, shown as "(000) 000 0000". There is no README or TODO marking them as things to replace. | If it goes live as delivered, a patient taps "call" and reaches nobody. | false claim |
| 17 | No README: how to run, the admin URL and the password are only in code | Glob of the folder: `servidor.mjs`, `prueba.mjs`, `publico/*`, nothing else. The request said "dime cómo lo pruebo". | The owner has to read the source to find `/admin` and the password, and to learn that `prueba.mjs` exists. | false claim |
| 18 | A disabled submit button is hard to read | Computed: white on green at `opacity:.6` over cream is 2.48:1. | While "Enviando…" shows, the button label is faint. This is minor because it only lasts a moment. | accessibility |
| 19 | Wrong method on the API returns 404, not 405 | `GET/PUT/DELETE /api/citas` → `404 {"error":"No encontrado."}`. Static `POST /index.html` → 405. | Only confuses whoever debugs it later. A one-off slip. | server |

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so I used the five parts the guide names: title, what happened, why it happens, detector question, what to do instead.

**Covered by existing lessons, no new text needed:**
- #2 → **WEB-1**.
- #3, #6 → **45**.
- #5 → **WEB-3**.
- #7 → **WEB-4**.
- #9 → **46**.
- #10 → **WEB-2**.
- #12 → **WEB-5**. It held for "is there a limit", but per-IP lockout also hits the owner. Worth a sentence added to WEB-5 rather than a new lesson.
- #6 also matches **32**: the message exists but isn't where the person is looking.

### Candidate A: a serialized write queue must survive its own failure
- **What happened:** writes were chained as `cola = cola.then(write)`. One rejected write left `cola` rejected forever, so every later `.then(write)` was skipped and every save failed, even after the disk recovered. Records had already been pushed to memory, so the owner saw requests that were never on disk and were lost at restart. (Finding #1.)
- **Why it happens:** the queue is written to fix concurrency, and it is tested with concurrency, never with a single failure followed by a success.
- **Detector question:** if one write fails and the cause goes away, does the next write succeed, and does what the owner sees match what is on disk?
- **What to do instead:** chain with `cola.catch(() => {}).then(write)` (or similar) so that one failure doesn't poison the rest. Add a record to memory only after it is persisted, or roll it back on failure. Test by failing one write and then sending another.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

(This is a sibling of WEB-1, which is about a *damaged store*. Here the store is fine and the *writer* is what stays broken. If WEB-1 is broadened to "one failure must not take the next record down", this folds into it.)

### Candidate B: an abuse limit placed before validation punishes honest mistakes
- **What happened:** the per-IP request limit counted every POST, including ones rejected by validation, and it ran before validation. A person who mistyped their phone 10 times got "come back later" for an hour. The right password from a locked IP got 429 too. (Findings #3 and #12.)
- **Why it happens:** the limit is a general rule bolted on at the top of the handler. It silently beats each field's specific, helpful error, and nobody walks the error path more than once or twice.
- **Detector question:** how many honest mistakes does it take before this limit fires, and what does the person see then? Does the right answer still get through?
- **What to do instead:** count failed attempts separately from successful ones (or only count accepted requests toward spam limits). Set limits well above what a struggling human would hit. Never block a correct credential just because of other people's wrong ones on the same IP. Think about what "IP" means behind a proxy.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

(Overlaps **49**, a general rule silently beating specific ones, and **45**. It is proposed as a concrete web instance; reviewers may prefer to fold it into 49.)

### Candidate C: "not in the past" means the time too, not just the date
- **What happened:** the date check compared only the day, so at 21:03 a request for "today 09:00" was accepted and confirmed to the patient. (Finding #4.)
- **Why it happens:** day and time are validated as two separate fields, and each one passes alone.
- **Detector question:** if I pick today and the earliest slot, late in the day, is it accepted?
- **What to do instead:** validate the combined date and time against now, in the clinic's time zone, on the server. In the browser, hide or disable the past slots for today.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate D: placeholder contact details must be impossible to ship by accident
- **What happened:** the address and phone are "Calle Ejemplo 123" and `tel:+520000000000`. There is no README, no TODO and no startup warning (there is one for the password, but not for these). (Findings #16 and #17.)
- **Why it happens:** the builder lacked real data, filled in a plausible-looking value, and never said so.
- **Detector question:** which values on this page did I invent, and where does the owner learn they must replace them?
- **What to do instead:** keep invented values in one config block, list them in the README and the final message, and warn at startup the way the default password does.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

Findings #8, #13, #14, #15, #18 and #19 are concrete slips (one missing `overflow-wrap`, one color, missing `width`/`height`). They are recorded in `verdicts.json` → `new` and don't get a lesson.
