# Hobby Collector Patterns (Vinyl, LEGO, Sneakers, Cards) and Their Fit for Houseplant / Rare-Plant Collecting

Research notes, October 2026. 16 tool calls. Official help docs for Discogs, BrickLink and Rebrickable did not come up in search; most hobby-platform evidence is from secondary sources (forums, API docs, app store listings). Items marked "background knowledge (unverified)" are the researcher's prior knowledge with no source found this session. The report writer should treat them as leads only, not citable facts.

## 1. How do Discogs, Brickset/Rebrickable/BrickLink and sneaker apps model collection vs wishlist, variants, condition, provenance and market value?

### Takeaway
Every mature collector platform uses the same core split: a canonical shared catalogue of item types (release, set, card) separate from a user's owned instances (my copy, with its own condition and notes), plus a separate want list. Value is shown as a range (min/median/max) or a rolling-window price guide, never as one authoritative number. Condition is graded on a shared vocabulary (Goldmine for vinyl), and some parts are graded separately (media vs sleeve).

### Cited Findings
**Vinyl / Discogs**
- The Goldmine grading system (Mint, Near Mint, VG+, VG, G...) is described as the same system used by Discogs, eBay and many used-record stores — [help.deadformat.com](https://help.deadformat.com/hc/en-us/articles/34940438675092); [Nivessa](https://nivessa.com/blog/grading-your-records-what-every-collector-needs-to-know)
- Record (media) and sleeve are graded separately because their condition often differs. A seller guide suggests averaging the two for an approximate value, and notes that a sleeve without its record (or the reverse) holds minimal value — [Funky Moose Records](https://www.funkymooserecords.ca/pages/used-records-for-sale)
- One store's illustration of grade affecting price: a £50 Mint record is worth about £25 at Very Good and about £15 at Good. This is one store's example, not an official guide — [yoursoundmatters.com](https://www.yoursoundmatters.com/?p=3181)
- Discogs exposes a collection value endpoint (`/users/{user}/collection/value`) that returns the minimum, median and maximum total value of a collection. Only the owner can see it (added around the 2016 iOS 1.5 update) — [The Vinyl Factory](https://www.thevinylfactory.com/news/discogs-ios-app-updated-new-features); [python3-discogs-client docs](https://python3-discogs-client.readthedocs.io/en/v2.5/index.html)
- Forum users note that the Discogs median ignores condition, and that demand matters as much as price ("A record valued at £50 that only 4 people are interested in might sit there for decades unsold") — [Pink Fish Media forum](https://pinkfishmedia.net/forum/threads/whats-your-discogs-collection-value.264274/page-4)

**LEGO / Brickset, Rebrickable, BrickLink**
- Brickset parts tracking has "I own" and "I want" checkboxes per part, including loose parts. It is off by default because of the volume of data it generates. Brickset warns the data is only as accurate as LEGO's published inventories — [Brickset FAQ](https://brickset.com/faq)
- Brickset can export a "Parts you want" list to LEGO's Pick a Brick upload (North America), turning a want list straight into a purchase — [Brickset](https://brickset.com/article/114652/new-feature-upload-wanted-parts-to-pick-a-brick)
- Brickset syncs collections with Rebrickable. A key benefit is seeing whether you can build a given set from parts you already own — [Brickset tutorial](https://brickset.com/article/26571/tutorial-synchronising-your-collection-with-rebrickable)
- Rebrickable's "Find Sets you can build" shows every set and fan design (MOC) buildable from your current parts. Marking missing parts one by one is tedious enough that a third-party bulk-entry tool exists — [Eurobricks forum](https://www.eurobricks.com/forum/forums/topic/59034-rebrickablecom/page/6); [dracos.co.uk](https://dracos.co.uk/made/rebrickable-lost-parts)
- The BrickLink price guide shows the last 6 months of sales plus current listings. Users ask for 12 months for slow-moving sets, and low-volume items can show $0 or unreliable averages — [BrickLink forum thread 373556](https://www.bricklink.com/messageThread.asp?ID=373556); [BrickLink forum thread 323253](https://www.bricklink.com/messageThread.asp?ID=323253)

**Sneakers**
- Third-party sneaker collection apps (Deal Reaper, SwiftSole, SNKRAI, SoleDeck) pull StockX, GOAT and eBay prices to show live collection value, per-shoe profit and loss, and 30/60/90/365-day price movement. Deal Reaper added a "Portfolio Leaderboard". These claims come from app store marketing and are unverified — [Deal Reaper](https://apps.apple.com/kr/app/id6747319801); [SwiftSole](https://apps.apple.com/app/id6443815638); [SNKRAI](https://mwm.ai/apps/snkrai-sneaker-value-scanner/6753932811); [SoleDeck](https://neura.market/ai-tools-directory/e-commerce/soledeck)

**Trading cards**
- TCGCollector offers set-level progress, custom lists, a Pokédex view and stats — [TCGCollector](https://tcgcollector.com/)
- Eyevo snapshots total collection value daily on CardMarket and TCGplayer, with per-set completion bars and 7-day change badges — [Eyevo](https://eyevotcg.com/blog/track-pokemon-collection-value-daily-2026)

### Inferences
- Mapping to plants:
  - Catalogue entry ↔ taxon / cultivar (e.g. *Monstera deliciosa* 'Thai Constellation', *Hoya carnosa* 'Krimson Queen').
  - Owned instance ↔ an individual plant, with its own source, date, photos and condition.
  - Want list ↔ "wishlist / ISO (in search of)".
  - Pressing or colourway variants ↔ cultivar, variegation type (albo, aurea, mint, marble, half-moon), clone or seed-grown, tissue culture vs cutting.
- Condition grading transfers only loosely. Plants change over time, so a "current state" snapshot (rooted / unrooted, leaf count, node count, pest-free) fits better than a fixed grade. A small, shared, plain-language vocabulary for propagule type (node cutting, wet stick, rooted cutting, established plant, TC plantlet) is the plant counterpart of Goldmine. These terms are common in collector usage, but no source was found for them this session.
- Provenance maps naturally onto the propagation family tree: "this plant is a cutting of plant X, bought from vendor Y on date Z." That is richer than anything Discogs offers. Discogs tracks release identity, not ownership lineage.
- If value is shown at all, show it the way Discogs does (a min/median/max range, private to the owner) or the way BrickLink does (recent window plus a "low data" warning). Never show a single authoritative price.

### Gaps
- No official Discogs help-page text was retrieved on wantlist alerts, per-copy condition fields, or release price-history charts. Background knowledge (unverified): Discogs collection items can carry custom fields such as media/sleeve condition and notes, and the marketplace shows per-release sales history.
- Rebrickable's current feature set wasn't confirmed from official docs (forum posts date from 2011–2017).
- Whether StockX or GOAT themselves offer a native "portfolio" feature was not confirmed. Background knowledge (unverified): StockX has historically had a Portfolio feature.
- Backloggd features (status shelves, year-in-review) were not covered in results.

## 2. What social and trading features exist, and what trust/safety mechanisms do they use?

### Takeaway
Trust in collector markets rests on a few repeated mechanisms: visible feedback counts (lifetime and recent), escrow or "goods & services" payment, timestamped verification photos with username and date, do-not-trade lists, and bot-confirmed trade flair. Live-stream selling has become the main rare-plant sales channel and is pitched as anti-scam, but shipping deaths and refund disputes remain the main complaints.

### Cited Findings
- BrickLink feedback is tagged praise / neutral / complaint, with week, month, year and total counts and separate buying vs selling totals. Lifetime praise is shown by default, and a 2022 forum proposal argued for showing the last 6 months first — [BrickLink feedback profile](https://www.bricklink.com/feedback.asp?u=Linkin); [BrickLink forum 323253](https://www.bricklink.com/messageThread.asp?ID=323253)
- One article notes that the BrickLink rating system "can't account for every variable, from shipping delays to outright fraud" — [bricksforbricks.com](https://www.bricksforbricks.com/blog/tag/BrickLink)
- r/TakeaPlantLeaveaPlant rules:
  - Each plant offered needs a verification photo with a handwritten note showing the date and username.
  - Traders should comment before DMing, use PayPal Goods & Services, check the DNT (do-not-trade) list, and send exact photos of what will ship.
  - [r/TakeaPlantLeaveaPlant rules](https://red.applefritter.com/r/TakeaPlantLeaveaPlant/wiki/rules)
- Swap-subreddit flair systems (e.g. r/SteelbookSwap) record confirmed trades through a bot when both parties reply. They warn that flair "does not guarantee you will not get scammed" and treat fake confirmations as fraud — [r/SteelbookSwap](https://lr.eu.psf.lt/r/SteelbookSwap/wiki/rules/trades)
- r/AustralianPlantSwap disclaims responsibility for the outcome of transactions — [r/AustralianPlantSwap](https://lr.eu.psf.lt/r/AustralianPlantSwap)
- Palmstreet background:
  - Started as a plant marketplace in October 2022 and added livestreams in April 2023.
  - About 500 live sellers, roughly 200 active, with 500–700 concurrent viewers.
  - Seller fees run from 5.9% (free tier) to 3.9% ($399/month tier), and sellers set their own shipping rates.
  - Hosts use trivia, bingo and a "Magic 8 Ball" to engage viewers.
  - Whatnot reported 8x growth in plant sales after launching home & garden in 2023.
  - [Modern Retail, May 2024](https://www.modernretail.co/technology/definitely-not-on-my-bingo-card-plants-are-the-latest-live-shopping-trend/)
- Seller Bill Da Bui says livestreaming has overtaken Facebook Marketplace as the main channel for rare-plant sales and "provides protection from scammers and unfair selling practices". This is a seller's opinion — [Forbes Australia, Nov 2025](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)
- Palmstreet added Long-Form Auctions of up to 3 days alongside live auctions — [Webull/news](https://www.webull.com/news/13447809019265024)
- A Palmstreet app review describes a plant that arrived two days late, without the paid-for heat pack, and dead. The seller refunded only the heat pack and the app declined a full refund. This is a single anecdote — [Justuseapp reviews](https://justuseapp.com/en/app/1514039642/palmstreet-shop-sell-live/reviews)
- Buyer Emily Gerson: "It's not uncommon for plants to be destroyed or lost altogether" in international shipping — [Forbes Australia](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)
- Chemistry World says collector demand for new varieties "has also opened the door to deception and fraud" — [Chemistry World](https://chemistryworld.com/features/the-plant-trades-scientific-secrets/4016068.article)

### Inferences
- A playful care app does not need a marketplace to gain social value. Profile and collection sharing, "ISO" want lists, and lineage-linked swap records ("this cutting came from @alice's plant") deliver most of the community value without payment, escrow or dispute-resolution liability.
- If swaps are supported later, reuse the patterns plant communities already trust:
  - Timestamped photo verification (an in-app camera capture stamps date and username automatically).
  - Mutual confirmation of a completed swap (two-party confirm, like the swap-subreddit bots).
  - Recent-weighted reputation.
  - Explicitly no in-app payments.
- Shipping death or loss is the dominant real-world failure. Swap records could log the shipping condition (heat or cold pack, transit days, arrival photo), which doubles as a dispute record.

### Gaps
- r/plantswap's own rules and flair system and Facebook-group scam patterns were not retrieved. No quantitative data on plant-trade scam rates was found.
- Palmstreet's buyer-protection, DOA (dead on arrival) and refund policies were not found.
- Discogs marketplace seller ratings and dispute process were not retrieved.

## 3. What drives engagement and completionism?

### Takeaway
Completion bars ("X of Y in set"), daily value snapshots with change badges, "what can I build or do with what I own" queries, leaderboards and big aggregate stats are the recurring engagement hooks. Value leaderboards push toward speculation, which conflicts with a care-first app.

### Cited Findings
- Per-set completion bars with 7-day delta badges and daily value snapshots — [Eyevo](https://eyevotcg.com/blog/track-pokemon-collection-value-daily-2026)
- Set-level progress and stats dashboards — [TCGCollector](https://tcgcollector.com/)
- Pokémon TCG Pocket sync shows global card-completion stats and per-set completion level — [Pokémon Zone](https://www.pokemon-zone.com/collection-tracker/)
- Pokémon TCG Pocket anniversary stats: 2 billion+ battles, 490 million+ showcases, and more than 40 billion cards acquired. These are milestone stats used as celebration and engagement content — [Game World Observer](https://gameworldobserver.com/tag/pokemon-tcg-pocket); [KitGuru](https://www.kitguru.net/page/125/!https:/www.kitguru.net/lifestyle/mobile/mustafa-mahmoud/pokemon-tcg-pocket-reaches-another-major-milestone/)
- Rebrickable's "Find Sets you can build" turns an inventory into possibilities — [Eurobricks](https://www.eurobricks.com/forum/forums/topic/59034-rebrickablecom/page/6)
- Deal Reaper added a Portfolio Leaderboard (marketing claim) — [App Store](https://apps.apple.com/kr/app/id6747319801)
- Palmstreet live hosts gamify sales with trivia, bingo and a Magic 8 Ball — [Modern Retail](https://www.modernretail.co/technology/definitely-not-on-my-bingo-card-plants-are-the-latest-live-shopping-trend/)

### Inferences
- Plant counterparts of "set completion" that are low-risk and care-aligned:
  - Genus or collection checklists (e.g. "Hoya: 12 of your 30-wishlist", "Philodendron Pink Princess family").
  - Propagation milestones (first root, first new leaf, first successful pass-along).
  - "Family tree size" (descendants of one plant out in the world).
  - Year-in-review: plants propagated, cuttings gifted, new leaves logged, survival streaks.
- A plant counterpart of "what can I build" is "what can I propagate or share now": plants with enough nodes, or ones due for a chop.
- Avoid value leaderboards. They reward speculation over care and invite the scam and theft dynamics seen in rare-plant markets.

### Gaps
- No primary data on whether Discogs or Brickset run year-in-review features, or on their measured effect on retention.
- Backloggd's year-in-review and status shelves were not captured.

## 4. How do rare-plant collectors currently behave and what tools serve them?

### Takeaway
Rare-plant collecting is driven by mutation-based rarity (variegation, colour shifts), live-stream auctions (Palmstreet, Whatnot), and Facebook buy/sell/trade groups, with prices that spike and then fall as tissue culture scales up. A few small apps (Leafolio, FloraVault) already target hoya and aroid collectors with self-reported provenance, parentage and "health passport" records, which validates demand. None verify identity.

### Cited Findings
- Record sale: a 3-leaf variegated *Anthurium luxurians* 'albo marble' sold for US$26,000 on Palmstreet in late September 2025, beating a $10,000 record from August. The same buyer spent $52,000 on three plants. A $39,000 "Devil Monster" monstera is mentioned (photo caption only) — [Forbes Australia, Nov 4, 2025](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)
- Seller pricing uses a "rare-ometer": difficulty to replicate, novelty, whether traits pass to offspring, and care difficulty. Slow-growing plants command more because they offer fewer propagation opportunities. Palmstreet says its plant community is "heavily made up of collectors" — [Forbes Australia](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)
- Palmstreet's head of brand marketing estimated about 100 million plants purchased on the platform in 2025. This is a company claim, and an implausibly large one, so treat with caution — [Forbes Australia](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)
- Monstera 'Thai Constellation' price arc:
  - In Australia around 2019 it cost roughly $300 for a 25cm pot and up to $1,100 for a full-size plant, versus $30–40 for a standard Monstera — [The New Daily](https://www.thenewdaily.com.au/news/2019/08/25/hipster-plant-monstera/)
  - Later it sold at Bunnings for $99, with horticulturist Graham Ross advising buyers to wait for further drops — [BHG Australia](https://www.bhg.com.au/rare-collectable-houseplant)
  - Established plants still fetch hundreds on Facebook buy/sell/trade groups — [Pedestrian TV](https://www.pedestrian.tv/home/variegated-monstera-ebay-indoor-plants-lockdowns/)
  - Forum users quoted $150 cuttings to $3,000 small plants and compared it to tulip mania — [Bunnings Workshop](https://www.workshop.bunnings.com.au/discussion/31703/variegated-monstera)
  - Sources conflict slightly on the arrival date.
- Thai Constellation was produced by tissue culture in a single Thai lab and brought to the trade by Costa Farms in 2020 — [Garden Betty](https://gardenbetty.com/monstera-thai-constellation/)
- Whatnot plant sales rose 8x and plant sellers 3x after its 2023 home & garden launch. Steve's Leaves nursery makes $2,000–4,000 per weekly one-hour live — [Modern Retail](https://www.modernretail.co/technology/definitely-not-on-my-bingo-card-plants-are-the-latest-live-shopping-trend/)
- Existing collector apps:
  - **Leafolio** (iOS): catalog, photos, sources and orders, plus Premium breeding records for crosses and parentage. Aimed at hoya, aroid and rare-houseplant growers — [App Store](https://apps.apple.com/cl/app/leafolio/id6764116802)
  - **FloraVault** (iOS): aimed at high-end aroid and orchid collectors. Offers a light meter, a care log and a PDF "health passport" of history and provenance framed around resale value. Data stays on the device — [mwm.ai](https://mwm.ai/apps/floravault/6757129504)
  - **Plant Provenance**: a Skillshare student concept for a shared provenance platform, not a shipping product — [Skillshare](https://www.skillshare.com/fr/projects/Plant-Provenance-Collect-with-Confidence/625960)

### Inferences
- Demand for provenance, parentage and spend tracking among hoya and aroid collectors is real, given dedicated niche apps. A propagation family tree is a more engaging, visual version of the same need, and it is differentiating because the existing apps are journal or spreadsheet-like.
- Tissue culture scaling repeatedly deflates "rare" prices (the Thai Constellation case). Any price display would mislead quickly, which is another argument against built-in valuation.
- A "spend tracker" (purchase price per plant, private) is low-risk and matches what collectors already record (Leafolio logs orders and vendors).

### Gaps
- No quantitative survey of collector behaviour (spend levels, channel mix) was found.
- Specific Etsy plant-scam reports and Instagram/"Plantstagram" trading norms were not retrieved.
- No source was found for DNA or cultivar verification services for aroids and hoyas.

## 5. Legal and ethical considerations: patents/PBR, phytosanitary rules, CITES

### Takeaway
Many trade cultivars are patented (US plant patents cover asexual reproduction, i.e. propagation). Cross-border shipping of live plants generally needs a phytosanitary certificate even when no import permit is needed. Some groups (e.g. orchids) carry CITES paperwork. A care app should inform rather than enforce: show "patented / PBR" flags and "check before you ship abroad" notices, and avoid facilitating commercial sale.

### Cited Findings
- Example patent: US PP36,561 covers Monstera 'MKR-MTCM1', a whole-plant mutation of 'Thai Constellation' found in a Miami nursery. The patent states that 'Thai Constellation' itself is "not patented". Cultivar status must be checked case by case — [Google Patents USPP36561](https://patents.google.com/patent/USPP36561)
- Nurseries patent stable decorative variants and mass-produce them by propagation — [Chemistry World](https://chemistryworld.com/features/the-plant-trades-scientific-secrets/4016068.article)
- US imports: forum posts quoting APHIS say that under 7 CFR 319.37 lots of 13 or more restricted articles need a written import permit, so 12 or fewer may not, absent specific restrictions. A phytosanitary certificate is still required, and only small seed lots can enter without one. Posters disagree on whether the 12-item allowance applies to mail. These are secondhand sources — [Pacific Bulb Society list](https://www.pacificbulbsociety.org/pbslist/2022-May/s7c388ks02fu83fhe78557k261.html); [Terraforums](https://terraforums.com/forums/threads/importing-plants.137549/)
- The APHIS PPQ 587 permit is described by a vendor as free and taking about 2 weeks. A forum user importing orchids from the Philippines paid for CITES and phytosanitary certificates on each shipment — [canarius.com](https://canarius.com/en/info/cites-aphis.html); [UBC forum](https://forums.botanicalgarden.ubc.ca/threads/sending-orchids-from-phil-to-us.30606/)
- Some orchids may enter the US in approved growing media under country-specific systems approaches, each shipment needing a phytosanitary certificate (e.g. the 2017 rule for Korean Phalaenopsis and Cymbidium) — [SAF](https://safnow.org/2017/09/27/aphis-allow-importation-south-korean-orchid-plants/)
- Canadian guidance excerpt: personal houseplants from the continental US don't need phytosanitary certificates or permits to enter Canada — [UW Hort Library](https://depts.washington.edu/hortlib/keyword/plant-protection-law-and-regulations)

### Inferences
- Background knowledge (unverified this session, verify before citing):
  - US plant patents last 20 years from filing and grant the right to exclude others from asexually reproducing, selling or using the plant, so propagating a patented cultivar (even for gifting) is technically restricted. Labels often say "PPAF" (plant patent applied for) or "Propagation prohibited".
  - EU and UK use Plant Breeders' Rights (UPOV-based), which have a private, non-commercial use exemption. US plant patents have no explicit equivalent.
  - The EU requires plant passports and phytosanitary certificates for imports from third countries, including small consignments since 2019–2021.
  - All Orchidaceae are listed in CITES Appendix II (some in Appendix I), as are many cacti, *Nepenthes* and some succulents.
  - The IPPC sets the international phytosanitary certificate standards.
- Design implications:
  - Model "patented / PBR" as a cultivar attribute in the catalogue, with a gentle notice on propagation and family-tree actions ("This cultivar may be patented. Propagating to sell or share may need a licence").
  - Model "CITES-listed" as a taxon attribute.
  - Keep swaps local or domestic by default, and show "international shipping needs a phytosanitary certificate" messaging rather than facilitating cross-border trades.
  - Avoid being a marketplace, so the app is not a channel for patent infringement or illegal wildlife-plant trade.
  - Wild-collected rare aroids raise conservation ethics concerns. Lineage records showing nursery or tissue-culture origin vs wild origin could be a positive feature.

### Gaps
- The official APHIS "Plants for Planting" page could not be fetched (404), so the current permit and small-lots text is unconfirmed.
- No retrieved primary source on US plant-patent scope, the duration of a specific houseplant patent, or the PBR private-use exemption.
- No IPPC or CITES primary pages were retrieved. No EU plant passport source was retrieved.

## 6. Which patterns are most valuable and least risky for a playful plant-care app with a propagation family tree?

### Takeaway
Bring over the catalogue/instance/want-list data model, lineage-based provenance, completion-style milestones, and private spend logs. These are high value and low risk. Defer or avoid marketplaces, public valuations, price charts and value leaderboards, which bring scam, shipping, patent and speculation risks the hobby platforms needed heavy trust infrastructure to manage.

### Cited Findings
(Synthesised from sections 1–5, which hold the sources.)
- Shared catalogue + owned-instance + want-list structure: Brickset own/want, Rebrickable build-from-owned, TCG set completion — [Brickset FAQ](https://brickset.com/faq); [TCGCollector](https://tcgcollector.com/)
- Niche plant apps already sell parentage and provenance features to hoya and aroid collectors — [Leafolio](https://apps.apple.com/cl/app/leafolio/id6764116802); [FloraVault](https://mwm.ai/apps/floravault/6757129504)
- Trust mechanisms plant swappers already use: timestamped photos, Goods & Services payments, DNT lists — [r/TakeaPlantLeaveaPlant](https://red.applefritter.com/r/TakeaPlantLeaveaPlant/wiki/rules)
- Price volatility and tissue-culture deflation make valuations misleading — [BHG Australia](https://www.bhg.com.au/rare-collectable-houseplant); [Forbes Australia](https://www.forbes.com.au/life/lifestyle/houseplant-sells-for-26000-on-palmstreet-app-breaking-recent-record/)

### Inferences
Researcher's ranked assessment:

**High value, low risk (do first)**
1. **Catalogue vs my-plant vs wishlist ("ISO")** model with variant fields: cultivar, variegation type, propagule type, and source type (nursery / TC / cutting / seed / wild-collected).
2. **Lineage as provenance**: each plant links to its parent plant (own or a friend's), with the acquisition source and date. This beats Discogs, where provenance isn't modelled.
3. **Completion and milestones**: genus checklists, wishlist progress bars, propagation success rate, descendants count, "year in Rootline" recap.
4. **"What can I propagate now?"**: the Rebrickable "what can I build" counterpart, driven by care logs and node counts.
5. **Private spend log** per plant (what I paid, where), shown only to the owner, as Discogs keeps collection value owner-only.

**Medium value, medium risk (later, opt-in)**
6. **Public profiles and shareable collection or tree pages**, plus "gift a cutting" links that create the child node in the recipient's tree. Needs privacy controls, because rare-plant collections can attract theft. Theft risk is an inference; no source was found.
7. **Swap matching between want lists and offers**, local only, with in-app timestamped photo verification and two-party completion confirmation. No payments.

**High risk (avoid or defer)**
8. A marketplace or auctions: payments, DOA disputes, shipping, fraud and patent-infringement exposure.
9. Market-value estimates, price charts or value leaderboards: thin and volatile data, and they encourage speculation.
10. International swap facilitation: phytosanitary and CITES compliance.

**Compliance-friendly touches**: patented or CITES flags on catalogue entries, a soft notice on propagate and share actions, and "domestic by default" swaps.

### Gaps
- No user research was found on whether casual (non-rare) plant owners want completion mechanics, or whether gamification alienates serious collectors.
- No data on theft or doxxing incidents tied to public rare-plant collection displays.
