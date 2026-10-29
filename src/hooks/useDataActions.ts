import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { useShallow } from 'zustand/react/shallow';
import { backupMyData, exportSpreadsheet, parseBackup, pickBackupText, type BackupData } from '@/lib/export';
import * as haptics from '@/lib/haptics';
import { showUndo } from '@/lib/undo';

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
 * Backup, restore and spreadsheet export for Settings → Your data. Free for everyone: everything
 * lives on the phone, so a backup file is the safety net. Restore validates the file and asks
 * before replacing anything.
 */
export function useDataActions() {
  const router = useRouter();
  const { profile, plants, events, setProfile, restoreBackup, restoreSnapshot } = usePlantStore(useShallow((s) => ({ profile: s.profile, plants: s.plants, events: s.events, setProfile: s.setProfile, restoreBackup: s.restoreBackup, restoreSnapshot: s.restoreSnapshot })));
  const [busy, setBusy] = useState<'backup' | 'restore' | 'csv' | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const last = fmt(profile.lastBackupAt);
  const newest = [profile.lastBackupAt, profile.cloudBackup?.lastAt].filter((d): d is string => !!d).sort().pop();
  const stale = !newest || Date.now() - new Date(newest).getTime() > 30 * 86400000;

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
      const snap = { profile, plants, events };
      restoreBackup(data);
      haptics.success();
      setMsg({ text: `Welcome back, ${data.plants.length} ${data.plants.length === 1 ? 'plant' : 'plants'}! 🌿` });
      router.replace('/');
      showUndo(`Restored ${data.plants.length} ${data.plants.length === 1 ? 'plant' : 'plants'}`, () => restoreSnapshot(snap));
    } catch (e) {
      setMsg({ text: (e as Error)?.message || 'Couldn’t read that file.', bad: true });
    } finally {
      setBusy(null);
    }
  };

  return { backup, restore, spreadsheet, busy, msg, last, stale: stale && plants.length > 0, hasPlants: plants.length > 0 };
}
