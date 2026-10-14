# Houseplant Care Science: Evidence Base for Adaptive Care Reminders

Evidence labels used below: **[EXT]** = university extension / government horticulture, **[PEER]** = peer-reviewed or thesis, **[VENDOR]** = app maker or retailer self-description, **[BLOG]** = hobby or commercial blog (treat as folk wisdom unless corroborated).

## 1. Leading causes of houseplant death

### Takeaway
Extension services agree that improper (especially excess) watering is the top cause of houseplant decline, followed by light, humidity and drafts. **I found no survey or extension dataset that puts a percentage on causes of death.** Any "X% of houseplants die from overwatering" figure should be treated as unsupported.

### Cited Findings
- [EXT] UConn: inconsistent watering is "perhaps the number one cause of a houseplant's demise." Overwatering keeps the potting medium saturated and drives out oxygen, so roots die and rot. Underwatering also kills roots, after which the plant wilts *even in saturated soil*. UConn's other causes of decline, in the order it gives them: excess fertilizer (blackened leaf and stem edges, which look like overwatering), low light (leaning, pale leaves, spindly stems, few or no flowers), low humidity in winter (leaf and bud drop, leaves curling under and cracking), winter drafts (bud and leaf drop near doors and windows), and too much light (pale or purplish leaves). — [UConn Ailing Houseplants](https://homegarden.cahnr.uconn.edu/factsheets/ailing-houseplants/)
- [EXT] UConn on fertilizer: feed every 2–4 weeks during active growth at quarter to half strength, and less or not at all during rest periods. Check potted plants "every few days" rather than watering on a fixed interval. — [UConn Ailing Houseplants](https://homegarden.cahnr.uconn.edu/factsheets/ailing-houseplants/)
- [EXT] University of Maryland Extension: overwatering is the most common cause of houseplant problems in winter. — [UMD Indoor Plant Insects](https://extension.umd.edu/resources/yard-garden/indoor-plants/indoor-plant-insects)
- [EXT] Illinois Extension: wilting can mean the plant needs water, but it can also be a sign of overwatering. — [Illinois Extension Watering](https://extension.illinois.edu/houseplants/watering)
- Tom Brown, an RHS-affiliated judge, as quoted in trade press: overwatering is "the biggest killer in winter." — [Gardening Etc](https://www.gardeningetc.com/news/is-your-heating-killing-your-house-plants)
- [BLOG] The only percentage I found is a commercial blog's claim that "90% of houseplant fatalities are easily preventable." It is unsourced, and it concerns preventability, not cause. — [Fantastic Services blog](https://blog.fantasticservices.com/why-houseplants-die/)

### Inferences
- Wilting is ambiguous: it can come from too little water or from roots killed by too much. An app should never answer "wilting" with "water now." It should ask the user to check the soil first. Wilting in wet soil points to root rot.
- Fertilizer burn looks like overwatering, so a diagnosis flow should ask about recent feeding.
- Rest periods (winter, low light) are when overwatering risk peaks. Reminder cadence should slow down then.

### Gaps
- I found no quantified survey (consumer, RHS or extension) of causes of houseplant death. A Gardening Etc piece titled "Top 3 reasons why your houseplant is dying" may summarise a commercial survey, but I did not verify it.
- I found no data on how often pests, as opposed to cultural problems, are the cause of death.

## 2. Soil-moisture checking vs fixed schedules; meter reliability

### Takeaway
Extension guidance consistently says to water by checking the soil, not by the calendar. The usual finger-test depth is about 2 inches (5 cm), or "over half the compost dry" for many plants. Cheap probe meters are flagged as unreliable. Weighing the pot is the best-validated method in research (nursery and greenhouse studies), but it has to be recalibrated as the plant grows.

### Cited Findings
- [EXT] Illinois Extension:
  - Test the soil "with your finger to a depth of two inches"; if it is dry, water.
  - "Water your plants when they need it and not according to the calendar."
  - A water meter probe "may not always be reliable."
  - Factors that change frequency: plant type and size, temperature, humidity, light, pot size, potting mix, drainage and container type.
  - Unglazed clay dries faster than plastic.
  - Soak the soil until water drains, then empty the saucer. Never leave the pot standing in water.
  - Bottom watering: stand the pot in a few inches of water until the surface is moist.
  - Use room-temperature water. Avoid softened water, and let tap water stand for 24 hours.
  - Source: [Illinois Extension Watering](https://extension.illinois.edu/houseplants/watering)
- [EXT] RHS on pot covers: check 10 minutes after watering and empty out any excess. RHS also advises reducing watering as days shorten. — [RHS winter houseplant care](https://www.rhs.org.uk/garden-inspiration/houseplants/winter-interest-houseplants-care); [RHS November advice](https://www.rhs.org.uk/advice/in-month/november/greenhouse,-conservatory-and-houseplants)
- [BLOG, citing RHS] Water when more than half of the compost is dry. — [Goodfronds](https://goodfronds.hollypryce.com/how-to-keep-your-houseplants-happy-this-winter/)
- [BLOG] Cheap analog meters measure electrical conductivity between two metals in the probe tip. Fertilizer salts, unusual mixes and hard water can therefore distort readings. — [Laidback Gardener](https://laidbackgardener.blog/2019/12/19/when-moisture-meters-fail/)
- [Consumer review] A cheap meter can work when the soil is homogeneous but gives "very strange readings" if there is a clay layer. — [RHS Plants Trustpilot review](https://uk.trustpilot.com/review/www.rhsplants.co.uk/product/soil-moisture-meter-6a3cad8f045e2ceade1847af)
- [PEER] A Sensors (2023) paper compared low-cost capacitive soil sensors with commercial ones in lab and field conditions. Low-cost sensors let you cover more locations, but "the accuracy might be reduced." This is agricultural soil, not houseplant mixes. — [Sensors 2023 via DOAJ](https://doaj.org/article/04b994b6756e40f38a94e3d5604de076)
- [Unverified] A guide claims research-grade meters are accurate to ±1–3% and mid-tier consumer meters to ±3–5%, but cites no source. Cheap analog meters usually carry no accuracy specification at all. — [InspectandTest](https://inspectandtest.net/guides/accurate-soil-moisture-meter/)
- [EXT/PEER] Pot weight (gravimetric) method:
  - Oregon nursery guidance calls weighing "a very effective method of measuring water content in soilless media." Because 1 g of water is about 1 mL, results are easy to interpret. — [Oregon Dept of Agriculture NRG](https://www.oregon.gov/oda/Documents/Publications/NurseryChristmasTree/NRG_20_10.pdf)
  - Forest-nursery researchers describe weighing as an excellent way to measure the substrate's volumetric water content. — [RNGR Tree Planters' Notes](https://npn.rngr.net/publications/tpn/59-2/wireless-network-of-electronic-scales-to-monitor-the-substrate-volumetric-water-content-for-managing-irrigation-of-containerized-seedlings-produced-in-forest-nurseries/at_download/file)
  - J. Environmental Horticulture: weight-triggered "on demand" irrigation of *Cotoneaster* cut the leaching fraction to 0.06, against 0.14 under a cyclic schedule. — [JEH](https://jeh.kglmeridian.com/view/journals/jenh/28/2/article-p117.xml)
  - NC State thesis: gravimetric irrigation control is feasible. — [NCSU repository](https://repository.lib.ncsu.edu/server/api/core/bitstreams/40414382-88df-415e-b25d-8a5197350349/content)
  - Ohio State: weighing needs less expertise and equipment than dielectric sensors. — [ASHS 2011](https://ashs.confex.com/ashs/2011/webprogram/Paper7311.html)
  - Weight-based methods must be recalibrated as plant mass grows, and the optimal percentage of container capacity is not established. — [US Patent 10188051](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10188051)

### Inferences
- The evidence supports Rootline's "check the soil" design over fixed schedules. The best design combines a predicted interval with a check prompt, and lets the user's answer ("still moist" or "dry") move the next date.
- A low-cost "lift the pot" feature fits the evidence: the user learns how heavy the pot is just after watering and again when it is dry. Prompts should remind users to re-learn these weights after repotting or substantial growth.
- Moisture-meter readings should be treated as advisory. They are poor in mixes with fertilizer salts or layered media.

### Gaps
- I found no controlled study comparing finger test, consumer meter and pot weight for houseplants specifically.
- I found no peer-reviewed accuracy test of the $10 analog probe meters sold for houseplants.
- I found no outcome study (plant survival) comparing schedule-based and check-based watering for homeowners.

## 3. Factors changing watering frequency; rules of thumb and app models

### Takeaway
Frequency depends on evapotranspiration, which rises with light, temperature, low humidity and airflow, and on how much water the pot holds and loses. Terracotta dries faster than plastic, and small pots faster than large ones. Greg describes its approach as based on the FAO crop evapotranspiration method, using species, pot size, drainage, light, season and local weather. It biases toward giving less water. I found no published formula.

### Cited Findings
- [EXT] Illinois Extension factor list: plant type and size, temperature, humidity, light, pot size, potting mix, drainage and container material. Clay (porous) pots dry faster than plastic. — [Illinois Extension](https://extension.illinois.edu/houseplants/watering)
- [GOV] NParks Singapore also notes that terracotta needs more frequent watering than plastic. — [NParks](https://nparks.gov.sg/nparksbuzz/issue-03-vol-3-2009/gardening/watering-your-plants-wisely)
- [EXT/RHS] Season: plants grow less in low light and cool temperatures, so they need less water. Reduce watering as days shorten. Water in the morning and avoid wetting leaves in cool weather (fungal risk). — [RHS winter care](https://www.rhs.org.uk/garden-inspiration/houseplants/winter-interest-houseplants-care); [RHS November](https://www.rhs.org.uk/advice/in-month/november/greenhouse,-conservatory-and-houseplants)
- [EXT/RHS] Cacti and succulents need relative winter dormancy: keep them barely moist and do not feed. — [RHS winter care](https://www.rhs.org.uk/garden-inspiration/houseplants/winter-interest-houseplants-care)
- [EXT] Wood stoves and forced hot air dry plants quickly. — [UConn](https://homegarden.cahnr.uconn.edu/factsheets/ailing-houseplants/). Heating systems circulate dry, warm air in colder months. — [Colorado State PlantTalk](https://planttalk.colostate.edu/topics/houseplants/1317-houseplants-temperature-humidity/)
- [VENDOR] Greg:
  - Greg says its methodology is based on the UN FAO algorithm for estimating crop water use. — [TechCrunch 2021](https://techcrunch.com/2021/05/27/greg-an-app-for-plant-lovers-grows-5-4-million-in-seed-funding)
  - Recommendations use plant type, pot size, sunlight, season and user activity. — [Costa Farms/Greg page](https://costafarms.com/pages/gdpr)
  - On Greg's own forum, the team said water amounts are based on pot diameter, pot drainage, plant type and sun exposure. They did not yet use pot volume, and they "err on the side of less water" to avoid overwatering. This was reported via search snippet; the page returned 403 when I tried to fetch it, and the reply is several years old. — [Greg forum](https://greg.app/question/2qy114/determining-the-amount-of-water-used-for-watering-the-plants-does-anyone-know-how-greg-computes-for)
  - Example of Greg's output: "0.5 cups every 9 days" for a 5-inch pot with no direct sun. Greg's calculator assumes an airy, perlite-rich mix and a pot with drainage. — [Greg plant page](https://greg.app/plant-care/heliconia-indica-striata); [Greg watering calculator page](https://greg.app/plant-care/watering/marijuana/)
- [BLOG, low reliability] Third-party descriptions say Greg pulls local weather (temperature, humidity, daylight hours), models evapotranspiration, and refines its estimates with machine learning from watering and snooze events. — [scicentric.org](https://scicentric.org/how-greg-app-uses-ai-plant-care); [Botanical Legacy](https://botanicallegacy.com/blog/greg-app-alternative)
- [BLOG] Rule-of-thumb intervals: tropical foliage such as pothos and monstera every 7–10 days in summer and 14–21 days in winter; succulents and snake plant every 2–3 weeks. These are folk ranges, not evidence. — summarised from search results incl. [houseplant.co.uk](https://www.houseplant.co.uk/blogs/indoor-plant-care/how-often-should-i-water-my-indoor-plants)

### Inferences
- A defensible model for Rootline:
  - **Base interval** comes from species group: succulent/cactus, aroid/tropical foliage, or moisture-lover (fern, calathea).
  - **Multipliers** are applied for light (more light means a shorter interval), pot material (terracotta shortens the interval), pot size (small pots shorten it), mix (chunky or gritty shortens it), and season or temperature (cool, dark months lengthen it).
  - Indoor humidity also matters: very dry heated or harmattan air shortens the interval.
  - Each soil check updates the interval, which is effectively a learned per-plant coefficient (like Greg's ML step).
  - The model should err on the long side, as Greg does, because overwatering is the more lethal error.
- The numeric multipliers are not established in the literature. They would need calibration from user check-in data.

### Gaps
- Greg's actual formula and coefficients are unpublished. Planta's approach (reportedly about 30 factors, including weather) is also undocumented by primary sources.
- I found no quantitative study on terracotta vs plastic drying rates for houseplant-sized pots.

## 4. Propagation: success factors, timelines, potting up, failure modes

### Takeaway
Evidence here is thin and mostly anecdotal. The one solid extension figure is snake plant leaf cuttings: 4–6 weeks to root in soil at 70–75°F, with the best results in summer. Pothos roots in water in about 3–6 weeks (blogs). Water-grown roots are morphologically different, and cuttings may suffer transplant shock. The common advice is to pot up at about 1–2 inches of root.

### Cited Findings
- [EXT] UF/IFAS (*Sansevieria*, snake plant), leaf cuttings:
  - Time to rooting: 4–6 weeks.
  - Soil temperature: 70–75°F.
  - Best season: summer.
  - Variegated forms may not come true from leaf cuttings.
  - Source: [UF/IFAS LPPI](https://hort.ifas.ufl.edu/database/lppi/sp349.shtml)
- [BLOG] Pothos in water takes 3–6 weeks (another source says 3–5 weeks), with nodes submerged and leaves above the water. Soil rooting is somewhat slower, and estimates range from 2–6 weeks to 2–3 months for establishment. Soil-rooted cuttings are said to be sturdier but carry a higher risk of base rot. — [Lively Root](https://livelyroot.com/blogs/plant-care/how-to-propagate-pothos); [Spider Farmer](https://www.spider-farmer.com/blog/propagate-pothos-in-water/); [Epic Gardening](https://www.epicgardening.com/?p=193588)
- [BLOG] Water roots are smoother and lack the fine root hairs of soil roots, and they break easily. Moving cuttings to soil at 1–2 inches of root minimises shock. Another option is to propagate in the final medium. — [The Happy Planter](https://thehappyplanter.substack.com/p/water-roots-vs-soil-roots); [Folia Collective](https://foliacollective.com/blogs/news/ask-a-plant-pro-transitioning-propagations-from-water/); [Healthy Houseplants](https://www.healthyhouseplants.com/?p=5252)
- [BLOG] An informal home experiment found water "initially promising" for some plants, but potting soil gave "more stable and consistent results." — [Fraser Valley Rose Farm](https://fraservalleyrosefarm.com/?p=7733)
- [BLOG] Common failure causes for pothos: no node on the cutting, low light, cold, and rot. — [Houseplant411](https://houseplant411.com/pothos/why-is-my-pothos-not-rooting/)

### Inferences
- Propagation reminders could be: change the water every week (folk advice, not sourced here); check roots at about week 3 for water cuttings; pot up at 1–2 inches (about 2.5–5 cm) of root; then keep the new soil evenly moist for the first couple of weeks after the move to water. This is an inference from the transplant-shock advice above.
- Warmth (about 70–75°F / 21–24°C) and summer timing speed rooting. In Accra, ambient temperatures will usually meet this year-round.

### Gaps
- I found no peer-reviewed or extension timelines for monstera, philodendron, hoya or succulent leaf cuttings, or for sphagnum moss or LECA rooting.
- I found no controlled comparison of water, soil, sphagnum and LECA for these houseplants.
- I found no sourced success-rate percentages for any method.

## 5. Common pests: signs, causes, treatments

### Takeaway
Fungus gnats come from persistently wet, organic-rich mix: dry the surface and use Bti. Spider mites are favoured by hot, dry air: wash, use soap or oil, repeat every 5–10 days for a month or more. Mealybugs and scale need wiping with alcohol plus soap or oil, and soft scale may take 2–4 months. Thrips leave silvery stippling and black specks. Across all sources: inspect regularly, isolate new or infested plants, and test sprays on a leaf first.

### Cited Findings
- [EXT] Fungus gnats (UC IPM):
  - At 75°F, eggs hatch in about 3 days, larvae pupate after about 10 days, and adults emerge about 4 days later, so a generation takes about 17 days. Warmer temperatures give more generations, and indoors they occur year-round.
  - Favoured by overwatering, poor drainage, standing water, and incompletely composted organic matter in the mix.
  - Adults are a nuisance only. Larvae eat roots and can stunt young plants, and heavy infestations can kill houseplants. Wilting, however, is more often caused by watering problems or root rot than by larvae.
  - Monitoring: yellow sticky traps for adults, and raw potato chunks placed cut-side down in the pot to draw out larvae.
  - Control:
    - Let the soil surface dry between waterings.
    - Add perlite or sand to improve drainage.
    - Use pasteurised mix.
    - Bti (e.g. Gnatrol, Mosquito Bits) can be repeated about every 5 days because it does not persist.
    - *Steinernema feltiae* nematodes work at 60–90°F in moist soil.
    - Pyrethrins are a last resort: treat the plant outdoors and wait a day before bringing it in.
  - Source: [UC IPM Pest Notes: Fungus Gnats](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7448.html)
- [EXT] Spider mites: hot, dry weather favours rapid development. Missouri Extension recommends insecticidal soap or 2% horticultural oil and washing leaves, including the undersides. — [Missouri Extension G7273](https://extension.missouri.edu/g7273). Signs are fine white spots (stippling), yellowing and browning, sometimes with webbing. — [Montana State Extension](https://fdn.montana.edu/extension/lila_extn/lila_winter_25/HouseplantWinterCritters.html)
- [BLOG] Spider mites: treat every 5–10 days for at least a month because they reproduce quickly. Misting does not raise humidity meaningfully if the room air is dry. — [Costa Farms help](https://help.costafarms.com/en/knowledge/how-to-get-rid-of-spider-mites); [Soltech](https://soltech.com/blogs/blog/how-to-spot-and-treat-spider-mites)
- [EXT] Mealybugs:
  - Covered in cottony white wax and hide in crevices. — [UMD](https://extension.umd.edu/resources/yard-garden/indoor-plants/indoor-plant-insects)
  - Light infestations: wipe with a cotton swab dipped in rubbing alcohol, then apply horticultural oil. — [Montana State](https://fdn.montana.edu/extension/lila_extn/lila_winter_25/HouseplantWinterCritters.html)
  - Arizona Extension lists alcohol wiping, soap, oil and neem. — [Arizona Extension Houseplant Insect Reference](https://extension.arizona.edu/sites/extension.arizona.edu/files/attachment/HouseplantInsect-Reference.pdf)
- [EXT] Scale:
  - Causes leaf yellowing, stunting and dieback; brown soft scale is common indoors. — [UMD](https://extension.umd.edu/resources/yard-garden/indoor-plants/indoor-plant-insects)
  - Pick or scrub off small numbers. For larger infestations, apply oil or soap at the crawler stage. — [Montana State](https://fdn.montana.edu/extension/lila_extn/lila_winter_25/HouseplantWinterCritters.html)
  - Soft scale may need repeated treatment over 2–4 months. — [Arizona Extension](https://extension.arizona.edu/sites/extension.arizona.edu/files/attachment/HouseplantInsect-Reference.pdf)
- [EXT] Thrips: hard to spot. Signs are irregular silvery patches, small black fecal specks and distorted flowers. Adults have black bodies with white-banded wings. — [Montana State](https://fdn.montana.edu/extension/lila_extn/lila_winter_25/HouseplantWinterCritters.html); [UMD](https://extension.umd.edu/resources/yard-garden/indoor-plants/indoor-plant-insects)
- [EXT] Whiteflies: tiny white, moth-like insects that leave sticky honeydew. — [UMD](https://extension.umd.edu/resources/yard-garden/indoor-plants/indoor-plant-insects)
- [EXT] General: inspect regularly (pests are easier to control while populations are small), isolate infested plants, and test pesticides on a small area first. — [Illinois Extension](https://extension.illinois.edu/news-releases/keeping-outside-pests-indoor-plants); [Univ. of Kentucky EF406](https://entomology.ca.uky.edu/files/ef406.pdf)

### Inferences
- Useful app logic:
  - Fungus gnats reported → suggest lengthening the watering interval and letting the top layer dry.
  - Heated winter or harmattan conditions → raise spider-mite alerts.
  - Treatment flows should schedule repeat reminders: soap or oil every 5–10 days for 4+ weeks for mites; Bti every 5 days; a 2–4 month follow-up for soft scale.
- A "new plant quarantine" reminder (inspect and isolate for a few weeks) fits the extension advice. The exact duration is not sourced.

### Gaps
- I found no data on which pest is most prevalent on houseplants, so no ranking is possible.
- I found no sourced quarantine duration for new plants.
- The claim that neem oil is unsafe around cats came from a blog and was not verified.

## 6. Tropical/humid (Accra) vs temperate heated homes; indoor dormancy cues

### Takeaway
Temperate heated homes in winter combine low light, cool temperatures (less water use) and very dry air (10–20% relative humidity). The result is the classic winter overwatering risk plus humidity and spider-mite stress. Most houseplants prefer 65–75°F (18–24°C) and 40–60% relative humidity. In Accra the main cue is not day length but the rainy versus harmattan seasons. Harmattan (roughly late November to mid-March) brings very dry air and faster drying of pots. I found no extension research specific to Ghana.

### Cited Findings
- [EXT] Temperature:
  - Houseplants favour 65–75°F. — [NDSU Dakota Gardener](https://www.ag.ndsu.edu/news/columns/dakota-gardener/dakota-gardener-winter-houseplant-care)
  - Foliage plants: 65–70°F by day and 60–65°F at night. — [UW–Madison Extension Chippewa Co.](https://chippewa.extension.wisc.edu/2024/01/05/winter-care-of-houseplants)
  - Maryland gives 70–80°F by day and 60–68°F at night. — [UMD temperature & humidity](https://www.extension.umd.edu/resource/temperature-and-humidity-indoor-plants)
  - A UK show site cites 12–18°C as ideal for most houseplants. This is non-RHS and conflicts with the US figures, and probably reflects cooler UK homes. — [Flower Show](https://flowershow.org.uk/contact-us/newsletter/winter-houseplant-survival-guide)
- [EXT] Humidity:
  - Winter homes can drop to 10–20% relative humidity; houseplants prefer 40–50%. — [NDSU](https://www.ag.ndsu.edu/news/columns/dakota-gardener/dakota-gardener-winter-houseplant-care)
  - 40–60% is preferred, and most houseplants (succulents excepted) are injured below 20%. — [Nebraska Extension G2205](https://extensionpubs.unl.edu/publication/g2205/pdf/view)
  - Rutgers/PSU classes 25–30% as low (an average home), 30–50% as medium and above 50% as high. — [PSU Caring for Houseplants](https://ocean.njaes.rutgers.edu/wp-content/uploads/2023/09/PSU-Article-Caring-for-Houseplants.pdf)
- [EXT/RHS] Central heating dries the air. Use pebble trays for ferns, calatheas, marantas and orchids, and group plants together. Symptoms of dry air: leaves curling and turning yellow or brown, and flower buds dropping. — [RHS winter care](https://www.rhs.org.uk/garden-inspiration/houseplants/winter-interest-houseplants-care). Keep plants away from radiators, vents and cold drafts. — [Colorado State](https://planttalk.colostate.edu/topics/houseplants/1317-houseplants-temperature-humidity/); [UConn](https://homegarden.cahnr.uconn.edu/factsheets/ailing-houseplants/)
- [EXT/RHS] Dormancy cues indoors are shortening days, low light and cooler temperatures, which reduce growth and water need. Cacti and succulents need a near-dry winter rest. — [RHS](https://www.rhs.org.uk/garden-inspiration/houseplants/winter-interest-houseplants-care). Fertilise less or not at all in rest periods. — [UConn](https://homegarden.cahnr.uconn.edu/factsheets/ailing-houseplants/)
- [BLOG, West African] Harmattan:
  - Runs roughly late November to mid-March, bringing dry Saharan winds, hot days and cool nights.
  - Relative humidity is claimed to drop below 5%; this figure is unverified and likely refers to northern areas or extremes.
  - Potted soil dries quickly, so watering frequency needs to rise. Overwatering and root rot remain risks for plants like calathea.
  - Fixes: mulch the pot surface, use a humidifier, pebble trays, grouping.
  - Keep plants out of harsh direct sun and away from cold air-conditioning drafts. Calathea suits about 18–30°C.
  - Source: [Ounje Aladun](https://ounjealadun.com/portfolio/harmattan-plant-care-tips/); [Ounje Aladun calathea](https://ounjealadun.com/portfolio/calathea-plant-care-in-harmattan-for-west-african-gardeners/)

### Inferences
- Rootline's seasonal model should be **location-aware rather than calendar-aware**:
  - Temperate users: lengthen intervals and pause feeding from about October to February in the Northern Hemisphere, while flagging low humidity near heaters.
  - Accra users: little day-length change (about 5°N), warm all year, so no strong winter dormancy. Shorten intervals and raise spider-mite and humidity alerts during harmattan. During the rainy seasons (roughly April–July and September–October) the air is humid, so check intervals can lengthen and fungus gnat and rot risk rises.
  - Air-conditioned rooms behave like dry, cool microclimates.
  - The rainy-season dates are general climate knowledge for southern Ghana and are not sourced in these notes.
- The 12–18°C UK figure and the 65–75°F (18–24°C) US figures conflict. For a target range, use the extension figures (about 18–24°C) and treat temperatures below about 12–15°C as a slow-growth and overwatering-risk trigger. This threshold is an inference.

### Gaps
- I found no Ghanaian or West African extension or peer-reviewed guidance on indoor plant care. The best available sources are a Nigerian blog and general sources.
- I found no measured indoor relative humidity data for Accra homes during harmattan, and the "<5% RH" claim is unverified.
- I found no study quantifying how much winter in a heated home lengthens houseplant watering intervals (e.g. a multiplier).
