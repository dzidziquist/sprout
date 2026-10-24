import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether the person has Reduce Motion on (iOS Settings › Accessibility › Motion), kept up to date. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduced(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
