# Findings: Fisio Andares (blind review)

**How the build starts:** there is no README. The only instructions are a comment on line 1 of `servidor.mjs` (`node servidor.mjs`) and one on line 1 of `prueba.mjs` (`node prueba.mjs`). I ran `node servidor.mjs` in place on :3000: it started, printed `Fisio Andares en http://127.0.0.1:3000`, and served `/` → 200 and the SVGs → 200 `image/svg+xml`. To keep the build's `datos/` untouched, I ran every test that writes data against two copies of the build (outside this folder) on :3201 and :3202. I drove a headless Chrome over the DevTools protocol from Node for the checks that need a browser: 375 px, keyboard, double click, no-JS, rendering on the clinic page. All servers I started are stopped. The build's `datos/citas.jsonl` is still empty.

**What held (tested, not just read):** server-side validation (empty body → 422 with every field listed; letters in the phone, an email with no "@", yesterday, a Sunday, 20:00 and 18:00 → 422 with the right message; 100 KB fields → 413; `text/plain` → 415; GET/PUT/DELETE on `/api/citas` → 404). The static file server: `/../servidor.mjs` → 404, `/..%2f..%2fservidor.mjs` → 403, `/..%5cservidor.mjs` → 403, `/..%2fdatos%2fclave-admin.txt` → 403, `/datos/citas.jsonl` → 404, `/img/` → 404. In the browser at 375 px: errors appear next to each field and focus moves to the first bad field, which stays on screen. A double click on submit saved **1** request. On success, focus goes to the status message and the next Tab goes to "Nombre". The page can be used with only Tab and Enter, with a visible 3 px amber outline on every stop. With JS off, the form posts to the server: a valid one lands on `/gracias.html`, an empty one gets an HTML page listing the errors. HTML in the name and comment shows up as plain text on the clinic page (`innerHTML` = `&lt;img src=x onerror=…&gt;`, 0 `<img>` in the list, no dialog fired). Admin calls without a cookie → 401 (PATCH, DELETE, GET). Confirm and Cancel change the badge on the same card right away and set `aria-pressed`; focus stays on the button. Delete asks for confirmation and then moves focus to the next card. The build's own `prueba.mjs` passes 30/30 on a copy.

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A request that arrives while the owner is confirming or cancelling another one is silently lost. The patient is told it was saved. | `race2.mjs`: PATCH A sent with half its body. Meanwhile POST B → `201 {"ok":true}`. Then the PATCH finishes → `200`. List afterwards: `A estado = confirmada \| B present = false \| total 3` (total was 3 before B). Cause: PATCH reads the file, then `await`s the body, then rewrites the file from its stale copy. | A patient sees "¡Listo! Recibimos tu solicitud", the clinic never sees the request, nobody calls them, and they think they have an appointment. | data |
| 2 | One record that parses as JSON but is missing fields blanks the whole clinic page, with no message. | Appended `{"id":"weird","creada":null}` to `citas.jsonl`. Then `admin3.mjs` showed: `rendered cards 0`, exception `TypeError: Cannot read properties of undefined (reading 'split')`, `resumen:""`, list empty, no warning. Truncated or garbage lines **are** handled: POST after each → 201, record saved, banner "2 línea(s) … dañadas". | After one hand edit or a bad restore, the owner opens the page and sees an empty list. They can't see or confirm any patient, and nothing says why. | data |
| 3 | A long name with no spaces breaks out of its card on the clinic page and makes the page 841 px wide on a 375 px phone. | 80-character name `MaximilianaMaximiliana…abc` (allowed by the server). At 375 px: `scrollWidth 841`, widest element `SPAN` (the name inside `h2`) at 841 px. The screenshot shows the name running off the card. `dd` has `overflow-wrap:anywhere`; the name in `h2` does not. | On their phone the owner has to scroll sideways, or the page zooms out and everything gets tiny. A bot or prankster can do this on purpose. | mobile |
| 4 | The server accepts times that have already passed today, and dates in the year 9999. | At 10:57 on Fri 2026-10-16, POST `fecha:2026-10-16, hora:09:00` → `201 {"ok":true}`. POST `fecha:9999-12-31` → `201`. | A patient books "today at 9:00" at 11:00, gets "¡Listo!", and the clinic gets a request it can't honour. A typo in the year (2062) gets through too. | form |
| 5 | Fake requests are capped only per IP: from many IPs they all get in, and the clinic page has no filter, no search and no bulk delete. Each delete needs two clicks plus a confirm dialog. | 30 bot-style POSTs from 30 loopback IPs → `accepted: 30/30`. The honeypot and the 5-per-10-min-per-IP limit both work (`prueba.mjs`: `límite de envíos → 429`). The list only offers Confirmar, Cancelar and Eliminar (with `confirm()`) per card. | After a spam wave, the owner scrolls through hundreds of "Bot n" cards, newest first, to find the one real patient. Cleaning up 1,000 fakes takes about 2,000 clicks. | security |
| 6 | The clinic page and every status change read the whole file. Load time grows linearly with no paging. | `store.mjs`: GET list at n=1,006 took 38 ms (0.3 MB). At n=10,007: 65 ms (2.7 MB). At n=50,008: 165 ms (13.4 MB), and 20 concurrent GETs took 1,839 ms. PATCH (full rewrite) took 105 ms at 50k. In Chrome at 375 px the list rendered 10,008 cards in about 1.7 s and 50,008 cards in about 8.8 s. POST stayed at about 40 ms (append only). | After a year or two of requests plus some spam, the owner's phone takes seconds to open the page and has to download megabytes every time. | server |
| 7 | `prueba.mjs` (the only "how to test" in the build) moves the owner's real `datos/` folder aside while it runs. If it is interrupted, the real requests stay hidden. | Ran it on a copy that had one real record, then killed it after 500 ms. Directory afterwards: `datos, datos.respaldo, …`, and `datos/ now has real-1: false`. Its header says it uses "datos temporales", but it does so by renaming the real folder. | The owner runs the test on the live clinic and closes the terminal halfway. Every real request disappears from their page (they are in `datos.respaldo`, but nobody tells them). | data |
| 8 | The server only listens on 127.0.0.1, so it can't be opened from a phone, and nothing outside the code says how to change that. There is no README. | With `node servidor.mjs` running, `fetch('http://192.168.101.104:3000/')` from the same machine → `ECONNREFUSED`. `HOST` is read only in `servidor.mjs:14`. | The owner follows "node servidor.mjs", tries to check "que se vea bien en el celular" on their own phone over Wi-Fi, and gets "can't connect". | false claim |
| 9 | The login limit is per IP only, and `ADMIN_PASSWORD` accepts any password, even a one-letter one, with no warning. | Same IP: `401,401,401,401,401,429,429, correct:429`. 12 wrong passwords from 12 IPs: `401 ×12`, never 429. The default generated password is 12 random base64url characters (strong). The env-var path has no check. | With the default password this is fine. If the owner sets `ADMIN_PASSWORD=fisio2026`, a botnet can keep guessing with no global stop. | security |
| 10 | On the no-JS error page, "Volver al formulario" sends the person to an empty form. | Empty submit with JS off showed `http://127.0.0.1:3202/api/citas \| Revisa tus datos … Volver al formulario`. The link is `href="/#cita"`, a new page load, so what they typed is gone. (The browser Back button would keep it.) | On a phone with JS blocked, a patient who mistyped one field taps the big button and has to retype everything. | form |
| 11 | Part of the hero subtitle sits over the pale figure in the illustration, at about 2.5:1 contrast. | Screenshots at 375 px and 1280 px: "…atención personal y un" overlaps the figure. Figure colour = #f6f3ec at 0.55 opacity over #14503f ≈ #90aa9e. White on that ≈ 2.5:1 (needs 4.5:1). The rest of the hero is white on dark green, which is fine. | Someone with low vision has trouble reading the last words of the line that says what the clinic does. | accessibility |

**README and comment claims:** there is no README. The comment "una línea dañada no afecta a las demás" (`servidor.mjs:63`) is true for torn or garbage lines and false for a line that parses but is incomplete (#2). The `prueba.mjs` header, "arranca su propio servidor … con datos temporales", is misleading (#7). The comment "Cambios solo con JSON: un formulario de otro sitio no puede enviarlo" holds: PATCH as `text/plain` → 415 in `prueba.mjs`, and the cookie is `SameSite=Strict`.

## Candidate lessons

Note: `lessons/TEMPLATE.md` is not in this folder, so the five parts below are: Title · The mistake · Why it happens · Detector question · The check.

### Candidate A: Read, modify, write must not wait in the middle (#1)
- **The mistake:** a handler reads the whole store, `await`s something (the request body, a network call), then writes back its copy. Anything appended during the wait is overwritten.
- **Why it happens:** with sync file calls, Node "feels" single-threaded, but every `await` lets other requests in.
- **Detector question:** Between reading this store and writing it back, is there an `await`? If a new record arrives in that gap, is it still there afterwards?
- **The check:** start the update with half its body sent, post a new record, finish the update, then list. Count before and after.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate B: Any text a stranger types must wrap wherever it is shown (#3)
- **The mistake:** wrapping is set on some fields (`dd`) but not on others (the name in a heading). One long word from a visitor widens the owner's whole page.
- **Why it happens:** test data has normal names with spaces, so the layout looks fine.
- **Detector question:** For every place that shows text a visitor typed, what happens at 375 px with the longest value the server accepts and no spaces?
- **The check:** submit a maximum-length name with no spaces, open the clinic page at 375 px, and compare `scrollWidth` with `innerWidth`.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate C: "From today on" means from now on (#4)
- **The mistake:** the date and the time are each checked against a range, but never together against the current moment. There is no upper limit on the date either.
- **Why it happens:** the rule is written as "date ≥ today" and "hour in the opening hours", and each part passes on its own.
- **Detector question:** Can someone book a slot that has already passed today, or one years away?
- **The check:** POST today's date with an hour earlier than now, and a date 10+ years ahead. Both should get 422.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate D: A test script must never touch the owner's real data (#7)
- **The mistake:** the test moves the live data folder aside and counts on a `finally` to put it back. A killed process never runs `finally`.
- **Why it happens:** the builder runs the test once, on an empty folder, and it always finishes.
- **Detector question:** If this test is interrupted at any moment on the live install, where is the owner's data and will they find it?
- **The check:** put a record in, start the test, kill it mid-run, then look at the folder.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### Candidate E: "Ready to run" includes reaching it from the device the request is about (#8)
- **The mistake:** a localhost-only bind with no instructions, for a request that explicitly asks for the site to work on a phone.
- **Detector question:** Following only the written instructions, can the owner open the site on their own phone?
- **The check:** start the server as documented, then fetch it through the machine's LAN IP.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

Covered by existing lessons, so no new one:
- #2 → **WEB-1** (a damaged store must not take down what comes next; here the owner's whole view goes down).
- #5 → **WEB-2**.
- #6 → **46**.
- #9 → **WEB-5** (per-IP limit only; a weak `ADMIN_PASSWORD` is the weak point).
- #10 and #11 are one-off slips.
