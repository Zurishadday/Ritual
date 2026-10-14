# What the reviewer said

`claude-opus-5-5` · success · 35 turns · $2.2063670000000006 · 58284 output tokens

I ran the whole review. The server starts cleanly, and the basics work in a real browser: the page loads, it fits a 375 px phone screen, keyboard use works, HTML in messages is shown as text, and file paths can't be escaped. The serious problems are in the admin lockout and in how messages are saved. I fixed nothing in the build. I wrote `FINDINGS.md` (15 findings and 3 candidate lessons) and `verdicts.json`.

Bash and PowerShell were blocked except for `node` commands. So every check is a Node script in `%TEMP%\review-scratch\` that starts the build's server and stops it afterwards. For the browser checks those scripts drive headless Edge at 375 px. Port 3000 was already in use before I started, so I used 3001 and didn't count it.

**Most serious findings:**
1. **The owner can lock themselves out.** The lockout counts the browser's automatic first request (sent before any password is typed) as a wrong password, and a successful login never clears the count. After one missed dialog and one typo, opening admin from another device gets "espera 15 minutos" even with the right password.
2. **Messages are lost when the owner deletes one.** With 30 visitors submitting during a delete, all 30 were told "¡Gracias!" but only 27 messages were saved.
3. **One broken line in the data file eats the next message.** The next visitor's message vanishes from the admin page, and it's gone for good after the next delete. Nobody is told.
4. **Without JavaScript, any error wipes the form.** The success path works, but after an error "Volver" returns an empty form. After 5 attempts in a minute, the correct one is refused with "espera un minuto".
5. **Focus is lost after submitting with the keyboard.** It drops off the page after both success and failure, and the next Tabs land at the top of the page.
6. **Bots get through.** 1,200 of 1,200 bot messages from 240 IPs were accepted. The real message ended up as card #201 of 1201, and messages can only be deleted one at a time.
7. **Per-IP limits stop working behind a proxy.** Once the site is behind the proxy the builder recommends, every visitor shares one IP. I didn't run a real proxy; I simulated it with all clients on one address. The 5-per-minute limit then covers the whole site, and one stranger can lock the owner out.

**Verdicts:**

| Lesson | Verdict |
|---|---|
| 41, 49, WEB-1, WEB-2, WEB-3, WEB-4 | broke |
| 32, 45, 46, WEB-5 | held |

I tried every lesson, so none is `not-checked`.

**Calls you may want to look at:**
- **49:** I marked it `broke` because the per-IP checks override the specific outcome: a correct password still gets blocked, and a corrected submission gets rate-limited. That is a judgement call.
- **WEB-3:** I marked it `broke` even though the success path without JavaScript works, because the error path throws away what was typed.

**Builder's claims:** "Funciona sin JavaScript" is true only on the success path. The description of the 5-wrong-passwords lock is inaccurate. "El borrado solo funciona desde la página de administración" goes too far: anyone with the password can delete without the page. The other claims held.

**Other notes:**
- `lessons/TEMPLATE.md` isn't in the folder, so the candidate lessons use my own five-part layout.
- Nothing I started is still running, and the test `datos/` folder was removed.
