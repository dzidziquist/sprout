/*
 * The privacy policy in plain words. The in-app page renders this, and docs/legal/privacy-policy.md is
 * the public copy for App Store Connect: keep the two in step whenever the app's data use changes.
 */
export interface PrivacySection {
  title: string;
  body: string[];
}

export const PRIVACY_SUMMARY = 'Your plants live on your phone. No account, no ads, no tracking, and nothing is sold.';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: 'What stays on your phone',
    body: [
      'Your plants, care diary, harvests, family trees, streaks and settings are saved only on this device.',
      'Diary photos are copied into PlantFam’s own folder on your phone. They are not uploaded anywhere.',
      'There is no PlantFam account and no PlantFam server holding your data. We can’t see your plants.',
    ],
  },
  {
    title: 'What leaves your phone, and why',
    body: [
      'Weather (grow patch): PlantFam asks Open-Meteo for a 7-day forecast for your city (Seattle or Accra), using the city’s fixed coordinates, never your location. Like any website, Open-Meteo sees the request’s IP address.',
      'Photo ID (only when you use it): the one photo you choose is sent to Pl@ntNet to suggest a species. Nothing else about you or your plants is sent with it. Pl@ntNet’s own policy applies to how they handle that image.',
      'Purchases (PlantFam Plus): Apple handles payment. RevenueCat checks whether you have Plus using an anonymous app ID and your purchase receipts. We never see your name, email or card.',
      'Reminders are scheduled on your phone. No notification server is involved.',
    ],
  },
  {
    title: 'What we never do',
    body: [
      'No analytics, ads or tracking SDKs, and no tracking across other apps or websites.',
      'We don’t sell, rent or share your data.',
      'We don’t use your location. Climate is a city you pick.',
    ],
  },
  {
    title: 'Permissions',
    body: [
      'Camera and Photos: only when you add a diary photo or identify a plant, and only the photos you pick.',
      'Notifications: one daily plant round, only if you turn it on. You can change this any time in Settings.',
    ],
  },
  {
    title: 'Backups and deleting your data',
    body: [
      'A backup is a file you save and keep wherever you choose (Files, iCloud Drive, email). PlantFam never receives it. Diary photos aren’t included.',
      'Settings → Delete all my data erases every plant, diary entry, photo and setting on this phone. Deleting the app does the same.',
      'Your iPhone’s own backups may include PlantFam’s data, the same as for other apps.',
    ],
  },
  {
    title: 'Children',
    body: ['PlantFam is a general-audience app and isn’t directed at children under 13. We don’t knowingly collect anyone’s personal information.'],
  },
  {
    title: 'Changes',
    body: ['If PlantFam ever starts handling data differently, this page will say so before it happens, with the date it changed.'],
  },
];
