# PlantFam assets

Production assets use lowercase kebab-case PNG names. Keep static `require()` paths in sync when renaming files.

| Folder | Contents and naming |
| --- | --- |
| `buddies/` | `{species-id}-{happy,thirsty,snoozing}.png`; 20 original characters and 36 new species. Original IDs remain stable. |
| `art/` | App illustrations, seasonal scenes, onboarding images, rewards and `badge-{milestone}[-locked].png`. |
| `icons/` | `icon-default.png`, default dark/tinted variants and four alternate icons with Android foreground layers. |
| `sharing/` | Family-tree, harvest, gift and recap compositions. |
| `widgets/` | Small/medium widget compositions and the notification avatar. |
| `store/` | Store backgrounds named by their background color rather than export order. |
| `incoming/PlantFam/` | Preserved source exports and their original delivery manifests. Do not load these directly from app code. Their names and completion metadata describe the original delivery. |

`src/data/buddyImages.ts` registers the original buddies. `src/data/expandedBuddyImages.ts` registers the 36 new species by catalogue ID. The component selects a species-specific image when available, then falls back to its existing silhouette. The code-drawn “faces off” mode keeps its existing behavior.

`src/data/art.ts` registers app illustrations and badge pairs. Sharing, store and widget compositions are available for their respective future features; adding artwork does not implement native widgets or publishing workflows. The medal intentionally uses one earned image; there is no locked-medal asset.

Open [the asset gallery](../docs/asset-gallery.html) for filtering, transparent-background inspection and original-export comparison. [The inventory](../docs/asset-inventory.json) records paths, dimensions, byte sizes, alpha-channel presence, references and SHA-256 hashes. Regenerate both from the repository root with `node scripts/audit-assets.mjs`; the command fails on broken static PNG references.

Badge names now match the current milestones: `first-roots`, `first-check`, `first-skip`, `first-cutting`, `first-photo`, `four-week-streak`, and `five-plant-fam`. Older delivery names remain in the source archive. The party reward is `reward-party-buddy.png`; the default icon lives alongside its variants.

Generated buddies are individual transparent PNGs, with thirsty/snoozing images edited from the happy character. Consult the inventory for actual export dimensions; the generator can produce square canvases larger than the 1024-pixel target in the original prompt guide. Native render sizing remains controlled by the app.
