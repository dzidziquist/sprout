/*
 * The plant doctor's knowledge: what people see, what usually causes it, how to tell, and what to do.
 * Plain data so it's easy to grow and to test. The engine (src/engine/diagnose.ts) scores the causes
 * for a symptom using what the app already knows about the plant.
 *
 * House rules for the copy: say "possible cause", start with the common care mistakes before rare
 * diseases, give checks the person can actually do, and never give pesticide doses.
 */

export type SymptomArea = 'leaves' | 'stems' | 'soil' | 'bugs' | 'fruit';

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
    summary: 'The roots are sitting wet for too long and can’t breathe. The most common houseplant problem by far.',
    check: ['Push a finger 5 cm (2 in) into the soil. Still damp days after watering?', 'Lift the pot: heavy and cold means it’s still wet.', 'Is there water sitting in the saucer or cover pot?'],
    fix: ['Hold off watering until the top few cm are dry.', 'Empty the saucer after every watering.', 'Make sure the pot has a drainage hole.', 'Move it somewhere a little brighter so it drinks faster.'],
    signals: [WET, SOGGY, SLOW, { signal: 'plasticPot', weight: 1.2, why: 'Plastic pots hold moisture longer than clay.' }, { signal: 'lowLight', weight: 1.3, why: 'In low light it uses water slowly.' }, { signal: 'succulent', weight: 1.4, why: 'Succulents want to dry right out between drinks.' }, { signal: 'dryChecks', weight: 0.4, why: '' }],
    tweak: 'slow-water',
  },
  'root-rot': {
    id: 'root-rot',
    soilOnly: true,
    title: 'Root rot',
    summary: 'Roots that stayed wet too long have started to rot, so the plant can’t drink even though the soil is wet.',
    check: ['Slide the plant out of its pot. Healthy roots are firm and pale; rotten ones are brown, mushy and smell bad.', 'Is the base of the stem soft or dark?'],
    fix: ['Trim off every mushy root with clean scissors.', 'Repot into fresh, airy mix in a pot with drainage.', 'Water lightly and wait until it dries before the next drink.', 'If most roots are gone, save a healthy stem as a cutting.'],
    signals: [SOGGY, WET, SLOW, { signal: 'oldMix', weight: 1.4, why: 'Old mix packs down and stays soggy.' }, { signal: 'succulent', weight: 1.3, why: 'Succulents rot quickly when kept wet.' }, { signal: 'dryChecks', weight: 0.3, why: '' }],
    tweak: 'slow-water',
    rescue: true,
  },
  underwatering: {
    id: 'underwatering',
    soilOnly: true,
    title: 'Thirsty',
    summary: 'The soil has been drying out completely, so the plant is losing water faster than it gets it.',
    check: ['Is the soil dry and pulling away from the sides of the pot?', 'Does the pot feel light?', 'Do the leaves perk up a few hours after a good drink?'],
    fix: ['Water slowly until it runs out of the bottom.', 'If the soil is rock hard, soak the pot in a bowl of water for 20 minutes.', 'Check a little sooner from now on.'],
    signals: [DRY, LATE, { signal: 'terracotta', weight: 1.2, why: 'Clay pots dry out fast.' }, { signal: 'smallPot', weight: 1.2, why: 'Small pots dry out fast.' }, { signal: 'hotSeason', weight: 1.3, why: 'It’s the hot season, so it drinks more.' }, { signal: 'moistureLover', weight: 1.3, why: 'It likes to stay lightly damp.' }, { signal: 'wetChecks', weight: 0.3, why: '' }, { signal: 'reservoir', weight: 0.5, why: '' }],
    tweak: 'more-water',
  },
  'stale-water': {
    id: 'stale-water',
    waterOnly: true,
    title: 'Stale water or rotting roots',
    summary: 'Water that sits too long goes stale and loses its oxygen, and roots start to rot. Healthy roots in water are firm and white or tan.',
    check: ['Is the water cloudy, slimy or smelly?', 'Lift the plant out: are any roots brown, mushy or falling apart?', 'For LECA: is the water line above the bottom third of the roots?'],
    fix: ['Rinse the roots and the container, and refill with fresh room-temperature water.', 'Snip off mushy roots with clean scissors.', 'Swap the water every week or two, and keep the water line low in LECA so upper roots get air.', 'If most roots are gone, save a healthy stem as a cutting.'],
    signals: [{ signal: 'reservoir', weight: 1.5, why: 'It grows in water or LECA, where stale water is the usual culprit.' }, { signal: 'hotSeason', weight: 1.3, why: 'Warm water goes stale faster.' }],
    rescue: true,
  },
  'low-water': {
    id: 'low-water',
    waterOnly: true,
    title: 'Water line too low',
    summary: 'The reservoir ran low, so the roots couldn’t reach the water.',
    check: ['Where is the water line compared with the roots?', 'Has it been a while since the last top-up?'],
    fix: ['Top up to the line: about a third of the way up the roots for LECA, or just covering the roots in water.', 'Check the water line a little more often in warm weather.'],
    signals: [LATE, { signal: 'hotSeason', weight: 1.4, why: 'Reservoirs empty fast in the heat.' }],
    tweak: 'more-water',
  },
  'low-light': {
    id: 'low-light',
    title: 'Not enough light',
    summary: 'The plant can’t make enough food, so it stretches toward the light and drops older leaves.',
    check: ['Could you comfortably read a book in that spot at midday?', 'Is new growth smaller, paler or further apart than old growth?', 'Is it leaning toward the window?'],
    fix: ['Move it closer to a window: within about 1 m (3 ft) of a bright one.', 'Turn the pot a quarter turn each week.', 'In the dark months a small grow light helps a lot.'],
    signals: [{ signal: 'lowLight', weight: 2.5, why: 'Its spot is set to low light.' }, { signal: 'slowSeason', weight: 1.3, why: 'Days are short right now.' }, { signal: 'succulent', weight: 1.5, why: 'Succulents need lots of light.' }, { signal: 'directSun', weight: 0.3, why: '' }],
  },
  sunburn: {
    id: 'sunburn',
    title: 'Too much sun',
    summary: 'Strong direct sun has scorched the leaves. Burned patches won’t turn green again, but new leaves will be fine.',
    check: ['Are the pale or brown patches on the side facing the window?', 'Did you move it somewhere sunnier lately, or put it outside?'],
    fix: ['Move it back a little from the window, or use a sheer curtain.', 'Bring plants into the sun gradually over a week or two.', 'Trim badly burned leaves if they bother you.'],
    signals: [{ signal: 'directSun', weight: 2.5, why: 'Its spot gets direct sun.' }, { signal: 'shadeLover', weight: 1.8, why: 'It naturally grows in shade.' }, { signal: 'newPlant', weight: 1.3, why: 'It’s still getting used to your light.' }, { signal: 'hotSeason', weight: 1.3, why: 'Summer sun is strongest.' }, { signal: 'lowLight', weight: 0.2, why: '' }],
  },
  'dry-air': {
    id: 'dry-air',
    title: 'Dry air',
    summary: 'Indoor air, especially with heating or air con on, pulls moisture out of thin leaves faster than the roots replace it.',
    check: ['Is it near a heater, radiator, vent or air conditioner?', 'Are only the very tips and edges crispy, with the rest healthy?'],
    fix: ['Move it away from heaters and vents.', 'Group plants together, or stand the pot on a tray of wet pebbles.', 'A bathroom or kitchen with a window is a happy spot.', 'Trim crispy tips with clean scissors, following the leaf shape.'],
    signals: [{ signal: 'moistureLover', weight: 1.6, why: 'It likes humid air.' }, { signal: 'shadeLover', weight: 1.3, why: 'Thin-leaved shade plants feel dry air first.' }, { signal: 'slowSeason', weight: 1.3, why: 'Heating dries the air in the cold months.' }, { signal: 'indoor', weight: 1.2, why: '' }, { signal: 'succulent', weight: 0.2, why: '' }],
  },
  'tap-water': {
    id: 'tap-water',
    title: 'Salts and chlorine in tap water',
    summary: 'Some plants are sensitive to the salts, chlorine and fluoride in tap water and fertiliser. They build up and burn the leaf tips.',
    check: ['Do you see a white crust on the soil or the pot rim?', 'Are the tips brown even though the soil moisture is right?'],
    fix: ['Use rainwater, filtered water, or tap water left out overnight.', 'Once a month, flush the pot: run water through it for a minute, then let it drain.', 'Go easy on fertiliser.'],
    signals: [{ signal: 'tapSensitive', weight: 3.2, why: 'This plant is known for reacting to tap water.' }, { signal: 'oldMix', weight: 1.4, why: 'Salts build up in old mix.' }, { signal: 'reservoir', weight: 1.3, why: 'Salts concentrate in reservoirs as water evaporates.' }],
  },
  hungry: {
    id: 'hungry',
    title: 'Hungry',
    summary: 'The plant has used up the nutrients in its mix. Older leaves turn pale yellow first, as it moves food to new growth.',
    check: ['Is the yellowing even across the whole leaf, starting with the oldest ones?', 'When did you last feed it, or give it fresh mix?'],
    fix: ['Feed with a balanced fertiliser at half strength while it’s growing.', 'Repot into fresh mix if it’s been more than a year.', 'Don’t feed a dry plant: water first, then feed.'],
    signals: [{ signal: 'unfed', weight: 1.6, why: 'No feed logged in a couple of months.' }, { signal: 'mixSpent', weight: 1.8, why: 'The food in its fresh mix has likely run out, and no feed is logged since.' }, { signal: 'freshMix', weight: 0.3, why: '' }, { signal: 'fedRecently', weight: 0.5, why: '' }, { signal: 'oldMix', weight: 1.7, why: 'Its mix is over a year old.' }, { signal: 'edible', weight: 1.5, why: 'Edibles are hungry growers.' }, { signal: 'fruiting', weight: 1.5, why: 'Making fruit takes a lot of food.' }, { signal: 'reservoir', weight: 1.3, why: 'Water and LECA plants need all their food from you.' }, { signal: 'slowSeason', weight: 0.7, why: '' }],
  },
  overfed: {
    id: 'overfed',
    title: 'Too much fertiliser',
    summary: 'Food added on top of a rich mix, or too often, leaves salts in the pot that burn the roots. Tips brown, leaves wilt even in wet soil, and a white crust can form.',
    check: ['Was it fed while its mix was still fresh, or more than once in a couple of weeks?', 'Is there a white crust on the soil or the pot rim?', 'Do the brown edges start at the tips of older leaves?'],
    fix: ['Flush the pot: run plenty of plain water through it, let it drain fully, and repeat once.', 'Skip feeding for a few weeks.', 'From then on, feed at half strength and only while it’s growing.'],
    signals: [{ signal: 'overFed', weight: 3, why: 'It’s been fed on top of fresh mix, or several times lately.' }, { signal: 'freshMix', weight: 1.6, why: 'Its fresh mix still carries plenty of food.' }, { signal: 'fedRecently', weight: 1.5, why: 'It was fed recently.' }, { signal: 'slowSeason', weight: 1.3, why: 'Slow winter growth uses little food, so it builds up.' }, { signal: 'unfed', weight: 0.2, why: '' }, { signal: 'mixSpent', weight: 0.4, why: '' }],
  },
  'too-much-nitrogen': {
    id: 'too-much-nitrogen',
    title: 'Too much nitrogen',
    summary: 'Lots of lush, dark leaves but few flowers or fruit. Rich mixes and general-purpose feeds push leaves at the expense of fruit.',
    check: ['Is the plant big and very green, with few flowers?', 'Is it being fed a general or leafy-greens feed rather than a tomato feed?'],
    fix: ['Switch to a tomato (high-potash) feed once flowers appear.', 'Hold off on general-purpose feed and extra compost.', 'Give it the brightest spot you have: low light also means leaves over fruit.'],
    signals: [{ signal: 'freshMix', weight: 1.6, why: 'Rich fresh mixes are high in nitrogen.' }, { signal: 'fedRecently', weight: 1.3, why: 'It’s been fed lately.' }, { signal: 'fruiting', weight: 1.4, why: '' }, { signal: 'lowLight', weight: 1.3, why: 'Low light also pushes leaves over fruit.' }],
  },
  magnesium: {
    id: 'magnesium',
    title: 'Short of magnesium',
    summary: 'The leaf yellows between the veins while the veins stay green, starting on older leaves. Common on tomatoes and peppers, especially when fed only a high-potash feed.',
    check: ['Do the veins stay green while the leaf between them yellows?', 'Is it the older, lower leaves first?'],
    fix: ['Use a feed that lists magnesium (Mg); many tomato feeds do.', 'Or add a magnesium supplement made for plants, following its label.', 'Keep watering even: dry roots take up less.'],
    signals: [{ signal: 'fruiting', weight: 1.8, why: 'Fruiting crops use a lot of magnesium.' }, { signal: 'edible', weight: 1.3, why: '' }, { signal: 'mixSpent', weight: 1.4, why: 'The food in its fresh mix has likely run out.' }, { signal: 'unfed', weight: 1.3, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.6, why: '' }],
  },
  potassium: {
    id: 'potassium',
    title: 'Short of potassium',
    summary: 'Older leaves yellow at the edges, then the edges brown and crisp. Fruit can ripen unevenly. Fruiting crops need lots of potassium once fruit sets.',
    check: ['Do the edges of older leaves yellow first, then brown?', 'Is it fruiting, and when did it last get a tomato feed?'],
    fix: ['Feed with a tomato (high-potash) feed at half strength.', 'Keep it up every 2 weeks while fruit is swelling.'],
    signals: [{ signal: 'fruiting', weight: 2, why: 'Swelling fruit takes a lot of potassium.' }, { signal: 'mixSpent', weight: 1.5, why: 'The food in its fresh mix has likely run out.' }, { signal: 'unfed', weight: 1.4, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.5, why: '' }, { signal: 'fedRecently', weight: 0.6, why: '' }],
  },
  'purple-cold': {
    id: 'purple-cold',
    title: 'Cold roots (short of phosphorus)',
    summary: 'A purple tinge, often under the leaves or along the veins. Cold roots can’t take up phosphorus, so it shows in cool spells and on cold windowsills more than from a lack of food.',
    check: ['Has it been cold at night, or is the pot against cold glass?', 'Is it mostly on the undersides and older leaves?'],
    fix: ['Move it off cold glass or raise the pot off a cold sill.', 'Wait for warmer days before feeding much; it usually greens up by itself.', 'If it’s warm and still purple, give a balanced feed at half strength.'],
    signals: [{ signal: 'slowSeason', weight: 1.8, why: 'It’s the cool season.' }, { signal: 'outdoor', weight: 1.3, why: 'Cold nights outside.' }, { signal: 'unfed', weight: 1.2, why: 'No feed logged in a couple of months.' }, { signal: 'freshMix', weight: 0.6, why: '' }],
  },
  'heat-stress': {
    id: 'heat-stress',
    title: 'Too hot',
    summary: 'Leaves curl, flop or scorch when it’s very hot: a sunny window in summer, a hot balcony, or too close to a grow light.',
    check: ['Is it in hot afternoon sun, right against glass, or close under a lamp?', 'Does it perk up in the evening?'],
    fix: ['Give it shade in the hottest hours, or move it back from the glass or lamp.', 'Keep the soil evenly moist in hot spells.'],
    signals: [{ signal: 'hotSeason', weight: 2, why: 'It’s the hot season.' }, { signal: 'directSun', weight: 1.6, why: 'It sits in direct sun.' }, { signal: 'slowSeason', weight: 0.4, why: '' }],
  },
  'old-leaves': {
    id: 'old-leaves',
    title: 'Just an old leaf',
    summary: 'Plants retire their oldest, lowest leaves now and then. One at a time, with healthy new growth, is nothing to worry about.',
    check: ['Is it only one or two of the oldest, lowest leaves?', 'Is new growth coming in green and healthy?'],
    fix: ['Let it yellow fully, then pull it off gently or snip it.', 'Nothing else to do.'],
    signals: [{ signal: 'wetChecks', weight: 0.7, why: '' }, { signal: 'dryChecks', weight: 0.7, why: '' }],
  },
  shock: {
    id: 'shock',
    title: 'Settling in',
    summary: 'Moving house, a new spot or a fresh pot is a shock. Plants often drop a few leaves or droop for a couple of weeks while they adjust.',
    check: ['Did it move, get repotted, or come home recently?', 'Is new growth still appearing?'],
    fix: ['Pick a good spot and leave it there.', 'Water as normal, but don’t feed for a few weeks.', 'Be patient: most plants bounce back in 2 to 4 weeks.'],
    signals: [{ signal: 'recentRepot', weight: 3, why: 'It was repotted recently.' }, { signal: 'newPlant', weight: 3, why: 'It joined the family recently.' }],
  },
  cold: {
    id: 'cold',
    title: 'Cold or drafts',
    summary: 'Tropical plants dislike temperatures below about 12 °C (55 °F) and cold drafts. Leaves can go dark, limp or drop.',
    check: ['Is it near a door, a draughty window, or touching cold glass?', 'Was it outside on a cold night?'],
    fix: ['Move it away from cold glass and doors.', 'Bring outdoor tropicals in before nights get cold.', 'Water less while it’s chilly.'],
    signals: [{ signal: 'slowSeason', weight: 2, why: 'It’s the cold season.' }, { signal: 'outdoor', weight: 1.5, why: 'It lives outside.' }, { signal: 'hotSeason', weight: 0.2, why: '' }],
  },
  'pot-bound': {
    id: 'pot-bound',
    soilOnly: true,
    title: 'Outgrown its pot',
    summary: 'The roots have filled the pot, so it dries out fast and runs out of food.',
    check: ['Are roots poking out of the drainage hole or circling the top?', 'Does water run straight through without soaking in?'],
    fix: ['Repot into a pot about 2–5 cm (1–2 in) wider, with fresh mix.', 'Spring and summer are the best time.'],
    signals: [{ signal: 'oldMix', weight: 2, why: 'It’s been in the same pot over a year.' }, { signal: 'smallPot', weight: 1.6, why: 'Its pot is small.' }, DRY, { signal: 'recentRepot', weight: 0.2, why: '' }],
  },
  'leaf-spot': {
    id: 'leaf-spot',
    title: 'Leaf spot (fungus or bacteria)',
    summary: 'Spots with a darker edge or a yellow halo usually come from a fungus or bacteria, which spread when leaves stay wet.',
    check: ['Do the spots have a yellow ring or a dark edge?', 'Are they spreading to new leaves?', 'Do the leaves stay wet after watering or rain?'],
    fix: ['Snip off spotted leaves and bin them (not the compost).', 'Water the soil, not the leaves, and water in the morning.', 'Give it more space and air flow.', 'Clean your scissors after cutting.'],
    signals: [WET, { signal: 'outdoor', weight: 1.4, why: 'Rain and dew keep outdoor leaves wet.' }, { signal: 'edible', weight: 1.2, why: '' }],
  },
  'powdery-mildew': {
    id: 'powdery-mildew',
    title: 'Powdery mildew',
    summary: 'A fungus that looks like a dusting of flour on the leaves. Common on squash, zucchini, cucumbers and peas late in the season.',
    check: ['Does the white powder wipe off with a finger?', 'Is it on older leaves first?'],
    fix: ['Remove the worst leaves.', 'Give plants more space and air.', 'Water at the base in the morning.', 'A spray of 1 part milk to 9 parts water once a week helps slow it on edibles.'],
    signals: [{ signal: 'edible', weight: 1.6, why: 'Squash, cucumbers and peas are prone to it.' }, { signal: 'fruiting', weight: 1.4, why: 'It shows up most late in the season.' }, { signal: 'outdoor', weight: 1.2, why: '' }],
  },
  'spider-mites': {
    id: 'spider-mites',
    title: 'Spider mites',
    summary: 'Tiny mites that suck the leaves, leaving fine speckles and, later, thin webbing. They love warm, dry air.',
    check: ['Hold white paper under a leaf and tap it. Tiny moving dots?', 'Look under the leaves and where they join the stem for fine webbing.'],
    fix: ['Rinse the whole plant in the shower, especially under the leaves.', 'Wipe leaves with a damp cloth every few days for two weeks.', 'Keep it away from other plants until clear.', 'Raise the humidity: they hate it.'],
    signals: [{ signal: 'indoor', weight: 1.2, why: '' }, { signal: 'slowSeason', weight: 1.3, why: 'Heated, dry air is their favourite.' }, { signal: 'hotSeason', weight: 1.3, why: 'They breed fast in heat.' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
  },
  aphids: {
    id: 'aphids',
    title: 'Aphids',
    summary: 'Small green, black or white bugs that cluster on soft new growth and leave sticky honeydew behind.',
    check: ['Look at the tips and the undersides of new leaves for clusters of tiny bugs.', 'Are the leaves sticky or curling?', 'Ants walking up the stems are a giveaway.'],
    fix: ['Squash small groups or blast them off with water.', 'Snip off badly infested tips.', 'Outside, ladybirds and lacewings will eat them: avoid sprays that kill helpers.', 'Repeat every few days for two weeks.'],
    signals: [{ signal: 'edible', weight: 1.5, why: 'Aphids love soft edible growth.' }, { signal: 'outdoor', weight: 1.4, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
  },
  mealybugs: {
    id: 'mealybugs',
    title: 'Mealybugs',
    summary: 'Slow bugs that look like little bits of cotton wool, hiding where leaves meet stems.',
    check: ['Look in leaf joints, under leaves and at the soil line for white fluff.', 'Is there sticky residue?'],
    fix: ['Dab each one with a cotton bud dipped in rubbing alcohol.', 'Wipe the leaves, then check again every few days for a few weeks.', 'Keep it away from other plants until clear.'],
    signals: [{ signal: 'succulent', weight: 1.4, why: 'Succulents and cacti are a favourite.' }, { signal: 'indoor', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
  },
  scale: {
    id: 'scale',
    title: 'Scale insects',
    summary: 'Small brown bumps stuck to stems and leaf veins that don’t look like bugs at all. They leave sticky honeydew.',
    check: ['Run a fingernail along the stems: do little brown bumps pop off?', 'Are the leaves or the floor below sticky?'],
    fix: ['Scrape them off with a fingernail or a soft toothbrush.', 'Wipe stems with a cotton bud dipped in rubbing alcohol.', 'Check again weekly for a month.'],
    signals: [{ signal: 'indoor', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.4, why: 'You logged a pest check recently.' }],
  },
  whitefly: {
    id: 'whitefly',
    title: 'Whitefly',
    summary: 'Tiny white moths that fly up in a cloud when you brush the plant. Common on tomatoes, peppers and beans.',
    check: ['Brush the leaves: does a little cloud of white specks fly up?', 'Look under the leaves for tiny white flecks.'],
    fix: ['Hang a yellow sticky trap nearby.', 'Hose or rinse under the leaves every few days.', 'Remove the worst leaves.'],
    signals: [{ signal: 'edible', weight: 1.6, why: 'Tomatoes, peppers and beans are favourites.' }, { signal: 'hotSeason', weight: 1.3, why: '' }],
  },
  thrips: {
    id: 'thrips',
    title: 'Thrips',
    summary: 'Tiny slim insects that scrape leaves, leaving silvery streaks and black specks.',
    check: ['Look for silvery, scratched-looking patches with tiny black dots.', 'Tap a leaf over white paper: tiny slivers that move?'],
    fix: ['Rinse the plant well, under the leaves too.', 'Blue or yellow sticky traps catch the adults.', 'Repeat every few days for a few weeks.'],
    signals: [{ signal: 'indoor', weight: 1.1, why: '' }, { signal: 'hotSeason', weight: 1.2, why: '' }, { signal: 'pestLogged', weight: 1.3, why: 'You logged a pest check recently.' }],
  },
  'fungus-gnats': {
    id: 'fungus-gnats',
    soilOnly: true,
    title: 'Fungus gnats',
    summary: 'Tiny black flies that breed in wet soil. Annoying, mostly harmless to the plant, and a sign the soil stays wet.',
    check: ['Do little flies hop up from the soil when you water?', 'Is the top of the soil always damp?'],
    fix: ['Let the top few cm dry out fully between drinks: the larvae need wet soil.', 'Yellow sticky traps catch the adults.', 'Water from the bottom for a few weeks.'],
    signals: [WET, SOGGY, { signal: 'indoor', weight: 1.2, why: '' }],
    tweak: 'slow-water',
  },
  'surface-mold': {
    id: 'surface-mold',
    soilOnly: true,
    title: 'Mould on the soil',
    summary: 'White fuzz on top of the soil is a harmless mould that grows when the surface stays damp and still.',
    check: ['Is it only on the surface, not on the stems?', 'Is the soil staying damp for days?'],
    fix: ['Scrape off the top layer and let the soil dry more between drinks.', 'More light and air flow keep it away.', 'A sprinkle of cinnamon on the surface helps.'],
    signals: [WET, SOGGY, { signal: 'lowLight', weight: 1.4, why: 'Low light keeps the surface damp.' }, SLOW, { signal: 'recentRepot', weight: 1.3, why: 'Fresh bagged mix often has a little mould.' }],
    tweak: 'slow-water',
  },
  'pests-chewing': {
    id: 'pests-chewing',
    title: 'Something is eating it',
    summary: 'Holes and ragged edges usually mean caterpillars, slugs or snails, especially outside.',
    check: ['Look under leaves and around the pot at night with a torch for slugs and caterpillars.', 'Is there slimy trail or little dark droppings?'],
    fix: ['Pick them off by hand.', 'Raise pots off the ground, or use copper tape around the rim for slugs.', 'Netting keeps butterflies off cabbages and kale.'],
    signals: [{ signal: 'outdoor', weight: 2.5, why: 'It lives outside.' }, { signal: 'edible', weight: 1.5, why: 'Edibles are tasty to bugs too.' }, { signal: 'indoor', weight: 0.4, why: '' }],
  },
  'blossom-end-rot': {
    id: 'blossom-end-rot',
    title: 'Blossom end rot',
    summary: 'A dark, sunken patch on the bottom of tomatoes, peppers or zucchini. It’s caused by uneven watering stopping calcium reaching the fruit.',
    check: ['Is the patch on the end opposite the stem?', 'Has the soil been swinging between bone dry and soaked?'],
    fix: ['Water deeply and regularly so the soil never dries right out.', 'Mulch the top of the soil to keep moisture even.', 'Pick off affected fruit: new ones will be fine.'],
    signals: [DRY, LATE, { signal: 'hotSeason', weight: 1.4, why: 'Pots dry out fast in the heat.' }, { signal: 'smallPot', weight: 1.4, why: 'Small pots swing from wet to dry fast.' }, { signal: 'fruiting', weight: 1.5, why: '' }],
    tweak: 'more-water',
  },
  'flower-drop': {
    id: 'flower-drop',
    title: 'Too hot, too dry or not pollinated',
    summary: 'Edibles drop their flowers when nights are very hot, the plant is thirsty, or no pollinators visit.',
    check: ['Have days been above about 32 °C (90 °F)?', 'Is it indoors or on a balcony with few bees?', 'Has the soil been drying out?'],
    fix: ['Keep the soil evenly moist.', 'Give shade in the hottest part of the afternoon.', 'Indoors, gently shake tomato and pepper flowers, or dab between flowers with a small brush.'],
    signals: [{ signal: 'hotSeason', weight: 1.8, why: 'It’s the hot season.' }, DRY, { signal: 'indoor', weight: 1.5, why: 'Indoors there are no bees to pollinate.' }, { signal: 'fruiting', weight: 1.3, why: '' }],
  },
  splitting: {
    id: 'splitting',
    title: 'Uneven watering',
    summary: 'Fruit splits when a thirsty plant suddenly gets a lot of water, from you or from rain, and the fruit swells faster than its skin.',
    check: ['Did a dry spell end with heavy watering or rain?'],
    fix: ['Water a little and often in hot weather, so the soil stays evenly moist.', 'Pick fruit as it ripens, before heavy rain.', 'Mulch to keep moisture even.'],
    signals: [DRY, LATE, { signal: 'outdoor', weight: 1.3, why: 'Rain after dry spells is a common trigger.' }],
    tweak: 'more-water',
  },
  bolting: {
    id: 'bolting',
    title: 'Bolting (going to seed)',
    summary: 'Leafy greens and herbs shoot up a flower stalk when days get long and hot. Leaves turn bitter afterwards.',
    check: ['Is a tall central stalk shooting up, maybe with buds?', 'Have days been long and warm?'],
    fix: ['Pinch out flower buds on herbs like basil to keep leaves coming.', 'For lettuce and spinach, harvest now and sow a new batch.', 'Sow cool-season greens in spring and autumn, with afternoon shade.'],
    signals: [{ signal: 'edible', weight: 2, why: '' }, { signal: 'hotSeason', weight: 1.8, why: 'Long, hot days trigger it.' }, { signal: 'fruiting', weight: 1.3, why: 'It’s been growing a good while.' }],
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
