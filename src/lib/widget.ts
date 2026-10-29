import { Platform } from 'react-native';
import type { Trip } from '../engine/away';
import type { Plant } from '../types';
import { WIDGET_GROUP, WIDGET_KEY, widgetPayload } from './widgetPayload';

let last: string | null = null;

/** Hands the widget the latest round, and asks iOS to redraw it, when something it shows has changed. */
export function syncWidget(plants: Plant[], trips: Trip[] | undefined, now = new Date()): void {
  if (Platform.OS !== 'ios') return;
  const payload = widgetPayload(plants, trips, now);
  if (payload === last) return;
  try {
    // Native, iOS only: loaded here so web and tests never touch it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
    new ExtensionStorage(WIDGET_GROUP).set(WIDGET_KEY, payload);
    ExtensionStorage.reloadWidget();
    last = payload;
  } catch {
    // No widget extension in this build (Expo Go, an old binary): nothing to update.
  }
}
