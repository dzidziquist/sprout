import { useCallback, useEffect, useState } from 'react';
import { usePlantStore } from '@/store/plantStore';
import {
  configurePurchases,
  FALLBACK_OFFERINGS,
  getOfferings,
  purchase as buy,
  purchasesAvailable,
  restore as restorePurchases,
  type Plan,
  type PlusOfferings,
  type PurchaseOutcome,
} from '@/lib/purchases';

export interface UsePlus {
  isPlus: boolean;
  /** Offerings have loaded (or we know purchases are unavailable and fell back). */
  ready: boolean;
  offerings: PlusOfferings;
  purchase: (plan: Plan) => Promise<PurchaseOutcome>;
  restore: () => Promise<PurchaseOutcome>;
  /** This build can sell Plus (iOS/Android with a RevenueCat key). */
  available: boolean;
  /** Dev builds without purchases only: flip Plus on/off so the flows are testable. Never set in production. */
  devUnlock?: (on: boolean) => void;
}

export function usePlus(): UsePlus {
  const isPlus = usePlantStore((s) => s.profile.plus);
  const setProfile = usePlantStore((s) => s.setProfile);
  const available = purchasesAvailable();
  const [offerings, setOfferings] = useState<PlusOfferings>(FALLBACK_OFFERINGS);
  const [ready, setReady] = useState(!available);

  useEffect(() => {
    if (!available) return;
    let live = true;
    configurePurchases();
    getOfferings().then((o) => {
      if (!live) return;
      setOfferings(o);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [available]);

  const purchase = useCallback((plan: Plan) => buy(plan), []);
  const restore = useCallback(() => restorePurchases(), []);
  const devUnlock = useCallback((on: boolean) => setProfile({ plus: on }), [setProfile]);

  return { isPlus, ready, offerings, purchase, restore, available, devUnlock: __DEV__ && !available ? devUnlock : undefined };
}
