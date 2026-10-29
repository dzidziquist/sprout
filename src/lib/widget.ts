import { Platform } from 'react-native';
import type { Trip } from '../engine/away';
import { buddyArt } from '../data/buddyArt';
import type { FaceStyle } from '../store/plantStore';
import type { Mood, Plant } from '../types';
import { WIDGET_ART_DIR, WIDGET_GROUP, WIDGET_KEY, widgetPayload } from './widgetPayload';

let last: string | null = null;
/** Cartoons already in the widget's folder this launch, so each is looked for once. */
const copied = new Set<string>();
/** One copy pass at a time: two at once would race to write the same file. */
let copying: Promise<unknown> = Promise.resolve();
const MOODS: Mood[] = ['happy', 'thirsty', 'snoozing'];

/** Hands the widget the latest round, and asks iOS to redraw it, when something it shows has changed. */
export function syncWidget(plants: Plant[], trips: Trip[] | undefined, faces: FaceStyle = 'full', now = new Date()): void {
  if (Platform.OS !== 'ios') return;
  try {
    // Native, iOS only: loaded here so web and tests never touch it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
    const payload = widgetPayload(plants, trips, now, { artKey: (id) => buddyArt(id).key, gentle: faces !== 'full' });
    if (payload !== last) {
      new ExtensionStorage(WIDGET_GROUP).set(WIDGET_KEY, payload);
      ExtensionStorage.reloadWidget();
      last = payload;
    }
    // The widget shows each plant's own cartoon from the App Group (its stand-in until they're there).
    // Every sync, not just when the round changed, so a copy that failed last time is tried again.
    copying = copying
      .then(() => copyArt(plants))
      .then((added) => added && ExtensionStorage.reloadWidget())
      .catch(() => {});
  } catch {
    // No widget extension in this build (Expo Go, an old binary): nothing to update.
  }
}

/** Copies every plant's cartoons (all three moods, so the widget can roll over at midnight on its own). */
async function copyArt(plants: Plant[]): Promise<boolean> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const group = Paths.appleSharedContainers[WIDGET_GROUP];
  if (!group) return false;
  const dir = new Directory(group, WIDGET_ART_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  let added = false;
  for (const p of plants) {
    if (p.archivedAt || p.rooting) continue;
    const { key, images } = buddyArt(p.speciesId);
    if (copied.has(key)) continue;
    let complete = true;
    for (const mood of MOODS) {
      const to = new File(dir, `${key}-${mood}.png`);
      if (to.exists) continue;
      try {
        const [asset] = await Asset.loadAsync(images[mood] as number);
        if (!asset?.localUri) throw new Error('no file');
        new File(asset.localUri).copy(to);
        added = true;
      } catch {
        // This one waits for the next sync; the others still go.
        complete = false;
      }
    }
    if (complete) copied.add(key);
  }
  return added;
}
