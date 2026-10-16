const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Newer Xcode (27+) refuses to build pods that still declare an iOS deployment target below 15.
 * Some dependencies (SDWebImage, RevenueCat, AsyncStorage, react-native-svg) do, so raise every
 * pod target to at least MIN in the Podfile's post_install. The app itself already targets 15.1.
 */
const MIN = '15.1';
const MARK = '# plantfam: pod deployment target';

module.exports = function withPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(file, 'utf8');
      if (!podfile.includes(MARK)) {
        const snippet = `
    ${MARK}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN}')
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'
        end
      end
    end
`;
        // After react_native_post_install, so nothing it sets afterwards lowers the target again.
        const anchor = /react_native_post_install\([\s\S]*?\n\s*\)\n/;
        if (!anchor.test(podfile)) throw new Error('withPodDeploymentTarget: no react_native_post_install in Podfile');
        podfile = podfile.replace(anchor, (m) => m + snippet);
        fs.writeFileSync(file, podfile);
      }
      return cfg;
    },
  ]);
};
