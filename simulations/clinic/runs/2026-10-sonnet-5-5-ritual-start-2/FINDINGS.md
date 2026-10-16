# Findings: Fisio Andares (blind review)

**How I ran it.** The build has no README. Its only start instructions are the first-line comment in `servidor.mjs` (`node servidor.mjs`) and `herramientas/probar.mjs`. I started `servidor.mjs` through a small Node launcher with `PORT`/`DATOS_DIR` set to temp locations, so the build folder was not changed. The builder's own smoke test (`node herramientas/probar.mjs`) passes 39/39. All browser checks used headless Chrome driven over the DevTools protocol from Node, at 375×812 (mobile) and 1280×900. Review scripts live outside the build in `%TEMP%\review-clinic-hrrSh5\` (`sondas.mjs`, `rafagas.mjs`, `navegador.mjs`, `panel5000.mjs`). All servers and browsers I started were stopped.

**What held (tried, no defect):**
- Page and images: all 4 images load (naturalWidth 1200/600/600/600), each has alt text and width/height. No horizontal scroll on the public page at 375 px (scrollWidth 375). The hero text is white on a dark green overlay and is readable in the screenshot.
- Form, with JS: the empty submit, a phone with letters, an email without @, a Sunday, a past date and 20:00 (not selectable) all show an error summary that is visible on screen and gets focus, plus a message under each field.
- Double click with JS: 1 request saved.
- Keyboard: the whole page can be used with Tab and Enter. Focus shows a yellow 3 px outline. After a successful submit, focus is on the success message and the next Tab goes to the phone link.
- HTML injection: shown as literal text in the panel. 0 injected elements, no alert.
- Server validation: empty, past, Sunday, Saturday, 20:00, 17:30, 31 Feb and more than 90 days ahead → 422. A 100 KB body → 413. Bad JSON → 400.
- File server: `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/..%5cservidor.mjs`, `/datos/citas.jsonl` and `/..%2fdatos%2fclave.txt` → 404.
- Admin API without a session: 401 (a forged cookie also gets 401).
- Rate limits: 50 parallel valid posts from one IP → 5 saved, 45 × 429. 300 parallel wrong logins → 5 × 401, 295 × 429.
- Concurrency: 20 new requests and 20 status changes in parallel → 50 lines, 0 unparseable. After a restart, all states are correct and the list is newest first.
- Crash mid-write: a cut last line is skipped and the next post saves. After a restart both records are there and the panel reports 1 damaged line.
- No JS: a valid submit goes to `/gracias.html` and is saved. An invalid submit gets a readable error page.
- The code comments' claims I tested are true: "sin este archivo el formulario sigue funcionando", "una línea dañada solo se salta", "doble clic: se ignora".

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The clinic panel at 375 px is blown wide by any long unbroken text in a request (name, email, comment). The whole page then zooms out to unreadable size. | `navegador.mjs` J: after a request with a 100-char name and a long email/comment, `{"scrollWidth":2953,"innerWidth":1500}` at a 375 px device. Screenshot `m375-admin.png`: cards render at about 1/5 size and the comment runs off to the right. | One spammy or careless request makes the panel unusable on her phone. She has to pinch-zoom and scroll sideways through every card to confirm the real patients. | mobile |
| 2 | In the panel, changing the status of a request whose name contains `"` throws, and keyboard focus is lost to `<body>`. | `navegador.mjs` J: Enter on "Confirmar" for name `<b>hola</b> <img src=x onerror="alert(1)">` → `EXCEPTION: SyntaxError: Failed to execute 'querySelector' … is not a valid selector`, `focus now BODY`, and the next Tab goes to the first link of the page. Same click on "Luis Gómez" → focus stays on `BUTTON«Confirmar»`. Cause: `admin.js:109` builds a CSS selector from the name. | A patient who writes `Juan "Toño" López` is confirmed, but a keyboard or screen-reader user of the panel is thrown back to the top after each action on that card. | accessibility |
| 3 | A hard cap of 5000 stored requests (cancelled ones included) closes the public form for everyone, permanently. The panel has no delete and no warning. | `rafagas.mjs muchas`: with 5000 saved lines, a new valid request → `503 "Ahora mismo no podemos recibir solicitudes en línea. Llámanos por teléfono."`. Same with 10000. The panel API returns only `ok,citas,lineasDanadas`, and the UI has only Confirmar/Cancelar/Dejar pendiente. | Bots on rotating IPs (5 per IP per 10 min) or just ~1.5 years of normal use fill it. From then on, every patient is told to phone and the owner never learns the form is dead. | data |
| 4 | No way to delete or bulk-handle spam: each fake request can only be set to "cancelada", one by one. | `admin.js:77` offers only 3 status buttons. There is no delete route in `servidor.mjs` (`POST /api/admin/borrar` → 404 `No existe.` falls into the generic branch). | After a bot wave, she has to click "Cancelar" hundreds of times to find the real patients. The cancelled ones still count toward the cap in #3. | data |
| 5 | The server accepts the treatment values `toString` and `__proto__`, because they are found on `Object.prototype` of the `TRATAMIENTOS` lookup. | `sondas.mjs`: `tratamiento:"toString"` → `200 {"ok":true,"resumen":{"fecha":"2026-10-20","hora":"10:00"}}`. `__proto__` → `200 … "tratamiento":{}`. Both are saved. | A crafted request lands in the panel with no treatment name (the line reads `undefined · …`). This is mostly a sign that the server validation has a hole. | server |
| 6 | Without JavaScript, the error page's only button ("Volver al formulario") reloads an empty form. Everything typed is lost. | `navegador.mjs` K (scripts disabled): one bad phone → error page; clicking `a.boton` → `http://localhost:4300/#cita`, `nombre field value: ""`. | A person on a slow phone (JS blocked or not loaded) makes one typo and has to retype all seven fields. Many will just leave. | form |
| 7 | 5 wrong passwords from one IP lock out the correct password too, so anyone sharing the owner's IP can lock her out. | `navegador.mjs` J: 5 × "Contraseña incorrecta." then "Demasiados intentos. Espera 59 segundos." Then the correct password → "Demasiados intentos. Espera 58 segundos." | Someone on the clinic Wi-Fi (or everyone, if it ever runs behind a proxy where all users share one IP) can keep the physiotherapist out of her own panel indefinitely. | security |
| 8 | When the data file cannot be written, the patient is told to call, but the owner sees nothing in the panel. The error is only on the server console. | `rafagas.mjs dano`: data file made read-only → `500 "No pudimos guardar tu solicitud…"`. Panel API still `ok,citas,lineasDanadas` with no warning. Console: `No se pudo guardar la cita: Error: EPERM`. | Every request is lost while she believes the site works and nobody is booking. | data |
| 9 | Without JS, a double click on submit saves two requests (no server-side duplicate guard). | `rafagas.mjs`: two parallel identical form posts → `303,303`, 2 lines saved. | Duplicate cards for the same patient. This is minor because the rate limit caps it. | form |
| 10 | Wrong methods on `/api/citas` return 404 instead of 405. | `sondas.mjs`: `PUT/DELETE/GET/PATCH /api/citas` → `404 {"ok":false,"mensaje":"No existe."}`. | No user impact. It is a one-off slip. | server |

Not counted (lower bar, noted only): the phone links in the contact section and footer are 30 px and 21 px tall, under the 44 px used for buttons (above WCAG 2.2's 24 px minimum). With 5000 requests the panel renders in 951 ms on this desktop, and each status click re-renders all 70 000 nodes (771 ms). That is acceptable here only because of the cap in #3.

## Candidate lessons

`lessons/TEMPLATE.md` is not in this folder, so I used five parts: **Title · What happened · Why · Detector question · Rule**.

**Covered by existing lessons, no new one:**
- #3 and #4 → **WEB-2** (a public form gets bots from day one: no cleanup tools, and a cap that bots can fill).
- #8 → **WEB-1** ("who finds out" when the store fails: nobody).
- #9 and #10 are one-off slips.

### L-A · Text the user typed must wrap wherever it is shown
- **What happened:** the panel cards print name, email and comment as-is. One 100-character unbroken string made the 375 px panel 2953 px wide and shrank everything.
- **Why:** layouts are tested with realistic short names. Text from strangers has no such limit.
- **Detector question:** if someone types the longest allowed value with no spaces in each field, does every screen that shows it still fit 375 px without horizontal scroll?
- **Rule:** any container that shows user input gets `overflow-wrap: anywhere` (or `min-width: 0` on flex/grid children). Test it with max-length unbroken strings at 375 px.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-B · Never build a selector, query or markup string from user data
- **What happened:** after a status change, `admin.js` re-found the button with `querySelector('…[aria-label="…' + name + '"]')`. A `"` in the name threw a SyntaxError and dropped keyboard focus to `<body>`.
- **Why:** escaping is remembered for HTML (`textContent`) but forgotten for the other small languages: CSS selectors, URLs, regexes.
- **Detector question:** where does a value the user typed end up inside a string that another parser reads (selector, URL, regex, SQL, HTML)? What happens with a `"` or a `\` in it?
- **Rule:** keep references to elements, or look them up by a server-generated id. When interpolation is unavoidable, use the parser's escaper (`CSS.escape`, `encodeURIComponent`, …). Test with names that contain quotes.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-C · An allow-list built from a plain object also allows its prototype
- **What happened:** `if (!TRATAMIENTOS[c.tratamiento])` accepted `toString` and `__proto__`, so the server saved requests with no real treatment.
- **Why:** `obj[key]` looks like "is it in my list", but it also walks `Object.prototype`.
- **Detector question:** if the client sends `toString`, `constructor` or `__proto__` for this field, is it rejected?
- **Rule:** check membership with `Object.hasOwn`, a `Map`, a `Set` or `Object.create(null)`. Add those three names to the validation tests.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-D · A server-side error page must give back what the person typed
- **What happened:** with JS off, any validation error led to a page whose only way back reloads an empty form. All seven fields were lost.
- **Why:** the no-JS fallback was tested for "does it save" and "is the error readable", not for "can the person fix one field and continue".
- **Detector question:** with JS off, after one wrong field, how many fields does the person have to type again?
- **Rule:** without JS, re-render the form with the submitted values and the errors inline, or at least use `history.back()`-safe navigation. Test the no-JS error path end to end.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps

### L-E · An attempt limit must not lock out the rightful owner
- **What happened:** after 5 wrong passwords from an IP, even the correct password got 429 for 60 s. The window renews for as long as someone keeps trying.
- **Why:** the limit counts per IP and blocks all attempts, so the attacker and the owner share a bucket.
- **Detector question:** if someone on the owner's network keeps typing wrong passwords, can the owner still get in? What happens behind a proxy where all IPs look the same?
- **Rule:** slow wrong attempts down (growing delay, per-account plus per-IP), but give the owner a way through: a correct password still works with a delay, a recovery path, or trusted-device cookies. Log lockouts where the owner sees them.
- origin: lab · claude-sonnet-5-5 · 2026-10
- packages: web, apps
