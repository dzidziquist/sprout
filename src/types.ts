export type CheckResult = 'dry' | 'damp' | 'soggy';

export type Mood = 'happy' | 'thirsty' | 'snoozing';

/** How fast a plant drinks; sets the base check interval. */
export type SpeciesGroup = 'succulent' | 'tropical' | 'moisture' | 'edible';

export type Soil =
  | 'potting_mix'
  | 'chunky_aroid'
  | 'gritty'
  | 'perlite_mix'
  | 'bagged_cactus'
  | 'veg_mix'
  | 'coir'
  | 'moisture_control'
  | 'moss'
  | 'garden_soil'
  | 'leca'
  /** Roots straight in water: water culture, Kratky jars, countertop hydro gardens. */
  | 'water'
  | 'unsure';

export type Light = 'low' | 'medium' | 'bright' | 'direct';

export type PotMaterial = 'plastic' | 'glazed' | 'terracotta' | 'fabric';

/** Where the pot lives, which picks the column of the season table. */
/** `ground`: planted in a garden bed (no pot), which holds far more water than any container. */
export type Placement = 'indoor' | 'growlight' | 'outdoor' | 'covered_outdoor' | 'ground';

/** The two climates PlantFam is calibrated on: cool marine with frost (Seattle) and tropical wet/dry (Accra). */
export type ClimateModel = 'seattle' | 'accra';

/**
 * Anywhere else: one of the calibrated models, shifted by whole months so its seasons line up with the
 * user's (Sydney runs Seattle's year six months apart; Toronto lines its coldest month up with Seattle's).
 */
export interface Climate {
  model: ClimateModel;
  /** Months to add to the user's calendar month to get the model's month. */
  shift: number;
  /** City the user picked (shown in the app), e.g. "Toronto, Canada". */
  place: string;
  /** ISO country code, for units (US → °F). */
  country?: string;
  lat: number;
  lon: number;
  /** Any month averaging nights at or below freezing. */
  frost: boolean;
}

/** A preset model (exactly Seattle or Accra) or a shifted climate for anywhere else. */
export type ClimateProfile = ClimateModel | Climate;

/** How a plant started. 'seed' and 'scraps' (regrown from kitchen scraps) are mostly for edibles. */
export type Origin = 'bought' | 'cutting' | 'swap' | 'gift' | 'seed' | 'scraps';

/** Growth stage for edibles (tomato, pepper, spring onion, herbs). */
export type EdibleStage = 'seed' | 'seedling' | 'growing' | 'flowering' | 'fruiting' | 'harvesting' | 'resting';

/** The app's main colour (buttons, highlights, the Today hero), picked in Settings → Look and feel. */
export type Accent = 'leaf' | 'sky' | 'grape' | 'coral' | 'bubblegum';

/** 'gold' is a milestone reward; species art never uses it. */
export type PotColor = 'yellow' | 'blue' | 'coral' | 'grape' | 'bubblegum' | 'gold';

/** Plants with their own illustrated buddy (assets/buddies). Other species borrow the closest one. */
export type ArtId =
  | 'monstera'
  | 'pothos'
  | 'fig'
  | 'calathea'
  | 'snake'
  | 'hoya'
  | 'peace-lily'
  | 'zz'
  | 'string-of-pearls'
  | 'pink-princess'
  | 'aloe'
  | 'spider'
  | 'rubber'
  | 'bird-of-paradise'
  | 'basil'
  | 'mint'
  | 'tomato'
  | 'pepper'
  | 'bell-pepper'
  | 'potato'
  | 'sweet-potato'
  | 'okra'
  | 'cucumber'
  | 'zucchini'
  | 'lettuce'
  | 'oregano'
  | 'sage'
  | 'lemon-balm'
  | 'lavender'
  | 'tarragon'
  | 'chives'
  | 'bay-laurel'
  | 'parsley'
  | 'cilantro'
  | 'dill'
  | 'roselle'
  | 'scent-leaf'
  | 'thyme'
  | 'rosemary'
  | 'ayoyo'
  | 'raspberry'
  | 'pineapple'
  | 'passion-fruit'
  | 'common-fig'
  | 'cape-gooseberry'
  | 'strawberry'
  | 'meyer-lemon'
  | 'blueberry'
  | 'arugula'
  | 'bok-choy'
  | 'leek'
  | 'amaranth'
  | 'bush-bean'
  | 'fava-bean'
  | 'kontomire'
  | 'microgreens'
  | 'mustard-greens'
  | 'runner-bean'
  | 'pea'
  | 'spinach'
  | 'chard'
  | 'radish'
  | 'ginger'
  | 'eggplant'
  | 'garden-egg'
  | 'carrot'
  | 'garlic'
  | 'kale'
  | 'spring-onion';

/** Catalogue id (e.g. 'monstera', 'philodendron-brasil'), or 'other-<group>' for a plant not in the catalogue. */
export type SpeciesId = string;

export type PlantCategory = 'houseplant' | 'succulent' | 'vegetable' | 'herb' | 'fruit';

/** A catalogue entry shared by every plant of that kind. */
export interface Species {
  id: SpeciesId;
  commonName: string;
  latinName: string;
  group: SpeciesGroup;
  defaultSoil: Soil;
  defaultLight: Light;
  /** Our own wording; always link out to ASPCA for detail. */
  petToxic: boolean;
  edible: boolean;
  /** Pot colour in the species illustration; new plants default to it. */
  artPot: Exclude<PotColor, 'gold'>;
  /** Which illustrated buddy to show (its own, or the closest look-alike until it gets one). */
  art: ArtId;
  category: PlantCategory;
  /** Other common names, for search and photo-ID matching. */
  aliases?: string[];
  /** Extra Latin names for photo-ID matching (lowercase "genus species"), whole genera, or close-relative genera. */
  match?: { species?: string[]; genus?: string[]; relatives?: string[] };
  /** One short, specific care tip in PlantFam's voice. */
  tip?: string;
  /** Shown first in the picker. */
  popular?: boolean;
}

/** One individual plant the user owns. */
export interface Plant {
  id: string;
  name: string;
  speciesId: SpeciesId;
  /** For plants not in the catalogue (speciesId 'other-<group>'): what the user calls the species. */
  custom?: { commonName: string; latinName?: string; petToxic?: boolean };
  potColor: PotColor;
  soil: Soil;
  potMaterial: PotMaterial;
  potDiameterCm: number;
  /** A soil pot with a water reservoir: kept filled all the time, or filled only before a trip. */
  selfWatering?: 'always' | 'away';
  light: Light;
  placement: Placement;
  room?: string;
  /** Where it sits relative to its room's window, for the light view (sill, below, about 1 m, across the room). */
  windowSpot?: 'sill' | 'below' | 'near' | 'far';
  origin: Origin;
  /** Set when the plant was propagated from another plant in the fam. */
  parentId?: string;
  /** Present while a cutting is still rooting (in water, moss, etc.). */
  rooting?: { method: 'water' | 'moss' | 'soil' | 'leca'; startedAt: string };
  acquiredAt: string;
  lastRepottedAt?: string;
  /** LECA and water only: when the reservoir last got fresh water and nutrients (or a flush). */
  lastRefreshedAt?: string;
  /** Learned per-plant drying coefficient; 1 = matches the model. */
  k: number;
  lastCheckAt?: string;
  lastResult?: CheckResult;
  nextCheckAt: string;
  createdAt: string;
  /** Edibles only: current stage and when it started. */
  stage?: EdibleStage;
  stageAt?: string;
  /** Spring onions: how many times it has regrown from the roots. */
  regrowCount?: number;
  /** Latest diary photo (local file URI), used as the plant's cover. */
  photoUri?: string;
  /** Set when a plant dies or is given away. It leaves the round but stays in Offshoots as a memory. */
  archivedAt?: string;
  archivedReason?: 'died' | 'gifted' | 'composted';
}

export type CareEventType =
  | 'check'
  | 'water'
  | 'feed'
  | 'repot'
  | 'prune'
  | 'pest'
  | 'cutting'
  | 'photo'
  | 'note'
  | 'harvest'
  | 'rooted'
  | 'stage'
  | 'regrow'
  | 'refresh'
  /** Given a stake, cage or trellis. */
  | 'staked'
  /** A plant doctor result the person saved. `note` holds what they saw and the likely cause. */
  | 'diagnosis'
  | 'archived'
  /** Brought back from In memory. */
  | 'restored';

export interface CareEvent {
  id: string;
  plantId: string;
  type: CareEventType;
  result?: CheckResult;
  /** For harvests: count of fruit / cuts. */
  amount?: number;
  /** For harvests: unit of `amount` (fruit, handful, cut). */
  unit?: string;
  /** For stage events: the new stage. */
  stage?: EdibleStage;
  /** Local image file for photo events. */
  photoUri?: string;
  note?: string;
  /** For checks: when the next check was booked for (kept up to date if the schedule moves before it). */
  nextAt?: string;
  at: string;
}
