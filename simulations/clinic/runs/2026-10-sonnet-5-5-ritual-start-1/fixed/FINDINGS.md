# Findings: Fisio Andares (blind review)

I started the build the way its README says (`node servidor.mjs`). My launcher only set `PORT`, `DATOS_DIR` (a temp folder, so the build folder was not touched) and `ADMIN_PASSWORD`, all documented in the README. I used five instances: default limits (4111), high limits for the browser checks (4112), a store with a truncated line (4113), a store with an incomplete record (4114), and 100,000 seeded records (4115). The browser checks ran in headless Chrome over the DevTools protocol, with screenshots. The build's own `node prueba.mjs` passes: 26/26 OK, "Todo bien". All servers were stopped at the end.

Probe scripts and screenshots are in `../review-clinic-9eWKru/` (`sondas.mjs`, `rafagas.mjs`, `saturar.mjs`, `navegador*.mjs`, `medir.mjs`, `shots/`).

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | One bot can shut the booking form for everyone for up to an hour. A global cap of 40 valid requests per hour applies to all visitors, and the per-IP cap (6 per 10 min) only makes the bot use about 7 addresses. | `node saturar.mjs 4111`: 48 posts from 127.0.0.2–.9 returned `{"201":31,"429":17}`. A real person from `::1` then got `429 {"error":"Ahora mismo no podemos recibir más solicitudes por este medio. Llámanos al 55 0000 0000."}` | A patient trying to book on a Monday morning is told to call instead, and the clinic loses web bookings for an hour at a time. The owner gets no alert. The panel only shows the bot's 31 fake requests. | security |
| 2 | On a phone, one long name or email in one request pushes every card on the clinic's page past the screen edge. `.citas` is a grid, and the `h2` name and the `mailto:` link cannot wrap. Only the comment has `overflow-wrap`. | `node navegador2.mjs 4112` at 375 px after posting an 80-character name and a 117-character email: `admin overflow 375 {"scrollW":1014,"clientW":375}`. Screenshot `shots/20-admin-largo.png` shows "Cancelar" and "Eliminar" cut off on **every** card. | The owner opens the panel on her phone and has to scroll sideways on every card to cancel or delete anything. One bot or one long name is enough to cause it. | mobile |
| 3 | A record that is valid JSON but missing fields (a hand edit, or an older format) gets through `cargar()`, which only checks `id`. Every later request then fails with a 500, and the owner's panel shows no requests at all. | Store seeded with `{"id":"rara","estado":"pendiente"}`. `node medir.mjs 4114` → `new request 500 {"error":"Error interno del servidor."}`. Server log: `TypeError: Cannot read properties of undefined (reading 'toLowerCase') at abiertas (servidor.mjs:255)`. `node navegador4.mjs 4114` → `cards shown: 0 \| status line: "No se pudieron mostrar las solicitudes: Cannot read properties of undefined (reading 'split')"`. | Each patient who books is told the request failed and to call. The owner sees an empty panel with a technical error, and nothing says which line is at fault. | data |
| 4 | Resubmitting the same phone, treatment, day and hour counts as a duplicate. A corrected email or name is silently dropped, but the person still sees success. A different person (same phone, same slot) gets their comment glued onto the first person's record. | Three `curl -d` posts to 4112 with the same phone and slot: (1) `laura@corre.com`, (2) the email fixed to `laura@correo.com` and the full name, (3) "Pablo Gomez" with comment "Soy su hijo". All three returned `{"ok":true,...}`. Stored: `[["Laura Gomez","laura@corre.com","Soy su hijo"]]` | Laura notices the email typo, fixes it and gets "¡Listo!". The clinic still emails the wrong address. Pablo's success screen greets him by name, but the clinic only ever sees Laura. | data |
| 5 | The clinic's page is completely blank without JavaScript, or if `admin.js` fails to load. Both views are `hidden` and only the script reveals them. There is no message. | Chrome with `Emulation.setScriptExecutionDisabled` on `/admin.html` → `shots/09-admin-sinjs.png`: an empty mint-coloured page. | If the script is blocked (content blocker, network hiccup, old cached file), the owner sees a blank screen and cannot tell whether the site is down. | accessibility |
| 6 | On each card, the button for the current status is painted dark and filled, like a primary action. Every new request therefore shows "Dejar pendiente" as the most prominent button. | `shots/12-antes-confirmar.png`: on pending cards "Dejar pendiente" is solid dark and "Confirmar" is an outline. | A first-time owner reads the dark button as the action to take and may tap it expecting to accept the booking. Nothing changes and the request stays pending. | accessibility |

### Checked and held (no finding)

- Page loads (200) and all 4 images load (`loaded:true`). Each has `width`/`height`. The three cards have descriptive alt text, and the hero has `alt=""`, which is right for a decorative image under the headline. `{{TEL}}` is replaced in the page.
- Form paths, both in the browser and over HTTP: empty, phone with letters, email without `@`, a past day, a Sunday, 20:00, an hour that runs past closing, more than 120 days ahead, Feb 30. Each one gets a specific Spanish message in a summary that is focused, scrolled into view (`summary visible: true`) and links to the field. The data stays in the form.
- Double click on submit (two real mouse clicks): 1 saved. Two concurrent identical POSTs: one record.
- HTML injection: shown as literal text in the panel (`imgs:0, bold:0`, no dialog fired). CSP is also set.
- The server validates on its own. Empty, 100 KB (`413`), bad JSON (`400`), arrays and objects (`422`), Sunday or past dates (`422`), GET/PUT/DELETE/PATCH on `/api/citas` (`404`), PUT `/` (`405`).
- File server: `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs`, `/%2e%2e/…`, `/datos/`, `/datos/citas.jsonl`, `/datos/clave.txt` all return 404, and a bad escape returns 400.
- Login: 7 wrong in a row gave `401×5, 429×2`. A concurrent burst of 201 guesses gave `{"401":5,"429":196}`, and the correct password at the end of the burst was refused (429). Without the password, PATCH and DELETE return 401.
- Keyboard: there is a skip link, the focus ring is visible (3 px solid) on every stop, Enter submits, and focus goes to the error summary or to the success box. The next Tab after success lands on "Pedir otra cita".
- No JS on the public page: the real form post shows "¡Solicitud recibida! Masaje deportivo, 2026-10-19 a las 10:00", and an empty post shows an HTML page listing every error.
- Mobile public page at 375 px: `scrollW 375 = clientW 375`. Tap targets are at least 44 px.
- Data: 100 concurrent new requests plus 20 concurrent status changes → all 201/200, nothing lost (cancelled count went exactly +20). A truncated last line (simulated crash during an append) was set aside to `citas.corruptas.log`, and the next request saved fine.
- Scale with 100,000 records: list 17–22 ms (it caps at the 300 newest and says so), new request 9–19 ms, status change about 105 ms (it rewrites the whole 26 MB file each time). With 300 simultaneous connections at that size, some got `ECONNREFUSED` while the rewrites blocked the server. That is far beyond a clinic's real load, so it is not counted as a finding.
- README claims: all checked and true. That covers the password printed at startup, the honeypot, the per-IP and global caps, 3 pending per phone or email, 5 failed logins per minute per IP, delete one by one or "Borrar todas las canceladas", "funciona sin este archivo" (`app.js`), and `prueba.mjs` ending with "Todo bien". The global cap works as described: finding 1 is about its effect, not a false claim.

## Candidate lessons

Finding 1 is already covered by **WEB-2** ("A public form gets bots from day one"). It sharpens it with a variant: *a flood defense that caps everyone together turns the bot into a lockout of real people. Cap per sender and degrade (queue, hold for review), never close the door for all.*

Finding 3 is covered by **WEB-1** ("A damaged store must not take the next record down with it"). It sharpens it with a missing case: *damage is not only a cut line. A line that parses but lacks fields passes a "valid JSON with id" check and breaks every later request.*

Finding 4 is covered by **lesson 49** ("A general rule must not silently beat the specific ones"). The general duplicate rule (phone + slot) overrides the person's own corrected email and name and reports success.

Finding 5 is covered by **WEB-3** ("A fallback nobody tested is not a fallback"). The variant is that the private page needs a fallback message too, not only the public form.

Finding 6 is a one-off slip. No lesson.

Finding 2 is new:

### WEB-?. One long value from the public must not widen every row

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** Text typed by strangers (names, emails, URLs) can be one unbroken word. If the list that shows it is a grid or flex layout and that text cannot wrap, one record widens the whole column, and every row goes past the screen, not only the long one.

**Example.** A clinic's request panel showed each request as a card in a CSS grid. The comment had `overflow-wrap: anywhere`, but the name heading and the `mailto:` link did not. One request with an 80-character name and a 117-character email made the page 1014 px wide on a 375 px phone. The "Cancelar" and "Eliminar" buttons were cut off on every card. The builder had checked mobile with normal names only. It was noticed by rendering the panel at 375 px with one long name.

**Detector question.** If one record has a 100-character value with no spaces, in every field that comes from the public, how wide does the page get on a 375 px screen, and which buttons of the *other* records go off-screen?

**Warning sign.** "Names are short; I already made the comment wrap."

**What to do.** Put `overflow-wrap: anywhere` (or `word-break: break-word`) on the list container for all public text, and `min-width: 0` on grid and flex children. Then test at 375 px with one deliberately long name, email and URL in the data before calling it mobile-ready.
