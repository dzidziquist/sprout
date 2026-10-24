import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { daysInStage, nextStage } from '@/engine/growPatch';
import { edibleGuide } from '@/data/edibles';
import { Button, Sticker } from '@/components/ui';
import { GROW_ICON, Icon } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { EdibleStage, Plant } from '@/types';

/** The grow-patch stage track (same look as the Grow patch crop cards), for one plant. */
function Track({ plant, pending, onPick, c }: { plant: Plant; pending?: EdibleStage; onPick: (s: EdibleStage) => void; c: Palette }) {
  const guide = edibleGuide(plant.speciesId)!;
  const at = plant.stage ? guide.stages.indexOf(plant.stage) : -1;
  const n = guide.stages.length;
  return (
    <View style={styles.track}>
      <View style={[styles.trackLine, { backgroundColor: c.line, left: `${50 / n}%`, right: `${50 / n}%` }]} />
      {guide.stages.map((s, i) => {
        const done = i < at;
        const now = i === at;
        const picked = pending === s;
        const fill = picked ? c.grape : now ? c.sun : done ? c.leaf : c.card;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={`${guide.info[s]!.label}${now ? ', current stage' : ''}`}
            accessibilityState={{ selected: now }}
            disabled={now}
            onPress={() => onPick(s)}
            hitSlop={4}
            style={styles.stageCol}
          >
            <View style={[styles.dot, { borderColor: c.line, backgroundColor: fill }, (now || picked) && { boxShadow: `0px 0px 0px 3px ${c.card}, 0px 0px 0px 5px ${c.line}` }]}>
              {done && !picked ? (
                <Icon d={GROW_ICON.check} color={textOn(fill, c)} size={14} width={3.2} />
              ) : (
                <Text style={[styles.dotNum, { color: textOn(fill, c) }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stageLabel, { color: now || done || picked ? c.ink : c.inkMuted }]} numberOfLines={1}>
              {guide.info[s]!.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Plant page stage card for edibles: where it is, how long it's been there, the stage tip, a clear
 * "Next stage →" (with a confirm), harvest + grow patch shortcuts, and cut & regrow for regrowers.
 */
export function StagePanel({ plant, now }: { plant: Plant; now: Date }) {
  const c = useColors();
  const router = useRouter();
  const setStage = usePlantStore((s) => s.setStage);
  const logRegrow = usePlantStore((s) => s.logRegrow);
  const [pending, setPending] = useState<EdibleStage | undefined>();
  const guide = edibleGuide(plant.speciesId);
  if (!guide) return null;
  const info = plant.stage ? guide.info[plant.stage] : undefined;
  const days = daysInStage(plant, now);
  const next = nextStage(plant.speciesId, plant.stage);
  const regrown = plant.regrowCount ?? 0;

  const confirm = () => {
    if (!pending) return;
    setStage(plant.id, pending);
    haptics.success();
    setPending(undefined);
  };

  const regrow = () => {
    logRegrow(plant.id);
    // A fresh cut sends it back to growing.
    if (plant.stage === 'harvesting') setStage(plant.id, 'growing');
    haptics.success();
  };

  return (
    <Sticker drop={0} style={styles.card}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.ink }]}>Stage</Text>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: c.sun, borderColor: c.line }]}>
            <Text style={[styles.pillText, { color: textOn(c.sun, c) }]}>
              {info ? (days === undefined ? info.label : `${info.label} · day ${days + 1}`) : 'Not set'}
            </Text>
          </View>
          {guide.regrows && regrown > 0 ? (
            <View style={[styles.pill, { backgroundColor: c.grape, borderColor: c.line }]}>
              <Text style={[styles.pillText, { color: textOn(c.grape, c) }]}>Regrown ×{regrown}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Track plant={plant} pending={pending} c={c} onPick={(s) => { haptics.tap(); setPending(s === pending ? undefined : s); }} />

      {pending ? (
        <View style={[styles.confirm, { backgroundColor: c.lavender, borderColor: c.line }]}>
          <Text style={[styles.confirmText, { color: c.ink }]}>
            Move {plant.name} to <Text style={{ fontFamily: fonts.display }}>{guide.info[pending]!.label}</Text>?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Not yet" bg={c.card} onPress={() => setPending(undefined)} style={styles.half} />
            <Button title="Yes, move" bg={c.leaf} onPress={confirm} style={styles.half} />
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.tip, { color: c.ink }]}>{info ? info.tip : 'Tap the stage it’s at now and we’ll tailor the tips.'}</Text>
          {next ? (
            <Button
              title={plant.stage ? `Next stage: ${guide.info[next]!.label} →` : `Set stage: ${guide.info[next]!.label} →`}
              bg={c.lavender}
              onPress={() => { haptics.tap(); setPending(next); }}
              style={{ minHeight: 46 }}
            />
          ) : null}
        </>
      )}

      <View style={styles.actions}>
        <Button title="Log harvest" bg={c.peach} onPress={() => router.push(`/harvest/${plant.id}`)} style={styles.half} />
        {guide.regrows ? <Button title="Cut and regrow" bg={c.mint} onPress={regrow} style={styles.half} /> : null}
        <Button title="Open grow patch" bg={c.butter} onPress={() => router.push('/grow')} style={styles.half} />
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderWidth: 2, borderRadius: 14, height: 28, paddingHorizontal: 10, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  track: { flexDirection: 'row', position: 'relative' },
  trackLine: { position: 'absolute', top: 14, height: 2 },
  stageCol: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  stageLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  confirm: { borderWidth: 2, borderRadius: 16, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  tip: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { flexGrow: 1, flexBasis: '40%', minHeight: 44 },
});
