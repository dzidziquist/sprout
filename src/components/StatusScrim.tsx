import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme/theme";

/**
 * A strip of page colour behind the status bar and Dynamic Island, so text scrolling up underneath
 * doesn't run into the clock. Give it the scroll position to fade it in only once the page moves
 * (the plant page's coloured top shows through until then).
 */
export function StatusScrim({ scrollY }: { scrollY?: Animated.Value }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  const opacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, insets.top],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : 1;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height: insets.top, backgroundColor: c.bg, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
});
