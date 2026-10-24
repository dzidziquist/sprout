import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Whether the person has Reduce Transparency on (iOS Settings › Accessibility › Display & Text Size), kept up to date. */
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    // An iOS setting; react-native-web doesn't implement the check at all (it throws).
    if (Platform.OS !== 'ios') return;
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((on) => live && setReduced(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
