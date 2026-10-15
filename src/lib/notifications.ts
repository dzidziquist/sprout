import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planRounds } from '../engine/roundDigest';
import type { Plant } from '../types';

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
export async function rescheduleRounds(plants: Plant[], hour: number, minute: number, enabled: boolean) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  for (const { fireAt, digest } of planRounds(plants, new Date(), hour, minute, HORIZON_DAYS)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: digest.title, body: digest.body, data: { route: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}
