import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';

/** Phase 1 placeholder. The full add flow (name, pot colour, light, soil, origin) lands in phase 3. */
export default function AddPlantScreen() {
  const router = useRouter();
  return (
    <View style={styles.page}>
      <PlantBuddy speciesId="hoya" pot="bubblegum" size={160} />
      <Title style={{ textAlign: 'center' }}>Who's joining the jungle?</Title>
      <Text style={styles.body}>Adding plants (name, pot colour, light and soil) is coming in the next build.</Text>
      <Button title="Back to the round" raised onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 56 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkMuted, textAlign: 'center' },
});
