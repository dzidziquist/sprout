# PlantFam: image asset prompts for ChatGPT

How to use this:
1. Start **one** ChatGPT conversation and paste the **Style anchor** first. Keep every asset in that same chat so the style stays consistent.
2. Upload `design/screens/StyleGuide.png` (and optionally `design/plantfam-overview.png`) as a visual reference with the anchor.
3. Then paste prompts one at a time. Ask for **transparent PNG** wherever noted. Re-roll until the outline weight and face style match the reference.
4. Save files with the names given. They map to the app's asset folders.

> What does **not** need ChatGPT: UI icons (tab bar, care actions, stage dots), buttons, chips and colours. Those are drawn in code as SVG and are already in the board.

---

## Style anchor (paste first)

```
You are illustrating assets for "PlantFam", a playful plant-care app. Keep one consistent style for every image in this chat:

STYLE: Bold, friendly "sticker" illustration. Flat colour fills, no gradients, no textures, no photorealism. Every shape has a thick, even, dark ink outline (#1B1B2F, about 2–3% of image width, rounded joins). Shapes are chunky and rounded. Tiny white highlight strokes on pots and leaves. Cute but not babyish, think Duolingo or Finch, with a slightly indie, hand-made warmth.

PALETTE (use only these):
Leaf green #3DDC84, deep leaf #22B864, light leaf #7CEBA8, sun yellow #FFD23F, coral #FF6B5B, sky blue #5AB8FF, grape #A78BFA, bubblegum #FFB3C7, orange #FF9F1C, ink #1B1B2F, white #FFFFFF.
Soft tints for backgrounds: mint #D7F9E4, butter #FFF1B8, peach #FFD9CF, ice #D6EEFF, lavender #EDE7FF, blush #FFE1E8.

CHARACTERS: Each plant lives in a simple rounded pot (a wide rim band on top of a tapered body). The POT has the face: two small oval ink eyes, a small mouth, and two soft pink cheek dots (#FF7A9C). Moods:
- Happy: little U-shaped smile, rosy cheeks.
- Thirsty: worried eyebrows, wavy mouth, a single small blue sweat drop (#5AB8FF). Hopeful, not sad. Never crying, never wilted to death.
- Snoozing: closed curved eyes, tiny round mouth, calm.
Plants are botanically recognisable but simplified.

TONE: warm, encouraging, never guilt-inducing. No text inside images unless asked. Centered composition with generous padding.
```

---

## 1. App icon & brand

**1.1 App icon**: `app-icon-1024.png` (1024×1024, no transparency, no rounded corners; iOS masks them)
```
App icon for PlantFam. A single happy monstera in a sun-yellow (#FFD23F) pot with the smiling face, centered on a solid leaf-green (#3DDC84) background. The plant fills about 70% of the canvas, with three fenestrated leaves. Thick ink outline. No text. Square 1024×1024, full bleed, no rounded corners. It must read clearly at 60px.
```

**1.2 Icon variants**: `app-icon-dark-1024.png`, `app-icon-tinted-1024.png`
```
Two versions of the same PlantFam app icon: (a) dark mode, the same character on a deep ink (#1B1B2F) background with the leaves slightly brighter; (b) monochrome/tinted, the character as a single flat white silhouette with ink outlines on transparent, for iOS tinted icons. 1024×1024 each.
```

**1.3 Wordmark sticker**: `logo-sticker.png` (transparent)
```
A sticker-style logo: a small leaf-green rounded square badge holding a single ink leaf icon, next to the word "PlantFam" in a chunky rounded display font (like Fredoka Bold), ink colour. Thick white sticker border around the whole lockup, then a thin ink outline. Transparent background, 2000×800.
```

**1.4 Splash screen**: `splash-2048.png` (transparent PNG; the app supplies the green background)
```
Splash art: the happy monstera-in-yellow-pot character centered, with three tiny confetti shapes (a yellow dot, a coral rectangle, a white dot) floating around it. Transparent background, 2048×2048, character at about 40% of the width.
```

---

## 2. Plant buddy characters (core set)

Generate each as **one image with three moods side by side** (Happy · Thirsty · Snoozing), transparent background, 3000×1000, then slice into separate 1000×1000 PNGs.

Naming: `buddy-{species}-{mood}.png` (moods are happy, thirsty and snoozing)

**2.1 Monstera**: pot: sun yellow
```
Character sheet, three versions side by side on a transparent background: a Monstera deliciosa with three big split/fenestrated leaves on stems, in a sun-yellow rounded pot. Left: Happy. Middle: Thirsty (worried brows, wavy mouth, blue sweat drop). Right: Snoozing (closed eyes). Same plant pose in all three; only the pot face changes. 3000×1000.
```

**2.2 Pothos (Marble Queen)**: pot: sky blue
```
Character sheet, 3 moods side by side, transparent: a Marble Queen pothos with heart-shaped green leaves splashed with white marbling. A bushy crown, plus two trailing vines hanging over both sides of a sky-blue pot. Happy / Thirsty / Snoozing faces on the pot. 3000×1000.
```

**2.3 Fiddle-leaf fig**: pot: coral
```
Character sheet, 3 moods, transparent: a fiddle-leaf fig, a single upright brown stem with large violin-shaped glossy leaves alternating up the stem, in a coral pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.4 Calathea orbifolia**: pot: grape
```
Character sheet, 3 moods, transparent: a Calathea orbifolia with big round leaves showing pale silvery-green stripes, fanning out from a grape-purple pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.5 Snake plant**: pot: coral
```
Character sheet, 3 moods, transparent: a snake plant (Sansevieria) with 4 tall upright sword leaves in mixed greens, with yellow (#FFD23F) edge bands, in a coral pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.6 Hoya**: pot: bubblegum
```
Character sheet, 3 moods, transparent: a Hoya carnosa with thick waxy oval leaves on an arching vine, plus one trailing vine over the pot edge, and a small round cluster of pale pink star-shaped flowers with red centres. Bubblegum-pink pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.7 Cutting in a jar**: no pot
```
Character sheet, 3 moods, transparent: a single pothos cutting (one stem, two heart leaves) standing in a small glass jar of water with a few white roots. The jar has the face (eyes, mouth, cheeks) and a pale-blue lid band. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.8 Cherry tomato**: pot: sun yellow
```
Character sheet, 3 moods, transparent: a cherry tomato plant tied to a thin wooden stake, with toothed compound leaves, two ripe red tomatoes, one pale tomato and one green one, in a sun-yellow pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.9 Chili pepper (Scotch bonnet)**: pot: sky blue
```
Character sheet, 3 moods, transparent: a bushy pepper plant with oval leaves and three hanging peppers, one red, one orange and one green (one can be a squat Scotch-bonnet shape), in a sky-blue pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.10 Spring onion**: pot: grape
```
Character sheet, 3 moods, transparent: a clump of spring onions (scallions), 5 tall hollow green leaves rising from white bases peeking out of the soil, in a grape-purple pot. Happy / Thirsty / Snoozing. 3000×1000.
```

**2.11 Bonus species (v1.1 catalogue):** reuse prompt 2.1 with these swaps:
peace lily (white spathe flowers), ZZ plant (glossy pinnate stems), string of pearls (trailing bead strands), philodendron Pink Princess (dark leaves with pink splashes), aloe vera, spider plant with babies, rubber plant (burgundy), bird of paradise, basil, mint.

---

## 3. Onboarding & hero illustrations

**3.1 Welcome hero**: `onboarding-welcome.png` (transparent, 1500×1500)
```
Three plant buddies tilted like stickers on a fridge: a happy pothos (blue pot) in a butter-yellow rounded card on the left, a happy monstera (yellow pot) in a lavender card top right, and a thirsty calathea (coral pot) in an ice-blue card bottom centre. Each card has a thick ink outline and a hard drop shadow offset straight down. A small white speech bubble from the calathea (leave it empty; the app adds text). A few confetti dots. Transparent background.
```

**3.2 Climate set**: `season-harmattan.png`, `season-rains.png`, `season-winter.png`, `season-summer.png` (transparent, 800×800 each)
```
Four small square spot illustrations in the PlantFam style, one per image: (1) Harmattan: a hazy sun with dusty wind swirls and a slightly thirsty pot plant; (2) Rainy season: a cheerful raincloud with drops over a happy snoozing pot plant; (3) Temperate winter: a window with snowflakes and a snoozing plant on the sill beside a radiator; (4) Summer: a big smiling sun and a happy plant wearing tiny sunglasses. Transparent, 800×800 each, matching outline weight.
```

**3.3 What-do-you-grow tiles**: `grow-houseplants.png`, `grow-edibles.png`, `grow-cuttings.png`
```
Three small transparent spot illustrations: (1) a happy monstera in a yellow pot; (2) a happy cherry tomato plant in a blue pot; (3) a happy cutting in a water jar. Same scale, 600×600 each.
```

---

## 4. Celebration & feedback moments

**4.1 Thank-you burst**: `celebrate-thanks.png` (transparent, 1500×1500)
```
A happy pothos buddy (blue pot) inside a big white circle with an ink outline, surrounded by a burst of chunky confetti: yellow rounded rectangles, coral dots, sky-blue dots, a grape rectangle, bubblegum strips and white dots. All with ink outlines. Joyful and bouncy. Transparent background.
```

**4.2 First new leaf**: `moment-new-leaf.png`
```
A happy monstera buddy proudly showing a brand-new small light-green unfurling leaf, with three little sparkle stars around the new leaf. Transparent, 1200×1200.
```

**4.3 Roots spotted**: `moment-roots.png`
```
A cutting-in-a-jar buddy with surprised, delighted eyes, white roots visibly grown in the water, two sparkles. Transparent, 1200×1200.
```

**4.4 First harvest**: `moment-harvest.png`
```
A small woven basket with an ink outline holding cherry tomatoes, a red chili, an orange chili and a bunch of spring onions. A happy tomato buddy peeks in from the side. Transparent, 1200×1200.
```

**4.5 Smart skip**: `moment-smart-skip.png`
```
A snoozing fiddle-leaf fig buddy (coral pot) with a tiny sleep mask pushed up and a small "Z", looking content: "I'm good, no water needed". A little blue water drop nearby gives a thumbs up. Transparent, 1200×1200.
```

---

## 5. Empty, error & gentle states

**5.1 Empty jungle** (no plants yet): `empty-jungle.png`
```
An empty rounded pot with a hopeful face, sitting next to a little seed packet and a small trowel, waiting for its first plant. Soft and inviting. Transparent, 1200×1200.
```

**5.2 All caught up**: `empty-caught-up.png`
```
Three happy plant buddies (monstera, pothos, snake plant) sitting in a row, snoozing contentedly, with a small crescent moon and stars above them. Transparent, 1500×1000.
```

**5.3 Offline / something went wrong**: `error-offline.png`
```
A thirsty-but-hopeful snake plant buddy holding a tangled string connected to a paper-cup telephone. Gentle and humorous, not alarming. Transparent, 1200×1200.
```

**5.4 Plant memorial** (a plant died): `memorial.png`
```
A gentle, respectful illustration: an empty pot with a small heart on it, a single healthy cutting in a water jar beside it smiling softly, and a tiny sprout of hope. The message is "save a cutting, keep the family going". No sad crying faces. Soft lavender tint circle behind it. Transparent, 1200×1200.
```

**5.5 Away mode** (road trip): `away-mode.png`
```
A happy pothos buddy sitting in the passenger seat of a small rounded cartoon car with the window down, a tiny map and a vinyl record on the dashboard. Playful road-trip energy. Transparent, 1500×1000.
```

---

## 6. Badges (achievement medals)

Each badge: a **circle medal** with a thick ink outline, a solid fill colour, a white inner ring and a central emblem. Transparent background, 600×600. Also generate a **locked** version: the same shape with a light grey (#F2F2F6) fill, dashed ink outline and a muted grey emblem.

Prompt template:
```
A round achievement badge in the PlantFam sticker style: solid {COLOUR} fill, a white inner ring, a thick ink outline and a hard drop shadow straight down. In the centre: {EMBLEM}. No text. Transparent background, 600×600. Then a second image: the locked version of the same badge, with a light grey fill, dashed outline and grey emblem.
```

| File | Colour | Emblem |
|---|---|---|
| `badge-knows-when-to-wait` | leaf green | a calm pot plant with a small hourglass |
| `badge-propagator` | grape | three connected dots in a family-tree branch shape, with a leaf |
| `badge-first-root` | sky blue | a water jar with white roots |
| `badge-first-harvest` | coral | a basket with a tomato and a chili |
| `badge-first-new-leaf` | light leaf | an unfurling leaf with a sparkle |
| `badge-generous` | bubblegum | a gift box with a leaf sticking out |
| `badge-survived-harmattan` | sun yellow | a hazy sun with a wind swirl over a happy plant |
| `badge-survived-winter` | ice blue | a snowflake beside a happy plant |
| `badge-grandma-plant` | lavender | a plant wearing tiny round glasses (third generation) |
| `badge-week-streak` | orange | a chunky flame |
| `badge-jungle-10` | leaf green | a small cluster of three plants |
| `badge-photo-diary` | sun yellow | a camera with a leaf |

---

## 7. Family tree & sharing

**7.1 Family tree card background**: `share-tree-bg.png` (1080×1920, story format)
```
A vertical 1080×1920 shareable card background in the PlantFam style: a butter-yellow (#FFF1B8) background with a subtle pattern of tiny leaves and dots, a large empty white rounded card area in the middle (for the app to draw the family tree), a leaf-green ribbon banner at the top (left empty for text), and confetti at the corners. No text.
```

**7.2 Harvest recap card**: `share-harvest-bg.png` (1080×1920)
```
A vertical shareable card background: a peach (#FFD9CF) background, a woven basket illustration at the bottom overflowing with cherry tomatoes, chilies and spring onions, and an empty white rounded panel above for stats. Confetti. No text.
```

**7.3 Gift-a-cutting card**: `share-gift.png` (1200×630 link preview)
```
A wide 1200×630 link-preview image: a cute cutting-in-a-jar buddy tied with a bubblegum ribbon bow, on a mint background, with a dashed line connecting it to a small happy parent pothos on the left (suggesting a family link). Room on the right for text (leave empty).
```

**7.4 Year-in-review cover**: `recap-cover.png` (1080×1920)
```
A celebratory vertical cover: all plant buddies (monstera, pothos, fig, calathea, snake plant, hoya, tomato, pepper, spring onion) crowded together like a group photo, all happy, on a leaf-green background with confetti. Leave the top third empty for a big title. 1080×1920.
```

---

## 8. Notifications & widgets

**8.1 Notification avatar**: `notif-avatar.png` (transparent, 512×512)
```
A tightly cropped head-and-shoulders view of the pothos buddy's pot face (thirsty-but-hopeful mood), with leaves peeking over the top. Fits in a circle. Transparent, 512×512.
```

**8.2 Home-screen widget art**: `widget-small.png`, `widget-medium.png`
```
Two widget backgrounds in the PlantFam style: (a) small square 600×600, a butter-yellow tile with a happy monstera buddy in the bottom-right corner, leaving the top-left empty for a number; (b) medium 1200×600, a mint tile with three tiny buddies along the bottom edge and empty space above for text. Thick ink outline around the tile edge, rounded corners.
```

---

## 9. App Store screenshots (marketing frames)

**9.1 Screenshot backgrounds**: `store-bg-1..5.png` (1290×2796, iPhone 6.7")
```
Five vertical 1290×2796 App Store screenshot backgrounds in the PlantFam style, one per colour: leaf green, sun yellow, coral, sky blue, grape. Each has a big empty area in the upper third for a headline, a centred empty rounded phone-shaped space (for a screenshot) with a thick ink outline and a hard shadow, and 2–3 plant buddies peeking from behind the phone edges with different moods. Confetti accents. No text.
```

Suggested headlines (added in Figma/Canva, not in the image):
1. "Your plants, but happier."
2. "Check the soil. Skip the guesswork."
3. "Every cutting keeps its family tree."
4. "From seed to first harvest."
5. "Rooting for you, never guilt-tripping you."

---

## Asset checklist

| Group | Count |
|---|---|
| App icon + variants, logo, splash | 5 |
| Plant buddies (10 species × 3 moods) | 30 |
| Onboarding + climate + grow tiles | 8 |
| Celebration moments | 5 |
| Empty/error/gentle states | 5 |
| Badges (12 × unlocked + locked) | 24 |
| Share cards | 4 |
| Notification + widgets | 3 |
| Store backgrounds | 5 |
| **Total** | **≈89 images** |

Tip: for the 30 buddy images, generate the 10 three-mood sheets and slice them. That is 10 generations, not 30, and it keeps the moods identical in pose.
