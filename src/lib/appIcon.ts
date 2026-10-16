import { Platform } from 'react-native';

/*
 * Alternate app icons, a supporter thank-you. The icons themselves are set up by the
 * expo-alternate-app-icons plugin in app.json (names there must match these ids).
 * The native module is required lazily: it's missing on web and in Expo Go.
 */

export type AppIconId = 'Night' | 'Cactus' | 'Sunny' | 'Party';

export const APP_ICONS: { id: AppIconId | null; label: string; preview: number }[] = [
  { id: null, label: 'Classic', preview: require('../../assets/icon.png') },
  { id: 'Night', label: 'Night', preview: require('../../assets/icons/icon-night.png') },
  { id: 'Cactus', label: 'Cactus', preview: require('../../assets/icons/icon-cactus.png') },
  { id: 'Sunny', label: 'Sunny', preview: require('../../assets/icons/icon-sunny.png') },
  { id: 'Party', label: 'Party', preview: require('../../assets/icons/icon-party.png') },
];

type Mod = typeof import('expo-alternate-app-icons');
let mod: Mod | null | undefined;
function load(): Mod | null {
  if (mod !== undefined) return mod;
  try {
    mod = Platform.OS === 'ios' || Platform.OS === 'android' ? (require('expo-alternate-app-icons') as Mod) : null;
  } catch {
    mod = null;
  }
  return mod;
}

/** Can this phone switch icons? False on web, in Expo Go, and on devices that don't allow it. */
export function appIconsAvailable(): boolean {
  try {
    return Boolean(load()?.supportsAlternateIcons);
  } catch {
    return false;
  }
}

export function currentAppIcon(): AppIconId | null {
  try {
    return (load()?.getAppIconName() as AppIconId | null) ?? null;
  } catch {
    return null;
  }
}

/** Switch icons. Returns false if the phone said no. */
export async function setAppIcon(id: AppIconId | null): Promise<boolean> {
  const m = load();
  if (!m) return false;
  try {
    await m.setAlternateAppIcon(id);
    return true;
  } catch {
    return false;
  }
}
