# App Store Connect: privacy answers for PlantFam

Use these when filling in **App Privacy** in App Store Connect. They describe what the code does today (Oct 2026); revisit if you add a server, analytics or accounts.

**Privacy Policy URL:** host `docs/legal/privacy-policy.md` (any static page works) and paste the URL into App Store Connect and `PRIVACY_POLICY_URL` in `src/config.ts`.

## Data Used to Track You
**None.** No tracking, no ad networks, no data brokers, no App Tracking Transparency prompt needed.

## Data collected (Apple's definition: data sent off the device that you or a partner can access)

| Data type | Collected? | Why | Linked to the user? | Used for tracking? |
|---|---|---|---|---|
| Purchases → Purchase History | **Yes** (RevenueCat, only for Plus buyers) | App Functionality (unlocking Plus) | No (anonymous RevenueCat app user ID, no account) | No |
| Identifiers → User ID | **Yes** (RevenueCat's anonymous app user ID) | App Functionality | No | No |
| User Content → Photos or Videos | **Yes**, conservatively: only the single photo a Plus member chooses for photo ID, sent to Pl@ntNet | App Functionality | No | No |
| Location | **No**: climate is a city the user picks; weather uses that city's fixed coordinates | | | |
| Contact info, health, financial info, browsing, diagnostics, usage data | **No** | | | |

Notes:
- Plants, diary, photos and settings never leave the phone, so they aren't "collected".
- Weather calls to Open-Meteo send only a city's coordinates, with no user data, so there's nothing to declare.
- If you route photo ID through your own proxy (`EXPO_PUBLIC_PLANTNET_PROXY`), the answer stays the same as long as the proxy doesn't store images or logs that identify people.
- RevenueCat publishes its own App Store privacy guidance; check it matches the table above when you create the RevenueCat project.

## Other App Store items
- **Age rating:** 4+ (no user-generated content shared with others, no web browsing).
- **Account deletion:** not applicable (no accounts). Settings → *Delete all my data* erases everything on the device.
- **Export compliance:** the app uses only standard HTTPS. Answer "uses encryption: yes, exempt (standard)", or set `ITSAppUsesNonExemptEncryption = false` in `app.json`.
