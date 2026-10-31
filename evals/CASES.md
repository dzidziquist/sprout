# Knowledge eval cases

What PlantFam must (or should) answer in each situation. Every knowledge change is tested against these
(`npm test`); a **must** case failing blocks the change. Generated from `evals/cases.ts`: to change a case,
edit that file, then run `UPDATE_CASES_MD=1 npx vitest run evals` to refresh this list.

36 must, 13 should.

## Plant doctor

### Pothos, last checks found the soil damp or soggy, lower leaves yellowing

**Must**. Picks **Lower leaves turning yellow**. First possible cause: **Too much water**.

Why: Soil that keeps checking wet points to too much water, the most common cause of yellow lower leaves.

Source: app rule · `wet-yellow-lower`

### Pothos, last checks found it bone dry, drooping

**Must**. Picks **Drooping or wilting**. First possible cause: **Thirsty**.

Why: A plant that keeps drying right out and droops is thirsty.

Source: app rule · `dry-drooping`

### Pothos drooping while the soil keeps checking soggy

**Must**. Picks **Drooping or wilting**. Never first: Thirsty, Water line too low.

Why: Wilting in wet soil means the roots are struggling, not thirst: telling them to water would make it worse.

Source: app rule · `wet-drooping-not-thirst`

### Snake plant with a soft, mushy base

**Must**. Picks **Soft, mushy or black stem base**. Shown among the causes: **Root rot**.

Why: Snake plants rot from too much water far more than anything else.

Source: app rule · `snake-mushy`

### Soil smells sour and stays wet

**Must**. Picks **Soil smells bad or stays wet**. Shown among the causes: **Root rot**, **Too much water**.

Why: A sour smell and wet soil mean roots are rotting or the soil is waterlogged.

Source: app rule · `soil-smell-rot`

### Water runs straight through, soil shrinking from the pot

Should. Picks **Water runs straight through**. First possible cause: **Thirsty**.

Why: Dried-out mix stops soaking up water; a pot full of roots does the same.

Source: app rule · `water-runs-through`

### Pothos in a dim spot, tall and leggy

**Must**. Picks **Tall, leggy and stretched**. First possible cause: **Not enough light**.

Why: Stretching with long gaps between leaves is the classic sign of too little light.

Source: app rule · `leggy-low-light`

### Calathea in direct sun with bleached, scorched patches

**Must**. Picks **Pale, bleached or scorched patches**. First possible cause: **Too much sun**.

Why: Shade lovers scorch in direct sun.

Source: app rule · `bleached-direct-sun`

### Calathea with brown, crispy tips

Should. Picks **Brown, crispy tips or edges**. Shown among the causes: **Salts and chlorine in tap water**.

Why: Calatheas react to the salts in tap water and to dry air.

Source: app rule · `calathea-tips`

### Boston fern with crispy tips

Should. Picks **Brown, crispy tips or edges**. Shown among the causes: **Dry air**.

Why: Ferns crisp up quickly in dry air.

Source: app rule · `fern-tips-dry-air`

### Pothos in a dim spot not growing in November

Should. Picks **Not growing at all**. First possible cause: **Not enough light**.

Why: Low light and the dark season stop growth; it isn’t usually a disease.

Source: app rule · `no-growth-winter-dark`

### Fine webbing under the leaves

**Must**. Picks **Fine webbing**. First possible cause: **Spider mites**.

Why: Webbing is the giveaway for spider mites.

Source: app rule · `webbing-mites`

### White cottony bits in the leaf joints

**Must**. Picks **White cottony bits**. First possible cause: **Mealybugs**.

Why: Cottony fluff in the joints is mealybugs.

Source: app rule · `cotton-mealybugs`

### Tiny black flies around wet soil

**Must**. Picks **Tiny flies around the soil**. First possible cause: **Fungus gnats**.

Why: Little flies from the soil are fungus gnats, which breed in damp mix.

Source: app rule · `flies-gnats`

### Brown bumps stuck to the stems

**Must**. Picks **Brown bumps on stems**. First possible cause: **Scale insects**.

Why: Little shells on stems and veins are scale insects.

Source: app rule · `bumps-scale`

### White powder on the leaves

**Must**. Picks **White powder on leaves**. First possible cause: **Powdery mildew**.

Why: A flour-like dusting is powdery mildew.

Source: app rule · `powder-mildew`

### Clusters of small green bugs on new growth

**Must**. Picks **Clusters of small bugs**. First possible cause: **Aphids**.

Why: Clusters on soft new growth are aphids.

Source: app rule · `clusters-aphids`

### Holes in the leaves of a plant outside

Should. Picks **Holes or chewed edges**. First possible cause: **Something is eating it**.

Why: Outside, holes are usually slugs, snails or caterpillars.

Source: app rule · `holes-outside`

### Tomato potted 10 days ago in FoxFarm Ocean Forest, lower leaves yellowing

**Must**. Picks **Lower leaves turning yellow**. Never shown: Hungry.

Why: Fresh mix with fertiliser in it is still feeding the plant, so "hungry" would be wrong advice.

Source: app rule · `fresh-mix-not-hungry`

### Tomato fruiting, in Ocean Forest since 7 weeks ago, never fed, lower leaves yellowing

**Must**. Picks **Lower leaves turning yellow**. Shown among the causes: **Hungry**.

Why: Rich organic mix is spent in about a month; a fruiting plant with nothing since is likely hungry.

Source: app rule · `spent-mix-hungry`

### Tomato fed a few days after potting into Ocean Forest, now brown leaf tips

**Must**. Picks **Brown, crispy tips or edges**. First possible cause: **Too much fertiliser**.

Why: Feeding on top of rich fresh mix builds up salts that burn leaf tips and edges.

Source: <https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/> · `fed-on-fresh-mix-tips`

### White crust on the soil of a plant fed three times in six weeks

Should. Picks **White crust on the soil or pot**. Shown among the causes: **Too much fertiliser**.

Why: A chalky crust after frequent feeding is fertiliser salt.

Source: <https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/> · `crust-overfed`

### Fruiting tomato yellowing between the veins

**Must**. Picks **Yellow between the veins**. First possible cause: **Short of magnesium**.

Why: Yellow between green veins on older leaves is the sign of magnesium shortage, common on tomatoes.

Source: <https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies> · `yellow-veins-mg`

### Big, very green tomato with few flowers or fruit

**Must**. Picks **Lots of leaves, little fruit**. First possible cause: **Too much nitrogen**.

Why: Too much nitrogen pushes leaves at the expense of fruit.

Source: <https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/> · `leafy-no-fruit-n`

### Tomato in a dim spot, lots of leaves, little fruit

Should. Picks **Lots of leaves, little fruit**. Shown among the causes: **Not enough light**.

Why: Too little light also means leaves over fruit, so it must be in the running.

Source: app rule · `leafy-no-fruit-dim`

### Pepper outside in November with a purple tinge

Should. Picks **Purple tinge on leaves**. First possible cause: **Cold roots (short of phosphorus)**.

Why: Cold roots can’t take up phosphorus, so leaves go purple in cool spells.

Source: app rule · `purple-cold`

### Tomato drying out between waterings, dark patch on the bottom of fruit

**Must**. Picks **Dark patch on the bottom of fruit**. First possible cause: **Blossom end rot**.

Why: Blossom end rot comes from uneven watering stopping calcium reaching the fruit.

Source: app rule · `ber-dry`

### Pepper fruiting in a pot outside in summer, soil swinging between dry and soggy, dark patch on the bottom of fruit

Should. Picks **Dark patch on the bottom of fruit**. First possible cause: **Blossom end rot**.

Why: Blossom end rot hits peppers as well as tomatoes, and a root zone that dries out then stays soaked brings it on.

Source: <https://ipm.ucanr.edu/home-and-landscape/blossom-end-rot/> · `ber-pepper-pot`

### Tomato fruit cracking after a dry spell

Should. Picks **Fruit splitting or cracking**. First possible cause: **Uneven watering**.

Why: Fruit splits when a thirsty plant suddenly gets a lot of water.

Source: app rule · `split-fruit`

### Lettuce shooting up a flower stalk in summer

**Must**. Picks **Shooting up a flower stalk**. First possible cause: **Bolting (going to seed)**.

Why: Long, hot days make leafy greens bolt.

Source: app rule · `bolting-lettuce`

### Plant growing in water, drooping

**Must**. Picks **Drooping or wilting**. Never shown: Thirsty, Too much water, Outgrown its pot.

Why: A plant in water has no soil, so soil advice (repot, feel the soil) must never show.

Source: app rule · `water-plant-no-soil-advice`

## Feeding advice

### Tomato fruiting indoors in Seattle in late November, mix spent

**Must**. Feeding advice says: "Half-strength tomato feed every 2 weeks"

Why: Short days mean slow growth: half strength, half as often.

Source: app rule · `feed-dark-indoor-tomato`

### Tomato potted into Ocean Forest 10 days ago

**Must**. Feeding advice says: "Not yet: the fresh mix feeds it till about"

Why: The fresh mix still feeds it; feeding now risks too much.

Source: app rule · `feed-fresh-mix-waits`

### Tomato fruiting on a Seattle balcony in July

**Must**. Feeding advice says: "High-potash feed every 10–14 days"

Why: Summer fruiting crops outside get the usual tomato feed.

Source: app rule · `feed-summer-outdoor-window`

### Tomato fruiting on a Seattle balcony in late November

**Must**. Feeding advice says: "Feeding paused for winter" or "No feed now"

Why: Outside, the feeding window closed in mid-August.

Source: app rule · `feed-outdoor-after-window`

### Tomato fruiting indoors in Accra in November

Should. Feeding advice says: "High-potash feed every 10–14 days"

Why: Accra has no dark season, so the usual tomato feed.

Source: app rule · `feed-accra-no-dark`

### Indoor tomato in late November fed 5 days ago

Should. Feeding advice says: "every 2 weeks · next about"

Why: Says when the next half-strength feed falls.

Source: app rule · `feed-next-due`

## Potting mixes

### Typing "foxfarm ocean forest"

**Must**. Recognised as **rich organic**.

Why: Ocean Forest is a rich organic mix.

Source: FoxFarm Ocean Forest label · `mix-ocean-forest`

### Typing "Happy Frog potting soil"

**Must**. Recognised as **rich organic**.

Why: Happy Frog is a rich organic mix.

Source: FoxFarm Happy Frog label · `mix-happy-frog`

### Typing "Miracle Gro potting mix"

**Must**. Recognised as **slow-release**.

Why: Miracle-Gro mixes carry slow-release food.

Source: Miracle-Gro Potting Mix label · `mix-miracle-gro`

### Typing an unknown local compost

**Must**. Not recognised (no guessing).

Why: Never guess a mix we don’t know.

Source: app rule · `mix-unknown`

### Tomato in rich organic mix

**Must**. Feed reminders wait **4 weeks**.

Why: Rich organic food is spent in about a month.

Source: app rule · `wait-organic`

### Tomato in slow-release mix that says 6 months

**Must**. Feed reminders wait **8 weeks**.

Why: A pot rinses it out sooner, and fruit needs more potash: about 8 weeks.

Source: app rule · `wait-slow-fruiting`

### Pothos in slow-release mix

**Must**. Feed reminders wait **13 weeks**.

Why: About 3 months for plants that aren’t heavy feeders.

Source: app rule · `wait-slow-houseplant`

### Fertiliser in the mix, kind not known

**Must**. Feed reminders wait **4 weeks**.

Why: The short wait: a reminder a little early does less harm than starving a hungry crop.

Source: app rule · `wait-unsure`

## Grow patch jobs

### Fruiting tomato indoors, Seattle, late November, mix spent

**Must**. Grow jobs include: **High-potash feed, half strength every 2 weeks**. No High-potash feed (every 10–14 days).

Why: The slow, half-strength feed job, not the summer one.

Source: app rule · `tasks-dark-half-strength`

### Fruiting tomato indoors, potted into Ocean Forest 10 days ago

**Must**. No High-potash feed (every 10–14 days) or High-potash feed, half strength every 2 weeks.

Why: No feed job while the fresh mix feeds it.

Source: app rule · `tasks-fresh-mix-no-feed`

### Fruiting tomato indoors fed 3 days ago

**Must**. No High-potash feed, half strength every 2 weeks.

Why: Just fed: no feed job until it’s due again.

Source: app rule · `tasks-fed-recently`

### Tomato flowering indoors in November

Should. Grow jobs include: **Shake the flowers**.

Why: Indoors there are no bees: shake the flowers.

Source: app rule · `tasks-shake-flowers`
