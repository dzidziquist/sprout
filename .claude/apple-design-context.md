# Apple design context: PlantFam

Shared context for the hig-* skills and apple-design (Emil Kowalski, motion and craft) in .claude/skills.

## Product
- Free, hobby plant-care app: daily soil-check "round", per-plant pages, care log, light estimates by window, photo diary, wishlist, grow patch for edibles.
- Stage: shipped to TestFlight testers (Seattle and others); iterating weekly.
- Category: lifestyle / home.

## Platforms
- iPhone only for now (`supportsTablet: false`, portrait). iPad and landscape are an open product decision.
- Android deferred; web build is used only for previews.

## Technology
- Expo SDK 54, React Native 0.81, Expo Router (native stack, formSheet/modal routes, NativeTabs with SF Symbols), Zustand persisted store.
- iOS-native pieces in use: NativeTabs, Link.Menu context menus with previews, Alert, ActionSheetIOS, expo-haptics, expo-symbols (Glyph for close/back), expo-glass-effect (Liquid Glass toolbar buttons on iOS 26), expo-location (compass heading only), local notifications.

## Design system
- Custom "sticker" world, deliberately not stock iOS: ink outlines, hard drop shadows, Fredoka display + Nunito body, illustrated plant "buddies", bright fills (leaf, sun, coral, sky, grape) with pale tints.
- Tokens in src/theme (useColors, textOn, selectedFill, link). Full light and dark palettes; five accent colours.
- Shared controls: Sticker, Button, Chip (ui.tsx), Segmented, Dropdown, StickerSwitch, GlassButton, Glyph, LineIcon, SunIcon.
- The tester explicitly prefers the sticker look over stock iOS controls (chose the sticker switch over the iOS Switch). Keep the visual identity; apply HIG to behaviour, accessibility, writing and structure.

## Accessibility
- Target: solid VoiceOver, Dynamic Type (no fixed text heights), Reduce Motion (useReducedMotion), Reduce Transparency (useReducedTransparency), 4.5:1 text contrast, 44 pt targets.

## Users
- Houseplant and windowsill-edible growers, checking plants once a day, one-handed, often at the plant.

## Motion and type
- Anything touchable animates with a spring that starts from the current value. Default critically damped (no overshoot); bounce only after a flick (badge spin).
- Type comes from `type` in src/theme/tokens.ts: size, line height and per-size tracking. Spacing from `space`.
