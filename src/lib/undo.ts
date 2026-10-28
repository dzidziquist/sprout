import { create } from 'zustand';

export interface PendingUndo {
  key: string;
  text: string;
  undo: () => void;
}

/**
 * The one Undo bar: whatever was just done (a check, an archive, a wish removed) and how to take it back.
 * A newer action replaces it. Screens that can show it render `UndoHost`; if none is on screen, it lapses.
 */
export const useUndoBar = create<{ current: PendingUndo | null; show: (text: string, undo: () => void) => void; clear: (key: string) => void }>((set, get) => ({
  current: null,
  show: (text, undo) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set({ current: { key, text, undo } });
    // The bar times itself out; this only catches one shown with no host on screen to time it.
    setTimeout(() => get().clear(key), 15000);
  },
  clear: (key) => {
    if (get().current?.key === key) set({ current: null });
  },
}));

export const showUndo = (text: string, undo: () => void) => useUndoBar.getState().show(text, undo);
