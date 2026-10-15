import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius } from '../theme/tokens';
import { useColors } from '../theme/theme';
import type { CheckResult } from '../types';

/** What each answer means, spelled out so "Dry" never reads as the default. */
const ANSWERS: { result: CheckResult; word: string; means: string }[] = [
  { result: 'dry', word: 'Dry', means: 'water it' },
  { result: 'damp', word: 'Damp', means: 'skip' },
  { result: 'soggy', word: 'Soggy', means: 'skip' },
];

/** Hydro and semi-hydro: you look at the water line, so there are only two answers. */
const RESERVOIR_ANSWERS: typeof ANSWERS = [
  { result: 'dry', word: 'Low', means: 'top up' },
  { result: 'damp', word: 'Plenty', means: 'skip' },
];

/**
 * Dry / Damp / Soggy (or Low / Plenty for LECA and water) as equal, neutral buttons. Nothing is pre-highlighted: the soil decides,
 * not the app. The chosen answer gets its colour afterwards, in the outcome chip.
 */
export function TodayAnswerButtons({ name, reservoir, onAnswer }: { name: string; reservoir?: boolean; onAnswer: (r: CheckResult) => void }) {
  const c = useColors();
  return (
    <View style={styles.row} accessibilityLabel={reservoir ? `How's ${name}'s water level?` : `How does ${name}'s soil feel?`}>
      {(reservoir ? RESERVOIR_ANSWERS : ANSWERS).map((a) => (
        <Pressable
          key={a.result}
          accessibilityRole="button"
          accessibilityLabel={`${name}: ${a.word.toLowerCase()}`}
          accessibilityHint={a.means === 'skip' ? 'Skip watering today' : reservoir ? 'Top it up now' : 'Water it now'}
          onPress={() => onAnswer(a.result)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? c.cloud : c.card, borderColor: c.line },
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={[styles.word, { color: c.ink }]}>{a.word}</Text>
          <Text style={[styles.means, { color: c.inkMuted }]}>{a.means}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, minHeight: 48, borderWidth: 2, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  word: { fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 18 },
  means: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 13 },
});
