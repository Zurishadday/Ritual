# Findings · Web · run 1 · Sonnet · 2026-10

Sonnet built it from the text of [TASK.es.md](../../TASK.es.md) and nothing else. Opus reviewed it in another session, using [REVIEW.es.md](../../REVIEW.es.md). The server was run (`ADMIN_PASSWORD=prueba123 PORT=3000 node servidor.mjs`) on Windows with Node 26, with `curl`, Node scripts, and the browser at 375 px and on desktop. The code is here as it was left. The site was built in Spanish, so quoted UI text is in Spanish, with a gloss.

## What broke

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | The smoke test is intermittent, and the builder said it passes. | `node prueba.mjs` run 20 times: 18 pass, 2 fail with `fetch failed · ECONNRESET`. The 20 KB POST alone: 19 times `413` and one `ECONNRESET`. With 100 KB: one `413` and four dropped connections (`curl`: "Recv failure: Connection was reset", code 000). The server replies 413 and destroys the socket once the response is sent, while the client is still uploading the body. | Whoever runs the test they were told to run sees it fail one time in ten, and doesn't know whether their site is broken. A client who sends a large body gets a dropped connection instead of "El mensaje es demasiado largo" ("The message is too long."). | server · false claim |
| 2 | A cut-off line in the message file swallows the next message. | An unterminated line was left at the end of `mensajes.jsonl`, as a crash in the middle of a write would leave it. Then a valid message was sent: the response was `{"ok":true}`, and the message is in the file, but it was glued to the cut-off line. The admin page still showed "Mensajes (651)" ("Messages (651)"), and the new message's name appears 0 times. The code had partly anticipated this: "línea dañada: se omite" ("damaged line: skipped"). | The person sees "¡Gracias! Recibimos tu mensaje" ("Thanks! We received your message.") and never gets a reply. The owner has no way of knowing that the message exists. | data |
| 3 | The form has no rate limit, and the admin page has no pagination and no way to delete. | A script sent 650 messages in about a second: all `201`. The admin page went to 653 messages, 1.29 MB of HTML and 1,415,207 px tall, with no pagination and no delete button. The builder warned that the limit and the delete function were missing. | After the first wave of bots, the owner has to scroll through hundreds of junk messages to find a real one, or edit the file by hand. | server · data |
| 4 | The browser and the server validate email with different rules. | With `ana@correo`, the browser lets the form submit (`type=email` accepts it), and the server replies "Escribe un correo válido." ("Enter a valid email."). The message appears below the button, the field is not marked (`aria-invalid` empty), and focus falls to `BODY`. | They can fix it, because what they typed is kept, but the message is not next to the field that failed. | form |
| 5 | The form looks like it works without JavaScript, but it doesn't. | The `<form>` has `method="post" action="/api/contacto"`, but the server only accepts JSON. `curl -d 'nombre=Ana&correo=ana@correo.mx&mensaje=hola'` returns `{"error":"Solicitud no válida."}` ("Invalid request.") with 400. | If `app.js` doesn't load, the person sees a line of JSON on a blank screen, and their message is lost. | form |
| 6 | Focus is lost on submit. | Keyboard-only walkthrough: after Enter on "Enviar mensaje" ("Send message"), `document.activeElement` is `BODY`, because the button is disabled while sending. | Someone using a keyboard or a screen reader is left outside the form. The message is announced (`aria-live`). | accessibility |
| 7 | The admin page does not limit password attempts. | 200 wrong passwords in 293 ms, all `401`, with no delay. The password travels unencrypted over HTTP (the builder warned about this). | With a random password, nothing happens. With a short password set in `ADMIN_PASSWORD`, someone guesses it and reads every client's data. | security |

## What worked

- Message HTML is shown as plain text: `<b>hola</b>` and `<img src=x onerror=…>` appear as written, with no tags on the page (0 `img`, 0 `b`).
- The file server does not leave `publico/`: `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e%5cservidor.mjs`, `/datos/…` and `/estilos.css%00.html` return 404. A badly encoded path returns 400.
- `/admin` asks for a password (401 without one and with a wrong one).
- The server validates without the page: empty bodies, `{}`, `null`, non-text fields and broken JSON return 400; `PUT` and `DELETE` return 405.
- Double-click on submit: one message saved.
- 300 messages at once, twice: 300 saved and readable each time.
- At 375 px there is no horizontal scroll; the headings don't end up under the fixed bar; the admin page is readable on mobile.
- Keyboard: the Tab order follows the page, focus is visible (3 px blue outline), and the form submits with Enter.
- Button contrast: white on `#b5561a`, 4.9 to 1. Images have useful alt text and fixed proportions, so the page doesn't jump on load.

## What the builder said vs. what is there

| Claim | True? |
|---|---|
| "The automated smoke test passes" | Partly: it passes 18 out of 20 times (finding 1). |
| "It is validated in the browser and again on the server" | Yes, but with different rules (finding 4). |
| "Messages are escaped before they are displayed" | Yes. |
| "The server blocks paths that try to leave `publico/`" | Yes. |
| "Request bodies are capped at 10 KB" | Yes, although the notice that the message is too long almost never arrives (finding 1). |
| "With invalid data, it shows the error on the same page" | Yes, below the button. |
| "The design starts from mobile" | Yes; the builder had not looked at it, and said so. |
| "Without `ADMIN_PASSWORD`, a random password is generated" | Yes, and it prints it to the console. |

## Candidate lessons

This is the first run: what also breaks in the second run becomes a lesson; the rest stays a candidate.

- Finding **4** is already covered by lesson **6** (the definition lives in one place): the email rule is written twice.
- The growth of the admin page in finding **3** is covered by lesson **46**: every visit reads and renders the entire file.
- Finding **6** is a one-off slip. Finding **7** does not fail visibly: if it repeats, it goes in as a `proposal` in the `security` package.

### Candidate A (finding 1). A network test that passed once did not pass

`origin: lab · sonnet · 2026-10` · `groups: tests-and-checks` · `packages: web`

**The idea.** Anything that depends on timing (closing a connection, two requests at once, a server that is starting up) can pass and fail with the same code. A green run proves nothing.

**Example.** A server rejected bodies over 10 KB by replying 413 and cutting the connection when the response ended. Its test sent 20 KB and passed the one time it was run. Run 20 times, it failed 2; with 100 KB, the notice almost never arrived: the client saw the connection cut.

**Detector question.** Does this test touch the network, processes, or anything that happens at the same time? Did I run it enough times to see a failure that happens one time in ten?

**Warning sign.** "It passed" · "it was a rare error, it doesn't happen anymore".

**What to do.** Run it in a loop (20 times) before you accept it, and also test the size that someone who abuses the server would really send, not just the one that barely crosses the limit. To reject a large body, respond and let the client finish sending (discard the rest with `req.resume()` and respond with `Connection: close`), instead of destroying the connection.

### Candidate B (finding 2). In a file that only grows, a broken line takes the next one with it

`origin: lab · sonnet · 2026-10` · `groups: scripts-and-files` · `packages: web` · `refines: 24`

**The idea.** Saving each record as a line at the end of a file is simple, and it copes well with many records at once. But if a write gets cut off, the line is left without its line break, and the next record is glued onto it. Skipping "damaged lines" when reading drops both.

**Example.** A form saved each message as a JSON line, and the admin page skipped any line it couldn't read. With a line cut off at the end, the next message got the reply "thanks", was saved, and never showed up in the admin page.

**Detector question.** If the last write was left half-done, what happens to the next one? Does what my reader skips alert anyone?

**Warning sign.** "Damaged lines get skipped" · "it's just appending to the end".

**What to do.** Before appending, if the file doesn't end with a line break, start the record with one; or write each record as its own file. When reading, count the lines that couldn't be read and show that count where the owner will see it, instead of skipping them silently.

### Candidate C (finding 3). A public form gets bots from day one

`origin: lab · sonnet · 2026-10` · `groups: interface-and-design` · `packages: web`

**The idea.** A form open to the internet isn't filled in only by people. If it doesn't stop automated submissions, and whoever reads it can't clean it up, the first wave of junk buries the real clients.

**Example.** A contact form accepted 650 messages in one second from a script. The admin page, with no pagination and no delete button, grew to more than a million pixels tall.

**Detector question.** If a thousand fake messages arrive tomorrow, how does the owner find the one real message, and how do they delete the rest?

**Warning sign.** "It's a small site, nobody is going to attack it".

**What to do.** Put a cheap brake in from the start (a hidden field that people don't fill in, a limit per address per minute), and give the admin page pages and a way to delete or mark messages as junk.

### Candidate D (finding 5). A fallback nobody tested is not a fallback

`origin: lab · sonnet · 2026-10` · `packages: web`

**The idea.** A form with `action` and `method` promises that it works even if JavaScript fails. If the server only understands what the JavaScript sends, the promise is false, and the error shows up raw.

**Example.** The form sent JSON with JavaScript and declared `method="post"` as a fallback. Sent without JavaScript, the server replied with one line of JSON saying "Invalid request", and the message was lost.

**Detector question.** If this JavaScript file doesn't load, what happens when the person submits?

**Warning sign.** "Everyone has JavaScript anyway".

**What to do.** Either the server also accepts the normal form submission and replies with a page, or the form doesn't promise a fallback it doesn't have. Test it once with JavaScript turned off.
