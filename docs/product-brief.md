# Rootline: product brief

**Owner:** Claude (product + design + build), with the founder as decision-maker on taste, brand and launch.
**Status:** Research and mockup done. **Paused before the app build**, waiting for founder sign-off.
**Board:** https://claude.ai/artifact/31tneAVDS8aSNWvdv32Dsy · Screens: `design/screens/` · Research: `docs/research/`

---

## One line

A playful plant-care app where plants have moods, care is a **soil check** rather than a watering schedule, and every cutting keeps its **family tree**, covering houseplants and the peppers, tomatoes and spring onions on your balcony.

## Why this, why now

- **The market charges $30–48/yr for reminders and photo ID** (Planta, PictureThis, Greg). The loudest complaints are paywalls that auto-charge after a trial, confidently wrong IDs, and fixed schedules that overwater.
- **Overwatering is the main killer.** University extension guidance (Illinois, RHS, UConn) says to water "when they need it and not according to the calendar". Most apps still nag on a calendar. Rootline asks you to check the soil and learns from the answer.
- **Lineage and harvests sit in indie corners.** No polished app combines mainstream care, a parent→cutting family tree with provenance, and sow-to-harvest tracking for edibles. Collectors today use Notion templates.
- **Persona zero is the founder.** A data analyst and indie builder in **Seattle**: a houseplant collector, pepper/tomato/spring-onion grower, vinyl and LEGO collector, gamer. She lives the cross-over between care, collecting and growing.

## Positioning

> **Rootline rewards judgement, not watering.**
> Other apps tell you when to water. Rootline teaches you when *not* to, remembers where every cutting came from, and celebrates your first harvest.

## Design principles (validated by research)

1. **The soil check is the unit.** Dry / Damp / Soggy, one tap. A correct skip earns the same credit as a watering. *(A daily "watered" streak would train overwatering.)*
2. **Seasons come from place, not the calendar.** Temperate homes get winter dormancy. Accra gets shorter intervals during harmattan and gnat/rot watch in the rains.
3. **Plants have feelings, never guilt.** Thirsty-but-hopeful, happy, snoozing. No crying or dying faces, no "you forgot me". Faces can be set to Full / Gentle / Off. *(Self-blame after a broken streak drives churn: JCR 2023.)*
4. **Celebrate outcomes.** New leaves, first roots, first harvest, "survived harmattan". Streak = weeks with no overdue checks, with **free** repair.
5. **One notification a day.** A single "plant round", silent when nothing is due.
6. **Collector bones, no marketplace.** A catalogue entry vs your individual plant, a wishlist, lineage as provenance. No prices, value charts or auctions.

## MVP scope

**P0 (launch)**
- Plant profiles as individual instances (editable species, editable past logs, pot/light/location)
- Check-based care loop with a per-plant learned interval that errs long
- Location-aware season engine (temperate + tropical/Accra)
- Propagation family tree: take a cutting, track rooting, pot-up prompts
- Plant faces/moods with a tone-down setting
- Daily plant-round digest
- Edible stage tracker for tomato, pepper and spring onion, with weather triggers (flower-drop heat alert, high-potash at fruit swell)

**P1 (fast follow)**
- Harvest log and scallion regrowth counter
- Weekly streak, milestone badges, free freezes
- Photo ID via Pl@ntNet with a "confirm species" step
- Wishlist and genus checklists
- "Gift a cutting" link that adds the plant to a friend's tree
- Private spend/source log
- Pest treatment schedules
- Toxicity flag (own wording + ASPCA link)
- CSV/JSON export

**Not in MVP:** marketplace or payments, value estimates or price charts, international swaps, open swap-matching, disease diagnosis, on-device ID, moisture sensors, garden layout planner, public feed or leaderboards, social streaks.

## Care engine (summary)

`next_check = base_interval(group) × light × pot material × pot size × mix × season(location) × k_plant`

- `k_plant` learns from each check using a smoothed average. "Damp" lengthens it; "dry and drooping" shortens it. Errs long.
- **Guardrails:**
  - Wilting → "check the soil first" (never "water now").
  - Gnats → lengthen the interval.
  - Watering logged soon after the last one → "I'm still a bit damp?"
  - Repotting → re-learn.
- **Edibles:**
  - Heat → daily checks and "keep moisture even" (blossom-end rot).
  - First fruit → high-potash feed every 10–14 days.
  - Nights >24°C or days >32–35°C → flower-drop alert and a hand-pollination prompt.
- Multiplier magnitudes are **not established** in the literature. They start conservative and get calibrated from Rootline's own anonymised check data. That data is itself a moat for a data-analyst founder.

## Soil types (substrate) in the engine

Soil sets `M_mix`, a drying-speed multiplier on the check interval. Below 1 means the mix dries faster, so checks come sooner. These are **starting estimates** derived from container-substrate physics (target 10–20% air space; a typical peat mix holds about 68–70% water with 10–13% air). They get calibrated from check answers.

| Substrate | M_mix | Notes |
|---|---|---|
| Gritty cactus/succulent (mineral) | 0.60 | Let it go fully dry; repot every 2–4 years |
| Chunky aroid mix (bark/perlite/pumice) | 0.70 | Hoyas, aroids |
| Mix + 30–50% perlite/pumice | 0.85 | |
| Bagged "cactus mix" (peat + sand) | 0.90 | |
| Standard peat/coir potting mix | 1.00 | Baseline; dry peat repels water, so suggest bottom-soaking |
| Vegetable container mix | 1.00 | pH 6.0–7.0 for tomato/pepper/scallion |
| Pure coco coir | 1.10 | |
| Moisture-control mix | 1.15 | |
| Sphagnum moss | 1.20 (packed 1.35) | Great for rooting cuttings, easy to overwater |
| Garden soil in a pot | 1.35 + warning | Compacts, waterlogs, can carry disease |
| Mix older than 2 years | ×1.10 | Breakdown reduces air space |
| LECA / pon (semi-hydro) | n/a | Separate "check the reservoir" mode (~7-day base), feed every watering |

The soil type also drives the **repot nudge** (organic mixes at 18–24 months), **degradation prompts** (sunken soil, water running straight through, sour smell, white salt crust → flush with 2–3× the pot volume) and **reuse advice** for edibles: reuse mix after a healthy crop, refreshed with ~50% new mix, but never after blight.

## Seattle: the founder's default profile

Seattle is USDA zone 9a (8b pockets). Last frost falls around late Feb to late Mar, first frost around late Oct to early Dec (median ~Nov 17). The summers are dry (July: 0.6 in of rain) and the winters dark (December: ~8.5 h days, ~53 h of sun). Heated homes run at 10–30% humidity.

| Month | Indoor ×M_season | Under grow light | Outdoor pots | Edible milestones |
|---|---|---|---|---|
| Jan | 1.50 | 1.10 | 2.50 | |
| Feb | 1.40 | 1.10 | 2.20 | Sow spring onions |
| Mar | 1.25 | 1.00 | 1.80 | Start tomato and pepper seeds indoors late Mar; resume feeding Mar 1 |
| Apr | 1.10 | 1.00 | 1.40 | Harden off |
| May | 1.00 | 1.00 | 1.10 | Transplant tomatoes ~mid-May (soil ≥ 50°F) |
| Jun | 0.95 | 1.00 | 0.85 | Peppers out late May/June |
| Jul | 0.85 | 0.95 | 0.60 | Fruit set needs nights > 55°F (peppers > 60°F); daily checks for pots |
| Aug | 0.85 | 0.95 | 0.60 | From mid-Aug remove new flowers; watch for late blight |
| Sep | 0.95 | 1.00 | 0.85 | |
| Oct | 1.15 | 1.00 | 1.40 | Pick green tomatoes (they ripen indoors in ~2 weeks); overwinter peppers; **stop feeding Oct 15** |
| Nov | 1.40 | 1.10 | 2.20 | |
| Dec | 1.55 | 1.10 | 2.50 | |

Balcony pots under an overhang get no rain, so their winter outdoor value shrinks by about 30%. Recommended PNW tomato varieties (≤75 days): Sungold, Sweet Million, Juliet, Oregon Spring, Stupice; for blight resistance, Legend. The Accra/tropical profile (harmattan + two rainy seasons) stays as a second built-in profile.

## Data stack and cost

| Layer | Choice | 1k MAU | 10k MAU |
|---|---|---|---|
| Photo ID | Pl@ntNet API (backend proxy) | €0 | ~€150–300/mo |
| Taxonomy | World Flora Online (CC0, local copy) | €0 | €0 |
| Care data | Own curated table, top ~200–500 houseplants | €0 | €0 |
| Crop data | Own table seeded from OpenFarm CC0 rescue + extension figures | €0 | €0 |
| Toxicity | Own flags + ASPCA link (legal review) | €0 | €0 |

Trefle looks unmaintained and OpenFarm is shut down, so neither should be a live dependency.

## Recommended build (when approved)

Reuse the founder's proven VinylRecordTracker stack: **Expo (SDK 54) + Expo Router + NativeWind + Zustand + expo-notifications + background tasks + iCloud sync and CSV import**. Add a small serverless proxy for Pl@ntNet. Ship iOS first via TestFlight, Android next. Free core; consider a lifetime tier over a trial that auto-converts to a subscription.

## Risks I'm tracking

| Risk | Severity | Plan |
|---|---|---|
| **Name clash: "Rootling: Plant Propagation"** is already on the iOS App Store, in the same niche | High | Decide the name before building (see options below). Run trademark searches (USPTO/EUIPO/Ghana). |
| Rewarding the wrong behaviour | High | Check-based rules above |
| Distribution in a crowded category | High | Founder's communities (plants, vinyl, LEGO, sneakers) and shareable family-tree and harvest cards |
| ASPCA toxicity reuse | High | Own wording, link out, legal review |
| Plant patents on cultivars | Medium | "Check patent" flag on gift/propagate |
| Uncalibrated tropical logic | Medium | Accra beta, calibrate from check data |
| Incumbent catch-up (Planta added propagation; Pothy pre-launch) | Medium | Ship fast; win on emotional design and the houseplant + edible combination |

**Name options if we move off Rootline:** Sproutly-style names are crowded. Distinct options to search: **Plant Round**, **Leaflings**, **Cuttings & Co**, **Potpals**, **Rootstory**. My pick is to keep Rootline only if a trademark search is clean, otherwise **Rootstory** (keeps "roots", tells the family-tree story).

## Open decisions for the founder

1. **Name:** keep Rootline or switch? *(blocking before store listing, not before the build)*
2. ~~Where are you growing now?~~ **Seattle**, now the default profile (see above).
3. **Business model:** free core + lifetime unlock, or free core + annual?
4. **Repo:** `dzidziquist/rootline` needs to be created by you (my GitHub access can't create repos).
