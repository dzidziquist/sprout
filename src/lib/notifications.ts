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

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
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
export async function rescheduleRounds(
  plants: Plant[],
  events: CareEvent[],
  round: { enabled: boolean; hour: number; minute: number },
  photos: PhotoCadence,
  trips: Trip[] = [],
) {
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
