import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Button, Sticker, Title } from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import { usePlantStore } from '@/store/plantStore';
import { exportMyData } from '@/lib/export';
import type { PlanId } from '@/lib/purchases';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { SpeciesId } from '@/types';

const TERMS_URL = 'https://plantfam.app/terms';
const PRIVACY_URL = 'https://plantfam.app/privacy';

const BENEFITS: { icon: 'camera' | 'box' | 'heart'; title: string; body: string; tint: keyof Pick<Palette, 'butter' | 'ice' | 'blush'> }[] = [
  { icon: 'camera', title: 'Photo ID', body: 'Snap a leaf, get suggestions from Pl@ntNet, and you confirm who it is.', tint: 'butter' },
  { icon: 'box', title: 'Export my data', body: 'Your plants and care diary as JSON and a CSV spreadsheet, any time.', tint: 'ice' },
  { icon: 'heart', title: 'Back an indie developer', body: 'PlantFam is built by one indie developer. Plus keeps it growing.', tint: 'blush' },
];

function BenefitIcon({ kind, color }: { kind: 'camera' | 'box' | 'heart'; color: string }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {kind === 'camera' && (
        <>
          <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" {...p} />
          <Path d="M12 9.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z" {...p} />
        </>
      )}
      {kind === 'box' && (
        <>
          <Path d="M12 4v10M8 10l4 4 4-4" {...p} />
          <Path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" {...p} />
        </>
      )}
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

export default function PlusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { isPlus, ready, offerings, purchase, restore, available, devUnlock } = usePlus();
  const [plan, setPlan] = useState<PlanId>('lifetime');
  const [busy, setBusy] = useState<'buy' | 'restore' | 'export' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSuccess = () => {
    haptics.success();
    if (from === 'identify') router.replace('/identify');
  };

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
    </GlassButton>
  );

  if (isPlus) {
    const doExport = async () => {
      setBusy('export');
      const { profile, plants, events } = usePlantStore.getState();
      const res = await exportMyData({ profile, plants, events });
      setBusy(null);
      setMsg(res.ok ? 'Export ready. Your files are on their way.' : res.message);
    };
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.header}>
          <View />
          {close}
        </View>
        <Sticker bg={c.leaf} style={styles.hero}>
          <Buddies c={c} ids={['tomato', 'monstera', 'hoya']} />
          <Text style={[styles.kicker, { color: textOn(c.leaf, c) }]}>PlantFam Plus ✓</Text>
          <Text style={[styles.heroTitle, { color: textOn(c.leaf, c) }]}>Thank you for growing with us!</Text>
          <Text style={[styles.heroBody, { color: textOn(c.leaf, c) }]}>Your support keeps PlantFam indie. Everything in Plus is switched on.</Text>
        </Sticker>
        <Button title="Identify a plant" raised onPress={() => router.replace('/identify')} style={styles.bigBtn} textStyle={styles.bigBtnText} />
        <Button title={busy === 'export' ? 'Exporting…' : 'Export my data'} bg={c.card} disabled={busy === 'export'} onPress={doExport} style={{ minHeight: 50 }} />
        {msg && <Text style={[styles.msg, { color: c.ink }]}>{msg}</Text>}
        {devUnlock && <Button title="Developer: turn Plus off" bg={c.cloud} onPress={() => devUnlock(false)} style={{ minHeight: 44 }} />}
      </ScrollView>
    );
  }

  const selected = offerings[plan];

  const buy = async () => {
    haptics.tap();
    setMsg(null);
    setBusy('buy');
    const res = await purchase(selected);
    setBusy(null);
    if (res.ok) {
      if (res.isPlus) onSuccess();
      else setMsg('Thanks! Your purchase went through. Plus switches on in a moment.');
    } else if (!res.cancelled) setMsg(res.message);
  };

  const doRestore = async () => {
    haptics.tap();
    setMsg(null);
    setBusy('restore');
    const res = await restore();
    setBusy(null);
    if (res.ok && res.isPlus) onSuccess();
    else if (res.ok) setMsg("We couldn't find Plus on this Apple ID. Bought it on another account? Sign in with that one and try again.");
    else setMsg(res.message);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}>
        <Title style={{ flex: 1, fontSize: 26 }}>{from === 'identify' ? 'Photo ID is a Plus thing' : 'PlantFam Plus'}</Title>
        {close}
      </View>

      <Sticker bg={c.leaf} style={styles.hero}>
        <Buddies c={c} ids={['pothos', 'monstera', 'pepper']} />
        <Text style={[styles.heroTitle, { color: textOn(c.leaf, c) }]}>Superpowers for your fam</Text>
        <Text style={[styles.heroBody, { color: textOn(c.leaf, c) }]}>The plant round, care diary and Offshoots stay free forever. Plus adds a few extras.</Text>
      </Sticker>

      <View style={{ gap: 10 }}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefit}>
            <View style={[styles.benefitIcon, { backgroundColor: c[b.tint], borderColor: c.line }]}>
              <BenefitIcon kind={b.icon} color={c.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.benefitTitle, { color: c.ink }]}>{b.title}</Text>
              <Text style={[styles.benefitBody, { color: c.inkMuted }]}>{b.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.plans} accessibilityRole="radiogroup">
        <PlanCard
          c={c}
          on={plan === 'annual'}
          onPress={() => setPlan('annual')}
          name="Yearly"
          price={offerings.annual.priceString}
          per="per year"
          sub={`about ${offerings.annual.perMonthString ?? '$1.67'}/month`}
        />
        <PlanCard c={c} on={plan === 'lifetime'} onPress={() => setPlan('lifetime')} name="Lifetime" price={offerings.lifetime.priceString} per="once" sub="pay once, yours forever" badge="Best value" />
      </View>

      <Text style={[styles.honest, { color: c.ink }]}>No trial that charges you later. Cancel anytime in Settings.</Text>

      <Button
        title={busy === 'buy' ? 'One moment…' : plan === 'lifetime' ? `Get Lifetime for ${selected.priceString}` : `Get Yearly for ${selected.priceString}/yr`}
        raised
        disabled={busy !== null || (available && !ready)}
        onPress={buy}
        style={styles.bigBtn}
        textStyle={styles.bigBtnText}
      />
      {!available && !msg && <Text style={[styles.small, { color: c.inkMuted, textAlign: 'center' }]}>Purchases open in the PlantFam iPhone app.</Text>}
      {available && !ready && <ActivityIndicator color={c.ink} />}
      {msg && <Text style={[styles.msg, { color: c.ink }]}>{msg}</Text>}
      {devUnlock && <Button title="Developer unlock (dev builds only)" bg={c.cloud} onPress={() => { devUnlock(true); onSuccess(); }} style={{ minHeight: 44 }} />}

      <Pressable accessibilityRole="button" onPress={doRestore} disabled={busy !== null} style={styles.restore} hitSlop={6}>
        <Text style={[styles.restoreText, { color: c.ink }]}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text>
      </Pressable>

      <Text style={[styles.small, { color: c.inkMuted }]}>
        Yearly renews automatically each year until you cancel in Settings › Apple ID › Subscriptions, at least 24 hours before it renews. Lifetime is a one-time purchase. Payment is charged to your Apple ID.
      </Text>
      <View style={styles.legal}>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={[styles.link, { color: c.inkMuted }]}>Terms of Use</Text>
        <Text style={[styles.small, { color: c.inkMuted }]}>·</Text>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={[styles.link, { color: c.inkMuted }]}>Privacy Policy</Text>
      </View>
    </ScrollView>
  );
}

function PlanCard({ c, on, onPress, name, price, per, sub, badge }: { c: Palette; on: boolean; onPress: () => void; name: string; price: string; per: string; sub: string; badge?: string }) {
  const fill = on ? (badge ? c.sun : c.mint) : c.card;
  const ink = on ? textOn(fill, c) : c.ink;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${name}, ${price} ${per}, ${sub}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.plan, { backgroundColor: fill, borderColor: c.line, boxShadow: on ? `0px 5px 0px ${c.drop}` : 'none' }, on && { transform: [{ translateY: -2 }] }]}
    >
      {badge && (
        <View style={[styles.badge, { backgroundColor: c.coral, borderColor: c.line }]}>
          <Text style={[styles.badgeText, { color: textOn(c.coral, c) }]}>{badge}</Text>
        </View>
      )}
      <View style={styles.planTop}>
        <Text style={[styles.planName, { color: ink }]}>{name}</Text>
        <View style={[styles.radio, { borderColor: on ? ink : c.line, backgroundColor: on ? ink : 'transparent' }]}>
          {on && (
            <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={fill} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          )}
        </View>
      </View>
      <Text style={[styles.planPrice, { color: ink }]}>{price}</Text>
      <Text style={[styles.planPer, { color: ink }]}>{per}</Text>
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
  plans: { flexDirection: 'row', gap: 12, paddingTop: 10 },
  plan: { flex: 1, borderWidth: 2, borderRadius: 22, padding: 14, paddingTop: 16, gap: 0 },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontFamily: fonts.displaySemi, fontSize: 17 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  planPrice: { fontFamily: fonts.display, fontSize: 30, marginTop: 6 },
  planPer: { fontFamily: fonts.bodyHeavy, fontSize: 13, marginTop: -2 },
  planSub: { fontFamily: fonts.bodyHeavy, fontSize: 12, marginTop: 8 },
  badge: { position: 'absolute', top: -14, alignSelf: 'center', borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  honest: { fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  bigBtn: { minHeight: 58 },
  bigBtnText: { fontSize: 19, fontFamily: fonts.display },
  msg: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  restore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  restoreText: { fontFamily: fonts.displaySemi, fontSize: 16, textDecorationLine: 'underline' },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  legal: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  link: { fontFamily: fonts.bodyHeavy, fontSize: 12, textDecorationLine: 'underline', paddingVertical: 6 },
});
