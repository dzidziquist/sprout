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

export type PotColor = 'yellow' | 'blue' | 'coral' | 'grape' | 'bubblegum';

export type SpeciesId =
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
}

/** One individual plant the user owns. */
export interface Plant {
  id: string;
  name: string;
  speciesId: SpeciesId;
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
}

export type CareEventType = 'check' | 'water' | 'feed' | 'repot' | 'prune' | 'pest' | 'cutting' | 'photo' | 'note' | 'harvest';

export interface CareEvent {
  id: string;
  plantId: string;
  type: CareEventType;
  result?: CheckResult;
  /** For harvests: count of fruit / cuts. */
  amount?: number;
  note?: string;
  at: string;
}
