# Findings: Fisio Andares (blind review)

**How it was run.** There is no README. The only start instruction is the header comment in `servidor.mjs` (`node servidor.mjs`, with optional `PORT`, `ADMIN_PASSWORD` and `DATOS_DIR`). I started it four times through a small Node launcher, each on a fresh port and data folder:

- 3917: empty data folder.
- 3918: seeded with 20,001 requests.
- 3919: seeded with a truncated `citas.json`.
- 3920: empty data folder, used for the browser tests.

Browser checks ran in headless Chrome, driven over the DevTools protocol from Node: 375×667 touch emulation and 1024×768 desktop. All servers and browsers were stopped at the end. Scripts and screenshots are in `%TEMP%\review-clinic-scratch\`.

**What held, briefly:**
- The page loads and all 4 images show (`complete && naturalWidth>0`). Every image has a useful alt text.
- The server validates everything the browser validates: empty fields, phone with letters, email without "@", a past day, today at an hour that has passed, Saturday, Sunday, 20:00, 17:30, Feb 30, an unknown treatment, array values and 101-char names all get a 400. A 100 KB body gets a 413. Other methods get a 401 or 405.
- Path traversal (`/../servidor.mjs` sent raw, `/..%2f..%2fservidor.mjs`, `%5c`, `%2e%2e`, `%00`) gets a 404, as do a missing path, the data folder and directories.
- An HTML payload in the name and comment is shown as text in the admin page: no `<img>`/`<b>` inside `#lista`, and no dialog fired.
- The PATCH/DELETE routes reject a missing or bad token with a 401.
- 40 parallel POSTs plus a PATCH all landed: 44 records on disk and the PATCH state kept. A stale half-written `.tmp` and a `.tmp` directory do not block the next write.
- With 20k records: the list takes 27 ms, a full-scan search 19 ms, 50 concurrent searches 184 ms, and a POST 25 ms.
- Keyboard: every stop has a 3 px outline and stays in view. Enter on the submit button sends the form, focus moves to the status message, and the next Tab goes to the phone link.
- Without JavaScript, the browser's own validation stops an empty form, and a bad day gets a server-rendered error page.
- At 375 px there is no horizontal scroll on either page, even with a 100-char name, a long email and a 490-char unbroken comment.
- Two real taps on submit saved 1 request.

| # | What broke | Evidence | What happens to a real person | Class |
|---|---|---|---|---|
| 1 | The login lockout does not limit guessing. The right password is checked **before** the lock, and after 5 failures the 429 answers instantly, with no delay. | `http2.mjs`: `wrong passwords in 20s: 2902 -> {"401":5,"429":2897} (~8706/min)`, then `correct password after 2902 failures -> 200`. 200 parallel guesses took 328 ms. A "locked" client that sends the right password gets a 200. | If the owner sets `ADMIN_PASSWORD` to something human (e.g. `fisio2026`), a script can test ~12 million guesses a day and reads every patient's name, phone and email. The comment "cada fallo tarda un poco en contestar" makes the owner believe it is protected. | security |
| 2 | The 10-requests-per-IP-per-hour cap is check-then-act across an `await`, so a parallel burst passes it in full. | `http3.mjs`: `40 parallel posts + 1 patch -> {"201":40,...}`, `Rafaga saved: 40`. One sequential POST afterwards gets a `429`. | A bot that sends in parallel fills the list anyway. The owner then deletes fakes one by one, each with a `confirm()` dialog, because there is no bulk delete or "mark as spam". | security |
| 3 | On a phone, the error text for the most common mistakes appears off-screen. The message sits under the submit button, and focus jumps to the first bad field far above it. | 375×667, `b1.mjs`: `case empty: {msg:"Escribe tu nombre. …", msgInView:false, msgTop:1083}`. The same happens for a phone with letters (`msgTop:981`) and an email without "@" (`msgTop:889`). Screenshots `case-empty.png` and `case-phone_letters.png` show only red borders. | The person presses "Enviar solicitud" with an empty field or a typo and sees fields turn red, with no word about what is wrong. Many will think the form is broken, or call instead. | form |
| 4 | Without JavaScript (or if `cita.js` fails to load), any server-side error loses everything the person typed. "Volver al formulario" is a link to `/#cita`, not a step back. | `b3.mjs` with scripts disabled: submitted a Sunday with all fields filled, then tapped "Volver al formulario" → `url http://localhost:3920/#cita \| fields: nombre= telefono= correo= tratamiento= fecha= hora= comentario=`. | Someone on a slow or old phone who picks a Saturday has to type the whole request again, comment included. Some give up. | form |
| 5 | Field borders have 1.45:1 contrast against white (WCAG 1.4.11 asks for 3:1). On mobile the only visible error cue is a colour change of those borders (see #3). | `b2.mjs` contrast: `fieldBorderVsWhite: '1.45'` (`#cfd8d6` on `#fff`). | People with low vision, or anyone outdoors in sunlight, struggle to see where the inputs are. A colour-blind person can't tell which field went red. | accessibility |
| 6 | The general `.boton:hover` rule beats the hero's own `.portada .boton` (same specificity, declared later). On hover the hero button turns the same dark green as the veil behind it. | `b2.mjs`: `hero button on hover: bg rgb(20, 80, 75)`. Button vs veil: `heroBtnHoverVsVeil: '1.17'`. Screenshot `hero-hover.png`: the button nearly disappears. | On desktop, the main call to action blends into the hero the moment the mouse reaches it. | accessibility |
| 7 | A damaged `citas.json` is moved aside **silently** from the owner's point of view. The admin page says there are no requests, and the only notice is a console line. | Server 3919 with a truncated file: `files … citas.danado-1792125148783.json`, then `admin list -> 0 rows, conteo {"total":0,…}`. The page text is "Todavía no hay solicitudes." The next POST gets a `201`, so new records are safe. | The owner opens the page, sees an empty list and assumes nobody wrote. The patients whose requests are in the set-aside file never get a call. | data |
| 8 | A comment claims each failed login is slowed down. Only the first 5 are. | `servidor.mjs:299-300`, "cada fallo tarda un poco en contestar", vs. 2,897 instant 429s in 20 s (#1). | The owner, or whoever maintains it, trusts a protection that isn't there. | false claim |
| 9 | A past day is reported on the **hour** field: the server returns `campo:"hora"`. | `b1.mjs`: `case past day: {msg:"Elige una fecha y hora futuras.", focus:"hora", invalid:["hora"]}`. | The person changes the hour, resubmits and gets the same error. The day is what is wrong. | form |
| 10 | The per-IP cap also blocks legitimate people sharing an address. The 11th request in an hour from one IP gets a 429. | `http3.mjs`: `one more post after burst -> 429` ("Demasiadas solicitudes. Inténtalo más tarde."). | On shared Wi-Fi or a carrier NAT, a real patient is turned away with no phone number on the error to call instead. | form |
| 11 | No `width`/`height` attributes on any image. | `b1.mjs`: `wAttr:null,hAttr:null` for all 4. In practice the CSS `aspect-ratio` and fixed hero height avoid layout shift. | Low impact today. It would shift if the CSS failed or the images were swapped for photos without the same rules. | accessibility |
| 12 | No README or "how to test" in the build, although the request asked for it. The admin password exists only in the console output and `datos/clave.txt`. | The folder has only `servidor.mjs` and `public/`. The header comment is the only instruction. | The owner restarts the server, loses the console line and doesn't know where the password is. | false claim |

Also noted, not counted as findings:
- The server itself doesn't de-duplicate two identical POSTs (`[201, 201]`). The page's `enviando` guard covers real double taps.
- The 80% veil makes the hero "photo" barely visible (`hero-hover.png`), even though the request asked for a portada with a photo.

## Candidate lessons

### A limit checked before an `await` and recorded after it is not a limit

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: scripts-and-files` · `packages: web, apps`

**The idea.** A counter is a limit only if it is checked and incremented without an await between the two steps. If the check runs, then the code waits (a disk write, a DB call), and only then records the use, every parallel request sees the same "under the limit" value and passes.

**Example.** A clinic's request form allowed 10 requests per IP per hour. `cupoCita(ip)` checked the list, then `await transaccion(...)` wrote to disk, and only then did `registrarCita(ip)` push the timestamp. Sent one by one, the 11th was rejected. Sent as 40 parallel POSTs, all 40 were saved. A one-line `Promise.all` in the review found it.

**Detector question.** Between the line that checks the limit and the line that records the use, is there an `await`? What happens if 40 copies of this request arrive in the same millisecond?

**Warning sign.** "I tested it: the 11th request got a 429."

**What to do.** Reserve the slot when you check it (increment first, roll back on failure), or do the check and the record inside the same serialized section as the write. Test it with a parallel burst, not a loop.

### Inputs must be visible before they are valid or invalid

`origin: lab · claude-sonnet-5-5 · 2026-10` · `groups: interface` · `packages: web, apps`

**The idea.** A form field's border is the only thing that tells a person "you can type here". It needs at least 3:1 contrast against its background. An error state that only changes that border's colour is invisible to anyone who couldn't see the border to begin with.

**Example.** A clinic's booking form used `#cfd8d6` borders on white (1.45:1). On a phone, the error explanation ended up below the fold (see lesson 32), so the only visible feedback was those pale borders turning red.

**Detector question.** Measured, not eyeballed: what is the contrast of each input's border against the background it sits on? Is an error shown by anything besides colour, next to the field?

**Warning sign.** "A subtle grey border looks cleaner."

**What to do.** Use borders at 3:1 or more (e.g. `#7a8a87` on white). Mark errors with text next to the field (`aria-describedby` pointing to a per-field message), not only with a border colour. Check the ratio with a script, not by eye.

### Refines WEB-3: the fallback must keep what the person typed

Not a new lesson; it sharpens **WEB-3**. The no-JS path here *was* tested and works: the server validates and renders an error page. But that page's "back" link is a fresh navigation, so every typed answer is lost. A detector line to add: *"After the fallback's error page, when the person goes back, are their answers still in the form?"* What to do: re-render the form with the submitted values and the error next to the field, or at least use a real history-back link.

### Covered by existing lessons
- #1, #8 → **WEB-5** (the lock exists, but the right password bypasses it, so it limits nothing).
- #3 → **lesson 32** and **lesson 45**.
- #6 → **lesson 49**.
- #7 → **WEB-1** (the next record saves, but nobody finds out).
- #2 → also touches **WEB-2**.
- #9, #10, #11, #12 → one-off slips.
