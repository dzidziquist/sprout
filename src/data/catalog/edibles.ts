import type { Species } from '../../types';

/*
 * Vegetables, herbs and fruit. Toxicity flags are our own yes/no reading of the ASPCA list (cats and dogs);
 * the app links out to ASPCA for detail and never copies its text.
 * `art` is the illustrated buddy shown for the plant: its own, or the closest look-alike until it gets one.
 */
export const EDIBLE_PLANTS: Species[] = [
  { id: 'basil', commonName: 'Basil', latinName: 'Ocimum basilicum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: false, edible: true, artPot: 'yellow', art: 'basil', category: 'herb', popular: true, match: { genus: ['ocimum'] } },
  { id: 'mint', commonName: 'Mint', latinName: 'Mentha spicata', group: 'moisture', defaultSoil: 'veg_mix', defaultLight: 'bright', petToxic: true, edible: true, artPot: 'blue', art: 'mint', category: 'herb', popular: true, match: { genus: ['mentha'] } },
  { id: 'tomato', commonName: 'Cherry tomato', latinName: 'Solanum lycopersicum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: true, edible: true, artPot: 'yellow', art: 'tomato', category: 'vegetable', popular: true, match: { species: ['lycopersicon esculentum'] } },
  { id: 'pepper', commonName: 'Chili pepper', latinName: 'Capsicum chinense', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: false, edible: true, artPot: 'blue', art: 'pepper', category: 'vegetable', popular: true, match: { genus: ['capsicum'] } },
  { id: 'spring-onion', commonName: 'Spring onion', latinName: 'Allium fistulosum', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'bright', petToxic: true, edible: true, artPot: 'grape', art: 'spring-onion', category: 'vegetable', popular: true, match: { species: ['allium cepa'] } },
];
