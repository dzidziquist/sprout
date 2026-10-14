import { PlusCard } from '@/components/PlusCard';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore, type FaceStyle, type Profile } from '@/store/plantStore';
import { Label, Sticker, Title } from '@/components/ui';
import { StreakCard } from '@/components/StreakCard';
import { BadgeSticker } from '@/components/BadgeSticker';
import { badgesFor, computeStreak } from '@/engine/streak';
import * as haptics from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import { requestPermission } from '@/lib/notifications';

const TIMES = [
  { label: '8:30 am', hour: 8, minute: 30 },
  { label: '12:30 pm', hour: 12, minute: 30 },
  { label: '6:30 pm', hour: 18, minute: 30 },
];

const FACE_NOTE: Record<FaceStyle, string> = {
  full: 'Moods and little speech bubbles. Never guilt-trips.',
  gentle: 'Soft smiles only, no worried faces.',
  off: 'Plain plants and simple text.',
};

const THEMES: { id: Profile['theme']; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.card }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.tap();
              onChange(o.id);
            }}
            style={[styles.segBtn, on && { backgroundColor: c.ink }]}
          >
            <Text style={[styles.segText, { color: on ? c.bg : c.ink }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { profile, setProfile, events, plants } = usePlantStore();
  const living = plants.filter((p) => !p.archivedAt);
  const livingIds = new Set(living.map((p) => p.id));
  const checks = events.filter((e) => e.type === 'check' && livingIds.has(e.plantId));
  const skips = checks.filter((e) => e.result === 'damp').length;

  const { streak, badges } = useMemo(() => {
    const input = { plants, events, climate: profile.climate, now: new Date() };
    const s = computeStreak(input);
    return { streak: s, badges: badgesFor(input, s) };
  }, [plants, events, profile.climate]);
  const earned = badges.filter((b) => b.earnedAt).length;

  // profile.streakFreezes mirrors what's left this month (the engine refills it to 2 every month).
  useEffect(() => {
    if (profile.streakFreezes !== streak.freezesLeft) setProfile({ streakFreezes: streak.freezesLeft });
  }, [streak.freezesLeft, profile.streakFreezes, setProfile]);

  const roundValue = profile.round.enabled ? (TIMES.find((t) => t.hour === profile.round.hour && t.minute === profile.round.minute)?.label ?? null) : 'Off';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}>
      <Title>Your green thumb</Title>

      <StreakCard streak={streak} />

      <View style={styles.stats}>
        <Sticker drop={0} bg={c.ice} style={styles.stat}>
          <Text style={[styles.statNum, { color: c.ink }]}>{checks.length}</Text>
          <Text style={[styles.statLabel, { color: c.ink }]}>soil checks</Text>
        </Sticker>
        <Sticker drop={0} bg={c.lavender} style={styles.stat}>
          <Text style={[styles.statNum, { color: c.ink }]}>{skips}</Text>
          <Text style={[styles.statLabel, { color: c.ink }]}>smart skips</Text>
        </Sticker>
        <Sticker drop={0} bg={c.butter} style={styles.stat}>
          <Text style={[styles.statNum, { color: c.ink }]}>{living.length}</Text>
          <Text style={[styles.statLabel, { color: c.ink }]}>in the fam</Text>
        </Sticker>
      </View>

      <View style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Label>Milestones</Label>
          <Label muted>{earned} of {badges.length}</Label>
        </View>
        <View style={styles.badges}>
          {badges.map((b) => (
            <BadgeSticker key={b.id} badge={b} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Plant faces</Label>
        <Segmented
          label="Plant faces"
          value={profile.faces}
          options={(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1) }))}
          onChange={(f) => setProfile({ faces: f })}
        />
        <Label muted>{FACE_NOTE[profile.faces]}</Label>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Daily plant round</Label>
        <Segmented
          label="Daily plant round"
          value={roundValue}
          options={[...TIMES.map((t) => ({ id: t.label, label: t.label })), { id: 'Off', label: 'Off' }]}
          onChange={async (v) => {
            if (v === 'Off') {
              setProfile({ round: { ...profile.round, enabled: false } });
              return;
            }
            const t = TIMES.find((x) => x.label === v)!;
            const ok = Platform.OS === 'web' ? true : await requestPermission();
            setProfile({ round: { enabled: ok, hour: t.hour, minute: t.minute } });
          }}
        />
        <Label muted>One reminder, only on days a plant needs a soil check.</Label>
      </View>

      <PlusCard />

      <View style={{ gap: 8 }}>
        <Label>Appearance</Label>
        <Segmented label="Appearance" value={profile.theme} options={THEMES} onChange={(t) => setProfile({ theme: t })} />
        <Label muted>{profile.theme === 'system' ? 'Follows your phone’s light or dark setting.' : profile.theme === 'dark' ? 'Easy on the eyes for late-night plant rounds.' : 'Bright and sunny, always.'}</Label>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Climate</Label>
        <Sticker drop={0} bg={c.mint} style={{ padding: 12 }}>
          <Text style={[styles.statLabel, { color: c.ink }]}>
            {profile.city} · {profile.climate === 'seattle' ? 'Marine: dark wet winters, dry summers' : 'Tropical: harmattan and two rainy seasons'}
          </Text>
        </Sticker>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 20 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12, borderRadius: 18 },
  statNum: { fontFamily: fonts.display, fontSize: 26 },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 14 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderRadius: 16 },
  segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15 },
});
