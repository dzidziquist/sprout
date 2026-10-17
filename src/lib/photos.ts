import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

export type PhotoSource = 'library' | 'camera';

const DIARY = 'diary';

/** Turns a stored photo reference into a displayable URI (relative diary paths resolve against Documents). */
export function photoSrc(stored: string): string {
  if (Platform.OS === 'web' || !stored.startsWith(`${DIARY}/`)) return stored;
  return new File(Paths.document, stored).uri;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: true,
  aspect: [1, 1],
};

/** Copies a picked image into the app's documents (picker results live in a temp cache that iOS clears). */
function keep(uri: string): string {
  if (Platform.OS === 'web') return uri; // Web keeps the data/blob URI the picker returned.
  try {
    const dir = new Directory(Paths.document, DIARY);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const ext = (uri.split('?')[0].match(/\.(\w{3,4})$/)?.[1] ?? 'jpg').toLowerCase();
    const dest = new File(dir, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`);
    new File(uri).copy(dest);
    // Store a path relative to Documents: iOS moves the app container on every update,
    // so an absolute file:// path would break after the next App Store release.
    return `${DIARY}/${dest.name}`;
  } catch {
    // Copy failed (unusual): fall back to the picker's URI so the moment isn't lost.
    return uri;
  }
}

/**
 * Lets the user take or choose a photo. Resolves to a persistent URI, or null if they cancelled
 * or said no to permissions (we explain once, gently).
 */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  try {
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera is off', 'You can allow camera access in Settings, or pick a photo from your library instead.');
        return null;
      }
    }
    const res = source === 'camera' && Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (res.canceled || !res.assets?.[0]) return null;
    return keep(res.assets[0].uri);
  } catch {
    return null;
  }
}

/** Camera is only offered where it exists. */
export const canUseCamera = Platform.OS === 'ios' || Platform.OS === 'android';

/** Asks camera or library (native), or goes straight to the file picker (web). */
export function choosePhoto(): Promise<string | null> {
  if (!canUseCamera) return pickPhoto('library');
  return new Promise((resolve) => {
    const go = (src: PhotoSource) => pickPhoto(src).then(resolve);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take photo', 'Choose from library', 'Cancel'], cancelButtonIndex: 2 },
        (i) => (i === 0 ? go('camera') : i === 1 ? go('library') : resolve(null)),
      );
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Take photo', onPress: () => go('camera') },
        { text: 'Choose from library', onPress: () => go('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

/** Remove every diary photo from the phone (used by "Delete all my data"). */
export function deleteAllPhotos(): void {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, DIARY);
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to clean up, or the folder is already gone.
  }
}

/** Remove one diary photo's file from the phone. Photos from before the diary folder are left alone. */
export function deletePhoto(stored: string): void {
  if (Platform.OS === 'web' || !stored.startsWith(`${DIARY}/`)) return;
  try {
    const file = new File(Paths.document, stored);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}
