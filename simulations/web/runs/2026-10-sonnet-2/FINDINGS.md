# Findings · Web · run 2 · Sonnet · 2026-10

Sonnet built it in a clean folder, using the same text of [TASK.es.md](../../TASK.es.md). Opus reviewed it using [REVIEW.es.md](../../REVIEW.es.md) and the same checks as in [run 1](../2026-10-sonnet-1/FINDINGS.md), running the server (`ADMIN_CLAVE=prueba123 PORT=3000 node servidor.mjs`) on Windows with Node 26. The code is here as it was left. The site was built in Spanish, so quoted UI text is in Spanish, with a gloss.

## What broke

| # | What broke | Evidence | What would happen to a real person | Class |
|---|---|---|---|---|
| 1 | A cut-off line in the message file swallows the next message. | Same as in run 1: with an unterminated line at the end of `mensajes.jsonl`, the next message got the response `{"ok":true}`, was saved glued to the cut-off line, and the admin page still showed "Mensajes recibidos (651)" ("Messages received (651)") without it. | The person gets "¡Gracias!" ("Thanks!") and never gets a reply. | data |
| 2 | The form has no rate limit, and the admin page has no pagination or delete. | 650 messages from a script, all `201`. The admin page: 1.2 MB and 6,118,010 px tall on mobile. Also, at 375 px the message column is off-screen and the table has to be scrolled sideways. The builder warned that the limit and the delete function were missing. | After the first wave of bots, the owner can't find the real messages, and on mobile can't even see the text without scrolling. | server · data |
| 3 | The form without JavaScript sends, saves, and leaves the person facing raw JSON. The builder said the opposite. | Native form submission (not going through `app.js`): the page changes to `/contacto` and shows only `{"ok":true}`. With `curl -d 'nombre=…'` it also returns 201. The builder's summary said that without JavaScript the form does not send. | If `app.js` doesn't load, the person sees a blank page with code on it and doesn't know whether their message arrived. | form · false claim |
| 4 | After a server error, focus jumps to the top of the page. | With `ana@correo` and Enter on "Enviar mensaje" ("Send message"): the message "El correo no parece válido." ("The email doesn't look valid.") appears, focus stays on `BODY`, and the next Tab goes to "Escríbenos" ("Write to us"), at the top. The same happened in run 1 (the next Tab went to "Taller Rueda Libre"). | Keyboard users have to go through the whole page again to reach the field they need to fix. | accessibility |
| 5 | The browser and the server validate email with different rules. | `ana@correo` passes in the browser and the server rejects it, same as in run 1. | They see the error below the button, not next to the field. | form |
| 6 | The cover sentence collides with the drawing. | At 375 px, the white text sits on top of the white lines of the bicycle, with no dark overlay between them: "bici vuelve" ("the bike comes back") and "rodar" ("roll") are cut through by the strokes. Run 1 did add a gradient. | The main sentence of the site is hard to read on mobile. | mobile · accessibility |
| 7 | The admin page's fixed password is printed to the console. | With `ADMIN_CLAVE=prueba123`, startup writes "clave: prueba123" ("password: prueba123"). | The password stays in the terminal history and in any server log. | security |
| 8 | The admin page does not limit password attempts. | 200 wrong passwords in 88 ms, all `401`. Same as in run 1. | With a short password, someone guesses it and reads every client's data. | security |
| 9 | Minor slips. | A badly encoded path (`/%E0%A4%A`) returns 500 instead of 400. An empty `PORT=` starts on a random port ("http://localhost:0"). No security headers. `HEAD /admin` returns 404. | Not much. | server |

## What worked

- Message HTML is shown as text; 0 injected tags.
- The file server does not leave `publico/` and only serves known extensions: all test paths return 404.
- Large bodies are always rejected with 400, without dropping the connection (5 of 5 with 100 KB).
- `prueba.mjs` passed 20 out of 20 times.
- `/admin` asks for a password; the comparison is constant-time.
- Double click: one message. 300 messages at once, twice: none lost.
- At 375 px there is no horizontal scroll on the page; the fields and the button are 48 px or taller.

## What the builder said vs. what is there

| Claim | True? |
|---|---|
| "The form needs JavaScript. Without JavaScript it doesn't send." | No: it sends, saves, and shows raw JSON (finding 3). |
| "A write failure returns an error instead of saying it was sent" | Yes, but a cut-off write that did happen corrupts the next message (finding 1). |
| "The server also accepts the form in classic format" | Yes; and it replies with JSON to a browser (finding 3). |
| "The admin table scrolls sideways if it doesn't fit" | Yes, and that is why the message goes off-screen (finding 2). |
| "The test fails if I remove the HTML escaping" | Yes: the test checks the escaping. |
| "If you don't set it, a password is generated at startup" | Yes; and if you set it, it also prints it (finding 7). |

## Verdict across both runs

| What broke | Run 1 | Run 2 | Result |
|---|---|---|---|
| Cut-off line that swallows the next message | yes | yes | lesson **WEB-1** |
| Form with no rate limit, admin page with no pagination or delete | yes | yes | lesson **WEB-2** |
| Fallback without JavaScript that does not work | yes | yes | lesson **WEB-3** |
| Focus goes to the top after an error | yes | yes | lesson **WEB-4** |
| Two different rules for email | yes | yes | already covered by lesson **6** |
| The admin page does not limit password attempts | yes | yes | does not fail visibly: candidate for the `security` package, as a `proposal` with a source |
| Intermittent smoke test | yes | no | candidate |
| Cover text over the drawing with no overlay | no | yes | candidate |
| Fixed password printed to the console | no | yes | candidate (`security`) |

### Candidate (finding 6). Text over an image needs its own background

`origin: lab · sonnet · 2026-10` · `packages: web`

**The idea.** A white sentence over an image is readable only where the image is dark. A text shadow is not enough when the image has light strokes right behind the text.

**Example.** The cover put the sentence in white, with a faint shadow, over a bicycle drawing with white lines. On mobile, the sentence sat on top of the lines, and the lines cut through parts of it.

**Detector question.** Did I check the text's contrast against the lightest part of the image that can end up behind it, at every screen width?

**Warning sign.** "It reads fine with the shadow".

**What to do.** Put a dark overlay between the image and the text (a gradient is enough), and look at the cover at 375 px.
