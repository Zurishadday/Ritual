# Console and tools (this repository's lessons)

### P-1. A pipeline's exit status is the last command's

`origin: field` · `refines: 44`

**The idea.** Piping a test into `| tail` or `| grep` to read less does not only trim the output: it changes the verdict. The exit status the next `&&` sees is `tail`'s, which is always zero. The test failed and the commit went through.

**Example.** `npm test --silent 2>&1 | tail -4 && git commit …`: a script would not load because of a duplicated variable, Node printed the stack trace, `tail` showed it in full and returned zero, and the commit was made and pushed with the test broken. It was noticed only because the trace was visible in the output; had it been longer than four lines, not even that.

**Detector question.** The command that decides whether I go on (`&&`, an `if`, a hook): is it the test, or the one trimming its output?

**Warning sign.** "The last lines are enough" · "I chain it so it is a single command".

**What to do.** `set -o pipefail &&` at the start of the line, or save the full output to a file and read the verdict there. In this repository the guard blocks it (`verdict-through-tail` in `.ritual/guard.json`).
