# What the reviewer said

`claude-opus-5-5` · success · 69 turns · $2.4949582000000006 · 53040 output tokens · 2 denied tool call(s)

I wrote `FINDINGS.md` and `verdicts.json` (it parses: 10 lessons, 4 new mistakes) in the build folder. Nothing in the build was changed. I ran everything against scratch copies, and every server I started is stopped. The mobile and keyboard checks ran in headless Chrome, which I drove from Node.

**Lesson verdicts:** 5 broke, 5 held.
- **WEB-1 broke:** a saved file of `[null]`, which is valid JSON but holds a bad record, makes every later submission fail with an error. The owner only finds out from a message in the server console. Truncated or empty files are handled correctly.
- **WEB-2 broke:** 520 bot submissions filled the 500-pending limit, and the next real patient was refused with "llámanos". The owner can only delete requests one at a time, each with a confirmation.
- **49 broke:** the server's site-wide security policy (CSP) blocks the error page's own "Volver al formulario" script. With `app.js` not loaded or JavaScript off, a patient who makes a mistake comes back to a blank form.
- **41 broke:** the builder only tested the no-JavaScript path by checking status codes with `fetch`, never by clicking through the page, which is how the problem above went unnoticed.
- **46 broke:** the clinic's page sends and redraws every request ever received, so it slows down as requests pile up:

  | Saved requests | Data sent to the page | Page shows the list | One "Confirmar" click |
  |---|---|---|---|
  | 5,000 | 1.6 MB | 0.9 s | about 1.7 s |
  | 50,000 | 16.6 MB | 9.3 s | about 9 s |

- **Held:** 32, 45, WEB-3, WEB-4 and WEB-5. For WEB-5, the lockout works, but it counts attempts per network address, and the server accepts `CLAVE_ADMIN=1` as a password.

**New mistakes no listed lesson covers:**
- **Shared-address limit:** the limit of 5 requests per 10 minutes is counted per network address. Behind a hosting proxy or shared Wi-Fi, the 6th patient in that window is refused.
- **Test script deletes real data:** `prueba-danado.mjs` wiped a copy holding 3 saved requests down to `[]`. The only warning is a code comment.
- **Invented facts:** the address, phone, prices and session lengths were made up, and the page shows them as real with nothing marking them as examples.
- **Low contrast:** the white text on the cover photo measures 2.47–3.3:1, below the 4.5:1 the paragraph needs.

**Checks that passed:**
- The server rejects bad data on its own, without the page.
- Requests with HTML in the name or comment show as plain text on the clinic's page.
- The file server can't be used to read files outside the public folder.
- A double click saves one request.
- Simultaneous writes, and killing the server mid-write, lose no data.
- No horizontal scroll at 375 px on either page.
- Keyboard focus is visible and handled well.
- The builder's own `prueba.mjs` passes all 23 checks.

`lessons/TEMPLATE.md` isn't in this folder, so I wrote the four candidate lessons with my own five-part structure and said so in the report.
