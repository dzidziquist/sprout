# PlantFam: product brief

**Owner:** Claude (product + design + build), with the founder as decision-maker on taste, brand and launch.
**Status:** Research and mockup done. **Paused before the app build**, waiting for founder sign-off.
**Board:** https://claude.ai/artifact/31tneAVDS8aSNWvdv32Dsy · Formerly codenamed "Rootline" · Screens: `design/screens/` · Research: `docs/research/`

---

## One line

A playful plant-care app where plants have moods, care is a **soil check** rather than a watering schedule, and every cutting keeps its **family tree**, covering houseplants and the peppers, tomatoes and spring onions on your balcony.

## Why this, why now

- **The market charges $30–48/yr for reminders and photo ID** (Planta, PictureThis, Greg). The loudest complaints are paywalls that auto-charge after a trial, confidently wrong IDs, and fixed schedules that overwater.
- **Overwatering is the main killer.** University extension guidance (Illinois, RHS, UConn) says to water "when they need it and not according to the calendar". Most apps still nag on a calendar. PlantFam asks you to check the soil and learns from the answer.
- **Lineage and harvests sit in indie corners.** No polished app combines mainstream care, a parent→cutting family tree with provenance, and sow-to-harvest tracking for edibles. Collectors today use Notion templates.
- **Persona zero is the founder.** A data analyst and indie builder in **Seattle**: a houseplant collector, pepper/tomato/spring-onion grower, vinyl and LEGO collector, gamer. She lives the cross-over between care, collecting and growing.

## Positioning

> **PlantFam rewards judgement, not watering.**
> Other apps tell you when to water. PlantFam teaches you when *not* to, remembers where every cutting came from, and celebrates your first harvest.

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
- Multiplier magnitudes are **not established** in the literature. They start conservative and get calibrated from PlantFam's own anonymised check data. That data is itself a moat for a data-analyst founder.

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
| Water / hydroponic (water culture, Kratky, countertop gardens) | n/a | Same reservoir mode; full water + nutrient change every 14 days (LECA: flush every 28) |

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
| **Name: PlantFam** is slangy ("plant fam"), which can make a trademark harder | Medium | No app or company called PlantFam found (Oct 2026 web search). Run USPTO/EUIPO searches and check domains before the store listing. Fallback: **Leafkin**. |
| Rewarding the wrong behaviour | High | Check-based rules above |
| Distribution in a crowded category | High | Founder's communities (plants, vinyl, LEGO, sneakers) and shareable family-tree and harvest cards |
| ASPCA toxicity reuse | High | Own wording, link out, legal review |
| Plant patents on cultivars | Medium | "Check patent" flag on gift/propagate |
| Uncalibrated tropical logic | Medium | Accra beta, calibrate from check data |
| Incumbent catch-up (Planta added propagation; Pothy pre-launch) | Medium | Ship fast; win on emotional design and the houseplant + edible combination |

**Naming decision (Oct 2026):** renamed from "Rootline" to **PlantFam** because "Rootling: Plant Propagation" already exists in the same niche, and because the name should cover *all* plants (houseplants, edibles, cuttings), not only propagation. The family-tree feature is called **Offshoots**. Rejected as taken or crowded: Sprig, Plantdex, Plantfolk, Leafy, Jungle-*, Potpals (too close to PlantPal). Fallback: Leafkin.

## Open decisions for the founder

1. ~~Name~~ **PlantFam** (decided). Trademark search before the store listing.
2. ~~Where are you growing now?~~ **Seattle**, now the default profile (see above).
3. **Business model:** free core + lifetime unlock, or free core + annual?
4. **Repo:** `dzidziquist/plantfam` needs to be created by you (my GitHub access can't create repos).

## Owner decisions (Oct 15, 2026): cheap to use, cheap to run

- **Photo ID is free for everyone.** iPhone's Photos app already names plants (Visual Look Up), so charging for ID would be charging for something people have. Ours adds value by dropping the plant straight into the fam with care settings. Each phone gets 5 IDs a day, which keeps us inside Pl@ntNet's free tier (500/day, commercial use allowed, credit line + logo required). Past that, the app points people to Look Up in Photos.
- ~~PlantFam Plus as a low-cost supporter tier~~ (replaced by the tip jar, see below).
- **Running costs stay near zero:** no backend; data is on device; Open-Meteo is free; RevenueCat is free under $2.5k monthly tracked revenue; Pl@ntNet free tier. The main fixed cost is the $99/yr Apple Developer Program.
- **If growth outpaces the free ID quota:** add a tiny proxy that holds the key and shares the daily 500 fairly, then consider Pl@ntNet Pro (about €5 per 1,000 IDs) once tips cover it.

## Owner decision (Oct 15, 2026): PlantFam works anywhere

Users type their city (Open-Meteo geocoder; never GPS). Three years of that city's daily weather give monthly normals, which map it onto one of the two calibrated climate models and shift the calendar to line up the seasons (`src/lib/climate.ts`):
- **Cold-winter places** (coldest month < 12°C): Seattle model, aligned on the month spring warms past 12°C (planting-out time).
- **Mild winters** (12–18°C, e.g. Sydney, LA): Seattle model, coolest month aligned with Seattle's January.
- **Tropical** (coldest month ≥ 18°C): Accra model, driest month aligned with Accra's January.

Season multipliers, feeding pauses, grow-patch tasks (with month names translated) and the grey-season badge all follow the shift; weather uses the city's own coordinates; units follow the country. If the history call fails, a latitude guess is used. Soil checks then tune each plant's rhythm, so the approximation fades within a few rounds. A future step: more calibrated models (e.g. Mediterranean, arid) as users arrive from those climates.

## Owner decision (Oct 15, 2026): hydroponic growers are first-class

Plants in **LECA** or **water** (water culture, Kratky jars, countertop hydro gardens) skip the soil question. Their check is the water line: **Low** (top up with weak nutrients) or **Plenty** (skip, peek again in about half a rhythm). There's no "soggy" answer and no overwatering flag. A **fresh water** reminder counts from the last refresh or repot: a full change every 14 days in water, a flush every 28 in LECA. It shows on the plant page and in the round, and logging "Fresh water" counts as a top-up. Growers who pick **Hydro or LECA** in onboarding or Settings ("Soil + hydro") get a Soil / LECA / Water choice up front when adding a plant, and new plants follow the medium of their last hydro plant. Copy across the app says "check" rather than "soil check" wherever both apply, and milestones count water checks the same as soil checks.

Milestones: one season badge per climate (grey season for Seattle, **winter** with the snowflake art where it freezes, cool season where it doesn't, harmattan / dry season in the tropics), so nobody sees a duplicate or a badge they can't earn. **Grandma plant** counts a year from when the plant joined the fam, not when it was bought.

## Owner decision (Oct 16, 2026): a tip jar, not a subscription

PlantFam has no servers and pays for no APIs, so there's nothing to charge for. The only fixed cost is Apple's $99 a year; photo ID stays inside Pl@ntNet's free tier. So:
- **Everything is free**, including spreadsheet (CSV) export of the care diary. Nothing is locked, no ads.
- **Tip jar** (Me → Tip jar, Settings → Support PlantFam): three one-time tips, $2.99 "Seed", $4.99 "Sprout", $9.99 "Big leaf" (App Store consumables). Tips unlock no features. Tippers get cosmetic thank-you gifts: a supporter badge in their milestones (never shown locked to anyone else), a gold card colour in Edit plant, and a party hat on the Me tab buddy. A night-time alternate app icon (Settings → App icon, supporters only). Planned: more icons, and a first look (about two weeks early) at new buddy art packs. The tip travels in backups because the App Store can't restore consumables. The page is a transparent "where tips go": the Apple fee, headroom for photo ID, and new free features.
- **What a paid tier could honestly cover later**, only if we build things that cost money to run: unlimited photo ID beyond 5 a day (Pl@ntNet Pro, about €5 per 1,000), an AI plant doctor (model API costs), or cloud sync across devices (if it needs a server). Widgets, share cards and a year in review stay free.

## Owner decision (Oct 16, 2026): ask where people grow

Onboarding asks **"Where do your plants live?"** (Indoors, Sunny windowsill, Balcony or patio, Garden bed, Grow lights; pick all), also editable in Settings → Where you grow. Each new plant starts in the most likely spot: edibles in the garden bed, then the balcony, then a sunny window; houseplants on the windowsill or indoors first. "Where does it live?" moved out of the optional section and sits under "How sunny is its spot?" when adding a plant. **Garden bed** is a real placement: no pot size or material, garden soil without the "not ideal in pots" warning, the outdoor season (rain included) and a 1.6× slower drying rhythm than the base, then tuned by checks like every plant.
