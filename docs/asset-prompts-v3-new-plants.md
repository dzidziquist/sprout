# PlantFam: plant buddy prompts v3 (36 new plants)

This batch adds **36 new plant buddies** (20 houseplants, 16 edibles), each in 3 moods: **108 images**. They join the 20 existing buddies in `assets/buddies/`, so they must look like they came from the same sheet. The difference is that these are **single high-res exports**. The old sprites were sliced out of one 1536×1024 sheet. They come out at only about 150px, look soft when scaled up, and several have a neighbour's leaves clipped into the edge (look at the right edge of `pothos-happy.png` or `tomato-happy.png`).

Use this file together with `asset-prompts-v2.md`. That file still covers every non-buddy asset.

---

## 1. How to run it in ChatGPT

### Recommended: 3 separate images per plant, made as edits of the HAPPY image

For each plant:

1. **Turn 1:** paste the plant's **HAPPY** prompt below. Save the result once it passes the checklist (section 4).
2. **Turn 2:** paste the plant's **THIRSTY** follow-up. It tells ChatGPT to edit the image it just made and change only the face, the leaf droop and the drop.
3. **Turn 3:** paste the plant's **SNOOZING** follow-up.

**Why separate images rather than a 3-across sheet?** A sheet gives the most consistent pose, but ChatGPT's widest canvas is 1536×1024. That leaves each mood about 500px wide. The three plants also overlap, so you get the same soft, clipped crops we're replacing. Editing the HAPPY image keeps the pot, colour, scale and baseline locked, because ChatGPT is only touching the face and the leaves. Each mood also comes out at a clean native 1024×1024.

If the edits start to drift (a new pot shape, a different number of leaves), ask for a 3-across sheet **only as a pose reference**. Attach it to the next edit with "match this pose". Never export from the sheet.

### Chat hygiene

- **Start a fresh chat every 5 or 6 plants.** That's 15 to 18 images. After that, long chats drift in style and outline weight.
- **At the start of every chat:**
  - paste the **STYLE BLOCK** (section 2) as the first message;
  - attach `design/asset-concepts/plant-buddies-sheet.png` (the style source);
  - once you have one approved new plant, also attach its `-happy.png` as the **scale master**, with the line *"Match this exact pot size, pot position and outline weight for every buddy in this chat."*
- **One plant per turn.** Never ask for two plants in one image.
- **Fix, don't restart.** If one detail is wrong, reply *"Keep everything identical, only change X."*

### Export and naming

| Item | Rule |
|---|---|
| File names | `{id}-happy.png`, `{id}-thirsty.png`, `{id}-snoozing.png` (exact ids from the tracking table). No `buddy-` prefix: the app's existing files don't use one. |
| Size | 1024×1024 px, square |
| Format | PNG-24 with alpha (RGBA), sRGB |
| Background | Fully transparent. If ChatGPT returns white, see the next row. |
| White background fallback | Ask once: *"Same image, fully transparent PNG background, no shadow, no glow."* If it is still white, remove it with an AI background remover (remove.bg, Photoshop "Remove Background", macOS Preview "Remove Background"). **Don't use a magic wand:** it eats the white highlights and the white variegation on leaves. |
| Folder | `assets/buddies/` |

**Normalise the scale before saving.** The app fits each image into the same box, so the pots must line up across all 56 buddies:

1. Make a 1024×1024 frame in Figma (or Photopea / Photoshop) with guides at:
   - **x = 512** (centre);
   - **y = 600** (where the pot rim should start);
   - **y = 970** (pot bottom).
2. Paste the image. Scale it so the **pot (rim included) is about 400–420px wide**, the **pot bottom sits on y = 970**, and the **pot is centred on x = 512**. Centre the pot, not the whole plant: trailing plants are lopsided.
3. Nothing should touch the frame edges. Keep at least **24px** of empty margin. If a vine or frond pokes out, scale the whole thing down a little rather than cropping.
4. Export at 1x as PNG. Apply the same transform to all three moods of a plant (copy and paste it in Figma), so the three files line up exactly.

---

## 2. STYLE BLOCK (paste first in every chat)

This is refined from what the existing buddies actually look like, which differs from v2's wording in a few places. The outlines in the real art are near-black, not navy. The eyes are round dots, not vertical ovals. The leaves are richly shaded, not flat.

```
Style for every image in this chat: "PlantFam" plant buddy sticker. Match the attached reference sheet exactly.

SUBJECT & FRAMING
- One potted plant, front view, slightly above eye level so the top of the soil is just visible inside the rim. Centred. Whole plant and pot visible, nothing cropped, at least 3% empty margin on every side.
- Square 1024×1024. Fully transparent background (PNG alpha). No ground shadow, no glow, no backdrop, no frame, no label, no text.
- Scale: the pot is about 40% of the canvas width and sits in the lower ~38% of the canvas (pot bottom about 5% above the bottom edge). The plant fills the space above and is taller and wider than the pot, lush and full. Trailing stems may hang beside the pot.

LINE
- Clean dark outline, near-black (#141414 to #1B1B2F), on every shape. Bolder on the outer silhouette of the pot and plant (about 1% of the image width), thinner on interior details (veins, leaf overlaps, soil). Rounded joins, no sketchy double lines, no gaps.

LEAVES
- Rich cel-shaded illustration, not flat vector and not photographic: each leaf has 3–4 tones (dark shadow green, mid green, light green, a small pale highlight streak), a visible midrib and a few soft vein lines. Leaves overlap in layers with darker greens at the back and in the centre.
- Botanically recognisable at small size: get the leaf SHAPE, edge, variegation and growth habit right; simplify the count, never the shape.
- Dark brown soil visible at the rim, with stems emerging from it.

POT
- A classic tapered flowerpot: a wide, slightly lighter rim band on top, a body that tapers a little toward the bottom, softly rounded bottom corners, a flat base.
- One flat pot colour (given per image), a soft darker shade on the right side, a soft lighter area and one short white gloss highlight on the upper left. Smooth glossy ceramic.

FACE (on the pot body, below the rim, centred, at about the vertical middle of the body)
- Eyes: two small solid near-black round dots, set wide apart, each with a tiny white catchlight.
- Mouth: a small near-black curved smile centred between the eyes and slightly below them.
- Cheeks: two soft round pink blush patches (#FF7A9C, slightly transparent) just outside and slightly below each eye.
- The face is small relative to the pot (the whole face spans about 60% of the pot's width).

MOODS (only the face, leaf posture and the one extra element change between moods)
- HAPPY: dot eyes, small U smile, blush. Leaves perky and upright.
- THIRSTY: the same dot eyes with small worried eyebrows slanting up in the middle, a small wavy mouth, blush. ONE sky-blue (#5AB8FF) teardrop with a dark outline and a white highlight, beside the upper right of the pot, overlapping the rim edge. Leaves gently droop: tips lower, stems bending outward and down. Still green and full, never brown, crispy, yellowed or dead. Hopeful, never crying.
- SNOOZING: eyes closed as two soft downward-curved arcs (like ◡), a small relaxed smile, blush. ONE small hand-drawn "z" shape in dark outline with a white fill, floating at the upper right of the pot where the thirsty drop would be. This is the only letter-like mark allowed. Leaves relaxed, the same as happy or settled very slightly lower.

PALETTE
- Pots: sun yellow #FFD23F, sky blue #5AB8FF, coral #FF6B5B, grape #A78BFA, bubblegum #FFB3C7.
- Greens: deep #22B864, base #3DDC84, light #7CEBA8, plus darker shadow greens. Plant-specific colours (flowers, fruit, variegation) as described per plant.

TONE: cute, warm and premium, like an indie app (Duolingo, Finch). Not babyish, no extra characters, no arms or legs, no accessories.
```

---

## 3. Per-plant prompts

How each plant block works:

- The **HAPPY** prompt is complete. Paste it as is.
- **THIRSTY** and **SNOOZING** are follow-up edits. Send them in the same chat, right after the approved HAPPY image.
- The pot colour is fixed per plant. Don't swap it: the colours are balanced across the set (see section 5).

---

### Houseplants

#### 1. `philodendron-heartleaf`: Heartleaf philodendron · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a heartleaf philodendron (Philodendron hederaceum): a full mound of smooth, glossy, solid mid-green HEART-shaped leaves with long pointed tips and a deep notch at the stem, on thin green stems. Several vines trail down over the left and right sides of the pot, with leaves getting smaller toward the vine ends. No variegation. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep the plant, the leaf count, the pot, the pot colour, the size and the position identical. Change only: MOOD = THIRSTY face (worried brows, wavy mouth) and the sky-blue drop at the upper right. The heart leaves hang flatter with tips pointing down, and the trailing vines hang limp and straight down. Still green and glossy.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face (closed arc eyes, small smile) and one small "z" shape at the upper right. One trailing vine rests curled along the pot rim like a scarf.
```

#### 2. `philodendron-brasil`: Philodendron Brasil · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Philodendron 'Brasil': glossy HEART-shaped leaves with pointed tips, each with a bold LIME-GREEN and pale-yellow stripe or splash down the centre of a dark green leaf, the variegation different on every leaf. Bushy on top, with vines trailing over both sides of the pot. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The heart leaves tip downward and the vines hang limp and straight. The variegation stays bright.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape at the upper right. The leaves are relaxed. One vine curls loosely along the front of the rim.
```

#### 3. `alocasia-polly`: Alocasia 'Polly' (African mask) · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an Alocasia 'Polly': 4–5 large ARROWHEAD-shaped leaves with wavy scalloped edges, very dark glossy green almost black-green, with thick bright WHITE veins (a white midrib and white side veins running to the edge, and a white leaf margin). Each leaf is held up on a long upright stem, and the leaves point out in a fan. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The long stems bend outward near the top so the arrow leaves tilt down, tips pointing at the ground. The white veins stay crisp.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The leaves are relaxed, and one leaf is tilted forward over the pot like a sun hat.
```

#### 4. `anthurium`: Anthurium · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an Anthurium: glossy dark-green HEART-shaped leaves on long stems, and 3 glossy bright RED heart-shaped spathe "flowers" (waxy and shiny, with a white highlight), each with an upright yellow-cream finger-like spadix in the middle. The flowers stand a little above the leaves. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves tilt downward and the red spathes nod forward slightly on their stems. Still red and glossy.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The red spathes tilt gently to one side as if dozing.
```

#### 5. `phalaenopsis`: Moth orchid · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Phalaenopsis moth orchid: 3–4 broad, thick, glossy, strap-shaped leaves fanning out low over the pot rim; 2 silvery-green aerial roots poking over the rim; one tall arching flower spike supported by a thin bamboo stake with a small clip, carrying 5 flat round MOTH-shaped flowers in white with soft pink-magenta centres and a little yellow lip, plus 2 small round buds at the tip. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The strap leaves go a little limp and lie flatter over the rim, and the flower spike arches lower with the end flower facing down. All flowers stay on.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape, floating beside the buds.
```

#### 6. `boston-fern`: Boston fern · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Boston fern: a big, fluffy fountain of long, arching, sword-shaped fronds, each lined with many small neat leaflets along a central stem like a feather, in fresh bright green, spilling over all sides of the pot. Two or three tightly curled fiddlehead tips in the centre. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The fronds sag lower and hang more steeply downward over the pot, a little less fluffy. Still green, no brown tips.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. One frond drapes over the front of the rim like a fringe of hair.
```

#### 7. `pilea`: Pilea peperomioides (Chinese money plant) · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Pilea peperomioides: a short central stem with 9–11 perfectly ROUND, flat, coin-like glossy leaves on long thin stems that attach to the CENTRE of each leaf like little umbrellas (a small dot shows where the stem meets each leaf). Mid-bright green, the leaves held out in all directions in a dome. One tiny baby pilea pup pokes out of the soil beside the main stem. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The round leaves cup downward like closed umbrellas and the thin stems bend down. Still green.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The baby pup leans against the main stem.
```

#### 8. `begonia-maculata`: Polka-dot begonia · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Begonia maculata: upright, bamboo-like segmented green canes carrying long, lopsided ANGEL-WING leaves with pointed tips, deep olive green covered in bold round SILVER-WHITE POLKA DOTS. A hint of deep red on the undersides shows on 2 tilted leaves. One small drooping cluster of white flowers. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The angel-wing leaves hang lower from the cane joints, so more red undersides show. The polka dots stay bright.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The leaves are relaxed.
```

#### 9. `jade`: Jade plant · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a jade plant (Crassula ovata): a small tree shape with a thick, woody, brown-grey trunk splitting into 3–4 chunky branches, covered in thick, fleshy, glossy, OVAL, jade-green succulent leaves in opposite pairs, with thin RED edges on the leaf tips. A bonsai-like rounded crown. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The succulent leaves look slightly thinner, with one soft wrinkle line each, and the branches lean a little outward. Still green.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. Unchanged otherwise. It is a calm, sturdy little tree.
```

#### 10. `echeveria`: Echeveria · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an Echeveria: one perfect symmetrical ROSETTE like an open rose, made of thick, spoon-shaped, pointed succulent leaves in powdery BLUE-GREEN (#8FC9B8 to #5FA89A) with soft PINK tips and edges, layered in neat spirals from a tight centre. Low and wide, sitting just above the rim, with one small baby rosette offset to the side. Gravel top dressing instead of dark soil. Pot: bubblegum #FFB3C7. (The plant is low, so the pot can be a little shorter and wider. Keep the pot bottom and width the same as the other buddies.)
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The rosette opens slightly flatter, the outer leaves look a little thinner and lower, with one soft wrinkle line each. The colours stay the same.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The rosette closes very slightly, cupped like a sleeping flower.
```

#### 11. `christmas-cactus`: Christmas cactus · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Christmas cactus (Schlumbergera): arching, branching stems made of flat, glossy green SEGMENTS linked like a chain, with scalloped edges. The stems spill out and down over the pot. At the tips, 5–6 tubular, layered, swept-back flowers in hot MAGENTA-PINK (#E8457C) with white throats and long pink stamens. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The segmented stems hang limper and lower and the flowers point down. All flowers stay on.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 12. `dracaena-marginata`: Dragon tree · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Dracaena marginata: 2–3 thin, bare, slightly curving grey-brown trunks of different heights with diamond-pattern leaf scars, each topped with a spiky starburst tuft of long, very NARROW, sword-like dark-green leaves with thin RED-PURPLE edges. Like little palm-tree pom-poms. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. Each tuft's thin leaves arch down further like a floppy mop. The red edges stay.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The tufts relax slightly.
```

#### 13. `croton`: Croton · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Croton 'Petra': a bushy upright plant with big, thick, leathery, glossy OVAL-POINTED leaves in a bold mix of colours: dark green with bright YELLOW veins, some leaves turning ORANGE and RED (#FF6B5B / #FF9F1C) with yellow veins, the youngest top leaves mostly green-yellow. Very colourful, like autumn on one plant. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The big leaves hang straight down along the stems (crotons droop dramatically), and the colours stay vivid.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 14. `african-violet`: African violet · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an African violet (Saintpaulia): a low, flat ROSETTE of round-oval, thick, FUZZY dark-green leaves (show the fuzz as a soft velvety sheen, short stubby stems) layered over the rim, and a central bouquet of 7–9 small 5-petal VIOLET-PURPLE (#8E5BD6) flowers with bright yellow centres, raised just above the leaves. Pot: sun yellow #FFD23F. (Low plant: keep the pot bottom and width the same as the other buddies.)
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The fuzzy leaves lie flatter and droop over the rim on bent stems, and the flower cluster tilts down a little.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The flowers huddle slightly closer together.
```

#### 15. `aglaonema`: Aglaonema (Chinese evergreen) · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an Aglaonema 'Siam Aurora': a dense upright clump of large, glossy, lance-shaped pointed leaves on short stems, each leaf mid-green with a sage-green feathered centre, bright PINK-RED edges and a pink-red midrib and stems. Neat and full. Pot: bubblegum #FFB3C7.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves tilt down and outward from the centre, tips lower. The pink edges stay bright.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 16. `parlor-palm`: Parlor palm · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a parlor palm (Chamaedorea elegans): 5–6 thin green stems rising from the soil, each with an arching PINNATE frond of many narrow, soft, evenly spaced leaflets like a feather, in fresh mid-green, forming a graceful little indoor palm. Pot: bubblegum #FFB3C7.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The fronds arch lower and the leaflets hang down from the stems. Still green, no brown tips.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. One frond curves down over the top of the pot like a canopy.
```

#### 17. `english-ivy`: English ivy · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: an English ivy (Hedera helix): several long trailing vines covered in classic 3-to-5-POINTED, lobed ivy leaves, dark glossy green with pale whitish-green VEINS, small at the tips and larger near the pot. A small bushy top, with vines cascading down both sides of the pot and one vine curling up. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The vines hang straight and limp and the leaves face downward.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The upward-curling vine relaxes down onto the rim.
```

#### 18. `tradescantia`: Tradescantia zebrina (wandering dude) · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Tradescantia zebrina: a bushy mound of pointed OVAL leaves on succulent jointed stems that trail over the pot rim. Each leaf has two shimmering SILVER stripes down a purple-green centre and dark purple edges, and the undersides are bright PURPLE-MAGENTA. A couple of tiny 3-petal pink flowers. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The stems flop over the rim and the leaves fold slightly lengthwise, showing more purple undersides.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The leaves are relaxed.
```

#### 19. `maranta`: Prayer plant (red maranta) · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a red prayer plant (Maranta leuconeura 'Erythroneura'): a low spreading mound of broad OVAL leaves held flat, each dark olive green with a lime-green feathery centre band and striking bright RED herringbone VEINS (a red midrib with red side veins like a fishbone). Some leaves spill over the rim. Pot: bubblegum #FFB3C7.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves droop and their edges curl inward a little, like rolled paper. The red veins stay bright.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The leaves FOLD UPWARD and stand upright in pairs, like hands together in prayer (what the real plant does at night).
```

#### 20. `syngonium`: Arrowhead plant · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a Syngonium 'White Butterfly' (arrowhead vine): a bushy clump of ARROWHEAD-shaped leaves (a pointed tip and two backward-pointing lobes) on long stems, each leaf pale creamy-green in the centre fading to a darker green edge, with light veins. One or two older leaves split into 3 lobes. One short vine trails over the rim. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The stems bend over so the arrowheads point at the ground.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

---

### Edibles

Edibles can show one small fruit or veg detail (a strawberry, a pea pod, a lemon). Root veg show their leafy tops with a peek of the root at the soil line. **The fruit or veg never gets a face.** Only the pot does.

#### 21. `lettuce`: Leaf lettuce · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a loose-leaf lettuce: one big, open, round ROSETTE head of soft, crinkly, RUFFLED leaves with frilly wavy edges, bright fresh lime-green (#8EDB5A to #5CC45A) with pale whitish ribs at the base, the inner leaves smaller and lighter, a few outer leaves with a faint reddish tinge on the frilly tips. Low and wide, puffing up just above the rim. Pot: coral #FF6B5B. (Low plant: keep the pot bottom and width the same as the other buddies.)
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The outer leaves flop outward and hang over the rim, and the frilly edges go limp. Still green.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The rosette closes slightly, the leaves cupped inward like a cosy little head.
```

#### 22. `kale`: Curly kale · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a curly kale plant: a short thick stem with 6–8 big upright leaves on pale green stalks. Each leaf is tightly RUFFLED and CURLED along the edges like parsley, deep BLUE-GREEN (#2E8B6A to #4FAF8A), with a thick pale midrib. Tall and frilly, like a bouquet of crinkled feathers. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The big leaves bend at the stalk and hang down outward.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 23. `bush-bean`: Bush bean · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a bush green-bean plant: a compact rounded bush of TRIFOLIATE leaves (three broad, heart-to-oval pointed leaflets per stem), fresh mid-green with visible veins. Two small white bean flowers, and 3 long slim smooth bright-green BEAN PODS hanging down in front of the leaves, one hanging over the pot rim. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaflets fold down along their stems and the pods hang limp.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The leaflets fold DOWN gently, hanging like sleepy ears (beans really do this at night).
```

#### 24. `pea`: Garden pea · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a garden pea plant climbing a small A-shaped trellis of two thin bamboo canes with a little twine. Soft blue-green stems with pairs of smooth round-oval leaflets, large leafy stipules where the leaves join the stem, and many thin, curly, spring-like TENDRILS gripping the canes. Two white pea flowers, and 2 plump bright-green PEA PODS hanging down, one slightly open showing a row of round peas. Pot: bubblegum #FFB3C7.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The tendrils lose their curl and hang straighter, and the leaflets droop.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The open pea pod closes.
```

#### 25. `cucumber`: Cucumber · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a cucumber vine climbing a small wooden ladder trellis: big, broad, slightly hairy, MAPLE-like leaves with 3–5 shallow pointed lobes and toothed edges, mid-green with pale veins; curly tendrils wrapped around the trellis; 2 bright yellow 5-petal star flowers; and one small dark-green CUCUMBER with tiny bumps and a dried flower still on its tip, hanging down. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The big leaves hang down limp from their stalks like wet flags.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The yellow flowers close into small twisted buds.
```

#### 26. `zucchini`: Zucchini · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a zucchini plant: a central crown with 4–5 HUGE, deeply lobed, dark-green leaves with SILVER-WHITE mottling along the veins, on long thick hollow prickly stalks that fan out wide. In the centre, one big bright orange-yellow TRUMPET flower, and one glossy dark-green ZUCCHINI lying out over the rim. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The huge leaves wilt dramatically on bent stalks, hanging down around the pot like an umbrella (zucchini's classic afternoon flop). Still green.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The big trumpet flower is CLOSED into a twisted bud.
```

#### 27. `strawberry`: Strawberry · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a strawberry plant: a mound of TRIFOLIATE leaves (three rounded, deeply SERRATED, slightly crinkled leaflets per stalk), mid-green. One white 5-petal flower with a yellow centre, and 2 glossy RED STRAWBERRIES with tiny yellow seeds and green leafy caps hanging over the front rim, plus 1 small white-green unripe berry. One thin runner arcing out with a tiny baby plant. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaflets droop on bent stalks. The berries stay plump and red.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 28. `blueberry`: Blueberry bush · sun yellow
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a small blueberry shrub: several thin, woody, reddish-brown branches with small, smooth, glossy OVAL pointed leaves (green, a few tinged red at the tips), and 3 hanging CLUSTERS of round dusty-BLUE berries (#4A6FD8 with a pale powdery bloom highlight and a tiny crown-shaped star at the bottom of each berry), plus 2 pinkish unripe berries. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves hang down and curl a little and the branches lean outward. The berries stay plump.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 29. `rosemary`: Rosemary · coral
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a rosemary bush: many upright, slightly woody stems densely covered in short, thin, NEEDLE-like leaves, dark grey-green on top with paler silvery undersides, like little bottle brushes. A few tiny pale-blue flowers along the stems. Upright and shrubby. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The soft stem tips bend over and nod downward, and the needles look slightly duller.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 30. `parsley`: Curly parsley · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a curly parsley plant: a dense round mound of many thin green stems topped with tightly CURLED, crinkly, moss-like leaf clusters, bright emerald green, very frilly and puffy, like little green clouds. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The thin stems bend outward so the curly clusters hang over the rim and the mound flattens.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 31. `cilantro`: Cilantro (coriander) · bubblegum
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a cilantro plant: a loose bunch of thin, upright stems with FLAT, rounded, 3-lobed, SCALLOP-edged leaves (like small flat parsley but rounder and softer), bright light green. Near the top, a few finer, lacy, FEATHERY thread-like upper leaves, and 2 tiny umbrella clusters of white flowers. Light and airy, not dense. Pot: bubblegum #FFB3C7.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The thin stems flop over to the sides, with the leaves facing down.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 32. `chives`: Chives · sun yellow
> Must read differently from the existing `spring-onion` buddy (thick tubes, white bulbs, grape pot). Chives are thinner, denser and have purple flowers.

**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a chive clump: a dense tuft of MANY (20+) very thin, hollow, grass-like dark-green leaves rising straight up, with 3 round fluffy POMPOM flowers in lilac-purple (#B48AE0) on thin stems standing just above the leaves. No visible white bulbs. Pot: sun yellow #FFD23F.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The thin leaves bend and flop outward in all directions like messy hair, and the pompoms nod down.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The pompom flowers lean together sleepily.
```

#### 33. `garlic`: Garlic · coral
> Must read differently from `spring-onion` and `chives`: garlic has FLAT, wider leaves and a curly scape.

**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a garlic plant: 5–6 FLAT, strap-like, blue-green leaves (#5E9E86) arching out from a central stalk in a loose V, and one thin curly garlic SCAPE making a loop-de-loop, with a pointed pale-green bud at the tip. At the soil line, the plump top of a white GARLIC BULB with faint purple streaks peeks out. Pot: coral #FF6B5B.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The flat leaves bend over halfway and hang down, and the scape's loop sags.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The scape curls into a tighter spiral like a nightcap.
```

#### 34. `radish`: Radish · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: radishes: a compact rosette of rough, slightly hairy, LOBED leaves (bigger rounded lobe at the tip, small lobes down the stalk), mid-green on pinkish-red stalks. At the soil line, the round shoulders of 2 bright MAGENTA-RED (#E8335A) radishes peek out of the soil, glossy with a white highlight, one showing a little of its white bottom. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves flop outward and hang over the rim.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape. The radishes snuggle a little deeper into the soil.
```

#### 35. `carrot`: Carrot · grape
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: carrots: a tall, airy, FEATHERY, FERN-like fountain of finely divided bright-green carrot tops on thin stalks. At the soil line, the wide ORANGE (#FF9F1C) shoulders of 2 carrots peek out of the dark soil, with faint horizontal ring lines. Pot: grape #A78BFA.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The feathery tops lean and flop outward over the rim.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

#### 36. `meyer-lemon`: Meyer lemon tree · sky blue
**HAPPY**
```
PlantFam buddy, MOOD = HAPPY. Plant: a dwarf Meyer lemon tree: a short grey-brown trunk with a round bushy crown of glossy, dark-green, OVAL pointed citrus leaves. 2 round, smooth, deep-yellow-to-yolk-orange MEYER LEMONS (#FFC93C with a white highlight, rounder than a regular lemon) hanging in the crown, and 3 small white 5-petal blossoms with a tiny touch of purple-pink on the buds. Pot: sky blue #5AB8FF.
```
**THIRSTY**
```
Edit the image you just made: keep everything identical. Change only: MOOD = THIRSTY face and the sky-blue drop. The leaves droop and curl slightly inward along the midrib and the crown sags a little. The lemons stay.
```
**SNOOZING**
```
Edit the HAPPY image: keep everything identical. Change only: MOOD = SNOOZING face and one small "z" shape.
```

---

## 4. Reviewing the outputs

### Checklist (each image)

- [ ] **Style match.** Hold it next to `pothos-happy.png` and `monstera-happy.png`. Check for the same near-black outline, the same rich multi-tone leaf shading and the same glossy pot.
- [ ] **Recognisable at 64px.** Zoom out until the image is thumbnail-size. Could you name the plant? Check the leaf shape, variegation and signature detail (spots, veins, fruit, flower).
- [ ] **Face on the pot.** It is centred on the pot body below the rim, with two round dot eyes, a small mouth and two pink cheek blushes. No face on leaves, fruit, flowers or veg.
- [ ] **Mood is clear.**
  - Happy: open dot eyes and a smile.
  - Thirsty: worried brows, a wavy mouth, ONE blue drop at the upper right, and gently drooping leaves.
  - Snoozing: arc eyes and ONE small "z".
- [ ] **Exactly one pot.** No extra pots, saucers, stands, trays or second plants.
- [ ] **No text.** No labels, captions, signatures or watermarks. The "z" in the snoozing mood is the only allowed mark.
- [ ] **Transparent background.** No white box, no checkerboard *drawn into* the image, no ground shadow, no glow or halo.
- [ ] **Same scale and baseline.**
  - The pot is about 400–420px wide, its bottom sits on y ≈ 970, and it is centred on x = 512.
  - Nothing is cropped and nothing touches an edge.
  - All three moods of one plant line up when you toggle between them.
- [ ] **Three moods match.** They have the same leaf count, pot colour and pot shape. Only the face, the droop and the drop or "z" differ.
- [ ] **Correct pot colour** from the table below.
- [ ] **Named correctly:** `{id}-{mood}.png` in `assets/buddies/`.

### Regenerate (or ask for a targeted fix) if

- **Outline:** it is thin, grey, missing, or a different weight from the existing buddies. *Fix:* "Keep everything identical, outlines bolder and near-black like the reference."
- **Shading:** the leaves have gone flat vector (one tone) or photoreal. *Fix:* "Same image, cel-shaded leaves with 3–4 tones like the reference."
- **Face:** the face sits on the leaves or fruit, is too big (wider than ~60% of the pot), or has arms, legs, a nose or teeth.
- **Thirsty overdone:** the leaves are brown, yellow, crispy or collapsed, there is crying, or there is more than one drop.
- **Snoozing overdone:** there is "Zzz", more than one z, a speech bubble, a moon or a nightcap. *Fix:* "Only one small z at the upper right."
- **Wrong species:** the plant looks generic (round green blobs) or like a different species. Watch especially for:
  - parsley vs cilantro;
  - chives vs spring onion;
  - heartleaf vs Brasil (the Brasil needs its lime stripe);
  - pothos vs heartleaf (the heartleaf has no marbling).
- **Pot shape drifts** from the classic tapered flowerpot with a rim band (square boxes, baskets, hanging planters).
- **Canvas:** the image isn't square, or ChatGPT returned 1024×1536 or 1536×1024.
- **Text or extras:** it contains any text, logo or watermark, a background scene, a table or a windowsill.
- **Moods don't match:** a mood edit changed the plant, leaf count, pot colour or position. Go back to the HAPPY image and redo the edit, attaching the HAPPY file.

---

## 5. Tracking table

Pot balance: sun yellow 8, sky blue 7, coral 8, grape 7, bubblegum 6.

| # | id | Common name | Pot colour | Happy | Thirsty | Snoozing |
|---|---|---|---|---|---|---|
| 1 | `philodendron-heartleaf` | Heartleaf philodendron | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 2 | `philodendron-brasil` | Philodendron Brasil | grape #A78BFA | [ ] | [ ] | [ ] |
| 3 | `alocasia-polly` | Alocasia 'Polly' | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 4 | `anthurium` | Anthurium | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 5 | `phalaenopsis` | Moth orchid | grape #A78BFA | [ ] | [ ] | [ ] |
| 6 | `boston-fern` | Boston fern | coral #FF6B5B | [ ] | [ ] | [ ] |
| 7 | `pilea` | Chinese money plant | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 8 | `begonia-maculata` | Polka-dot begonia | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 9 | `jade` | Jade plant | coral #FF6B5B | [ ] | [ ] | [ ] |
| 10 | `echeveria` | Echeveria | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 11 | `christmas-cactus` | Christmas cactus | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 12 | `dracaena-marginata` | Dragon tree | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 13 | `croton` | Croton | grape #A78BFA | [ ] | [ ] | [ ] |
| 14 | `african-violet` | African violet | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 15 | `aglaonema` | Chinese evergreen | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 16 | `parlor-palm` | Parlor palm | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 17 | `english-ivy` | English ivy | coral #FF6B5B | [ ] | [ ] | [ ] |
| 18 | `tradescantia` | Wandering dude | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 19 | `maranta` | Prayer plant | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 20 | `syngonium` | Arrowhead plant | coral #FF6B5B | [ ] | [ ] | [ ] |
| 21 | `lettuce` | Leaf lettuce | coral #FF6B5B | [ ] | [ ] | [ ] |
| 22 | `kale` | Curly kale | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 23 | `bush-bean` | Bush bean | grape #A78BFA | [ ] | [ ] | [ ] |
| 24 | `pea` | Garden pea | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 25 | `cucumber` | Cucumber | grape #A78BFA | [ ] | [ ] | [ ] |
| 26 | `zucchini` | Zucchini | coral #FF6B5B | [ ] | [ ] | [ ] |
| 27 | `strawberry` | Strawberry | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 28 | `blueberry` | Blueberry | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 29 | `rosemary` | Rosemary | coral #FF6B5B | [ ] | [ ] | [ ] |
| 30 | `parsley` | Curly parsley | grape #A78BFA | [ ] | [ ] | [ ] |
| 31 | `cilantro` | Cilantro | bubblegum #FFB3C7 | [ ] | [ ] | [ ] |
| 32 | `chives` | Chives | sun yellow #FFD23F | [ ] | [ ] | [ ] |
| 33 | `garlic` | Garlic | coral #FF6B5B | [ ] | [ ] | [ ] |
| 34 | `radish` | Radish | sky blue #5AB8FF | [ ] | [ ] | [ ] |
| 35 | `carrot` | Carrot | grape #A78BFA | [ ] | [ ] | [ ] |
| 36 | `meyer-lemon` | Meyer lemon | sky blue #5AB8FF | [ ] | [ ] | [ ] |

---

## Owner's decision: redo the original 20 in this style too

The original 19 buddies + the cutting jar were sliced from one ChatGPT sheet: ~150–170px, soft at the 220px hero size, a few with a neighbour's leaf clipped in (`pothos-thirsty`, `tomato-happy`), and their thirsty/snoozing moods are subtler than the new set. So that the whole jungle looks like one family, regenerate them with this doc's style block and workflow (same 1024px export, same names, overwrite the files in `assets/buddies/`):

`monstera`, `pothos`, `fig` (fiddle-leaf fig), `calathea` (orbifolia), `snake`, `hoya`, `peace-lily`, `zz`, `string-of-pearls`, `pink-princess`, `aloe`, `spider`, `rubber`, `bird-of-paradise`, `basil`, `mint`, `tomato`, `pepper`, `spring-onion`, and `cutting` (a pothos cutting rooting in a glass jar of water, face on the jar).

Do these first: they're on screen most. Use the current PNGs as the reference for which plant and pot colour each one is.
