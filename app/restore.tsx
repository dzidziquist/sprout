import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { GlassButton } from '@/components/GlassButton';
import { Glyph } from '@/components/Glyph';
import { Row, Section } from '@/components/SettingsList';
import { Title } from '@/components/ui';
import { useDataActions } from '@/hooks/useDataActions';
import { backupDay, type BackupEntry } from '@/engine/cloudBackup';
import { listCloudBackups, restoreFromCloud } from '@/lib/cloudBackup';
import { showUndo } from '@/lib/undo';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/** Restore: the iCloud backups (newest first, one row a week), or a backup file from anywhere. */
export default function RestoreScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const here = usePlantStore((s) => s.plants.length);
  const restoreSnapshot = usePlantStore((s) => s.restoreSnapshot);
  const data = useDataActions();
  const [entries, setEntries] = useState<BackupEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCloudBackups()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const bringBack = async (entry: BackupEntry) => {
    setError(null);
    setBusy('Opening the backup…');
    try {
      const { data: restored, snap } = await restoreFromCloud(entry, (done, total) => setBusy(`Bringing back photos: ${done} of ${total}`));
      haptics.success();
      router.replace('/');
      showUndo(`Restored ${count(restored.plants.length, 'plant')}`, () => restoreSnapshot(snap));
    } catch (e) {
      setError((e as Error)?.message || 'Couldn’t open that backup. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  const inHousehold = () => {
    if (!usePlantStore.getState().profile.household) return false;
    Alert.alert('You’re in a household', 'Restoring would replace the household’s plants for everyone. Leave the household (Me → Household) first, then restore.');
    return true;
  };

  const pick = (entry: BackupEntry) => {
    if (busy || inHousehold()) return;
    if (!here) return bringBack(entry);
    Alert.alert(
      `Restore ${count(entry.plants, 'plant')}?`,
      `This replaces the ${count(here, 'plant')} on this phone with the backup from ${backupDay(entry.at)}. You can undo it straight after.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => bringBack(entry) },
      ],
    );
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={{ flexDirection: 'row' }}>
        <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}>
          <Glyph name="back" size={18} color={c.ink} width={2.6} />
        </GlassButton>
      </View>
      <Title>Restore</Title>

      {entries === null ? (
        <View style={styles.wait}>
          <ActivityIndicator color={c.ink} />
          <Text style={[styles.note, { color: c.inkMuted }]}>Looking in iCloud…</Text>
        </View>
      ) : entries.length ? (
        <Section title="From iCloud">
          {entries.map((e, i) => (
            <Row key={`${e.chain}/${e.file}`} label={backupDay(e.at)} sub={`${count(e.plants, 'plant')} · ${count(e.photos, 'photo')}`} onPress={() => pick(e)} last={i === entries.length - 1} />
          ))}
        </Section>
      ) : (
        <Text style={[styles.note, { color: c.inkMuted }]}>No iCloud backups yet. They’re saved once a week while iCloud backup is on in Settings.</Text>
      )}

      <Section title="Other" footer={busy ?? error ?? 'Restoring replaces the plants on this phone. You can undo it straight after.'}>
        <Row label="Choose a backup file" value={data.busy === 'restore' ? 'Opening…' : undefined} onPress={busy || data.busy ? undefined : () => !inHousehold() && data.restore()} last />
      </Section>
      {data.msg && <Text style={[styles.note, { color: data.msg.bad ? c.warn : c.good }]}>{data.msg.text}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.xl },
  wait: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  note: { fontFamily: fonts.bodyHeavy, ...type.callout, paddingHorizontal: 4 },
});
