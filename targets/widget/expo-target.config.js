/**
 * PlantFam's Home Screen widgets (small and medium): who needs a check today. The app writes each
 * plant's next check date to the shared App Group (src/lib/widget.ts); the widget works out who's due
 * on its own, so it rolls over at midnight without the app being opened.
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'PlantFamWidget',
  displayName: 'PlantFam',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
  images: {
    smallBackground: '../../assets/widgets/widget-small-bg.png',
    mediumBackground: '../../assets/widgets/widget-medium-bg.png',
    doneBuddy: '../../assets/widgets/widget-buddy.png',
  },
});
