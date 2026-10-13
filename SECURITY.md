# Security

Ritual's hooks run on your machine on every command and edit Claude makes. They read `.ritual/` and the plugin's own files, plus, once per session, Claude Code's own record of installed plugins and marketplaces (to know when Ritual was last updated and whether auto-update is on). They write only to `.ritual/local/`, never use the network, and do nothing in a project without `.ritual/`. Its scripts use `gh` and `git` only when you run them yourself.

## Reporting a vulnerability

Please don't open a public issue. Report it privately: in this repository, open **Security** → **Report a vulnerability**. Say what an attacker could do, and how to reproduce it.

You'll get an answer within a week. A fix goes out as a commit to `main`, and users get it with `claude plugin update ritual@ritual`.

## Lessons about security

Mistakes that open a hole without visibly breaking anything belong in the `security` package. They can go in as `origin: proposal` with a public `source:`. Share them like any other lesson; a lesson that describes how to exploit a live system goes through the private report instead.
