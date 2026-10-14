import type { Species, SpeciesId } from '../types';

/*
 * Starter catalogue. Toxicity flags use our own wording and the app links out to the ASPCA list;
 * we don't copy ASPCA text (no reuse licence found, see docs/product-brief.md).
 */
const LIST: Species[] = [
  { id: 'monstera', commonName: 'Monstera', latinName: 'Monstera deliciosa', group: 'tropical', defaultSoil: 'chunky_aroid', defaultLight: 'bright', petToxic: true, edible: false },
  { id: 'pothos', commonName: 'Pothos', latinName: 'Epipremnum aureum', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: true, edible: false },
  { id: 'fig', commonName: 'Fiddle-leaf fig', latinName: 'Ficus lyrata', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'bright', petToxic: true, edible: false },
  { id: 'calathea', commonName: 'Calathea', latinName: 'Goeppertia orbifolia', group: 'moisture', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: false, edible: false },
  { id: 'snake', commonName: 'Snake plant', latinName: 'Dracaena trifasciata', group: 'succulent', defaultSoil: 'gritty', defaultLight: 'medium', petToxic: true, edible: false },
  { id: 'hoya', commonName: 'Hoya', latinName: 'Hoya carnosa', group: 'tropical', defaultSoil: 'chunky_aroid', defaultLight: 'bright', petToxic: false, edible: false },
  { id: 'peace-lily', commonName: 'Peace lily', latinName: 'Spathiphyllum wallisii', group: 'moisture', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: true, edible: false },
  { id: 'zz', commonName: 'ZZ plant', latinName: 'Zamioculcas zamiifolia', group: 'succulent', defaultSoil: 'perlite_mix', defaultLight: 'low', petToxic: true, edible: false },
  { id: 'string-of-pearls', commonName: 'String of pearls', latinName: 'Curio rowleyanus', group: 'succulent', defaultSoil: 'gritty', defaultLight: 'bright', petToxic: true, edible: false },
  { id: 'pink-princess', commonName: 'Pink Princess', latinName: "Philodendron erubescens 'Pink Princess'", group: 'tropical', defaultSoil: 'chunky_aroid', defaultLight: 'bright', petToxic: true, edible: false },
  { id: 'aloe', commonName: 'Aloe vera', latinName: 'Aloe vera', group: 'succulent', defaultSoil: 'gritty', defaultLight: 'direct', petToxic: true, edible: false },
  { id: 'spider', commonName: 'Spider plant', latinName: 'Chlorophytum comosum', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: false, edible: false },
  { id: 'rubber', commonName: 'Rubber plant', latinName: 'Ficus elastica', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'bright', petToxic: true, edible: false },
  { id: 'bird-of-paradise', commonName: 'Bird of paradise', latinName: 'Strelitzia reginae', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'direct', petToxic: true, edible: false },
  { id: 'basil', commonName: 'Basil', latinName: 'Ocimum basilicum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: false, edible: true },
  { id: 'mint', commonName: 'Mint', latinName: 'Mentha spicata', group: 'moisture', defaultSoil: 'veg_mix', defaultLight: 'bright', petToxic: true, edible: true },
  { id: 'tomato', commonName: 'Cherry tomato', latinName: 'Solanum lycopersicum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: true, edible: true },
  { id: 'pepper', commonName: 'Chili pepper', latinName: 'Capsicum chinense', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: false, edible: true },
  { id: 'spring-onion', commonName: 'Spring onion', latinName: 'Allium fistulosum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'bright', petToxic: true, edible: true },
];

export const SPECIES: Record<SpeciesId, Species> = Object.fromEntries(LIST.map((s) => [s.id, s])) as Record<SpeciesId, Species>;
export const SPECIES_LIST = LIST;
