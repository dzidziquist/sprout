# PlantFam launch setup

Everything in the app is built. These are the accounts and keys only the founder can set up.

## 1. First TestFlight build
```
npm install
npx eas-cli login
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest
```
The first build registers the app on Expo and creates Apple signing credentials (accept the prompts).
To let Claude run future builds, add an `EXPO_TOKEN` to the cloud environment's settings.

## 2. Environment variables (EAS → Project → Environment variables, "production")
| Variable | What for | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_PLANTNET_KEY` | Photo ID (free, 5 a day per phone; Pl@ntNet free tier is 500 a day shared) | my.plantnet.org → API key; whitelist bundle id `com.dzidziquist.plantfam` |
| `EXPO_PUBLIC_PLANTNET_PROXY` | Optional: a tiny server that adds the key so it isn't shipped in the app | Recommended before a public launch |
| `EXPO_PUBLIC_RC_IOS_KEY` | In-app purchases | RevenueCat → Project → API keys (Apple) |
| `EXPO_PUBLIC_RC_ANDROID_KEY` | Android purchases (later) | RevenueCat → API keys (Google) |

Without a key the app still works: Photo ID explains it isn't set up yet, and the paywall shows prices but says purchases open in the iPhone app.

## 3. App Store Connect
- Agreements, tax and banking: accept the Paid Apps agreement.
- In-app purchases:
  - `plantfam_plus_yearly`: auto-renewable subscription, **$7.99/yr, no free trial or intro offer**
  - `plantfam_plus_lifetime`: non-consumable, **$19.99**
- Privacy: photos stay on device (diary); photo ID sends the chosen photo to Pl@ntNet. No tracking.

## 4. RevenueCat
- Connect the App Store app (in-app purchase key / shared secret).
- Entitlement id **`plus`**, unlocked by both products.
- Current offering with packages `$rc_annual` (yearly) and `$rc_lifetime` (lifetime).

## 5. Before public launch
- Contact currently points to `SUPPORT_URL` (dzidziquist.com). Optionally set `SUPPORT_EMAIL`, and set `PRIVACY_POLICY_URL`, in `src/config.ts`. Host `docs/legal/privacy-policy.md` (fill in its contact line) and use that URL in App Store Connect. App Privacy answers are in `docs/legal/app-store-privacy.md`. Terms use Apple's standard EULA.
- Add the Pl@ntNet logo next to "Photo ID powered by Pl@ntNet" (free-tier terms).
- Swap in high-res buddy illustrations (`assets/buddies/{species}-{mood}.png`, same filenames).

## Things only a device can verify
Liquid Glass buttons, native tabs, form-sheet detents, iOS context menus with previews, haptics, camera, notifications, purchases.
