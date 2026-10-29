const { withAppDelegate, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/*
 * Household sharing (modules/household): CloudKit next to the iCloud Drive backup, invites the app accepts,
 * and the app delegate hook iOS calls when someone taps an invite. Expo's app delegate doesn't pass that
 * call on to modules, so the hook keeps the invite's link where the module finds it, even when the
 * invite is what launched the app.
 */

const CONTAINER = 'iCloud.com.dzidziquist.plantfam';

const HOOK = `
  // Household invites (plugins/withHousehold): iOS hands over an invite someone tapped. Kept for the
  // household module, which may not be loaded yet when the invite is what opened the app.
  @objc public func application(_ application: UIApplication, userDidAcceptCloudKitShareWith cloudKitShareMetadata: CKShare.Metadata) {
    UserDefaults.standard.set(cloudKitShareMetadata.share.url?.absoluteString, forKey: "plantfam.pendingShareURL")
    NotificationCenter.default.post(name: Notification.Name("PlantFamShareInvite"), object: nil)
  }
`;

const withHousehold = (config) => {
  config = withEntitlementsPlist(config, (c) => {
    const e = c.modResults;
    const add = (key, value) => {
      const list = Array.isArray(e[key]) ? e[key] : [];
      if (!list.includes(value)) list.push(value);
      e[key] = list;
    };
    add('com.apple.developer.icloud-services', 'CloudKit');
    add('com.apple.developer.icloud-container-identifiers', CONTAINER);
    if (!e['com.apple.developer.icloud-container-environment']) e['com.apple.developer.icloud-container-environment'] = 'Production';
    return c;
  });
  config = withInfoPlist(config, (c) => {
    c.modResults.CKSharingSupported = true;
    // CloudKit's silent "the jungle changed" pushes can wake the app to sync.
    const modes = Array.isArray(c.modResults.UIBackgroundModes) ? c.modResults.UIBackgroundModes : [];
    if (!modes.includes('remote-notification')) modes.push('remote-notification');
    c.modResults.UIBackgroundModes = modes;
    return c;
  });
  config = withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (c.modResults.language !== 'swift') throw new Error('withHousehold expects a Swift AppDelegate');
    if (!src.includes('userDidAcceptCloudKitShareWith')) {
      if (!/^import CloudKit$/m.test(src)) src = `import CloudKit\n${src}`;
      const anchor = '  // Linking API';
      if (!src.includes(anchor)) throw new Error('withHousehold: AppDelegate has changed shape; add the CloudKit share hook by hand');
      src = src.replace(anchor, `${HOOK.slice(1)}\n${anchor}`);
    }
    c.modResults.contents = src;
    return c;
  });
  return config;
};

module.exports = withHousehold;
