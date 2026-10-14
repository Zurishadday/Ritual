# Console and tools

What applies when you run commands, servers, tests, or captures, and when the tool gets between you and the system.

### 27. Doubt the instrument before you doubt the system

`origin: field · ~opus · 2026-08` · `seen: claude-opus-5-5 2026-10`

**The idea.** If a number didn't change when it should have, or changed just as you were looking at it, suspect these in order: the cache, another process writing to the same table, the tool you're looking through, and only at the very end the system itself.

**Example.** A table "lost half its columns." A few minutes later it was complete: you were looking at it while another process was rebuilding it.

**Another example.** A new image "wouldn't load" on the page. The file was fine: the test server couldn't see folders created after it started.

**One more example.** A script "computed a text pattern wrong." The script was fine: the console the code was passed through turned every `\n` into a real line break before the script read it. And in a notebook where cells share memory, an error that should have shown up didn't: the variable was still stored from an earlier cell.

**Detector question.** Am I looking at the system, or at a cache, a copy, or a tool that kept an old snapshot of it or changed it along the way?

**Warning sign.** "I already fixed it and it's still the same" · "this time I really did type it right."

**What to do.** Take a second snapshot a few minutes later before you declare a disaster. If an instrument has already failed you the same way, replace it instead of watching it: a repeated slip isn't bad luck, it's the wrong tool. A console that transforms `\n` or `\\` along the way is no good for passing it code: the code goes in a file, written with a tool that doesn't touch it, and runs from there. And anything mechanical (a command that has already failed three times) gets blocked by a guard, not remembered.

### 29. Check the command before handing it to someone else

`origin: field · ~opus · 2026-08` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** Whoever runs someone else's command does it blind. Every broken command spends the trust they'd give the next one.

**Example.** A deploy command had a branch name typed from memory. The branch had a different name, and whoever ran it lost half an hour before asking.

**Detector question.** For each name in this command, did I read it from the system today, or did I type it from memory?

**Warning sign.** "It's the same command as always."

**What to do.** Run it yourself before passing it on, and copy each name (script, path, branch) from the system, not from memory.

### 44. What you cut from the output can be the verdict

`origin: field · ~sonnet · 2026-09` · `groups: tests-and-checks`

**The idea.** Looking only at the last lines of a result, or piping it through another command, can throw away exactly the part that said "failed." A trimmed output from a failing test looks just like one from a test that passed.

**Example.** A page was marked as reviewed because its test "finished without errors." The result went through a command that showed only the end, and the notice that the test had failed got lost along the way.

**Another example.** A test suite automatically retried every test that failed. Tests that passed on the second try didn't count as failures, only as "flaky," and the cause stayed hidden: each step change asked the server for the page again. Without retries, the failure showed up and could be measured.

**Detector question.** Am I reading the verdict (how many passed, how many failed, how it ended), or only a piece of the output?

**Warning sign.** "No error showed up on screen" · "the last few lines are enough."

**What to do.** Find the verdict line before changing a status. If you chain commands, make sure the first one's failure reaches the end. If the output has no verdict, that means "I don't know," not "it passed" (see lesson 1). And save the full output to a file and look for the verdict there: that way you don't have to decide in advance how much to read.

### 53. Code goes through the editor, not through the shell's text handling

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** Rewriting a source file with the shell's own string tools (read it, replace, write it back) passes the code through rules made for something else: a default encoding, operator precedence, quoting and escaping. The change looks right in the command, and the file comes out different from what the command seems to say.

**Example.** Two edits in one session, both in Windows PowerShell 5.1. A read-replace-write of a script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) read the file in the system's ANSI code page and wrote it back as UTF-8: every ✓ and · in it turned into `âœ“` and `Â·`, and its self-check printed the mangled mark. Then a list of replacements written as ``@('old', 'new' + "`n" + 'more')`` dropped lines: in PowerShell the comma binds tighter than `+`, so each pair became four items and only the first piece of the new text was written.

**Detector question.** Is this code change going through the editor, or through the shell's read, replace and write, with its encoding, precedence and quoting rules?

**Warning sign.** "It's a quick replace, I'll do it in one command" · "several replacements at once is faster".

**What to do.** Change code with the editor's own edit and write tools. When a change has to be scripted, write the script to a file and run it with an interpreter that reads and writes UTF-8 and has plain string literals (`node fix.mjs`, `python -I fix.py`). Then look at the diff: a change that touched more lines than you meant, or characters you didn't touch, is the shell's.
