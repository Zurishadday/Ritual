# Findings: Taller Rueda Libre (contact form page)

Reviewed 2026-10-13. Everything below was **run**, not read. I ran the build from a byte-for-byte copy in
`%TEMP%\review-qD5Swv\runs\<case>` (`servidor.mjs` + `publico/`), so the build folder has no `datos/` and no test messages.
Test scripts are in `%TEMP%\review-qD5Swv\tools\` and screenshots in `%TEMP%\review-qD5Swv\shots\` and `...\webcheck\`.
I used headless Edge over CDP for the browser checks and also ran `scripts/web-check.mjs`. All servers are stopped.

## Findings

| # | What broke | Evidence (command → result) | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | On desktop, the "Visítanos" heading sits on the page edge and not in line with its own content. `.seccion h2 { margin: 0 0 1rem }` (specificity 0,1,1) silently beats `.franja > * { margin-left/right: auto }` (0,1,0), which was meant to centre every child of the full-width band. | `node tools/browser-tests.mjs` at 1280 px → `Visítanos h2 left 20 \| its columns 121 \| Servicios h2 141 \| h2 margin-left 0px`; see `shots/d-visitanos.png` and `webcheck/desktop.png`. | On a laptop, the one section with the address and opening hours looks broken: its title hangs on the far left, about 100 px off from everything else. That's the section a customer comes for. | mobile (layout; shows on desktop) |
| 2 | The error message tells the customer to "escríbenos por teléfono", but the site has no phone number anywhere. When the message file passes its 10 MiB cap, every new message is refused with this text. Once the file is already full, the admin warning still says it "pronto dejará de aceptar" (will soon stop accepting). | `node tools/full-test.mjs` (11.2 MB file) → `JS post: 503 … o escríbenos por teléfono.`, `no-JS post: 503 …`, `home mentions a phone: false`, `admin warns owner: El archivo de mensajes casi está lleno y pronto dejará de aceptar mensajes nuevos.` | After a bot flood fills the file, a real customer is told to phone a number that isn't on the page, so they leave. The owner reads "soon", but messages are already being lost. | form |
| 3 | With JavaScript off, a successful submit is answered with a `200` page instead of a redirect (`303`). Reloading the thank-you page POSTs the form again and saves a duplicate. Separately, the server does not de-duplicate: two identical plain POSTs a few ms apart both get saved. | `node tools/reload-test.mjs` → `after submit: …/contacto Mensaje enviado \| saved 1` then `after reload: … saved 2`, `messages: ["recargar","recargar"]`. `node tools/http-tests.mjs` → `two quick submits without JS … statuses 200 200 \| lines saved: 2`. (A real double-click in the browser saved only 1, both with JS and without.) | A customer without JS (or on a phone that restores the tab) refreshes the "gracias" page or accepts the "resubmit?" prompt, and the owner gets the same message twice. | form |
| 4 | The admin page scrolls sideways on a phone when a message has a long unbroken name. `.mensaje h2` has no `overflow-wrap`; the email and body lines do. | `node tools/browser-tests.mjs`: a message with a 100-character name, then `/admin` at 375 px → `scrollWidth 1307`; see `shots/m-admin.png` (the name runs off the card). | Bots routinely send junk names like this. The owner, checking messages on their phone, gets a page 3.5× wider than the screen. The delete checkboxes still work, but the list is hard to read. | mobile |
| 5 | One line in the store that parses as JSON but has a missing or invalid `fecha` makes the whole `/admin` page return 500. `interpretar()` only checks `id` and `mensaje`, and `Intl.DateTimeFormat.format(new Date(undefined))` throws. | `node tools/http-tests.mjs` (WEB-1 block): append `{"id":"a3","mensaje":"sin fecha"}` → `admin after a parseable line without fecha: 500 Algo salió mal … Inténtalo de nuevo en un momento.`, server log `RangeError: Invalid time value`. New posts still save (`next visitor post still ok? 200`). | The admin page's own warning says "puedes revisarlas abriendo el archivo", so the owner edits the file by hand. One bad line later, they can no longer see any message at all. The page says "try again in a moment" and nothing points to the cause. | data |
| 6 | Without JS, any rejection that isn't a field error (429 rate limit, 413 too large, 503 can't save) re-renders the form **empty**. `falla()` calls `paginaContacto({ errores, aviso })` without `valores`. Field-validation errors do keep the values. | `node tools/http-tests.mjs` → `100KB fields: 413 … El mensaje es demasiado largo. Nombre Correo electrónico Mensaje No llenes…` (all fields empty). The typo case by contrast keeps them: `kept values: true true true`. The same `falla()` path serves the 429 and 503 answers. | A customer with JS off who hits the 5-per-10-minutes limit (a shared office or family IP) or the full file loses the long message they typed, and is told to try again later. | form |

### Checked and held (no finding)

- **Load / images:** `GET /` 200. All four SVGs return 200 `image/svg+xml`. Each `<img>` has a descriptive `alt` and `width`/`height`, and `aspect-ratio` is set on the cards.
- **Form paths (2):** empty submit → 400. With JS, the error appears under each field and focus goes to `#nombre`. Without JS, the server page shows the errors with `aria-invalid` ×3. Typo (`J` / `juan.correo.com`) → the email error appears under the field, focus goes to `#correo`, values are kept, and the status box is in view (`shots/m-js-typo.png`). A one-letter name is accepted, which is reasonable. Good path → the green status is in view right under the button.
- **Double click with JS (3):** `saved 1` (the `enviando` guard works).
- **HTML in a message (4):** `/admin` shows `&lt;img src=x onerror=&quot;alert(1)&quot;&gt;`, with no raw `<img`/`<b>`, and the CSP is `default-src 'self'`.
- **Server without the page (5):** no fields → 400. JSON array → 400. 100 KB → 413. 2500-char message → 400 "Máximo 2000 caracteres". PUT/DELETE/PATCH → 405. Cross-origin and `Origin: null` POST → 403. 2000 × "ñ" through the no-JS form (12 KB body) → 200, under the 16 KB cap.
- **File server (6):** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e/…`, `/..%5c…`, `/datos/mensajes.jsonl`, `/..%2fdatos%2fclave-admin.txt` and a missing file → all 404, with no source or data leaked. `/%00` and bad `%` encoding → 400.
- **Admin (7):** no credentials → 401 Basic, including `/admin/` and `/admin/borrar-todo`. A cross-site POST to `borrar-todo`, even with valid credentials → 403. The default password is random (12 chars), stored in `datos/clave-admin.txt` and printed at startup. Caveat: it's Basic auth over plain HTTP, fine on localhost but it needs HTTPS once deployed.
- **Mobile (8):** home at 375 px has `scrollWidth 375`. No tap target is under 24 px. The nav links are 27–36 px tall, under the 44 px comfort size but above WCAG 2.2 AA (`shots/m-hero.png`, `webcheck/phone.png`).
- **Keyboard (9):** Tab order is brand → 3 nav links → "Escríbenos" → name → email → message → button. The trap field is skipped (`tabindex=-1`). Every stop has a 3 px solid outline. Enter submits.
- **Contrast (10):** white on `#b23a0a` buttons ≈ 9:1. Hero text sits on a 75 % dark overlay and reads clearly in the screenshots.
- **Saved data (11):** JSONL with serialised appends. 50 concurrent posts → 5 saved, 45 × 429, and every line parses. A truncated last line gets a newline prefix before the next record, so the next record is intact and the owner sees "Hay 1 línea dañada".
- **Builder's claims (12):** every concrete claim in the summary matched what I ran. The button is never disabled. Focus goes to the status on success and to the first invalid field on error. There's the 5 / 10 min IP limit, the honeypot, search and delete-marked, the 5-wrong-per-minute lockout, and the newline-on-truncation behaviour. The builder said honestly that none of it had been run. No false claim.

### Note on `web-check.mjs`

The checker reported **✕ WEB-3** ("with JavaScript off, submitting shows nothing new"). That was a false alarm. The page sets `html { scroll-behavior: smooth }`, so `scrollIntoView()` in `fillJs` animates, and the checker clicks the button's *pre-scroll* coordinates, which miss the button. When I scrolled instantly and clicked, the JS-off submit went to `/contacto` and showed "Mensaje enviado" (good), the error page (empty) and the email error (typo). The checker should set `scrollBehavior='auto'` or wait for the scroll to settle before reading the coordinates.

## Candidate lessons

Finding 1 is lesson **49** exactly (a general `.seccion h2` margin silently beating the band's specific centring), so there's no new lesson. Finding 5 is a variant of **WEB-1**: I propose it as a refinement ("a line that *parses* but is incomplete counts as damaged too; validate every field the renderer relies on, and render a bad record as a bad record, not as a crash of the whole list"), not a new number. Finding 4 is lesson **41** (nobody looked at the admin page on a phone). Findings 2, 3 and 6 are not one-off slips:

### WEB-?. An error message must not send the person somewhere the site doesn't have

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** When an error tells a person what to do next ("call us", "use the chat", "see the FAQ"), that thing must exist and be reachable from where the error appears. Otherwise the error is a dead end.

**Example.** A bike shop's contact form refused messages once its store hit its size cap, and said "inténtalo de nuevo en unos minutos o escríbenos por teléfono". The site had no phone number anywhere. It was found by filling the store past the cap, submitting, and then searching the page for a phone.

**Detector question.** For every fallback an error message names, can the person reach it from the screen where the error appears, without leaving the site?

**Warning sign.** "I'll give them an alternative in the message, so the failure isn't a dead end."

**What to do.** List every error string, grep each for the alternative it offers, and put that alternative (the number, link or address) inside the message itself, or drop the suggestion.

### WEB-?. A form that works without JavaScript answers a POST with a redirect

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** The no-JS path of a form that saves something must answer a successful POST with `303 See Other` to a GET page. A `200` page left at the POST URL gets re-sent by reload, back/forward, or a phone restoring the tab.

**Example.** The bike shop's contact form rendered "Mensaje enviado" directly as the POST response. Reloading that page in a browser with JS off saved the same message a second time. It was found by submitting with JS off, reloading, and counting the lines in the store (1 → 2).

**Detector question.** With JavaScript off, after a successful submit, what is the URL and method of the page I'm on, and what does reload do to the store?

**Warning sign.** "The fallback shows the thank-you page, so it works."

**What to do.** Send `303 Location: /gracias` (or `/?enviado=1`) after saving. Re-render the form directly only on errors. Test it by submitting, reloading and counting the records.

### WEB-?. Every rejection keeps what the person typed, not only the validation errors

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** If the server re-renders a form after a refusal, every refusal path (rate limit, too large, server can't save) must put back what the person typed, not only the "field invalid" path.

**Example.** The bike shop's no-JS form kept the values when the email was mistyped, but the 429, 413 and 503 answers came from a shared `falla()` helper that rendered the form without values. A customer stopped by the rate limit lost the whole message. It was found by sending a too-large body and seeing an empty form come back.

**Detector question.** List every status this endpoint can return besides 200. In each one, is what the person typed still in the fields?

**Warning sign.** "Validation errors keep the values, so the form keeps the values."

**What to do.** Route every refusal through the same render call with `valores`, or keep the draft client-side. Test each non-200 status, not only 400.
