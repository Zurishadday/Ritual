# What the reviewer said

`claude-opus-5-5` · success · 26 turns · $1.314565

I ran the build in a scratch copy and tested it with raw HTTP requests and headless Chrome (real Tab/Enter keys and mouse clicks, at desktop width and 375 px). The build itself was not changed. I wrote `FINDINGS.md` and `verdicts.json` into the project folder; both list 14 findings, and `verdicts.json` parses.

**What held:**
- **Basics:** the page loads and all four images render.
- **Error paths:** submitting it empty, or with an email missing its "@", puts focus on the right field with the browser's message.
- **Double click:** a real double click saved only one message.
- **HTML in a message:** the admin page shows it as plain text and nothing runs.
- **File server:** none of the path-traversal requests worked, and the data folder isn't reachable.
- **Admin:** everything returns 401 without the password.
- **Mobile layout:** no horizontal scroll at 375 px.
- **Saved data:** five messages sent at once were all saved. Killing the server 7 times in the middle of a write never left a broken file.

**Lesson verdicts:**

| Lesson | Verdict | What I saw |
|---|---|---|
| 32 | broke | On a phone, after tapping "Enviar" the confirmation sits mostly below the screen (13 of 51 px visible), and the form empties at the same moment. |
| 41 | broke | The headline is drawn over the white bike frame and the light sky (about 1.9:1 contrast). You only see it in the rendered page, not in the code. |
| 45 | broke | The 5-per-IP limit counts rejected attempts too. After five typos, the corrected message gets "Demasiados mensajes" for 10 minutes. |
| 46 | broke | Every message rereads and rewrites the whole file. With 80,000 messages a send takes 236 ms, and the admin page downloads 53 MB. |
| 49 | broke | Same cause as 45: the general limit runs before field checks, so it replaces the specific error. |
| WEB-2 | broke | Messages can only be deleted one at a time, with a confirmation each. There is no search, filter or bulk delete. |
| WEB-3 | broke | The form has no fallback without JavaScript. With it off, a submit saves nothing and shows nothing. |
| WEB-4 | broke | After any submit, focus drops to the page body, and the next Tab leaves the page. |
| WEB-1 | held | The file is written to a temporary copy and then renamed, so a crash can't leave it half-written. |

**Seven new findings no listed lesson covers:**
- **Corrupted data file:** if `mensajes.json` gets corrupted some other way (a hand edit, a full disk), every new message fails with "Error interno". The only sign is in the server console.
- **Hero contrast** at mobile width.
- **Admin login:** no limit on wrong passwords (200 tries in 0.6 s, none blocked).
- **Oversized requests:** they get a dropped connection instead of the intended "message too large" reply.
- **Wrong-type fields:** a non-text name is accepted and saved as `[object Object]`.
- **Image sizes:** the images have no declared width or height (small layout shift on desktop).
- **Instruction syntax:** the summary's `HOST=0.0.0.0` tip is bash syntax, but the owner is on PowerShell.

The builder's other claims were accurate, including that it never ran anything.

I wrote three candidate lessons: the corrupted-data-file case, contrast for text over a photo, and limiting login attempts. `lessons/TEMPLATE.md` isn't in the folder, so I used my own guess at the five parts.

The test scripts and screenshots are in `…/Temp/revisor-rueda/`. Every server and browser I started is stopped, and I checked that their ports are closed.
