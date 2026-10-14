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
 * One plant round a day, at the user's chosen time, only on days something new is due.
 * Rescheduled whenever plants change, so it always reflects the latest checks.
 */
export async function rescheduleRounds(plants: Plant[], hour: number, minute: number, enabled: boolean) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  for (const { fireAt, digest } of planRounds(plants, new Date(), hour, minute, 7)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: digest.title, body: digest.body, data: { route: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}
