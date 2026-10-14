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
  | 'unsure';

export type Light = 'low' | 'medium' | 'bright' | 'direct';

export type PotMaterial = 'plastic' | 'glazed' | 'terracotta' | 'fabric';

/** Where the pot lives, which picks the column of the season table. */
export type Placement = 'indoor' | 'growlight' | 'outdoor' | 'covered_outdoor';

export type ClimateProfile = 'seattle' | 'accra';

export type Origin = 'bought' | 'cutting' | 'swap' | 'gift';

/** Growth stage for edibles (tomato, pepper, spring onion, herbs). */
export type EdibleStage = 'seed' | 'seedling' | 'growing' | 'flowering' | 'fruiting' | 'harvesting' | 'resting';

export type PotColor = 'yellow' | 'blue' | 'coral' | 'grape' | 'bubblegum';

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
  artPot: PotColor;
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
  light: Light;
  placement: Placement;
  room?: string;
  origin: Origin;
  /** Set when the plant was propagated from another plant in the fam. */
  parentId?: string;
  /** Present while a cutting is still rooting (in water, moss, etc.). */
  rooting?: { method: 'water' | 'moss' | 'soil' | 'leca'; startedAt: string };
  acquiredAt: string;
  lastRepottedAt?: string;
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
  | 'archived';

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
  at: string;
}
