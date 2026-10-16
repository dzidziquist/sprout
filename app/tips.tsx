import { TERMS_URL } from '@/config';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Button, Sticker, Title } from '@/components/ui';
import { useTips } from '@/hooks/useTips';
import type { TipId } from '@/lib/purchases';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { SpeciesId } from '@/types';


type Why = 'heart' | 'camera' | 'sprout';

/** Where tips go, in plain words. Nothing here is a feature you pay for. */
const WHERE: { icon: Why; title: string; body: string; tint: keyof Pick<Palette, 'butter' | 'ice' | 'blush'> }[] = [
  { icon: 'heart', title: 'Keeps PlantFam free', body: 'No ads, no subscriptions, nothing locked. Tips cover the $99 a year Apple charges to be on the App Store.', tint: 'blush' },
  { icon: 'camera', title: 'Room for photo ID to grow', body: 'Photo ID runs on a free shared allowance. Tips are set aside for more if PlantFam gets popular.', tint: 'ice' },
  { icon: 'sprout', title: 'New plants, art and features', body: 'Widgets, share cards and a plant year in review are next, free for everyone.', tint: 'butter' },
];

const TIPS: { id: TipId; name: string; sub: string }[] = [
  { id: 'small', name: 'Seed', sub: 'a little thanks' },
  { id: 'medium', name: 'Sprout', sub: 'a watering can’s worth' },
  { id: 'large', name: 'Big leaf', sub: 'you’re a legend' },
];

function WhyIcon({ kind, color }: { kind: Why; color: string }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {kind === 'camera' && (
        <>
          <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" {...p} />
          <Path d="M12 9.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z" {...p} />
        </>
      )}
      {kind === 'sprout' && <Path d="M12 21v-8M12 13c-4 0-6-3-6-6 4 0 6 2 6 6zM12 13c4 0 6-3 6-6-4 0-6 2-6 6z" {...p} />}
      {kind === 'heart' && <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...p} />}
    </Svg>
  );
}

function Buddies({ c, ids }: { c: Palette; ids: [SpeciesId, SpeciesId, SpeciesId] }) {
  return (
    <View style={styles.buddies}>
      <View style={[styles.buddyTile, { backgroundColor: c.butter, borderColor: c.line, transform: [{ rotate: '-7deg' }, { translateY: 8 }] }]}>
        <PlantBuddy speciesId={ids[0]} size={76} />
      </View>
      <View style={[styles.buddyTile, styles.buddyBig, { backgroundColor: c.lavender, borderColor: c.line }]}>
        <PlantBuddy speciesId={ids[1]} size={96} />
      </View>
      <View style={[styles.buddyTile, { backgroundColor: c.ice, borderColor: c.line, transform: [{ rotate: '6deg' }, { translateY: 8 }] }]}>
        <PlantBuddy speciesId={ids[2]} size={76} />
      </View>
    </View>
  );
}

/** The tip jar: everything in PlantFam is free, and tips are a thank-you that unlocks nothing. */
export default function TipJarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { supporter, ready, tips, tip, available } = useTips();
  const [choice, setChoice] = useState<TipId>('medium');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [justTipped, setJustTipped] = useState(false);
  const selected = tips.tips[choice];

  const send = async () => {
    haptics.tap();
    setMsg(null);
    setBusy(true);
    const res = await tip(selected);
    setBusy(false);
    if (res.ok) {
      haptics.success();
      setJustTipped(true);
      setMsg('Thank you! That made the whole fam smile. 💚');
    } else if (!res.cancelled) setMsg(res.message);
  };

  const thanks = supporter || justTipped;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}>
        <Title style={{ flex: 1, fontSize: 26 }}>Tip jar</Title>
        <GlassButton accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
        </GlassButton>
      </View>

      <Sticker bg={c.leaf} style={styles.hero}>
        <Buddies c={c} ids={thanks ? ['tomato', 'monstera', 'hoya'] : ['pothos', 'monstera', 'pepper']} />
        {thanks && <Text style={[styles.kicker, { color: textOn(c.leaf, c) }]}>PlantFam supporter 💚</Text>}
        <Text style={[styles.heroTitle, { color: textOn(c.leaf, c) }]}>{thanks ? 'Thank you for growing with us!' : 'Everything in PlantFam is free'}</Text>
        <Text style={[styles.heroBody, { color: textOn(c.leaf, c) }]}>
          {thanks
            ? 'Your tip keeps PlantFam indie, ad-free and free for everyone. Another one is always welcome, never expected.'
            : 'No subscriptions, no ads, nothing locked. If PlantFam makes your plants happier, a tip helps keep it growing.'}
        </Text>
      </Sticker>

      <View style={{ gap: 10 }}>
        <Text style={[styles.sectionTitle, { color: c.ink }]}>Where tips go</Text>
        {WHERE.map((b) => (
          <View key={b.title} style={styles.benefit}>
            <View style={[styles.benefitIcon, { backgroundColor: c[b.tint], borderColor: c.line }]}>
              <WhyIcon kind={b.icon} color={c.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.benefitTitle, { color: c.ink }]}>{b.title}</Text>
              <Text style={[styles.benefitBody, { color: c.inkMuted }]}>{b.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.plans} accessibilityRole="radiogroup">
        {TIPS.map((t) => (
          <TipCard key={t.id} c={c} on={choice === t.id} onPress={() => setChoice(t.id)} name={t.name} price={tips.tips[t.id].priceString} sub={t.sub} />
        ))}
      </View>

      <Text style={[styles.honest, { color: c.ink }]}>A one-time tip. It doesn’t unlock anything: everything is already yours.</Text>

      <Button
        title={!available ? 'Tips open in the iPhone app' : busy ? 'One moment…' : `Tip ${selected.priceString}`}
        raised
        disabled={!available || busy || !ready}
        onPress={send}
        style={styles.bigBtn}
        textStyle={styles.bigBtnText}
      />
      {available && !ready && <ActivityIndicator color={c.ink} />}
      {msg && <Text style={[styles.msg, { color: c.ink }]}>{msg}</Text>}

      <Text style={[styles.small, { color: c.inkMuted }]}>
        Tips are one-time payments charged to your Apple ID. They never renew and don’t unlock features.
      </Text>
      <View style={styles.legal}>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={[styles.link, { color: c.inkMuted }]}>Terms of Use</Text>
        <Text style={[styles.small, { color: c.inkMuted }]}>·</Text>
        <Text accessibilityRole="link" onPress={() => router.push('/privacy')} style={[styles.link, { color: c.inkMuted }]}>Privacy Policy</Text>
      </View>
    </ScrollView>
  );
}

function TipCard({ c, on, onPress, name, price, sub }: { c: Palette; on: boolean; onPress: () => void; name: string; price: string; sub: string }) {
  const fill = on ? c.sun : c.card;
  const ink = on ? textOn(fill, c) : c.ink;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${name} tip, ${price}, ${sub}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.plan, { backgroundColor: fill, borderColor: c.line, boxShadow: on ? `0px 5px 0px ${c.drop}` : 'none' }, on && { transform: [{ translateY: -2 }] }]}
    >
      <View style={styles.planTop}>
        <Text style={[styles.planName, { color: ink }]} numberOfLines={1}>{name}</Text>
        <View style={[styles.radio, { borderColor: on ? ink : c.line, backgroundColor: on ? ink : 'transparent' }]}>
          {on && (
            <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={fill} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          )}
        </View>
      </View>
      <Text style={[styles.planPrice, { color: ink }]} adjustsFontSizeToFit numberOfLines={1}>{price}</Text>
      <Text style={[styles.planSub, { color: on ? ink : c.inkMuted }]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  hero: { paddingTop: 14, paddingBottom: 18, paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  buddies: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 },
  buddyTile: { width: 88, height: 88, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  buddyBig: { width: 108, height: 108, borderRadius: 28 },
  kicker: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  heroTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, textAlign: 'center' },
  heroBody: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontFamily: fonts.displaySemi, fontSize: 17 },
  benefitBody: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 18 },
  plans: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  plan: { flex: 1, borderWidth: 2, borderRadius: 20, padding: 10, paddingTop: 12, gap: 0 },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { flexShrink: 1, fontFamily: fonts.displaySemi, fontSize: 15 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  planPrice: { fontFamily: fonts.display, fontSize: 24, marginTop: 6 },
  planSub: { fontFamily: fonts.bodyHeavy, fontSize: 12, marginTop: 8 },
  honest: { fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  bigBtn: { minHeight: 58 },
  bigBtnText: { fontSize: 19, fontFamily: fonts.display },
  msg: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  legal: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  link: { fontFamily: fonts.bodyHeavy, fontSize: 12, textDecorationLine: 'underline', paddingVertical: 6 },
});
