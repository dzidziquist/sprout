import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import * as haptics from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { Plant } from '@/types';

type ArchiveReason = NonNullable<Plant['archivedReason']>;

export const ARCHIVE_COPY: Record<'gifted' | 'died', { title: string; done: string }> = {
  gifted: { title: 'Gifted away', done: 'off to a new home' },
  died: { title: "It didn't make it", done: 'kept in memory' },
};

/** Everything you can do to a plant from a menu, shared by the iOS context menu, the fallback sheet and Edit. */
export function usePlantActions(plant: Plant | undefined, opts: { onDeleted?: () => void } = {}) {
  const router = useRouter();
  const { plants, takeCutting, archivePlant, deletePlant, restorePlant } = usePlantStore();
  if (!plant) return null;
  return {
    log: () => router.push(`/log/${plant.id}`),
    edit: () => router.push(`/edit/${plant.id}`),
    open: () => router.push(`/plant/${plant.id}`),
    cutting: () => {
      const n = plants.filter((p) => p.parentId === plant.id).length + 1;
      const child = takeCutting(plant.id, `${plant.name} baby ${n}`, 'water');
      haptics.success();
      if (child) router.push(`/plant/${child.id}`);
    },
    archive: (reason: ArchiveReason) => {
      archivePlant(plant.id, reason);
      haptics.success();
    },
    restore: () => {
      restorePlant(plant.id);
      haptics.success();
    },
    /** Permanently removes the plant. Call after the user confirmed. */
    remove: () => {
      deletePlant(plant.id);
      opts.onDeleted?.();
    },
  };
}

export const deleteCopy = (name: string) => ({
  title: `Delete ${name} for good?`,
  body: `This removes ${name} and its diary. To keep them in Offshoots as a memory, choose Archive instead.`,
});

/** Native confirm (iOS/Android). Web uses the in-sheet confirm step instead. */
export function confirmDelete(name: string, onConfirm: () => void) {
  const c = deleteCopy(name);
  Alert.alert(c.title, c.body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Wraps a plant card. Tap opens the plant. On iOS, press-and-hold shows the native context menu
 * with a live preview; on Android and web, a long-press opens an equivalent action sheet.
 */
export function PlantMenu({ plant, children, style, onDeleted }: { plant: Plant; children: React.ReactNode; style?: StyleProp<ViewStyle>; onDeleted?: () => void }) {
  const actions = usePlantActions(plant, { onDeleted });
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (!actions) return null;
  const label = `${plant.name} details`;
  const hint = 'Press and hold for more actions';

  if (Platform.OS === 'ios') {
    const archived = !!plant.archivedAt;
    const items = archived
      ? [
          <Link.MenuAction key="restore" title="Bring back to the jungle" icon="arrow.uturn.backward" onPress={actions.restore} />,
          <Link.MenuAction key="delete" title="Delete" icon="trash" destructive onPress={() => confirmDelete(plant.name, actions.remove)} />,
        ]
      : [
          <Link.MenuAction key="log" title="Log care" icon="checklist" onPress={actions.log} />,
          <Link.MenuAction key="edit" title="Edit" icon="pencil" onPress={actions.edit} />,
          <Link.MenuAction key="cut" title="Take a cutting" icon="scissors" onPress={actions.cutting} />,
          // Nested menus are supported at runtime; the prop type only lists actions.
          (
            <Link.Menu key="archive" title="Archive…" icon="archivebox">
              <Link.MenuAction title={ARCHIVE_COPY.gifted.title} icon="gift" onPress={() => actions.archive('gifted')} />
              <Link.MenuAction title={ARCHIVE_COPY.died.title} icon="leaf" onPress={() => actions.archive('died')} />
            </Link.Menu>
          ) as unknown as React.ReactElement<React.ComponentProps<typeof Link.MenuAction>>,
          <Link.MenuAction key="delete" title="Delete" icon="trash" destructive onPress={() => confirmDelete(plant.name, actions.remove)} />,
        ];
    return (
      <Link href={`/plant/${plant.id}`} asChild>
        <Link.Trigger>
          <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} style={style}>
            {children}
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
        <Link.Menu>{items}</Link.Menu>
      </Link>
    );
  }

  const show = () => {
    haptics.tap();
    setOpen(true);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityActions={[{ name: 'longpress', label: 'More actions' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && show()}
        onPress={() => router.push(`/plant/${plant.id}`)}
        onLongPress={show}
        delayLongPress={350}
        style={style}
      >
        {children}
      </Pressable>
      <PlantActionSheet plant={plant} visible={open} onClose={() => setOpen(false)} actions={actions} />
    </>
  );
}

type Actions = NonNullable<ReturnType<typeof usePlantActions>>;

const ICONS = {
  log: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  cut: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 6l12 12M8 18 20 6',
  archive: 'M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 3 6 4 7.5 7M12 7c2-4 6-3 4.5 0',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19 13 11',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  back: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
};

function Row({ icon, title, onPress, tint, destructive }: { icon: keyof typeof ICONS; title: string; onPress: () => void; tint: string; destructive?: boolean }) {
  const c = useColors();
  const color = destructive ? c.warn : c.ink;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { borderColor: c.line, backgroundColor: pressed ? tint : c.card }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint, borderColor: c.line }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d={ICONS[icon]} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
      <Text style={[styles.rowText, { color }]}>{title}</Text>
    </Pressable>
  );
}

/** Bottom sheet with the same actions as the iOS context menu (Android and web). */
export function PlantActionSheet({ plant, visible, onClose, actions }: { plant: Plant; visible: boolean; onClose: () => void; actions: Actions }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'main' | 'archive' | 'delete'>('main');
  const close = () => {
    onClose();
    setStep('main');
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const archived = !!plant.archivedAt;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={close} style={styles.backdrop} />
      <View style={[styles.sheet, { backgroundColor: c.bg, borderColor: c.line, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: c.inkMuted }]} />
        {step === 'main' && (
          <>
            <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
            {archived ? (
              <>
                <Row icon="back" title="Bring back to the jungle" tint={c.mint} onPress={run(actions.restore)} />
                <Row icon="trash" title="Delete" tint={c.peach} destructive onPress={() => setStep('delete')} />
              </>
            ) : (
              <>
                <Row icon="log" title="Log care" tint={c.mint} onPress={run(actions.log)} />
                <Row icon="edit" title="Edit" tint={c.ice} onPress={run(actions.edit)} />
                <Row icon="cut" title="Take a cutting" tint={c.lavender} onPress={run(actions.cutting)} />
                <Row icon="archive" title="Archive…" tint={c.butter} onPress={() => setStep('archive')} />
                <Row icon="trash" title="Delete" tint={c.peach} destructive onPress={() => setStep('delete')} />
              </>
            )}
          </>
        )}
        {step === 'archive' && (
          <>
            <Text style={[styles.title, { color: c.ink }]}>Saying goodbye to {plant.name}?</Text>
            <Text style={[styles.body, { color: c.inkMuted }]}>{plant.name} leaves the round but stays in Offshoots and In memory, with all its diary.</Text>
            <Row icon="gift" title={ARCHIVE_COPY.gifted.title} tint={c.blush} onPress={run(() => actions.archive('gifted'))} />
            <Row icon="leaf" title={ARCHIVE_COPY.died.title} tint={c.cloud} onPress={run(() => actions.archive('died'))} />
            <Row icon="back" title="Never mind" tint={c.cloud} onPress={() => setStep('main')} />
          </>
        )}
        {step === 'delete' && (
          <>
            <Text style={[styles.title, { color: c.ink }]}>{deleteCopy(plant.name).title}</Text>
            <Text style={[styles.body, { color: c.inkMuted }]}>{deleteCopy(plant.name).body}</Text>
            <Row icon="trash" title="Delete" tint={c.peach} destructive onPress={run(actions.remove)} />
            <Row icon="back" title="Cancel" tint={c.cloud} onPress={() => setStep('main')} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,20,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 2, borderBottomWidth: 0, padding: 16, paddingTop: 10, gap: 8, maxWidth: 560, alignSelf: 'center', width: '100%' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, opacity: 0.5, marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 22, marginBottom: 2 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 16, padding: 8, minHeight: 52 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontFamily: fonts.displaySemi, fontSize: 16 },
});
