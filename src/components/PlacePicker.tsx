import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { climateFor, label, searchPlaces, type PlaceResult } from '../lib/place';
import { describeClimate, placeName } from '../lib/climate';
import * as haptics from '../lib/haptics';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';
import type { ClimateProfile } from '../types';

const PRESETS: { id: 'seattle' | 'accra'; city: string }[] = [
  { id: 'seattle', city: 'Seattle' },
  { id: 'accra', city: 'Accra' },
];

/**
 * Pick where you grow by typing a city (no location permission, no GPS). The climate is worked out from
 * that city's recent weather history, so seasons, feeding pauses and grow-patch timing follow it.
 */
export function PlacePicker({ value, onPick }: { value: ClimateProfile; onPick: (climate: ClimateProfile, city: string) => void }) {
  const c = useColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'error' | 'reading'>('idle');
  const [reading, setReading] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setState('idle');
      return;
    }
    const n = ++seq.current;
    setState('searching');
    const t = setTimeout(() => {
      searchPlaces(q)
        .then((r) => {
          if (n !== seq.current) return;
          setResults(r);
          setState('idle');
        })
        .catch(() => n === seq.current && setState('error'));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const choose = async (p: PlaceResult) => {
    haptics.tap();
    setReading(label(p));
    setState('reading');
    const climate = await climateFor(p);
    haptics.success();
    onPick(climate, p.name);
    setQuery('');
    setResults([]);
    setReading(null);
    setState('idle');
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.current, { backgroundColor: c.mint, borderColor: c.line }]}>
        <Text style={[styles.currentName, { color: c.ink }]}>{placeName(value)}</Text>
        <Text style={[styles.currentSub, { color: c.ink }]}>{describeClimate(value)}</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your city"
        placeholderTextColor={c.inkMuted}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Search your city"
        style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.card }]}
      />

      {state === 'reading' && (
        <View style={styles.row}>
          <ActivityIndicator color={c.ink} />
          <Text style={[styles.note, { color: c.ink }]}>Reading {reading}’s weather history…</Text>
        </View>
      )}
      {state === 'searching' && <Text style={[styles.note, { color: c.inkMuted }]}>Searching…</Text>}
      {state === 'error' && <Text style={[styles.note, { color: c.warn }]}>Can’t search right now. Check your connection, or pick the closest below.</Text>}
      {state !== 'reading' &&
        results.map((p) => (
          <Pressable
            key={`${p.lat},${p.lon}`}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${p.region}`}
            onPress={() => choose(p)}
            style={({ pressed }) => [styles.result, { borderColor: c.line, backgroundColor: pressed ? c.cloud : c.card }]}
          >
            <Text style={[styles.resultName, { color: c.ink }]}>{p.name}</Text>
            <Text style={[styles.note, { color: c.inkMuted }]}>{p.region}</Text>
          </Pressable>
        ))}
      {query.trim().length < 2 && (
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected: value === p.id }}
              onPress={() => {
                haptics.tap();
                onPick(p.id, p.city);
              }}
              style={[styles.preset, { borderColor: c.line, backgroundColor: value === p.id ? c.butter : c.card }]}
            >
              <Text style={[styles.resultName, { color: c.ink }]}>{p.city}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={[styles.note, { color: c.inkMuted }]}>We use the city you type, never your location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  current: { borderWidth: 2, borderRadius: 18, padding: 12, gap: 2 },
  currentName: { fontFamily: fonts.display, fontSize: 18 },
  currentSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  result: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  resultName: { fontFamily: fonts.displaySemi, fontSize: 16 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, minHeight: 44, borderWidth: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
