# Release check: App Store submission

Checked against `main` on 31 Oct 2026 (version 1.0.14). Items marked **Owner** need someone with the
Apple account or a decision; everything else is done in the code.

## Blockers before submitting

| | Item | State |
|---|---|---|
| **Owner** | **Privacy policy URL.** Published on Notion: https://dzidziquist.notion.site/PlantFam-Privacy-Policy-3fabc232dc2181d59c4de6716ad9eb84. It's in `PRIVACY_POLICY_URL` and linked from the in-app Privacy page. | Paste the same URL into App Store Connect (App Privacy → Privacy Policy URL). |
| **Owner** | **Screenshots.** None at App Store size yet. `design/screens/` are early mock-ups (390×844) and `assets/store/` holds only backgrounds (1290×2796). | Take them on an iPhone Pro Max (1320×2868, the 6.9″ slot): Today, plant page, Grow patch, plant doctor with "Why this advice?", Offshoots, Light. Use the demo fam for clean data. Apple needs them to show the real app. |
| Done | **Privacy policy text was out of date.** It said diary photos are "not uploaded anywhere" and left out iCloud backup and household sharing. | Fixed in-app (`src/data/privacy.ts`) and in `docs/legal/privacy-policy.md`, dated 31 Oct 2026. |
| Done | **Location permission strings.** The build declared "always" location with Expo's generic text ("Allow PlantFam to access your location"), which App Review flags. The app never uses background location. | Removed: only the compass "when in use" string remains. |

## Privacy

- **Privacy manifest** (`app.json`):
  - Declares Photos (not linked, app functionality), for the one photo sent to Pl@ntNet.
  - Declares required-reason APIs: UserDefaults, file timestamps, boot time and disk space.
  - No tracking and no tracking domains. Matches the code.
- **App Privacy answers:** `docs/legal/app-store-privacy.md`, updated:
  - The iCloud backup and household sharing live in the person's own iCloud, which the developer can't reach, so they aren't "collected".
  - Photos are the only collected type.
  - Data used to track you: none.
- **Network calls in the app:** Open-Meteo (geocoding, history, forecast), Pl@ntNet (identify, diseases), Wikipedia and Wikimedia Commons (species summary and photo). All appear in the policy. Nothing else is contacted.
- **Permission strings** (camera, photos, compass) explain the purpose in plain words. There's no microphone and no tracking prompt.
- **Export compliance:** `ITSAppUsesNonExemptEncryption = false` is set.

## Purchases

- `TIPS_ENABLED = false`: no in-app purchases are offered, and the Support page lists earned gifts only.
- The RevenueCat SDK (`react-native-purchases`) is still in the binary but never starts while tips are off, so no data goes to RevenueCat.
- **Owner:** answer "No" to purchases in App Privacy and create no IAP products. Removing the SDK before launch is optional and would need a build; it makes the binary match the answers exactly.

## Support and links

| Link | State |
|---|---|
| Support URL `https://dzidziquist.com` | Up (HTTP 200). It needs a way to contact you (Apple checks); the in-app "Contact and support" row opens it. |
| Support email | Empty, so the row is hidden. That's fine: Apple only requires the support URL. |
| Terms | Apple's standard EULA. |
| App Store link `apps.apple.com/app/id6823421043` | 404 until the app is approved. Expected. |

## Dependency advisories: what ships

`npm audit` today: 42 entries (8 high, 33 moderate, 1 low, 0 critical). Almost all of them are in
**build tools that never ship in the app**:
- Expo CLI, config plugins and Metro: `@xmldom/xmldom`, `image-size`, `node-forge`, `postcss`, `undici`, `glob`, `minimatch`, `uuid` (in `xcode`), `deepmerge`.
- The test runner's coverage tooling.

They matter on a developer machine or CI runner handling untrusted input, not on users' phones.

**The one in shipped code:** `decode-uri-component` 0.2.2, through `expo-router` → `query-string`.
- **Risk:** it parses deep links (`plantfam://…`). A specially crafted link could make the app hang while parsing it. Nothing leaks, and someone would have to tap the bad link. **Low.**
- **Why there's no quick fix:**
  - The fixed version (0.5.1) is ESM-only.
  - It's only 8 days old, so a supply-chain wait applies.
  - Forcing it under `query-string` 7 risks breaking routing.
- **Real fix:** the Expo SDK upgrade (expo-router 58). Plan it as its own release.

**Recommendation:** not a release blocker. Upgrade the Expo SDK in the next cycle, and keep CI's dependency audit in view.

## Draft App Store listing

- **Name:** PlantFam
- **Subtitle** (30 max): Soil checks, not schedules
- **Category:** Lifestyle (secondary: Education)
- **Age rating:** 4+
- **Keywords** (100 max): `plant care,houseplant,watering,reminder,plant doctor,cuttings,propagation,garden,tomato,succulent`
- **Promotional text:** Feel the soil, tap what you found, and each plant learns its own rhythm. Free, private, no account.
- **Description:**

  PlantFam is a playful plant-care app where care is a quick soil check, not a watering schedule.

  • Plant round: one tap for Dry, Damp or Soggy, and each plant learns how fast it dries through the seasons.
  • Plant doctor: tap what you see and get the possible causes in the order to check them, worked out from that plant's own story. "Why this advice?" shows the source behind each checked fact.
  • Grow patch: tomatoes, peppers and herbs get stages, a month-by-month calendar, weather alerts and feeding that knows your potting mix.
  • Offshoots: every cutting keeps its family tree.
  • Light: rooms, windows and a camera light meter estimate the light where each plant sits.
  • Share the jungle with your household over iCloud, and back up weekly to your own iCloud.

  No account, no ads, no tracking. Your plants live on your phone.
