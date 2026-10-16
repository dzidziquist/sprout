import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesStoreProduct } from 'react-native-purchases';
import { usePlantStore } from '../store/plantStore';

/*
 * The tip jar, via RevenueCat. Everything in PlantFam is free; tips are optional one-time
 * (consumable) purchases that unlock nothing. `profile.supporter` remembers that someone tipped,
 * so the app can say thank you.
 *
 * Purchases only run on iOS/Android with an API key. On web (and in builds without a key)
 * `purchasesAvailable()` is false and the tip jar shows fallback prices with a note.
 * The native module is required lazily so the web bundle never evaluates it.
 */

export type TipId = 'small' | 'medium' | 'large';

/** App Store Connect product ids (consumables). */
export const TIP_PRODUCTS: Record<TipId, string> = {
  small: 'plantfam_tip_small',
  medium: 'plantfam_tip_medium',
  large: 'plantfam_tip_large',
};

export interface Tip {
  id: TipId;
  /** Localised store price, or our USD fallback when the store isn't reachable. */
  priceString: string;
  /** Null when we're showing fallback prices (web, no key, offline, products not set up). */
  product: PurchasesStoreProduct | null;
}

export interface Tips {
  tips: Record<TipId, Tip>;
  /** True when prices came from the store rather than the fallback. */
  live: boolean;
}

export const FALLBACK_TIPS: Tips = {
  tips: {
    small: { id: 'small', priceString: '$2.99', product: null },
    medium: { id: 'medium', priceString: '$4.99', product: null },
    large: { id: 'large', priceString: '$9.99', product: null },
  },
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

/** Can this build take tips? False on web, without a key, or if the native module is missing (Expo Go). */
export function purchasesAvailable(): boolean {
  return Boolean(native && apiKey && rc());
}

const TIP_IDS = new Set(Object.values(TIP_PRODUCTS));

/** Has this customer ever left a tip? */
export function hasTipped(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.nonSubscriptionTransactions?.some((t) => TIP_IDS.has(t.productIdentifier)));
}

/** Only ever switches the thank-you on: a tip remembered on this phone stays remembered. */
function remember(info: CustomerInfo) {
  if (hasTipped(info) && !usePlantStore.getState().profile.supporter) usePlantStore.getState().setProfile({ supporter: true });
}

let configured = false;
/** Safe to call many times. Configures RevenueCat and picks up past tips. */
export function configurePurchases(): boolean {
  if (configured) return true;
  const Purchases = rc();
  if (!Purchases || !apiKey) return false;
  try {
    Purchases.configure({ apiKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(remember);
    Purchases.getCustomerInfo().then(remember).catch(() => {});
  } catch {
    configured = false;
  }
  return configured;
}

export async function getTips(): Promise<Tips> {
  const Purchases = rc();
  const mods = load();
  if (!Purchases || !mods || !configurePurchases()) return FALLBACK_TIPS;
  try {
    const products = await Purchases.getProducts(Object.values(TIP_PRODUCTS), mods.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    const byId = new Map(products.map((p) => [p.identifier, p]));
    const tips = { ...FALLBACK_TIPS.tips };
    let live = false;
    for (const id of Object.keys(TIP_PRODUCTS) as TipId[]) {
      const product = byId.get(TIP_PRODUCTS[id]);
      if (product) {
        tips[id] = { id, priceString: product.priceString, product };
        live = true;
      }
    }
    return { tips, live };
  } catch {
    return FALLBACK_TIPS;
  }
}

export type TipOutcome = { ok: true } | { ok: false; cancelled?: boolean; message: string };

const UNAVAILABLE = 'Tips work in the PlantFam iPhone app. Thank you for thinking of it!';

export async function leaveTip(tip: Tip): Promise<TipOutcome> {
  const Purchases = rc();
  if (!Purchases || !configurePurchases()) return { ok: false, message: UNAVAILABLE };
  if (!tip.product) return { ok: false, message: "We couldn't reach the App Store just now. Check your connection and try again." };
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(tip.product);
    remember(customerInfo);
    // The store confirmed the payment even if RevenueCat's history hasn't caught up yet.
    usePlantStore.getState().setProfile({ supporter: true });
    return { ok: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string; message?: string };
    const codes = load()?.PURCHASES_ERROR_CODE;
    if (err.userCancelled || (codes && err.code === codes.PURCHASE_CANCELLED_ERROR)) return { ok: false, cancelled: true, message: '' };
    if (codes && err.code === codes.PAYMENT_PENDING_ERROR) return { ok: false, message: 'Your tip is waiting for approval. Thank you!' };
    if (codes && err.code === codes.NETWORK_ERROR) return { ok: false, message: "Looks like you're offline. Nothing was charged, try again in a moment." };
    return { ok: false, message: err.message || 'The tip didn’t go through. Nothing was charged.' };
  }
}
