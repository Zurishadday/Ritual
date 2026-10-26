# Console and tools

What applies when you run commands, servers, tests, or captures, and when the tool gets between you and the system.

### 27. Doubt the instrument before you doubt the system

`origin: field · ~opus · 2026-08` · `seen: claude-opus-5-5 2026-10`

**The idea.** If a number didn't change when it should have, or changed just as you were looking at it, suspect these in order: the cache, another process writing to the same table, the tool you're looking through, and only at the very end the system itself.

**Example.** A table "lost half its columns." A few minutes later it was complete: you were looking at it while another process was rebuilding it.

**Another example.** A new image "wouldn't load" on the page. The file was fine: the test server couldn't see folders created after it started. A server that was being measured kept answering with the old code: stopping its task had left the previous process alive on the same port. And a `git log` between two versions of an installed plugin failed with "unknown revision": the local copy was shallow and held a single commit, and the history was only on the remote.

**One more example.** A script "computed a text pattern wrong." The script was fine: the console the code was passed through turned every `\n` into a real line break before the script read it. And in a notebook where cells share memory, an error that should have shown up didn't: the variable was still stored from an earlier cell.

**Detector question.** Am I looking at the system, or at a cache, a copy, or a tool that kept an old snapshot of it or changed it along the way?

**Warning sign.** "I already fixed it and it's still the same" · "this time I really did type it right."

**What to do.** Take a second snapshot a few minutes later before you declare a disaster. If an instrument has already failed you the same way, replace it instead of watching it: a repeated slip isn't bad luck, it's the wrong tool. A console that transforms `\n` or `\\` along the way is no good for passing it code: the code goes in a file, written with a tool that doesn't touch it, and runs from there. And anything mechanical (a command that has already failed three times) gets blocked by a guard, not remembered. Before measuring a server, check which process holds its port. Before reading the history of a copy, check whether it is shallow (`git rev-parse --is-shallow-repository`), and if it is, ask the remote.

### 29. Check the command before handing it to someone else

`origin: field · ~opus · 2026-08` · `seen: claude-sonnet-5-5 2026-10`

**The idea.** Whoever runs someone else's command does it blind. Every broken command spends the trust they'd give the next one.

**Example.** A deploy command had a branch name typed from memory. The branch had a different name, and whoever ran it lost half an hour before asking.

**Detector question.** For each name in this command, did I read it from the system today, or did I type it from memory?

**Warning sign.** "It's the same command as always."

**What to do.** Run it yourself before passing it on, and copy each name (script, path, branch) from the system, not from memory.

### 44. What you cut from the output can be the verdict

`origin: field · ~sonnet · 2026-09` · `groups: tests-and-checks` · `seen: claude-fable-5-1 2026-10`

**The idea.** Looking only at the last lines of a result, or piping it through another command, can throw away exactly the part that said "failed." A trimmed output from a failing test looks just like one from a test that passed.

**Example.** A page was marked as reviewed because its test "finished without errors." The result went through a command that showed only the end, and the notice that the test had failed got lost along the way.

**Another example.** A test suite automatically retried every test that failed. Tests that passed on the second try didn't count as failures, only as "flaky," and the cause stayed hidden: each step change asked the server for the page again. Without retries, the failure showed up and could be measured. In another suite, a check failed once and passed when repeated: the repeat overwrote the first failure's trace, and its cause was lost. And a suite ended with exit code 0 and no pass or fail counts: its full output had been saved inside the folder the test runner empties when it starts, so the tool that writes the verdict had wiped it.

**One more example.** `npm test 2>&1 | tail -4 && git commit …`: a script failed to load, the test exited with an error, and the commit went through anyway, because the `&&` saw the exit code of `tail`, which is always zero. In another case, `Select-Object -First 1` cut a script off as soon as it had its first line, so it never reached its own cleanup, and a modified copy of a file stayed behind.

**Detector question.** Am I reading the verdict (how many passed, how many failed, how it ended), or only a piece of the output? And what decides the next step: the test's exit code, or the trimming command's?

**Warning sign.** "No error showed up on screen" · "the last few lines are enough." · "I chain it so it is a single command."

**What to do.** Find the verdict line before changing a status. If you chain commands, make sure the first one's failure reaches the end. If the output has no verdict, that means "I don't know," not "it passed" (see lesson 1). And save the full output to a file and look for the verdict there: that way you don't have to decide in advance how much to read. In a shell, `set -o pipefail` makes a pipe fail when the test does; never cut short a script that cleans up after itself. Keep the file with the full output outside any folder the tool empties when it starts. Before you run a failed test again, copy the trace and the screenshot of the first failure to a place the next run doesn't touch.

### 53. Code goes through the editor, not through the shell's text handling

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** Rewriting a source file with the shell's own string tools (read it, replace, write it back) passes the code through rules made for something else: a default encoding, operator precedence, quoting and escaping. The change looks right in the command, and the file comes out different from what the command seems to say.

**Example.** Two edits in one session, both in Windows PowerShell 5.1. A read-replace-write of a script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) read the file in the system's ANSI code page and wrote it back as UTF-8: every ✓ and · in it turned into `âœ“` and `Â·`, and its self-check printed the mangled mark. Then a list of replacements written as ``@('old', 'new' + "`n" + 'more')`` dropped lines: in PowerShell the comma binds tighter than `+`, so each pair became four items and only the first piece of the new text was written.

**Detector question.** Is this code change going through the editor, or through the shell's read, replace and write, with its encoding, precedence and quoting rules?

**Warning sign.** "It's a quick replace, I'll do it in one command" · "several replacements at once is faster".

**What to do.** Change code with the editor's own edit and write tools. When a change has to be scripted, write the script to a file and run it with an interpreter that reads and writes UTF-8 and has plain string literals (`node fix.mjs`, `python -I fix.py`). Then look at the diff: a change that touched more lines than you meant, or characters you didn't touch, is the shell's.

### 60. What travels as a process argument has a ceiling you don't see until it grows

`origin: field · claude-opus-5-5 · 2026-10` · `groups: scripts-and-files`

**The idea.** A library that launches another program may pass your text to it as command-line arguments. The operating system caps that line (on Windows, about 32 thousand characters), and the error you get when you cross it almost never says so.

**Example.** A server called a language model through a library that starts a command-line tool and hands it a long setup text as a flag. With short texts it worked. One role's setup text included a rules file several pages long: on Windows it failed with "the filename or extension is too long", and the library reported it as "tool not found". It was fixed by passing that text in a temporary file.

**Detector question.** This text that grows with the content (a setup text, a list, a query): how does it reach the other process — command line, environment variable, URL? What happens when it is ten times longer?

**Warning sign.** "It already worked with the short example".

**What to do.** Whatever can grow travels in a file, through standard input or in a request body, never as arguments, environment variables or the URL. Test once with the longest text you expect, on the strictest system it will run on.

### 62. Stopping background work means stopping whatever launches it, then proving nothing is left

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** Long background work usually has a launcher (a script that runs the steps one after another) and child processes (each step). Kill only the child and the launcher starts the next step; the GPU, the disk or the network stay busy while you report "it's stopped".

**Example.** A user asked to stop a model-training job that was running overnight. The agent that launched it was stopped, then the Python process that was training. A check found another Python process training under a new PID: the launcher script had moved on to the next step. It took finding the whole process tree, closing the launcher and a `tail -f` still following the log, and confirming with `nvidia-smi` what was still using the GPU.

**Detector question.** Who launched this process, and will it launch it again if I close it? After stopping it, which command proves nothing of mine is still running?

**Warning sign.** "I killed the process, it's stopped."

**What to do.** Close the whole tree from the launcher (`taskkill /t /f` on Windows, kill the process group on Unix). Then search running processes by command line for anything left from that job, and check the resource (GPU, port, file lock) until it is free; say "stopped" only after that check (see lesson 38). By design, give the job a clean stop (a `STOP` file it checks before each step), and make the launcher stop when a step is killed instead of moving on to the next one.

### 69. A process you start from a short-lived tool dies when the tool ends

`origin: field · claude-opus-5-5 · 2026-10` · `groups: git-and-process`

**The idea.** A server or a long-running program launched from a command that finishes (an assistant's tool call, a CI step, a remote session) usually becomes a child of that command. When the command ends, the tool or runner usually closes everything it started (its process group, its job, its session). You saw it start and answer; a minute later it is gone, and nothing tells you.

**Example.** A person's local app was still running an old version. To give them the new one, the app's start script was relaunched from the assistant's command tool, the server was seen answering on its port, and the person was told "it's now on the new version". The tool call ended, the system closed the processes it had opened, and the person was left with no app at all. It surfaced half an hour later, when an agent found nothing listening on the ports.

**Detector question.** Whose child is what I just started, and does it stay alive when that parent ends? Did I check it after the tool finished, or only while it was running?

**Warning sign.** "I restarted it, it answers on the port."

**What to do.** What a person uses every day, they start themselves, with their own shortcut or service. If you must start it, detach it from the parent (a background mode that survives the command, a system service) and check in a separate call, afterwards, that it is still alive. If you can't guarantee it, don't say it's done: ask them to open it. Stopping such work is lesson 62; starting it twice, lesson 22.
