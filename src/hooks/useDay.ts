import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const dayKey = () => new Date().toDateString();

/**
 * Today's date as a key that changes at local midnight, so a screen left open (or the app left in the
 * background overnight) re-renders and picks up what's newly due. Timers pause in the background,
 * so coming back to the app checks too.
 */
export function useDay(): string {
  const [day, setDay] = useState(dayKey);
  useEffect(() => {
    const refresh = () => setDay(dayKey());
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const next = new Date();
      next.setHours(24, 0, 1, 0);
      timer = setTimeout(() => {
        refresh();
        arm();
      }, next.getTime() - Date.now());
    };
    arm();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return day;
}
