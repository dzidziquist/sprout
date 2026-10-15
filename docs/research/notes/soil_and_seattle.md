# Rootline research: container substrates + growing in Seattle

Researched 2026-10-14. Formula context: `next_check = base_interval × M_light × M_pot_material × M_pot_size × M_mix × M_season_location × k_plant`.
Convention in these notes: **M_mix is an interval multiplier**. Below 1.0 means the mix dries faster, so checks come sooner. Above 1.0 means it stays wet longer.
Source quality labels: [EXT] = extension/university, [PEER] = peer-reviewed, [SEC] = secondary/encyclopedic, [FOLK] = hobbyist/commercial/anecdotal.

---

## PART A: Potting substrates

### A1. Container substrate physics: what controls drying speed

**Takeaway:** Two numbers drive drying speed: container capacity (CC, water held after draining) and air-filled porosity (AFP). Peat-based mixes hold about 65–70% water by volume, with only about 10–13% air. Coarse mixes (bark, perlite, pumice) trade water for air. Pot height matters as much as the mix: a shallow pot holds a perched water table that stays saturated. Organic mixes settle and decompose, which lowers AFP over time.

**Cited findings:**
- Recommended ranges for greenhouse substrates: total pore space 70–90%, AFP 10–20%, water-holding capacity 50–65%. An 80% peat + 20% perlite mix holds about 68% water and has about 10% AFP in a 4-inch pot. An 80% peat + 20% composted pine bark mix holds about 70% water and has about 13% AFP. Adding perlite, bark or pumice raises AFP, but only up to the AFP of the aggregate itself. Shorter containers hold more water and less air than taller ones with the same mix. Most settling happens in the first 2–3 irrigations. [EXT] https://greenhouse.hosted.uark.edu/Unit07/Section02.html
- Nursery targets: CC 45–65%, AFP 10–30% (Bilderback, NC State). [EXT] https://nurserycrops.ces.ncsu.edu/wp-content/uploads/2017/11/fluff-n-stuff-components-to-substrats-Bilderback-powerpoint-pdf.pdf
- UGA Extension gives an optimal AFP of 15–30%, and notes that AFP depends on container height and falls as organic components decompose. [EXT] https://fieldreport.caes.uga.edu/publications/C1292-04/
- UC guidance: total porosity at least 50%, AFP at least 10%, water-holding capacity at least 40%. [EXT] https://ucanr.edu/node/101549
- Water in a pot forms a perched water table at the bottom. A gravel layer raises the saturated zone rather than improving drainage, so "drainage layer" advice is a myth. [EXT] https://hortscans.ces.ncsu.edu/file/../uploads/r/e/retail_p_5405f4e506127.pdf

**Inferences:**
- Plants use roughly CC minus the water held at wilting point. Coarse mixes have both a smaller reservoir and more air, so they dry faster per unit of plant water use. The ratio of a mix's CC to standard peat mix's CC (about 68%) gives a rough interval multiplier. For example, a chunky aroid mix with CC around 40–50% gives about 0.6–0.75.
- Pot size and pot height interact with the mix. M_pot_size should not double-count: a tall pot plus a chunky mix gives the driest outcome.

**Gaps:** I found no single peer-reviewed table of CC and AFP for hobby mixes such as "aroid mix", "gritty mix" or LECA. The multipliers below are inferred from component physics, not measured drying curves. Calibrate them with user check-in feedback (soil was wet/dry at check).

### A2. Substrate categories

| Substrate | Water vs air | Relative drying | Suits | pH | Nutrients / quirks | Breakdown / repot |
|---|---|---|---|---|---|---|
| Standard peat-based potting mix (peat + perlite/bark, often with lime and starter fertilizer) | High CC (~65–70%), low AFP (~10–13%) [EXT, Arkansas] | Baseline | Most foliage houseplants, seedlings, many edibles | Peat is acidic (~3.5–4.5) and is limed to about 5.5–6.5 in commercial mixes (general knowledge, not cited this session) | Starter fertilizer runs out in about 1–3 months [inference]. Peat turns water-repellent when it dries out fully and can take many irrigations to rewet. Wetting agents are the industry fix [PEER, HAL] https://hal-agrocampus-ouest.archives-ouvertes.fr/hal-02552786v1 | Decomposes and compacts. Repot houseplants every 1–2 yrs [common EXT guidance; not fetched this session] |
| Coir-based potting mix / pure coco coir | Similar to or a little below peat in CC. Pure fine coir pith is very water-retentive | About 1.0–1.1× peat (pure coir is slower) | Same as peat mixes. Popular with peat-free growers | About 5.5–6.8 (less acidic than peat) [not verified this session] | Unwashed or unbuffered coir can carry K and Na salts. It rewets more easily than dry peat [general knowledge; uncited] | Breaks down more slowly than peat [inference / industry claim] |
| Chunky "aroid mix" (orchid bark + perlite/pumice + some coir/peat + charcoal) | Low CC, high AFP | Fast (~0.7×) | Aroids (Monstera, Philodendron, Anthurium), Hoya, epiphytes | Bark is mildly acidic | Low nutrient-holding. Needs regular dilute feeding. This is a hobby recipe rather than a horticultural standard [FOLK]. Physics agree that bark and perlite raise AFP [EXT] | Bark decomposes, so refresh every 1–2 yrs |
| Cactus/succulent "gritty" mix (pumice, calcined clay, grit, bark fines) | Very low CC, very high AFP | Fastest of the soil-like mixes (~0.6×) | Cacti, succulents, some Hoya/caudiciforms | Near neutral (mineral) | Commercial "cactus mix" is often just peat plus sand and dries much more slowly than true gritty mix. The app should ask which one [inference] | Mineral parts barely break down, so repot every 2–4 yrs |
| Semi-hydro (LECA, pon) | Inert. Water wicks up from a reservoir | Not a soil-check medium. Check the reservoir level instead | Aroids, Hoya, many tropicals. Plants need to adapt from soil | No buffering. pH comes from the nutrient solution [FOLK, guide] https://www.lovethatleaf.co.nz/blogs/plant-care-guides/beginners-guide-growing-houseplants-semi-hydro | Supplies no nutrients. Needs a full liquid nutrient solution, and ordinary houseplant fertilizers are often deficient [FOLK]. Garden Professors (university faculty blog) cover hydro houseplants [EXT-ish] https://gardenprofessors.com/holy-hydroponic-houseplants-batman-can-you-grow-houseplants-without-soil-yes/ | Doesn't break down. Flush periodically for salts |
| Sphagnum moss (long-fibre) | Very high water holding, yet airy when loose. Packed tight it stays soggy | Slow (~1.2–1.3×) | Orchids (Phalaenopsis), propagation, carnivorous plants | Acidic (~3.5–4.5) | Hard to rewet once bone dry [FOLK/PEER on peat]. Low in nutrients | Decomposes in about 1–2 yrs and turns sour and compacted |
| Garden soil in pots | Fine silt and clay collapse the air pores in a pot. Heavy, high perched water | Slowest (~1.3×+). Waterlogging and root rot risk | Not recommended | Varies | Can carry pathogens, weeds and insects [SEC/FOLK]. Compacts when confined [SEC] https://www.gardeningknowhow.com/special/containers/garden-soil-in-containers.htm https://biologyinsights.com/can-you-use-garden-soil-in-pots/ | Don't use. The app should warn |
| Vegetable / "container mix" (peat or coir + compost + perlite, sometimes with slow-release fertilizer) | Like a standard mix. Compost adds a bit of water holding and nutrients | ~1.0× | Tomatoes, peppers, herbs, onions | Typically 6.0–7.0 | Big fruiting plants still need regular feeding mid-season | Usable for 1–2 seasons if refreshed (see A4) |
| "Moisture control" mixes (with wetting agent or hydrogel) | Higher retention | ~1.15× (slower) | Hanging baskets, small pots in sun | — | Marketed water-retention claims [FOLK/commercial] | — |

**Inferences:** pH matters to the app mainly as plant-suitability tags. Most houseplants and vegetables do well at 5.5–6.8 in soilless media.

**Gaps:** Coir pH, salts and breakdown rates weren't verified from an extension source this session. If cited later, use NC State or Michigan State floriculture substrate pages.

### A3. Degradation signs and when to repot

**Takeaway:** Organic mixes settle and decompose, so AFP falls and the mix dries more slowly (until it goes hydrophobic, when water runs straight through).

**Cited:** AFP falls as organic components decompose [EXT, UGA above]. Dried peat becomes water-repellent and needs many irrigations to rewet [PEER, HAL].

**Signs to surface in the app** (practical, mostly common horticultural knowledge):
1. Mix level has sunk noticeably and pulled away from the pot wall.
2. Water runs straight through and out the drainage holes, with a dry core: hydrophobic peat. Fix it by bottom-soaking or adding a wetting agent.
3. The pot stays wet much longer than it used to, or smells sour: compaction or decomposition.
4. White or brown crust on the soil surface or the pot rim: fertilizer and tap-water salt build-up. Leach with 2–3× the pot volume of water, or repot.
5. Roots circling, coming out the drain holes, or the plant drying out within 1–2 days: rootbound.

**App use:** Add a "mix age" field. After about 18–24 months for organic mixes, nudge a repot and widen the uncertainty band. Raise M_mix by about 10% for old or compacted mix, but if the user reports "water runs straight through", prompt a rewetting tip instead of scheduling.

### A4. Container tomatoes, peppers and spring onions: mixes, sizes, reuse

**Takeaway:** Use a quality peat or coir potting mix or vegetable container mix, never garden soil. Tomatoes need at least 5 gal (about 19 L), ideally 10+ gal for indeterminates. Peppers need 3–5 gal. Spring onions grow in any pot 6+ inches deep. Target pH 6.0–7.0. Reuse mix only after a healthy crop, and refresh it with about 50% new material.

**Cited:**
- Iowa State: most vegetables need at least 6–8 inches of potting mix, with a crop size chart [EXT] https://store.extension.iastate.edu/Product/pm870b-pdf
- NC A&T: fruiting vegetables need containers of at least 5 gallons [EXT] https://ncat.edu/caes/cooperative-extension/covid-19/fruiting-vegetables.php
- About 5 gal per tomato and 3–5 gal per pepper/eggplant [EXT-style source in search results, not fetched].
- Reuse: Oklahoma State says pathogens persist in potting mix, so don't reuse after disease and compost the old mix instead [EXT] https://extension.okstate.edu/articles/2023/reusing_potting_soil. Maryland Extension (via ask.extension.org) says reuse for 1–2 seasons is fine if plants were healthy, and adding about 50% new mix, compost or perlite improves drainage and dilutes salts [EXT] https://ask.extension.org/kb/faq.php?id=887801. Hot compost at about 160°F kills pathogens [FOLK].
- WSU King County tomato tip sheet: avoid excess nitrogen (it worsens catfacing), give about 1 inch of water a week, containers need more frequent watering, never water overhead [EXT] https://extension.wsu.edu/king/mg-home/gardening-resources/tip-sheets/tip-sheet-7

**Inferences:**
- Seattle late blight is common. Container mix from blighted tomatoes should not be reused for tomatoes or peppers. Late blight (Phytophthora infestans) mainly survives in living tissue, but early blight and Fusarium persist in the mix.
- In Seattle's dry July–Aug, a 5-gal tomato in full sun on a balcony can need water daily. Give fruiting edibles in summer a short base interval (1 day).

**Gaps:** No WSU container-specific size table was fetched. pH 6.0–6.8 isn't confirmed by a single source, but 6.0–7.0 is well supported.

### A5. Proposed M_mix (interval multiplier; standard peat/coir potting mix = 1.00)

| Substrate | M_mix | Confidence |
|---|---|---|
| Cactus/succulent gritty mineral mix | 0.60 | Medium (physics) |
| Chunky aroid mix (bark/perlite/pumice-heavy) | 0.70 | Medium |
| Standard mix amended with extra perlite/pumice (~30–50%) | 0.85 | Medium |
| Standard peat- or coir-based potting mix | 1.00 | Baseline |
| Vegetable/container mix with compost | 1.00 | Medium |
| Bagged "cactus mix" (peat + sand) | 0.90 | Low |
| Pure coco coir | 1.10 | Low |
| Moisture-control mix | 1.15 | Low |
| Sphagnum moss (loose) | 1.20 (1.35 if packed) | Low |
| Garden soil / topsoil in pot | 1.35, plus a warning | Medium (direction certain) |
| Old or compacted mix (>2 yrs) | ×1.10 modifier | Low |
| Semi-hydro LECA/pon | N/A: switch to a "reservoir check" mode (base ~7 days; check when the reservoir is empty, then wait 1–2 days before refilling for air) [FOLK practice] | Low |

---

## PART B: Seattle / Puget Sound

### B1. Climate facts

**Takeaway:** Seattle is USDA zone 9a (8b pockets, 2023 map) and has a mild maritime climate. Summers are dry and mild (July has 0.6 in of rain and average highs around 77°F, but lows around 57°F). Winters are wet and dark (November has 6.3 in of rain, December has about 53 hours of sun). The frost-free season is long (~240 days), but the season with warm enough nights for tomatoes and peppers is short.

**Cited (Sea-Tac 1991–2020 NOAA normals via Wikipedia [SEC→NOAA]):** https://en.wikipedia.org/wiki/Climate_of_Seattle

| Month | Hi °F | Lo °F | Precip in | Rain days | Sun hrs* |
|---|---|---|---|---|---|
| Jan | 48.0 | 37.7 | 5.78 | 18.7 | 70 |
| Feb | 50.3 | 37.7 | 3.76 | 15.9 | 109 |
| Mar | 54.2 | 39.9 | 4.17 | 17.1 | 178 |
| Apr | 59.3 | 43.3 | 3.18 | 15.0 | 207 |
| May | 66.3 | 48.7 | 1.88 | 11.3 | 254 |
| Jun | 71.1 | 53.0 | 1.45 | 9.2 | 268 |
| Jul | 77.4 | 56.8 | 0.60 | 4.7 | 312 |
| Aug | 77.6 | 57.2 | 0.97 | 4.9 | 281 |
| Sep | 71.6 | 53.6 | 1.61 | 8.3 | 222 |
| Oct | 60.5 | 47.0 | 3.91 | 14.3 | 143 |
| Nov | 52.1 | 40.9 | 6.31 | 18.4 | 73 |
| Dec | 47.0 | 37.1 | 5.72 | 18.4 | 53 |
| Year | 61.3 | 46.1 | 39.34 | 156 | 2170 |

*Sunshine figures are 1961–1990 normals.

- Zone 9a with 8b pockets [SEC, Wikipedia].
- Frost: the WSU station at UW Center for Urban Horticulture (since 2012) records last spring frost from Feb 23 to Mar 30, first fall frost from Oct 25 to Dec 6, and about 240 frost-free days. WSU notes that soil temperature matters for tomatoes and peppers [EXT, WSU King Co. tip sheet TS5, via search snippet] https://s3.wp.wsu.edu/uploads/sites/2058/2024/02/TS5-Edible-Gardening_Jan-2024.pdf. Garden.org gives a 50% chance of a fall frost around Nov 17 for Seattle and Nov 23 for Sea-Tac [SEC] https://garden.org/apps/frost-dates/Seattle%2C+Washington/
- Day length (47.6°N): December averages about 8.5 h and June about 15.9 h [SEC]. Solstice values computed from latitude are about 8 h 25 m on Dec 21 and about 16 h on Jun 21 [inference/astronomical calculation].
- Indoor winter RH: heated homes are often at 10–20% RH (Iowa State, NDSU) and easily below 30% (Penn State). Houseplants prefer 40–60%. Misting does not raise humidity meaningfully. Humidifiers work, and pebble trays and grouping plants help a little [EXT] https://yardandgarden.extension.iastate.edu/faq/how-can-i-raise-relative-humidity-indoors-my-houseplants https://extension.psu.edu/humidity-and-houseplants

**Inferences:** Seattle's mild, damp outdoor winter air means indoor RH probably isn't as extreme as in Midwest homes. 20–35% with forced-air heat is a reasonable default. Outdoors, containers barely dry November–March (cool, cloudy, ~18 rain days a month). Balcony pots under an overhang get no rain and still need checks, just infrequent ones.

**Gaps:** Indoor RH for Seattle specifically wasn't found. The NOAA normals were read via Wikipedia, not directly from NCEI.

### B2. Houseplant implications

**Takeaway:** From November to February, light is the limiting factor (Dec ~53 sun hours a month, 8.5 h days). Growth slows, so soil stays wet longer. Lengthen check intervals while heating dries the air. Pause fertilizer from about October to February/March, unless plants are under grow lights.

**Cited:**
- UK Extension: in winter, watering once every 2–3 weeks may be enough. NC State: let soil nearly dry between waterings, and check before watering [EXT] https://carter.ca.uky.edu/sites/carter.ca.uky.edu/files/Keeping%20Your%20Houseplants%20Happy%20During%20Wintertime.pdf https://richmond.ces.ncsu.edu/2023/12/winter-considerations-for-house-plants/
- Stop fertilizing October–March, except plants under grow lights [FOLK, nursery] https://pepiniere.ca/en/?p=33554. Winter feeding builds up salts [FOLK, Proven Winners].
- Grow lights: move plants to south or west windows. Succulents and citrus may need supplemental light. A 12–18 h photoperiod is common practice [FOLK].

**Inferences:** For Seattle, set M_season for indoor plants to about 1.4–1.6 in Dec–Jan, falling to 1.0 in May–Aug. The two forces compete: less light and growth slows drying, while heat and low RH speed evaporation. Light dominates for most foliage plants in low-light rooms. Plants on a radiator or vent sill can still dry fast. If the user flags "under grow light", cut the winter multiplier to about 1.1.

**Gaps:** No extension foot-candle targets were found this session.

### B3. Edibles in Seattle

**Takeaway:** Tomatoes and peppers are limited by cool nights, not frost. Tomato fruit set suffers when nights fall below about 55°F (13°C), and peppers below about 60°F (16°C). Seattle's average lows are above 55°F only in July and August (and barely: 56.8°F and 57.2°F), and June averages 53°F. Choose early (≤75 days), cherry or cold-set varieties, plant warm, harvest before the October rains, and watch for late blight from August onward.

**Cited:**
- Tomato fruit sets only once nights stay above 55°F for 2+ nights. Cold interferes with pollen tubes and pollen can turn sterile [EXT, UF IFAS] https://swfrec.ifas.ufl.edu/docs/pdf/veg-hort/tomato-institute/presentations/ti2011/ozores.pdf. Below 55°F or above 75°F nights, pollen may be sterile, and the optimum is 60–70°F nights [EXT, MSU] https://www.canr.msu.edu/news/few_tomatoes_in_your_garden. Peppers set poorly below 60°F or above 75°F at night, and pollen is sterile at 95°F+ [EXT, in search results].
- WSU King County tip sheet: transplant once soil reaches at least 50°F, typically around mid-May. Nurseries sell plants in early April, which is too early to plant. Harden off for about a week. Choose ≤75 days to maturity. Proven cherries at the Bellevue Demonstration Garden are Sungold, Sweet Million and Juliet. Standard types are Oregon Spring and Stupice. Plant in 6+ h of sun and bury 6 in of stem. Late blight comes in late summer, cooler and wetter weather: avoid overhead watering, stake and prune for airflow, and remove infected plants. From mid-August, remove new blossoms and small fruit to push ripening, and reduce watering from mid to late August [EXT] https://extension.wsu.edu/king/mg-home/gardening-resources/tip-sheets/tip-sheet-7
- OSU (western Oregon, similar climate): sow tomatoes and peppers indoors late March to early April. They take 6–8 weeks from seed to transplant, so for a mid-May transplant, start in the second half of March. Plant out when soil is at least 55°F and nights are above 45°F (tomato). For peppers, be conservative and use cloches or low tunnels plus early varieties [EXT] https://extension.oregonstate.edu/es/imported-publication/tomatoes https://bygl.osu.edu/node/2309 (also OSU pepper article in results)
- PNW varieties: Oregon Spring, Siletz and Santiam set fruit in cool weather and ripen 10 days to 2 weeks earlier. Legend is blight-resistant. Stupice is early and cold-tolerant. Juliet, Sweetie, Red Cherry, Santa and Legend are suggested for late-blight tolerance [EXT, WSU Skagit/MG columns 2007–09, dated] https://wpcdn.web.wsu.edu/extension/uploads/sites/57/2014/03/061007.pdf. High tunnels significantly reduced late blight at WSU Mount Vernon (2010) [PEER] https://apsnet.org/publications/plantdisease/2014/December/Pages/98_12_1639.aspx
- Ripening green tomatoes indoors: pick mature-green or breaker fruit before frost. Store at 55–70°F; fruit doesn't need light, and the fridge is too cold. Mature greens ripen in about 14 days at 70°F [EXT, CSU] https://extension.colostate.edu/resource/ripening-tomatoes-indoors/. Pick full-size fruit that has turned light green or white [EXT, Cornell] https://blogs.cornell.edu/fruition/2021/09/08/ripening-green-tomatoes-indoors
- Overwintering peppers: prune to a few Y-shaped branches. Keep at about 55°F (50–65°F) in a bright spot. Water roughly every couple of weeks and don't fertilize. Check for pests before moving plants in, and move them to warmth about a month before the last frost [FOLK, Epic Gardening / Gardening Know How; no extension source found] https://www.epicgardening.com/overwintering-peppers/

**Inferences:**
- Spring onions (bunching onions, Allium fistulosum) are cool-season and hardy. In zone 8b/9a they can be sown roughly February through September and overwinter in pots, growing slowly November–February. Regrowing from cut store-bought bases works on a windowsill year-round. [Inference + general horticultural knowledge; no WSU source fetched]
- Peppers on a sheltered, south-facing balcony are warmer than the Sea-Tac normals. Urban heat and a wall microclimate can add a few °F at night.
- Container tomatoes in Jul–Aug: daily checks. When watering is reduced from late August for ripening, lengthen the interval with an edible-specific seasonal factor.

**Gaps:** Peppers have no Seattle-specific extension guide (OSU is the nearest). Overwintering peppers draws on folk sources only. Bunching-onion timing for Puget Sound wasn't extension-verified (try the Tilth Alliance or Seattle Tilth Maritime Northwest Garden Guide).

### B4. Mid-October in Seattle: what to do now

**Takeaway (synthesized from WSU, CSU and climate data):** October brings the return of the rains (3.9 in, 14 rain days). Lows are about 47°F, far below fruit-set temperatures, and the first frost can come from Oct 25.
- **Tomatoes:** Fruit set is over. Harvest everything mature-green or blushing now, before heavy rain splits fruit and blight spreads, and ripen it indoors at 55–70°F. Pull and bin (not compost) blighted vines. Don't reuse mix from blighted plants for nightshades. Healthy plants' mix can be refreshed with about 50% new material next spring.
- **Peppers:** Pick remaining fruit (green peppers are edible). To overwinter: prune, inspect or wash for aphids and spider mites, move indoors to a cool bright spot (about 55–65°F), cut watering right back, and don't feed. Otherwise, finish them off.
- **Spring onions:** Keep growing outdoors. They're hardy. Move containers under the eave so they don't stay soggy (Nov ~18 rain days), or bring a pot to a sunny windowsill for winter harvests. Sow a last pot for overwintering now (marginal) or wait until February.
- **Houseplants:** Bring in any that summered outside before nights drop below about 50°F (already happening). Stop fertilizing. Lengthen check intervals. Add a grow light for high-light species. Expect heating to start, so watch for vent-side drying and low RH.

---

## Proposed Seattle defaults for the app

### M_season_location: Seattle, interval multiplier (1.0 = baseline drying)

| Month | Indoor houseplants (window light) | Indoor + grow light | Outdoor containers, balcony (exposed to rain*) | Edible stage notes |
|---|---|---|---|---|
| Jan | 1.5 | 1.1 | 2.5 (often skip: rain-fed) | Plan; peppers overwintering (check ~14 d) |
| Feb | 1.4 | 1.1 | 2.2 | Sow bunching onions indoors/outdoors; order seeds |
| Mar | 1.25 | 1.0 | 1.8 | Late Mar: start tomato/pepper seeds indoors (6–8 wk); resume houseplant feeding late Mar |
| Apr | 1.1 | 1.0 | 1.4 | Pot up starts; harden off late Apr; overwintered peppers back to warmth |
| May | 1.0 | 1.0 | 1.1 | Mid-May: transplant tomatoes (soil ≥50–55°F); peppers late May/June, or under cloche |
| Jun | 0.95 | 1.0 | 0.85 | Nights ~53°F: tomato set marginal; flowers forming |
| Jul | 0.85 | 0.95 | 0.6 | Peak drying (0.6 in rain, 312 sun h); fruit set window; containers may need daily checks |
| Aug | 0.85 | 0.95 | 0.6 | Fruit set + ripening; from mid-Aug remove new blossoms; reduce tomato water late Aug; watch late blight |
| Sep | 0.95 | 1.0 | 0.85 | Ripening; blight risk rises with rain late Sep |
| Oct | 1.15 | 1.0 | 1.4 | Harvest all tomatoes; overwinter or finish peppers; stop fertilizing; bring houseplants in |
| Nov | 1.4 | 1.1 | 2.2 | Wettest month (6.3 in); outdoor pots rarely need water unless under cover |
| Dec | 1.55 | 1.1 | 2.5 | Darkest (8.5 h days, ~53 sun h); slowest indoor drying |

*For balcony pots under a roof overhang (no rain reaching them), use about 70% of the outdoor value's deviation from 1.0 in winter. Example: Dec becomes 1.0 + 0.7×1.5 ≈ 2.0. Rain-exposed pots in Nov–Mar should mostly get "check after a dry spell" prompts rather than fixed checks.

All multiplier values are **inferences** derived from monthly sun hours, temperature and precipitation. They are not measured. Calibrate them from user feedback.

### Fertilizer pause flag (Seattle)
- Houseplants: pause Oct 15 – Mar 1 (resume mid-March with rising light). Don't pause for plants under grow lights.
- Overwintering peppers: no feed until moved back into warmth (April).
- Outdoor edibles: feed May–mid-Aug. Stop when you start removing blossoms in mid-August.
