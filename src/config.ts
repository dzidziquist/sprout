import * as Application from 'expo-application';
import Constants from 'expo-constants';

/** App-wide links and contact details. Fill these in before the App Store submission. */
export const APP_VERSION = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.1.0';

/** Where people reach a human. TODO(founder): set a support address before launch; the contact row hides while empty. */
export const SUPPORT_EMAIL = '';

/** Developer website, used for support and privacy contact until a dedicated address exists. */
export const SUPPORT_URL = 'https://dzidziquist.com';

/** Public privacy policy, hosted on Notion (page "PlantFam Privacy Policy"). TODO(founder): publish it to the web and paste its notion.site URL here. */
export const PRIVACY_POLICY_URL = '';

/** PlantFam's App Store page (Apple ID 6823421043). It goes live once the app is approved. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6823421043';

/**
 * Tips are switched off: PlantFam is a free hobby app. The tip jar code stays so it can be turned
 * back on with a new build (create the consumables in App Store Connect and add the RevenueCat key first).
 */
export const TIPS_ENABLED = false;

/** Apple's standard licence agreement covers PlantFam's terms of use, including tips. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';


export const PRIVACY_UPDATED = 'October 18, 2026';
