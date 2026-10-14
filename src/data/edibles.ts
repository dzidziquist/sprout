import type { ClimateProfile, EdibleStage, SpeciesId } from '../types';

/*
 * Grow patch knowledge for edibles. Facts come from docs/research/notes/edible_container_growing.md
 * and soil_and_seattle.md (RHS, WSU King County, OSU, UMN, UMD, CSU extension guidance). Accra timing
 * is partly inferred in those notes (no MoFA month calendar exists online), so its wording stays gentle.
 */

/** Catalogue id of an edible with a grow guide (see src/data/catalog/edibles.ts). */
export type EdibleId = SpeciesId;
export type HarvestUnit = 'fruit' | 'handful' | 'bunch' | 'grams';

export const HARVEST_UNITS: HarvestUnit[] = ['fruit', 'handful', 'bunch', 'grams'];

export interface StageInfo {
  /** Short label for the stage track (fits under a 30px dot). */
  label: string;
  /** One warm line about what's going on. */
  tip: string;
  /** What to feed during this stage. */
  feed: string;
}

export interface EdibleGuide {
  id: EdibleId;
  /** Stages that apply, in growing order. */
  stages: EdibleStage[];
  info: Partial<Record<EdibleStage, StageInfo>>;
  /** Default unit on the harvest sheet. */
  unit: HarvestUnit;
  /** Spring onions regrow from the roots after a cut. */
  regrows: boolean;
  /** Night low (°C) below which flowers drop / fruit won't set. */
  setNightMinC?: number;
  /** Day high (°C) above which flowers drop. */
  setDayMaxC?: number;
}

const SEED: StageInfo = { label: 'Sow', tip: 'Seeds tucked in. Keep the mix warm and just damp.', feed: 'No feed yet' };

export const EDIBLES: Record<EdibleId, EdibleGuide> = {
  // Any edible not in the catalogue ("Something tasty") gets a simple sow → grow → pick track.
  'other-edible': {
    id: 'other-edible',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: SEED,
      seedling: { label: 'Sprout', tip: 'Give seedlings your brightest spot so they don’t stretch.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Water when the top few cm are dry; more often in warm spells.', feed: 'Balanced feed every 2–3 weeks' },
      flowering: { label: 'Flower', tip: 'Flowers mean fruit or seed is coming. Keep watering even.', feed: 'Balanced feed every 2–3 weeks' },
      harvesting: { label: 'Pick', tip: 'Pick little and often. Log every harvest!', feed: 'Balanced feed every 2–3 weeks' },
      resting: { label: 'Done', tip: 'Season’s over. Compost healthy plants and refresh the mix.', feed: 'No feed' },
    },
  },
  tomato: {
    id: 'tomato',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 13, // 55°F (UF IFAS, MSU, UMD)
    setDayMaxC: 32, // ~90°F (OSU 92°F; CSIR Ghana 32°C)
    info: {
      seed: { ...SEED, tip: 'Needs about 18°C to sprout, usually within two weeks.' },
      seedling: { label: 'Sprout', tip: 'Max light now so it doesn’t get leggy. Pot up at two true leaves.', feed: 'Dilute balanced feed once true leaves show' },
      growing: { label: 'Grow', tip: 'Bury the stem deep when you pot on. Stake it early.', feed: 'Balanced feed, easy on nitrogen' },
      flowering: { label: 'Flower', tip: 'Tap or buzz the flower trusses at midday every 2–3 days.', feed: 'Balanced feed, easy on nitrogen' },
      fruiting: { label: 'Fruit', tip: 'Fruit swelling! Keep watering even so they don’t split.', feed: 'High-potash feed every 10–14 days' },
      harvesting: { label: 'Pick', tip: 'Pick when fully coloured. Green ones ripen indoors in ~2 weeks.', feed: 'High-potash feed every 10–14 days' },
      resting: { label: 'Done', tip: 'Season’s over. Compost healthy vines; bin blighted ones.', feed: 'No feed' },
    },
  },
  pepper: {
    id: 'pepper',
    stages: ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'],
    unit: 'fruit',
    regrows: false,
    setNightMinC: 15.5, // 60°F (UMD, UMN)
    setDayMaxC: 35, // 95°F
    info: {
      seed: { ...SEED, tip: 'Peppers like it hot to sprout: a heat mat at 27–32°C helps. Can take 3 weeks.' },
      seedling: { label: 'Sprout', tip: 'Bright light, warm feet. Ready to move at 5–6 leaves.', feed: 'Dilute balanced feed once true leaves show' },
      growing: { label: 'Grow', tip: 'Out only when nights stay above 10°C. A 3–5 gal pot is plenty.', feed: 'Balanced feed. Too much nitrogen means leaves, no peppers' },
      flowering: { label: 'Flower', tip: 'Flowers drop when nights dip under 15°C. It’s the weather, not you.', feed: 'Balanced feed, easy on nitrogen' },
      fruiting: { label: 'Fruit', tip: 'Pods swelling. Even watering keeps blossom-end rot away.', feed: 'High-potash feed every 10–14 days' },
      harvesting: { label: 'Pick', tip: 'Pick green or wait for colour. Picking keeps the flowers coming.', feed: 'High-potash feed every 10–14 days' },
      resting: { label: 'Winter', tip: 'Overwintering in a bright ~13°C spot. Water every ~2 weeks.', feed: 'No feed till spring' },
    },
  },
  'spring-onion': {
    id: 'spring-onion',
    stages: ['seed', 'seedling', 'growing', 'harvesting'],
    unit: 'bunch',
    regrows: true,
    info: {
      seed: { ...SEED, tip: 'Sow a pinch per spot, ½ cm deep. Or root a store-bought base in water.' },
      seedling: { label: 'Sprout', tip: 'Thin green threads. Keep the pot evenly moist.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Growing back. Scraps regrow in about a week.', feed: 'Light balanced feed monthly' },
      harvesting: { label: 'Snip', tip: 'Cut 2–3 cm above the white base and it’ll grow back.', feed: 'Light balanced feed monthly' },
    },
  },
  basil: {
    id: 'basil',
    stages: ['seed', 'seedling', 'growing', 'harvesting', 'flowering'],
    unit: 'handful',
    regrows: false,
    info: {
      seed: { ...SEED, tip: 'Basil loves warmth. Sow indoors and keep it cosy.' },
      seedling: { label: 'Sprout', tip: 'Sunniest window you have. Water the soil, not the leaves.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Pinch the top above a leaf pair to make it bushy.', feed: 'Balanced feed every 2–3 weeks' },
      harvesting: { label: 'Pick', tip: 'Pick from the top, often. It grows back bushier.', feed: 'Balanced feed every 2–3 weeks' },
      flowering: { label: 'Flower', tip: 'Flowers make leaves bitter. Pinch them off to keep it going.', feed: 'Balanced feed every 2–3 weeks' },
    },
  },
  mint: {
    id: 'mint',
    stages: ['seedling', 'growing', 'harvesting', 'resting'],
    unit: 'handful',
    regrows: false,
    info: {
      seedling: { label: 'Root', tip: 'A fresh cutting or division. Keep it moist while it settles.', feed: 'No feed yet' },
      growing: { label: 'Grow', tip: 'Give it its own pot. Mint wanders.', feed: 'Light balanced feed monthly' },
      harvesting: { label: 'Pick', tip: 'Snip stems often. The more you pick, the more it grows.', feed: 'Light balanced feed monthly' },
      resting: { label: 'Rest', tip: 'Died back for winter. Cut old stems; it returns in spring.', feed: 'No feed' },
    },
  },
};

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
}

const all = (from: number, to: number): TaskWindow[] => Array.from({ length: to - from + 1 }, (_, i) => ({ month: (from + i) % 12 }));
const months = (...ms: number[]): TaskWindow[] => ms.map((month) => ({ month }));

export const CALENDAR: Record<ClimateProfile, CalendarTask[]> = {
  seattle: [
    { id: 'sea-plan', kind: 'care', title: 'Pick your seeds', body: 'Go early and small: cherries like Sungold, Sweet Million or Stupice (≤75 days).', species: ['tomato', 'pepper'], when: months(0, 1) },
    { id: 'sea-overwinter-care', kind: 'care', title: 'Winter pepper check', body: 'Water about every 2 weeks, no feed. Peek under leaves for aphids.', species: ['pepper'], when: months(10, 11, 0, 1, 2) },
    { id: 'sea-sow-onion', kind: 'sow', title: 'Sow spring onions', body: 'They’re hardy. A pinch per spot, ½ cm deep, indoors or out.', species: ['spring-onion'], when: months(1, 2, 3) },
    { id: 'sea-sow-toms', kind: 'sow', title: 'Start seeds indoors', body: '6–8 weeks before mid-May. Peppers want a heat mat at 27–32°C.', species: ['tomato', 'pepper'], when: [{ month: 2, from: 15 }, { month: 3, to: 7 }] },
    { id: 'sea-mint-wake', kind: 'care', title: 'Wake up the mint', body: 'Cut last year’s stems, top up the pot, or split a crowded clump.', species: ['mint'], when: months(2, 3) },
    { id: 'sea-pot-up', kind: 'plant', title: 'Pot up seedlings', body: 'At two true leaves, move each to its own pot. Keep above 16°C.', species: ['tomato', 'pepper'], when: [{ month: 3 }, { month: 4, to: 10 }] },
    { id: 'sea-sow-basil', kind: 'sow', title: 'Sow basil indoors', body: 'Warm windowsill only. It sulks below 10°C.', species: ['basil'], when: months(3, 4) },
    { id: 'sea-peppers-wake', kind: 'care', title: 'Peppers back to warmth', body: 'Move overwintered peppers somewhere warm and bright, and start feeding again.', species: ['pepper'], when: months(3) },
    { id: 'sea-harden', kind: 'plant', title: 'Harden off', body: 'A week of outdoor time, a little longer each day, before planting out.', species: ['tomato', 'pepper', 'basil'], when: [{ month: 3, from: 20 }, { month: 4, to: 20 }] },
    { id: 'sea-plant-toms', kind: 'plant', title: 'Plant tomatoes out', body: 'Once soil hits 10°C (about mid-May). Bury the stem deep, 6+ hours of sun.', species: ['tomato'], when: [{ month: 4, from: 10 }, { month: 5, to: 7 }] },
    { id: 'sea-plant-peps', kind: 'plant', title: 'Peppers out', body: 'Late May or June, when nights stay above 10°C. A cloche helps.', species: ['pepper'], when: [{ month: 4, from: 25 }, { month: 5 }] },
    { id: 'sea-basil-out', kind: 'plant', title: 'Basil outside', body: 'Only once nights are reliably warm. Otherwise the sunniest window.', species: ['basil'], when: months(5) },
    { id: 'sea-feed-start', kind: 'feed', title: 'Start feeding', body: 'Balanced feed while they grow. Switch to high-potash once fruit swells.', species: ['tomato', 'pepper'], when: [{ month: 4, from: 10 }, { month: 5 }] },
    { id: 'sea-pollinate', kind: 'care', title: 'Shake the flowers', body: 'Tap or buzz flower trusses at midday every 2–3 days. Balconies lack bees.', species: ['tomato', 'pepper'], when: months(5, 6, 7) },
    { id: 'sea-water-daily', kind: 'care', title: 'Check pots daily', body: 'Dry summer: a sunny 5-gal pot can drink every day. Keep it even.', species: ['tomato', 'pepper', 'basil', 'mint'], when: months(6, 7) },
    { id: 'sea-basil-pinch', kind: 'harvest', title: 'Pinch basil flowers', body: 'Pick from the top and nip flower spikes so it stays leafy.', species: ['basil'], when: months(6, 7, 8) },
    { id: 'sea-sow-onion-fall', kind: 'sow', title: 'Sow onions for autumn', body: 'A July–August sowing gives snips through autumn and spring.', species: ['spring-onion'], when: months(6, 7) },
    { id: 'sea-feed-stop', kind: 'feed', title: 'Stop feeding', body: 'Mid-August is the cut-off for balcony edibles. Ripening time now.', species: ['tomato', 'pepper'], when: [{ month: 7, from: 10, to: 25 }] },
    { id: 'sea-top-flowers', kind: 'care', title: 'Nip new flowers', body: 'New flowers won’t ripen in time. Pinch them so the plant ripens what’s there.', species: ['tomato'], when: [{ month: 7, from: 15 }, { month: 8, to: 10 }] },
    { id: 'sea-blight', kind: 'protect', title: 'Late blight watch', body: 'Brown blotches on leaves? Bin them. Water the soil, never the leaves.', species: ['tomato'], when: [{ month: 7, from: 15 }, { month: 8 }] },
    { id: 'sea-water-less', kind: 'care', title: 'Ease off watering', body: 'A bit less water from late August pushes ripening. Keep it even though.', species: ['tomato'], when: [{ month: 7, from: 20 }, { month: 8, to: 15 }] },
    { id: 'sea-basil-in', kind: 'protect', title: 'Basil comes inside', body: 'Bring it in before nights drop under 10°C, or take cuttings for the windowsill.', species: ['basil'], when: [{ month: 8, from: 10 }, { month: 9, to: 10 }] },
    { id: 'sea-green-toms', kind: 'harvest', title: 'Pick green tomatoes', body: 'Take every full-size green or blushing one. Ripen at 13–21°C, out of the fridge. ~2 weeks.', species: ['tomato'], when: [{ month: 9 }, { month: 10, to: 10 }] },
    { id: 'sea-overwinter', kind: 'protect', title: 'Bring peppers in', body: 'Pick the last pods, prune to a few Y-branches, check for bugs, then a bright ~13°C spot.', species: ['pepper'], when: [{ month: 9 }, { month: 10, to: 15 }] },
    { id: 'sea-blight-bin', kind: 'care', title: 'Tidy the vines', body: 'Bin blighted vines (don’t compost) and don’t reuse their mix for tomatoes or peppers.', species: ['tomato'], when: [{ month: 9, from: 15 }, { month: 10 }] },
    { id: 'sea-onion-eave', kind: 'protect', title: 'Onions under the eave', body: 'They’re hardy, just not fans of sitting soggy. Or bring a pot to the windowsill.', species: ['spring-onion'], when: months(9, 10) },
    { id: 'sea-onion-winter', kind: 'harvest', title: 'Snip lightly', body: 'Short days mean slow regrowth. Take a little, leave the rest.', species: ['spring-onion'], when: months(11, 0) },
    { id: 'sea-mint-rest', kind: 'care', title: 'Let mint rest', body: 'It dies back for winter. Cut the stems and keep it barely damp.', species: ['mint'], when: months(10, 11) },
  ],
  accra: [
    { id: 'acc-harmattan-water', kind: 'care', title: 'Harmattan watering', body: 'Dry winds empty pots fast. Check daily and mulch the top.', species: ['tomato', 'pepper', 'spring-onion', 'basil', 'mint'], when: [{ month: 11 }, { month: 0 }, { month: 1 }] },
    { id: 'acc-mites', kind: 'protect', title: 'Spider mite check', body: 'Dry air brings mites. Look under leaves for speckles and fine webbing.', species: ['tomato', 'pepper', 'basil'], when: months(11, 0, 1, 2) },
    { id: 'acc-tomato-prime', kind: 'harvest', title: 'Tomato picking time', body: 'Cooler, drier weeks are when tomatoes set best. Pick them fully coloured.', species: ['tomato'], when: months(0, 1) },
    { id: 'acc-shade', kind: 'protect', title: 'Afternoon shade', body: 'Days over 32°C drop tomato flowers. Shade from about 1–4 pm and water evenly.', species: ['tomato', 'mint'], when: months(1, 2, 3) },
    { id: 'acc-peppers-hot', kind: 'care', title: 'Peppers keep going', body: 'Peppers handle the heat better than tomatoes. Keep moisture steady.', species: ['pepper'], when: months(2, 3) },
    { id: 'acc-rains', kind: 'protect', title: 'Rains are back', body: 'Raise pots on feet and clear drainage holes so roots don’t drown.', species: ['tomato', 'pepper', 'spring-onion', 'basil', 'mint'], when: [{ month: 3 }, { month: 8 }] },
    { id: 'acc-heavy-rains', kind: 'protect', title: 'Heavy-rain weeks', body: 'Move pots under cover in downpours. Waterlogging and blight love May–June.', species: ['tomato', 'pepper'], when: months(4, 5) },
    { id: 'acc-gnats', kind: 'care', title: 'Gnat and rot watch', body: 'Pots stay wet in the rains. Let the top dry before watering again.', species: ['basil', 'mint', 'spring-onion'], when: months(4, 5, 9) },
    { id: 'acc-sow-onion', kind: 'sow', title: 'Sow spring onions', body: 'They grow all year here. Shade the seed tray in the hottest weeks.', species: ['spring-onion'], when: months(5, 6, 10) },
    { id: 'acc-sow-pepper', kind: 'sow', title: 'Sow peppers', body: 'Nursery tray now, move to pots at 4–6 true leaves (6–8 weeks).', species: ['pepper'], when: months(3, 7) },
    { id: 'acc-cool-set', kind: 'care', title: 'Little dry season', body: 'The coolest weeks of the year: great for fruit set. Shake flowers at midday.', species: ['tomato', 'pepper'], when: [{ month: 6, from: 15 }, { month: 7 }] },
    { id: 'acc-whitefly', kind: 'protect', title: 'Whitefly watch', body: 'They spread leaf curl virus. Yellow sticky traps, and check leaf undersides.', species: ['tomato', 'pepper'], when: months(8, 9) },
    { id: 'acc-sow-toms', kind: 'sow', title: 'Sow tomatoes', body: 'Start a nursery tray now so fruit lands in the cooler Jan–Feb weeks.', species: ['tomato'], when: [{ month: 9, from: 15 }, { month: 10 }] },
    { id: 'acc-plant-toms', kind: 'plant', title: 'Move tomato seedlings', body: 'Pot on at 4–6 true leaves, deep, into 5 gal pots with fresh mix.', species: ['tomato'], when: [{ month: 10, from: 15 }, { month: 11 }] },
    { id: 'acc-basil-pinch', kind: 'harvest', title: 'Pinch basil weekly', body: 'Warm all year means flowers come fast. Pick tops and nip flower spikes.', species: ['basil'], when: all(0, 11) },
  ],
};
