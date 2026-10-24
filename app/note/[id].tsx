import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { GlassButton } from '@/components/GlassButton';
import { Button, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { Glyph } from '@/components/Glyph';

/** Change or remove a note from a plant's history (or a photo's caption). */
export default function NoteSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const event = usePlantStore((s) => s.events.find((e) => e.id === id && (e.type === 'note' || e.type === 'photo')));
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === event?.plantId));
  const editNote = usePlantStore((s) => s.editNote);
  const [text, setText] = useState(event?.note ?? '');
  const [confirm, setConfirm] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = useDiscardGuard(text !== (event?.note ?? ''));

  if (!event) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const photo = event.type === 'photo';
  const when = new Date(event.at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const save = () => {
    // Emptying a plain note is a delete, so ask first.
    if (!photo && !text.trim()) return remove();
    editNote(event.id, text);
    haptics.success();
    go(close);
  };
  const remove = () => {
    const del = () => {
      editNote(event.id, '');
      haptics.success();
      go(close);
    };
    // Web has no native alert, so the preview asks with a second tap instead.
    if (Platform.OS !== 'web') {
      Alert.alert('Delete this note?', 'It comes off the plant’s history.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: del },
      ]);
      return;
    }
    if (!confirm) {
      haptics.tap();
      setConfirm(true);
      return;
    }
    del();
  };

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>
      <Title>{photo ? 'Photo caption' : 'Note'}</Title>
      <Text style={[styles.sub, { color: c.inkMuted }]}>
        {plant ? `${plant.name} · ` : ''}
        {when}
      </Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setConfirm(false);
        }}
        placeholder={photo ? 'Add a caption…' : 'What happened?'}
        placeholderTextColor={c.inkMuted}
        multiline
        maxLength={500}
        autoFocus
        style={[styles.input, { backgroundColor: c.cloud, color: c.ink }]}
        accessibilityLabel={photo ? 'Caption' : 'Note'}
      />
      <Button title={!photo && !text.trim() ? 'Delete note' : 'Save'} raised bg={!photo && !text.trim() ? c.coral : c.leaf} onPress={save} style={{ minHeight: 56 }} />
      {!photo && !!text.trim() && (
        <Pressable accessibilityRole="button" onPress={remove} hitSlop={8} style={styles.delete}>
          <Text style={[styles.deleteText, { color: c.warn }]}>{confirm ? 'Tap again to delete' : 'Delete note'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 14, marginTop: -8 },
  input: { minHeight: 120, borderRadius: 14, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 13, textAlignVertical: 'top', fontFamily: fonts.bodyHeavy, fontSize: 16 },
  delete: { alignSelf: 'center', padding: 8 },
  deleteText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
});
