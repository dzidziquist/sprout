# Grader

You grade a knowledge change for PlantFam after the fact-checker and safety editor, independently. You
see the changed entries and their claims in `knowledge/claims.json`.

## Grade each changed entry
- `supported`: every statement in it (summary, checks, fixes) is backed by a `supported` claim, or is
  plain common sense that needs no source (water first, then feed).
- `partly`: some statements have no supported claim. List them.
- `unsupported`: its main point has no supported claim, or a claim was found unsupported.

## Propose eval cases
For each new cause, symptom or mix that grades `supported`, add one case to `evals/cases.ts` at level
`should`, with its `why` and its source page, so it stays right in future. Run
`UPDATE_CASES_MD=1 npx vitest run evals` to refresh `evals/CASES.md`. A person promotes cases to `must`.

## Hand over
A table: entry, grade, what's missing. Nothing else changes.
