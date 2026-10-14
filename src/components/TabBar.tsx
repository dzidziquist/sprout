import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';

const ACTIVE_BG: Record<string, string> = { index: colors.leaf, jungle: colors.sky, offshoots: colors.grape, me: colors.bubblegum };
const LABEL: Record<string, string> = { index: 'Today', jungle: 'Jungle', offshoots: 'Offshoots', me: 'Me' };

function Icon({ name, color }: { name: string; color: string }) {
  const p = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === 'index' && (
        <>
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} />
        </>
      )}
      {name === 'jungle' && <Path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19 13 11" {...p} />}
      {name === 'offshoots' && (
        <>
          <Circle cx={6} cy={5} r={2.5} {...p} />
          <Circle cx={6} cy={19} r={2.5} {...p} />
          <Circle cx={18} cy={12} r={2.5} {...p} />
          <Path d="M6 7.5v9M6 12h4a4 4 0 0 0 4-4V8M15.5 12H10" {...p} />
        </>
      )}
      {name === 'me' && (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} />
        </>
      )}
    </Svg>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const routes = state.routes;
  const tab = (i: number) => {
    const route = routes[i];
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => !focused && navigation.navigate(route.name)}
        style={[styles.tab, focused && [styles.tabActive, { borderColor: c.line, backgroundColor: ACTIVE_BG[route.name] }]]}
      >
        <Icon name={route.name} color={focused ? c.onBright : c.inkMuted} />
        <Text style={[styles.label, { color: focused ? c.onBright : c.inkMuted }]}>{LABEL[route.name]}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12), backgroundColor: c.card, borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
      {tab(0)}
      {tab(1)}
      <Pressable accessibilityRole="button" accessibilityLabel="Add a plant" onPress={() => router.push('/add')} style={[styles.add, { borderColor: c.line, boxShadow: `0px 3px 0px ${c.drop}` }]}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
        </Svg>
      </Pressable>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 2,
    position: 'absolute',
    left: 14,
    right: 14,
    height: 72,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tab: { minWidth: 62, height: 54, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 18 },
  tabActive: { borderWidth: 2 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  add: {
    borderWidth: 2,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -14 }],
  },
});
