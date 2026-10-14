# Git and process (this repository's lessons)

### P-3. A commit message states only the causes that were seen

`origin: field · claude-opus-5-5 · 2026-10` · `refines: 38`

**The idea.** A commit message is read later as the record of what happened. A cause written there as a fact, when it was only the likeliest guess, becomes the history, and on a public repository it can't be quietly fixed.

**Example.** Two of three simulation reviews ran nothing because every shell command was denied. The commit that fixed the review prompt said the reviewer had written `cd`, `sleep` and environment-variable prefixes. Nobody had seen those commands: the reviewers only said "denied". The message was already pushed; the next commit had to carry the correction.

**Detector question.** Each cause in this message: did I see it in an output, or is it my best guess?

**Warning sign.** "That must be why" · "it's obviously this" · writing the cause before looking at the evidence.

**What to do.** Write what was seen as seen, and a guess as a guess ("likely", "not confirmed"). If the evidence can still be read (a log, a saved output), read it before committing. A wrong claim already pushed is corrected in the next commit's message, in so many words.
