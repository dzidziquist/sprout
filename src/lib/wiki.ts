import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * A species' short intro from Wikipedia's free page-summary API, for the About card on a plant's
 * page. Only the name being looked up is sent. Results (and "nothing found") are kept on the phone for 30
 * days, so each species is fetched about once a month and the card works offline after that.
 */

export interface WikiSummary {
  title: string;
  /** The article's opening paragraph, plain text. */
  extract: string;
  /** Wikipedia's one-line description, e.g. "Species of flowering plant". */
  description?: string;
  /** The article, for "Read more". */
  url: string;
  /** The lead image's file on Wikimedia Commons, for "Real photo". Never shown without its credit. */
  imageFile?: string;
}

const API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
// v2: summaries also note the lead image's Commons file.
const KEY = 'wiki:v2:';
const FRESH_MS = 30 * 86400000;
const TIMEOUT_MS = 8000;
const memory = new Map<string, { at: number; hit: WikiSummary | null }>();
/** Lookups under way, so several screens asking for the same plant share one set of requests. */
const pending = new Map<string, Promise<WikiSummary | null>>();

/**
 * Names to try, best first. A plain species name ("Hoya carnosa") goes first. When the catalogue names a
 * variety, cultivar or group ("Brassica oleracea var. sabellica"), the common name ("Kale") is the better
 * article, so it goes first. The genus comes last: on its own it can be another thing entirely ("Beta").
 */
export function wikiTitles(latinName: string, commonName: string): string[] {
  const narrower = /\b(subsp|ssp|var|cv|f)\.|['"(]|\bgroup\b/i.test(latinName);
  const binomial = latinName.replace(/\(.*?\)|'[^']*'|"[^"]*"/g, ' ').replace(/\b(subsp|ssp|var|cv|f|spp?)\..*$/i, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
  const genus = binomial.split(' ')[0];
  const common = commonName.trim();
  const order = narrower ? [common, binomial, genus] : [binomial, common, genus];
  return [...new Set(order.filter((t) => t.length > 1))];
}

/** Turns an API response into a summary, or null for disambiguation pages, missing pages and stubs. */
export function parseSummary(json: unknown): WikiSummary | null {
  const d = json as {
    type?: string;
    title?: string;
    extract?: string;
    description?: string;
    thumbnail?: { source?: string };
    content_urls?: { mobile?: { page?: string }; desktop?: { page?: string } };
  } | null;
  if (!d || d.type !== 'standard' || !d.extract || d.extract.length < 40 || !d.title) return null;
  const url = d.content_urls?.mobile?.page ?? d.content_urls?.desktop?.page;
  if (!url) return null;
  // The photo itself isn't passed on: it has its own author and licence, fetched with it only on request.
  return { title: d.title, extract: d.extract, description: d.description, url, imageFile: commonsFile(d.thumbnail?.source) };
}

/**
 * The Commons file name in a Wikimedia image URL, or undefined for images that aren't on Commons (images kept
 * on English Wikipedia itself are usually non-free, so they're never offered).
 *   …/wikipedia/commons/thumb/a/ab/Calathea_orbifolia.jpg/320px-Calathea_orbifolia.jpg → Calathea_orbifolia.jpg
 */
export function commonsFile(url: string | undefined): string | undefined {
  const m = url?.match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  if (!m) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return undefined;
  }
}

async function fetchOne(title: string, doFetch: typeof fetch): Promise<WikiSummary | null | 'error'> {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : undefined;
  const timer = setTimeout(() => ctrl?.abort(), TIMEOUT_MS);
  try {
    const res = await doFetch(`${API}${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`, {
      signal: ctrl?.signal,
      headers: { 'Api-User-Agent': 'PlantFam (iOS plant care app)' },
    });
    if (res.status === 404) return null;
    if (!res.ok) return 'error';
    return parseSummary(await res.json());
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

/** The best summary for these names: the first that Wikipedia has a real article for. Null when none do. */
export function fetchWiki(titles: string[], opts: { now?: number; fetchImpl?: typeof fetch } = {}): Promise<WikiSummary | null> {
  const key = KEY + titles.join('|');
  const running = pending.get(key);
  if (running) return running;
  const job = lookUp(key, titles, opts).finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}

async function lookUp(key: string, titles: string[], opts: { now?: number; fetchImpl?: typeof fetch }): Promise<WikiSummary | null> {
  const now = opts.now ?? Date.now();
  const mem = memory.get(key);
  if (mem && now - mem.at < FRESH_MS) return mem.hit;
  let stored: { at: number; hit: WikiSummary | null } | null = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (stored && now - stored.at < FRESH_MS) {
    memory.set(key, stored);
    return stored.hit;
  }
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return stored?.hit ?? null;
  for (const t of titles) {
    const got = await fetchOne(t, doFetch);
    // Offline or a server hiccup: keep whatever we had, and try again another time.
    if (got === 'error') return stored?.hit ?? null;
    if (got || t === titles[titles.length - 1]) {
      const entry = { at: now, hit: got };
      memory.set(key, entry);
      AsyncStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
      return got;
    }
  }
  return null;
}

/** React hook: the summary for a species, or null while loading, offline with nothing saved, or not found. */
export function useWiki(latinName: string, commonName: string): WikiSummary | null {
  const titles = wikiTitles(latinName, commonName);
  const key = titles.join('|');
  const [hit, setHit] = useState<WikiSummary | null>(() => memory.get(KEY + key)?.hit ?? null);
  useEffect(() => {
    let live = true;
    setHit(memory.get(KEY + key)?.hit ?? null);
    fetchWiki(titles).then((s) => {
      if (live) setHit(s);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return hit;
}

/* ---------- Real photo: a Commons image with its author and licence ---------- */

export interface WikiPhoto {
  /** A ~640 px version of the image. */
  src: string;
  /** Who made it, as plain text. */
  author: string;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  /** The file's page on Commons, for the credit link. */
  page: string;
}

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const PHOTO_KEY = 'wikiphoto:v1:';
const photoMemory = new Map<string, { at: number; hit: WikiPhoto | null }>();
const photoPending = new Map<string, Promise<WikiPhoto | null>>();

const plain = (html: string | undefined) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** A Commons imageinfo reply turned into a creditable photo, or null when the author or licence is missing. */
export function parsePhoto(json: unknown): WikiPhoto | null {
  const pages = (json as { query?: { pages?: Record<string, unknown> } } | null)?.query?.pages;
  const info = pages
    ? (Object.values(pages)[0] as {
        imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[];
      })?.imageinfo?.[0]
    : undefined;
  if (!info?.thumburl || !info.descriptionurl) return null;
  const meta = info.extmetadata ?? {};
  const author = plain(meta.Artist?.value).slice(0, 80);
  const license = plain(meta.LicenseShortName?.value);
  // No clear author or licence (or a licence asking for more than a credit line): keep the app's art.
  if (!author || !license || /fair use|non-free/i.test(license)) return null;
  return { src: info.thumburl, author, license, page: info.descriptionurl };
}

/** The photo and its credit for a Commons file. Fetched only when someone asks to see it; kept 30 days. */
export function fetchPhoto(file: string, opts: { now?: number; fetchImpl?: typeof fetch } = {}): Promise<WikiPhoto | null> {
  const running = photoPending.get(file);
  if (running) return running;
  const job = lookUpPhoto(file, opts).finally(() => photoPending.delete(file));
  photoPending.set(file, job);
  return job;
}

async function lookUpPhoto(file: string, opts: { now?: number; fetchImpl?: typeof fetch }): Promise<WikiPhoto | null> {
  const now = opts.now ?? Date.now();
  const key = PHOTO_KEY + file;
  const mem = photoMemory.get(key);
  if (mem && now - mem.at < FRESH_MS) return mem.hit;
  let stored: { at: number; hit: WikiPhoto | null } | null = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (stored && now - stored.at < FRESH_MS) {
    photoMemory.set(key, stored);
    return stored.hit;
  }
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return stored?.hit ?? null;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : undefined;
  const timer = setTimeout(() => ctrl?.abort(), TIMEOUT_MS);
  try {
    const q = `?action=query&format=json&origin=*&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=640&titles=${encodeURIComponent(`File:${file}`)}`;
    const res = await doFetch(COMMONS + q, { signal: ctrl?.signal, headers: { 'Api-User-Agent': 'PlantFam (iOS plant care app)' } });
    if (!res.ok) return stored?.hit ?? null;
    const hit = parsePhoto(await res.json());
    const entry = { at: now, hit };
    photoMemory.set(key, entry);
    AsyncStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
    return hit;
  } catch {
    return stored?.hit ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * React hook: the photo for a file once `wanted` is true. `loading` while it's being fetched; `photo` null
 * when there's none that can be credited.
 */
export function usePhoto(file: string | undefined, wanted: boolean): { photo: WikiPhoto | null; loading: boolean } {
  const [state, setState] = useState<{ photo: WikiPhoto | null; loading: boolean }>({ photo: null, loading: false });
  useEffect(() => {
    if (!file || !wanted) return;
    let live = true;
    const cached = photoMemory.get(PHOTO_KEY + file);
    setState({ photo: cached?.hit ?? null, loading: !cached });
    fetchPhoto(file).then((photo) => {
      if (live) setState({ photo, loading: false });
    });
    return () => {
      live = false;
    };
  }, [file, wanted]);
  return file && wanted ? state : { photo: null, loading: false };
}
