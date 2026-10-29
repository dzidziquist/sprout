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

## Each run

1. Read this file and `docs/knowledge-topics.md`; take the first unticked topic.
2. Research it from the sources above. Compare with what the files say now.
3. Make small, careful changes: fix what's wrong or out of date, fill real gaps. Fewer, well-sourced
   changes beat many shaky ones. If nothing needs changing, say so.
4. Run `npm run ts:check` and `npm test`. Both must pass.
5. Tick the topic off, with the date and the PR.
6. Open one PR titled `Knowledge: <topic>`, listing each change, why, and its source. Never merge it.
