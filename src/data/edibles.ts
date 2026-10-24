import type { ClimateModel, EdibleStage, SpeciesId } from '../types';

/*
 * Grow patch knowledge for edibles. Facts come from docs/research/notes/edible_container_growing.md
 * and soil_and_seattle.md (RHS, WSU King County, OSU, UMN, UMD, CSU extension guidance). Accra timing
 * is partly inferred in those notes (no MoFA month calendar exists online), so its wording stays gentle.
 *
 * The wider crop list (greens, roots, beans, cucurbits, herbs, fruit) adds:
 * - Seattle autumn dates from WSU Extension's "Fall and winter vegetable gardens for western Washington"
 *   (garlic late Oct–Nov 10, shallots/chives late Oct–early Nov, fava early-mid Nov, peas early Nov or
 *   mid-July, bush beans by late July, pole beans by July 1, kale seeded in July, spinach Aug/Sep, carrots
 *   mid-July, leaf lettuce to mid-August, early radishes to mid-September) and WSU's garlic fact sheet
 *   (plant tops 5 cm deep, mulch, side-dress late April–May, lift when the lower third of leaves yellow).
 * - Seattle spring timing from OSU Extension's soil-temperature rule: cool crops (peas, lettuce, rocket,
 *   radish, carrots, kale, chard) once soil is ~10°C (March–April here), warm crops (beans, cucumbers,
 *   squash, basil) once it's ~16°C (late May–June). Frost dates per WSU King County tip sheet 5.
 * - Fruit-set temperatures: beans drop flowers in heat above ~32°C (U. Arizona / UMD) and sulk in cold
 *   nights; cucurbits are chilling-sensitive below ~10°C; eggplant follows the pepper limits.
 *   The bean/cucurbit night limits are rounded rules of thumb, not extension-published thresholds.
 */

/** Catalogue id of an edible with a grow guide (see src/data/catalog/edibles.ts). */
export type EdibleId = SpeciesId;
export type HarvestUnit = 'fruit' | 'handful' | 'bunch' | 'bulb' | 'grams';

export const HARVEST_UNITS: HarvestUnit[] = ['fruit', 'handful', 'bunch', 'bulb', 'grams'];

export interface StageInfo {
  /** Short label for the stage track (fits under a 30px dot). */
  label: string;
  /** One warm line about what's going on. */
  tip: string;
  /** What to feed during this stage. */
  feed: string;
}

/** Months (0 = Jan, inclusive) a crop is fed when it lives outside in Seattle, ending on `toDay` of `to`. */
export interface FeedWindow {
  from: number;
  to: number;
  toDay?: number;
}

export interface EdibleGuide {
  id: EdibleId;
  /** Stages that apply, in growing order. */
  stages: EdibleStage[];
  info: Partial<Record<EdibleStage, StageInfo>>;
  /** Default unit on the harvest sheet. */
  unit: HarvestUnit;
  /** Cut-and-come-again: regrows from the base after a cut (spring onions, lettuce, chives...). */
  regrows: boolean;
  /** Night low (°C) below which flowers drop / fruit won't set. */
  setNightMinC?: number;
  /** Day high (°C) above which flowers drop. */
  setDayMaxC?: number;
  /** Fruiting crop: switch to a high-potash feed once fruit swells (adds the "High-potash feed" task). */
  fruitingFeed?: boolean;
  /** Flowers need a hand on a bee-poor balcony: 'shake' (self-fertile, e.g. tomato) or 'brush' (male → female, e.g. squash). */
  pollinate?: 'shake' | 'brush';
  /** Seattle, outside: only fed in this window. Without one, the houseplant winter pause applies. */
  seattleOutdoorFeed?: FeedWindow;
}

const SEED: StageInfo = { label: 'Sow', tip: 'Seeds tucked in. Keep the mix warm and just damp.', feed: 'No feed yet' };
const NO_FEED = 'No feed';
const LIGHT = 'Light balanced feed monthly';
const BALANCED = 'Balanced feed every 2–3 weeks';
const LEAFY = 'Nitrogen-rich liquid feed every 2 weeks';
const POTASH = 'High-potash feed every 10–14 days';
const LEAN = 'Rarely: a light feed in spring is plenty';

/** Seattle balcony fruiting crops: fed May to mid-August, then left to ripen (WSU / soil_and_seattle). */
const SUMMER_FRUIT: FeedWindow = { from: 4, to: 7, toDay: 15 };
/** Cucurbits keep cropping into September, so they're fed to the end of August. */
const SUMMER_VINES: FeedWindow = { from: 4, to: 7 };

/** Leafy annuals: sow → sprout → grow → pick → bolt. */
function greens(id: EdibleId, sow: string, grow: string, pick: string, bolt: string, regrows: boolean, unit: HarvestUnit = 'handful'): EdibleGuide {
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'resting'],
    unit,
    regrows,
    info: {
      seed: { ...SEED, tip: sow },
      seedling: { label: 'Sprout', tip: 'Thin to the strongest seedlings; eat the thinnings.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: grow, feed: LEAFY },
      harvesting: { label: 'Pick', tip: pick, feed: LEAFY },
      resting: { label: 'Bolt', tip: bolt, feed: NO_FEED },
    },
  };
}

/** Perennial herbs from a plant or cutting: settle → grow → pick → flower → rest. */
function perennialHerb(id: EdibleId, grow: string, pick: string, flower: string, rest: string, feed = LEAN, unit: HarvestUnit = 'handful'): EdibleGuide {
  return {
    id,
    stages: ['seedling', 'growing', 'harvesting', 'flowering', 'resting'],
    unit,
    regrows: false,
    info: {
      seedling: { label: 'Settle', tip: 'A new plant or rooted cutting. Water it in, then let it settle.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: grow, feed },
      harvesting: { label: 'Pick', tip: pick, feed },
      flowering: { label: 'Flower', tip: flower, feed },
      resting: { label: 'Rest', tip: rest, feed: NO_FEED },
    },
  };
}

/** Annual herbs from seed: sow → sprout → grow → pick → flower. */
function annualHerb(id: EdibleId, sow: string, grow: string, pick: string, flower: string, regrows: boolean, unit: HarvestUnit = 'bunch'): EdibleGuide {
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'flowering'],
    unit,
    regrows,
    info: {
      seed: { ...SEED, tip: sow },
      seedling: { label: 'Sprout', tip: 'Bright light so it doesn’t stretch. Keep it evenly moist.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: grow, feed: LIGHT },
      harvesting: { label: 'Pick', tip: pick, feed: LIGHT },
      flowering: { label: 'Flower', tip: flower, feed: NO_FEED },
    },
  };
}

/** Roots sown in place: sow → sprout → grow → pull. */
function roots(id: EdibleId, sow: string, seedling: string, grow: string, pick: string): EdibleGuide {
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'harvesting'],
    unit: 'bunch',
    regrows: false,
    info: {
      seed: { ...SEED, tip: sow },
      seedling: { label: 'Thin', tip: seedling, feed: 'No feed yet' },
      growing: { label: 'Grow', tip: grow, feed: 'Low-nitrogen feed monthly' },
      harvesting: { label: 'Pull', tip: pick, feed: NO_FEED },
    },
  };
}

/** Warm-season pods: sow → sprout → climb → flower → pods → pick → done. */
function beans(id: EdibleId, sow: string, grow: string, setDayMaxC: number): EdibleGuide {
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    setNightMinC: 10, // cold nights (<50°F) stall flowering and set
    setDayMaxC,
    info: {
      seed: { ...SEED, tip: sow },
      seedling: { label: 'Sprout', tip: 'Watch for slugs: they love bean seedlings. Water the soil, not leaves.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: grow, feed: 'Light feed only: beans make their own nitrogen' },
      flowering: { label: 'Flower', tip: 'Keep watering even now. Dry roots or hot days drop the flowers.', feed: 'Light balanced feed' },
      harvesting: { label: 'Pick', tip: 'Pick every 2–3 days, young and snappy. Missed pods stop the plant.', feed: 'Light balanced feed' },
      resting: { label: 'Done', tip: 'Season’s over. Cut the stems and leave the roots: they feed the mix.', feed: NO_FEED },
    },
  };
}

/** Cucurbits: sow → sprout → vine → flower → fruit → pick → done. Hand-pollinated on balconies. */
function cucurbit(id: EdibleId, sow: string, grow: string, pick: string): EdibleGuide {
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 10, // chilling-sensitive below ~50°F
    setDayMaxC: 32,
    fruitingFeed: true,
    pollinate: 'brush',
    seattleOutdoorFeed: SUMMER_VINES,
    info: {
      seed: { ...SEED, tip: sow },
      seedling: { label: 'Sprout', tip: 'Warm and bright. Pot up gently: they hate root disturbance.', feed: 'No feed yet' },
      growing: { label: 'Vine', tip: grow, feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Males come first; females have a tiny fruit behind the petals.', feed: BALANCED },
      fruiting: { label: 'Fruit', tip: 'Fruit swelling! Water deeply and evenly; pots can need it daily.', feed: POTASH },
      harvesting: { label: 'Pick', tip: pick, feed: POTASH },
      resting: { label: 'Done', tip: 'Season’s over. Mildewed leaves go in the bin, not the compost.', feed: NO_FEED },
    },
  };
}

/** Pepper-like nightshades: sow → sprout → grow → flower → fruit → pick → done. */
function nightshade(id: EdibleId, over: Partial<Record<EdibleStage, Partial<StageInfo>>>, extra: Partial<EdibleGuide> = {}): EdibleGuide {
  const base: Partial<Record<EdibleStage, StageInfo>> = {
    seed: { ...SEED, tip: 'Likes it hot to sprout: a heat mat at 25–30°C helps. Can take 2–3 weeks.' },
    seedling: { label: 'Sprout', tip: 'Bright light, warm feet. Pot on at 4–6 true leaves.', feed: 'Dilute balanced feed once true leaves show' },
    growing: { label: 'Grow', tip: 'Out only when nights stay above 10°C. Stake it before it flops.', feed: 'Balanced feed, easy on nitrogen' },
    flowering: { label: 'Flower', tip: 'Tap or buzz the flowers at midday. Cold nights drop them.', feed: 'Balanced feed, easy on nitrogen' },
    fruiting: { label: 'Fruit', tip: 'Fruit swelling! Keep watering even.', feed: POTASH },
    harvesting: { label: 'Pick', tip: 'Pick while glossy, with secateurs. Picking keeps it flowering.', feed: POTASH },
    resting: { label: 'Done', tip: 'Season’s over. Compost healthy plants and refresh the mix.', feed: NO_FEED },
  };
  const info: Partial<Record<EdibleStage, StageInfo>> = {};
  for (const s of Object.keys(base) as EdibleStage[]) info[s] = { ...base[s]!, ...over[s] };
  return {
    id,
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 15.5, // 60°F, as peppers (UMN)
    setDayMaxC: 35, // 95°F
    fruitingFeed: true,
    pollinate: 'shake',
    seattleOutdoorFeed: SUMMER_FRUIT,
    info,
    ...extra,
  };
}

const GUIDES: EdibleGuide[] = [
  // Any edible not in the catalogue ("Something tasty") gets a simple sow → grow → pick track.
  {
    id: 'other-edible',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: SEED,
      seedling: { label: 'Sprout', tip: 'Give seedlings your brightest spot so they don’t stretch.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Water when the top few cm are dry; more often in warm spells.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Flowers mean fruit or seed is coming. Keep watering even.', feed: BALANCED },
      harvesting: { label: 'Pick', tip: 'Pick little and often. Log every harvest!', feed: BALANCED },
      resting: { label: 'Done', tip: 'Season’s over. Compost healthy plants and refresh the mix.', feed: NO_FEED },
    },
  },
  {
    id: 'tomato',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 13, // 55°F (UF IFAS, MSU, UMD)
    setDayMaxC: 32, // ~90°F (OSU 92°F; CSIR Ghana 32°C)
    fruitingFeed: true,
    pollinate: 'shake',
    seattleOutdoorFeed: SUMMER_FRUIT,
    info: {
      seed: { ...SEED, tip: 'Needs about 18°C to sprout, usually within two weeks.' },
      seedling: { label: 'Sprout', tip: 'Max light now so it doesn’t get leggy. Pot up at two true leaves.', feed: 'Dilute balanced feed once true leaves show' },
      growing: { label: 'Grow', tip: 'Bury the stem deep when you pot on. Stake it early.', feed: 'Balanced feed, easy on nitrogen' },
      flowering: { label: 'Flower', tip: 'Tap or buzz the flower trusses at midday every 2–3 days.', feed: 'Balanced feed, easy on nitrogen' },
      fruiting: { label: 'Fruit', tip: 'Fruit swelling! Keep watering even so they don’t split.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Pick when fully coloured. Green ones ripen indoors in ~2 weeks.', feed: POTASH },
      resting: { label: 'Done', tip: 'Season’s over. Compost healthy vines; bin blighted ones.', feed: NO_FEED },
    },
  },
  {
    id: 'pepper',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 15.5, // 60°F (UMD, UMN)
    setDayMaxC: 35, // 95°F
    fruitingFeed: true,
    pollinate: 'shake',
    seattleOutdoorFeed: SUMMER_FRUIT,
    info: {
      seed: { ...SEED, tip: 'Peppers like it hot to sprout: a heat mat at 27–32°C helps. Can take 3 weeks.' },
      seedling: { label: 'Sprout', tip: 'Bright light, warm feet. Ready to move at 5–6 leaves.', feed: 'Dilute balanced feed once true leaves show' },
      growing: { label: 'Grow', tip: 'Out only when nights stay above 10°C. A 3–5 gal pot is plenty.', feed: 'Balanced feed. Too much nitrogen means leaves, no peppers' },
      flowering: { label: 'Flower', tip: 'Flowers drop when nights dip under 15°C. It’s the weather, not you.', feed: 'Balanced feed, easy on nitrogen' },
      fruiting: { label: 'Fruit', tip: 'Pods swelling. Even watering keeps blossom-end rot away.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Pick green or wait for colour. Picking keeps the flowers coming.', feed: POTASH },
      resting: { label: 'Winter', tip: 'Overwintering in a bright ~13°C spot. Water every ~2 weeks.', feed: 'No feed till spring' },
    },
  },
  nightshade(
    'bell-pepper',
    {
      seed: { tip: 'Bells like it hot to sprout: a heat mat at 27–32°C helps. Can take 2–3 weeks.' },
      seedling: { tip: 'Bright light, warm feet. Pot on at 4–6 true leaves.' },
      growing: { tip: 'Out only when nights stay above 10°C. A 5 gal pot and a stake: heavy fruit snaps branches.', feed: 'Balanced feed. Too much nitrogen means leaves, no peppers' },
      flowering: { tip: 'Flowers drop when nights dip under 15°C or days top 32°C. It’s the weather, not you.' },
      fruiting: { tip: 'Bells sizing up. Even watering keeps blossom-end rot away.' },
      harvesting: { tip: 'Pick green when full-size and firm, or wait 2–3 weeks for red, yellow or orange. Cut, don’t pull.' },
    },
    { setDayMaxC: 32 }, // 90°F: bells drop flowers sooner than hot types
  ),
  {
    id: 'spring-onion',
    stages: ['seed', 'seedling', 'growing', 'harvesting'],
    unit: 'bunch',
    regrows: true,
    info: {
      seed: { ...SEED, tip: 'Sow a pinch per spot, ½ cm deep. Or root a store-bought base in water.' },
      seedling: { label: 'Sprout', tip: 'Thin green threads. Keep the pot evenly moist.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Growing back. Scraps regrow in about a week.', feed: LIGHT },
      harvesting: { label: 'Snip', tip: 'Cut 2–3 cm above the white base and it’ll grow back.', feed: LIGHT },
    },
  },
  {
    id: 'basil',
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'flowering'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Basil loves warmth. Sow indoors and keep it cosy.' },
      seedling: { label: 'Sprout', tip: 'Sunniest window you have. Water the soil, not the leaves.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Pinch the top above a leaf pair to make it bushy.', feed: BALANCED },
      harvesting: { label: 'Pick', tip: 'Pick from the top, often. It grows back bushier.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Flowers make leaves bitter. Pinch them off to keep it going.', feed: BALANCED },
    },
  },
  {
    id: 'mint',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      seedling: { label: 'Root', tip: 'A fresh cutting or division. Keep it moist while it settles.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Give it its own pot. Mint wanders.', feed: LIGHT },
      harvesting: { label: 'Pick', tip: 'Snip stems often. The more you pick, the more it grows.', feed: LIGHT },
      resting: { label: 'Rest', tip: 'Died back for winter. Cut old stems; it returns in spring.', feed: NO_FEED },
    },
  },

  // Leafy greens ---------------------------------------------------------------------------------
  greens('lettuce', 'Sow thinly on the surface; lettuce needs light to sprout and stalls above ~24°C.', 'Even moisture keeps leaves sweet. Light afternoon shade in summer.', 'Pick outer leaves, or cut 3 cm above the base: it regrows 2–3 times.', 'A tall stem means it’s bolting and turning bitter. Pull it and resow.', true),
  {
    id: 'kale',
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'flowering'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Sow ½–1 cm deep in a tray or straight in the pot. Sprouts in about a week.' },
      seedling: { label: 'Sprout', tip: 'Keep one strong seedling per pot. Net it if cabbage whites visit.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Needs a deep pot (25 cm+) and steady water. Check leaf undersides.', feed: LEAFY },
      harvesting: { label: 'Pick', tip: 'Snap off the lowest leaves; leave the top 6–8 growing. Frost sweetens it.', feed: LEAFY },
      flowering: { label: 'Bolt', tip: 'Spring flower shoots are tasty “kale raab”. Eat them, then compost.', feed: NO_FEED },
    },
  },
  greens('chard', 'Each knobbly “seed” is a cluster: thin to one strong seedling per spot.', 'Big, colourful stems coming. It handles light shade and cool weather.', 'Twist off outer stalks at the base; the centre keeps producing.', 'Second-spring flower stalk: leaves toughen. Time for a fresh plant.', false, 'bunch'),
  greens('spinach', 'Sow 1 cm deep in cool weather. It sprouts poorly above ~24°C.', 'Keep it cool and moist. Long, hot days push it to bolt.', 'Cut outer leaves, or cut baby leaves 3 cm up and let them regrow.', 'Bolting: leaves go narrow and bitter. Pull it and resow in late summer.', true),
  greens('arugula', 'Scatter thinly, barely cover. Sprouts in days.', 'Fast! Ready in about four weeks. Flea-beetle holes are cosmetic.', 'Cut leaves 3 cm above the base and it regrows.', 'White flowers are edible and peppery. Resow for new leaves.', true),
  greens('bok-choy', 'Sow 1 cm deep in spring or late summer. Long hot days make it bolt.', 'Even water keeps it crisp. Watch for slugs and caterpillars.', 'Pick outer leaves, or cut the head 3 cm up and it resprouts.', 'Yellow flowers mean it’s done. Flower buds are edible; then resow.', true, 'bunch'),
  greens('mustard-greens', 'Sow ½ cm deep. Fine from spring to early autumn.', 'Tough and fast. Heat makes it spicier, cold makes it sweeter.', 'Pick outer leaves young for salads, bigger ones for cooking.', 'Flowering: leaves get hot and tough. Pull it and resow.', false),
  {
    id: 'microgreens',
    stages: ['seed', 'seedling', 'harvesting'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Sow thickly on damp mix, press in, cover for 2–3 days in the dark.' },
      seedling: { label: 'Sprout', tip: 'Uncover into bright light. Water from below so stems stay dry.', feed: 'No feed needed' },
      harvesting: { label: 'Snip', tip: 'Cut just above the mix at 5–8 cm, usually 10–14 days in. Then resow.', feed: 'No feed needed' },
    },
  },

  // Pods and vines -------------------------------------------------------------------------------
  beans('bush-bean', 'Sow 3 cm deep in warm soil (16°C+). Cold, wet soil rots the seed.', 'Bushy and compact: no trellis needed. Mulch to keep roots evenly moist.', 32),
  beans('runner-bean', 'Sow 5 cm deep in warm soil, at the base of a tall trellis or wigwam.', 'Twine new shoots around the canes. They’ll race to the top.', 29),
  {
    id: 'pea',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    setDayMaxC: 29, // peas stop setting in hot spells (~85°F)
    info: {
      seed: { ...SEED, tip: 'Sow 3 cm deep in cool soil. Put the netting up first. Mice and slugs love peas.' },
      seedling: { label: 'Sprout', tip: 'Guide tendrils onto the netting. Pinched tips are tasty pea shoots.', feed: 'No feed yet' },
      growing: { label: 'Climb', tip: 'Cool weather is pea weather. Keep the pot moist, never soggy.', feed: 'Light feed only: peas make their own nitrogen' },
      flowering: { label: 'Flower', tip: 'Pods form in about 3 weeks. Don’t let the pot dry out now.', feed: 'Light balanced feed' },
      harvesting: { label: 'Pick', tip: 'Pick every couple of days. Missed pods tell the plant to stop.', feed: 'Light balanced feed' },
      resting: { label: 'Done', tip: 'Heat ends the pea season. Cut the vines; leave roots in the mix.', feed: NO_FEED },
    },
  },
  {
    id: 'fava-bean',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Sow 5 cm deep in autumn or late winter. Hardy, slow and steady.' },
      seedling: { label: 'Sprout', tip: 'It sits quietly through winter. Keep the pot out of standing water.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Stake tall types. Black aphids on the tips? Pinch the tips off.', feed: 'Light feed only: beans make their own nitrogen' },
      flowering: { label: 'Flower', tip: 'Scented black-and-white flowers. Pinch the tips once the first pods set.', feed: 'Light balanced feed' },
      harvesting: { label: 'Pick', tip: 'Pick when beans bulge in the pod. Tiny pods can be eaten whole.', feed: 'Light balanced feed' },
      resting: { label: 'Done', tip: 'Cut stems at soil level; the roots leave nitrogen behind.', feed: NO_FEED },
    },
  },
  cucurbit('cucumber', 'Sow 2 cm deep, one per small pot, at 20°C+. Sprouts in about a week.', 'Train it up a trellis. Even watering stops bitter fruit.', 'Pick before they yellow, every couple of days. Big ones slow it down.'),
  cucurbit('zucchini', 'Sow 2 cm deep, seed on its edge, one per pot at 20°C+.', 'One plant per 15+ gal pot. Water at the base to dodge mildew.', 'Pick at 15–20 cm, daily in peak season. Flowers are edible too.'),

  // Fruiting veg ---------------------------------------------------------------------------------
  nightshade('eggplant', {
    growing: { tip: 'Needs more heat than tomatoes: the warmest, most sheltered spot you have.' },
    harvesting: { tip: 'Pick while glossy. Dull skin means seedy and bitter.' },
  }),
  nightshade('garden-egg', {
    seed: { tip: 'Nursery tray at 25–30°C. Sprouts in 1–2 weeks.' },
    harvesting: { tip: 'Pick firm and glossy, white or green. It keeps cropping for months.' },
    resting: { label: 'Rest', tip: 'Cut back by a third and it can crop again. In Seattle, overwinter inside.' },
  }),
  {
    id: 'okra',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Soak seed overnight, sow 2 cm deep at 24°C+. Okra sulks in the cold.' },
      seedling: { label: 'Sprout', tip: 'Full sun and warmth. One plant per 5 gal pot.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Water deeply and let the top dry a little between drinks.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Hibiscus-like flowers last a day; pods follow within a week.', feed: BALANCED },
      harvesting: { label: 'Pick', tip: 'Pick pods at 7–10 cm every 2 days, before they go woody.', feed: BALANCED },
      resting: { label: 'Done', tip: 'Pods slow down. Save a few dried pods for seed.', feed: NO_FEED },
    },
  },

  // Roots, bulbs and tubers ----------------------------------------------------------------------
  roots('carrot', 'Sow thinly, ½ cm deep, and keep the surface damp until they sprout (2–3 weeks).', 'Thin to 5 cm apart, or the roots stay tiny. Carrot fly stays low: a tall pot helps.', 'Keep the pot evenly moist so roots don’t split.', 'Pull when the shoulders are 2 cm across. Water first so they slide out.'),
  roots('radish', 'Sow 1 cm deep, 3 cm apart. Up in days.', 'Thin to 3–5 cm apart. Crowded radishes make leaves, not roots.', 'Quick and thirsty: dry spells make them hot and woody.', 'Pull at marble-to-ping-pong size, around four weeks. Sow more now.'),
  {
    id: 'garlic',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'bulb',
    regrows: false,
    seattleOutdoorFeed: { from: 2, to: 4 }, // WSU: side-dress late April–May, stop once bulbs swell
    info: {
      seed: { label: 'Plant', tip: 'Cloves pointy end up, tops 5 cm deep, 10 cm apart. Mulch the pot.', feed: 'No feed yet' },
      seedling: { label: 'Shoots', tip: 'Green shoots over winter are normal. Keep the pot out of puddles.', feed: 'No feed till spring' },
      growing: { label: 'Grow', tip: 'Spring growth spurt. Keep it watered; weeds steal from garlic.', feed: 'Compost or balanced feed when 15–20 cm tall' },
      flowering: { label: 'Scapes', tip: 'Hardnecks send up curly scapes. Snip them when they curl and eat them.', feed: 'No more feed: bulbs are forming' },
      harvesting: { label: 'Lift', tip: 'Lower third of leaves yellow? Stop watering, then lift in 1–2 weeks.', feed: NO_FEED },
      resting: { label: 'Cure', tip: 'Cure with tops on in an airy, shady spot for 2–4 weeks.', feed: NO_FEED },
    },
  },
  {
    id: 'leek',
    stages: ['seed', 'seedling', 'growing', 'harvesting'],
    unit: 'bunch',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Sow thinly in a tray, ½ cm deep. Grass-like shoots in about 2 weeks.' },
      seedling: { label: 'Sprout', tip: 'Transplant at pencil thickness: drop into 15 cm holes and water in.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Top up the pot with mix as they grow for longer white stems.', feed: LEAFY },
      harvesting: { label: 'Lift', tip: 'Hardy all winter: lift as you need them. Ease them out with a trowel.', feed: NO_FEED },
    },
  },
  {
    id: 'sweet-potato',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'grams',
    regrows: false,
    info: {
      seedling: { label: 'Slip', tip: 'Rooted slips go into a deep pot once nights stay above 15°C.', feed: 'No feed yet' },
      growing: { label: 'Vine', tip: 'Let it ramble. Young leaves are a tasty green. Go easy on nitrogen.', feed: 'Low-nitrogen, high-potash feed monthly' },
      harvesting: { label: 'Dig', tip: 'Tip out the pot after 3–4 months, before soil cools under 13°C.', feed: NO_FEED },
      resting: { label: 'Cure', tip: 'Cure somewhere warm (~27°C) for a week to sweeten, then store cool.', feed: NO_FEED },
    },
  },

  {
    id: 'potato',
    stages: ['seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'grams',
    regrows: false,
    info: {
      seedling: { label: 'Plant', tip: 'Chitted seed potato 10 cm deep in a grow bag, with room to top up.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Top up with mix every time 15 cm of leaves show. Keep tubers in the dark.', feed: 'Balanced feed every 2 weeks' },
      flowering: { label: 'Flower', tip: 'Flowers mean new potatoes are forming. Water evenly now.', feed: 'Balanced feed every 2 weeks' },
      harvesting: { label: 'Dig', tip: 'Tip the bag out. New potatoes ~10 weeks; maincrop when foliage dies back.', feed: NO_FEED },
      resting: { label: 'Done', tip: 'Bin blighted foliage and use fresh mix next year.', feed: NO_FEED },
    },
  },

  // West African leaves --------------------------------------------------------------------------
  {
    id: 'kontomire',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'bunch',
    regrows: false,
    info: {
      seedling: { label: 'Corm', tip: 'Plant a sprouting cocoyam corm just under the surface. Keep it moist.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Warm, damp and bright shade. Big leaves drink a lot.', feed: LEAFY },
      harvesting: { label: 'Pick', tip: 'Take young, unfurled leaves. Always cook them well: raw leaves sting.', feed: LEAFY },
      resting: { label: 'Rest', tip: 'Leaves die back in the dry season or cold. Water lightly till it wakes.', feed: NO_FEED },
    },
  },
  annualHerb('ayoyo', 'Pour hot water over the seed and soak overnight, then sow shallow. Needs warmth.', 'Pinch the tips at 20 cm so it branches into a bush.', 'Pick tips and young leaves every week for soup.', 'Small yellow flowers then pods: leaves toughen. Save pods for seed.', false),
  annualHerb('amaranth', 'Scatter the tiny seed and barely cover. Sprouts fast in warmth.', 'Thin to 15 cm apart. Loves sun, heat and steady water.', 'Cut stems at 20 cm, leaving a few leaves: it regrows.', 'Flower plumes mean the end of tender leaves. Let it seed or pull it.', true),
  {
    id: 'roselle',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'grams',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Sow 1 cm deep at 24°C+. Sprouts in about a week.' },
      seedling: { label: 'Sprout', tip: 'Full sun. One plant per big pot: it becomes a shrub.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Pick some young leaves as a sour green. Flowers come as days shorten.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Pale flowers last a day. The red calyx swells behind each one.', feed: BALANCED },
      harvesting: { label: 'Pick', tip: 'Pick plump red calyces about 10 days after flowering. Dry them for sobolo.', feed: BALANCED },
      resting: { label: 'Done', tip: 'Let a few pods dry on the plant for next year’s seed.', feed: NO_FEED },
    },
  },

  // Herbs ---------------------------------------------------------------------------------------
  perennialHerb('rosemary', 'Let the top few cm dry between drinks. Terracotta helps.', 'Snip soft tips, never more than a third at once.', 'Little blue flowers feed the bees. Trim lightly once they fade.', 'Winter: barely water. Wet feet kill rosemary faster than cold.'),
  perennialHerb('thyme', 'Full sun, gritty mix, and let it dry out in between.', 'Snip sprigs often; it keeps the plant compact.', 'Tiny flowers are edible. Shear it back by a third afterwards.', 'Winter: keep it on the dry side and out of the rain.'),
  annualHerb('parsley', 'Soak seed overnight, sow ½ cm deep. It can take 3–4 weeks to sprout.', 'Steady water and a deep pot for the long taproot.', 'Cut outer stems at the base; the centre keeps coming.', 'Second-year flower stalk: leaves go bitter. Time for a new plant.', false),
  annualHerb('cilantro', 'Sow 1 cm deep where it’ll grow: it hates being moved.', 'Cool and moist keeps it leafy. Heat makes it bolt.', 'Cut outer stems or the whole bunch 3 cm up: it regrows once or twice.', 'Bolting! Leaves turn feathery. Let it set seed: that’s coriander.', true),
  {
    id: 'chives',
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'flowering', 'resting'],
    unit: 'bunch',
    regrows: true,
    info: {
      seed: { ...SEED, tip: 'Sow a pinch ½ cm deep, or buy a clump and split it.' },
      seedling: { label: 'Sprout', tip: 'Grass-fine shoots. Keep the pot evenly moist.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Sun or light shade. Split crowded clumps every few springs.', feed: LIGHT },
      harvesting: { label: 'Snip', tip: 'Cut to 3 cm and it regrows in a few weeks.', feed: LIGHT },
      flowering: { label: 'Flower', tip: 'Purple pompoms are edible. Snip them off to keep leaves tender.', feed: LIGHT },
      resting: { label: 'Rest', tip: 'Died back for winter. Keep barely damp; it’s back in spring.', feed: NO_FEED },
    },
  },
  perennialHerb('oregano', 'Sun and gritty mix. Flavour is best when it’s a bit dry.', 'Snip stems before it flowers for the strongest flavour.', 'Bees love the flowers. Shear it back by half once they fade.', 'Dies back in a cold winter. Cut old stems in spring.'),
  perennialHerb('sage', 'Let it dry out between drinks. It hates soggy mix.', 'Pick leaves any time; take tips to keep it bushy.', 'Purple flower spikes. Trim them off after flowering.', 'Winter: dry and sheltered. Don’t cut into bare old wood.'),
  annualHerb('dill', 'Sow ½ cm deep where it’ll grow; it hates being moved.', 'A deep pot and a little stake for the hollow stems.', 'Snip feathery fronds from the top and outside.', 'Yellow umbrellas: let them seed for pickles, or sow again.', false),
  perennialHerb('tarragon', 'Sun, gritty mix and dry-ish roots. It hates wet feet.', 'Snip tips often; the flavour fades as it flowers.', 'French tarragon rarely flowers. Trim any stalks that do.', 'Dies back in winter. Keep the pot dry and under cover.'),
  {
    id: 'lemongrass',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'bunch',
    regrows: false,
    info: {
      seedling: { label: 'Root', tip: 'A store-bought stalk in water roots in 2–3 weeks. Then pot it.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Sun, warmth and steady water. It clumps up fast in summer.', feed: LEAFY },
      harvesting: { label: 'Cut', tip: 'Cut thick outer stalks at the base. Leaves make tea.', feed: LEAFY },
      resting: { label: 'Winter', tip: 'Indoors in a bright spot, watered lightly. Trim leaves to 20 cm.', feed: NO_FEED },
    },
  },
  perennialHerb('lemon-balm', 'Easy and thirsty. Morning sun, afternoon shade is perfect.', 'Pick any time. Cut it hard in midsummer for fresh leaves.', 'Flowers make it leggy and it self-seeds. Cut them off.', 'Dies back for winter. Cut old stems; it returns in spring.', LIGHT),
  {
    id: 'bay-laurel',
    stages: ['growing', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      growing: { label: 'Grow', tip: 'Slow and steady. Let the top few cm dry before watering.', feed: 'Balanced feed monthly in spring and summer' },
      harvesting: { label: 'Pick', tip: 'Pick mature leaves any time. They dry beautifully.', feed: 'Balanced feed monthly in spring and summer' },
      resting: { label: 'Winter', tip: 'Hardy, but shelter from icy winds. Scale insects? Wipe them off.', feed: NO_FEED },
    },
  },
  {
    id: 'lavender',
    stages: ['seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'bunch',
    regrows: false,
    info: {
      seedling: { label: 'Settle', tip: 'A new plant. Water it in, then let it dry between drinks.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Full sun, gritty mix, no feed to speak of. It likes it lean.', feed: LEAN },
      flowering: { label: 'Flower', tip: 'Buds coming. Pick as the first flowers open for the best scent.', feed: NO_FEED },
      harvesting: { label: 'Pick', tip: 'Cut stems long, then shear the plant into a neat mound.', feed: NO_FEED },
      resting: { label: 'Rest', tip: 'Winter: dry and sheltered. Never cut into bare brown wood.', feed: NO_FEED },
    },
  },
  annualHerb('scent-leaf', 'Sow on the surface in warmth, or root a cutting in water.', 'Pinch the tips to make it bushy. Loves heat.', 'Pick tips and leaves for soups; it bounces back.', 'Pinch flower spikes so leaves stay tender.', false, 'handful'),
  {
    id: 'ginger',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'grams',
    regrows: false,
    info: {
      seedling: { label: 'Sprout', tip: 'Plant a budded piece just under the surface. Warm, barely damp.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Warm, humid and bright shade. Water more as the shoots grow.', feed: BALANCED },
      harvesting: { label: 'Dig', tip: 'Leaves yellowing after 8–10 months: dig it. Snap off young bits sooner.', feed: NO_FEED },
      resting: { label: 'Rest', tip: 'Dormant. Keep it almost dry and warm until new shoots appear.', feed: NO_FEED },
    },
  },

  // Fruit ---------------------------------------------------------------------------------------
  {
    id: 'strawberry',
    stages: ['seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setDayMaxC: 30, // pollen and fruit set suffer in hot spells
    fruitingFeed: true,
    seattleOutdoorFeed: { from: 2, to: 7 },
    info: {
      seedling: { label: 'Plant', tip: 'Crown level with the soil: too deep rots, too high dries out.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Full sun and even water. Snip runners for bigger berries.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Frost blackens open flowers: cover them on cold nights.', feed: POTASH },
      fruiting: { label: 'Fruit', tip: 'Keep berries off wet soil (straw or a hanging pot) and away from slugs.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Pick fully red, with the green cap on, on a dry morning.', feed: POTASH },
      resting: { label: 'Rest', tip: 'Dormant. Tidy old leaves and keep the pot out of standing water.', feed: NO_FEED },
    },
  },
  {
    id: 'blueberry',
    stages: ['growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    seattleOutdoorFeed: { from: 2, to: 5 }, // spring only, so new growth hardens before winter
    info: {
      growing: { label: 'Grow', tip: 'Acid (ericaceous) mix, never dry. Rainwater or soft tap water.', feed: 'Ericaceous feed in spring only' },
      flowering: { label: 'Flower', tip: 'Little bells. Two varieties nearby means bigger crops.', feed: 'Ericaceous feed in spring only' },
      fruiting: { label: 'Fruit', tip: 'Berries swelling. Net the pot before the birds notice.', feed: 'Ericaceous feed in spring only' },
      harvesting: { label: 'Pick', tip: 'Wait a few days after they turn blue: they sweeten on the bush.', feed: NO_FEED },
      resting: { label: 'Rest', tip: 'Gorgeous red leaves, then dormant. Prune old and dead wood in late winter.', feed: NO_FEED },
    },
  },
  {
    id: 'raspberry',
    stages: ['growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    seattleOutdoorFeed: { from: 2, to: 5 },
    info: {
      growing: { label: 'Grow', tip: 'Tie new canes in as they grow. A wide pot and steady water.', feed: 'Balanced feed in spring' },
      flowering: { label: 'Flower', tip: 'Bees do the work here. Keep the pot moist through flowering.', feed: POTASH },
      fruiting: { label: 'Fruit', tip: 'Berries colouring. Net against birds.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Ripe ones slip off the core easily. Pick every couple of days.', feed: NO_FEED },
      resting: { label: 'Rest', tip: 'Dormant. Autumn types: cut all canes to the ground in late winter.', feed: NO_FEED },
    },
  },
  {
    id: 'meyer-lemon',
    stages: ['growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    pollinate: 'shake',
    info: {
      growing: { label: 'Grow', tip: 'Brightest spot you have. Let the top few cm dry before watering.', feed: 'Citrus feed monthly' },
      flowering: { label: 'Flower', tip: 'That scent! Indoors, dab flowers with a soft brush to set fruit.', feed: 'Citrus feed monthly' },
      fruiting: { label: 'Fruit', tip: 'Some fruitlets drop: normal. Steady watering keeps the rest.', feed: 'Citrus feed monthly' },
      harvesting: { label: 'Pick', tip: 'Fully yellow and slightly soft. They hang happily for weeks.', feed: 'Citrus feed monthly' },
      resting: { label: 'Winter', tip: 'Indoors, bright and cool. Water less; leaf drop means a sudden change.', feed: 'Light citrus feed, or none in deep winter' },
    },
  },
  {
    id: 'common-fig',
    stages: ['growing', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    seattleOutdoorFeed: { from: 3, to: 6 },
    info: {
      growing: { label: 'Grow', tip: 'Full sun and a snug pot: root-bound figs fruit better.', feed: 'Balanced feed every 2 weeks till midsummer' },
      fruiting: { label: 'Fruit', tip: 'Figs swelling. Keep watering steady so they don’t drop.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Ripe when soft, drooping, and a bead of nectar shows at the eye.', feed: NO_FEED },
      resting: { label: 'Rest', tip: 'Leaves drop: dormant. Shelter the pot by a wall; water a little monthly.', feed: NO_FEED },
    },
  },
  nightshade('cape-gooseberry', {
    seed: { tip: 'Sow like tomatoes, indoors at about 20°C. Sprouts in 2 weeks.' },
    growing: { tip: 'Sprawls: give it a cage. Too much feed means leaves, not fruit.' },
    flowering: { tip: 'Little yellow bells. Lanterns form behind each one.' },
    fruiting: { tip: 'Lanterns filling out. Keep watering even.' },
    harvesting: { tip: 'Ripe when the husk turns tan and papery. Unripe green fruit is toxic.' },
  }, { setNightMinC: undefined, setDayMaxC: undefined, fruitingFeed: false }),
  {
    id: 'passion-fruit',
    stages: ['seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    fruitingFeed: true,
    info: {
      seedling: { label: 'Settle', tip: 'A young vine. Give it a big pot and a sturdy trellis from day one.', feed: 'No feed yet' },
      growing: { label: 'Climb', tip: 'Tie shoots onto the trellis. Fruit comes on new growth.', feed: BALANCED },
      flowering: { label: 'Flower', tip: 'Wild flowers! Carpenter bees pollinate; a soft brush helps indoors.', feed: BALANCED },
      fruiting: { label: 'Fruit', tip: 'Fruit takes 2–3 months to ripen. Keep watering steady.', feed: POTASH },
      harvesting: { label: 'Pick', tip: 'Ripe when it drops or the skin starts to wrinkle.', feed: POTASH },
      resting: { label: 'Rest', tip: 'Prune back after fruiting. In Seattle, a bright warm room for winter.', feed: NO_FEED },
    },
  },
  {
    id: 'pineapple',
    stages: ['seedling', 'growing', 'flowering', 'fruiting', 'harvesting'],
    unit: 'fruit',
    regrows: false,
    info: {
      seedling: { label: 'Root', tip: 'Twist off the top, strip the lower leaves, dry 2 days, plant shallow.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Warm, sunny, on the dry side. Water into the leaf cup now and then.', feed: 'Dilute balanced feed monthly' },
      flowering: { label: 'Flower', tip: 'A red cone in the centre, usually after about two years. Exciting!', feed: 'Dilute balanced feed monthly' },
      fruiting: { label: 'Fruit', tip: 'Fruit swelling for 4–6 months. Keep it warm.', feed: 'Dilute balanced feed monthly' },
      harvesting: { label: 'Pick', tip: 'Ripe when it smells sweet at the base and turns golden.', feed: NO_FEED },
    },
  },
];

export const EDIBLES: Record<EdibleId, EdibleGuide> = Object.fromEntries(GUIDES.map((g) => [g.id, g]));

/** Crops that need a hand to stay upright: a stake (or cage) for the heavy croppers, a trellis or poles for climbers. */
export type Support = 'stake' | 'trellis';
const SUPPORT: Partial<Record<EdibleId, Support>> = {
  tomato: 'stake',
  pepper: 'stake',
  'bell-pepper': 'stake',
  eggplant: 'stake',
  'garden-egg': 'stake',
  'cape-gooseberry': 'stake',
  okra: 'stake',
  cucumber: 'trellis',
  pea: 'trellis',
  'runner-bean': 'trellis',
  'passion-fruit': 'trellis',
};

export function supportFor(speciesId: SpeciesId): Support | undefined {
  return SUPPORT[speciesId];
}

export function edibleGuide(speciesId: SpeciesId): EdibleGuide | undefined {
  return EDIBLES[speciesId];
}

/** The month calendar ------------------------------------------------------------------------- */

export type TaskKind = 'sow' | 'plant' | 'care' | 'feed' | 'harvest' | 'protect';

/** A window inside one month (0 = Jan). Days default to the whole month. */
export interface TaskWindow {
  month: number;
  from?: number;
  to?: number;
}

export interface CalendarTask {
  id: string;
  kind: TaskKind;
  title: string;
  body: string;
  species: EdibleId[];
  when: TaskWindow[];
  /** Only for plants at one of these stages (plants with no stage logged always count). */
  stages?: EdibleStage[];
  /** Weather jobs (bring in, shelter, shade, slugs, rain): only for plants that live outside. */
  outdoorOnly?: boolean;
  /** A job done again and again ("every 2–3 days"): ticking it off lasts this many days. Others last the month. */
  repeatDays?: number;
}

const all = (from: number, to: number): TaskWindow[] => Array.from({ length: to - from + 1 }, (_, i) => ({ month: (from + i) % 12 }));
const months = (...ms: number[]): TaskWindow[] => ms.map((month) => ({ month }));

// Crop groups shared by several tasks.
const SALAD = ['lettuce', 'spinach', 'arugula', 'bok-choy', 'mustard-greens'];
const BEANS = ['bush-bean', 'runner-bean'];
const PEPPERS = ['pepper', 'bell-pepper'];
const VINES = ['cucumber', 'zucchini'];
const ROOTS = ['carrot', 'radish'];
const MED_HERBS = ['rosemary', 'thyme', 'sage', 'oregano', 'lavender', 'tarragon'];
const BERRIES = ['strawberry', 'blueberry', 'raspberry'];
/** Warm-climate edibles that summer outside in Seattle and winter indoors. */
const TROPICAL = ['garden-egg', 'kontomire', 'scent-leaf', 'ginger', 'lemongrass', 'pineapple', 'passion-fruit', 'okra', 'roselle'];
/** Accra: everything that's out in the weather. */
const ACC_ALL = [
  'tomato', ...PEPPERS, 'spring-onion', 'basil', 'mint', ...SALAD, 'kale', 'chard', ...BEANS, 'pea', ...VINES, 'eggplant', 'garden-egg', 'okra',
  ...ROOTS, 'garlic', 'leek', 'sweet-potato', 'kontomire', 'ayoyo', 'amaranth', 'roselle', ...MED_HERBS, 'parsley', 'cilantro', 'chives', 'dill',
  'lemongrass', 'lemon-balm', 'bay-laurel', 'scent-leaf', 'ginger', ...BERRIES, 'meyer-lemon', 'common-fig', 'cape-gooseberry', 'passion-fruit', 'pineapple',
];

export const CALENDAR: Record<ClimateModel, CalendarTask[]> = {
  seattle: [
    { id: 'sea-plan', kind: 'care', title: 'Pick your seeds', body: 'Go early and small: cherries like Sungold, Sweet Million or Stupice (≤75 days).', species: ['tomato', ...PEPPERS], when: months(0, 1) },
    { id: 'sea-overwinter-care', repeatDays: 14, kind: 'care', title: 'Winter pepper check', body: 'Water about every 2 weeks, no feed. Peek under leaves for aphids.', species: ['pepper'], when: months(10, 11, 0, 1, 2) },
    { id: 'sea-sow-onion', kind: 'sow', title: 'Sow spring onions', body: 'They’re hardy. A pinch per spot, ½ cm deep, indoors or out.', species: ['spring-onion'], when: months(1, 2, 3) },
    { id: 'sea-sow-toms', kind: 'sow', title: 'Start seeds indoors', body: '6–8 weeks before mid-May. Peppers and eggplant want a heat mat at 27–32°C.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg', 'cape-gooseberry'], when: [{ month: 2, from: 15 }, { month: 3, to: 7 }] },
    { id: 'sea-mint-wake', kind: 'care', title: 'Wake up the mint', body: 'Cut last year’s stems, top up the pot, or split a crowded clump.', species: ['mint'], when: months(2, 3) },
    { id: 'sea-pot-up', kind: 'plant', title: 'Pot up seedlings', body: 'At two true leaves, move each to its own pot. Keep above 16°C.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg', 'cape-gooseberry'], when: [{ month: 3 }, { month: 4, to: 10 }] },
    { id: 'sea-sow-basil', kind: 'sow', title: 'Sow basil indoors', body: 'Warm windowsill only. It sulks below 10°C.', species: ['basil'], when: months(3, 4) },
    { id: 'sea-peppers-wake', kind: 'care', title: 'Peppers back to warmth', body: 'Move overwintered peppers somewhere warm and bright, and start feeding again.', species: ['pepper'], when: months(3) },
    { id: 'sea-harden', kind: 'plant', title: 'Harden off', body: 'A week of outdoor time, a little longer each day, before planting out.', species: ['tomato', ...PEPPERS, 'basil', 'eggplant', 'cape-gooseberry', ...VINES], when: [{ month: 3, from: 20 }, { month: 4, to: 20 }] },
    { id: 'sea-plant-toms', kind: 'plant', title: 'Plant tomatoes out', body: 'Once soil hits 10°C (about mid-May). Bury the stem deep, 6+ hours of sun.', species: ['tomato'], when: [{ month: 4, from: 10 }, { month: 5, to: 7 }] },
    { id: 'sea-plant-peps', kind: 'plant', title: 'Peppers out', body: 'Late May or June, when nights stay above 10°C. A cloche helps.', species: [...PEPPERS], when: [{ month: 4, from: 25 }, { month: 5 }] },
    { id: 'sea-basil-out', kind: 'plant', title: 'Basil outside', body: 'Only once nights are reliably warm. Otherwise the sunniest window.', species: ['basil'], when: months(5) },
    { id: 'sea-feed-start', kind: 'feed', title: 'Start feeding', body: 'Balanced feed while they grow. Switch to high-potash once fruit swells.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg', ...VINES], when: [{ month: 4, from: 10 }, { month: 5 }] },
    { id: 'sea-pollinate', repeatDays: 3, kind: 'care', title: 'Shake the flowers', body: 'Tap or buzz flower trusses at midday every 2–3 days. Balconies lack bees.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg'], when: months(5, 6, 7) },
    { id: 'sea-water-daily', repeatDays: 1, kind: 'care', title: 'Check pots daily', body: 'Dry summer: a sunny 5-gal pot can drink every day. Keep it even.', species: ['tomato', ...PEPPERS, 'basil', 'mint', 'eggplant', ...VINES, ...BEANS, 'strawberry', 'blueberry', 'lettuce'], when: months(6, 7) },
    { id: 'sea-basil-pinch', kind: 'harvest', title: 'Pinch basil flowers', body: 'Pick from the top and nip flower spikes so it stays leafy.', species: ['basil'], when: months(6, 7, 8) },
    { id: 'sea-sow-onion-fall', kind: 'sow', title: 'Sow onions for autumn', body: 'A July–August sowing gives snips through autumn and spring.', species: ['spring-onion'], when: months(6, 7) },
    { id: 'sea-feed-stop', kind: 'feed', title: 'Stop feeding', body: 'Mid-August is the cut-off for balcony edibles. Ripening time now.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg'], when: [{ month: 7, from: 10, to: 25 }] },
    { id: 'sea-top-flowers', outdoorOnly: true, kind: 'care', title: 'Nip new flowers', body: 'New flowers won’t ripen in time. Pinch them so the plant ripens what’s there.', species: ['tomato'], when: [{ month: 7, from: 15 }, { month: 8, to: 10 }] },
    { id: 'sea-blight', kind: 'protect', title: 'Late blight watch', body: 'Brown blotches on leaves? Bin them. Water the soil, never the leaves.', species: ['tomato'], when: [{ month: 7, from: 15 }, { month: 8 }] },
    { id: 'sea-water-less', kind: 'care', title: 'Ease off watering', body: 'A bit less water from late August pushes ripening. Keep it even though.', species: ['tomato'], when: [{ month: 7, from: 20 }, { month: 8, to: 15 }] },
    { id: 'sea-basil-in', outdoorOnly: true, kind: 'protect', title: 'Basil comes inside', body: 'Bring it in before nights drop under 10°C, or take cuttings for the windowsill.', species: ['basil'], when: [{ month: 8, from: 10 }, { month: 9, to: 10 }] },
    { id: 'sea-green-toms', outdoorOnly: true, kind: 'harvest', title: 'Pick green tomatoes', body: 'Take every full-size green or blushing one. Ripen at 13–21°C, out of the fridge. ~2 weeks.', species: ['tomato'], when: [{ month: 9 }, { month: 10, to: 10 }] },
    { id: 'sea-overwinter', outdoorOnly: true, kind: 'protect', title: 'Bring peppers in', body: 'Pick any ripe pods, prune to a few Y-branches, check for bugs, then a bright ~13°C spot.', species: ['pepper'], when: [{ month: 9 }, { month: 10, to: 15 }] },
    { id: 'sea-blight-bin', kind: 'care', title: 'Tidy the vines', body: 'Bin blighted vines (don’t compost) and don’t reuse their mix for tomatoes or peppers.', species: ['tomato'], when: [{ month: 9, from: 15 }, { month: 10 }], stages: ['fruiting', 'harvesting', 'resting'] },
    { id: 'sea-onion-eave', outdoorOnly: true, kind: 'protect', title: 'Onions under the eave', body: 'They’re hardy, just not fans of sitting soggy. Or bring a pot to the windowsill.', species: ['spring-onion'], when: months(9, 10) },
    { id: 'sea-onion-winter', kind: 'harvest', title: 'Snip lightly', body: 'Short days mean slow regrowth. Take a little, leave the rest.', species: ['spring-onion'], when: months(11, 0) },
    { id: 'sea-mint-rest', kind: 'care', title: 'Let mint rest', body: 'It dies back for winter. Cut the stems and keep it barely damp.', species: ['mint'], when: months(10, 11) },

    // Slugs: Seattle's damp springs and autumns.
    { id: 'sea-slugs', outdoorOnly: true, kind: 'protect', title: 'Slug patrol', body: 'Damp nights bring slugs. Check pot rims and leaf undersides after dark; copper tape helps.', species: [...SALAD, 'kale', 'chard', ...BEANS, 'pea', ...VINES, 'strawberry', 'basil', 'microgreens'], when: months(2, 3, 4, 8, 9, 10) },

    // Salad and leafy greens.
    { id: 'sea-lettuce-succession', repeatDays: 14, kind: 'sow', title: 'Sow more lettuce', body: 'A short row every 2–3 weeks keeps salad coming. In July–Aug, sow in shade.', species: ['lettuce'], when: all(2, 8) },
    { id: 'sea-sow-greens', repeatDays: 21, kind: 'sow', title: 'Sow quick greens', body: 'Spinach, rocket, bok choy and mustard love cool weather. Sow every few weeks.', species: ['spinach', 'arugula', 'bok-choy', 'mustard-greens'], when: [{ month: 2 }, { month: 3 }, { month: 4, to: 15 }] },
    { id: 'sea-sow-greens-fall', kind: 'sow', title: 'Sow winter greens', body: 'Late-summer sowings of spinach, rocket and mustard crop into winter.', species: ['spinach', 'arugula', 'bok-choy', 'mustard-greens'], when: [{ month: 7, from: 10 }, { month: 8 }] },
    { id: 'sea-greens-shade', kind: 'care', title: 'Shade the salad', body: 'Heat and long days make greens bolt. Move them to afternoon shade and keep them moist.', species: [...SALAD, 'cilantro'], when: months(6, 7) },
    { id: 'sea-sow-kale', kind: 'sow', title: 'Sow kale and chard', body: 'Sow in spring for summer leaves. A July sowing gives picking all winter.', species: ['kale', 'chard'], when: [{ month: 2, from: 15 }, { month: 3 }, { month: 6 }] },
    { id: 'sea-caterpillars', kind: 'protect', title: 'Caterpillar check', body: 'Green caterpillars on kale and bok choy? Pick them off, or net the pot.', species: ['kale', 'bok-choy', 'mustard-greens', 'arugula'], when: months(5, 6, 7, 8) },
    { id: 'sea-greens-winter', kind: 'harvest', title: 'Winter pickings', body: 'Kale, chard and spinach shrug off light frost. Pick outer leaves; fleece below −5°C.', species: ['kale', 'chard', 'spinach', 'mustard-greens', 'leek'], when: months(10, 11, 0, 1) },
    { id: 'sea-micro-winter', kind: 'sow', title: 'Windowsill microgreens', body: 'A tray on the brightest sill gives greens in 10–14 days, even in December.', species: ['microgreens'], when: months(9, 10, 11, 0, 1) },

    // Peas and beans.
    { id: 'sea-sow-peas', kind: 'sow', title: 'Sow peas', body: 'Peas love cool soil. Put the netting up first, then sow 3 cm deep.', species: ['pea'], when: [{ month: 1, from: 15 }, { month: 2 }, { month: 3 }] },
    { id: 'sea-pick-peas', repeatDays: 2, kind: 'harvest', title: 'Pick peas often', body: 'Pick pods young, every couple of days, and the vines keep flowering.', species: ['pea'], when: months(5, 6) },
    { id: 'sea-sow-peas-fall', kind: 'sow', title: 'Peas for autumn', body: 'A mid-July sowing gives a modest autumn crop (WSU).', species: ['pea'], when: [{ month: 6, to: 25 }] },
    { id: 'sea-sow-beans', kind: 'sow', title: 'Sow beans', body: 'Wait for warm soil, about late May. Cold, wet soil rots bean seed.', species: BEANS, when: [{ month: 4, from: 20 }, { month: 5 }] },
    { id: 'sea-sow-beans-late', kind: 'sow', title: 'Last bean sowing', body: 'Bush beans sown by late July still crop before autumn. Runners by July 1.', species: BEANS, when: [{ month: 6 }] },
    { id: 'sea-pick-beans', repeatDays: 3, kind: 'harvest', title: 'Pick beans young', body: 'Every 2–3 days, pencil-thick and snappy. Missed pods stop the plant.', species: BEANS, when: months(6, 7, 8) },
    { id: 'sea-sow-fava', kind: 'sow', title: 'Sow fava beans', body: 'A November sowing overwinters and crops in June (WSU).', species: ['fava-bean'], when: [{ month: 9, from: 20 }, { month: 10 }] },
    { id: 'sea-sow-fava-spring', kind: 'sow', title: 'Sow fava beans', body: 'Missed autumn? A late-winter sowing crops by midsummer.', species: ['fava-bean'], when: [{ month: 1, from: 10 }, { month: 2 }] },
    { id: 'sea-fava-tips', kind: 'care', title: 'Pinch fava tips', body: 'Once the first pods set, pinch the tips: it deters blackfly. Cook the tips!', species: ['fava-bean'], when: months(4, 5) },

    // Cucumbers and zucchini.
    { id: 'sea-sow-vines', kind: 'sow', title: 'Start cukes and zukes', body: 'Sow indoors, one seed per small pot, at 20°C+. They hate root disturbance.', species: VINES, when: [{ month: 3, from: 20 }, { month: 4, to: 20 }] },
    { id: 'sea-plant-vines', kind: 'plant', title: 'Cukes and zukes out', body: 'Once nights stay above 10°C (late May–June). One zucchini per 15+ gal pot.', species: VINES, when: [{ month: 4, from: 20 }, { month: 5, to: 20 }] },
    { id: 'sea-pollinate-vines', kind: 'care', title: 'Hand-pollinate', body: 'Few bees on balconies. In the morning, dab a male flower’s pollen into the female.', species: VINES, when: months(6, 7) },
    { id: 'sea-pick-vines', repeatDays: 1, kind: 'harvest', title: 'Pick small, daily', body: 'Zucchini at 15–20 cm, cucumbers before they yellow. Check every day.', species: VINES, when: [{ month: 6, from: 10 }, { month: 7 }, { month: 8 }] },
    { id: 'sea-mildew', kind: 'protect', title: 'Mildew watch', body: 'White dust on leaves in late summer. Remove the worst and water the soil, not leaves.', species: [...VINES, 'pea'], when: months(7, 8) },

    // Eggplant and friends.
    { id: 'sea-plant-warm', kind: 'plant', title: 'Warm crops out', body: 'Your warmest, most sheltered spot once nights stay above 10°C. A cloche helps.', species: ['eggplant', 'cape-gooseberry'], when: [{ month: 4, from: 25 }, { month: 5 }] },
    { id: 'sea-physalis-pick', kind: 'harvest', title: 'Pick cape gooseberries', body: 'Ripe when the husk is tan and papery. They keep for weeks in the husk.', species: ['cape-gooseberry'], when: months(8, 9) },

    // Roots.
    { id: 'sea-sow-roots', repeatDays: 21, kind: 'sow', title: 'Sow roots in place', body: 'Carrots and radishes go straight in the pot. Sow a pinch every 3 weeks.', species: ROOTS, when: all(2, 6) },
    { id: 'sea-thin-roots', kind: 'care', title: 'Thin seedlings', body: 'Thin carrots to 5 cm and radishes to 3 cm, or the roots stay tiny.', species: ROOTS, when: months(3, 4, 5) },
    { id: 'sea-sow-radish-fall', kind: 'sow', title: 'Autumn radishes', body: 'Quick radishes sown until mid-September still size up before winter.', species: ['radish'], when: [{ month: 7 }, { month: 8, to: 15 }] },

    // Garlic and leeks.
    { id: 'sea-plant-garlic', kind: 'plant', title: 'Plant garlic', body: 'Plant late Oct–mid Nov. Cloves pointy end up, tops 5 cm deep, then mulch.', species: ['garlic'], when: [{ month: 9, from: 15 }, { month: 10, to: 15 }] },
    { id: 'sea-garlic-feed', kind: 'feed', title: 'Feed the garlic', body: 'Compost or balanced feed when tops are 15–20 cm. Stop once bulbs swell.', species: ['garlic'], when: [{ month: 3, from: 15 }, { month: 4 }] },
    { id: 'sea-garlic-scapes', kind: 'harvest', title: 'Snap the scapes', body: 'Hardnecks send up curly flower stalks. Snip them as they curl and cook them.', species: ['garlic'], when: months(5) },
    { id: 'sea-garlic-lift', kind: 'harvest', title: 'Lift the garlic', body: 'Lower third of leaves yellow? Stop watering, lift, and cure somewhere airy.', species: ['garlic'], when: [{ month: 5, from: 20 }, { month: 6 }] },
    { id: 'sea-sow-leek', kind: 'sow', title: 'Sow leeks', body: 'Sow thinly in a tray. They grow slowly to pencil thickness by early summer.', species: ['leek'], when: [{ month: 1, from: 15 }, { month: 2 }, { month: 3 }] },
    { id: 'sea-plant-leek', kind: 'plant', title: 'Plant leeks deep', body: 'Drop pencil-thick seedlings into 15 cm holes and water in. Deep = long white stems.', species: ['leek'], when: [{ month: 5 }, { month: 6, to: 15 }] },

    // Potatoes in grow bags.
    { id: 'sea-plant-potato', kind: 'plant', title: 'Plant seed potatoes', body: 'Chitted tubers 10 cm deep in a grow bag. Cover with fleece if frost threatens.', species: ['potato'], when: [{ month: 2, from: 15 }, { month: 3 }, { month: 4, to: 15 }] },
    { id: 'sea-earth-potato', kind: 'care', title: 'Top up the potatoes', body: 'Add mix whenever 15 cm of leaves show. Light makes tubers green and toxic.', species: ['potato'], when: months(4, 5) },
    { id: 'sea-dig-potato', kind: 'harvest', title: 'Dig potatoes', body: 'New potatoes after flowering; maincrop once the foliage dies back.', species: ['potato'], when: months(6, 7, 8) },

    // Sweet potato and the warm-climate crowd.
    { id: 'sea-sweet-slips', kind: 'plant', title: 'Plant slips', body: 'Only once nights stay above 15°C. A black pot in the sunniest corner.', species: ['sweet-potato'], when: [{ month: 5 }] },
    { id: 'sea-sweet-dig', kind: 'harvest', title: 'Dig sweet potatoes', body: 'Tip out the pot before the soil drops below 13°C or the rains arrive.', species: ['sweet-potato'], when: [{ month: 8, from: 15 }, { month: 9, to: 10 }] },
    { id: 'sea-sow-heat', kind: 'sow', title: 'Sow heat-lovers', body: 'Okra, amaranth, ayoyo and roselle want 24°C: sow indoors on a warm sill.', species: ['okra', 'amaranth', 'ayoyo', 'roselle'], when: [{ month: 3, from: 15 }, { month: 4 }] },
    { id: 'sea-tropical-out', kind: 'plant', title: 'Tropicals outside', body: 'Once nights stay above 12°C, warm-climate pots can summer on the balcony.', species: [...TROPICAL, 'amaranth', 'ayoyo'], when: [{ month: 5, from: 10 }, { month: 6, to: 10 }] },
    { id: 'sea-tropical-in', outdoorOnly: true, kind: 'protect', title: 'Tropicals inside', body: 'Bring warm-climate pots in before nights drop under 10°C. Bright window, less water.', species: TROPICAL, when: [{ month: 8, from: 10 }, { month: 9, to: 10 }] },
    { id: 'sea-start-ginger', kind: 'plant', title: 'Start ginger', body: 'Plant a plump, budded piece shallow in a wide pot, indoors in the warmth.', species: ['ginger'], when: months(2, 3) },

    // Herbs.
    { id: 'sea-sow-herbs', kind: 'sow', title: 'Sow parsley and dill', body: 'Soak parsley seed overnight: it’s slow. Dill and cilantro go straight in the pot.', species: ['parsley', 'dill', 'cilantro'], when: [{ month: 2, from: 15 }, { month: 3 }, { month: 4 }] },
    { id: 'sea-cilantro-succession', repeatDays: 21, kind: 'sow', title: 'Sow more cilantro', body: 'It bolts fast in summer. A small sowing every 3 weeks keeps leaves coming.', species: ['cilantro', 'dill'], when: all(4, 8) },
    { id: 'sea-sow-parsley-fall', kind: 'sow', title: 'Parsley for winter', body: 'An early-July sowing gives leaves in autumn and again in spring.', species: ['parsley'], when: [{ month: 6, to: 15 }] },
    { id: 'sea-herbs-wake', kind: 'care', title: 'Wake the perennials', body: 'Cut dead stems back to new shoots and give a light feed.', species: ['chives', 'oregano', 'lemon-balm', 'thyme', 'tarragon', 'sage'], when: months(2, 3) },
    { id: 'sea-herbs-trim', kind: 'care', title: 'Trim after flowers', body: 'Shear woody herbs lightly once flowers fade. Never cut into bare old wood.', species: ['rosemary', 'thyme', 'sage', 'oregano', 'lavender', 'lemon-balm'], when: months(6, 7) },
    { id: 'sea-lavender-pick', kind: 'harvest', title: 'Pick lavender', body: 'Cut stems as the first buds open for the best scent, then dry them upside down.', species: ['lavender'], when: [{ month: 5, from: 15 }, { month: 6 }] },
    { id: 'sea-herbs-wet', outdoorOnly: true, kind: 'protect', title: 'Keep herbs dry', body: 'Mediterranean herbs die of wet roots, not cold. Under the eave, no saucer.', species: [...MED_HERBS, 'bay-laurel'], when: months(10, 11, 0, 1) },
    { id: 'sea-chives-split', kind: 'plant', title: 'Plant chives', body: 'Late Oct–early Nov is a good time to plant or split chive clumps (WSU).', species: ['chives'], when: [{ month: 9, from: 20 }, { month: 10, to: 10 }] },

    // Fruit.
    { id: 'sea-plant-berries', kind: 'plant', title: 'Plant strawberries', body: 'Crown level with the soil: too deep rots, too high dries out.', species: ['strawberry'], when: months(2, 3) },
    { id: 'sea-net-berries', outdoorOnly: true, kind: 'protect', title: 'Net the berries', body: 'Birds love ripening berries. Net the pot and keep fruit off wet soil.', species: BERRIES, when: [{ month: 4, from: 15 }, { month: 5 }, { month: 6 }] },
    { id: 'sea-pick-strawberries', kind: 'harvest', title: 'Pick strawberries', body: 'Fully red, on a dry morning. Everbearers keep going into September.', species: ['strawberry'], when: all(5, 8) },
    { id: 'sea-runners', kind: 'care', title: 'Snip runners', body: 'Cut runners for bigger fruit, or pin a few into small pots for new plants.', species: ['strawberry'], when: months(6, 7) },
    { id: 'sea-blueberry-feed', kind: 'feed', title: 'Feed blueberries', body: 'Acid (ericaceous) feed in spring only. Soft tap water or rainwater suits them.', species: ['blueberry'], when: [{ month: 2, from: 15 }, { month: 3 }, { month: 4 }] },
    { id: 'sea-pick-blueberries', kind: 'harvest', title: 'Pick blueberries', body: 'Wait a few days after they turn blue: they sweeten on the bush.', species: ['blueberry'], when: months(6, 7) },
    { id: 'sea-pick-raspberries', kind: 'harvest', title: 'Pick raspberries', body: 'Ripe ones slip off the core. Autumn types keep cropping into October.', species: ['raspberry'], when: all(6, 9) },
    { id: 'sea-prune-berries', kind: 'care', title: 'Prune berries', body: 'Blueberries: remove dead and oldest wood. Autumn raspberries: cut all canes down.', species: ['blueberry', 'raspberry'], when: months(0, 1) },
    { id: 'sea-lemon-out', kind: 'plant', title: 'Lemon outside', body: 'Once nights stay above 10°C. Ease it into full sun over a week so leaves don’t scorch.', species: ['meyer-lemon'], when: [{ month: 4, from: 15 }, { month: 5, to: 15 }] },
    { id: 'sea-lemon-in', outdoorOnly: true, kind: 'protect', title: 'Lemon comes inside', body: 'In before nights drop under 7°C: the brightest window, away from heaters.', species: ['meyer-lemon'], when: [{ month: 9 }, { month: 10, to: 10 }] },
    { id: 'sea-pick-figs', kind: 'harvest', title: 'Pick figs', body: 'Soft, drooping, a bead of nectar at the eye. Desert King gives a July crop too.', species: ['common-fig'], when: all(6, 8) },
    { id: 'sea-fig-shelter', outdoorOnly: true, kind: 'protect', title: 'Shelter the fig', body: 'Potted roots feel cold more. Push it against the wall, or into a garage in a deep freeze.', species: ['common-fig', 'bay-laurel'], when: months(11, 0, 1) },
  ],
  /*
   * Accra: harmattan Dec–Feb, major rains Apr–Jul, a short dry spell in August, minor rains Sep–Oct.
   * Much of this is inferred from Ghanaian practice (sow leafy greens and okro with the rains; lettuce,
   * carrots and cucumbers through the cooler dry season with watering) rather than a published calendar,
   * so the wording stays gentle.
   */
  accra: [
    { id: 'acc-harmattan-water', repeatDays: 1, kind: 'care', title: 'Harmattan watering', body: 'Dry winds empty pots fast. Check daily and mulch the top.', species: ACC_ALL, when: [{ month: 11 }, { month: 0 }, { month: 1 }] },
    { id: 'acc-mites', kind: 'protect', title: 'Spider mite check', body: 'Dry air brings mites. Look under leaves for speckles and fine webbing.', species: ['tomato', ...PEPPERS, 'basil', 'eggplant', 'garden-egg', 'okra', ...VINES, ...BEANS, 'strawberry', 'meyer-lemon'], when: months(11, 0, 1, 2) },
    { id: 'acc-tomato-prime', kind: 'harvest', title: 'Tomato picking time', body: 'Cooler, drier weeks are when tomatoes set best. Pick them fully coloured.', species: ['tomato'], when: months(0, 1) },
    { id: 'acc-shade', outdoorOnly: true, kind: 'protect', title: 'Afternoon shade', body: 'Days over 32°C drop tomato flowers. Shade from about 1–4 pm and water evenly.', species: ['tomato', 'mint'], when: months(1, 2, 3) },
    { id: 'acc-peppers-hot', kind: 'care', title: 'Peppers keep going', body: 'Peppers handle the heat better than tomatoes. Keep moisture steady.', species: [...PEPPERS], when: months(2, 3) },
    { id: 'acc-rains', outdoorOnly: true, kind: 'protect', title: 'Rains are back', body: 'Raise pots on feet and clear drainage holes so roots don’t drown.', species: ACC_ALL, when: [{ month: 3 }, { month: 8 }] },
    { id: 'acc-heavy-rains', outdoorOnly: true, kind: 'protect', title: 'Heavy-rain weeks', body: 'Move pots under cover in downpours. Waterlogging and blight love May–June.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg', ...MED_HERBS, 'strawberry', 'pineapple'], when: months(4, 5) },
    { id: 'acc-gnats', kind: 'care', title: 'Gnat and rot watch', body: 'Pots stay wet in the rains. Let the top dry before watering again.', species: ['basil', 'mint', 'spring-onion', 'scent-leaf', 'parsley', 'cilantro', 'chives', 'microgreens'], when: months(4, 5, 9) },
    { id: 'acc-sow-onion', kind: 'sow', title: 'Sow spring onions', body: 'They grow all year here. Shade the seed tray in the hottest weeks.', species: ['spring-onion'], when: months(5, 6, 10) },
    { id: 'acc-sow-pepper', kind: 'sow', title: 'Sow peppers', body: 'Nursery tray now, move to pots at 4–6 true leaves (6–8 weeks).', species: [...PEPPERS], when: months(3, 7) },
    { id: 'acc-cool-set', repeatDays: 3, kind: 'care', title: 'Little dry season', body: 'The coolest weeks of the year: great for fruit set. Shake flowers at midday.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg'], when: [{ month: 6, from: 15 }, { month: 7 }] },
    { id: 'acc-whitefly', kind: 'protect', title: 'Whitefly watch', body: 'They spread leaf curl virus. Yellow sticky traps, and check leaf undersides.', species: ['tomato', ...PEPPERS, 'eggplant', 'garden-egg', 'okra', 'sweet-potato'], when: months(8, 9) },
    { id: 'acc-sow-toms', kind: 'sow', title: 'Sow tomatoes', body: 'Start a nursery tray now so fruit lands in the cooler Jan–Feb weeks.', species: ['tomato'], when: [{ month: 9, from: 15 }, { month: 10 }] },
    { id: 'acc-plant-toms', kind: 'plant', title: 'Move tomato seedlings', body: 'Pot on at 4–6 true leaves, deep, into 5 gal pots with fresh mix.', species: ['tomato'], when: [{ month: 10, from: 15 }, { month: 11 }] },
    { id: 'acc-basil-pinch', repeatDays: 7, kind: 'harvest', title: 'Pinch basil weekly', body: 'Warm all year means flowers come fast. Pick tops and nip flower spikes.', species: ['basil', 'scent-leaf'], when: all(0, 11) },

    // Local greens and staples with the rains.
    { id: 'acc-sow-local-greens', kind: 'sow', title: 'Sow local greens', body: 'Ayoyo and aleefu love the rains. Sow now and pick young leaves in 4–6 weeks.', species: ['ayoyo', 'amaranth'], when: months(3, 4, 8, 9) },
    { id: 'acc-plant-cocoyam', kind: 'plant', title: 'Plant cocoyam', body: 'Set a sprouting corm in a big pot as the rains start. Kontomire leaves in ~3 months.', species: ['kontomire'], when: months(3, 4) },
    { id: 'acc-pick-kontomire', kind: 'harvest', title: 'Pick kontomire', body: 'Take young leaves for stew, a few at a time, and always cook them well.', species: ['kontomire'], when: all(5, 9) },
    { id: 'acc-sow-okro', kind: 'sow', title: 'Sow okro', body: 'Soak seed overnight and sow two per pot with the rains. Pods in about two months.', species: ['okra'], when: months(3, 4, 8) },
    { id: 'acc-pick-okro', repeatDays: 2, kind: 'harvest', title: 'Pick okro young', body: 'Finger-length pods, every two days, before they turn woody.', species: ['okra'], when: months(5, 6, 7, 10, 11) },
    { id: 'acc-sow-garden-egg', kind: 'sow', title: 'Sow garden eggs', body: 'Nursery tray now, pot on after 5–6 weeks. Fruit in about 3 months and for months after.', species: ['garden-egg', 'eggplant'], when: months(3, 8) },
    { id: 'acc-sow-roselle', kind: 'sow', title: 'Sow roselle', body: 'Sow with the rains; the red calyces for sobolo come as days shorten, around Oct–Dec.', species: ['roselle'], when: months(4, 5) },
    { id: 'acc-pick-roselle', kind: 'harvest', title: 'Pick sobolo calyces', body: 'Pick plump red calyces about 10 days after the flowers, then dry them in the shade.', species: ['roselle'], when: months(9, 10, 11) },
    { id: 'acc-plant-sweet', kind: 'plant', title: 'Plant sweet potato', body: 'Push 30 cm vine cuttings into a deep pot or sack. Tubers in about four months.', species: ['sweet-potato'], when: months(3, 4, 8) },
    { id: 'acc-ginger', kind: 'plant', title: 'Plant ginger', body: 'Plant budded pieces just before the rains. Dig after 8–10 months, when leaves yellow.', species: ['ginger'], when: months(2, 3) },
    { id: 'acc-caterpillars', outdoorOnly: true, kind: 'protect', title: 'Leaf-eater check', body: 'Rainy weeks bring caterpillars and beetles to greens. Pick them off morning and evening.', species: ['kale', 'chard', 'bok-choy', 'mustard-greens', 'amaranth', 'ayoyo', 'lettuce'], when: months(4, 5, 6, 8, 9) },
    { id: 'acc-beans', kind: 'sow', title: 'Sow beans', body: 'Sow with the rains in free-draining pots. Pick pods young, every few days.', species: BEANS, when: months(3, 4, 8, 9) },

    // The cooler, drier months suit salads, roots and cucumbers (with watering).
    { id: 'acc-sow-salad', kind: 'sow', title: 'Sow salad greens', body: 'Lettuce, rocket and bok choy like the cooler dry months. Light shade, water morning and evening.', species: ['lettuce', 'arugula', 'bok-choy', 'spinach', 'mustard-greens'], when: months(9, 10, 11, 0) },
    { id: 'acc-sow-kale', kind: 'sow', title: 'Sow kale and chard', body: 'Sow as the rains ease. They grow best through the cooler dry season.', species: ['kale', 'chard', 'leek'], when: months(8, 9, 10) },
    { id: 'acc-sow-roots', kind: 'sow', title: 'Sow carrots and radish', body: 'The cooler, drier months suit roots. Sow straight into a deep pot and keep it damp.', species: ROOTS, when: months(9, 10, 11, 0) },
    { id: 'acc-sow-vines', kind: 'sow', title: 'Sow cucumbers', body: 'Drier months mean less mildew. Big pots, a trellis, and water at the base.', species: VINES, when: months(9, 10, 1, 2) },
    { id: 'acc-plant-garlic', kind: 'plant', title: 'Plant garlic', body: 'Worth a try in the cool dry season. Chill cloves in the fridge for a few weeks first.', species: ['garlic'], when: months(10, 11) },
    { id: 'acc-sow-herbs', repeatDays: 21, kind: 'sow', title: 'Sow cilantro and dill', body: 'They bolt in the heat; the harmattan months suit them best. Sow every 3 weeks.', species: ['cilantro', 'dill', 'parsley', 'chives'], when: months(10, 11, 0) },
    { id: 'acc-herb-shade', outdoorOnly: true, kind: 'protect', title: 'Shade soft herbs', body: 'Cilantro, parsley, dill and lettuce bolt in the heat. Morning sun only.', species: ['cilantro', 'parsley', 'dill', 'lettuce', 'lemon-balm'], when: months(1, 2, 3) },
    { id: 'acc-dry-herbs', outdoorOnly: true, kind: 'protect', title: 'Keep herbs dry-footed', body: 'Rosemary, thyme and lavender hate wet roots. Shelter them from downpours.', species: [...MED_HERBS, 'bay-laurel'], when: months(4, 5, 9) },
    { id: 'acc-strawberry', kind: 'care', title: 'Strawberry season', body: 'Lowland heat is hard on strawberries. They do best now, with morning sun only.', species: ['strawberry'], when: months(10, 11, 0, 1) },

    // Fruit.
    { id: 'acc-plant-pineapple', kind: 'plant', title: 'Plant a pineapple top', body: 'Twist off the top, strip the lower leaves, dry 2 days and plant shallow.', species: ['pineapple'], when: months(3, 4) },
    { id: 'acc-passion-train', kind: 'care', title: 'Train passion fruit', body: 'Tie new shoots onto the trellis. Fruit comes on this season’s growth.', species: ['passion-fruit'], when: months(3, 4, 8) },
    { id: 'acc-passion-pick', repeatDays: 2, kind: 'harvest', title: 'Gather passion fruit', body: 'Ripe fruit drops or starts to wrinkle. Check under the vine every day or two.', species: ['passion-fruit'], when: months(5, 6, 7, 10, 11) },
    { id: 'acc-lemon-feed', kind: 'feed', title: 'Feed the lemon', body: 'Citrus feed as the rains start. Lemons often flower after a dry spell.', species: ['meyer-lemon'], when: months(3, 8) },
  ],
};
