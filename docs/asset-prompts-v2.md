# PlantFam: production asset prompts (v2, one asset per image)

Current production paths and milestone names are documented in [`assets/README.md`](../assets/README.md). The filenames below describe the original delivery, preserved in `assets/incoming/PlantFam/`; use the production names when wiring app screens.

These prompts are based on the style ChatGPT already nailed in `design/asset-concepts/chatgpt-sheet-1.png` and `chatgpt-sheet-2.png`. Use this file for **final, app-ready assets**. The v1 file (`asset-prompts.md`) produced the concept sheets.

---

## How to get high-quality, usable files

1. **One image per request.** Never ask for sheets or grids. Quality drops and the assets can't be cut out cleanly.
2. **Same chat for each group.** Do all plant buddies in one chat, all badges in another, and so on. ChatGPT stays more consistent within a conversation.
3. **Attach a reference every time.** Crop the matching item from the concept sheet (for example the monstera from sheet 2) and attach it with the prompt. Say *"match this character exactly"*.
4. **Paste the Style block first** in every new chat, then the asset prompts.
5. **Sizes.** ChatGPT generates at **1024×1024, 1024×1536 or 1536×1024**. Generate at those sizes, then upscale to the final size listed (Upscayl, Photoshop "Super Resolution", or Topaz). The prompts ask for the native sizes so ChatGPT doesn't distort the art.
6. **Transparency.** Assets marked **[T]** must come back with a real transparent background. If one comes back with white or a backdrop, reply: *"Same image, background fully transparent PNG, no glow, no shadow on the ground."*
7. **Fix, don't restart.** If one detail is off, reply *"Keep everything identical, only change X"* rather than regenerating from scratch.
8. **Quality check before saving.** The outline should be the same thickness everywhere. The face sits on the pot. There's no text unless the prompt asks for it. Edges are clean against transparency.

---

## Style block (paste first in every chat)

```
Style for every image in this chat: "PlantFam" sticker illustration.

- Hand-drawn cartoon sticker look with a thick, even, dark navy outline (#1B1B2F) around every shape, rounded line joins, line weight consistent across the whole image.
- Leaves are rich and lush: 2–3 tones of green per leaf (base #3DDC84 / deep #22B864 / light #7CEBA8), visible midribs and veins, small soft highlight streaks. Cel-shaded, not photographic, no texture noise, no gradients on outlines.
- Pots are smooth, glossy-looking ceramic: a wide rounded rim band on top of a tapered body, one flat colour with one soft darker shade on one side and a small white highlight stroke.
- Pot colours (use exactly as specified per asset): sun yellow #FFD23F, sky blue #5AB8FF, coral #FF6B5B, grape #A78BFA, bubblegum #FFB3C7.
- The POT has the face, centred on the pot body: two small vertical oval eyes in navy, a small mouth, two soft pink cheek blushes (#FF7A9C).
  - HAPPY: small U-shaped smile, cheeks visible.
  - THIRSTY: slightly worried eyebrows, small wavy mouth, ONE small blue water drop (#5AB8FF) beside the pot near the top right. Hopeful, never sad, never crying, leaves not wilted.
  - SNOOZING: eyes closed as soft downward arcs, tiny round "o" mouth, calm.
- Cute and warm but not babyish, with a premium indie-app quality like Duolingo or Finch.
- No text, letters or numbers anywhere unless explicitly requested.
- Centred subject with comfortable padding (the subject fills about 80% of the canvas).
```

---

## 1. Brand

**1.1 App icon (light)**: `app-icon-1024.png`, 1024×1024, opaque
```
App icon. A single HAPPY monstera buddy in a sun-yellow pot, centred on a solid leaf-green (#3DDC84) square background, full bleed, no rounded corners, no border. The plant has 4 large fenestrated leaves and fills about 75% of the canvas; the pot face is clearly readable. Must read well at 60×60px. 1024×1024.
```

**1.2 App icon (dark)**: `app-icon-dark-1024.png`, 1024×1024, opaque
```
Same app icon character, identical pose, on a solid deep navy (#1B1B2F) background. Leaves slightly brighter for contrast. Full bleed, no rounded corners. 1024×1024.
```

**1.3 App icon (tinted / mono)**: `app-icon-tinted-1024.png`, 1024×1024 [T]
```
Same app icon character as a single-colour white silhouette with navy outlines only (no other colours, no fill shading), on a fully transparent background, for iOS tinted icons. 1024×1024.
```

**1.4 Logo sticker**: `logo-sticker.png`, 1536×1024 [T]
```
Logo sticker: a rounded-square leaf-green badge containing a small navy monstera leaf icon, next to the word "PlantFam" (capital P and F) in a chunky, rounded, bold display font in navy. The whole lockup has a thick white sticker border and then a thin navy outline around that border. Spell exactly P-l-a-n-t-F-a-m. Transparent background. 1536×1024.
```

**1.5 Splash**: `splash.png`, 1024×1024 [T]
```
A HAPPY monstera buddy in a sun-yellow pot, centred, with 6 small floating confetti shapes around it (yellow rounded rectangle, coral dot, sky-blue dot, grape dot, bubblegum strip, white dot), each with a navy outline. Transparent background. 1024×1024.
```

---

## 2. Plant buddies (20 species × 3 moods = 60 images)

**For each species**, send the base prompt with `MOOD = HAPPY`, then reply *"Same plant, same pose, same pot, change only the face to THIRSTY"*, then *"...to SNOOZING"*. That keeps the three moods identical apart from the face.

File names: `buddy-{id}-happy.png`, `buddy-{id}-thirsty.png`, `buddy-{id}-snoozing.png`. Size 1024×1024 [T].

**Base prompt (fill in the brackets):**
```
Plant buddy character, MOOD = HAPPY. [PLANT DESCRIPTION]. Planted in a [POT COLOUR] pot with the face on the pot. Front view, centred, full plant and pot visible, nothing cropped. Fully transparent background, no ground shadow. 1024×1024.
```

| id | Plant description (paste into brackets) | Pot |
|---|---|---|
| `monstera` | A Monstera deliciosa with 4–5 large glossy heart-shaped leaves with deep side splits and a few holes, on long stems rising in a fan | sun yellow |
| `pothos` | A Marble Queen pothos: a bushy crown of heart-shaped leaves heavily splashed with creamy-white marbling, two vines trailing over the left and right pot edges | sky blue |
| `fig` | A fiddle-leaf fig: one straight brown trunk with large, wavy, violin-shaped glossy leaves alternating up the stem to a leafy top | coral |
| `calathea` | A Calathea orbifolia: 5–6 large round leaves with bold pale silver-green stripes, fanning out on upright stems | grape |
| `snake` | A snake plant: 5 tall upright sword-shaped leaves with dark green banding and bright yellow (#FFD23F) edges, different heights | coral |
| `hoya` | A Hoya carnosa: thick waxy oval leaves on an arching vine plus one trailing vine, with one ball-shaped cluster of pale pink star flowers with red centres | bubblegum |
| `peace-lily` | A peace lily: glossy dark-green lance-shaped leaves with two white spoon-shaped spathe flowers on tall stems | sky blue |
| `zz` | A ZZ plant: several upright stems lined with glossy, oval, deep-green leaflets, neat and symmetrical | sun yellow |
| `string-of-pearls` | String of pearls: a mound of round bead-like green pearls with many strands cascading down over all sides of the pot | grape |
| `pink-princess` | A Philodendron Pink Princess: dark green-black heart-shaped leaves with bold bubblegum-pink variegation splashes | coral |
| `aloe` | An aloe vera: a rosette of thick, pointed, fleshy blue-green leaves with tiny soft white teeth on the edges | coral |
| `spider` | A spider plant: arching green-and-cream striped grassy leaves, with two small baby plantlets hanging on runners over the pot edge | sky blue |
| `rubber` | A rubber plant (burgundy): a short trunk with large glossy oval leaves in deep burgundy-green with red midribs | coral |
| `bird-of-paradise` | A bird of paradise: tall paddle-shaped leaves with natural tears and one orange-and-blue crane-like flower | sun yellow |
| `basil` | A bushy sweet basil plant with many bright-green, glossy, cupped oval leaves | sun yellow |
| `mint` | A bushy mint plant with many textured, serrated, bright-green leaves on square stems | sky blue |
| `tomato` | A cherry tomato plant tied to a thin wooden stake, toothed compound leaves, small trusses with two ripe red tomatoes, one orange, one green | sun yellow |
| `pepper` | A bushy chili pepper plant with oval leaves and three hanging peppers: one red, one orange Scotch-bonnet shaped, one green | sky blue |
| `spring-onion` | A clump of 6 tall, hollow, tube-shaped spring onion leaves rising straight up from white bulb bases at soil level | grape |
| `cutting` | A single pothos cutting with two heart-shaped leaves standing in a small clear glass jar of water with thin white roots visible; THE JAR has the face; a pale blue lid band (no pot) | (jar) |

---

## 3. Onboarding & setup

**3.1 Welcome hero**: `onboarding-welcome.png`, 1024×1024 [T]
```
Three plant-buddy cards arranged like stickers on a fridge, slightly overlapping and tilted: (1) a butter-yellow (#FFF1B8) rounded card on the left holding a HAPPY Marble Queen pothos in a sky-blue pot; (2) a lavender (#EDE7FF) card top-right holding a HAPPY monstera in a sun-yellow pot; (3) an ice-blue (#D6EEFF) card bottom-centre holding a THIRSTY calathea in a coral pot. Each card has a navy outline and a hard flat drop shadow straight down. An empty white speech bubble with a navy outline comes from the calathea (no text inside). 5 small confetti dots. Transparent background. 1024×1024.
```

**3.2 Grow-type tiles** (3 images, 1024×1024 [T])
- `grow-houseplants.png`: *"A HAPPY monstera buddy in a sun-yellow pot, centred. Transparent background. 1024×1024."*
- `grow-edibles.png`: *"A HAPPY cherry tomato buddy (staked, red tomatoes) in a sky-blue pot, centred. Transparent background. 1024×1024."*
- `grow-cuttings.png`: *"A HAPPY pothos cutting in a clear water jar with white roots, the jar has the face, two small sparkles. Transparent background. 1024×1024."*

---

## 4. Seasons (6 images, 1024×1024 [T])

Each one is a **square spot illustration on a soft rounded tile**: a rounded square in the given tint, navy outline, with the scene inside it. Transparent outside the tile.

| File | Tile tint | Scene |
|---|---|---|
| `season-grey.png` (Seattle default) | ice blue #D6EEFF | A cosy window with soft grey clouds and drizzle outside, a SNOOZING pothos on the sill, a small warm grow-light bulb glowing above it |
| `season-dry-summer.png` | butter #FFF1B8 | A sunny balcony railing, a HAPPY cherry tomato buddy and a small sky-blue watering can, a smiling sun |
| `season-winter.png` | ice blue #D6EEFF | A window with snowflakes, a SNOOZING calathea on the sill next to a radiator |
| `season-spring.png` | mint #D7F9E4 | A HAPPY seedling tray with tiny sprouts and a small buddy pot with a new leaf unfurling, a few blossoms |
| `season-harmattan.png` (tropical) | peach #FFD9CF | A hazy orange sun with soft dusty wind swirls, a slightly THIRSTY pothos |
| `season-rains.png` (tropical) | ice blue #D6EEFF | A cheerful raincloud with drops above a SNOOZING plant buddy |

Prompt pattern:
```
Season spot illustration: a rounded-square tile in [TINT] with a navy outline. Inside: [SCENE]. Fully transparent outside the tile. 1024×1024.
```

---

## 5. Celebration moments (5 images, 1024×1024 [T])

| File | Prompt |
|---|---|
| `celebrate-thanks.png` | A HAPPY Marble Queen pothos buddy (sky-blue pot) inside a large white circle with a navy outline, surrounded by a joyful burst of chunky confetti (yellow rectangles, coral and sky-blue dots, grape rectangles, bubblegum strips, white dots, all outlined). Transparent background. |
| `moment-new-leaf.png` | A HAPPY monstera buddy (sun-yellow pot) proudly showing one brand-new, light-green, half-unfurled leaf, with three small yellow sparkle stars around the new leaf. Transparent background. |
| `moment-roots.png` | A pothos cutting in a clear water jar, the jar's face delighted with wide eyes and a big smile, a bundle of white roots clearly visible in the water, two sparkles. Transparent background. |
| `moment-harvest.png` | A woven wicker basket with a navy outline overflowing with cherry tomatoes, a red chili, an orange Scotch bonnet and a bunch of spring onions; a small HAPPY tomato buddy peeks in from the right. Transparent background. |
| `moment-smart-skip.png` | A content SNOOZING fiddle-leaf fig buddy (coral pot) with a lavender sleep mask pushed up onto the top of the pot and a small "Z" shape, beside a small cute water-drop character giving a thumbs-up. Transparent background. |

Add *"1024×1024"* to each.

---

## 6. Empty, error & gentle states (5 images, 1024×1024 [T])

| File | Prompt |
|---|---|
| `empty-jungle.png` | An empty terracotta-peach pot with a hopeful smiling face, a small seed packet leaning on it, a little trowel and a mound of soil beside it. Transparent background. |
| `empty-caught-up.png` | Three SNOOZING buddies in a row (monstera in a yellow pot, pothos in a blue pot, snake plant in a coral pot) with a crescent moon and three small stars above, on a soft lavender rounded shape. Transparent outside the shape. |
| `error-offline.png` | A slightly THIRSTY snake plant buddy (coral pot) holding a tin-can string telephone with a tangled string, gentle and funny. Transparent background. |
| `memorial.png` | A gentle, respectful scene: an empty peach pot with a small heart on it and a soft calm face, beside a HAPPY pothos cutting in a water jar with roots, and one tiny new sprout between them; a soft lavender circle behind. No crying, no sadness. Transparent background. |
| `away-mode.png` | A HAPPY Marble Queen pothos buddy riding in the passenger seat of a small rounded yellow cartoon car with the window down, a folded map and a vinyl record on the dashboard. Side view, playful road-trip feel. Transparent background. 1536×1024. |

Add *"1024×1024"* to the first four.

---

## 7. Badges (13 unlocked + 13 locked, 1024×1024 [T])

**Unlocked prompt:**
```
Round achievement badge: a solid [COLOUR] circle with a white inner ring, a thick navy outline and a hard flat drop shadow straight down. Centred emblem: [EMBLEM], drawn in the PlantFam sticker style. No text. Fully transparent background. 1024×1024.
```
**Locked version** (reply right after each unlocked one):
```
Same badge, locked state: light grey (#F2F2F6) fill, dashed navy outline, emblem in muted grey with no colour, a small navy padlock at the bottom-right edge. Transparent background.
```

| File | Colour | Emblem |
|---|---|---|
| `badge-knows-when-to-wait` | leaf green #3DDC84 | a calm snoozing plant with a small hourglass |
| `badge-offshoots` | grape #A78BFA | a small parent plant with a dashed line to a cutting in a jar |
| `badge-propagator` | grape #A78BFA | three connected dots forming a family-tree branch, with one leaf |
| `badge-first-root` | sky blue #5AB8FF | a water jar with white roots |
| `badge-first-harvest` | coral #FF6B5B | a small basket with a tomato and a chili |
| `badge-first-new-leaf` | light green #7CEBA8 | an unfurling leaf with a sparkle |
| `badge-generous` | bubblegum #FFB3C7 | a gift box with a leaf sticking out |
| `badge-survived-grey-season` | ice blue #D6EEFF | a raincloud over a happy plant |
| `badge-survived-winter` | ice blue #D6EEFF | a snowflake next to a happy plant |
| `badge-grandma-plant` | lavender #EDE7FF | a plant buddy wearing tiny round glasses |
| `badge-week-streak` | orange #FF9F1C | a chunky flame |
| `badge-jungle-10` | leaf green #3DDC84 | a cluster of three plant buddies |
| `badge-photo-diary` | sun yellow #FFD23F | a camera with a leaf |

---

## 8. Sharing cards (4 images)

| File | Size | Prompt |
|---|---|---|
| `share-tree-bg.png` | 1024×1536 | Vertical story card background: butter-yellow (#FFF1B8) with a subtle scattered pattern of tiny leaves and dots; a large empty white rounded panel with a navy outline in the middle (for the app to draw a family tree); an empty leaf-green ribbon banner at the top; small buddies peeking from the bottom corners; confetti in the corners. No text. |
| `share-harvest-bg.png` | 1024×1536 | Vertical card background: peach (#FFD9CF); at the bottom a wicker basket overflowing with cherry tomatoes, chilies and spring onions; above it a large empty white rounded panel with a navy outline; confetti. No text. |
| `share-gift.png` | 1536×1024 | Link-preview image: mint (#D7F9E4) background; on the left a HAPPY Marble Queen pothos buddy in a blue pot; a dashed navy line with a small heart leads to the right, where a HAPPY pothos cutting in a jar wears a bubblegum ribbon bow; empty space at the top for a headline. No text. |
| `recap-cover.png` | 1024×1536 | Vertical celebratory cover: leaf-green background with confetti; at the bottom two-thirds, a crowded group photo of HAPPY buddies (monstera, pothos, fig, calathea, snake plant, hoya, cherry tomato, chili, spring onion), all facing forward; the top third left empty for a title. No text. |

---

## 9. Widgets (2 images)

| File | Size | Prompt |
|---|---|---|
| `widget-small.png` | 1024×1024 | Widget background: a butter-yellow rounded square with a navy outline; a HAPPY monstera buddy in the bottom-right corner, partly cropped by the edge; the top-left 60% left empty for a number and label. No text. |
| `widget-medium.png` | 1536×1024 | Widget background: a mint rounded rectangle with a navy outline; three small HAPPY buddies (monstera, tomato, snake plant) standing along the bottom edge; the upper half empty for text. No text. |

---

## 10. App Store backgrounds (5 images, 1024×1536, then upscale/extend to 1290×2796)

```
App Store screenshot background, vertical: solid [COLOUR] background. In the centre-lower area, an empty iPhone-shaped rounded rectangle with a white screen area, a thick navy outline and a hard flat drop shadow (the app will place a screenshot inside). Two or three plant buddies peek from behind the phone edges: [BUDDIES]. A few confetti shapes. The top 30% is left completely empty for a headline. No text. 1024×1536.
```

| File | Colour | Buddies peeking |
|---|---|---|
| `store-bg-1.png` | leaf green #3DDC84 | monstera (happy) left, pothos (thirsty) right |
| `store-bg-2.png` | sun yellow #FFD23F | calathea (happy) left, snake plant (snoozing) right |
| `store-bg-3.png` | coral #FF6B5B | pothos cutting in jar left, monstera right |
| `store-bg-4.png` | sky blue #5AB8FF | cherry tomato left, chili pepper right |
| `store-bg-5.png` | grape #A78BFA | hoya left, string of pearls right |

---

## 11. Notification avatar

**`notif-avatar.png`**, 1024×1024 [T]
```
Close-up of a Marble Queen pothos buddy's sky-blue pot face in the THIRSTY mood, with leaves peeking over the top, composed to fit neatly inside a circle (keep the face and the top of the leaves within the central circular area). Transparent background. 1024×1024.
```

---

## Final checklist

| Group | Images |
|---|---|
| Brand | 5 |
| Plant buddies (20 × 3) | 60 |
| Onboarding + grow tiles | 4 |
| Seasons | 6 |
| Celebrations | 5 |
| Empty / gentle states | 5 |
| Badges (13 + 13 locked) | 26 |
| Sharing cards | 4 |
| Widgets | 2 |
| Store backgrounds | 5 |
| Notification avatar | 1 |
| **Total** | **123** |

**Where they go in the app:** plant buddies are used at medium and large sizes (detail screen hero, onboarding, celebrations). In small list rows and family-tree nodes, the app keeps its code-drawn vector buddies, which change pot colour and mood live. Drop finished files into `assets/illustrations/` using the names above.
