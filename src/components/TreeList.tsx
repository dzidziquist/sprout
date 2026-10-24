import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '../store/plantStore';
import type { FamilyLayout } from '../engine/treeLayout';
import { PlantBuddy } from './PlantBuddy';
import { nodeInfo } from './FamilyTree';
import { textOn, useColors, type Palette } from '../theme/theme';
import { fonts } from '../theme/tokens';
import * as haptics from '../lib/haptics';
import type { Plant } from '../types';

const INDENT = 22;
const MAX_INDENT_LEVELS = 5;

/**
 * A family as an indented outline: one row per plant, children under their parent. Used for families too wide
 * to read as a drawn tree on a phone; it grows downwards, so nothing is ever hidden off the side.
 * Pass an uncollapsed layout (nodes are depth-first, which is exactly outline order).
 */
export function TreeList({ family, now = new Date() }: { family: FamilyLayout<Plant>; now?: Date }) {
  const c = useColors();
  const router = useRouter();
  const faces = usePlantStore((s) => s.profile.faces);
  const styles = useMemo(() => makeStyles(c), [c]);
  const nodes = family.nodes.filter((n) => !n.more);
  // For each row: is it the last child of its parent? (draws └ instead of ├)
  const lastChild = useMemo(() => {
    const last = new Map<string, string>();
    for (const n of nodes) if (n.parentId) last.set(n.parentId, n.id);
    return new Set(last.values());
  }, [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <View style={styles.list}>
      {nodes.map((n, i) => {
        const p = n.plant;
        const info = nodeInfo(p, n.depth, now, c);
        const level = Math.min(n.depth, MAX_INDENT_LEVELS);
        // Ancestors (below the root) that still have younger siblings further down keep their line running past this row.
        const through: number[] = [];
        for (let a = byId.get(n.parentId ?? ''); a && a.depth > 0; a = byId.get(a.parentId ?? '')) {
          if (!lastChild.has(a.id) && a.depth <= MAX_INDENT_LEVELS) through.push(a.depth);
        }
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            accessibilityLabel={`${info.a11y}${n.depth ? `, generation ${n.depth + 1}` : ''}`}
            onPress={() => {
              router.push(`/plant/${p.id}`);
            }}
            style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.cloud }, pressed && { backgroundColor: c.cloud }]}
          >
            {level > 0 && (
              <View style={{ width: level * INDENT, alignSelf: 'stretch' }}>
                {through.map((d) => (
                  <View key={d} style={[styles.stem, { left: (d - 1) * INDENT + 8 }]} />
                ))}
                <View style={[styles.stem, { left: (level - 1) * INDENT + 8 }, lastChild.has(n.id) && { bottom: '50%' }]} />
                <View style={[styles.elbow, { left: (level - 1) * INDENT + 8 }]} />
              </View>
            )}
            <View style={[styles.thumb, { backgroundColor: info.tint }, info.gone && styles.thumbGone]}>
              <View style={info.gone && { opacity: 0.45 }}>
                <PlantBuddy speciesId={info.rooting ? 'cutting' : p.speciesId} mood={info.mood} pot={p.potColor} size={38} bg={info.tint} faces={faces} />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[styles.name, info.gone && { color: c.inkMuted }]}>
                {p.name}
              </Text>
              <Text numberOfLines={1} style={styles.sub}>
                {info.rooting ? (info.ready ? 'Ready to pot up!' : `Rooting · day ${info.days}`) : info.sub}
              </Text>
            </View>
            {info.corner && (
              <View style={[styles.tag, { backgroundColor: info.corner.fill }]}>
                <Text style={[styles.tagText, { color: textOn(info.corner.fill, c) }]}>{info.corner.text}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    list: { borderWidth: 2, borderColor: c.line, borderRadius: 20, backgroundColor: c.card, overflow: 'hidden', boxShadow: `0px 4px 0px ${c.drop}` },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 12, paddingVertical: 6 },
    stem: { position: 'absolute', top: -6, bottom: -6, width: 2, backgroundColor: c.inkMuted, opacity: 0.6 },
    elbow: { position: 'absolute', top: '50%', width: INDENT - 8, height: 2, backgroundColor: c.inkMuted, opacity: 0.6 },
    thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    thumbGone: { borderStyle: 'dashed', borderColor: c.inkMuted },
    name: { fontFamily: fonts.displaySemi, fontSize: 16, color: c.ink },
    sub: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.inkMuted },
    tag: { borderWidth: 2, borderColor: c.line, borderRadius: 10, paddingHorizontal: 7, height: 22, justifyContent: 'center' },
    tagText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  });
}
