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
      'Your plants, care diary, harvests, family trees, streaks and settings are saved on this phone. Copies also go to your own iCloud through iCloud backup (on by default when iCloud Drive is on) and, if you use one, a household (below).',
      'Diary photos are copied into PlantFam’s own folder on your phone.',
      'There is no PlantFam account and no PlantFam server holding your data. We can’t see your plants.',
    ],
  },
  {
    title: 'Your iCloud',
    body: [
      'iCloud backup: on by default when iCloud Drive is turned on for this iPhone. Once a week PlantFam saves a backup of your plants, diary, diary photos and settings to its own folder in your iCloud, and keeps the last four. Turn it off any time in Settings → Your data → iCloud backup.',
      'Household: if you start or join one, the shared plants, diary entries, diary photos, the shared settings (your city, rooms, trips away, wishlist and grow patch progress) and the name you choose are kept in the household owner’s iCloud and shared only with the people the owner invites.',
      'Both are stored by Apple in iCloud under your Apple ID (or the household owner’s). The maker of PlantFam can’t see or reach any of it.',
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
      'Plant info: to show the About card on a plant’s page, the species name (for example “Goeppertia orbifolia”) is sent to Wikipedia to fetch its short summary. If you tap “Real photo”, the name of that photo’s file is sent to Wikimedia Commons to fetch the photo and its credit (who took it and its licence). Nothing about you or your plants goes with either, and the results are kept on your phone.',
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
      '“Back up now”: with iCloud backup on, it saves a backup to your iCloud straight away, diary photos included. With it off (or without iCloud), it makes a file you save and keep wherever you choose (Files, iCloud Drive, email); diary photos aren’t in that file. PlantFam never receives either.',
      'Settings → Delete all my data erases every plant, diary entry, photo and setting on this phone. Deleting the app does the same.',
      'iCloud backups stay in your iCloud until you remove them: iPhone Settings → your name → iCloud → Manage Storage → PlantFam. Leaving a household removes you from it; the owner stopping it ends the sharing.',
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
