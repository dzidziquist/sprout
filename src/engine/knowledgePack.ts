import { AREAS, CARE_TWEAKS, CAUSES, SHADE_LOVERS, SIGNALS, SPECIES_NOTES, SYMPTOMS, TAP_SENSITIVE, type Cause, type Symptom } from '../data/diagnosis';
import { MIX_BRANDS, type MixBrand } from '../data/mixes';
import { SPECIES } from '../data/species';

/*
 * Knowledge packs: the plant doctor, mix brands and species notes as plain data, so new knowledge reaches
 * phones without a new build (docs/knowledge.md, "Knowledge packs"). A pack is a full snapshot of that
 * knowledge, laid over the copy built into the app. It never carries code, and it can only use what the
 * app already understands (its signals, areas, care tweaks), listed in the pack's format
 * (knowledge/formats/<n>.json). Anything else is dropped, here on the phone and in the publish step.
 *
 * Laid over, never removed: an entry missing from a pack keeps its built-in version. A pack withdraws an
 * entry with a stub, `{ id, status: 'draft' }`, which hides it like any draft.
 */

/** The pack format this build reads. Raise it, with a new knowledge/formats/<n>.json, when the vocabulary changes. */
export const KB_FORMAT = 1;

/** What a format understands. The app's own comes from its code; the publish step reads it from knowledge/formats. */
export interface KbVocab {
  signals: string[];
  areas: string[];
  tweaks: string[];
  mixKinds: string[];
}

export const APP_VOCAB: KbVocab = {
  signals: [...SIGNALS],
  areas: AREAS.map((a) => a.id),
  tweaks: [...CARE_TWEAKS],
  mixKinds: ['organic', 'slow', 'none'],
};

/** A mix brand as data: the name pattern is a regular expression's source, case-insensitive. */
export type PackMix = Omit<MixBrand, 'match'> & { match: string };
/** Species fields a pack may change. New species need their art, so they come with a build for now. */
export interface PackSpecies {
  tip?: string;
  aliases?: string[];
  petToxic?: boolean;
}

export interface KnowledgePack {
  format: number;
  /** When the knowledge was merged (the commit time, ISO). A pack only applies over older knowledge. */
  version: string;
  causes: (Cause | { id: string; status: 'draft' })[];
  symptoms: (Symptom | { id: string; status: 'draft' })[];
  speciesNotes: Record<string, Record<string, string>>;
  tapSensitive: string[];
  shadeLovers: string[];
  mixes: PackMix[];
  species: Record<string, PackSpecies>;
  /** Symptom pictures that differ from the ones built into the format's apps: path under kb/ and its MD5. */
  images: Record<string, { file: string; md5: string }>;
}

/** Thrown when a whole pack can't be used (wrong format, not a pack at all). */
export class PackError extends Error {}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number, min = 1): v is string => typeof v === 'string' && v.length >= min && v.length <= max;
const strs = (v: unknown, max: number, maxItems = 12): v is string[] => Array.isArray(v) && v.length <= maxItems && v.every((x) => str(x, max));
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isStub = (v: Record<string, unknown>) => v.status === 'draft' && Object.keys(v).every((k) => k === 'id' || k === 'status');
const statusOk = (v: unknown) => v === undefined || v === 'verified' || v === 'draft';
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function cleanCause(v: Record<string, unknown>, vocab: KbVocab): Cause | null {
  if (!str(v.title, 80) || !str(v.summary, 400) || !strs(v.check, 300) || !strs(v.fix, 300)) return null;
  if (!(v.check as string[]).length || !(v.fix as string[]).length) return null;
  const signals = v.signals ?? [];
  if (!Array.isArray(signals) || signals.length > 20) return null;
  for (const s of signals) if (!isObj(s) || !vocab.signals.includes(s.signal as string) || !num(s.weight, 0, 5) || !str(s.why, 200, 0)) return null;
  if (v.tweak !== undefined && !vocab.tweaks.includes(v.tweak as string)) return null;
  if (![v.rescue, v.soilOnly, v.waterOnly].every(optBool) || !statusOk(v.status)) return null;
  if (v.sources !== undefined && !(strs(v.sources, 300) && (v.sources as string[]).every((u) => u.startsWith('https://')))) return null;
  if (v.reviewed !== undefined && !(typeof v.reviewed === 'string' && MONTH.test(v.reviewed))) return null;
  const pick = ['id', 'title', 'summary', 'check', 'fix', 'signals', 'tweak', 'rescue', 'soilOnly', 'waterOnly', 'sources', 'reviewed', 'status'] as const;
  return Object.fromEntries(pick.filter((k) => v[k] !== undefined).map((k) => [k, v[k]])) as unknown as Cause;
}

function cleanSymptom(v: Record<string, unknown>, vocab: KbVocab, causeIds: Set<string>): Symptom | null {
  if (!vocab.areas.includes(v.area as string) || !str(v.label, 60) || !str(v.hint, 200)) return null;
  if (!Array.isArray(v.causes) || !v.causes.length || v.causes.length > 15) return null;
  for (const c of v.causes) if (!isObj(c) || !causeIds.has(c.cause as string) || !num(c.prior, 0, 10)) return null;
  if (![v.edibleOnly, v.soilOnly].every(optBool) || !statusOk(v.status)) return null;
  if ((v.waterLabel !== undefined && !str(v.waterLabel, 60)) || (v.waterHint !== undefined && !str(v.waterHint, 200))) return null;
  const pick = ['id', 'area', 'label', 'hint', 'causes', 'edibleOnly', 'soilOnly', 'waterLabel', 'waterHint', 'status'] as const;
  return Object.fromEntries(pick.filter((k) => v[k] !== undefined).map((k) => [k, v[k]])) as unknown as Symptom;
}

function cleanMix(v: unknown, vocab: KbVocab): PackMix | null {
  if (!isObj(v) || !str(v.match, 80) || !str(v.name, 60) || !str(v.source, 300) || !vocab.mixKinds.includes(v.kind as string) || !statusOk(v.status)) return null;
  if (v.reviewed !== undefined && !(typeof v.reviewed === 'string' && MONTH.test(v.reviewed))) return null;
  try {
    new RegExp(v.match);
  } catch {
    return null;
  }
  return { match: v.match, name: v.name, kind: v.kind as PackMix['kind'], source: v.source, ...(v.reviewed ? { reviewed: v.reviewed as string } : {}), ...(v.status ? { status: v.status as PackMix['status'] } : {}) };
}

function cleanSpecies(v: unknown): PackSpecies | null {
  if (!isObj(v)) return null;
  if ((v.tip !== undefined && !str(v.tip, 200)) || (v.aliases !== undefined && !strs(v.aliases, 60, 30)) || !optBool(v.petToxic)) return null;
  return { ...(v.tip !== undefined ? { tip: v.tip as string } : {}), ...(v.aliases !== undefined ? { aliases: v.aliases as string[] } : {}), ...(v.petToxic !== undefined ? { petToxic: v.petToxic as boolean } : {}) };
}

/**
 * Checks a pack entry by entry against a format's vocabulary. Entries that don't fit are dropped (and
 * named in `dropped`), so one bad entry never blocks the rest; their built-in versions stay. Throws
 * PackError when the pack itself is unusable. `known` is what already exists outside the pack (the app's
 * built-in causes, symptoms and species).
 */
export function validatePack(raw: unknown, vocab: KbVocab, format: number, known: { causes: Iterable<string>; symptoms: Iterable<string>; species: Iterable<string> }): { pack: KnowledgePack; dropped: string[] } {
  if (!isObj(raw)) throw new PackError('Not a knowledge pack.');
  if (raw.format !== format) throw new PackError(`Pack format ${String(raw.format)}, this app reads ${format}.`);
  if (typeof raw.version !== 'string' || Number.isNaN(Date.parse(raw.version))) throw new PackError('Pack has no version.');
  const dropped: string[] = [];
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const record = (v: unknown) => (isObj(v) ? v : {});
  const species = new Set(known.species);

  const causes: KnowledgePack['causes'] = [];
  for (const v of list(raw.causes)) {
    if (!isObj(v) || !str(v.id, 60) || !ID.test(v.id)) {
      dropped.push('cause (no id)');
      continue;
    }
    const c = isStub(v) ? { id: v.id, status: 'draft' as const } : cleanCause(v, vocab);
    if (c) causes.push(c);
    else dropped.push(`cause ${v.id}`);
  }
  // Withdrawn causes still count as references: the plant doctor skips drafts when it ranks.
  const causeIds = new Set([...known.causes, ...causes.map((c) => c.id)]);

  const symptoms: KnowledgePack['symptoms'] = [];
  for (const v of list(raw.symptoms)) {
    if (!isObj(v) || !str(v.id, 60) || !ID.test(v.id)) {
      dropped.push('symptom (no id)');
      continue;
    }
    const s = isStub(v) ? { id: v.id, status: 'draft' as const } : cleanSymptom(v, vocab, causeIds);
    if (s) symptoms.push(s);
    else dropped.push(`symptom ${v.id}`);
  }
  const symptomIds = new Set([...known.symptoms, ...symptoms.map((s) => s.id)]);

  const speciesNotes: KnowledgePack['speciesNotes'] = {};
  for (const [sp, notes] of Object.entries(record(raw.speciesNotes))) {
    if (!species.has(sp) || !isObj(notes)) {
      dropped.push(`notes for ${sp}`);
      continue;
    }
    const ok = Object.entries(notes).filter(([sym, text]) => symptomIds.has(sym) && str(text, 400));
    if (ok.length < Object.keys(notes).length) dropped.push(`some notes for ${sp}`);
    if (ok.length) speciesNotes[sp] = Object.fromEntries(ok) as Record<string, string>;
  }

  const ids = (v: unknown, what: string) => {
    const all = list(v).filter((x): x is string => typeof x === 'string');
    const ok = all.filter((x) => species.has(x));
    if (ok.length < list(v).length) dropped.push(`${what}: unknown plants`);
    return ok;
  };

  const mixes: PackMix[] = [];
  for (const v of list(raw.mixes)) {
    const m = cleanMix(v, vocab);
    if (m) mixes.push(m);
    else dropped.push(`mix ${isObj(v) && typeof v.name === 'string' ? v.name : '(unnamed)'}`);
  }

  const speciesOut: KnowledgePack['species'] = {};
  for (const [sp, v] of Object.entries(record(raw.species))) {
    const s = species.has(sp) ? cleanSpecies(v) : null;
    if (s) speciesOut[sp] = s;
    else dropped.push(`plant ${sp}`);
  }

  const images: KnowledgePack['images'] = {};
  for (const [sym, v] of Object.entries(record(raw.images))) {
    if (symptomIds.has(sym) && isObj(v) && typeof v.md5 === 'string' && /^[a-f0-9]{32}$/.test(v.md5) && v.file === `img/${v.md5}.png`) images[sym] = { file: v.file, md5: v.md5 };
    else dropped.push(`picture for ${sym}`);
  }

  return {
    pack: { format, version: raw.version, causes, symptoms, speciesNotes, tapSensitive: ids(raw.tapSensitive, 'tap-sensitive list'), shadeLovers: ids(raw.shadeLovers, 'shade-lover list'), mixes, species: speciesOut, images },
    dropped,
  };
}

/** What the app knows outside any pack, for validatePack on the phone. Read before the first pack is laid over. */
export const builtInIds = () => ({ causes: Object.keys(CAUSES), symptoms: SYMPTOMS.map((s) => s.id), species: Object.keys(SPECIES) });

/** The app's knowledge as a pack (the publish step's input). Drafts go in only as stubs, never with their content. */
export function snapshotPack(version: string): Omit<KnowledgePack, 'images'> {
  const stub = <T extends { id: string; status?: string }>(x: T) => (x.status === 'draft' ? { id: x.id, status: 'draft' as const } : x);
  const species: Record<string, PackSpecies> = {};
  for (const s of Object.values(SPECIES)) {
    if (s.id.startsWith('other-')) continue;
    species[s.id] = { ...(s.tip ? { tip: s.tip } : {}), ...(s.aliases ? { aliases: s.aliases } : {}), petToxic: s.petToxic };
  }
  return {
    format: KB_FORMAT,
    version,
    causes: Object.values(CAUSES).map(stub),
    symptoms: SYMPTOMS.map(stub),
    speciesNotes: Object.fromEntries(Object.entries(SPECIES_NOTES).map(([sp, n]) => [sp, Object.fromEntries(Object.entries(n).filter((e): e is [string, string] => !!e[1]))])),
    tapSensitive: [...TAP_SENSITIVE],
    shadeLovers: [...SHADE_LOVERS],
    mixes: MIX_BRANDS.filter((m) => m.status !== 'draft').map((m) => ({ ...m, match: m.match.source })),
    species,
  };
}

/**
 * Lays a checked pack over the app's knowledge, in place, so every screen and the plant doctor read the
 * new entries straight away. Pictures are the caller's job (they live on the phone's disk).
 */
export function applyPack(pack: KnowledgePack): void {
  for (const c of pack.causes) {
    if (c.status === 'draft' && !('title' in c)) {
      if (CAUSES[c.id]) CAUSES[c.id] = { ...CAUSES[c.id], status: 'draft' };
    } else CAUSES[c.id] = c as Cause;
  }
  for (const s of pack.symptoms) {
    const i = SYMPTOMS.findIndex((x) => x.id === s.id);
    if (s.status === 'draft' && !('label' in s)) {
      if (i >= 0) SYMPTOMS[i] = { ...SYMPTOMS[i], status: 'draft' };
    } else if (i >= 0) SYMPTOMS[i] = s as Symptom;
    else SYMPTOMS.push(s as Symptom);
  }
  // Full snapshots: the lists and notes are replaced whole.
  for (const k of Object.keys(SPECIES_NOTES)) delete SPECIES_NOTES[k];
  Object.assign(SPECIES_NOTES, pack.speciesNotes);
  TAP_SENSITIVE.clear();
  pack.tapSensitive.forEach((id) => TAP_SENSITIVE.add(id));
  SHADE_LOVERS.clear();
  pack.shadeLovers.forEach((id) => SHADE_LOVERS.add(id));
  if (pack.mixes.length) MIX_BRANDS.splice(0, MIX_BRANDS.length, ...pack.mixes.map((m) => ({ ...m, match: new RegExp(m.match) })));
  for (const [id, s] of Object.entries(pack.species)) {
    const sp = SPECIES[id];
    if (!sp) continue;
    // Back to the built-in values first, so a field a newer pack leaves out doesn't keep an older pack's value.
    if (!builtInSpecies.has(id)) builtInSpecies.set(id, { tip: sp.tip, aliases: sp.aliases, petToxic: sp.petToxic });
    const base = builtInSpecies.get(id)!;
    sp.tip = base.tip;
    sp.aliases = base.aliases;
    sp.petToxic = base.petToxic!;
    Object.assign(sp, s);
  }
}

/** The species fields as built into the app, kept the first time a pack changes them. */
const builtInSpecies = new Map<string, PackSpecies>();
