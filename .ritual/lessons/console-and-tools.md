# Console and tools (this repository's lessons)

### P-1. A pipeline's exit status is the last command's

`origin: field · claude-fable-5-1 · 2026-10` · `refines: 44`

**The idea.** Piping a test into `| tail` or `| grep` to read less does not only trim the output: it changes the verdict. The exit status the next `&&` sees is `tail`'s, which is always zero. The test failed and the commit went through.

**Example.** `npm test --silent 2>&1 | tail -4 && git commit …`: a script would not load because of a duplicated variable, Node printed the stack trace, `tail` showed it in full and returned zero, and the commit was made and pushed with the test broken. It was noticed only because the trace was visible in the output; had it been longer than four lines, not even that.

**Another example.** In PowerShell, `node mutate.mjs | Select-Object -First 1` to see only the first line: `-First` stops the pipeline as soon as it has its lines, so the script was cut off mid-run, exited 255 and never reached the cleanup at its end. A mutated copy of a source file stayed in the repository.

**Detector question.** The command that decides whether I go on (`&&`, an `if`, a hook): is it the test, or the one trimming its output? And does the trimming let the script finish?

**Warning sign.** "The last lines are enough" · "I chain it so it is a single command" · "just the first line".

**What to do.** `set -o pipefail &&` at the start of the line, or save the full output to a file and read the verdict there. Never cut a script that cleans up after itself with `Select-Object -First`: save its output and read the lines you want. In this repository the guard blocks both (`verdict-through-tail` and `script-cut-by-select-first` in `.ritual/guard.json`).

### P-2. Code goes through the editor, not through the shell's text handling

`origin: field · claude-opus-5-5 · 2026-10`

**The idea.** Rewriting a source file with the shell's own string tools (read it, replace, write it back) passes the code through rules made for something else: a default encoding, operator precedence, escaping. The change looks right in the command and the file comes out different.

**Example.** Two edits in one session, both in PowerShell 5.1. `(Get-Content f.mjs) -replace … | Set-Content f.mjs -Encoding utf8` read the file in the system's ANSI code page and wrote it back as UTF-8: every ✓ and · in it became `âœ“` and `Â·`, and the selftest printed the mangled check mark. And a list of replacements written as `@('old', 'new' + "`n" + 'more')` lost lines: in PowerShell the comma binds tighter than `+`, so the pair became four items and only `'new'` was written.

**Detector question.** Is this code change going through the editor, or through the shell's read, replace and write, with its encoding and its precedence rules?

**Warning sign.** "It's a quick replace, I'll do it in one command" · "several replacements at once is faster".

**What to do.** Change code with the Edit or Write tools. When a change has to be scripted, write the script to a file and run it with node, which reads and writes UTF-8 and has no surprises in its string literals. In this repository the guard blocks PowerShell writes to code files (`shell-writes-code` in `.ritual/guard.json`).
