import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tick for toggles and chips. */
export function tap() {
  if (native) Haptics.selectionAsync().catch(() => {});
}

/** Soft thump when a soil check is answered. */
export function answer() {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

/** Celebration: round finished, care saved. */
export function success() {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
