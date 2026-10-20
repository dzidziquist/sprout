import { TIPS_ENABLED } from '../config';

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
      'Your city: when you search for where you grow, the name you type goes to Open-Meteo’s free geocoder, and the city you pick has its past weather looked up once to learn its seasons. PlantFam never tracks your location or GPS position.',
      'Weather (grow patch): a 7-day forecast is fetched from Open-Meteo for your city’s coordinates. Like any website, Open-Meteo sees the request’s IP address.',
      'Photo ID and the plant doctor’s photo check (only when you use them): the one photo you choose is sent to Pl@ntNet to suggest a species, or possible pests and diseases. Nothing else about you or your plants is sent with it. Pl@ntNet’s own policy applies to how they handle that image.',
      ...(TIPS_ENABLED
        ? ['Tips (optional): Apple handles payment. RevenueCat records the tip with an anonymous app ID and your purchase receipt so the app can say thank you. Tips unlock no features. We never see your name, email or card.']
        : []),
      'Plant info: to show the About card on a plant’s page, the species name (for example “Goeppertia orbifolia”) is sent to Wikipedia to fetch its summary and photo. Nothing about you or your plants goes with it, and the result is kept on your phone.',
      'Reminders are scheduled on your phone. No notification server is involved.',
    ],
  },
  {
    title: 'What we never do',
    body: [
      'No analytics, ads or tracking SDKs, and no tracking across other apps or websites.',
      'We don’t sell, rent or share your data.',
      'We don’t track or store your location. Climate comes from a city you type.',
    ],
  },
  {
    title: 'Permissions',
    body: [
      'Camera and Photos: only when you add a diary photo, identify a plant or check a problem, and only the photos you pick.',
      'Notifications: one daily plant round, only if you turn it on. You can change this any time in Settings.',
      'Location (compass only): if you tap “Use phone compass” while setting up a room, iOS asks for location access because that’s how it shares the compass. PlantFam reads only which way the phone points, never where you are, and keeps nothing but the window direction you choose.',
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
