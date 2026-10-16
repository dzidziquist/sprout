# PlantFam launch setup

Everything in the app is built. These are the accounts and keys only the founder can set up.

## 1. TestFlight

**Before the first build (App Store Connect, 5 min):** create the app at appstoreconnect.apple.com →
Apps → + → New App: name **PlantFam**, bundle ID **com.dzidziquist.plantfam** (register it under
Certificates, Identifiers & Profiles first if it isn't offered), SKU `plantfam`.

**First build, from your Mac (one time, interactive):**
```
git checkout main && git pull
npm ci
npx eas-cli login                 # your Expo account (dzidziquist)
npx eas-cli init                  # links the project; commit the projectId it adds to app.json
npx eas-cli build -p ios --profile production --auto-submit
```
Say yes when it asks to log in to Apple, to generate a distribution certificate and provisioning
profile, and to create an **App Store Connect API key** (that key is what lets later builds submit
without you). The build takes ~15–25 min on EAS; the upload then shows in TestFlight after Apple's
processing (~10–30 min). Answer the export-compliance question once if asked (the app sets
`ITSAppUsesNonExemptEncryption: false`, so it normally skips it).

**Testers:** TestFlight → Internal Testing → add yourself (anyone on your App Store Connect team, no
review). External testers need a short Beta App Review the first time.

**Every build after that, from GitHub:** add an Expo access token (expo.dev → Account settings →
Access tokens) as the repository secret `EXPO_TOKEN`, then Actions → **TestFlight** → Run workflow.
It runs the typecheck and tests, then builds and submits on EAS. `.easignore` keeps the art originals,
design boards and docs out of the upload.

## 2. Environment variables (EAS → Project → Environment variables, "production")
| Variable | What for | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_PLANTNET_KEY` | Photo ID (free, 5 a day per phone; Pl@ntNet free tier is 500 a day shared) | my.plantnet.org → API key; whitelist bundle id `com.dzidziquist.plantfam` |
| `EXPO_PUBLIC_PLANTNET_PROXY` | Optional: a tiny server that adds the key so it isn't shipped in the app | Recommended before a public launch |
| `EXPO_PUBLIC_RC_IOS_KEY` | In-app purchases | RevenueCat → Project → API keys (Apple) |
| `EXPO_PUBLIC_RC_ANDROID_KEY` | Android purchases (later) | RevenueCat → API keys (Google) |

Without a key the app still works: Photo ID explains it isn't set up yet, and the tip jar shows prices but says tips open in the iPhone app.

## 3. App Store Connect
- **Tips are switched off** (`TIPS_ENABLED = false`): PlantFam is free with no in-app purchases, so skip the Paid Apps agreement, the products below and RevenueCat. Kept for reference if tips are ever switched on:
- Agreements, tax and banking: accept the Paid Apps agreement.
- In-app purchases: three **consumables** (tips; everything in the app is free and tips unlock nothing):
  - `plantfam_tip_small`: **$2.99** ("Seed")
  - `plantfam_tip_medium`: **$4.99** ("Sprout")
  - `plantfam_tip_large`: **$9.99** ("Big leaf")
  Review note: "Optional tips. The app is fully free; tips unlock no features. As a thank-you, tippers get a few cosmetic extras (a supporter badge, a gold card colour, a party buddy, alternate app icons)." 
- Privacy: photos stay on device (diary); photo ID sends the chosen photo to Pl@ntNet. No tracking.

## 4. RevenueCat
- Connect the App Store app (in-app purchase key / shared secret).
- Add the three tip products. No entitlement or offering is needed: the app loads them by product id and checks past tips in the customer's purchase history.

## 5. Before public launch
- Contact currently points to `SUPPORT_URL` (dzidziquist.com). Optionally set `SUPPORT_EMAIL`, and set `PRIVACY_POLICY_URL`, in `src/config.ts`. Host `docs/legal/privacy-policy.md` (fill in its contact line) and use that URL in App Store Connect. App Privacy answers are in `docs/legal/app-store-privacy.md`. Terms use Apple's standard EULA.
- Add the Pl@ntNet logo next to "Photo ID powered by Pl@ntNet" (free-tier terms).
- Swap in high-res buddy illustrations (`assets/buddies/{species}-{mood}.png`, same filenames).

## Things only a device can verify
Liquid Glass buttons, native tabs, form-sheet detents, iOS context menus with previews, haptics, camera, notifications, purchases.
