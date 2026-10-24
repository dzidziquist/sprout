import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

/**
 * Asks "Discard changes?" before a screen with unsaved changes closes, whether by its close button or a
 * swipe down. Returns `leave`: wrap the navigation after a save (or a delete) in it, so that leaving on
 * purpose doesn't ask. It waits a render, so the guard is off before the screen goes.
 */
export function useDiscardGuard(dirty: boolean): (go: () => void) => void {
  const navigation = useNavigation();
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  // Web has no native alert to ask with, so the web preview just closes.
  usePreventRemove(dirty && !leaving && Platform.OS !== 'web', ({ data }) => {
    Alert.alert('Discard changes?', 'What you changed here won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    leaving?.();
  }, [leaving]);
  return (go) => setLeaving(() => go);
}
