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
- **Persona zero is the founder.** A data analyst and indie builder: a houseplant collector, pepper/tomato/spring-onion grower, vinyl and LEGO collector, gamer. She lives the cross-over between care, collecting and growing.

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
2. **Where are you growing now?** The mockup assumes Accra. The engine handles any climate, but I'll calibrate defaults to your real home first.
3. **Business model:** free core + lifetime unlock, or free core + annual?
4. **Repo:** `dzidziquist/rootline` needs to be created by you (my GitHub access can't create repos).
