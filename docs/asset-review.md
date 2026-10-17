# Asset review

Reviewed the production folders and the original incoming pack, including species, moods, milestone meanings, names, dimensions, transparency and app references. The searchable [gallery](asset-gallery.html) includes all 368 PNGs; toggle incoming originals to compare the source exports. The [inventory](asset-inventory.json) records dimensions, sizes, hashes and registration status.

## Changes

- Created the complete v3 expansion: **108 individual transparent PNGs for 36 species**, each with happy, thirsty and snoozing moods. The new exports are 1254×1254. Mood variants are edits of each happy character, rather than crops from a sheet.
- Registered the new species in `expandedBuddyImages.ts` and connected them to `PlantBuddy`. Existing silhouettes remain the fallback for other species and the code-drawn faces-off setting. Matched the new species' default pot colors to the prompt plan and artwork.
- Renamed **16 production files**, updating the app's references: seven badge pairs, the party reward and the default icon. These are file-name changes; saved milestone IDs and species IDs remain stable.
- Promoted **20 existing source exports** to named production folders: onboarding choices, two celebration moments, away-mode art, sharing compositions, store backgrounds, widget compositions, a notification avatar and default dark/tinted icons. These assets already existed; they were not regenerated. Sharing/store/widget art and default icon variants are available for feature integration; native widgets and icon-appearance switching were not added.
- Preserved all 123 original incoming PNGs and their delivery CSVs. Those manifests describe the original delivery, not current production paths.

## Renames

Both earned and `-locked` badge variants follow these mappings:

| Old production basename | Current production basename | Reason |
| --- | --- | --- |
| `badge-first-root` | `badge-first-roots` | Matches the milestone's name. |
| `badge-first-new-leaf` | `badge-first-check` | Used for the first soil/water check. |
| `badge-knows-when-to-wait` | `badge-first-skip` | Used for the first smart skip. |
| `badge-offshoots` | `badge-first-cutting` | Used for the first cutting. |
| `badge-photo-diary` | `badge-first-photo` | Used for the first diary photo. |
| `badge-week-streak` | `badge-four-week-streak` | The milestone requires four weeks. |
| `badge-jungle-10` | `badge-five-plant-fam` | The milestone requires five plants. |
| `buddy-party` | `reward-party-buddy` | Distinguishes the cosmetic reward from species/mood sprites. |

The default icon moved from `assets/icon.png` to `assets/icons/icon-default.png`. App configuration and its Settings preview both use the new path. Store backgrounds now use color names rather than export-order numbers; onboarding choice illustrations have an `onboarding-grow-` prefix.

## Validation

- All 368 PNGs decoded successfully; all 108 new images are square and contain actual transparency.
- All 238 static PNG references found in app/source files and app configuration resolve.
- All 56 illustrated characters have three registered mood files (168 sprites total).
- TypeScript and all 248 tests passed.
- Metro successfully served an updated iOS JavaScript bundle with the expanded asset map. Native device rendering and platform icon generation require a device/native build and were not exercised here.

Run `node scripts/audit-assets.mjs` to refresh the inventory/gallery and detect broken references. Run `npm run ts:check` and `npm test` for app checks. Folder and naming rules are in [assets/README.md](../assets/README.md).
