import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '../store/plantStore';
import { backupMyData, exportSpreadsheet, parseBackup, pickBackupText, type BackupData } from '../lib/export';
import * as haptics from '../lib/haptics';
import { Button, Sticker } from './ui';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined);

function confirm(title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  return new Promise((resolve) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Restore', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/**
 * Free for everyone: everything lives on the phone, so a backup file is the safety net.
 * Restore validates the file and asks before replacing anything.
 */
export function DataCard() {
  const c = useColors();
  const router = useRouter();
  const { profile, plants, events, setProfile, restoreBackup } = usePlantStore();
  const [busy, setBusy] = useState<'backup' | 'restore' | 'csv' | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const last = fmt(profile.lastBackupAt);
  const stale = !profile.lastBackupAt || Date.now() - new Date(profile.lastBackupAt).getTime() > 30 * 86400000;

  const backup = async () => {
    setBusy('backup');
    setMsg(null);
    const res = await backupMyData({ profile, plants, events });
    setBusy(null);
    if (res.ok) {
      haptics.success();
      setProfile({ lastBackupAt: new Date().toISOString() });
      setMsg({ text: 'Backup saved. Keep it in Files, iCloud Drive or email it to yourself.' });
    } else setMsg({ text: res.message, bad: true });
  };

  const spreadsheet = async () => {
    setBusy('csv');
    setMsg(null);
    const res = await exportSpreadsheet({ profile, plants, events });
    setBusy(null);
    if (res.ok) haptics.success();
    setMsg(res.ok ? { text: 'Care diary exported. Open it in Numbers, Excel or Sheets.' } : { text: res.message, bad: true });
  };

  const restore = async () => {
    setMsg(null);
    setBusy('restore');
    try {
      const text = await pickBackupText();
      if (!text) return;
      const parsed = parseBackup(text);
      if (!parsed.ok) return setMsg({ text: parsed.message, bad: true });
      const data: BackupData = parsed.data;
      const when = fmt(data.exportedAt);
      const ok = await confirm(
        `Restore ${data.plants.length} ${data.plants.length === 1 ? 'plant' : 'plants'}?`,
        `This replaces the ${plants.length} ${plants.length === 1 ? 'plant' : 'plants'} on this phone with the backup${when ? ` from ${when}` : ''}. Diary photos aren’t inside backups.`,
      );
      if (!ok) return;
      restoreBackup(data);
      haptics.success();
      setMsg({ text: `Welcome back, ${data.plants.length} ${data.plants.length === 1 ? 'plant' : 'plants'}! 🌿` });
      router.replace('/');
    } catch (e) {
      setMsg({ text: (e as Error)?.message || 'Couldn’t read that file.', bad: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.section, { color: c.inkMuted }]} accessibilityRole="header">
        YOUR DATA
      </Text>
      <Sticker drop={0} style={styles.card}>
        <Text style={[styles.body, { color: c.ink }]}>
          Your plants live only on this phone: no account, no tracking. {last ? `Last backup: ${last}.` : 'No backup yet.'}
        </Text>
        {stale && plants.length > 0 && <Text style={[styles.small, { color: c.warn }]}>A quick backup keeps your fam safe if you lose or switch phones.</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={busy === 'backup' ? 'Saving…' : 'Back up now'} raised disabled={!!busy} onPress={backup} style={{ flex: 1 }} />
          <Button title={busy === 'restore' ? 'Opening…' : 'Restore'} bg={c.cloud} disabled={!!busy} onPress={restore} style={{ flex: 1 }} />
        </View>
        <Button title={busy === 'csv' ? 'Exporting…' : 'Export care diary (spreadsheet)'} bg={c.card} disabled={!!busy || plants.length === 0} onPress={spreadsheet} />
        {msg && <Text style={[styles.small, { color: msg.bad ? c.warn : c.good }]}>{msg.text}</Text>}
      </Sticker>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 10 },
  section: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 0.6, paddingHorizontal: 4 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
});
