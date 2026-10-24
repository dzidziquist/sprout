import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether the person has Reduce Transparency on (iOS Settings › Accessibility › Display & Text Size), kept up to date. */
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
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
