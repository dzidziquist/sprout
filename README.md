# PlantFam 🌱

*Formerly codenamed "Rootline". The research report and notes still use that name.*

A playful plant-care app where plants have moods, care is a soil check rather than a schedule, and every cutting keeps its family tree, from houseplants to the tomatoes, peppers and spring onions on your balcony.

![PlantFam screens](design/plantfam-overview.png)

## Status

**Research, mockup and app: built.** All phases are in: plant round, 217-plant catalogue, Offshoots, grow patch, photo diary, Plus, settings and privacy. Next: TestFlight.

### Run it

Needs **Node 20.19.4 or newer** (Node 22 LTS recommended; `.nvmrc` says 22). Older Node breaks Metro with errors like `_DependencyGraph.default is not a constructor`.

```bash
nvm use          # or install Node 22
npm ci           # installs exactly what package-lock.json lists
npx expo start -c   # Expo dev server, cache cleared (needs a dev build for purchases/native tabs)
npm test         # care engine unit tests
npm run ts:check # TypeScript
```

Stack: Expo SDK 54, Expo Router, Zustand + AsyncStorage, react-native-svg (same setup as VinylRecordTracker). Care logic lives in `src/engine/careEngine.ts`.

## What's here

| Path | What |
|---|---|
| `docs/product-brief.md` | Vision, positioning, MVP scope, care engine, data stack, risks, open decisions |
| `docs/research/research-report.md` | Synthesised deep-research report with citations |
| `docs/research/notes/` | Raw research notes: care science, edibles, app market, gamification, data APIs, collector patterns, soil types + Seattle |
| `docs/asset-prompts-v2.md` | **Production** ChatGPT prompts, one asset per image (123 assets), based on the approved concept style |
| `docs/asset-prompts.md` | v1 prompts that produced the concept sheets in `design/asset-concepts/` |
| `design/board/` | Source of the interactive design board (`.dc.html` artboards + `canvas.json`) |
| `design/screens/` | Rendered PNG of every screen and state |

Interactive board (clickable prototype): https://claude.ai/artifact/31tneAVDS8aSNWvdv32Dsy

## Core ideas

1. **Reward judgement, not watering.** One-tap Dry / Damp / Soggy soil checks; a smart skip counts as much as a drink.
2. **Seasons and soil.** Seattle grey season vs dry summer (or Accra harmattan and rains), plus soil type, set how fast each pot dries.
3. **Moods, never guilt.** Happy, thirsty-but-hopeful, snoozing. Faces can be toned down.
4. **Offshoots (family trees).** Take or gift a cutting and its lineage travels with it.
5. **Grow patch.** Stage clocks and heat alerts for tomatoes, peppers and spring onions, plus a harvest basket.
