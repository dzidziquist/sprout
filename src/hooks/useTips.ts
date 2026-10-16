import { useCallback, useEffect, useState } from 'react';
import { usePlantStore } from '@/store/plantStore';
import { configurePurchases, FALLBACK_TIPS, getTips, leaveTip, purchasesAvailable, type Tip, type TipOutcome, type Tips } from '@/lib/purchases';

export interface UseTips {
  /** Has left a tip (on this phone, or found in their purchase history). */
  supporter: boolean;
  /** Prices have loaded (or we know tips are unavailable and fell back). */
  ready: boolean;
  tips: Tips;
  tip: (t: Tip) => Promise<TipOutcome>;
  /** This build can take tips (iOS/Android with a RevenueCat key). */
  available: boolean;
}

export function useTips(): UseTips {
  const supporter = usePlantStore((s) => !!s.profile.supporter);
  const available = purchasesAvailable();
  const [tips, setTips] = useState<Tips>(FALLBACK_TIPS);
  const [ready, setReady] = useState(!available);

  useEffect(() => {
    if (!available) return;
    let live = true;
    configurePurchases();
    getTips().then((t) => {
      if (!live) return;
      setTips(t);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [available]);

  const tip = useCallback((t: Tip) => leaveTip(t), []);
  return { supporter, ready, tips, tip, available };
}
