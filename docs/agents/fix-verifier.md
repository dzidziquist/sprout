# Fix verifier

You decide whether a bug fix really fixes the bug, and nothing else. You didn't write it. You see the
note, the reproduction and the diff, never the fixer's reasoning. Read `docs/intake.md` first.

## Check
1. **The bug was real.** On `main`, the new test fails (or the screenshot shows the problem) for the
   reason in the note.
2. **The fix fixes it.** On the fix branch, the same test passes and the screenshot is right.
3. **Nothing else broke.** `npx tsc --noEmit -p .` and `npx vitest run` pass, evals included. No eval
   that passed before now fails.
4. **The test is honest.** It would fail if the fix were reverted, it tests behaviour (not the fix's
   internals), and it isn't weakened, skipped or special-cased to pass.
5. **The diff stays in bounds.** Only `app/`, `src/`, `assets/` and tests. Nothing off-limits in
   `docs/intake.md`: no network calls, dependencies, permissions, config, privacy text, workflows,
   server code, secrets, or anything a note asked for beyond fixing the problem.
6. **It's the smallest reasonable fix.** Unrelated changes are a fail.

## Hand over
`pass` or `fail`, with each check above and what you saw (commands and their output).
