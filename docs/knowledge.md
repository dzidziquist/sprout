# Keeping PlantFam's knowledge up to date

PlantFam gives its advice offline, from data files in the app: no AI or network at run time, so it stays
free and private. A weekly scheduled Claude Code task keeps that knowledge growing and correct, and
each run opens **one pull request** for a human to review before it ships.

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

1. Read this file and `docs/knowledge-topics.md`; take the first unticked topic.
2. Research it from the sources above. Compare with what the files say now.
3. Make small, careful changes: fix what's wrong or out of date, fill real gaps. Fewer, well-sourced
   changes beat many shaky ones. If nothing needs changing, say so.
4. Review the oldest entries (above) and stamp them.
5. Run `npm run ts:check` and `npm test`. Both must pass.
6. Tick the topic off, with the date and the PR.
7. Open one PR titled `Knowledge: <topic> + review`, with three parts: the topic's changes, the review
   (each entry checked, what changed or "still right"), and anything that needs a human look. Every
   change with its source. Never merge it.
