import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { usePlantStore } from '../store/plantStore';

/*
 * PlantFam Plus via RevenueCat. RevenueCat is the source of truth on device; `profile.plus`
 * caches the entitlement so the UI is right offline and on first paint.
 *
 * Purchases only run on iOS/Android with an API key. On web (and in builds without a key)
 * `purchasesAvailable()` is false and the paywall shows fallback prices with a note.
 * The native module is required lazily so the web bundle never evaluates it.
 */

export const PLUS_ENTITLEMENT = 'plus';

export type PlanId = 'annual' | 'lifetime';

export interface Plan {
  id: PlanId;
  /** Localised store price, or our USD fallback when the store isn't reachable. */
  priceString: string;
  /** Annual only: price per month, e.g. "$1.67". */
  perMonthString?: string;
  /** Null when we're showing fallback prices (web, no key, offline, products not set up). */
  pkg: PurchasesPackage | null;
}

export interface PlusOfferings {
  annual: Plan;
  lifetime: Plan;
  /** True when prices came from the store rather than the fallback. */
  live: boolean;
}

export const FALLBACK_OFFERINGS: PlusOfferings = {
  annual: { id: 'annual', priceString: '$7.99', perMonthString: '$0.67', pkg: null },
  lifetime: { id: 'lifetime', priceString: '$19.99', pkg: null },
  live: false,
};

type PurchasesModule = typeof import('react-native-purchases');
type RC = PurchasesModule['default'];

const native = Platform.OS === 'ios' || Platform.OS === 'android';
const apiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY : undefined;

let mod: PurchasesModule | null | undefined;
function load(): PurchasesModule | null {
  if (mod !== undefined) return mod;
  try {
    mod = native && apiKey ? (require('react-native-purchases') as PurchasesModule) : null;
  } catch {
    mod = null;
  }
  return mod;
}
function rc(): RC | null {
  return load()?.default ?? null;
}

/** Can this build actually sell Plus? False on web, without a key, or if the native module is missing (Expo Go). */
export function purchasesAvailable(): boolean {
  return Boolean(native && apiKey && rc());
}

export function hasPlus(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.entitlements?.active?.[PLUS_ENTITLEMENT]);
}

function cache(info: CustomerInfo) {
  const plus = hasPlus(info);
  if (usePlantStore.getState().profile.plus !== plus) usePlantStore.getState().setProfile({ plus });
}

let configured = false;
/** Safe to call many times. Configures RevenueCat, then keeps `profile.plus` in sync with the store. */
export function configurePurchases(): boolean {
  if (configured) return true;
  const Purchases = rc();
  if (!Purchases || !apiKey) return false;
  try {
    Purchases.configure({ apiKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(cache);
    Purchases.getCustomerInfo().then(cache).catch(() => {});
  } catch {
    configured = false;
  }
  return configured;
}

export async function getOfferings(): Promise<PlusOfferings> {
  const Purchases = rc();
  if (!Purchases || !configurePurchases()) return FALLBACK_OFFERINGS;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return FALLBACK_OFFERINGS;
    const annual = current.annual ?? current.availablePackages.find((p) => p.packageType === 'ANNUAL') ?? null;
    const lifetime = current.lifetime ?? current.availablePackages.find((p) => p.packageType === 'LIFETIME') ?? null;
    return {
      annual: annual
        ? { id: 'annual', priceString: annual.product.priceString, perMonthString: annual.product.pricePerMonthString ?? undefined, pkg: annual }
        : FALLBACK_OFFERINGS.annual,
      lifetime: lifetime ? { id: 'lifetime', priceString: lifetime.product.priceString, pkg: lifetime } : FALLBACK_OFFERINGS.lifetime,
      live: Boolean(annual || lifetime),
    };
  } catch {
    return FALLBACK_OFFERINGS;
  }
}

export type PurchaseOutcome =
  | { ok: true; isPlus: boolean }
  | { ok: false; cancelled?: boolean; message: string };

const UNAVAILABLE = 'Plus is sold in the PlantFam iPhone app. Already bought it? Tap Restore there.';

export async function purchase(plan: Plan): Promise<PurchaseOutcome> {
  const Purchases = rc();
  if (!Purchases || !configurePurchases()) return { ok: false, message: UNAVAILABLE };
  if (!plan.pkg) return { ok: false, message: "We couldn't reach the App Store just now. Check your connection and try again." };
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    cache(customerInfo);
    return { ok: true, isPlus: hasPlus(customerInfo) };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string; message?: string };
    const codes = load()?.PURCHASES_ERROR_CODE;
    if (err.userCancelled || (codes && err.code === codes.PURCHASE_CANCELLED_ERROR)) return { ok: false, cancelled: true, message: '' };
    if (codes && err.code === codes.PAYMENT_PENDING_ERROR) return { ok: false, message: "Your payment is pending approval. Plus switches on as soon as it goes through." };
    if (codes && err.code === codes.NETWORK_ERROR) return { ok: false, message: "Looks like you're offline. Nothing was charged, try again in a moment." };
    return { ok: false, message: err.message || 'The purchase didn’t go through. Nothing was charged.' };
  }
}

export async function restore(): Promise<PurchaseOutcome> {
  const Purchases = rc();
  if (!Purchases || !configurePurchases()) return { ok: false, message: UNAVAILABLE };
  try {
    const info = await Purchases.restorePurchases();
    cache(info);
    return { ok: true, isPlus: hasPlus(info) };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || "We couldn't restore right now. Try again in a moment." };
  }
}
