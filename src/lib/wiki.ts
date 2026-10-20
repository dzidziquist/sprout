import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * A species' short intro and photo from Wikipedia's free page-summary API, for the About card on a plant's
 * page. Only the name being looked up is sent. Results (and "nothing found") are kept on the phone for 30
 * days, so each species is fetched about once a month and the card works offline after that.
 */

export interface WikiSummary {
  title: string;
  /** The article's opening paragraph, plain text. */
  extract: string;
  /** Wikipedia's one-line description, e.g. "Species of flowering plant". */
  description?: string;
  /** A small photo (about 320 px). */
  photo?: string;
  /** The article, for "Read more". */
  url: string;
}

const API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const KEY = 'wiki:v1:';
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
  return { title: d.title, extract: d.extract, description: d.description, photo: d.thumbnail?.source, url };
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
