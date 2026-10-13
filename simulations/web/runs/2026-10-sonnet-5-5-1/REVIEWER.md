# What the reviewer said

`claude-opus-5-5` · success · 35 turns · $1.8724965999999998

I ran the build and wrote up 13 findings. I changed nothing in the build itself: my test scripts live in a separate folder (`%TEMP%\review-scratch-rl\`), and every server and browser I started is stopped. I also deleted the test data from `datos/`, which didn't exist before the review.

To test it, I started the server with `node servidor.mjs`, sent raw HTTP requests at it, and drove headless Edge with real clicks, Tab and Enter at 1280 px and 375 px wide.

**Most serious problems:**
1. **A message gets lost on Windows.** If a message arrives while the admin page is loading the list, saving it fails with "operation not permitted". The customer sees "Error interno" and the message is gone. This happened 1 time in 40 when messages and admin reloads overlapped.
2. **Spam pushes real messages out silently.** The list keeps only the newest 5,000, and the 5-per-minute limit is easy to get around by sending from different addresses. In my test the first real message was dropped. The admin page can only delete one message at a time, each with its own confirmation.
3. **Without JavaScript, the form loses the message.** The page jumps to the top, the fields are emptied, nothing is saved, and the name, email and message end up in the address bar.
4. **The 5-per-minute limit hits real people.** Rejected attempts count toward it, so a customer who mistypes their email five times is locked out. Behind the HTTPS proxy the instructions recommend, every visitor looks like the same address, so the whole site would accept only 5 messages a minute.
5. **Smaller problems:**
   - If the server can't be reached, the form shows "Failed to fetch" in English.
   - Keyboard focus is lost after submitting, and after deleting in the admin page.
   - On desktop, the three prices don't line up: one style rule overrides the one meant to keep them at the bottom of each card.
   - White text on the orange buttons doesn't meet the minimum contrast for readability (3.01:1, below the WCAG AA minimum of 4.5:1).

**What held up:**
- A quick double click saves only one message.
- HTML in a message shows as plain text in the admin page and doesn't run.
- The server rejects bad input on its own, not just the browser.
- Requests for files outside the public folder are refused.
- The admin page asks for the password.
- There's no horizontal scroll at 375 px.
- A crash halfway through saving leaves the existing messages intact.

**Lesson verdicts:**

| Verdict | Lessons |
|---|---|
| broke | 41, 45, 46, 49, WEB-2, WEB-3, WEB-4 |
| held | 32, WEB-1 |
| not-checked | none |

`verdicts.json` also has six new mistakes that none of the listed lessons cover. `FINDINGS.md` has three new candidate lessons and points the rest to existing lesson numbers.

**Notes:**
- `lessons/TEMPLATE.md` isn't in this folder or its parent, so I used five parts based on how the listed lessons are written: title, what happened, why it happens, what to do, and the detector question.
- I put `origin: lab · claude-sonnet-5-5 · 2026-10` on the candidate lessons as you asked, although I'm claude-opus-5-5.

Files are in `~\AppData\Local\Temp\ritual-sim-web-4X4PYl`:
- FINDINGS.md
- verdicts.json
