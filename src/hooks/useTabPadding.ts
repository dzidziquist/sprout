import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Padding for a tab screen's scroll content. On iOS the system tab bar already insets the scroll
 * view for the status bar and the tab bar, so adding the safe area again doubled the gaps at the
 * top and bottom. Android and web use the sticker tab bar, which floats over the content.
 */
export function useTabPadding(top = 8) {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios'
    ? { paddingTop: top, paddingBottom: 32, contentInsetAdjustmentBehavior: 'automatic' as const }
    : { paddingTop: insets.top + top, paddingBottom: insets.bottom + 110, contentInsetAdjustmentBehavior: undefined };
}
