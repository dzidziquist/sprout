# Keeping PlantFam's knowledge up to date

PlantFam gives its advice offline, from data files in the app: no AI or network at run time, so it stays
free and private. A weekly scheduled Claude Code task keeps that knowledge growing and correct, and
each run opens **one pull request** for a human to review before it ships.

Wrong advice is kept out four ways:

1. **Separate agents**, each starting fresh with one job (`docs/agents/`): a researcher drafts, a
   fact-checker who sees only the claims opens every page itself, a safety editor reviews the diff, and a
   grader grades the result. Nobody checks their own work.
2. **A claims ledger** (`knowledge/claims.json`): every fact behind a verified entry has a page from an
   approved site (`knowledge/sources.json`) and the exact words that support it.
3. **Drafts stay hidden.** Entries carry `status: 'draft' | 'verified'`; the app never shows drafts.
   (Entries without a status were written and reviewed by hand before this pipeline.)
4. **Evals** (`evals/`, readable list in `evals/CASES.md`): plant situations with the answer the app must
   give. Every change runs them; a `must` case failing blocks it. A weekly workflow re-opens every source
   page to catch dead links and pages that changed.

Then Codex reviews the pull request, and a person merges it.

## What the task may change

Only these knowledge files (and their tests):

| File | What's in it |
|---|---|
| `src/data/diagnosis.ts` | The plant doctor: symptoms, causes, checks, fixes, species notes |
| `src/data/mixes.ts` | Well-known potting mixes and what food they carry |
| `src/data/edibles.ts` | Crop guides: stages, tips, feeding, the climate calendars |
| `src/data/catalog/*.ts` | Species: care group, light, soil, pet safety, tips |
| `docs/knowledge-topics.md` | The rotation of topics (tick off the one done) |

Never app code, screens, the engine's scoring, build files or anything else. If a fix needs code, say
so in the PR description instead.

## Sources

Every new or changed fact needs a source the reviewer can open:

- University and government extension services: WSU, OSU, UC IPM, University of Minnesota, Clemson
  HGIC, UF/IFAS, Penn State and the like; the RHS; for Ghana and West Africa, CSIR and MoFA guides.
- For mixes and fertilisers: the maker's own product page or label.
- Not blogs, forums, shops' advice pages or AI answers.

Put sources in the entry's `sources` (doctor causes) or `source` (mixes), and list them all in the PR.

## House rules for the words

- Plain words, short sentences, written for someone new to plants. "Possible cause", never certainty.
- Common care mistakes before rare diseases. Checks the person can actually do.
- **Never pesticide or chemical doses** (no ml, per litre, neem, insecticide…): a test enforces it.
- Feeding advice says half strength when in doubt.
- Match the existing style: British spelling ("fertiliser", "colour"), curly apostrophes (’).

## Reviewing what's already there

Knowledge goes stale and mistakes slip in, so every run also re-checks old entries, not just new ones.
Doctor causes and mixes carry `reviewed: 'YYYY-MM'`, the month they were last checked against their
sources. Unset means never reviewed, which counts as oldest.

- Each run reviews the **5 doctor causes and 3 mixes with the oldest (or no) `reviewed`** month, besides
  its topic.
- Reviewing means: open each source, confirm the advice still matches (the summary, the checks, the
  fixes), correct anything that doesn't, add a source where there's none, and set `reviewed` to this
  month. Only stamp an entry after actually checking it, and only once it has a source.
- Anything you're unsure about: don't change it, list it in the PR as "needs a human look".
- Once a year (each January run), also go through `src/data/edibles.ts` feeding and calendar lines for
  both climates, as the topic for that week.

## Each run

The run is an orchestrator: it doesn't research or judge itself, it hands each step to a fresh agent
(the Agent tool) with that agent's file from `docs/agents/` and only the inputs listed there.

1. Read this file and `docs/knowledge-topics.md`; take the first unticked topic. Also pick the review
   batch: the 5 causes and 3 mixes with the oldest (or no) `reviewed`.
2. **Researcher** (`docs/agents/researcher.md`): drafts the topic's changes, and gathers claims for the
   review batch. New entries go in as drafts; every fact as a pending claim with its exact quote.
3. **Fact-checker** (`docs/agents/fact-checker.md`), given only the pending claims: opens every page and
   sets each verdict.
4. **Safety editor** (`docs/agents/safety-editor.md`), given only the diff: approves or flags each entry.
5. **Grader** (`docs/agents/grader.md`): grades each changed entry and proposes `should` eval cases.
6. **Promote**: an entry becomes `status: 'verified'` (and gets `reviewed` this month) only if all its
   claims are `supported`, the safety editor approved it and the grader graded it `supported`. Anything
   else stays a draft, and a correction to a live entry that doesn't pass is taken back out.
7. Run `npm run ts:check`, `npm test` (ledger rules and evals) and `node scripts/check-sources.mjs`. All
   must pass.
8. Tick the topic off, with the date and the PR.
9. Open one PR titled `Knowledge: <topic> + review` with: what was promoted, what stayed draft and why,
   the review batch (each entry: changed or "still right"), the grader's table, proposed eval cases, and
   anything needing a person. Every change with its source. Never merge it.

## Review before merging

Codex (OpenAI), connected to this repo, reviews every pull request automatically. The owner reads the
PR and Codex's findings, asks for fixes where needed, and merges only advice they're happy to ship.
