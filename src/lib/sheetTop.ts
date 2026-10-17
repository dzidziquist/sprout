import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top inset for screens shown as a modal or sheet. On iOS those slide up as cards that already sit
 * below the status bar, but the safe-area hook still reports the whole window's notch height, which
 * left a big empty band at the top. Elsewhere (Android, web) modals are full screen and need it.
 */
export function useSheetTop(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? 0 : insets.top;
}
