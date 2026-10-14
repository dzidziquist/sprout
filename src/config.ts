import Constants from 'expo-constants';

/** App-wide links and contact details. Fill these in before the App Store submission. */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

/** Where people reach a human. TODO(founder): set a support address before launch; the contact row hides while empty. */
export const SUPPORT_EMAIL = '';

/** Public copy of the privacy policy (docs/legal/privacy-policy.md), needed by App Store Connect. TODO(founder): host it and set the URL. */
export const PRIVACY_POLICY_URL = '';

/** Apple's standard licence agreement covers PlantFam's terms of use, including subscriptions. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export const PRIVACY_UPDATED = 'October 14, 2026';
