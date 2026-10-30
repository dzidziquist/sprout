# Keeping PlantFam's knowledge up to date

PlantFam gives its advice offline, from data files in the app: no AI at run time, so it stays free and
private. A weekly scheduled Claude Code task keeps that knowledge growing and correct, and each run opens
**one pull request** for a human to review before it ships. Once merged, the plant doctor, mixes and
species notes reach phones within a day as a **knowledge pack**, without a new build (below).

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
| `knowledge/ids.json` | Every cause, symptom and species id ever shipped: add new ones, never remove any |

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

## Knowledge packs

What ships over the air, without a new build, once a PR is merged:

| In the pack | Ships only with a build |
|---|---|
| Plant doctor: symptoms, causes, checks, fixes, sources, species notes, symptom pictures | The doctor's scoring and the signals it reads |
| Mix brands | Feeding and crop rules (`src/data/edibles.ts`, the engine) |
| Species tips, aliases and pet safety for plants already in the app | New species (they need their art first), care groups, light, soil |

How it works:

1. A merge to `main` that touches the knowledge runs `.github/workflows/kb-publish.yml`: tests and evals,
   then `scripts/build-kb-pack.ts`, which publishes `kb/v<format>/manifest.json`, the pack and any new
   symptom pictures to this repo's GitHub Pages. The job summary lists anything left out.
2. Once a day, when the app opens (or from Settings → Plant knowledge → Check now), the phone fetches the
   manifest. A newer pack is downloaded, every file checked against its MD5 and every entry checked against
   what that build understands (`src/engine/knowledgePack.ts`), then laid over the built-in knowledge.
   Anything wrong and the phone keeps what it had. A build made after a pack ignores it (the TestFlight
   workflow stamps each build with its commit time).
3. Laid over, never removed: an entry missing from a pack keeps its built-in version. Drafts go in only as
   `{ id, status: 'draft' }` stubs, which is also how a pack withdraws a live entry that turned out wrong.

Rules the tests enforce:

- **The format.** A pack can only use the signals, symptom areas, care tweaks and mix kinds in
  `knowledge/formats/<n>.json`. An entry that needs something new (a new signal, say) is "needs an app
  update": PRs say so, the publish step leaves it out of older formats, and it reaches phones with the next
  build. When the app learns new vocabulary, raise `KB_FORMAT` and run `npx vite-node scripts/freeze-kb-format.ts`;
  both formats are then published.
- **Ids are forever.** Plants and diaries point to species, cause and symptom ids, so every id is listed in
  `knowledge/ids.json` and none may be removed. New ids are added there in the same PR.

Rolling back: revert the PR and merge; the next pack wins on every phone within a day (at once with Check now).
Or run the publish workflow by hand from an earlier commit.

Art for new species and symptom pictures is generated with Codex (OpenAI) from the prompts in `docs/`
(`docs/symptom-art-prompts.md` and the buddy prompts). Packs can carry symptom pictures today; new species
with their own art are phase 2.

## Review before merging

Codex (OpenAI), connected to this repo, reviews every pull request automatically. The owner reads the
PR and Codex's findings, asks for fixes where needed, and merges only advice they're happy to ship.
