import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type PickedPhoto = { uri: string; width?: number; height?: number; mimeType?: string | null };

/**
 * Downscales a picked photo so its longer side is at most `maxSide`, saved once as a JPEG. A phone
 * camera's full-size shot is 12–48 MP and several MB: slow to save, to show in the diary and to upload.
 * Small photos, the web, and any failure keep the original.
 */
export async function shrinkPhoto(photo: PickedPhoto, maxSide: number, compress = 0.75): Promise<{ uri: string; mimeType?: string }> {
  const original = { uri: photo.uri, mimeType: photo.mimeType ?? undefined };
  const { width = 0, height = 0 } = photo;
  if (Platform.OS === 'web' || !width || !height || Math.max(width, height) <= maxSide) return original;
  try {
    const size = width >= height ? { width: maxSide } : { height: maxSide };
    const image = await ImageManipulator.manipulate(photo.uri).resize(size).renderAsync();
    const out = await image.saveAsync({ compress, format: SaveFormat.JPEG });
    return { uri: out.uri, mimeType: 'image/jpeg' };
  } catch {
    return original;
  }
}
