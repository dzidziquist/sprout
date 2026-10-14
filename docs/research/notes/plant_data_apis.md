# Plant identification, care and botanical data sources for an indie app (status as of 2026-10-14)

All prices and limits below were checked on **2026-10-14** unless noted. Some official pages (my.plantnet.org pricing/terms, gbif.org/terms, iNaturalist API pages) returned HTTP 503/403 to the fetch tool, so a few figures come from search-result snippets of those official pages rather than full-page reads. This is flagged where it applies.

## Plant.id / Kindwise (plant.id, plant.health, crop.health): pricing, free credits, accuracy, health assessment

### Takeaway
Kindwise uses one credit-based price list across all its products (1 credit = 1 identification call). Prices run from €0.05/credit at 1k credits down to €0.01 at 1.5M, and new accounts get 100 free credits. It is the most polished commercial option: it claims 35k+ classes and 93% top-3 accuracy, and plant.health has expanded to 500+ diseases. It is also the most expensive per call.

### Cited Findings
- Credit tiers (one table for all Kindwise products): A from 1,000 credits at €0.05 (min €50); B from 10,000 at €0.03 (min €300); C from 50,000 at €0.02 (min €1,000); D from 200,000 at €0.015 (min €3,000); E from 800,000 at €0.012 (min €9,600); F from 1,500,000 at €0.01 (min €15,000) — [Kindwise pricing](https://www.kindwise.com/pricing)
- Purchased credits expire after 3 months, except for purchases under 30,000 credits. Long-term clients can be invoiced monthly in "retroactive mode". Discounts are available for narrower class sets and for NGOs — [Kindwise pricing](https://www.kindwise.com/pricing)
- New registrants receive 100 free credits — [Kindwise pricing](https://www.kindwise.com/pricing)
- The pricing page lists no separate prices for plant.id, crop.health or insect.id. One credit table covers all products — [Kindwise pricing](https://www.kindwise.com/pricing)
- Kindwise points to a public status page and an uptime SLA — [Kindwise pricing](https://www.kindwise.com/pricing)
- Plant.id claims "over 35,000 classes" and "correct species in over 9/10 queries within the top three results" (93%) — [plant.id product page](https://www.kindwise.com/plant-id)
- Accuracy is backed by cited third-party studies: an AoB Plants study found plant.id superior to PlantNet, iNaturalist and Google Lens for British flora, and a street-tree study reported plant.id gave the best results. These are cited by the vendor, not independently verified here — [plant.id product page](https://www.kindwise.com/plant-id)
- The API returns common names, synonyms, taxonomy and plant details (care, edibility). Kindwise publishes its own detail coverage: taxonomy ~100%, Wikipedia image 99.12%, iNaturalist ID 95.83%, watering 9.50%, propagation 9.16%, edible parts 8.80% — [plant.id product page](https://www.kindwise.com/plant-id)
- Language is set per request (default English). Common names and descriptions vary by language — [plant.id product page](https://www.kindwise.com/plant-id)
- Health assessment is plant.health, a separate product. A Kindwise blog post is titled "Plant.health major expansion: from 90 to 500+ diseases" — [plant.id product page](https://www.kindwise.com/plant-id)

### Inferences
- Care fields such as watering come back for fewer than 10% of identifications. Plant.id should therefore be treated as an identification and taxonomy service, not a care-data source, and care data needs a separate source.
- Cost for 1k credits/month is about €50. At 10k IDs/month it is about €300 (tier B). At 30k/month it is about €900 at tier B, or €1,000 for a 50k pack at tier C.
- Small packs (under 30k credits) do not expire, which suits a low-volume indie app buying in batches.

### Gaps
- I did not find the plant.health / crop.health feature details (disease list, crop coverage) or whether a health call costs extra credits. The product page only links to the expansion blog post.
- I did not check rate limits (requests per second) for the Kindwise API.

## Pl@ntNet API: free quota, commercial terms, licensing

### Takeaway
Pl@ntNet is the cheapest high-quality photo ID option. It gives 500 free identifications/day, and commercial use is allowed within that cap. Pro pricing is about €5 per 1,000 IDs at the 200k tier. Free users must display an acknowledgement sentence and logo; Pro removes that requirement.

### Cited Findings
- Free tier: 500 identifications/day — [Pl@ntNet pricing (search snippet; page returned 503 on direct fetch)](https://my.plantnet.org/pricing)
- Pro (pay as you go), cost per 1,000 IDs by volume: 200k+ at €5; 3M+ at €4; 30M+ at €3; 300M+ at €2. "No required logo" on Pro — [Pl@ntNet pricing (snippet)](https://my.plantnet.org/pricing)
- Non-profit plan: €1,000/year, only for non-profit education or scientific purposes — [Pl@ntNet pricing (snippet)](https://my.plantnet.org/pricing)
- The terms say paid access applies to "commercial usage beyond 500 identification requests per day". Commercial use is therefore permitted on the free quota up to the cap. Paid access requires signing an agreement, invoiced in USD or EUR — [Pl@ntNet API terms (snippet)](https://my.plantnet.org/terms_of_use); [API agreement PDF v4.5](https://my.plantnet.org/documents/agreement_PlantNet_API_english_v4.5_USD.pdf)
- The Pro plan documentation describes a contract with 200,000 requests upfront and an initial payment of €1,000 billed 30 days after signing. The pricing page instead frames Pro as pay-as-you-go. The two descriptions conflict — [Pl@ntNet Pro plan doc](https://my.plantnet.org/doc/getting-started/pro-plan); [pricing](https://my.plantnet.org/pricing)
- Free use must acknowledge Pl@ntNet with a specified sentence and logo — [Pl@ntNet terms (snippet)](https://my.plantnet.org/terms_of_use)

### Inferences
- 500/day is about 15,000 IDs/month. That likely covers 1k MAU and possibly a few thousand MAU entirely for free, as long as usage stays under the daily cap (spiky days could exceed it).
- At 10k MAU and about 3 IDs/user/month (30k/month, ~1,000/day), the app needs Pro. That works out to roughly €150/month (360k/yr at €5 per 1,000). The €1,000 upfront for 200k requests is the realistic entry ticket.
- Pl@ntNet does not offer pathology or health assessment through this API (not confirmed on the pages fetched; see gaps).

### Gaps
- I could not fetch the full terms (503), so I have not verified the exact attribution sentence, rules on caching or storing results, image-retention policy, or per-second rate limits.
- I have not confirmed whether disease ID or "project" (regional flora) endpoints are available on the free tier.

## Perenual: data coverage, free vs paid tiers, data quality

### Takeaway
Perenual is the main living commercial "care data" API: watering, sunlight, hardiness, care guides and pest/disease. The free tier gives 100 requests/day and only species IDs 1–3,000. Full data for 10k+ species needs Supreme at $139.99/month.

### Cited Findings
- Personal (free): 100 requests/day. Species data, care guides/FAQ and hardiness maps for species IDs 1–3,000 only. Disease API for IDs 1–100 only. The page does not state whether commercial use is allowed on this tier — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- Premium: $59.99/month (shown as 20% off $74.99), 10,000 requests/day. Basic species data for IDs 1–10,000+, but care guides and hardiness maps still only IDs 1–3,000. Commercial use allowed — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- Supreme: $139.99/month (shown as 20% off $175.99), 100,000 requests/day. Basic and advanced species data plus care guides and hardiness maps for IDs 1–10,000+. Commercial use allowed — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- Enterprise: custom limits, dedicated node, custom payloads, priority support (contact sales) — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- The pricing page does not mention toxicity data or which tier includes it — [Perenual pricing](https://perenual.com/subscription-api-pricing)

### Inferences
- The care-guide coverage on Premium is still capped at IDs 1–3,000, so Premium adds little for a care app. Supreme is the meaningful paid tier for care data.
- Perenual is a closed commercial dataset with no stated provenance, so you cannot independently audit it. Spot-check toxicity and watering values before showing them as authoritative.

### Gaps
- I found no independent data-quality reports or reviews of Perenual in this session.
- I have not verified the licence/ToS on caching or storing Perenual data locally, or whether attribution is required.

## Trefle: alive or maintained in 2026?

### Takeaway
Status is unclear but the service is not dead. On 2026-10-14, trefle.io returned HTTP 200 (title "Trefle | The plants API") and the API endpoint returned HTTP 401, the expected response without a token, which means the API server is running. I found no evidence of active development and could not check the GitHub activity.

### Cited Findings
- Direct check on 2026-10-14: `https://trefle.io/` returned HTTP 200 with page title "Trefle | The plants API". `https://trefle.io/api/v1/plants` returned HTTP 401 (unauthenticated), meaning the API server responds — direct HTTP check of [trefle.io](https://trefle.io/)
- A web search for recent Trefle outage or shutdown news found nothing relevant (no announcements either way) — search "Trefle API down 2025" (no relevant results)

### Inferences
- Trefle's data is aggregated largely from open sources such as USDA and GBIF, and the project has long been seen in the developer community as a low-activity side project. That is background knowledge, not verified this session. Treat it as "alive but unmaintained" and do not use it as a core dependency. If you use it, cache aggressively and keep a fallback.

### Gaps
- I could not check GitHub repo activity, archive status or licence for treflehq/trefle-api (the session's GitHub access is restricted to configured repos). Check this manually.
- I did not verify current Trefle rate limits or data licence.

## OpenFarm: status and successors

### Takeaway
OpenFarm is shut down. FarmBot turned off the servers on 2025-04-21 and archived the GitHub repo. There is no official data dump or successor. A community project recovered about 340 CC0 crop records from the Wayback Machine.

### Cited Findings
- OpenFarm servers were shut down on April 21, 2025 after more than ten years online. Reasons: the code was unmaintained, the server infrastructure was losing security updates in May, and usage had declined. The GitHub repo is being archived publicly — [FarmBot: Sunsetting OpenFarm](https://farm.bot/blogs/news/sunsetting-openfarm)
- The FarmBot web app no longer uses the OpenFarm API. Crop info for crops with FarmBot icons was copied into the FarmBot app, which has had a new crop search since a January 31, 2025 update. The post mentions no data dump or direct successor — [FarmBot: Sunsetting OpenFarm](https://farm.bot/blogs/news/sunsetting-openfarm)
- The community "openfarm-crops-rescue" project recovered 340 structured crop records from the Wayback Machine, licensed CC0 like the original — search summary referencing [growingfruit.org thread](https://growingfruit.org/t/openfarms-crop-data-restored-in-website/81182) and [ecosyste.ms listing](https://ost.ecosyste.ms/projects/20800)

### Inferences
- The original data was CC0, so any recovered records can be reused freely, including commercially. The 340-record rescue is a reasonable seed for an edible-crop table, but it needs curation.
- I found no maintained open API for edible-crop growing data (sowing dates, spacing, days to harvest). An indie app will likely need to build its own curated crop table, about 100–300 common vegetables and herbs, from the CC0 rescue plus public-domain extension-service material.

### Gaps
- I did not verify the exact GitHub URL of openfarm-crops-rescue or its field schema.
- I did not research alternatives such as USDA/extension planting calendars, Growstuff (CC-BY-SA crop data) or Plantbuddy.

## Taxonomy and common names: GBIF, POWO/Kew, World Flora Online, USDA PLANTS, iNaturalist

### Takeaway
World Flora Online's Plant List is the cleanest legal choice for an accepted-name backbone: CC0, a JSON dump every six months (latest 2025-06), and a public API. GBIF and iNaturalist are the best sources of multilingual common names. POWO/WCVP is authoritative but its licence and API status were not verified here.

### Cited Findings
- The WFO Plant List is CC0 (public domain). Releases come every 6 months; the 2025-06 release added 9,439 names compared with 2024-12 — [WFO Plant List background](https://wfoplantlist.org/background); [Zenodo 2025-06 record](https://zenodo.org/records/7460932/latest); [WFO June 2025 release](https://about.worldfloraonline.org/june-2025-release)
- WFO API at list.worldfloraonline.org. WFO recommends the JSON export (plant_list_2025-06.json.gz) for a local read-only copy rather than heavy API use. Downloads also include a CoL data package, a MySQL dump, an IPNI→WFO ID map and Darwin Core archives — [Zenodo 2025-06 record](https://zenodo.org/records/7460932/latest)
- POWO attaches data to accepted names from the WCVP names backbone (IPNI is the nomenclatural backbone) and describes its data as freely available. Its codebase is open source — [About POWO](https://powo.science.kew.org/about)
- A third-party GitHub project states that POWO does "not provide an API", which may be outdated — [peterbat1/Kew_POWO_data](https://github.com/peterbat1/Kew_POWO_data)
- iNaturalist publishes open range maps for 100,000+ species, updated monthly, under open licensing — [iNaturalist technology page](https://www.inaturalist.org/pages/technology)

### Inferences (background knowledge, not verified this session; confirm before relying on it)
- GBIF: free, keyless REST API (species/match for name resolution; vernacularNames per taxon). Occurrence data is licensed per dataset as CC0, CC-BY or CC-BY-NC. The GBIF Backbone Taxonomy is generally CC-BY 4.0. Vernacular names come from many source checklists, so quality varies.
- USDA PLANTS: US-government data, generally public domain. Strong for US common names and native status. There is no well-documented official public API (people scrape the CSV downloads).
- iNaturalist API: free, but the recommended limits are about 60 requests/minute and about 10k/day. Commercial or heavy use is discouraged without permission. Observation photos carry per-photo CC licences (many CC-BY-NC). Taxon common names are crowdsourced and multilingual. The iNat CV "score" endpoint is not public.
- POWO/WCVP: WCVP downloads have historically been CC-BY. The pykew library wraps an undocumented POWO API.
- Suggested pattern: WFO (CC0) for accepted names and synonyms, then GBIF or iNat vernacular names for display, mapped by WFO or IPNI ID.

### Gaps
- gbif.org/terms and the iNaturalist API pages returned 403 to the fetch tool. GBIF licence details and iNat rate limits are therefore unverified this session.
- USDA PLANTS current API or download status and POWO's licence were not verified.

## Pet toxicity data (ASPCA) and reuse

### Takeaway
The ASPCA list is the de facto reference, but I found no licence permitting reuse. Third-party scrapers exist, which proves nothing about legality. Treat the ASPCA content as copyrighted, and link to it or write independent facts with citations rather than copying it in bulk.

### Cited Findings
- The ASPCA publishes toxic and non-toxic plant lists for dogs, cats and horses, described as the most frequently encountered plants rather than an all-inclusive list — [ASPCA Poisonous Plants](https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/ivy)
- Several Apify actors scrape ASPCA plant pages into structured data, one keeping the original ASPCA wording. Another joins ASPCA toxicity with GBIF taxonomy and adds source URLs — [Apify ASPCA scraper](https://apify.com/jungle_synthesizer/aspca-toxic-non-toxic-plants-scraper/api); [Apify houseplant toxicity lookup](https://apify.com/dataengineered/houseplant-care-toxicity-lookup)
- My attempt to fetch the ASPCA terms of use (aspca.org/terms-of-use) returned 404. No reuse licence was found — direct fetch, 2026-10-14

### Inferences
- Facts (for example, "Epipremnum aureum is toxic to cats") are generally not copyrightable, but ASPCA's descriptive text and compilation may be. The safe approach is a boolean toxic/non-toxic flag per species plus your own short wording and a link to the ASPCA page, reviewed by counsel before launch.
- Show any toxicity data with a disclaimer, and point users to the ASPCA Animal Poison Control hotline rather than presenting it as veterinary advice.

### Gaps
- I did not locate the actual ASPCA terms page or any CC/open toxicity dataset (for example, the FDA Poisonous Plant Database or Cornell's list) as an alternative.

## On-device identification options and licensing

### Takeaway
iNaturalist's full vision model (used in Seek) is not publicly downloadable. A 2025 report says iNat released "small" models (about 500 taxa) plus a geomodel for on-device use, but I did not confirm their licence. Viable on-device paths are training your own model on licensed iNat or GBIF images, or using third-party models under their own licences.

### Cited Findings
- iNat forum (2020, reaffirmed later): the iNat vision model "is not available via public API and it's not available to download" — [iNat forum](https://forum.inaturalist.org/t/where-to-find-inat-vision-model/12341/2); [iNat forum: CV model parameters](https://forum.inaturalist.org/t/computer-vision-model-parameters-available/45408)
- A secondary aggregator reports that iNaturalist is releasing public "small" models (~500 taxa) with taxonomy files and a geographic model suitable for on-device testing, while the full models stay private — [feedbagel (secondary)](https://feedbagel.com/post/inaturalist-releases-subset-of-machine-learning-models-for-public-use)
- The iNat CV model and geomodel were updated roughly every 1–2 months through 2025 (for example, posts adding 1,500 to 2,000+ taxa) — [iNat blog 113882](https://www.inaturalist.org/blog/113882); [iNat blog 118979](https://www.inaturalist.org/blog/118979)
- The iNat Geomodel takes a location and returns likely species. It is trained on iNat observations plus an elevation map — [Introducing the iNaturalist Geomodel](https://www.inaturalist.org/posts/84677)
- iNat training code is public (inatVisionTraining), and licensed iNat photos are published as an AWS Open Data set — search summary of [iNat forum](https://forum.inaturalist.org/t/where-to-find-inat-vision-model/12341/2)

### Inferences
- For an MVP, on-device ID is not worth building. Use a cloud API (Pl@ntNet or plant.id) and consider on-device later for offline mode or cost control at scale.
- Building your own model with TFLite or Core ML (for example, a fine-tuned MobileNet or EfficientNet on CC-BY/CC0 iNat open-data images for the top 1–3k houseplants and crops) is feasible. However, image licences (exclude NC images for a commercial app) and accuracy validation are real work.

### Gaps
- I did not confirm the licence or download location of iNat's small models or geomodel. Check the iNat blog or GitHub (inaturalist) directly.
- I did not research other ready-made models (TF Hub, Hugging Face, PlantCLEF-trained models) or their licences.

## Recommended stack and cost estimates (1k and 10k MAU)

### Takeaway
MVP: Pl@ntNet free tier for ID, WFO (CC0) for taxonomy, GBIF or iNat for common names, a self-curated care and edible-crop table (seeded from the OpenFarm CC0 rescue), and boolean toxicity flags linked to ASPCA. Total data cost is about $0 at 1k MAU. At 10k MAU, expect roughly €150–€300/month for ID, plus $0–$140/month if you buy Perenual Supreme for care data.

### Cited Findings (price inputs)
- Pl@ntNet: 500 free IDs/day; Pro €5 per 1,000 at 200k+ (€1,000 initial payment for 200k) — [pricing](https://my.plantnet.org/pricing); [Pro plan doc](https://my.plantnet.org/doc/getting-started/pro-plan)
- Kindwise: €0.05/credit (1k+), €0.03 (10k+), €0.02 (50k+); 100 free credits — [Kindwise pricing](https://www.kindwise.com/pricing)
- Perenual: free at 100 req/day (IDs 1–3,000); Premium $59.99/month; Supreme $139.99/month — [Perenual pricing](https://perenual.com/subscription-api-pricing)
- WFO Plant List: CC0, free download — [Zenodo](https://zenodo.org/records/7460932/latest)

### Inferences (my estimates; assumes about 3 photo IDs per MAU per month, with care data cached locally)
- **1k MAU (~3k IDs/month, ~100/day):**
  - Pl@ntNet free: €0.
  - Plant.id alternative: about €50–150/month (3k credits at €0.05).
  - Perenual free tier is usable only with heavy caching (100 req/day).
  - Total: about €0 with Pl@ntNet, or about €150 with plant.id.
- **10k MAU (~30k IDs/month, ~1,000/day):**
  - Pl@ntNet Pro: about €150/month (€1,000 upfront per 200k block).
  - Plant.id: about €900/month (tier B), or about €600–1,000 using tier C packs.
  - Optional Perenual Supreme: $139.99/month.
  - Total: about €150–300/month on the Pl@ntNet path, or about €1,000+ on the plant.id path.
- **Later:**
  - Add plant.health (Kindwise) as a premium "diagnose" feature, paid per call and possibly passed to users via subscription.
  - Consider an on-device model for offline use and cost reduction.
  - Avoid Trefle (unmaintained) and OpenFarm (dead) as live dependencies.
- **Architecture:**
  - Proxy all ID calls through your backend so API keys are not shipped in the app.
  - Cache care and taxonomy data in your own DB keyed by WFO ID, so you are not locked into any one care vendor.

### Gaps
- I have no real-world usage data on how many IDs per user per month plant apps see. The 3/month figure is an assumption.
- Exchange rates and VAT are not included.
