---
name: handoff
description: Generate a handoff document that brings a brand-new chat session fully up to speed on the current work, so nothing is lost when this conversation is abandoned for a fresh one.
when_to_use: Use when the conversation is getting long, context or usage limits are near, or the user says "handoff", "hand off", "make a handoff", "continue in a new chat", "transfer context", "I need to start a new conversation", "wrap this up so I can start fresh", or similar.
argument-hint: [optional short title for the handoff]
allowed-tools: Bash(git status:*) Bash(git log:*) Bash(git diff:*) Bash(git branch:*) Bash(git add:*) Bash(git commit:*) Bash(git push:*) Bash(git mv:*) Bash(git show:*) Read Write Glob Grep
---

# Handoff

Produce a handoff document that lets a **cold-start session** — one that has seen
nothing of this conversation — resume the work with zero loss. The next session
knows only what you write down. Anything you leave out is gone forever.

## Ground truth (captured automatically at invocation — use this, not memory)

Current branch:
!`git branch --show-current`

Working tree:
!`git status --short --branch`

Recent commits:
!`git log --oneline -10`

Uncommitted changes summary:
!`git diff HEAD --stat`

## Step 0 — Prune stale handoffs (automatic, runs before writing the new one)

`.claude/handoffs/` accumulates one file per handoff ever created. A stale one
sitting next to a fresh one is a trap: someone opens the wrong file and treats
outdated state as current. Before writing today's handoff, sweep the existing
ones:

1. `ls .claude/handoffs/*.md` (skip anything already under `.claude/handoffs/archive/`).
2. For each existing handoff, read its header line (`Branch: ... | Pushed: ...`)
   and its "Next steps" section, then decide if it's stale:
   - **Branch gone or merged** — `git branch --show-current` /
     `git log --oneline <branch>` fails, or the branch's commits are already
     reachable from the current default branch (`git log origin/main..<branch>`
     empty, adjust default-branch name to match this repo).
   - **Superseded** — a later handoff covers the same branch/topic more currently.
   - **Next steps already done** — quick-check against current repo state (e.g.
     a next step says "add function X to file Y" and it's already there).
   Only mark it stale on solid evidence. If genuinely unsure, leave it alone —
   a false "keep" costs nothing; a false "archive" could bury something someone
   still needs.
3. For each stale one: `git mv .claude/handoffs/<file> .claude/handoffs/archive/<file>`
   (create `archive/` if needed). **Never delete outright** — archiving keeps the
   history recoverable.
4. Roll this into the same commit as the new handoff in Step 3, with a combined
   message (e.g. "Add handoff for X; archive N stale handoff(s)"). Mention what
   was archived, and why, in your reply to the user — one line each is enough.

If nothing is stale, skip silently — don't report a no-op.

## Step 1 — Gather what git can't show

The injected output above covers repo state. Before writing, also collect from
the **conversation itself** — this is the part only you can save:

- The user's original request and every scope change or clarification since.
- Decisions the user made or approved, and alternatives they rejected.
- Anything you verified (tests run, output observed) vs. merely believe.
- Environment state outside git: servers started, env vars set, scratch files,
  logins, background tasks.
- Promises made to the user that aren't fulfilled yet.
- Hard-won discoveries: commands that fail and their workarounds, misleading
  errors, flaky tests, places the code or docs lie.

If a claim like "tests pass" is cheap to re-verify, re-verify it now. Never
hand off an unverified claim as fact.

## Step 2 — Write the handoff document

Write to `.claude/handoffs/YYYY-MM-DD-<short-slug>.md` (create the directory if
needed; use $ARGUMENTS for the slug/title if provided). Every section below is
required — write "None" rather than omitting one, so the next session knows
nothing was silently dropped:

```markdown
# Handoff: <one-line title>

Date: <date> | Branch: <branch> | Last commit: <hash> <subject> | Pushed: <yes/no>

## Objective
What the user originally asked for, as close to their words as possible, plus
every scope change or clarification made along the way. This is the contract —
the next session must not re-negotiate or re-interpret it.

## Current state
- DONE and VERIFIED: what, and how it was verified (which test/command, what output)
- DONE but UNVERIFIED: what, and exactly how to verify it
- IN PROGRESS: exactly where work stopped — file, function, half-formed idea
- NOT STARTED: remaining scope

## Repo / environment state
- Branch, unpushed commits, uncommitted/untracked files (list them from git status)
- Anything live outside git: running servers with ports, env vars set, services
  logged into, files in scratch/temp dirs that matter

## Key decisions
Each decision with its WHY. Include rejected alternatives and why they were
rejected, so the next session doesn't waste time re-proposing them.

## File map
Every file that matters to this work, with its role:
- `path/to/file.ts` — what it does / what was changed in it and why
Relevant files only — not a directory listing.

## Gotchas & learnings
Non-obvious things discovered the hard way: commands that fail and their
workarounds, misleading error messages, flaky tests, env quirks, API surprises,
places where docs or code lie. This section saves the next session the most
time — be generous.

## Next steps
Ordered and concrete. Step 1 must be immediately actionable with zero
investigation — name the exact file and/or command to start with.
1. ...
2. ...

## User preferences & constraints
Everything the user expressed about HOW they want things done: style, tools to
use or avoid, things they said no to, tone, deadlines, communication
preferences. Plus any unfulfilled promises made to the user.
```

### Writing rules

- **Assume total amnesia.** No "as discussed", "the earlier approach", "that
  bug" — every reference must be self-contained with full paths, names, values.
- **Exact over vague.** Real file paths with line numbers, exact commands with
  flags, verbatim error messages, actual branch/commit names. "Fix the config"
  is useless; "`service-nsw/config.json` line 14: `timeout` must stay ≥ 30 or
  the retry loop in `client.py:88` spins" is a handoff.
- **Distinguish fact from belief.** Mark anything unverified as UNVERIFIED. A
  confidently stated wrong fact costs the next session more than an honest gap.
- **Dense, not terse.** Cut ceremony, keep information. When unsure whether a
  detail matters, include it — the reader can skip; they cannot recover what
  was never written.
- **No secrets.** Reference where credentials live ("token in env var `X`"),
  never the values themselves.

## Step 3 — Persist and deliver

1. **Commit and push** the handoff file (and any Step 0 archiving) to the
   current working branch. Remote sessions run in ephemeral containers — an
   unpushed file dies with the container. If the working tree has unrelated
   uncommitted changes, stage and commit ONLY the handoff-related paths
   (`git add .claude/handoffs/ && git commit`); do not sweep in unrelated work.
2. **Paste the full document in chat** as well, so the user can copy it into
   the new conversation directly without opening the repo.
3. End your reply with the exact starter message for the user to paste into the
   new chat, for example:

   > Read `.claude/handoffs/2026-07-10-payment-refactor.md` on branch
   > `claude/feature-x`, then continue from its "Next steps" section.

## Quality bar

Before finishing, self-test: *if I were spawned fresh with only this document
and the repo, could I continue the work without asking the user a single
question?* If any question would still be necessary, its answer belongs in the
document — go add it.
