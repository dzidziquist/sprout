# PlantFam 🌱

*Formerly codenamed "Rootline". The research report and notes still use that name.*

A playful plant-care app for iPhone where plants have moods, care is a soil check rather than a schedule, and every cutting keeps its family tree, from houseplants to the tomatoes, peppers and spring onions on your balcony.

![PlantFam screens](design/plantfam-overview.png)

## Status

**In TestFlight.** The version people see is in `app.json` (`1.0.x`, raised with each set of changes); TestFlight's build number goes up by itself on every build.

## What it does

- **Plant round.** One-tap Dry / Damp / Soggy soil checks instead of a watering schedule. Each plant learns its own drying rhythm from its checks, the season, its pot and its mix.
- **217-plant catalogue** with photo ID (Pl@ntNet), care groups, pet safety and tips.
- **Light.** Room windows and where each plant sits give a light estimate through the seasons; the camera light meter (back camera, pointed at the window) measures it.
- **Grow patch** for edibles: stage clocks, a month-by-month calendar for Seattle and Accra, weather alerts, feeding that knows the season and the mix, and a harvest basket.
- **Mix and feeding.** Record the mix a plant went into (kind of fertiliser, well-known brands filled in, exact potting day, or the same mix for every edible). Feed reminders wait while fresh mix still feeds the plant, then say when the next feed is due.
- **Plant doctor** ("Something wrong?"): pick what you see, get ranked possible causes using the plant's own story (checks, light, pot, mix, feeds, season).
- **Offshoots.** Cuttings keep their lineage; rooting tracker; memories of plants gone.
- **Photo diary**, milestones and gifts (app icons, card colours), Home Screen widgets that show your own plants.
- **Household sharing** over iCloud (CloudKit): look after the same jungle together; only the owner invites.
- **iCloud backup**, weekly, kept for four weeks; restore on a new phone.

### Privacy

No account, no tracking, no ads. Plants live on the phone. iCloud is only used for the backup and household sharing, in the person's own iCloud. Photo ID sends the photo to Pl@ntNet only when asked. All advice is worked out on the phone from the app's own data: no AI service is called at run time. Once a day the app downloads the latest plant knowledge from GitHub Pages (the public `plantfam-knowledge` repo), a plain file download that sends nothing about the person.

## Run it

Needs **Node 20.19.4 or newer** (Node 22 LTS recommended; `.nvmrc` says 22). Older Node breaks Metro with errors like `_DependencyGraph.default is not a constructor`.

```bash
nvm use             # or install Node 22
npm ci              # installs exactly what package-lock.json lists
npx expo start -c   # Expo dev server, cache cleared (purchases, native tabs, iCloud and widgets need a dev build)
npm test            # unit tests (care engine, grow patch, plant doctor, sync, backup…)
npm run ts:check    # TypeScript
npx expo export -p web   # a web preview build, handy for screenshots
```

Stack: Expo SDK 54, Expo Router, Zustand + AsyncStorage, react-native-svg, a local Expo module for CloudKit (`modules/household`) and a WidgetKit target (`targets/widget`).

## Where things are

| Path | What |
|---|---|
| `app/` | Screens (Expo Router) |
| `src/engine/` | The logic, pure and tested: care engine, light, grow patch, feeding, mix, plant doctor, household sync, backup |
| `src/data/` | The knowledge: species catalogue, crop guides and calendars, plant doctor, potting mixes |
| `src/lib/`, `src/store/` | Glue to the phone (notifications, iCloud, widget) and the app's saved state |
| `modules/household/` | Swift CloudKit bridge for household sharing |
| `targets/widget/` | Home Screen widget (SwiftUI) |
| `plugins/` | Expo config plugins (iCloud, entitlements, deployment target) |
| `docs/launch-setup.md` | One-time setup: Apple, App Store Connect, iCloud container, CloudKit schema |
| `docs/knowledge.md` | How the knowledge is kept up to date and shipped over the air (below) |
| `knowledge/` | Claims ledger, approved sources, pack formats and the id list |
| `docs/product-brief.md`, `docs/research/` | Vision, research report and raw notes |
| `docs/*prompts*.md`, `design/` | Art prompts, design board and screen renders |

## Building and releasing

- **TestFlight:** run the **TestFlight (GitHub Mac)** workflow from the Actions tab. It tests, builds with Xcode 26 on a GitHub macOS runner and uploads to App Store Connect (Apple's processing then takes 5–30 minutes). Start one build at a time.
- **Version:** raise `version` in `app.json` (1.0.1, 1.0.2…) for each set of changes. Build numbers are handled by EAS.
- **Signing** is set up once by the **Set up signing (one time)** workflow; see `docs/launch-setup.md`.
- **iCloud schema:** record types `Item`, `Photo` and `cloudkit.share` must exist in the CloudKit Production schema (see `docs/launch-setup.md`).

## Knowledge, kept up to date

The app's advice comes from data files, so it stays free, private and offline. A **weekly scheduled Claude Code task** (Saturdays) grows and re-checks it, built so wrong data doesn't reach anyone (`docs/knowledge.md`):

- **Separate agents** (`docs/agents/`): a researcher drafts; a fact-checker who sees only the claims opens every page itself; a safety editor reviews the diff; a grader grades the result.
- **Claims ledger** (`knowledge/claims.json`): every fact behind a verified entry has a page from an approved site (`knowledge/sources.json`) and the exact words that support it.
- **Drafts stay hidden**: entries are `draft` until they pass, and the app never shows drafts.
- **Evals** (`evals/`, readable in `evals/CASES.md`): plant situations with the answer the app must give, run on every change (`npm test`). A weekly workflow re-opens every source page.
- **Codex** (OpenAI, connected to this repo) reviews every pull request, and a person merges.
- **Over the air:** once merged, the plant doctor, mixes and species notes reach phones within a day as a *knowledge pack* published to the public `plantfam-knowledge` repo's GitHub Pages (`.github/workflows/kb-publish.yml`), checked on the phone before use. App code still ships through TestFlight.
- **Art** (new plant buddies, symptom pictures) is generated with Codex from the prompts in `docs/`.

## Secrets

Nothing secret is in this repository, and none has ever been committed. Keep it that way:

- **All credentials live in GitHub repository secrets** (Settings → Secrets and variables → Actions): `EXPO_TOKEN`, `ASC_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`, `EXPO_PUBLIC_PLANTNET_KEY`, and `KB_DEPLOY_TOKEN` (a fine-grained token that can only write `dzidziquist/plantfam-knowledge`). Workflows read them at run time; the App Store Connect key is only written to the runner's temporary folder.
- **Never paste a key, token or `.p8` file into the code, an issue, a pull request or a chat.** `.gitignore` refuses `.env` files and key files as a safety net.
- `EXPO_PUBLIC_PLANTNET_KEY` ends up inside the app (anything `EXPO_PUBLIC_` does), so treat it as public: restrict it in the Pl@ntNet dashboard to the bundle id `com.dzidziquist.plantfam`.
- The EAS project id in `app.json` and the App Store app id in `eas.json` are public identifiers, not secrets.
- If a secret might have leaked: revoke it at its source (App Store Connect, Expo, Pl@ntNet), make a new one, and update the GitHub secret.

## Core ideas

1. **Reward judgement, not watering.** One-tap Dry / Damp / Soggy soil checks; a smart skip counts as much as a drink.
2. **Seasons and soil.** Seattle grey season vs dry summer (or Accra harmattan and rains), plus soil type, set how fast each pot dries.
3. **Moods, never guilt.** Happy, thirsty-but-hopeful, snoozing. Faces can be toned down.
4. **Offshoots (family trees).** Take or gift a cutting and its lineage travels with it.
5. **Grow patch.** Stage clocks, a seasonal calendar, feeding that knows the mix, and a harvest basket.
