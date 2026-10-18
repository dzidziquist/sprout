import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

/*
 * Today's date as a key that changes at local midnight, so a screen left open (or the app left in the
 * background overnight) re-renders and picks up what's newly due. One timer and one app-state listener
 * are shared by every screen that asks, and only run while at least one is showing. Timers pause in
 * the background, so coming back to the app checks too.
 */

const dayKey = () => new Date().toDateString();
let day = dayKey();
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;

function refresh() {
  const next = dayKey();
  if (next === day) return;
  day = next;
  listeners.forEach((l) => l());
}

function start() {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const midnight = new Date();
    midnight.setHours(24, 0, 1, 0);
    timer = setTimeout(() => {
      refresh();
      arm();
    }, midnight.getTime() - Date.now());
  };
  arm();
  const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    refresh();
    stop = start();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stop) {
      stop();
      stop = null;
    }
  };
}

export function useDay(): string {
  return useSyncExternalStore(subscribe, () => day);
}
