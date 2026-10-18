import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import type { Trip } from '../engine/away';
import { planRounds, type PhotoCadence } from '../engine/roundDigest';
import type { CareEvent, Plant } from '../types';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Asks iOS to send notifications if it hasn't been asked yet. False means no (now or earlier). */
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
}

/**
 * The plant round starts switched on, but iOS only delivers once the person has said yes. Ask if they
 * never have been asked; false means they said no (then the round should show as off).
 */
export async function ensureRoundPermission(): Promise<boolean> {
  return supported ? requestPermission() : true;
}

/**
 * How far ahead rounds are scheduled. Rescheduling only happens while the app runs, so this is how long
 * reminders keep coming if it's never opened. At most one a day keeps it well under iOS's 64 pending.
 */
const HORIZON_DAYS = 30;

/**
 * One plant round a day, at the user's chosen time, only on days something new is due.
 * Rescheduled whenever plants change, so it always reflects the latest checks.
 */
type RoundArgs = Parameters<typeof schedule>;
let running: Promise<void> | null = null;
let latest: RoundArgs | null = null;

export function rescheduleRounds(
  plants: Plant[],
  events: CareEvent[],
  round: { enabled: boolean; hour: number; minute: number },
  photos: PhotoCadence,
  trips: Trip[] = [],
): Promise<void> {
  // One run at a time (a cancel during another run's scheduling would leave both sets, e.g. reminders
  // naming a plant that was just deleted), and only the newest request waiting behind it.
  latest = [plants, events, round, photos, trips];
  running ??= (async () => {
    while (latest) {
      const args = latest;
      latest = null;
      await schedule(...args).catch(() => {});
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

async function schedule(plants: Plant[], events: CareEvent[], round: { enabled: boolean; hour: number; minute: number }, photos: PhotoCadence, trips: Trip[]) {
  const { enabled, hour, minute } = round;
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  const lastPhotoAt: Record<string, string> = {};
  for (const e of events) if (e.type === 'photo' && (!lastPhotoAt[e.plantId] || e.at > lastPhotoAt[e.plantId])) lastPhotoAt[e.plantId] = e.at;
  for (const { fireAt, digest } of planRounds(plants, new Date(), hour, minute, HORIZON_DAYS, { cadence: photos, lastPhotoAt }, trips)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: digest.title, body: digest.body, data: { route: digest.route ?? '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

/**
 * Opens the screen a tapped notification points at (e.g. a plant's page on photo day). `ready` is
 * false until the navigator has mounted, so a cold start from a notification waits for it.
 */
export const useNotificationRoute = supported
  ? (ready: boolean, open: (route: string) => void) => {
      const response = Notifications.useLastNotificationResponse();
      useEffect(() => {
        const route = response?.notification.request.content.data?.route;
        if (!ready || typeof route !== 'string' || route === '/') return;
        const t = setTimeout(() => {
          try {
            open(route);
          } catch {
            // The screen may be gone (e.g. the plant was deleted); Today is fine.
          }
        }, 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [response, ready]);
    }
  : (_ready: boolean, _open: (route: string) => void) => {};
