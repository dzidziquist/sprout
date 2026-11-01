import type { CareEvent, ClimateProfile, Plant } from '../src/types';

/*
 * The knowledge evals: plant situations with the answer the app must (or should) give. They define what
 * "right" means, so a person approves them (evals/CASES.md is the readable list). Every knowledge change
 * runs them (npm test). A `must` case failing blocks the change; `should` cases are scored and the score
 * mustn't drop below the bar in kb.eval.test.ts.
 *
 * Each case says why, in plain words, and where the answer comes from: a page (also in the claims
 * ledger), or "app rule" for PlantFam's own decisions.
 */

export type Level = 'must' | 'should';

interface Base {
  id: string;
  level: Level;
  /** The situation, in plain words. */
  title: string;
  /** Why this answer is right. */
  why: string;
  source: string;
}

/** A plant for a case: a pothos indoors in potting mix unless the case says otherwise. */
export type PlantSpec = Partial<Plant>;

export interface DiagnoseCase extends Base {
  kind: 'diagnose';
  plant: PlantSpec;
  events?: Partial<CareEvent>[];
  climate?: ClimateProfile;
  now: string;
  symptom: string;
  /** Must be the first cause shown. */
  top1?: string;
  /** Each must be among the causes shown (up to 3). */
  inTop3?: string[];
  /** Must not be the first cause shown. */
  notTop1?: string[];
  /** Must not be shown at all. */
  absent?: string[];
}

export interface FeedCase extends Base {
  kind: 'feed';
  plant: PlantSpec;
  events?: Partial<CareEvent>[];
  climate?: ClimateProfile;
  now: string;
  /** The feeding advice shown must match. */
  advice: RegExp;
}

export interface MixCase extends Base {
  kind: 'mix';
  /** A typed brand name and the kind it should fill in (or undefined: not recognised). */
  name?: string;
  kind_?: 'organic' | 'slow' | 'none' | undefined;
  /** Or: how many weeks feeding waits for this plant and mix. */
  speciesId?: Plant['speciesId'];
  mix?: NonNullable<Plant['mix']>;
  weeks?: number;
}

export interface TaskCase extends Base {
  kind: 'tasks';
  plants: PlantSpec[];
  events?: Partial<CareEvent>[];
  climate?: ClimateProfile;
  now: string;
  /** Grow jobs that must be on the list, and ones that mustn't. */
  has?: string[];
  hasNot?: string[];
}

export type EvalCase = DiagnoseCase | FeedCase | MixCase | TaskCase;

const SUMMER = '2026-07-15T12:00:00';
const LATE_NOV = '2026-11-20T12:00:00';
const UC_N = 'https://ipm.ucanr.edu/home-and-landscape/nitrogen-excess/';
const RHS_NUTRIENTS = 'https://www.rhs.org.uk/prevention-protection/nutrient-deficiencies';
const ago = (days: number, from: string) => new Date(new Date(from).getTime() - days * 86_400_000).toISOString();
const checks = (from: string, ...results: ('dry' | 'damp' | 'soggy')[]) =>
  results.map((result, i) => ({ type: 'check' as const, result, at: ago(3 + i * 5, from) }));
const tomato: PlantSpec = { speciesId: 'tomato', soil: 'veg_mix', stage: 'fruiting', placement: 'indoor', light: 'direct', potDiameterCm: 32 };
const ocean = (pottedAt: string): NonNullable<Plant['mix']> => ({ name: 'FoxFarm Ocean Forest', fertiliser: 'yes', kind: 'organic', pottedAt });

export const CASES: EvalCase[] = [
  // ——— Plant doctor: watering ———
  { id: 'wet-yellow-lower', kind: 'diagnose', level: 'must', title: 'Pothos, last checks found the soil damp or soggy, lower leaves yellowing', why: 'Soil that keeps checking wet points to too much water, the most common cause of yellow lower leaves.', source: 'app rule', plant: {}, events: checks(SUMMER, 'soggy', 'damp', 'damp'), now: SUMMER, symptom: 'yellow-lower', top1: 'overwatering' },
  { id: 'dry-drooping', kind: 'diagnose', level: 'must', title: 'Pothos, last checks found it bone dry, drooping', why: 'A plant that keeps drying right out and droops is thirsty.', source: 'app rule', plant: {}, events: checks(SUMMER, 'dry', 'dry', 'dry'), now: SUMMER, symptom: 'drooping', top1: 'underwatering' },
  { id: 'wet-drooping-not-thirst', kind: 'diagnose', level: 'must', title: 'Pothos drooping while the soil keeps checking soggy', why: 'Wilting in wet soil means the roots are struggling, not thirst: telling them to water would make it worse.', source: 'app rule', plant: {}, events: checks(SUMMER, 'soggy', 'soggy', 'damp'), now: SUMMER, symptom: 'drooping', notTop1: ['underwatering', 'low-water'] },
  { id: 'snake-mushy', kind: 'diagnose', level: 'must', title: 'Snake plant with a soft, mushy base', why: 'Snake plants rot from too much water far more than anything else.', source: 'app rule', plant: { speciesId: 'snake' }, events: checks(SUMMER, 'damp', 'damp'), now: SUMMER, symptom: 'mushy-stem', inTop3: ['root-rot'] },
  { id: 'soil-smell-rot', kind: 'diagnose', level: 'must', title: 'Soil smells sour and stays wet', why: 'A sour smell and wet soil mean roots are rotting or the soil is waterlogged.', source: 'app rule', plant: {}, events: checks(SUMMER, 'soggy', 'damp'), now: SUMMER, symptom: 'soil-smell', inTop3: ['root-rot', 'overwatering'] },
  { id: 'water-runs-through', kind: 'diagnose', level: 'should', title: 'Water runs straight through, soil shrinking from the pot', why: 'Dried-out mix stops soaking up water; a pot full of roots does the same.', source: 'app rule', plant: {}, events: checks(SUMMER, 'dry', 'dry'), now: SUMMER, symptom: 'soil-dry', top1: 'underwatering' },
  { id: 'old-mix-small-pot-no-growth', kind: 'diagnose', level: 'should', title: 'Pothos in a 10 cm pot, same mix for over two years, not growing', why: 'A plant left in the same small pot fills it with roots and runs short of food, so growth stalls.', source: 'https://hort.extension.wisc.edu/articles/houseplant-care/', plant: { potDiameterCm: 10, lastRepottedAt: '2024-05-01T00:00:00.000Z' }, now: SUMMER, symptom: 'no-growth', top1: 'pot-bound' },
  { id: 'water-jar-late-drooping', kind: 'diagnose', level: 'should', title: 'Pothos growing in a jar of water in July, top-up check over a week late, drooping', why: 'A plant in plain water needs its roots covered: when the water line drops below them, it can’t drink.', source: 'https://hgic.clemson.edu/how-to-grow-and-care-for-lucky-bamboo-dracaena-sanderiana/', plant: { soil: 'water', nextCheckAt: ago(8, SUMMER) }, now: SUMMER, symptom: 'drooping', top1: 'low-water' },

  // ——— Plant doctor: light and air ———
  { id: 'leggy-low-light', kind: 'diagnose', level: 'must', title: 'Pothos in a dim spot, tall and leggy', why: 'Stretching with long gaps between leaves is the classic sign of too little light.', source: 'app rule', plant: { light: 'low' }, now: SUMMER, symptom: 'leggy', top1: 'low-light' },
  { id: 'bleached-direct-sun', kind: 'diagnose', level: 'must', title: 'Calathea in direct sun with bleached, scorched patches', why: 'Shade lovers scorch in direct sun.', source: 'app rule', plant: { speciesId: 'calathea', light: 'direct' }, now: SUMMER, symptom: 'bleached', top1: 'sunburn' },
  { id: 'calathea-tips', kind: 'diagnose', level: 'should', title: 'Calathea with brown, crispy tips', why: 'Calatheas react to the salts in tap water and to dry air.', source: 'app rule', plant: { speciesId: 'calathea' }, now: SUMMER, symptom: 'brown-tips', inTop3: ['tap-water'] },
  { id: 'fern-tips-dry-air', kind: 'diagnose', level: 'should', title: 'Boston fern with crispy tips', why: 'Ferns crisp up quickly in dry air.', source: 'app rule', plant: { speciesId: 'boston-fern' }, now: SUMMER, symptom: 'brown-tips', inTop3: ['dry-air'] },
  { id: 'no-growth-winter-dark', kind: 'diagnose', level: 'should', title: 'Pothos in a dim spot not growing in November', why: 'Low light and the dark season stop growth; it isn’t usually a disease.', source: 'app rule', plant: { light: 'low' }, climate: 'seattle', now: LATE_NOV, symptom: 'no-growth', top1: 'low-light' },
  { id: 'outdoor-tropical-nov-dropping', kind: 'diagnose', level: 'should', title: 'Pothos left outside in Seattle in late November, leaves falling off', why: 'Tropical houseplants dislike cold nights and chilling makes leaves drop; they should come in as night lows dip toward 10 °C (50 °F).', source: 'https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', plant: { placement: 'outdoor' }, climate: 'seattle', now: LATE_NOV, symptom: 'dropping', top1: 'cold' },
  { id: 'new-plant-dropping', kind: 'diagnose', level: 'should', title: 'Pothos brought home 10 days ago, dropping a few leaves', why: 'A new home is a shock: many new plants drop a few leaves for up to about three weeks while they adjust.', source: 'https://hgic.clemson.edu/factsheet/houseplant-diseases-disorders/', plant: { acquiredAt: ago(10, SUMMER), createdAt: ago(10, SUMMER) }, now: SUMMER, symptom: 'dropping', top1: 'shock' },
  { id: 'yellow-lower-old-leaves', kind: 'diagnose', level: 'should', title: 'Pothos with nothing logged out of the ordinary, a lower leaf yellowing', why: 'Plants retire their oldest leaves now and then, so normal ageing must be in the running.', source: 'https://hort.extension.wisc.edu/analyzing-reasons-for-yellow-leaves/', plant: {}, now: SUMMER, symptom: 'yellow-lower', inTop3: ['old-leaves'] },
  { id: 'curling-direct-sun-summer', kind: 'diagnose', level: 'should', title: 'Pothos in direct sun in July, leaves curling', why: 'Leaves rolling and wilting in a very hot room in mid-summer suggest heat stress, so it must be in the running.', source: 'https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant', plant: { light: 'direct' }, now: SUMMER, symptom: 'curling', inTop3: ['heat-stress'] },

  // ——— Plant doctor: pests ———
  { id: 'webbing-mites', kind: 'diagnose', level: 'must', title: 'Fine webbing under the leaves', why: 'Webbing is the giveaway for spider mites.', source: 'app rule', plant: {}, now: SUMMER, symptom: 'webbing', top1: 'spider-mites' },
  { id: 'cotton-mealybugs', kind: 'diagnose', level: 'must', title: 'White cottony bits in the leaf joints', why: 'Cottony fluff in the joints is mealybugs.', source: 'app rule', plant: {}, now: SUMMER, symptom: 'cotton', top1: 'mealybugs' },
  { id: 'flies-gnats', kind: 'diagnose', level: 'must', title: 'Tiny black flies around wet soil', why: 'Little flies from the soil are fungus gnats, which breed in damp mix.', source: 'app rule', plant: {}, events: checks(SUMMER, 'damp', 'damp'), now: SUMMER, symptom: 'tiny-flies', top1: 'fungus-gnats' },
  { id: 'bumps-scale', kind: 'diagnose', level: 'must', title: 'Brown bumps stuck to the stems', why: 'Little shells on stems and veins are scale insects.', source: 'app rule', plant: {}, now: SUMMER, symptom: 'bumps', top1: 'scale' },
  { id: 'powder-mildew', kind: 'diagnose', level: 'must', title: 'White powder on the leaves', why: 'A flour-like dusting is powdery mildew.', source: 'app rule', plant: {}, now: SUMMER, symptom: 'white-powder', top1: 'powdery-mildew' },
  { id: 'clusters-aphids', kind: 'diagnose', level: 'must', title: 'Clusters of small green bugs on new growth', why: 'Clusters on soft new growth are aphids.', source: 'app rule', plant: {}, now: SUMMER, symptom: 'clusters', top1: 'aphids' },
  { id: 'holes-outside', kind: 'diagnose', level: 'should', title: 'Holes in the leaves of a plant outside', why: 'Outside, holes are usually slugs, snails or caterpillars.', source: 'app rule', plant: { placement: 'outdoor' }, now: SUMMER, symptom: 'holes', top1: 'pests-chewing' },
  { id: 'silvery-streaks-thrips', kind: 'diagnose', level: 'should', title: 'Pothos indoors with silvery streaks and tiny black dots on the leaves', why: 'Silvery streaks marked with tiny black specks are thrips damage.', source: 'https://www.rhs.org.uk/biodiversity/thrips', plant: {}, now: SUMMER, symptom: 'speckled', inTop3: ['thrips'] },
  { id: 'spots-outdoor-tomato-wet', kind: 'diagnose', level: 'should', title: 'Tomato outside, soil checking damp, brown spots on the leaves', why: 'Leaf spot fungi spread in splashing water and need leaves to stay wet for hours, which rain and dew give outdoor plants.', source: 'https://ipm.ucanr.edu/PMG/PESTNOTES/pn74172.html', plant: { ...tomato, placement: 'outdoor' }, events: checks(SUMMER, 'damp', 'damp'), now: SUMMER, symptom: 'brown-spots', top1: 'leaf-spot' },
  { id: 'white-specks-tomato-whitefly', kind: 'diagnose', level: 'should', title: 'Tomato indoors, a cloud of white specks flies up when it’s brushed', why: 'Clouds of small white insects flying up from a disturbed plant are whitefly, and tomatoes and peppers are among their favourites.', source: 'https://www.rhs.org.uk/biodiversity/glasshouse-whitefly', plant: { ...tomato }, now: SUMMER, symptom: 'white-flies', top1: 'whitefly' },

  // ——— Plant doctor: feeding (fresh mix, spent mix, too much) ———
  { id: 'fresh-mix-not-hungry', kind: 'diagnose', level: 'must', title: 'Tomato potted 10 days ago in FoxFarm Ocean Forest, lower leaves yellowing', why: 'Fresh mix with fertiliser in it is still feeding the plant, so "hungry" would be wrong advice.', source: 'app rule', plant: { ...tomato, mix: ocean(ago(10, LATE_NOV)) }, climate: 'seattle', now: LATE_NOV, symptom: 'yellow-lower', absent: ['hungry'] },
  { id: 'spent-mix-hungry', kind: 'diagnose', level: 'must', title: 'Tomato fruiting, in Ocean Forest since 7 weeks ago, never fed, lower leaves yellowing', why: 'Rich organic mix is spent in about a month; a fruiting plant with nothing since is likely hungry.', source: 'app rule', plant: { ...tomato, mix: ocean(ago(49, LATE_NOV)) }, climate: 'seattle', now: LATE_NOV, symptom: 'yellow-lower', inTop3: ['hungry'] },
  { id: 'fed-on-fresh-mix-tips', kind: 'diagnose', level: 'must', title: 'Tomato fed a few days after potting into Ocean Forest, now brown leaf tips', why: 'Feeding on top of rich fresh mix builds up salts that burn leaf tips and edges.', source: UC_N, plant: { ...tomato, mix: ocean(ago(14, LATE_NOV)) }, events: [{ type: 'feed', at: ago(9, LATE_NOV) }], climate: 'seattle', now: LATE_NOV, symptom: 'brown-tips', top1: 'overfed' },
  { id: 'crust-overfed', kind: 'diagnose', level: 'should', title: 'White crust on the soil of a plant fed three times in six weeks', why: 'A chalky crust after frequent feeding is fertiliser salt.', source: UC_N, plant: { ...tomato }, events: [{ type: 'feed', at: ago(5, SUMMER) }, { type: 'feed', at: ago(19, SUMMER) }, { type: 'feed', at: ago(33, SUMMER) }], now: SUMMER, symptom: 'soil-crust', inTop3: ['overfed'] },
  { id: 'yellow-veins-mg', kind: 'diagnose', level: 'must', title: 'Fruiting tomato yellowing between the veins', why: 'Yellow between green veins on older leaves is the sign of magnesium shortage, common on tomatoes.', source: RHS_NUTRIENTS, plant: { ...tomato }, now: SUMMER, symptom: 'yellow-veins', top1: 'magnesium' },
  { id: 'leafy-no-fruit-n', kind: 'diagnose', level: 'must', title: 'Big, very green tomato with few flowers or fruit', why: 'Too much nitrogen pushes leaves at the expense of fruit.', source: UC_N, plant: { ...tomato }, now: SUMMER, symptom: 'leafy-no-fruit', top1: 'too-much-nitrogen' },
  { id: 'leafy-no-fruit-dim', kind: 'diagnose', level: 'should', title: 'Tomato in a dim spot, lots of leaves, little fruit', why: 'Too little light also means leaves over fruit, so it must be in the running.', source: 'app rule', plant: { ...tomato, light: 'low' }, now: SUMMER, symptom: 'leafy-no-fruit', inTop3: ['low-light'] },
  { id: 'purple-cold', kind: 'diagnose', level: 'should', title: 'Pepper outside in November with a purple tinge', why: 'Cold roots can’t take up phosphorus, so leaves go purple in cool spells.', source: 'app rule', plant: { speciesId: 'pepper', soil: 'veg_mix', placement: 'outdoor', stage: 'growing' }, climate: 'seattle', now: LATE_NOV, symptom: 'purple-leaves', top1: 'purple-cold' },

  // ——— Plant doctor: fruit ———
  { id: 'ber-dry', kind: 'diagnose', level: 'must', title: 'Tomato drying out between waterings, dark patch on the bottom of fruit', why: 'Blossom end rot comes from uneven watering stopping calcium reaching the fruit.', source: 'app rule', plant: { ...tomato }, events: checks(SUMMER, 'dry', 'dry'), now: SUMMER, symptom: 'fruit-rot-end', top1: 'blossom-end-rot' },
  { id: 'ber-pepper-pot', kind: 'diagnose', level: 'should', title: 'Pepper fruiting in a pot outside in summer, soil swinging between dry and soggy, dark patch on the bottom of fruit', why: 'Blossom end rot hits peppers as well as tomatoes, and a root zone that dries out then stays soaked brings it on.', source: 'https://ipm.ucanr.edu/home-and-landscape/blossom-end-rot/', plant: { speciesId: 'pepper', soil: 'veg_mix', stage: 'fruiting', placement: 'outdoor', light: 'direct', potDiameterCm: 25 }, events: checks(SUMMER, 'dry', 'soggy', 'dry'), now: SUMMER, symptom: 'fruit-rot-end', top1: 'blossom-end-rot' },
  { id: 'split-fruit', kind: 'diagnose', level: 'should', title: 'Tomato fruit cracking after a dry spell', why: 'Fruit splits when a thirsty plant suddenly gets a lot of water.', source: 'app rule', plant: { ...tomato }, events: checks(SUMMER, 'dry'), now: SUMMER, symptom: 'fruit-split', top1: 'splitting' },
  { id: 'flower-drop-indoor-summer', kind: 'diagnose', level: 'should', title: 'Tomato fruiting indoors in July, flowers dropping without setting fruit', why: 'Days above about 29 °C (85 °F) or nights above 21 °C (70 °F) make tomatoes drop flowers, and indoors there is no wind to shake the pollen.', source: 'https://hgic.clemson.edu/why-did-my-tomatoes-stop-producing-fruit/', plant: { ...tomato }, now: SUMMER, symptom: 'flower-drop', top1: 'flower-drop' },
  { id: 'bolting-lettuce', kind: 'diagnose', level: 'must', title: 'Lettuce shooting up a flower stalk in summer', why: 'Long, hot days make leafy greens bolt.', source: 'app rule', plant: { speciesId: 'lettuce', soil: 'veg_mix', stage: 'harvesting', placement: 'outdoor' }, now: SUMMER, symptom: 'bolting', top1: 'bolting' },

  // ——— Plant doctor: never show the wrong kind of advice ———
  { id: 'water-plant-no-soil-advice', kind: 'diagnose', level: 'must', title: 'Plant growing in water, drooping', why: 'A plant in water has no soil, so soil advice (repot, feel the soil) must never show.', source: 'app rule', plant: { speciesId: 'pothos', soil: 'water' }, now: SUMMER, symptom: 'drooping', absent: ['underwatering', 'overwatering', 'pot-bound'] },

  // ——— Feeding advice ———
  { id: 'feed-dark-indoor-tomato', kind: 'feed', level: 'must', title: 'Tomato fruiting indoors in Seattle in late November, mix spent', why: 'Short days mean slow growth: half strength, half as often.', source: 'app rule', plant: { ...tomato, mix: ocean(ago(60, LATE_NOV)) }, climate: 'seattle', now: LATE_NOV, advice: /^Half-strength tomato feed every 2 weeks/ },
  { id: 'feed-fresh-mix-waits', kind: 'feed', level: 'must', title: 'Tomato potted into Ocean Forest 10 days ago', why: 'The fresh mix still feeds it; feeding now risks too much.', source: 'app rule', plant: { ...tomato, mix: ocean(ago(10, LATE_NOV)) }, climate: 'seattle', now: LATE_NOV, advice: /^Not yet: the fresh mix feeds it till about/ },
  { id: 'feed-summer-outdoor-window', kind: 'feed', level: 'must', title: 'Tomato fruiting on a Seattle balcony in July', why: 'Summer fruiting crops outside get the usual tomato feed.', source: 'app rule', plant: { ...tomato, placement: 'covered_outdoor' }, climate: 'seattle', now: SUMMER, advice: /High-potash feed every 10–14 days/ },
  { id: 'feed-outdoor-after-window', kind: 'feed', level: 'must', title: 'Tomato fruiting on a Seattle balcony in late November', why: 'Outside, the feeding window closed in mid-August.', source: 'app rule', plant: { ...tomato, placement: 'covered_outdoor' }, climate: 'seattle', now: LATE_NOV, advice: /^(Feeding paused for winter|No feed now)/ },
  { id: 'feed-accra-no-dark', kind: 'feed', level: 'should', title: 'Tomato fruiting indoors in Accra in November', why: 'Accra has no dark season, so the usual tomato feed.', source: 'app rule', plant: { ...tomato }, climate: 'accra', now: LATE_NOV, advice: /High-potash feed every 10–14 days/ },
  { id: 'feed-next-due', kind: 'feed', level: 'should', title: 'Indoor tomato in late November fed 5 days ago', why: 'Says when the next half-strength feed falls.', source: 'app rule', plant: { ...tomato, mix: ocean(ago(60, LATE_NOV)) }, events: [{ type: 'feed', at: ago(5, LATE_NOV) }], climate: 'seattle', now: LATE_NOV, advice: /every 2 weeks · next about/ },

  // ——— Mixes ———
  { id: 'mix-ocean-forest', kind: 'mix', level: 'must', title: 'Typing "foxfarm ocean forest"', why: 'Ocean Forest is a rich organic mix.', source: 'FoxFarm Ocean Forest label', name: 'foxfarm ocean forest', kind_: 'organic' },
  { id: 'mix-happy-frog', kind: 'mix', level: 'must', title: 'Typing "Happy Frog potting soil"', why: 'Happy Frog is a rich organic mix.', source: 'FoxFarm Happy Frog label', name: 'Happy Frog potting soil', kind_: 'organic' },
  { id: 'mix-miracle-gro', kind: 'mix', level: 'must', title: 'Typing "Miracle Gro potting mix"', why: 'Miracle-Gro mixes carry slow-release food.', source: 'Miracle-Gro Potting Mix label', name: 'Miracle Gro potting mix', kind_: 'slow' },
  { id: 'mix-unknown', kind: 'mix', level: 'must', title: 'Typing an unknown local compost', why: 'Never guess a mix we don’t know.', source: 'app rule', name: 'Bob’s backyard compost', kind_: undefined },
  { id: 'wait-organic', kind: 'mix', level: 'must', title: 'Tomato in rich organic mix', why: 'Rich organic food is spent in about a month.', source: 'app rule', speciesId: 'tomato', mix: { fertiliser: 'yes', kind: 'organic', pottedAt: SUMMER }, weeks: 4 },
  { id: 'wait-slow-fruiting', kind: 'mix', level: 'must', title: 'Tomato in slow-release mix that says 6 months', why: 'A pot rinses it out sooner, and fruit needs more potash: about 8 weeks.', source: 'app rule', speciesId: 'tomato', mix: { fertiliser: 'yes', kind: 'slow', bagMonths: 6, pottedAt: SUMMER }, weeks: 8 },
  { id: 'wait-slow-houseplant', kind: 'mix', level: 'must', title: 'Pothos in slow-release mix', why: 'About 3 months for plants that aren’t heavy feeders.', source: 'app rule', speciesId: 'pothos', mix: { fertiliser: 'yes', kind: 'slow', pottedAt: SUMMER }, weeks: 13 },
  { id: 'wait-unsure', kind: 'mix', level: 'must', title: 'Fertiliser in the mix, kind not known', why: 'The short wait: a reminder a little early does less harm than starving a hungry crop.', source: 'app rule', speciesId: 'tomato', mix: { fertiliser: 'yes', pottedAt: SUMMER }, weeks: 4 },

  // ——— Grow patch jobs ———
  { id: 'tasks-dark-half-strength', kind: 'tasks', level: 'must', title: 'Fruiting tomato indoors, Seattle, late November, mix spent', why: 'The slow, half-strength feed job, not the summer one.', source: 'app rule', plants: [{ ...tomato, mix: ocean(ago(60, LATE_NOV)) }], climate: 'seattle', now: LATE_NOV, has: ['stage-potash-slow'], hasNot: ['stage-potash'] },
  { id: 'tasks-fresh-mix-no-feed', kind: 'tasks', level: 'must', title: 'Fruiting tomato indoors, potted into Ocean Forest 10 days ago', why: 'No feed job while the fresh mix feeds it.', source: 'app rule', plants: [{ ...tomato, mix: ocean(ago(10, LATE_NOV)) }], climate: 'seattle', now: LATE_NOV, hasNot: ['stage-potash', 'stage-potash-slow'] },
  { id: 'tasks-fed-recently', kind: 'tasks', level: 'must', title: 'Fruiting tomato indoors fed 3 days ago', why: 'Just fed: no feed job until it’s due again.', source: 'app rule', plants: [{ ...tomato, mix: ocean(ago(60, LATE_NOV)) }], events: [{ type: 'feed', at: ago(3, LATE_NOV) }], climate: 'seattle', now: LATE_NOV, hasNot: ['stage-potash-slow'] },
  { id: 'tasks-shake-flowers', kind: 'tasks', level: 'should', title: 'Tomato flowering indoors in November', why: 'Indoors there are no bees: shake the flowers.', source: 'app rule', plants: [{ ...tomato, stage: 'flowering' }], climate: 'seattle', now: LATE_NOV, has: ['stage-pollinate'] },
];
