import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePlantStore } from '../store/plantStore';
import { moodFor } from '../engine/careEngine';
import { edgePath, isReadyToPotUp, rootingDays, rootingProgress, type FamilyLayout, type LayoutOptions, type RootingMethod } from '../engine/treeLayout';
import { PlantBuddy } from './PlantBuddy';
import { TreeScrollCue } from './TreeScrollCue';
import { textOn, useColors, type Palette } from '../theme/theme';
import { fonts } from '../theme/tokens';
import * as haptics from '../lib/haptics';
import type { Plant } from '../types';

/** Node geometry shared by the screen (for layoutForest) and the drawing below. */
export const TREE_LAYOUT: LayoutOptions = { nodeWidth: 108, nodeHeight: 132, gapX: 6, gapY: 26, padding: 4 };

const CIRCLE = 72;
/** Room around the circle for the rooting progress ring. */
const RING_GAP = 6;
const CIRCLE_TOP = RING_GAP + 2;
const CIRCLE_CY = CIRCLE_TOP + CIRCLE / 2;

const ARCHIVED_LABEL: Record<NonNullable<Plant['archivedReason']>, string> = { gifted: 'gifted', died: 'in memory', composted: 'composted' };

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function methodFill(m: RootingMethod, c: Palette) {
  return m === 'water' ? c.sky : m === 'moss' ? c.leafLight : m === 'soil' ? c.orange : c.bubblegum;
}

/** What a family-tree node shows for a plant: tint, mood, subtitle, corner tag and a screen-reader label. */
export function nodeInfo(p: Plant, depth: number, now: Date, c: Palette) {
  const gone = !!p.archivedAt;
  const rooting = !gone ? p.rooting : undefined;
  const ready = isReadyToPotUp(p, now);
  const tint = rooting ? c.ice : gone ? c.card : c.potTint[p.potColor];
  const mood = gone ? ('snoozing' as const) : rooting ? ('happy' as const) : moodFor(p, now);
  const sub = gone
    ? monthYear(p.archivedAt!)
    : depth === 0
      ? `The OG · ${new Date(p.acquiredAt).getFullYear()}`
      : `${p.origin === 'cutting' ? 'Cutting' : 'Baby'} · ${monthYear(p.acquiredAt)}`;
  const corner = rooting ? { text: rooting.method, fill: methodFill(rooting.method, c) } : gone ? { text: ARCHIVED_LABEL[p.archivedReason ?? 'gifted'], fill: c.cloud } : null;
  const days = rooting ? rootingDays(rooting.startedAt, now) : 0;
  const a11y = `${p.name}, ${gone ? `${ARCHIVED_LABEL[p.archivedReason ?? 'gifted']}, ` : ''}${rooting ? `rooting in ${rooting.method}, day ${days}${ready ? ', ready to pot up' : ''}` : sub}`;
  return { gone, rooting, ready, tint, mood, sub, corner, days, a11y };
}

/** "+6 more" (and how many of their babies come along). */
export function moreLabel(n: { more?: number; hiddenTotal?: number }) {
  const extra = (n.hiddenTotal ?? 0) - (n.more ?? 0);
  return { title: `${n.more} more`, sub: extra > 0 ? `+${extra} of their babies` : 'tap to show' };
}

/**
 * One drawn family. `bleed` is the page's side padding: when the tree is wider than the screen it scrolls
 * sideways edge to edge instead of being clipped at the padding, with fades and arrows on the edges that
 * still hide nodes. `onExpand` opens a collapsed "+N more" group.
 */
export function FamilyTree({
  family,
  now = new Date(),
  bleed = 0,
  onExpand,
}: {
  family: FamilyLayout<Plant>;
  now?: Date;
  bleed?: number;
  onExpand?: (parentId: string) => void;
}) {
  const c = useColors();
  const router = useRouter();
  const faces = usePlantStore((s) => s.profile.faces);
  const styles = useMemo(() => makeStyles(c), [c]);
  const [available, setAvailable] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const centredFor = useRef(-1);
  const { width, height, nodes, edges } = family;
  const archived = useMemo(() => new Set(nodes.filter((n) => n.plant.archivedAt && !n.more).map((n) => n.id)), [nodes]);
  const ringed = useMemo(() => new Set(nodes.filter((n) => n.plant.rooting && !n.plant.archivedAt && !n.more).map((n) => n.id)), [nodes]);
  const viewport = available + 2 * bleed;
  const content = width + 2 * bleed;
  const scrolls = available > 0 && width > available;
  const hiddenLeft = scrolls && scrollX > 8;
  const hiddenRight = scrolls && scrollX < content - viewport - 8;

  const scrollBy = (dir: -1 | 1) => {
    haptics.tap();
    const x = Math.max(0, Math.min(content - viewport, scrollX + dir * viewport * 0.7));
    scroller.current?.scrollTo({ x, animated: true });
    setScrollX(x);
  };

  const canvas = (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {edges.map((e) => (
          <Path
            key={`${e.from}>${e.to}`}
            d={edgePath({ ...e, y1: e.y1 - 2, y2: e.y2 + (ringed.has(e.to) ? 2 : CIRCLE_TOP) })}
            stroke={c.line}
            strokeOpacity={archived.has(e.to) || e.to.endsWith('+more') ? 0.55 : 1}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={archived.has(e.to) || e.to.endsWith('+more') ? '2 7' : undefined}
            fill="none"
          />
        ))}
        {nodes.map((n) => {
          const r = n.plant.rooting;
          if (!r || n.plant.archivedAt || n.more) return null;
          const radius = CIRCLE / 2 + RING_GAP / 2 + 1;
          const len = 2 * Math.PI * radius;
          const prog = rootingProgress(r, now);
          return [
            <Circle key={`${n.id}-track`} cx={n.cx} cy={n.y + CIRCLE_CY} r={radius} stroke={c.cloud} strokeWidth={5} fill="none" />,
            <Circle
              key={`${n.id}-ring`}
              cx={n.cx}
              cy={n.y + CIRCLE_CY}
              r={radius}
              stroke={prog >= 1 ? c.leaf : c.sky}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.01, prog) * len} ${len}`}
              transform={`rotate(-90 ${n.cx} ${n.y + CIRCLE_CY})`}
              fill="none"
            />,
          ];
        })}
      </Svg>

      {nodes.map((n) => {
        const box = { left: n.x, top: n.y, width: TREE_LAYOUT.nodeWidth, height: TREE_LAYOUT.nodeHeight };
        if (n.more) {
          const label = moreLabel(n);
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`Show ${label.title} of ${n.plant.name}'s babies`}
              onPress={() => {
                haptics.tap();
                onExpand?.(n.plant.id);
              }}
              style={({ pressed }) => [styles.node, box, pressed && { transform: [{ translateY: 2 }] }]}
            >
              <View style={[styles.circle, styles.moreCircle]}>
                <Text style={styles.moreNum}>+{n.more}</Text>
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {label.title}
              </Text>
              <Text numberOfLines={1} style={[styles.sub, { color: c.ink }]}>
                {label.sub}
              </Text>
            </Pressable>
          );
        }
        const p = n.plant;
        const info = nodeInfo(p, n.depth, now, c);
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            accessibilityLabel={info.a11y}
            onPress={() => {
              haptics.tap();
              router.push(`/plant/${p.id}`);
            }}
            style={({ pressed }) => [styles.node, box, pressed && { transform: [{ translateY: 2 }] }]}
          >
            <View style={[styles.circle, { backgroundColor: info.tint }, info.gone ? styles.circleGone : { boxShadow: `0px 3px 0px ${c.drop}` }]}>
              <View style={info.gone && { opacity: 0.45 }}>
                <PlantBuddy speciesId={info.rooting ? 'cutting' : p.speciesId} mood={info.mood} pot={p.potColor} size={CIRCLE - 10} bg={info.tint} faces={faces} />
              </View>
            </View>
            {info.corner && (
              <View style={[styles.corner, { backgroundColor: info.corner.fill }]}>
                <Text style={[styles.cornerText, { color: textOn(info.corner.fill, c) }]}>{info.corner.text}</Text>
              </View>
            )}
            <Text numberOfLines={1} style={[styles.name, info.gone && { color: c.inkMuted }]}>
              {p.name}
            </Text>
            {info.rooting ? (
              <View style={[styles.pill, { backgroundColor: info.ready ? c.leaf : c.ice }]}>
                <Text numberOfLines={1} style={[styles.pillText, { color: info.ready ? textOn(c.leaf, c) : c.ink }]}>
                  {info.ready ? 'ready to pot!' : `rooting · day ${info.days}`}
                </Text>
              </View>
            ) : (
              <Text numberOfLines={1} style={styles.sub}>
                {info.sub}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View onLayout={(e) => setAvailable(e.nativeEvent.layout.width)}>
      {scrolls ? (
        <View style={{ marginHorizontal: -bleed }}>
          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
            onContentSizeChange={(w) => {
              // Start with the root (the OG) in the middle of the screen rather than the far-left leaf,
              // and re-centre when a collapsed group opens and the tree gets wider.
              if (centredFor.current === w) return;
              centredFor.current = w;
              const rootCx = nodes[0]?.cx ?? 0;
              const x = Math.max(0, Math.min(content - viewport, rootCx + bleed - viewport / 2));
              setScrollX(x);
              requestAnimationFrame(() => scroller.current?.scrollTo({ x, animated: false }));
            }}
            contentContainerStyle={{ paddingHorizontal: bleed, paddingBottom: 4 }}
          >
            {canvas}
          </ScrollView>
          <TreeScrollCue side="left" visible={hiddenLeft} onPress={() => scrollBy(-1)} />
          <TreeScrollCue side="right" visible={hiddenRight} onPress={() => scrollBy(1)} />
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>{canvas}</View>
      )}
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    node: { position: 'absolute', alignItems: 'center' },
    circle: {
      marginTop: CIRCLE_TOP,
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      borderWidth: 2,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    circleGone: { borderStyle: 'dashed', borderColor: c.inkMuted },
    moreCircle: { borderStyle: 'dashed', backgroundColor: c.cloud },
    moreNum: { fontFamily: fonts.display, fontSize: 24, color: c.ink },
    corner: {
      position: 'absolute',
      top: 0,
      right: 0,
      borderWidth: 2,
      borderColor: c.line,
      borderRadius: 10,
      paddingHorizontal: 6,
      height: 20,
      justifyContent: 'center',
    },
    cornerText: { fontFamily: fonts.bodyHeavy, fontSize: 10, letterSpacing: 0.2 },
    name: { marginTop: RING_GAP + 4, fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 19, color: c.ink, maxWidth: '100%' },
    sub: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 15, color: c.inkMuted, maxWidth: '100%' },
    pill: { marginTop: 2, borderWidth: 2, borderColor: c.line, borderRadius: 10, paddingHorizontal: 7, height: 21, justifyContent: 'center', maxWidth: '100%' },
    pillText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  });
}
