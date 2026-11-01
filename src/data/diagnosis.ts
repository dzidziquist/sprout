/*
 * The plant doctor's knowledge: what people see, what usually causes it, how to tell, and what to do.
 * Plain data so it's easy to grow and to test. The engine (src/engine/diagnose.ts) scores the causes
 * for a symptom using what the app already knows about the plant.
 *
 * House rules for the copy: say "possible cause", start with the common care mistakes before rare
 * diseases, give checks the person can actually do, and never give pesticide doses.
 */

export type SymptomArea = 'leaves' | 'stems' | 'soil' | 'bugs' | 'fruit';

/**
 * Where an entry is in the knowledge pipeline (docs/knowledge.md). Drafts are kept but never shown in
 * the app; an entry becomes verified only after the fact-checker, the safety editor and the evals pass
 * and the owner merges it. Unset: written and reviewed by hand before the pipeline existed.
 */
export type KnowledgeStatus = 'draft' | 'verified';

/** Shown in the app: anything that isn't a draft. */
export const isLive = (entry: { status?: KnowledgeStatus } | undefined): boolean => !!entry && entry.status !== 'draft';

/** Facts the engine works out from the plant, its diary and the season. */
export type Signal =
  | 'wetChecks' // two or more of the last three checks found the soil damp or soggy
  | 'soggy' // a soggy check in the last two weeks
  | 'overdue' // the last check came late, or one is late now
  | 'dryChecks' // recent checks keep finding it bone dry
  | 'lowLight'
  | 'directSun'
  | 'shadeLover' // calathea, fern, peace lily and friends
  | 'succulent'
  | 'moistureLover'
  | 'edible'
  | 'fruiting' // an edible at the fruit or harvest stage
  | 'outdoor'
  | 'indoor'
  | 'oldMix' // same mix for a year or more
  | 'recentRepot' // repotted in the last three weeks
  | 'newPlant' // joined in the last month
  | 'slowSeason' // winter or the grey season: growth slows, soil stays wet longer
  | 'hotSeason'
  | 'plasticPot'
  | 'terracotta'
  | 'smallPot'
  | 'tapSensitive' // reacts to the salts and chlorine in tap water
  | 'reservoir' // LECA or water
  | 'unfed' // no feed logged (and no fresh fertilised mix) in two months
  | 'freshMix' // potted into mix with fertiliser in it, still feeding it (engine/mix)
  | 'mixSpent' // that mix's food has run out and no feed has been logged since
  | 'fedRecently' // a feed logged in the last three weeks
  | 'overFed' // fed on top of fresh fertilised mix, or three or more feeds in six weeks
  | 'pestLogged'; // a pest check logged in the last month

/** A care change the app can make for you when a cause is confirmed. */
export type CareTweak = 'slow-water' | 'more-water';

export interface Cause {
  id: string;
  title: string;
  /** One or two sentences: what is going on. */
  summary: string;
  /** Quick things to look at to confirm it. */
  check: string[];
  /** What to do, in order. */
  fix: string[];
  /** How the plant's own story raises or lowers this cause. `why` is shown when it applies. */
  signals?: { signal: Signal; weight: number; why: string }[];
  tweak?: CareTweak;
  /** Serious: suggest saving a healthy piece as a cutting. */
  rescue?: boolean;
  /** Advice is about soil (feel it, drainage, repot into mix): never shown for LECA or water plants. */
  soilOnly?: boolean;
  /** Only for LECA or water plants. */
  waterOnly?: boolean;
  /** Where the advice comes from (extension service pages and the like), added by the weekly knowledge task. */
  sources?: string[];
  /** When it was last checked against its sources, as YYYY-MM (docs/knowledge.md). Unset: not reviewed yet. */
  reviewed?: string;
  status?: KnowledgeStatus;
}

export interface Symptom {
  id: string;
  area: SymptomArea;
  label: string;
  /** Short hint under the label so people pick the right one. */
  hint: string;
  /** Causes with how common they are for this symptom (relative, before the plant's story). */
  causes: { cause: string; prior: number }[];
  /** Only show for edibles. */
  edibleOnly?: boolean;
  /** Not shown for LECA or water plants (there's no soil to look at). */
  soilOnly?: boolean;
  /** Wording for LECA or water plants, when it differs. */
  waterLabel?: string;
  waterHint?: string;
  status?: KnowledgeStatus;
}

export const AREAS: { id: SymptomArea; label: string }[] = [
  { id: 'leaves', label: 'Leaves' },
  { id: 'stems', label: 'Stems & shape' },
  { id: 'soil', label: 'Soil' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'fruit', label: 'Flowers & fruit' },
];

const WET = { signal: 'wetChecks', weight: 2.2, why: 'Your recent checks keep finding the soil wet.' } as const;
const SOGGY = { signal: 'soggy', weight: 2.5, why: 'A recent check found it soggy.' } as const;
const SLOW = { signal: 'slowSeason', weight: 1.4, why: 'It’s the slow season, so soil stays wet much longer.' } as const;
const DRY = { signal: 'dryChecks', weight: 2.2, why: 'Recent checks found it bone dry.' } as const;
const LATE = { signal: 'overdue', weight: 1.8, why: 'Its last few checks came late.' } as const;

export const CAUSES: Record<string, Cause> = {
  overwatering: {
    id: 'overwatering',
    soilOnly: true,
    title: 'Too much water',
    summary: 'The roots are sitting wet for too long and can’t breathe. The most common way houseplants die.',
    check: ['Push a finger 5 cm (2 in) into the soil. Still damp days after watering?', 'Lift the pot: if it still feels heavy, the mix is still wet.', 'Is there water sitting in the saucer or cover pot?'],
    fix: ['Hold off watering until the top few cm are dry.', 'Empty the saucer after every watering.', 'Make sure the pot has a drainage hole.', 'Move it somewhere a little brighter so it drinks faster.'],
    signals: [WET, SOGGY, SLOW, { signal: 'plasticPot', weight: 1.2, why: 'Plastic pots hold moisture longer than clay.' }, { signal: 'lowLight', weight: 1.3, why: 'In low light it uses water slowly.' }, { signal: 'succulent', weight: 1.4, why: 'Succulents want to dry right out between drinks.' }, { signal: 'dryChecks', weight: 0.4, why: '' }],
    tweak: 'slow-water',
    sources: ['https://extension.illinois.edu/blogs/ilriverhort/2018-01-28-how-water-houseplants', 'https://extension.missouri.edu/publications/g6510', 'https://extension.wsu.edu/jefferson/mg-home/tip-sheet-15-houseplants/', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://extension.psu.edu/repotting-houseplants', 'https://extension.illinois.edu/news-releases/keep-houseplants-happy-simple-solutions', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://www.rhs.org.uk/plants/types/houseplants/growing-guide', 'https://ucanr.edu/blog/backyard-gardener/article/watering-your-houseplants', 'https://hgic.clemson.edu/factsheet/indoor-plants-watering/'],
  },
  'root-rot': {
    id: 'root-rot',
    soilOnly: true,
    title: 'Root rot',
    summary: 'Roots that stayed wet too long have started to rot, so the plant can’t drink even though the soil is wet.',
    check: ['Slide the plant out of its pot. Healthy roots are firm and pale; rotten ones are brown, mushy and may smell bad.', 'Is the base of the stem soft or dark?'],
    fix: ['Trim off every mushy root with clean scissors.', 'Repot into fresh, airy mix in a pot with drainage.', 'Water lightly and wait until it dries before the next drink.', 'If most roots are gone, the plant may not pull through: before you throw it out, take a cutting from a healthy stem.'],
    signals: [SOGGY, WET, SLOW, { signal: 'oldMix', weight: 1.4, why: 'Old mix packs down and stays soggy.' }, { signal: 'succulent', weight: 1.3, why: 'Succulents rot quickly when kept wet.' }, { signal: 'dryChecks', weight: 0.3, why: '' }],
    tweak: 'slow-water',
    rescue: true,
    sources: ['https://hort.extension.wisc.edu/articles/root-rots-houseplants/', 'https://www.rhs.org.uk/container-gardening/how-to-repot-a-plant', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://extension.illinois.edu/news-releases/keep-houseplants-happy-simple-solutions', 'https://hort.extension.wisc.edu/articles/holiday-cactus/', 'https://extension.illinois.edu/blogs/flowers-fruits-and-frass/2021-03-24-how-do-you-bring-office-plant-back-life', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-take-cuttings-from-houseplants'],
  },
  underwatering: {
    id: 'underwatering',
    soilOnly: true,
    title: 'Thirsty',
    summary: 'The soil has been drying out completely, so the plant is losing water faster than it gets it.',
    check: ['Is the soil dry and pulling away from the sides of the pot?', 'Does the pot feel light?', 'Are the leaves wilting, with brown, crispy edges? Are the oldest leaves at the base yellowing first?'],
    fix: ['Water slowly until it runs out of the bottom.', 'If the soil is rock hard, stand the pot in a bowl of water until the bubbles stop, then let it drain.', 'Check a little sooner from now on.'],
    signals: [DRY, LATE, { signal: 'terracotta', weight: 1.2, why: 'Clay pots dry out fast.' }, { signal: 'smallPot', weight: 1.2, why: 'Small pots dry out fast.' }, { signal: 'hotSeason', weight: 1.3, why: 'It’s the hot season, so it drinks more.' }, { signal: 'moistureLover', weight: 1.3, why: 'It likes to stay lightly damp.' }, { signal: 'wetChecks', weight: 0.3, why: '' }, { signal: 'reservoir', weight: 0.5, why: '' }],
    tweak: 'more-water',
    sources: ['https://www.rhs.org.uk/advice/understanding-plants/how-plants-absorb-water', 'https://extension.missouri.edu/publications/g6510', 'https://extension.wsu.edu/jefferson/mg-home/tip-sheet-15-houseplants/', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://www.rhs.org.uk/plants/types/houseplants/growing-guide', 'https://ucanr.edu/blog/backyard-gardener/article/watering-your-houseplants', 'https://hgic.clemson.edu/factsheet/indoor-plants-watering/'],
  },
  'stale-water': {
    id: 'stale-water',
    waterOnly: true,
    title: 'Stale water or rotting roots',
    summary: 'Roots need oxygen, and in stale, still water they start to die and rot. Healthy roots are firm and creamy white.',
    check: ['Is the water cloudy, or do the roots smell bad?', 'Lift the plant out: are any roots brown, mushy or falling apart?', 'For LECA: is the water line above the bottom third of the roots?'],
    fix: ['Rinse the roots and the container, and refill with fresh room-temperature water.', 'Snip off mushy roots with clean scissors.', 'Swap the water every week, and straight away if it turns cloudy.', 'Keep the water line low in LECA so upper roots get air.', 'If most roots are gone, the plant may not survive: take a fresh cutting from a healthy stem.'],
    signals: [{ signal: 'reservoir', weight: 1.5, why: 'It grows in water or LECA, where stale water is the usual culprit.' }, { signal: 'hotSeason', weight: 1.3, why: 'Warm water goes stale faster.' }],
    rescue: true,
    sources: ['https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/small-scale-hydroponics', 'https://extension.illinois.edu/blogs/good-growing/2025-02-21-winter-gardening-propagating-houseplants-beat-winter-blues', 'https://extension.illinois.edu/news-releases/one-many-beginners-guide-plant-propagation', 'https://extension.illinois.edu/blogs/ilriverhort/2018-01-28-how-water-houseplants', 'https://www.rhs.org.uk/container-gardening/how-to-repot-a-plant', 'https://hort.extension.wisc.edu/articles/holiday-cactus/', 'https://www.rhs.org.uk/vegetables/hydroponics', 'https://extension.umn.edu/houseplants/propagating-monstera-deliciosa', 'https://ipm.ucanr.edu/home-and-landscape/houseplant-problems/', 'https://hort.extension.wisc.edu/articles/root-rots-houseplants/', 'https://hgic.clemson.edu/how-to-grow-and-care-for-lucky-bamboo-dracaena-sanderiana/'],
  },
  'low-water': {
    id: 'low-water',
    waterOnly: true,
    title: 'Water line too low',
    summary: 'The reservoir ran low, so the roots couldn’t reach the water.',
    check: ['Where is the water line compared with the roots?', 'Has it been a while since the last top-up?'],
    fix: ['Top up so the roots reach the water again. In plain water, keep the roots covered; in LECA, keep just the lower roots in water so the top ones get air.', 'Check the water line a little more often in warm weather.'],
    signals: [LATE, { signal: 'hotSeason', weight: 1.4, why: 'Reservoirs empty fast in the heat.' }],
    tweak: 'more-water',
    sources: ['https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/small-scale-hydroponics', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://hgic.clemson.edu/how-to-grow-and-care-for-lucky-bamboo-dracaena-sanderiana/'],
  },
  'low-light': {
    id: 'low-light',
    title: 'Not enough light',
    summary: 'The plant can’t make enough food, so it stretches towards the light and drops older leaves.',
    check: ['Is it more than about 3 m (10 ft) from a window, or in a dark corner? Light fades fast away from the glass.', 'Is new growth smaller, paler or further apart than old growth?', 'Is it leaning towards the window?'],
    fix: ['Move it closer to a bright window, especially in winter when the sun is weaker.', 'Turn the pot once a week so it grows evenly.', 'If no spot is bright enough, a grow light can make up for the missing daylight.'],
    signals: [{ signal: 'lowLight', weight: 2.5, why: 'Its spot is set to low light.' }, { signal: 'slowSeason', weight: 1.3, why: 'Days are short right now.' }, { signal: 'succulent', weight: 1.5, why: 'Succulents need lots of light.' }, { signal: 'directSun', weight: 0.3, why: '' }],
    sources: ['https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/lighting-for-indoor-plants', 'https://extension.missouri.edu/publications/g6515', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/houseplants/spring-houseplant-care', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://extension.illinois.edu/news-releases/keep-houseplants-happy-simple-solutions', 'https://extension.missouri.edu/publications/g6510'],
  },
  sunburn: {
    id: 'sunburn',
    title: 'Too much sun',
    summary: 'Strong direct sun has scorched the leaves. Burned patches won’t turn green again, but the plant usually recovers once it’s out of the strong sun.',
    check: ['Are there pale, washed-out or brown scorched patches, and does it get strong direct sun (like a sunny window in summer)?', 'Did you move it somewhere sunnier lately, or put it outside?'],
    fix: ['Move it back a little from the window, or use a sheer curtain.', 'Bring plants into the sun gradually over a week or two.', 'Trim leaves that are completely brown; keep ones that are still mostly green until new leaves grow.'],
    signals: [{ signal: 'directSun', weight: 2.5, why: 'Its spot gets direct sun.' }, { signal: 'shadeLover', weight: 1.8, why: 'It naturally grows in shade.' }, { signal: 'newPlant', weight: 1.3, why: 'It’s still getting used to your light.' }, { signal: 'hotSeason', weight: 1.3, why: 'Summer sun is strongest.' }, { signal: 'lowLight', weight: 0.2, why: '' }],
    sources: ['https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/lighting-for-indoor-plants', 'https://extension.missouri.edu/publications/g6510', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/houseplants/spring-houseplant-care'],
  },
  'dry-air': {
    id: 'dry-air',
    title: 'Dry air',
    summary: 'Indoor air, especially with the heating on, pulls moisture out of leaves faster than the roots replace it.',
    check: ['Is it near a heater, radiator or air vent?', 'Are the leaf tips and edges brown and crispy?'],
    fix: ['Move it away from heaters and vents.', 'Group plants together, or stand the pot on (not in) a tray of wet pebbles.', 'A bathroom or kitchen with a window is usually more humid.', 'Trim crispy tips with sharp scissors, following the leaf shape.'],
    signals: [{ signal: 'moistureLover', weight: 1.6, why: 'It likes humid air.' }, { signal: 'shadeLover', weight: 1.3, why: 'Thin-leaved shade plants feel dry air first.' }, { signal: 'slowSeason', weight: 1.3, why: 'Heating dries the air in the cold months.' }, { signal: 'indoor', weight: 1.2, why: '' }, { signal: 'succulent', weight: 0.2, why: '' }],
    sources: ['https://hort.extension.wisc.edu/keys-to-healthy-houseplants/', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://extension.missouri.edu/publications/g6510', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://ucanr.edu/site/uc-marin-master-gardeners/houseplant-care', 'https://ucanr.edu/blog/coastal-gardener/article/fiddle-leaf-fig-houseplant-proper-care'],
  },
  'tap-water': {
    id: 'tap-water',
    title: 'Salts and chlorine in tap water',
    summary: 'Some plants are sensitive to the chlorine and fluoride in tap water. Salts from water and fertiliser also build up in the pot and brown the leaf tips.',
    check: ['Do you see a white crust on the soil or the pot rim?', 'Are the tips brown even though the soil moisture is right?'],
    fix: ['Use rainwater, filtered water, or tap water left out overnight so the chlorine can escape.', 'Every 4 to 6 months, flush the pot: pour through about twice the pot’s volume of plain water, then let it drain.', 'Go easy on fertiliser.'],
    signals: [{ signal: 'tapSensitive', weight: 3.2, why: 'This plant is known for reacting to tap water.' }, { signal: 'oldMix', weight: 1.4, why: 'Salts build up in old mix.' }, { signal: 'reservoir', weight: 1.3, why: 'Salts concentrate in reservoirs as water evaporates.' }],
    sources: ['https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://extension.illinois.edu/news-releases/keep-houseplants-happy-simple-solutions', 'https://www.rhs.org.uk/plants/spider-plants/growing-guide', 'https://ucanr.edu/site/uc-marin-master-gardeners/houseplant-care'],
  },
  hungry: {
    id: 'hungry',
    title: 'Hungry',
    summary: 'The plant has used up the nutrients in its mix. Leaves turn pale yellow, starting with the older ones.',
    check: ['Are the leaves pale yellow-green all over, starting with the oldest ones?', 'When did you last feed it, or give it fresh mix?'],
    fix: ['Feed with a balanced fertiliser at half strength while it’s growing.', 'Repotting into fresh mix gives it new food too.', 'Don’t feed a wilted plant: water first, then feed once it has perked up.'],
    signals: [{ signal: 'unfed', weight: 1.6, why: 'No feed logged in a couple of months.' }, { signal: 'mixSpent', weight: 1.8, why: 'The food in its fresh mix has likely run out, and no feed is logged since.' }, { signal: 'freshMix', weight: 0.3, why: '' }, { signal: 'fedRecently', weight: 0.5, why: '' }, { signal: 'oldMix', weight: 1.7, why: 'Its mix is over a year old.' }, { signal: 'edible', weight: 1.5, why: 'Edibles are hungry growers.' }, { signal: 'fruiting', weight: 1.5, why: 'Making fruit takes a lot of food.' }, { signal: 'reservoir', weight: 1.3, why: 'Water and LECA plants need all their food from you.' }, { signal: 'slowSeason', weight: 0.7, why: '' }],
    sources: ['https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies', 'https://extension.missouri.edu/publications/g6510', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/houseplants/spring-houseplant-care'],
  },
  overfed: {
    id: 'overfed',
    title: 'Too much fertiliser',
    summary: 'Food added on top of a rich mix, or too often, leaves salts in the pot that burn the roots. Tips brown, leaves wilt even in wet soil, and a white crust can form.',
    check: ['Was it fed while its mix was still fresh, or more than once in a couple of weeks?', 'Is there a white crust on the soil or the pot rim?', 'Do the brown edges start at the tips of older leaves?'],
    fix: ['Flush the pot: run plenty of plain water through it, let it drain fully, and repeat once.', 'Skip feeding for a few weeks.', 'From then on, feed at half strength and only while it’s growing.'],
    signals: [{ signal: 'overFed', weight: 3, why: 'It’s been fed on top of fresh mix, or several times lately.' }, { signal: 'freshMix', weight: 1.6, why: 'Its fresh mix still carries plenty of food.' }, { signal: 'fedRecently', weight: 1.5, why: 'It was fed recently.' }, { signal: 'slowSeason', weight: 1.3, why: 'Slow winter growth uses little food, so it builds up.' }, { signal: 'unfed', weight: 0.2, why: '' }, { signal: 'mixSpent', weight: 0.4, why: '' }],
    sources: ['https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/'],
    reviewed: '2026-10',
    status: 'verified',
  },
  'too-much-nitrogen': {
    id: 'too-much-nitrogen',
    title: 'Too much nitrogen',
    summary: 'Lots of lush, dark leaves but few flowers or fruit. Rich mixes and general-purpose feeds push leaves at the expense of fruit.',
    check: ['Is the plant big and very green, with few flowers?', 'Is it being fed a general or leafy-greens feed rather than a tomato feed?'],
    fix: ['Switch to a tomato (high-potash) feed once flowers appear.', 'Hold off on general-purpose feed and extra compost.', 'Give it the brightest spot you have: low light also means leaves over fruit.'],
    signals: [{ signal: 'freshMix', weight: 1.6, why: 'Rich fresh mixes are high in nitrogen.' }, { signal: 'fedRecently', weight: 1.3, why: 'It’s been fed lately.' }, { signal: 'fruiting', weight: 1.4, why: '' }, { signal: 'lowLight', weight: 1.3, why: 'Low light also pushes leaves over fruit.' }],
    sources: ['https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/'],
    reviewed: '2026-10',
    status: 'verified',
  },
  magnesium: {
    id: 'magnesium',
    title: 'Short of magnesium',
    summary: 'The leaf yellows between the veins while the veins stay green, starting on older leaves. Common on tomatoes and peppers, especially when fed only a high-potash feed.',
    check: ['Do the veins stay green while the leaf between them yellows?', 'Is it the older, lower leaves first?'],
    fix: ['Use a feed that lists magnesium (Mg); many tomato feeds do.', 'Or add a magnesium supplement made for plants, following its label.', 'Keep watering even: dry roots take up less.'],
    signals: [{ signal: 'fruiting', weight: 1.8, why: 'Fruiting crops use a lot of magnesium.' }, { signal: 'edible', weight: 1.3, why: '' }, { signal: 'mixSpent', weight: 1.4, why: 'The food in its fresh mix has likely run out.' }, { signal: 'unfed', weight: 1.3, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.6, why: '' }],
    sources: ['https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies'],
    reviewed: '2026-10',
    status: 'verified',
  },
  potassium: {
    id: 'potassium',
    title: 'Short of potassium',
    summary: 'Older leaves yellow at the edges, then the edges brown and crisp. Fruit can ripen unevenly. Fruiting crops need lots of potassium once fruit sets.',
    check: ['Do the edges of older leaves yellow first, then brown?', 'Is it fruiting, and when did it last get a tomato feed?'],
    fix: ['Feed with a tomato (high-potash) feed at half strength.', 'Keep it up every 2 weeks while fruit is swelling.'],
    signals: [{ signal: 'fruiting', weight: 2, why: 'Swelling fruit takes a lot of potassium.' }, { signal: 'mixSpent', weight: 1.5, why: 'The food in its fresh mix has likely run out.' }, { signal: 'unfed', weight: 1.4, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.5, why: '' }, { signal: 'fedRecently', weight: 0.6, why: '' }],
    sources: ['https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies'],
    reviewed: '2026-10',
    status: 'verified',
  },
  'purple-cold': {
    id: 'purple-cold',
    title: 'Cold roots (short of phosphorus)',
    summary: 'A purple tinge, often under the leaves or along the veins. Cold roots can’t take up phosphorus, so it shows in cool spells, especially on young plants, more than from a lack of food.',
    check: ['Has it been cold at night, or is the pot against cold glass?', 'Is it mostly on the undersides and older leaves?'],
    fix: ['Move it away from cold glass, somewhere warmer at night.', 'Wait for warmer days before feeding much; it usually greens up by itself.', 'If it’s warm and still purple, give a general-purpose liquid feed at half strength.'],
    signals: [{ signal: 'slowSeason', weight: 1.8, why: 'It’s the cool season.' }, { signal: 'outdoor', weight: 1.3, why: 'Cold nights outside.' }, { signal: 'unfed', weight: 1.2, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.6, why: '' }],
    sources: ['https://ipm.ucanr.edu/home-and-landscape/phosphorus-deficiency/', 'https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies', 'https://extension.colostate.edu/resource/recognizing-common-tomato-pests-pathogens-and-problems/', 'https://extension.missouri.edu/publications/g6510', 'https://extension.illinois.edu/houseplants/care', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://hort.extension.wisc.edu/analyzing-reasons-for-yellow-leaves/'],
  },
  'heat-stress': {
    id: 'heat-stress',
    title: 'Too hot',
    summary: 'Leaves curl, flop or scorch when it’s very hot: a sunny window in summer, a hot balcony, or too close to a grow light.',
    check: ['Is it in strong midday or afternoon sun, or close under a lamp?', 'Does it perk up in the evening?'],
    fix: ['Give it shade in the hottest hours, or move it out of strong sun or further from the lamp.', 'Keep the soil moist but not soggy in hot spells.'],
    signals: [{ signal: 'hotSeason', weight: 2, why: 'It’s the hot season.' }, { signal: 'directSun', weight: 1.6, why: 'It sits in direct sun.' }, { signal: 'slowSeason', weight: 0.4, why: '' }],
    sources: ['https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://www.rhs.org.uk/prevention-protection/leaf-damage-on-houseplants', 'https://extension.oregonstate.edu/catalog/em-9556-heat-wave-garden-how-identify-prevent-heat-stress-plants', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/lighting-for-indoor-plants', 'https://extension.missouri.edu/news/dont-overwater-heat-stressed-plants'],
  },
  'old-leaves': {
    id: 'old-leaves',
    title: 'Just an old leaf',
    summary: 'Plants retire their oldest, lowest leaves now and then. One at a time, with healthy new growth, is nothing to worry about.',
    check: ['Is it only one or two of the oldest, lowest leaves?', 'Is new growth coming in green and healthy?'],
    fix: ['Let it yellow fully, then snip it off.', 'Nothing else to do.'],
    signals: [{ signal: 'wetChecks', weight: 0.7, why: '' }, { signal: 'dryChecks', weight: 0.7, why: '' }],
    sources: ['https://www.rhs.org.uk/prevention-protection/leaf-damage-on-houseplants', 'https://hort.extension.wisc.edu/analyzing-reasons-for-yellow-leaves/', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant'],
  },
  shock: {
    id: 'shock',
    title: 'Settling in',
    summary: 'Moving house, a new spot or a fresh pot is a shock. Plants often drop a few leaves for up to about three weeks while they adjust.',
    check: ['Did it move, get repotted, or come home recently?', 'Is new growth still appearing?'],
    fix: ['Pick a good spot and leave it there.', 'Water as normal, but don’t feed for a few weeks.', 'Be patient: leaf drop after a move usually stops within about three weeks.'],
    signals: [{ signal: 'recentRepot', weight: 3, why: 'It was repotted recently.' }, { signal: 'newPlant', weight: 3, why: 'It joined the family recently.' }],
    sources: ['https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/', 'https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://extension.missouri.edu/publications/g6510', 'https://hort.extension.wisc.edu/analyzing-reasons-for-yellow-leaves/'],
  },
  cold: {
    id: 'cold',
    title: 'Cold or draughts',
    summary: 'Tropical plants dislike nights below about 10 °C (50 °F) and cold draughts. Leaves can go dark, limp or drop.',
    check: ['Is it near a door, a draughty window, or touching cold glass?', 'Was it outside on a cold night?'],
    fix: ['Move it away from cold glass and doors.', 'Bring outdoor tropicals in before nights get cold.', 'Water less often while it’s cool and growth is slow.'],
    signals: [{ signal: 'slowSeason', weight: 2, why: 'It’s the cold season.' }, { signal: 'outdoor', weight: 1.5, why: 'It lives outside.' }, { signal: 'hotSeason', weight: 0.2, why: '' }],
    sources: ['https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/houseplants/spring-houseplant-care', 'https://www.rhs.org.uk/prevention-protection/leaf-damage-on-houseplants', 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', 'https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://extension.missouri.edu/publications/g6510', 'https://hgic.clemson.edu/factsheet/indoor-palms/', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/'],
  },
  'pot-bound': {
    id: 'pot-bound',
    soilOnly: true,
    title: 'Outgrown its pot',
    summary: 'The roots have filled the pot, so it dries out fast and runs out of food.',
    check: ['Are roots poking out of the drainage hole or showing on top of the soil?', 'Does the soil dry out much faster than it used to?'],
    fix: ['Repot into a pot about 2.5–5 cm (1–2 in) wider, with fresh mix.', 'Spring or early summer is the best time.'],
    signals: [{ signal: 'oldMix', weight: 2, why: 'It’s been in the same pot over a year.' }, { signal: 'smallPot', weight: 1.6, why: 'Its pot is small.' }, DRY, { signal: 'recentRepot', weight: 0.2, why: '' }],
    sources: ['https://hort.extension.wisc.edu/articles/houseplant-care/', 'https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://extension.illinois.edu/houseplants/repotting', 'https://extension.psu.edu/repotting-houseplants', 'https://www.rhs.org.uk/container-gardening/how-to-repot-a-plant', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/'],
  },
  'leaf-spot': {
    id: 'leaf-spot',
    title: 'Leaf spot (fungus or bacteria)',
    summary: 'Brown or black spots, often with a yellow edge or halo, usually come from a fungus or bacteria. They spread in splashing water and when leaves stay wet.',
    check: ['Do the spots have a yellow edge or halo?', 'Are the spots getting bigger or joining up?', 'Do the leaves stay wet after watering or rain?'],
    fix: ['Snip off spotted leaves and bin them (not the compost).', 'Water the soil, not the leaves, and water in the morning.', 'Give it more space and air flow.', 'Clean your scissors after cutting.'],
    signals: [WET, { signal: 'outdoor', weight: 1.4, why: 'Rain and dew keep outdoor leaves wet.' }, { signal: 'edible', weight: 1.2, why: '' }],
    sources: ['https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://ipm.ucanr.edu/PMG/PESTNOTES/pn74172.html', 'https://ipm.ucanr.edu/PMG/GARDEN/PLANTS/DISEASES/leafspotdis.html', 'https://www.rhs.org.uk/prevention-protection/leaf-damage-on-houseplants', 'https://hgic.clemson.edu/garden-sanitation/'],
  },
  'powdery-mildew': {
    id: 'powdery-mildew',
    title: 'Powdery mildew',
    summary: 'A fungus that looks like a dusting of flour on the leaves. Common on squash, zucchini, cucumbers and peas from mid to late summer.',
    check: ['Does the white powder wipe off with a finger?', 'Is it on older leaves first?'],
    fix: ['Remove the worst leaves.', 'Give plants more space and air.', 'Water at the base, not over the leaves, and water regularly in dry spells.', 'Next time, choose a variety that resists mildew.'],
    signals: [{ signal: 'edible', weight: 1.6, why: 'Squash, cucumbers and peas are prone to it.' }, { signal: 'fruiting', weight: 1.4, why: 'It shows up most late in the season.' }, { signal: 'outdoor', weight: 1.2, why: '' }],
    sources: ['https://extension.psu.edu/addressing-downy-mildew-and-powdery-mildew-in-the-home-garden', 'https://www.rhs.org.uk/disease/powdery-mildews', 'https://extension.umn.edu/disease-management/powdery-mildew-cucurbits', 'https://hort.extension.wisc.edu/articles/powdery-mildew-vegetables/', 'https://extension.illinois.edu/blogs/over-garden-fence/2020-08-31-why-are-some-plants-leaves-white-now'],
  },
  'spider-mites': {
    id: 'spider-mites',
    title: 'Spider mites',
    summary: 'Tiny mites that suck the leaves, leaving fine speckles and, later, thin webbing. They love warm, dry air.',
    check: ['Hold white paper under a leaf and tap it. Tiny moving dots?', 'Look under the leaves for fine webbing.'],
    fix: ['Rinse the whole plant in the shower or sink, especially under the leaves, and repeat several times.', 'Wipe the leaves with a damp cloth or paper towel.', 'Keep it away from other plants until clear.', 'Raise the humidity: they like dry air, though this alone won’t clear them.'],
    signals: [{ signal: 'indoor', weight: 1.2, why: '' }, { signal: 'slowSeason', weight: 1.3, why: 'Heated, dry air is their favourite.' }, { signal: 'hotSeason', weight: 1.3, why: 'They breed fast in heat.' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
    sources: ['https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://ipm.ucanr.edu/home-and-landscape/spider-mites/', 'https://extension.illinois.edu/blogs/good-growing/2022-01-14-houseplant-pests-and-how-manage-them', 'https://www.rhs.org.uk/biodiversity/indoor-plants-sap-feeding-insects'],
  },
  aphids: {
    id: 'aphids',
    title: 'Aphids',
    summary: 'Small green, black or white bugs that cluster on soft new growth and leave sticky honeydew behind.',
    check: ['Look at the tips and the undersides of new leaves for clusters of tiny bugs.', 'Are the leaves sticky or curling?', 'Ants walking up the stems are a giveaway.'],
    fix: ['Squash small groups or blast them off with water.', 'Snip off badly infested tips.', 'Outside, ladybirds and lacewings will eat them: avoid sprays that kill helpers.', 'Check twice a week and repeat when you find more.'],
    signals: [{ signal: 'edible', weight: 1.5, why: 'Aphids love soft edible growth.' }, { signal: 'outdoor', weight: 1.4, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
    sources: ['https://www.rhs.org.uk/biodiversity/aphids', 'https://ipm.ucanr.edu/home-and-landscape/aphids/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://www.rhs.org.uk/biodiversity/indoor-plants-sap-feeding-insects'],
  },
  mealybugs: {
    id: 'mealybugs',
    title: 'Mealybugs',
    summary: 'Slow bugs that look like little bits of cotton wool, hiding where leaves meet stems.',
    check: ['Look in leaf joints, under leaves and at the soil line for white fluff.', 'Is there sticky residue?'],
    fix: ['Pick them off with tweezers or a cotton bud.', 'Wipe the leaves with a damp cloth, then check often: numbers build again quickly if left.', 'Keep it away from other plants until clear.'],
    signals: [{ signal: 'succulent', weight: 1.4, why: 'Succulents and cacti are a favourite.' }, { signal: 'indoor', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
    sources: ['https://www.rhs.org.uk/biodiversity/mealybug', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://extension.illinois.edu/blogs/good-growing/2022-01-14-houseplant-pests-and-how-manage-them', 'https://www.rhs.org.uk/biodiversity/indoor-plants-sap-feeding-insects'],
  },
  scale: {
    id: 'scale',
    title: 'Scale insects',
    summary: 'Small brown bumps stuck to stems and leaf veins that don’t look like bugs at all. Many leave sticky honeydew.',
    check: ['Look along the stems and the main veins under the leaves: do little brown bumps scrape off with a fingernail?', 'Are the leaves or the floor below sticky?'],
    fix: ['Scrape them off with a fingernail or an old plastic card.', 'Wipe sticky or blackened leaves with a damp cloth.', 'Check again weekly and repeat as needed.'],
    signals: [{ signal: 'indoor', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
    sources: ['https://www.rhs.org.uk/biodiversity/scale-insects', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://extension.illinois.edu/blogs/good-growing/2022-01-14-houseplant-pests-and-how-manage-them', 'https://hort.extension.wisc.edu/articles/scale-insects/'],
  },
  whitefly: {
    id: 'whitefly',
    title: 'Whitefly',
    summary: 'Tiny white sap-sucking insects that fly up in a cloud when you brush the plant. Common on tomatoes and peppers, and on houseplants.',
    check: ['Brush the leaves: does a little cloud of white specks fly up?', 'Look under the leaves for the tiny, flat, oval young.'],
    fix: ['Hang a yellow sticky trap nearby.', 'Hose or rinse the leaves often, while numbers are still low.', 'Remove the worst leaves.'],
    signals: [{ signal: 'edible', weight: 1.6, why: 'Tomatoes and peppers are favourites.' }, { signal: 'hotSeason', weight: 1.3, why: '' }],
    sources: ['https://www.rhs.org.uk/biodiversity/glasshouse-whitefly', 'https://ipm.ucanr.edu/home-and-landscape/whiteflies/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants'],
  },
  thrips: {
    id: 'thrips',
    title: 'Thrips',
    summary: 'Tiny slim insects that scrape leaves, leaving silvery streaks and black specks.',
    check: ['Look for silvery, scratched-looking patches with tiny black dots.', 'Tap a leaf over white paper: tiny slivers that move?'],
    fix: ['Snip off badly damaged leaves: they won’t turn green again.', 'Blue or yellow sticky traps catch the adults.', 'Check it often, and keep it away from other plants.'],
    signals: [{ signal: 'indoor', weight: 1.1, why: '' }, { signal: 'hotSeason', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.3, why: 'You logged a pest check recently.' }],
    sources: ['https://www.rhs.org.uk/biodiversity/thrips', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://ipm.ucanr.edu/home-and-landscape/thrips/', 'https://www.rhs.org.uk/biodiversity/indoor-plants-sap-feeding-insects'],
  },
  'fungus-gnats': {
    id: 'fungus-gnats',
    soilOnly: true,
    title: 'Fungus gnats',
    summary: 'Tiny black flies that breed in wet soil. Annoying, mostly harmless to the plant, and a sign the soil stays wet.',
    check: ['Do little flies rise from the soil when you water?', 'Is the top of the soil always damp?'],
    fix: ['Let the top 2–3 cm dry out before you water: the larvae need damp soil.', 'Yellow sticky traps catch some adults, but won’t clear them on their own.', 'Water from the bottom for a few weeks.'],
    signals: [WET, SOGGY, { signal: 'indoor', weight: 1.2, why: '' }],
    tweak: 'slow-water',
    sources: ['https://hort.extension.wisc.edu/articles/fungus-gnats-on-houseplants/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants', 'https://extension.illinois.edu/blogs/good-growing/2022-01-14-houseplant-pests-and-how-manage-them', 'https://extension.oregonstate.edu/ask-extension/featured/i-have-fungus-gnats-everywhere-can-you-help', 'https://ipm.ucanr.edu/home-and-landscape/fungus-gnats/'],
  },
  'surface-mold': {
    id: 'surface-mold',
    soilOnly: true,
    title: 'Mould on the soil',
    summary: 'White fuzz on top of the soil is usually a fungus growing in the mix, not on the plant. It’s a sign the surface stays too wet.',
    check: ['Is it only on the surface, not on the stems?', 'Is the soil staying damp for days?'],
    fix: ['Let the top of the soil dry more between drinks; watering from the bottom keeps the surface drier.', 'More light and air flow keep it away.', 'A sprinkle of cinnamon on the surface helps.'],
    signals: [WET, SOGGY, { signal: 'lowLight', weight: 1.4, why: 'Low light keeps the surface damp.' }, SLOW, { signal: 'recentRepot', weight: 1.3, why: 'Fresh bagged mix often has a little mould.' }],
    tweak: 'slow-water',
    sources: ['https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', 'https://extension.wsu.edu/pnw-gardeners-handbook/chapter-14-houseplants/'],
  },
  'pests-chewing': {
    id: 'pests-chewing',
    title: 'Something is eating it',
    summary: 'Holes and ragged edges usually mean caterpillars, slugs or snails.',
    check: ['Look under the leaves for caterpillars, and around the plant at night with a torch for slugs and snails.', 'Is there a slime trail, or little droppings on the leaves?'],
    fix: ['Pick them off by hand.', 'Water in the morning rather than the evening: slugs get about on damp nights.', 'Fine netting that doesn’t touch the leaves keeps butterflies off cabbages and kale.'],
    signals: [{ signal: 'outdoor', weight: 2.5, why: 'It lives outside.' }, { signal: 'edible', weight: 1.5, why: 'Edibles are tasty to bugs too.' }, { signal: 'indoor', weight: 0.4, why: '' }],
    sources: ['https://www.rhs.org.uk/biodiversity/slugs-and-snails', 'https://www.rhs.org.uk/biodiversity/cabbage-caterpillars', 'https://extension.umn.edu/yard-and-garden-insects/slugs', 'https://extension.umn.edu/yard-and-garden-insects/caterpillars-cole-crops', 'https://hort.extension.wisc.edu/articles/imported-cabbageworm/'],
  },
  'blossom-end-rot': {
    id: 'blossom-end-rot',
    status: 'verified',
    reviewed: '2026-10',
    title: 'Blossom end rot',
    summary: 'A dark, sunken patch on the bottom of tomatoes, peppers or zucchini. It’s usually uneven watering that stops calcium reaching the fruit. A lack of calcium in the soil is rare.',
    check: ['Is the patch on the end opposite the stem?', 'Has the soil been swinging between bone dry and soaked?'],
    fix: ['Water deeply and regularly so the soil never dries right out.', 'Mulch the top of the soil to keep moisture even.', 'Pick off affected fruit: it won’t recover, but with steady watering new fruit is usually fine.'],
    signals: [DRY, LATE, { signal: 'hotSeason', weight: 1.4, why: 'Pots dry out fast in the heat.' }, { signal: 'smallPot', weight: 1.4, why: 'Small pots swing from wet to dry fast.' }, { signal: 'fruiting', weight: 1.5, why: '' }],
    tweak: 'more-water',
    sources: ['https://www.rhs.org.uk/problems/blossom-end-rot', 'https://ipm.ucanr.edu/home-and-landscape/blossom-end-rot/', 'https://hort.extension.wisc.edu/troubleshooting-tomato-problems/', 'https://extension.illinois.edu/news-releases/tomato-gardeners-beware-blossom-end-rot-can-be-prevented'],
  },
  'flower-drop': {
    id: 'flower-drop',
    title: 'Too hot, too dry or not pollinated',
    summary: 'Tomatoes, peppers and other edibles can drop their flowers when days or nights are very hot, the plant is thirsty, or the flowers aren’t pollinated.',
    check: ['Have days been above about 29 °C (85 °F), or nights above 21 °C (70 °F)?', 'Is it indoors, with no wind or bees to move the pollen?', 'Has the soil been drying out?'],
    fix: ['Keep the soil evenly moist, and keep watering through hot spells.', 'In a heatwave, a shade cloth over the plants keeps them cooler.', 'Indoors, lightly tap or shake tomato flowers when they’re fully open, or use a small brush.'],
    signals: [{ signal: 'hotSeason', weight: 1.8, why: 'It’s the hot season.' }, DRY, { signal: 'indoor', weight: 1.5, why: 'Indoors there are no bees to pollinate.' }, { signal: 'fruiting', weight: 1.3, why: '' }],
    sources: ['https://hgic.clemson.edu/why-did-my-tomatoes-stop-producing-fruit/', 'https://extension.umn.edu/yard-and-garden-news/heatwave-makes-vegetables-misbehave', 'https://www.rhs.org.uk/vegetables/peppers/grow-your-own', 'https://www.rhs.org.uk/vegetables/tomatoes/grow-your-own', 'https://extension.illinois.edu/node/21445', 'https://pueblo.extension.colostate.edu/hand-pollination/'],
  },
  splitting: {
    id: 'splitting',
    title: 'Uneven watering',
    summary: 'Fruit splits when a thirsty plant suddenly gets a lot of water, from you or from rain, and the fruit swells faster than its skin.',
    check: ['Did a dry spell end with heavy watering or rain?'],
    fix: ['Water regularly so the soil stays evenly moist. Pots dry out fast, so check them often.', 'If heavy rain is coming after a dry spell, pick nearly ripe fruit first.', 'Mulch to keep moisture even.'],
    signals: [DRY, LATE, { signal: 'outdoor', weight: 1.3, why: 'Rain after dry spells is a common trigger.' }],
    tweak: 'more-water',
    sources: ['https://extension.missouri.edu/news/conditions-are-right-now-for-cracking-splitting-tomatoes', 'https://extension.psu.edu/why-are-my-tomatoes-cracking-and-what-can-i-do-about-it', 'https://www.rhs.org.uk/problems/tomatoes-fruit-splitting-and-cracking'],
  },
  bolting: {
    id: 'bolting',
    title: 'Bolting (going to seed)',
    summary: 'Lettuce, spinach and herbs like basil shoot up flower stalks, often when days get long and hot. Leaves turn bitter afterwards.',
    check: ['Is a tall central stalk shooting up, maybe with buds?', 'Have days been long and warm?'],
    fix: ['Pinch out flower buds on herbs like basil to keep leaves coming.', 'For lettuce and spinach, pick what you can now, and re-sow regularly so there are always replacements.', 'Sow lettuce and spinach in spring and again from late summer into autumn, with light shade in the hottest part of the day.'],
    signals: [{ signal: 'edible', weight: 2, why: '' }, { signal: 'hotSeason', weight: 1.8, why: 'Long, hot days trigger it.' }, { signal: 'fruiting', weight: 1.3, why: 'It’s been growing a good while.' }],
    sources: ['https://ipm.ucanr.edu/PMG/GARDEN/VEGES/ENVIRON/bolting.html', 'https://hort.extension.wisc.edu/articles/growing-salad-greens-wisconsin/', 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/non-pest-issues-in-cool-season-crops', 'https://extension.umn.edu/vegetables/growing-basil', 'https://www.rhs.org.uk/herbs/basil/grow-your-own', 'https://www.rhs.org.uk/vegetables/lettuce/grow-your-own', 'https://www.rhs.org.uk/vegetables/spinach/grow-your-own'],
  },
};

export const SYMPTOMS: Symptom[] = [
  // Leaves
  { id: 'yellow-lower', area: 'leaves', label: 'Lower leaves turning yellow', hint: 'Older leaves near the bottom go yellow', causes: [{ cause: 'stale-water', prior: 3 }, { cause: 'overwatering', prior: 4 }, { cause: 'old-leaves', prior: 2.5 }, { cause: 'hungry', prior: 2 }, { cause: 'magnesium', prior: 0.8 }, { cause: 'potassium', prior: 0.8 }, { cause: 'low-light', prior: 1.5 }, { cause: 'underwatering', prior: 1.5 }, { cause: 'root-rot', prior: 1 }] },
  { id: 'yellow-pale', area: 'leaves', label: 'Pale or yellow all over', hint: 'New and old leaves look washed out', causes: [{ cause: 'hungry', prior: 3 }, { cause: 'low-light', prior: 2.5 }, { cause: 'overwatering', prior: 2 }, { cause: 'sunburn', prior: 1 }, { cause: 'spider-mites', prior: 1 }] },
  { id: 'brown-tips', area: 'leaves', label: 'Brown, crispy tips or edges', hint: 'Just the ends or edges dry out', causes: [{ cause: 'low-water', prior: 1.5 }, { cause: 'overfed', prior: 1.5 }, { cause: 'potassium', prior: 0.8 }, { cause: 'dry-air', prior: 3 }, { cause: 'underwatering', prior: 2.5 }, { cause: 'tap-water', prior: 2.5 }, { cause: 'overwatering', prior: 1 }, { cause: 'pot-bound', prior: 1 }] },
  { id: 'brown-spots', area: 'leaves', label: 'Brown or black spots', hint: 'Spots in the middle of the leaf', causes: [{ cause: 'leaf-spot', prior: 3 }, { cause: 'overwatering', prior: 2 }, { cause: 'sunburn', prior: 1.5 }, { cause: 'cold', prior: 1.2 }, { cause: 'root-rot', prior: 1 }] },
  { id: 'bleached', area: 'leaves', label: 'Pale, bleached or scorched patches', hint: 'Faded or crispy patches on the sunny side', causes: [{ cause: 'sunburn', prior: 4 }, { cause: 'heat-stress', prior: 1 }, { cause: 'underwatering', prior: 1.2 }, { cause: 'thrips', prior: 1 }] },
  { id: 'drooping', area: 'leaves', label: 'Drooping or wilting', hint: 'Leaves hang limp', causes: [{ cause: 'low-water', prior: 3 }, { cause: 'stale-water', prior: 2 }, { cause: 'underwatering', prior: 3.5 }, { cause: 'overwatering', prior: 2 }, { cause: 'root-rot', prior: 1.5 }, { cause: 'shock', prior: 1.5 }, { cause: 'cold', prior: 1 }, { cause: 'overfed', prior: 0.8 }, { cause: 'heat-stress', prior: 1 }] },
  { id: 'curling', area: 'leaves', label: 'Leaves curling', hint: 'Edges roll up or cup', causes: [{ cause: 'underwatering', prior: 2.5 }, { cause: 'heat-stress', prior: 1.5 }, { cause: 'sunburn', prior: 1.5 }, { cause: 'aphids', prior: 1.5 }, { cause: 'dry-air', prior: 1.5 }, { cause: 'spider-mites', prior: 1 }] },
  { id: 'dropping', area: 'leaves', label: 'Leaves falling off', hint: 'Healthy-looking leaves drop', causes: [{ cause: 'stale-water', prior: 1.5 }, { cause: 'shock', prior: 3 }, { cause: 'overwatering', prior: 2 }, { cause: 'underwatering', prior: 2 }, { cause: 'low-light', prior: 1.5 }, { cause: 'cold', prior: 1.5 }] },
  { id: 'yellow-veins', area: 'leaves', label: 'Yellow between the veins', hint: 'Veins stay green, the leaf between them yellows', causes: [{ cause: 'magnesium', prior: 4 }, { cause: 'hungry', prior: 2 }, { cause: 'overwatering', prior: 1 }, { cause: 'overfed', prior: 1 }, { cause: 'tap-water', prior: 0.8 }] },
  { id: 'purple-leaves', area: 'leaves', label: 'Purple tinge on leaves', hint: 'Undersides or veins go purplish', causes: [{ cause: 'purple-cold', prior: 4 }, { cause: 'hungry', prior: 1 }, { cause: 'sunburn', prior: 0.6 }] },
  { id: 'speckled', area: 'leaves', label: 'Tiny speckles or silvery streaks', hint: 'Dusty-looking dots or scratches', causes: [{ cause: 'spider-mites', prior: 3 }, { cause: 'thrips', prior: 2.5 }, { cause: 'sunburn', prior: 0.6 }] },
  { id: 'holes', area: 'leaves', label: 'Holes or chewed edges', hint: 'Bits missing from the leaves', causes: [{ cause: 'pests-chewing', prior: 4 }, { cause: 'leaf-spot', prior: 0.8 }] },
  { id: 'white-powder', area: 'leaves', label: 'White powder on leaves', hint: 'Looks like a dusting of flour', causes: [{ cause: 'powdery-mildew', prior: 4 }, { cause: 'mealybugs', prior: 1 }, { cause: 'tap-water', prior: 0.6 }] },
  // Stems & shape
  { id: 'leggy', area: 'stems', label: 'Tall, leggy and stretched', hint: 'Long gaps between small leaves', causes: [{ cause: 'low-light', prior: 5 }, { cause: 'hungry', prior: 0.8 }, { cause: 'bolting', prior: 1.2 }] },
  { id: 'mushy-stem', area: 'stems', label: 'Soft, mushy or black stem base', hint: 'Squishy where it meets the soil', waterHint: 'Squishy at the base', causes: [{ cause: 'stale-water', prior: 5 }, { cause: 'root-rot', prior: 5 }, { cause: 'overwatering', prior: 2 }, { cause: 'cold', prior: 1 }] },
  { id: 'no-growth', area: 'stems', label: 'Not growing at all', hint: 'No new leaves in months', causes: [{ cause: 'low-light', prior: 3 }, { cause: 'pot-bound', prior: 2 }, { cause: 'hungry', prior: 2 }, { cause: 'cold', prior: 1.5 }, { cause: 'root-rot', prior: 1 }] },
  { id: 'bolting', area: 'stems', label: 'Shooting up a flower stalk', hint: 'Greens or herbs going to seed', edibleOnly: true, causes: [{ cause: 'bolting', prior: 5 }] },
  // Soil
  { id: 'soil-fuzz', soilOnly: true, area: 'soil', label: 'White fuzz on the soil', hint: 'Cottony mould on top', causes: [{ cause: 'surface-mold', prior: 4 }, { cause: 'mealybugs', prior: 0.8 }, { cause: 'tap-water', prior: 0.8 }] },
  { id: 'soil-crust', area: 'soil', label: 'White crust on the soil or pot', hint: 'Hard, chalky layer', waterLabel: 'White crust on the LECA or container', causes: [{ cause: 'tap-water', prior: 4 }, { cause: 'overfed', prior: 2.5 }, { cause: 'hungry', prior: 0.5 }] },
  { id: 'soil-smell', area: 'soil', label: 'Soil smells bad or stays wet', hint: 'Sour or rotten smell', waterLabel: 'Water smells bad or looks cloudy', waterHint: 'Sour smell, slime or murky water', causes: [{ cause: 'stale-water', prior: 5 }, { cause: 'root-rot', prior: 3.5 }, { cause: 'overwatering', prior: 3 }] },
  { id: 'soil-dry', soilOnly: true, area: 'soil', label: 'Water runs straight through', hint: 'Soil shrinks from the pot sides', causes: [{ cause: 'underwatering', prior: 3 }, { cause: 'pot-bound', prior: 2.5 }] },
  // Bugs
  { id: 'tiny-flies', soilOnly: true, area: 'bugs', label: 'Tiny flies around the soil', hint: 'Little black flies when you water', causes: [{ cause: 'fungus-gnats', prior: 5 }, { cause: 'whitefly', prior: 1 }] },
  { id: 'webbing', area: 'bugs', label: 'Fine webbing', hint: 'Thin webs under leaves or at joints', causes: [{ cause: 'spider-mites', prior: 5 }] },
  { id: 'sticky', area: 'bugs', label: 'Sticky leaves', hint: 'Shiny, tacky spots on leaves or the floor', causes: [{ cause: 'aphids', prior: 3 }, { cause: 'scale', prior: 2.5 }, { cause: 'mealybugs', prior: 2 }, { cause: 'whitefly', prior: 1.5 }] },
  { id: 'cotton', area: 'bugs', label: 'White cottony bits', hint: 'Fluff in leaf joints', causes: [{ cause: 'mealybugs', prior: 5 }, { cause: 'surface-mold', prior: 0.5 }] },
  { id: 'clusters', area: 'bugs', label: 'Clusters of small bugs', hint: 'Green, black or white bugs on new growth', causes: [{ cause: 'aphids', prior: 4 }, { cause: 'whitefly', prior: 1.5 }, { cause: 'mealybugs', prior: 1 }] },
  { id: 'bumps', area: 'bugs', label: 'Brown bumps on stems', hint: 'Little shells stuck to stems and veins', causes: [{ cause: 'scale', prior: 5 }] },
  { id: 'white-flies', area: 'bugs', label: 'White specks fly up', hint: 'A little cloud when you brush it', causes: [{ cause: 'whitefly', prior: 5 }, { cause: 'fungus-gnats', prior: 0.6 }] },
  // Flowers & fruit
  { id: 'fruit-rot-end', area: 'fruit', label: 'Dark patch on the bottom of fruit', hint: 'Sunken spot opposite the stem', edibleOnly: true, causes: [{ cause: 'blossom-end-rot', prior: 5 }, { cause: 'leaf-spot', prior: 0.5 }] },
  { id: 'flower-drop', area: 'fruit', label: 'Flowers drop, no fruit', hint: 'Blooms fall off before fruit sets', edibleOnly: true, causes: [{ cause: 'flower-drop', prior: 4 }, { cause: 'underwatering', prior: 1.2 }, { cause: 'hungry', prior: 0.8 }, { cause: 'too-much-nitrogen', prior: 0.8 }] },
  { id: 'leafy-no-fruit', area: 'fruit', label: 'Lots of leaves, little fruit', hint: 'Big and green, but few flowers or fruit', edibleOnly: true, causes: [{ cause: 'too-much-nitrogen', prior: 4 }, { cause: 'low-light', prior: 2.5 }, { cause: 'flower-drop', prior: 1.5 }, { cause: 'hungry', prior: 0.5 }] },
  { id: 'fruit-split', area: 'fruit', label: 'Fruit splitting or cracking', hint: 'Skin cracks as it ripens', edibleOnly: true, causes: [{ cause: 'splitting', prior: 5 }] },
  { id: 'fruit-holes', area: 'fruit', label: 'Holes in fruit', hint: 'Something has been nibbling', edibleOnly: true, causes: [{ cause: 'pests-chewing', prior: 5 }] },
];

/** Species known to react to tap water (salts, chlorine, fluoride). */
export const TAP_SENSITIVE = new Set(['calathea', 'calathea-medallion', 'calathea-zebrina', 'calathea-white-fusion', 'calathea-ornata', 'calathea-crocata', 'calathea-network', 'maranta', 'stromanthe-triostar', 'ctenanthe', 'peacock-plant', 'rattlesnake-plant', 'dracaena-marginata', 'spider', 'peace-lily', 'venus-flytrap', 'pitcher-plant', 'tropical-pitcher-plant']);

/** Shade lovers that scorch in direct sun. */
export const SHADE_LOVERS = new Set(['calathea', 'maranta', 'peace-lily', 'boston-fern', 'maidenhair-fern', 'birds-nest-fern', 'kimberly-queen-fern', 'heart-fern', 'aglaonema', 'nerve-plant', 'african-violet', 'phalaenopsis', 'parlor-palm', 'zz', 'cast-iron-plant']);

/**
 * Species notes waiting for verification (docs/knowledge.md): kept here, never shown, until the pipeline
 * moves them into SPECIES_NOTES.
 */
export const SPECIES_NOTES_DRAFT: Record<string, Partial<Record<string, string>>> = {};

/** Short species notes that sharpen a symptom, shown above the causes. */
export const SPECIES_NOTES: Record<string, Partial<Record<string, string>>> = {
  fig: { dropping: 'Fiddle-leaf figs famously drop leaves after being moved, even a little. Pick a bright spot and leave it there.', 'brown-spots': 'Brown patches in the middle of fiddle-leaf leaves usually mean the roots stayed wet.' },
  calathea: { 'brown-tips': 'Calatheas are very sensitive to tap water. Rain or filtered water fixes most crispy edges.', curling: 'Calathea leaves curl when the air or soil is too dry.' },
  maranta: { 'brown-tips': 'Prayer plants dislike tap water. Rain or filtered water helps.' },
  'peace-lily': { drooping: 'Peace lilies flop dramatically when thirsty and perk up within hours of a drink.' },
  'heart-fern': { curling: 'Heart fern leaves curl up when the air or soil gets too dry, then flatten again after a drink.' },
  'boston-fern': { 'brown-tips': 'Ferns crisp up quickly in dry air. A bathroom or a pebble tray helps a lot.', dropping: 'Ferns shed little leaflets when they dry out even once.' },
  'maidenhair-fern': { 'brown-tips': 'Maidenhair never forgives drying out. Snip crispy fronds; new ones will follow if the soil stays lightly damp.' },
  snake: { 'mushy-stem': 'Snake plants rot from too much water far more often than anything else. Let them dry right out.' },
  zz: { 'yellow-lower': 'ZZ plants yellow when kept wet. They store water in their roots and like to dry out fully.' },
  pothos: { 'yellow-lower': 'Pothos often yellow one old leaf at a time when overwatered.' },
  monstera: { 'brown-spots': 'Brown patches with yellow edges on monstera usually point to wet roots.' },
  'string-of-pearls': { drooping: 'Shrivelled, flat pearls mean thirst; mushy, see-through ones mean too much water.' },
  tomato: { 'yellow-lower': 'Tomatoes often yellow at the bottom as they grow. Snip off the lowest leaves to keep air moving.', curling: 'Tomato leaves often curl in heat or wind. If new growth looks healthy, it’s fine.' },
  basil: { bolting: 'Pinch off basil flower buds as soon as you see them to keep the leaves coming.' },
  zucchini: { 'white-powder': 'Almost every zucchini gets powdery mildew late in summer. It rarely stops the harvest.' },
  cucumber: { 'white-powder': 'Cucumbers are prone to powdery mildew. Give them space and water at the base.' },
  lettuce: { bolting: 'Lettuce bolts in long, hot days. Harvest now and sow again in a shadier spot.' },
};
