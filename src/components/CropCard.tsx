import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { useUnits } from '@/hooks/useUnits';
import { localizeTemps } from '@/lib/units';
import { daysInStage, feedingAdvice } from '@/engine/growPatch';
import { withNextFeed } from '@/engine/feeding';
import { edibleGuide } from '@/data/edibles';
import { speciesOf } from '@/data/species';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Sticker } from '@/components/ui';
import { GROW_ICON, Icon } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { fonts, type } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { EdibleStage, Plant } from '@/types';

export function StageTrack({ plant, pending, onPick, c }: { plant: Plant; pending?: EdibleStage; onPick: (s: EdibleStage) => void; c: Palette }) {
  const guide = edibleGuide(plant.speciesId)!;
  const at = plant.stage ? guide.stages.indexOf(plant.stage) : -1;
  return (
    <View style={styles.track}>
      <View style={[styles.trackLine, { backgroundColor: c.line, left: `${50 / guide.stages.length}%`, right: `${50 / guide.stages.length}%` }]} />
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
            <View
              style={[
                styles.dot,
                { borderColor: c.line, backgroundColor: fill },
                (now || picked) && { boxShadow: `0px 0px 0px 3px ${c.card}, 0px 0px 0px 5px ${c.line}` },
              ]}
            >
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

export function CropCard({ plant, total, now }: { plant: Plant; total?: string; now: Date }) {
  const events = usePlantStore((s) => s.events);
  const units = useUnits();
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const faces = usePlantStore((s) => s.profile.faces);
  const setStage = usePlantStore((s) => s.setStage);
  const logRegrow = usePlantStore((s) => s.logRegrow);
  const [pending, setPending] = useState<EdibleStage | undefined>();
  const guide = edibleGuide(plant.speciesId)!;
  const species = speciesOf(plant);
  const tint = c.potTint[plant.potColor];
  const info = plant.stage ? guide.info[plant.stage] : undefined;
  const days = daysInStage(plant, now);

  const confirm = () => {
    if (!pending) return;
    setStage(plant.id, pending);
    haptics.success();
    setPending(undefined);
  };

  const regrow = () => {
    logRegrow(plant.id);
    // A fresh cut sends a harvesting plant back to growing (the store does it, so deleting the cut undoes it).
    haptics.success();
  };

  return (
    <Sticker drop={5} style={{ overflow: 'hidden' }}>
      <View style={[styles.cropHead, { backgroundColor: tint, borderColor: c.line }]}>
        <View style={{ flex: 1, gap: 2, paddingVertical: 14 }}>
          <Text style={[styles.cropName, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
          <Text style={[styles.cropKind, { color: c.ink }]} numberOfLines={1}>
            {species.commonName}
            {plant.room ? ` · ${plant.room}` : ''}
          </Text>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={[styles.pillText, { color: c.ink }]}>
                {info ? (days === undefined ? info.label : `${info.label} · day ${days + 1}`) : 'Set a stage'}
              </Text>
            </View>
            {guide.regrows && (plant.regrowCount ?? 0) > 0 ? (
              <View style={[styles.pill, { backgroundColor: c.grape, borderColor: c.line }]}>
                <Text style={[styles.pillText, { color: textOn(c.grape, c) }]}>Regrown ×{plant.regrowCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.cropBuddy}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} size={104} bg={tint} faces={faces} />
        </View>
      </View>

      <View style={styles.cropBody}>
        <StageTrack plant={plant} pending={pending} c={c} onPick={(s) => { haptics.tap(); setPending(s === pending ? undefined : s); }} />

        {pending ? (
          <View style={[styles.confirm, { backgroundColor: c.lavender, borderColor: c.line }]}>
            <Text style={[styles.confirmText, { color: c.ink }]}>
              Move {plant.name} to <Text style={{ fontFamily: fonts.display }}>{guide.info[pending]!.label}</Text>?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Not yet" bg={c.card} onPress={() => setPending(undefined)} style={styles.confirmBtn} />
              <Button title="Yes, move" bg={c.leaf} onPress={confirm} style={styles.confirmBtn} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={[styles.tip, { color: c.ink }]}>{info ? localizeTemps(info.tip, units) : 'Tap the stage it’s at now and we’ll tailor the tips.'}</Text>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.feed} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{localizeTemps(withNextFeed(feedingAdvice(plant, climate, now), plant.id, events, now), units)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.harvest} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{total ? `Harvested ${total}` : 'No harvest yet. The first one gets a party.'}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button title="Log harvest" raised bg={c.leaf} onPress={() => router.push(`/harvest/${plant.id}`)} style={styles.action} />
          {guide.regrows ? <Button title="Cut and regrow" raised bg={c.card} onPress={regrow} style={styles.action} /> : null}
        </View>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  tileWrap: { width: '48%' },
  tileArt: { alignItems: 'center', paddingTop: 10, borderBottomWidth: 2 },
  tileChip: { position: 'absolute', top: 8, left: 8, maxWidth: '88%', borderWidth: 2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tileChipText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  tileBody: { padding: 10, gap: 6 },
  tileName: { fontFamily: fonts.display, ...type.headline },
  tileKind: { fontFamily: fonts.bodyHeavy, ...type.caption },
  tileTrack: { flexDirection: 'row', gap: 3 },
  tileSeg: { flex: 1, height: 6, borderRadius: 3 },
  tileStage: { fontFamily: fonts.bodyHeavy, ...type.caption },
  cropHead: { flexDirection: 'row', paddingLeft: 16, borderBottomWidth: 2, minHeight: 118 },
  cropName: { fontFamily: fonts.display, ...type.title2 },
  cropKind: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { borderWidth: 2, borderRadius: 14, minHeight: 28, paddingVertical: 2, paddingHorizontal: 10, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.caption },
  cropBuddy: { width: 112, alignItems: 'center', justifyContent: 'flex-end', marginBottom: -6 },
  cropBody: { padding: 14, gap: 14 },
  track: { flexDirection: 'row', position: 'relative' },
  trackLine: { position: 'absolute', top: 14, height: 2 },
  stageCol: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontFamily: fonts.bodyHeavy, ...type.caption },
  stageLabel: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  confirm: { borderWidth: 2, borderRadius: 16, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.bodyHeavy, ...type.body },
  confirmBtn: { flex: 1, minHeight: 42 },
  tip: { fontFamily: fonts.bodyHeavy, ...type.callout },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.bodyHeavy, ...type.footnote, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 46 },
});

/**
 * The compact tile for the Grow patch grid: the crop, its stage on a small track, and one chip only when
 * it needs you. Tap opens the full card; press and hold gives the quick actions.
 */
export function CropTile({ plant, chip, chipTint, onOpen, onHold }: { plant: Plant; chip?: string; chipTint?: string; onOpen: () => void; onHold: () => void }) {
  const c = useColors();
  const faces = usePlantStore((s) => s.profile.faces);
  const guide = edibleGuide(plant.speciesId)!;
  const species = speciesOf(plant);
  const tint = c.potTint[plant.potColor];
  const at = plant.stage ? guide.stages.indexOf(plant.stage) : -1;
  const stage = plant.stage && at >= 0 ? `${guide.info[plant.stage]!.label} · stage ${at + 1} of ${guide.stages.length}` : 'Set a stage';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[plant.name, species.commonName, stage, chip].filter(Boolean).join(', ')}
      accessibilityHint="Opens the crop card. Press and hold for quick actions."
      accessibilityActions={[{ name: 'longpress', label: 'Quick actions' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onHold()}
      onPress={() => {
        haptics.tap();
        onOpen();
      }}
      onLongPress={() => {
        haptics.tap();
        onHold();
      }}
      style={({ pressed }) => [styles.tileWrap, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Sticker drop={4} style={{ overflow: 'hidden' }}>
        <View style={[styles.tileArt, { backgroundColor: tint, borderColor: c.line }]}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} size={96} bg={tint} faces={faces} />
          {chip ? (
            <View style={[styles.tileChip, { backgroundColor: chipTint ?? c.sun, borderColor: c.line }]}>
              <Text style={[styles.tileChipText, { color: textOn(chipTint ?? c.sun, c) }]} numberOfLines={1}>{chip}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.tileBody}>
          <View>
            <Text style={[styles.tileName, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
            <Text style={[styles.tileKind, { color: c.inkMuted }]} numberOfLines={1}>{species.commonName}</Text>
          </View>
          <View style={styles.tileTrack}>
            {guide.stages.map((s, i) => (
              <View key={s} style={[styles.tileSeg, { backgroundColor: i < at ? c.leaf : i === at ? c.sun : c.cloud }, i === at && { borderWidth: 1, borderColor: c.line }]} />
            ))}
          </View>
          <Text style={[styles.tileStage, { color: c.ink }]} numberOfLines={1}>{stage}</Text>
        </View>
      </Sticker>
    </Pressable>
  );
}

