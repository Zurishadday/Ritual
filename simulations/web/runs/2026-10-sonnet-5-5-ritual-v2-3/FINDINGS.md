# FINDINGS: Taller Rueda Libre (contact form page)

Reviewer: claude-opus-5-5 · 2026-10. Build by claude-sonnet-5-5.

**How it was run.** The build was copied to a scratch folder (`%TEMP%\rv-kn8\app`) so test data stayed out of the build. The copy was started with `node servidor.mjs` (PORT/HOST/CLAVE_ADMIN set by a Node launcher), and a fresh server was used for each batch because of the 8-per-IP limit. HTTP probes used Node `http` (raw paths, chosen source address `127.0.0.x`). The browser checks drove headless Edge over CDP, plus `web-check.mjs`. Scripts: `%TEMP%\rv-kn8\probe1-4.mjs`, `cdp2.mjs`, `cdp3.mjs`. Screenshots: `%TEMP%\rv-kn8\shots\` and `shots2\`. Every server I started was stopped. The build folder was not touched, except for this file and `verdicts.json`.

**Overall.** This is a careful build. Paths are protected, output is escaped, the CSP is strict, the fallback without JavaScript works, focus is handled, the login has a limit, and the store survives damage. The real problems are where the defenses meet scale. With about 100 bot messages from 13 addresses, the global brake turns away every real customer for an hour. And `/admin` reads the whole file on every visit.

## Table

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | **The global brake lets bots shut the form for everyone.** The "100 saved per hour" limit is shared by all visitors. A bot that spreads over 13 addresses (8 each, honeypot left empty) uses it up. Every real customer then gets 429 for an hour, and nobody tells the owner. | `node probe4.mjs 3521 flood` (server on 0.0.0.0, requests from 127.0.0.10–22): `bot statuses { '303': 98, '429': 6 }`, then a new address `127.0.0.99`: `real customer from a fresh address: 429 Retry-After 3600s Estamos recibiendo muchos mensajes…`. Admin: `total 99 · link badges 0 · Página 1 de 2`. | A customer with a brake problem sees "try again in a while" and goes to another shop. The owner opens /admin, finds 99 bot messages, and never learns that real people were turned away. A bot can repeat this every hour and keep the form closed for good. | security / form |
| 2 | **`/admin` reads and parses the whole message file on every visit.** It shows only 50 messages, but time grows with the file, and concurrent loads fail. | `node probe4.mjs 3521 scale`: `0 msgs: /admin 16ms` · `10000 msgs (16 MB): 43ms; 20 at once 509ms` · `20000 msgs (32 MB): 67ms; 20 at once 19986ms (statuses 200,0)` (status 0 = connection failed) · `40000 msgs (64 MB): /admin 688ms, 19483ms`. Bots can add up to 100 messages an hour (≈2,400 a day), so 40k is reachable in about 17 days of flooding. Deleting also rewrites the whole file. | After a few weeks of spam, the owner's admin page takes seconds to load, and sometimes fails, while they try to find real messages. | server / data |
| 3 | **The keyboard focus ring almost disappears on the dark header and at the bottom of the photo.** One global `:focus-visible { outline: 3px solid #1d4ed8 }` is used on every background. | Computed in `cdp2.mjs … contrast`: `focus ring #1d4ed8 on header #0f3d3e: 1.78`, `on hero bottom #081c1d: 2.62` (WCAG 1.4.11 asks for ≥ 3:1). It's `6.59` on the page background. Screenshot `shots2\focus-header.png`: a dim navy box on dark green around "Servicios". | A keyboard user tabbing through the menu and the "Escríbenos" button has trouble telling which link is selected. | accessibility |
| 4 | **Rejected submissions count toward the per-address limit.** `limiteEnvios.anotar(ip)` runs before validation, so mistakes use up the 8-per-10-min allowance. | `node probe2.mjs 3517 a`: 4 accepted and 4 rejected (empty, bad email, 413, bad JSON) from one address, then a good 9th message: `9 one more good one (9th) 429`. `web-check` passed only because it uses 6 rejections: `✓ 49 · after 6 rejected submissions (422), a good one was accepted`. | It's rare for one person. But everyone behind one IP shares the 8-per-10-min limit: an office, a carrier NAT, or the server behind a reverse proxy, where every visitor looks like 127.0.0.1. After a few typos from any of them, a real customer is refused. | form |
| 5 | **The server doesn't remove duplicates.** Two identical submissions are saved twice. With JavaScript the `enviando` flag guards it, but without JS (or on a double tap during a slow submit), both get saved. | `node probe2.mjs 3518 b`: two simultaneous identical POSTs, `303, 303`, `saved copies of the double-click message: 2`. With JS in Edge (two clicks): `Gil copies: 1`. | The owner sees the same message twice. It's an annoyance, nothing is lost. | form / data |
| 6 | **JSON fields of the wrong type are turned into text and accepted.** | `probe2 … 7 JSON wrong types 200 {"ok":true}`, saved as `"nombre":"[object Object]"`. The admin shows `<strong>[object Object]</strong>`. | Only a script would send this. It's junk in the inbox and a sign the server checks presence but not type. (One-off slip.) | server |
| 7 | **The 405 for `PUT /contacto` says `Allow: GET, HEAD`, but `/contacto` only accepts POST.** | `probe1`: `PUT /contacto 405 GET, HEAD`, `GET /contacto 404`. | Nobody sees it, except someone debugging with curl. (One-off slip.) | server |

### Checked and held (evidence)

- **Page and images:** `/` 200, all four SVGs 200 `image/svg+xml`. Every `<img>` has descriptive alt text and `width`/`height`. Screenshots `shots\desktop.png`, `shots\phone.png`.
- **The three form paths (with JS, Edge):** Empty → three errors next to the fields, focus on `#nombre` (screenshot `shots2\js-empty.png`). `anaexample.com` and `ana@ejemplo` → error next to the email field, focus on `#correo`. Good → `¡Gracias, Fer! Recibimos tu mensaje…`, in view, focus on `P#estado`, fields cleared. A name of one letter (`A`) is accepted, which is reasonable.
- **Without JS (Edge, scripts disabled):** Good → `/gracias.html` "¡Gracias! Recibimos tu mensaje." Empty → native `required` bubble "Rellene este campo." Server-rejected email `eva@ejemplo` → 422 page with the field error, what the person typed kept (`E | eva@ejemplo | correo sin punto`). Note: `web-check.mjs` reported `✕ WEB-3 … shows nothing new`. That is the checker's artifact, not the build. The site sets `html { scroll-behavior: smooth }`, the checker reads the button's position right after `scrollIntoView()` while the scroll is still moving, and its click misses (its screenshot shows the form still filled). With an instant scroll before clicking, the same submission works (above).
- **HTML in a message:** saved raw and shown escaped in /admin: `&lt;b&gt;hola&lt;/b&gt; &lt;img src=x onerror=&quot;alert(1)&quot;&gt;`. A strict CSP is also set (`script-src 'self'`).
- **What the server takes without the page:** no fields → 422 with all three errors. 100 KB fields → 413. GET → 404. PUT/DELETE → 405. Empty JSON array → 422.
- **File server:** `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e/servidor.mjs`, `/..%5cservidor.mjs`, `/datos/mensajes.jsonl`, `/datos/clave-admin.txt`, `/%00` → all 404. Bad percent-encoding → 400.
- **Admin:** no credentials → 401 Basic. Correct password → 200. Bad passwords 1–5 → 401, 6–7 → 429 `Retry-After 60`. `POST /admin/borrar` without auth → refused. Deleting from the admin works (`303 /admin?pagina=1&borrados=1`).
- **Mobile 375 px:** `scrollWidth 375`. The only target under 24 px is the hidden honeypot. The sticky header is 88 px tall and doesn't cover `#contacto` after the menu jump (`h2 top 144 vs header bottom 88.6`).
- **Keyboard:** Tab order is brand → Servicios → Visítanos → Contacto → Escríbenos → nombre → correo → mensaje → button. The honeypot is skipped. Enter on the button submits, and focus goes to the status message.
- **Text contrast:** white text over the photo, sampled with the text hidden: desktop h1 worst 4.56, phone h1 worst 2.96 on 0.1% of samples (large text, at the sun's edge), p ≥ 6.4. Button 5.18. Error 6.05.
- **Concurrent writes:** 6 simultaneous distinct messages → `concurrent saved 6`.
- **Damaged store / crash mid-write:** I added half a record with no newline, plus `null`, `{"id":5}` and NUL junk. The next message was saved fine. /admin showed both real messages and "Hay 4 línea(s) dañada(s)…". Deleting a message kept the damaged lines.
- **The builder's summary (#12):** I checked every factual claim: focus targets, 8/10 min per IP, 100/hour global, 5 failures/min then 429, the fallback without JS keeping what was typed, damaged lines ignored and kept, the "contiene enlace" label, bulk delete. All are true. The builder also said honestly that nothing was run. No false claims found.

## Candidate lessons

Finding 2 is covered by core **lesson 46** (`seen` confirmation: claude-sonnet-5-5 2026-10). It needs no new lesson. Findings 5–7 are one-off slips. Finding 5 is the server half of lesson 45's "two clicks".

### Candidate (refines WEB-2): A brake shared by everyone is a door the bots can close

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** A limit on everyone together (so many messages per hour for the whole site) doesn't stop bots. It hands them a switch: once they use it up, every real person is refused, and the owner never finds out.

**Example.** A bike shop's contact form had a honeypot, 8 messages per address per 10 minutes, and 100 saved messages per hour for the whole site. A script spread over 13 addresses sent 104 messages. 98 were saved and filled the inbox, and the next real customer got "Estamos recibiendo muchos mensajes… Retry-After 3600". The admin showed 99 bot messages and no sign that anyone had been turned away.

**Detector question.** When this limit is reached, who gets refused: the sender who used it up, or everyone? And how does the owner find out that real people were refused?

**Warning sign.** "A global cap as a last line of defense" · "100 an hour is far more than a small shop ever gets."

**What to do.** Put limits on the sender (address, or address range), not on the whole site. If you need a global safety valve, have it set messages aside as "held for review" instead of refusing them, and show the owner a count of what was held or refused. Test it with a script that rotates source addresses, then send one real message and check that it gets through.

### Candidate: A focus ring checked on one background is invisible on another

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface-and-design` · `packages: web, apps`

**The idea.** One focus-outline color is set for the whole site and checked against the page background. Where the page has a dark header, a photo or a colored band, that same color can fall below 3:1 and the focus disappears.

**Example.** A site set `:focus-visible { outline: 3px solid #1d4ed8 }`. On the cream page it measured 6.6:1. On the dark green sticky header it measured 1.78:1, and at the dark bottom of the hero photo 2.62:1. The menu links and the main "Escríbenos" button, the first five Tab stops, are the ones a keyboard user can barely see.

**Detector question.** On every background where something focusable sits (header, hero, footer, colored cards), does the focus ring reach 3:1?

**Warning sign.** "I added a visible focus style for the whole site."

**What to do.** List each background that has focusable elements on it, and measure the ring against each one. Use a two-tone ring (for example a light outline plus a dark `box-shadow`), or set the color per area. Tab through the page once and take a screenshot of the header and the hero with focus on them.

### Candidate: A limit that counts mistakes punishes the people it should help

`origin: lab · claude-sonnet-5-5 · 2026-10` · `packages: web, apps`

**The idea.** If the per-sender limit counts a submission before checking it, every correction a person makes uses up their allowance. On a shared address the corrections of several people add up.

**Example.** The contact form counted each POST toward "8 per address per 10 minutes" before validating it. After 4 good and 4 rejected submissions from one address, a good 9th one got 429. The site's own server binds to 127.0.0.1, so behind a reverse proxy every visitor shares that one address.

**Detector question.** Does the limit count attempts or accepted messages? And how many different people share the key it counts by?

**Warning sign.** "I count first so a bot can't send endless invalid requests."

**What to do.** Count accepted messages toward the person's limit. Limit raw request volume separately, with a much higher threshold. Find out the client's real address behind a proxy before you limit by it. Test with six mistakes followed by a good message, and with two people behind one address.

Note: the Ritual `web-check.mjs` maps this to lesson 49 and checks it with 6 rejections, which passed here. With 8 it would fail. Consider testing up to the limit, not under it.
