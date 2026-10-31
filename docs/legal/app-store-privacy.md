# App Store Connect: privacy answers for PlantFam

Use these when filling in **App Privacy** in App Store Connect. They describe what the code does today (Oct 2026); revisit if you add a server, analytics or accounts.

**Privacy Policy URL:** https://dzidziquist.notion.site/PlantFam-Privacy-Policy-3fabc232dc2181d59c4de6716ad9eb84 (published from the Notion page "PlantFam Privacy Policy"). It's also `PRIVACY_POLICY_URL` in `src/config.ts`. `docs/legal/privacy-policy.md` is the copy kept in the repo; update both together.

## Data Used to Track You
**None.** No tracking, no ad networks, no data brokers, no App Tracking Transparency prompt needed.

## Data collected (Apple's definition: data sent off the device that you or a partner can access)

| Data type | Collected? | Why | Linked to the user? | Used for tracking? |
|---|---|---|---|---|
| Purchases → Purchase History | **No while tips are off** (`TIPS_ENABLED = false`); Yes via RevenueCat if tips are switched on | App Functionality (the supporter thank-you) | No (anonymous RevenueCat app user ID, no account) | No |
| Identifiers → User ID | **No while tips are off**; Yes (RevenueCat's anonymous app user ID) if tips are switched on | App Functionality | No | No |
| User Content → Photos or Videos | **Yes**, conservatively: only the single photo someone chooses for photo ID or the plant doctor's photo check, sent to Pl@ntNet | App Functionality | No | No |
| Location | **No**: the user types a city name; no device location or GPS is ever read. (Coarse location from a typed city isn't "collected" location data under Apple's definition, but mention it in the policy, which we do.) | | | |
| Contact info, health, financial info, browsing, diagnostics, usage data | **No** | | | |

Notes:
- Plants, diary, photos and settings stay on the phone, or go to the person's own iCloud (weekly iCloud backup, and household sharing via CloudKit in the owner's iCloud). The developer has no access to either, so under Apple's definition they aren't "collected". The privacy policy describes both.
- The RevenueCat SDK is in the build but never starts while `TIPS_ENABLED = false`, so nothing goes to RevenueCat. Before App Review, either keep it switched off (and answer "No" for purchases) or remove `react-native-purchases` from the build so the shipped binary matches the answers.
- Calls to Open-Meteo send only a typed city name (geocoding) or a city's coordinates (history and forecast), with no user data, so there's nothing to declare.
- If you route photo ID through your own proxy (`EXPO_PUBLIC_PLANTNET_PROXY`), the answer stays the same as long as the proxy doesn't store images or logs that identify people.
- RevenueCat publishes its own App Store privacy guidance; check it matches the table above when you create the RevenueCat project.

## Other App Store items
- **Age rating:** 4+ (no user-generated content shared with others, no web browsing).
- **Account deletion:** not applicable (no accounts). Settings → *Delete all my data* erases everything on the device.
- **Export compliance:** the app uses only standard HTTPS. Answer "uses encryption: yes, exempt (standard)", or set `ITSAppUsesNonExemptEncryption = false` in `app.json`.
