import { SupportCard } from '@/components/SupportCard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { GlassButton } from '@/components/GlassButton';
import { useTabPadding } from '@/hooks/useTabPadding';
import { usePlantStore } from '@/store/plantStore';
import { Label, Sticker, Title } from '@/components/ui';
import { StreakCard } from '@/components/StreakCard';
import { BadgeSticker } from '@/components/BadgeSticker';
import { badgesFor, computeStreak, medalBadge } from '@/engine/streak';
import { rewardsFor } from '@/engine/rewards';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';

const GEAR =
  'M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z';

export default function MeScreen() {
  const router = useRouter();
  const pad = useTabPadding(16);
  const c = useColors();
  const { profile, setProfile, events, plants } = usePlantStore();
  const living = plants.filter((p) => !p.archivedAt);
  const livingIds = new Set(living.map((p) => p.id));
  const checks = events.filter((e) => e.type === 'check' && livingIds.has(e.plantId));
  const skips = checks.filter((e) => e.result === 'damp').length;

  const { streak, badges } = useMemo(() => {
    const input = { plants, events, climate: profile.climate, now: new Date() };
    const s = computeStreak(input);
    const core = badgesFor(input, s);
    const medal = medalBadge(rewardsFor(core, { supporter: profile.supporter, supporterSince: profile.supporterSince }).medal.at);
    return { streak: s, badges: medal ? [medal, ...core] : core };
  }, [plants, events, profile.climate, profile.supporter, profile.supporterSince]);
  const earned = badges.filter((b) => b.earnedAt).length;

  // profile.streakFreezes mirrors what's left this month (the engine refills it to 2 every month).
  useEffect(() => {
    if (profile.streakFreezes !== streak.freezesLeft) setProfile({ streakFreezes: streak.freezesLeft });
  }, [streak.freezesLeft, profile.streakFreezes, setProfile]);

  // Tips left before the supporter badge existed have no date yet: setProfile stamps one.
  useEffect(() => {
    if (profile.supporter && !profile.supporterSince) setProfile({ supporter: true });
  }, [profile.supporter, profile.supporterSince, setProfile]);


  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentInsetAdjustmentBehavior={pad.contentInsetAdjustmentBehavior} contentContainerStyle={[styles.page, { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom }]}>
      <View style={styles.headerRow}>
        <Title style={{ flex: 1 }}>Your green thumb</Title>
        <GlassButton accessibilityLabel="Settings" onPress={() => router.push('/settings')}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d={GEAR} stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Circle cx={12} cy={12} r={3} stroke={c.ink} strokeWidth={2} fill="none" />
          </Svg>
        </GlassButton>
      </View>

      <StreakCard streak={streak} />

      <View style={styles.stats}>
        <Sticker drop={0} bg={c.ice} style={styles.stat}>
          <Text style={[styles.statNum, { color: c.ink }]}>{checks.length}</Text>
          <Text style={[styles.statLabel, { color: c.ink }]}>checks</Text>
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

      <SupportCard />

      <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')}>
        <Sticker drop={0} bg={c.cloud} style={styles.settingsRow}>
          <Text style={[styles.settingsText, { color: c.ink }]}>Settings</Text>
          <Text style={[styles.settingsSub, { color: c.inkMuted }]}>Reminders, look, climate, backups, privacy</Text>
        </Sticker>
      </Pressable>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRow: { padding: 14, gap: 2 },
  settingsText: { fontFamily: fonts.display, fontSize: 18 },
  settingsSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
