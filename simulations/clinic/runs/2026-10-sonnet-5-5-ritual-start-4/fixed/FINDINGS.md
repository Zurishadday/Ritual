# Findings: Fisio Andares (blind review)

**How I ran it.** The build has no README. The first line of `servidor.mjs` says `node servidor.mjs`, and the console prints the URL, `/admin` and the generated password (saved in `datos/clave.txt`). I started it on port 3100 with `PORT` set from a Node launcher. Destructive tests (flood, damaged store, 5,000 and 50,000 records, server in UTC) ran on copies in `%TEMP%\review-clinic-copy-*`. Browser checks used headless Chrome driven over CDP from Node: 375×740 mobile emulation, a Tab/Enter walk, and script execution disabled for the no-JS run. All test scripts are in `%TEMP%\review-clinic-scripts\` (`t-*.mjs`, `b-*.mjs`). Running the original left a `datos/` folder in the build with test requests and `clave.txt`.

**What held, briefly.** Every validation rule is enforced on the server too:

- An empty body gives 400 with an error for each field.
- A phone with letters, an email without "@", a Sunday, 2026-10-14, 20:00, knee therapy at 17:30, today at 09:00, more than 90 days ahead, objects or `__proto__`, and Feb 30 all give 400 with a message for that field.
- A 100 KB body gives 413. Other content types give 415. PUT/GET/PATCH/DELETE on `/api/citas` give 404. POST `/` gives 405.

Other checks that held:

- **Path traversal.** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs`, `/datos/citas.json` and `/..%5cdatos%5cclave.txt` all return 404.
- **HTML in the clinic page.** HTML in the name and comment shows as literal text: no dialog fired, and there are 0 `<b>`/`<img>` elements in `#lista`.
- **Double click.** Two clicks on submit saved 1 request.
- **Focus.** Focus goes to the first wrong field, which is on screen, or to the status message after success.
- **No JavaScript.** The form posts normally. The server returns the form with the person's values and an error next to each field, and after the fix a "Solicitud recibida" page.
- **Mobile.** No horizontal scroll at 375 px, on the public page or on the clinic page with an 80-character name, a 120-character email and a 440-character comment with no spaces.
- **Images and contrast.** All images have `alt`, `width` and `height`. Contrast: hero text ≥ 6.4:1 in the worst case, button 4.98:1.
- **Login.** After 5 wrong passwords from one IP it returns 429.
- **Admin without a password.** Without a session, every admin endpoint returns 401.
- **Storage.** 60 parallel POSTs plus 1 PATCH left 61 records on disk with the PATCH kept. A damaged `citas.json` doesn't block the next save.

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | One bot burst locks every patient out of the form for an hour (global cap of 100 per hour). | `t-flood2.mjs`: 100 valid POSTs from 20 loopback IPs (5 each) in about 2 s, then a real patient on a fresh IP gets `429 {"error":"Estamos recibiendo muchas solicitudes en este momento. Inténtalo en un rato o llámanos…"}`. JSON and no-JS paths both. | A script running 2 seconds an hour keeps the clinic's online booking shut all day. Real patients are turned away, and the owner now has 100 fake "pendiente" requests mixed in with the real ones. | security |
| 2 | Even without the cap, the owner has no way to find the real requests among bot ones or to remove the fakes. | `admin.js`: the list loads 25 at a time, filters only by status, has no search, and bulk delete ("Eliminar las que se muestran") removes everything with the current status. Bots land as `pendiente`, like real patients. At 1,000 pending, `crearCita` returns 503 "no podemos recibir más solicitudes" (`MAX_PENDIENTES`). | After a flood the owner either clicks "Eliminar" one at a time through hundreds of cards, or bulk-deletes all pending requests and loses the real patients with them. | data |
| 3 | The "Ver más solicitudes" button always shows, even when there is nothing more. | `b-nojs.mjs` with 4 requests: `#mas: hidden attr = true \| computed display = inline-block`. After clicking: `cards = 4`, no message, button still shown. Visible in `admin-375.png`. Cause: `.boton { display:inline-block }` overrides the `hidden` attribute. | The owner taps "Ver más", nothing happens, and they wonder whether requests are missing or the page is broken. | accessibility |
| 4 | The server decides "today" and "this hour has passed" with its own clock, not the clinic's. | `t-tz.mjs`: server started with `TZ=UTC` at 11:46 Mexico City time. Booking today at 15:00 returns `400 {"errores":{"hora":"Esa hora ya pasó. Elige una más tarde."}}`. | On most hosting (UTC), from about 3 a.m. Mexico time, a patient can't book a later slot today, and after 18:00 local time "today" is already tomorrow. They are told a future hour "already passed." | server |
| 5 | When `citas.json` is damaged, the clinic page silently shows an empty list. | `t-data.mjs`: truncated a 62-record store and restarted. The next POST returns 201, and the owner's list shows `total = 1`. The 61 old requests are in `datos/citas.danado-….json`. The only notice is a `console.error` line on the server. | The owner opens the page, sees almost no requests, and never calls back the 61 patients still waiting. Nothing on the page tells them a backup exists. | data |
| 6 | Pages that say "llámanos" don't show the phone number. | `t-flood.mjs`/`t-flood2.mjs`: the no-JS 429 pages ("Demasiadas solicitudes … llámanos para agendar") contain no `tel:` link (`has tel: link = false`). The same goes for the "Revisa tu solicitud" page, the 500 page and the 503 page, which all come from `pagina()`/`paginaFormulario()`. | A patient told to call has to go back and find the number. On a phone that's a dead end at the moment they wanted to book. | form |
| 7 | Every write rewrites and fsyncs the whole store on the event loop, so cost grows with history. | `t-data.mjs`: with 5,000 records (1.5 MB), one POST takes 10 ms and `GET /` during 20 POSTs takes 118 ms. With 50,000 records (14.9 MB), one POST takes 56 ms, PATCH 40 ms, and `GET /` during 20 POSTs takes **809 ms**. `crearCita` also filters all records each time to count pending ones. Nothing ever archives old requests. | After years of use, or after a bot flood, every booking and every Confirm click blocks the whole site for everyone. The admin list itself stays fast (20 ms at 50k, paginated). | server |
| 8 | The login limit is per IP only, with no global limit. | `t-admin.mjs`: 12 wrong attempts from one IP return 5×401 then 429, and the correct password from that IP is also refused (429). 300 wrong passwords spread over 60 loopback IPs were **all evaluated** (300×401 in 6.5 s). | The generated 12-character password is strong, so this is low risk as shipped. But `ADMIN_PASSWORD` accepts any value (for example "1234"), and from a shared IP (office, carrier NAT, a proxy) someone else's attempts lock the owner out for a minute. | security |
| 9 | The no-JS path doesn't limit dates or hours. | `b-nojs.mjs`: `fecha min = ""`, and the hour list ends `17:00,17:30` for every treatment. The server rejects these with clear messages, so this is recoverable. | A patient without JS (or with `cita.js` failing to load) can choose knee therapy at 17:30 and only learn after submitting. One round-trip; their data is kept. | form |

Lesson check (no `lessons/` folder or `TEMPLATE.md` exists in this workspace, so I matched the IDs given in the brief):

- #1 and #2 are covered by **WEB-2** (*A public form gets bots from day one*): the defence itself becomes the outage, and the owner can't sort the result.
- #3 is covered by **49** (*A general rule must not silently beat the specific ones*).
- #7 is covered by **46** (*What runs on every request can't grow with the content*).
- #8 sits under **WEB-5**. As shipped it held (5 then 429), so there is no new lesson. Note: per-IP only.
- #5 is the "who finds out" half of **WEB-1**. The record was not lost, so WEB-1 held, but the owner is never told. Candidate lesson B covers that half.
- #4 and #6 are new: candidate lessons A and C below.
- #9 is a one-off slip, so no lesson.

## Candidate lessons

The five parts, since `lessons/TEMPLATE.md` was not present: **title**, **the mistake**, **why it happens**, **detector question**, **what to do instead**.

### A · "Now" belongs to the business, not to the server
- **The mistake:** Rules like "today", "this hour has passed" and "no weekends" are computed with the server's local clock (`new Date()`, `getHours()`), which on real hosting is UTC.
- **Why it happens:** The builder tests on a laptop in the same time zone as the business, so the two clocks match and the bug can't show.
- **Detector question:** If this server runs in UTC, does a patient booking a valid slot later today get accepted? Start it with `TZ=UTC` and try.
- **What to do instead:** Fix the business time zone in config (`America/Mexico_City`), compute dates and times through `Intl.DateTimeFormat(…, { timeZone })`, and test once with a different `TZ`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### B · A store you repair silently looks like an empty store
- **The mistake:** When the data file is damaged, the server sets it aside and starts fresh but only logs to the console. The owner's page shows an almost empty list as if nothing happened.
- **Why it happens:** The builder thinks of recovery as "the server keeps working", not as "the owner learns that their data moved."
- **Detector question:** If the store is damaged tonight, what does the owner see on their page tomorrow, and how do they get the old records back?
- **What to do instead:** Show a banner on the owner's page while a set-aside file exists, naming the file and how many records are in it, and offer a way to restore or merge it.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- (Extends WEB-1, which covers "the next record still saves"; this covers "who finds out".)

### C · Every "call us" needs the number right there
- **The mistake:** Fallback and error pages tell the person to phone the business but are bare templates with no phone number or link back to it.
- **Why it happens:** Error pages are written as small separate templates and only checked to see that they appear, not used as a dead end.
- **Detector question:** On each error or fallback page that says "llámanos", can the person call with one tap without leaving the page?
- **What to do instead:** Put the `tel:` link (and the address, if relevant) in the shared error/fallback template, and check for it in a test.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### D · A global rate limit is a switch that turns the form off
- **The mistake:** A site-wide cap ("100 requests per hour across all IPs") meant to stop bots blocks every real person once a bot reaches it.
- **Why it happens:** The cap is tested as "does it stop a flood" (it does) and never as "what does the next real patient see after the flood."
- **Detector question:** After a bot fills the global limit, can a real person on a new connection still book? Try it.
- **What to do instead:** Limit per source and filter the content (honeypot, timing, duplicate detection), and put suspected bot requests in a separate "dudosas" list instead of refusing everyone.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
- (Close to WEB-2. If WEB-2 is read broadly enough to include "your bot defence must not lock out real users", fold it there.)
