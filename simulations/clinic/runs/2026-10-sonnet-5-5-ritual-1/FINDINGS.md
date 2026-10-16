# Findings — Fisio Andares (blind review)

Build reviewed: `servidor.mjs`, `publico/`, `privado/`, `prueba.mjs`. No README. The only way to start or test it that the build documents is in two comments: `// Uso: node servidor.mjs` and `// Prueba automática: node prueba.mjs`.

How it was run: `node servidor.mjs` with `PORT`/`DATOS_DIR` set by a small launcher, so no data was written into the build folder. Probes used raw `http.request` from Node (`probe.mjs`, `data.mjs`). Browser checks drove headless Chrome over CDP (`browser2.mjs`, `browser3.mjs`). The build's own `node prueba.mjs` passes 27/27.

## What held (tried, did not break)

- Server validation does not depend on the browser. Empty body → 400 with every field listed; phone `55abc12345` → 400; email without `@` → 400; past date, Sunday `2026-10-18`, `20:00`, `18:00`, `2026-02-30` → 400 with the right message; 100 KB field → 413; `text/plain` → 415; GET/PUT/DELETE/PATCH `/api/citas` → 404.
- File server: `/../servidor.mjs` → 404; `/..%2f..%2fservidor.mjs`, `/..%2fservidor.mjs`, `/..%5cservidor.mjs` → 403; `/datos/`, `/datos/citas.jsonl`, `/datos/clave.txt`, `/privado/admin.html`, `/servidor.mjs` → 404; `/admin.js` without a session → 401.
- HTML in the name and comment is shown as text in the panel. Chrome at 375 px: `#lista img` = 0, `#lista b` = 0, no dialog fired. The card heading reads literally `<b>hola</b><img src=x onerror="alert(1)">`.
- Admin API without the password: list, PATCH and PATCH with a forged cookie all → 401. PATCH with urlencoded body + valid cookie → 415 (blocks CSRF by form post).
- Login: 20 wrong passwords from one IP → `401,401,401,401,429,429,…`. The correct password after the lockout → 429. The generated password is 12 random base64url characters.
- Form in Chrome (1280 and 375 px): empty, bad phone, bad email, past day and Sunday all show an error summary that is in view and takes focus, plus an error under each field. Hours offered are 09:00–17:00 only. `dia.min` = today.
- Double click on submit in Chrome → 1 record saved. Success box shown, in view, focused.
- Keyboard: the focus ring is visible on every stop. The skip link goes to the form. Enter on submit with errors → focus on the summary; Tab → the first error link; Enter → that field.
- With `app.js` blocked or JS disabled, a valid submit → `/gracias.html` ("¡Solicitud enviada!"). Browser validation catches `correo=mal`.
- Concurrency: 300 parallel POSTs + 50 PATCHes → 300×201 + 50×200, 301 records after restart, final status kept (`appendFileSync` is synchronous).
- Crash mid-write at the end of the file (torn last line) → server starts in 90 ms, warns, adds a newline. The next request is saved and survives a restart.
- Public page at 375 px: `scrollWidth 375 = clientWidth 375`. All 4 images load and have descriptive `alt` plus `width`/`height`. Button text contrast is 6.02:1, error red 6.54:1.

## Findings

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The "Volver y corregir" button on the no-JS error page does nothing | Chrome, `app.js` blocked, Sunday submitted → `/api/citas` "Revisa tu solicitud · Atendemos de lunes a viernes… · Volver y corregir"; link `href` = `javascript:history.back()`; click → `navigated= false`; console: `Running the JavaScript URL violates the following Content Security Policy directive 'script-src 'self''`. Same with JS fully disabled (`navigated= false`). | This page is only ever shown when JS failed or is off. The patient taps the one button offered, nothing happens, and they may give up. Only the browser's own Back button gets them out. | form |
| 2 | A record saved after the store is damaged at runtime is silently lost on the next restart | `data.mjs crash`: append `{"nota":"editado a mano sin salto de linea"}` (no newline) while the server runs → POST "Victima" → 201; in memory `Victima,Despues,Antes`; after restart `Despues,Antes`; boot log `AVISO: 2 línea(s) dañada(s)`. The tail of the file still holds Victima, glued onto the bad line. | The patient was told "¡Solicitud enviada!" and nobody calls them. The owner only gets a console warning at boot, which says lines were "ignored". | data |
| 3 | A long name breaks the clinic's panel on a phone (horizontal scroll) | Chrome 375 px, `/admin` with an 80-character name → `{"sw":917,"cw":375}`. Screenshot: the `h3` runs off the card to x≈917. `dd` has `overflow-wrap:anywhere`; `.solicitud h3` does not. | The owner, on her phone, has to pan sideways through the whole list. The cards and buttons sit in a column that is now a third of the page. | mobile |
| 4 | Every status change re-renders the whole list; slow with many requests | Chrome 375 px: 1 000 records → list 266 ms, one "Confirmar" 195 ms; 10 000 → list 1 643 ms, one "Confirmar" **2 802 ms**, 210 001 DOM nodes. Server side `GET /api/admin/citas` sends everything (10 000 → 3.3 MB, 100 000 → 33 MB). 20 parallel loads at 100 k delay a public POST to 1 461 ms. | After a year or a bot wave, each confirm freezes the owner's phone for ~3 s. A patient submitting while she loads the panel waits too. | server |
| 5 | Bots that skip the honeypot flood the list; no search, no bulk delete | `data.mjs spam`: 1 000 POSTs from rotating IPs → 1 021 saved, the real one at position 21; `DELETE /api/admin/citas`, `PATCH /api/admin/citas` → 404. In the panel, deleting is one click plus a `confirm()` per request. | One morning the owner finds 1 000 "buy cheap pills" requests and has to click Eliminar + OK 1 000 times to find the real patients. | security |
| 6 | Invalid submissions use up the rate limit, then a valid request is refused | `probe.mjs form`: 10 invalid POSTs then 1 valid from the same IP → `400×10,429,429`. The counter runs before validation and counts every attempt for 10 minutes. | On the no-JS path every mistake reaches the server. A patient who corrects the form a few times (or a clinic on one shared office IP) gets "Enviaste muchas solicitudes seguidas" on the right attempt. | server |
| 7 | After confirming a card, the page jumps to the top and the card disappears | Chrome 375 px, 5 requests, "Confirmar" on the 3rd card at `scrollY 1012` → after: `scrollY 0`, `articles 4`, focus `P#aviso "Solicitud de Persona 2: confirmada."`. Same after "Cancelar" in the Confirmadas view (`articles 0`). | The owner going through the list loses her place after every click and must scroll back down. The confirmation itself is visible, but only because the page moved. | accessibility |
| 8 | The focus ring is low-contrast against the page backgrounds | Computed in Chrome: `#f2a900` ring vs white **2.01:1**, vs cream `#f6f3ec` **1.81:1** (WCAG 1.4.11 asks 3:1). | Someone with low vision who uses the keyboard can lose track of where they are in the form, which sits on the cream section. | accessibility |
| 9 | JSON with the wrong types gives 500 instead of 400; an array is accepted | `probe.mjs form`: body `null` → 500 `Error del servidor`; `nombre: {toString:1}` → 500 with a stack in the log; `nombre: ['a','b']` → 201, stored as `"a,b"`. | No person sees this through the page. A bot or broken client fills the log with stack traces, and junk names get stored. | server |
| 10 | The server accepts the same request twice | `probe.mjs form`: two identical parallel POSTs → `[201, 201]`, panel shows "Doble Clic" twice. (The JS guard prevents it in the browser: 1 record. The no-JS path has no guard.) | With JS off, a double tap creates two requests, and the owner may call the patient twice or confirm a slot twice. | data |
| 11 | No instructions on how to test it, although the request asked "dime cómo lo pruebo" | `Glob **/*` → no README. The password is only printed to the console on the first run (`Contraseña generada (guardada en datos/clave.txt)`). The comment in `servidor.mjs` covers startup only. | The owner starts it, closes the terminal, and doesn't know where the password is or how to check that the form works. | false claim |
| 12 | Two comments claim more than the code does | `app.js:1` "Sin este archivo el formulario sigue funcionando" → see #1, the error path's only button is dead. `servidor.mjs:46` "Una línea dañada… nunca tumba… la siguiente solicitud" → see #2. | The next person maintaining it trusts the comment and skips the check. | false claim |
| 13 | Odd routing responses | `GET /admin/foo` → 405 "Método no permitido" (should be 404); `GET /%` → 200 with the home page. | Minor: a mistyped admin URL says "method not allowed", which is confusing. | server |

## Candidate lessons

### Findings 1 and 12 (dead fallback button, false comment): already covered

Lesson **WEB-3** (a fallback nobody tested is not a fallback) and lesson **49** (a general rule must not silently beat the specific ones): the site-wide CSP `script-src 'self'` silently kills the page's own `javascript:` link. Lesson **41** also applies: `prueba.mjs` checked the no-JS error page by finding the text `Revisa tu solicitud` in the HTML, not by clicking the button. No new lesson. Suggested refinement for WEB-3's detector question: "…and does the one control on that fallback page work under the same headers (CSP) and without JS?"

### Finding 2 (repair only at startup): covered by WEB-1

Suggested refinement: the store had a "repair the torn last line" step, but it ran only at boot. Damage that happens while the server runs merges the next record into the bad line, and that record is lost on restart. Add to the detector question: "…and if the damage happens while the server is running, not before it starts?"

### Finding 4 (re-render everything per click): covered by lesson 46

The per-request cost here is client-side (repaint of all cards per status change) as well as the server sending the whole store.

### Finding 5 (bot flood, no bulk tools): covered by WEB-2

### Finding 7 (jump to top after the card disappears): refines WEB-4

The button that had focus is removed by the re-render (the card leaves the "Pendientes" view). Focus falls back to a message at the top of the page, so the owner loses her place. Suggested variant for WEB-4: "If the action removes the item, focus goes to the next item, not to the top."

### Finding 3: new lesson

### Every place that prints a stranger's text needs the long-word rule

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** Text typed by other people (names, emails, comments) can be one long word. Every element that shows it needs a wrap rule, not just the one you were thinking about when you added it.

**Example.** A clinic's admin panel showed each appointment request as a card. The details list (`dd`) had `overflow-wrap:anywhere`, so long emails and comments wrapped fine. The card's heading, which shows the patient's name, had no rule. An 80-character name with no spaces stretched the page to 917 px on a 375 px phone, and the owner had to pan sideways through the whole list. It showed up only when the review loaded a long name at phone width.

**Detector question.** For each element that prints user-supplied text (headings, badges, buttons, table cells, titles), what happens at 375 px when that text is 80 characters with no spaces?

**Warning sign.** "I already added `overflow-wrap` to the fields."

**What to do.** Put the wrap rule on the container that holds user content (`.card { overflow-wrap:anywhere; min-width:0 }`), not on individual children. Then load one record with a maximum-length, space-free value in every field and check `scrollWidth === clientWidth` at 375 px.

### Finding 6: new lesson

### A rate limit must not spend a person's corrections

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** A limit that counts every attempt before validating turns a person's honest retries into a lockout. Count what you want to limit (accepted records), or count failures separately and more generously.

**Example.** A public appointment form allowed 10 submissions per IP per 10 minutes. The counter ran before validation, so rejected attempts counted too. With JS off, every mistake reached the server: after 10 invalid tries the 11th, correct, request got 429 "Enviaste muchas solicitudes seguidas". A whole office behind one IP shares the same counter.

**Detector question.** After a person makes N mistakes and then gets it right, is the right one accepted? Which N blocks them, and does that N assume one person per IP?

**Warning sign.** "Ten per ten minutes is more than anyone needs."

**What to do.** Increment the success limit only when a record is stored, and keep a separate, larger limit for rejected requests. Test it by sending N invalid requests followed by one valid one from the same address.

### Finding 8: new lesson

### A focus ring has to contrast with every background it lands on

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** One global `:focus-visible` colour is checked against one background, usually the one where it looks best. Measure it against every surface a focusable element sits on.

**Example.** A site used a 3 px amber ring (`#f2a900`). On the dark green header it was fine (≈3:1). On the white cards it was 2.01:1, and on the cream form section, where most Tab stops are, 1.81:1, below WCAG's 3:1 for focus indicators.

**Detector question.** For each background that has focusable elements on it, what is the contrast ratio of the focus ring against it?

**Warning sign.** "It's bright yellow, you can't miss it."

**What to do.** List the page's background colours and compute the ring's contrast with each. If one colour can't pass everywhere, use a two-tone ring (`outline` plus `box-shadow` in a contrasting colour).
