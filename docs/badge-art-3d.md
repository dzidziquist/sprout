# Glossy enamel badge art

The selected direction is option 1 from the November 2026 comparison: glossy enamel medals with raised three-dimensional details. Production files retain their existing names under `assets/art/`, so the badge map and earned/locked behavior continue to use the same paths.

## Style

- Rounded, beveled rims and a recessed enamel field.
- Raised sculpted motifs, soft reflections and lighting from the upper left.
- The existing badge's motif and colour family, with simple forms readable at the app's 72-pixel display size.
- A near-frontal view with a slight angle that reveals the rim's thickness.
- Transparent square PNGs with clear margins and no external ground shadow.
- Locked versions preserve the corresponding earned design in silver/pewter, with a small dark padlock at the lower right.

There are 16 earned designs and 15 locked designs. The master medal is shown earned only and uses the same image for both map entries. The `10` ribbon remains on Ten skips; the master medal retains its PlantFam ribbon.

## Review and provenance

The first-check badge establishes the approved material and lighting reference. Each other earned design is generated from its existing production illustration plus that reference; each locked design is generated from its new earned counterpart and its previous locked illustration. Original art remains available in Git history and in the incoming source archive where present.

`badge-art-3d-manifest.json` records the delivered files, dimensions, byte sizes and SHA-256 hashes. Generated source exports are kept separately in the execution workspace. The app continues to render PNG artwork; these are rendered 3D illustrations, not mesh assets or animated 3D models.

## Delivery

The 1254 × 1254 generated masters total about 60 MiB and remain in the execution workspace. Production copies are resized to the existing 640 × 640 canvas and encoded as optimized transparent PNGs. The complete production set is about 4.50 MiB, compared with about 2.15 MiB for the previous artwork. The manifest includes each master's hash as well as its delivery file's hash.

[Open the badge gallery](badge-art-3d-gallery.html) to review enlarged and 72-pixel examples on light and dark backgrounds. The main asset gallery and inventory also reflect the replacement badge files.

## Badge preview

| Badge | Earned | Locked |
| --- | --- | --- |
| First Check | <img src="../assets/art/badge-first-check.png" width="96" height="96" alt="First Check earned"> | <img src="../assets/art/badge-first-check-locked.png" width="96" height="96" alt="First Check locked"> |
| First Cutting | <img src="../assets/art/badge-first-cutting.png" width="96" height="96" alt="First Cutting earned"> | <img src="../assets/art/badge-first-cutting-locked.png" width="96" height="96" alt="First Cutting locked"> |
| First Harvest | <img src="../assets/art/badge-first-harvest.png" width="96" height="96" alt="First Harvest earned"> | <img src="../assets/art/badge-first-harvest-locked.png" width="96" height="96" alt="First Harvest locked"> |
| First Photo | <img src="../assets/art/badge-first-photo.png" width="96" height="96" alt="First Photo earned"> | <img src="../assets/art/badge-first-photo-locked.png" width="96" height="96" alt="First Photo locked"> |
| First Roots | <img src="../assets/art/badge-first-roots.png" width="96" height="96" alt="First Roots earned"> | <img src="../assets/art/badge-first-roots-locked.png" width="96" height="96" alt="First Roots locked"> |
| First Skip | <img src="../assets/art/badge-first-skip.png" width="96" height="96" alt="First Skip earned"> | <img src="../assets/art/badge-first-skip-locked.png" width="96" height="96" alt="First Skip locked"> |
| Five Plant Fam | <img src="../assets/art/badge-five-plant-fam.png" width="96" height="96" alt="Five Plant Fam earned"> | <img src="../assets/art/badge-five-plant-fam-locked.png" width="96" height="96" alt="Five Plant Fam locked"> |
| Four Week Streak | <img src="../assets/art/badge-four-week-streak.png" width="96" height="96" alt="Four Week Streak earned"> | <img src="../assets/art/badge-four-week-streak-locked.png" width="96" height="96" alt="Four Week Streak locked"> |
| Generous | <img src="../assets/art/badge-generous.png" width="96" height="96" alt="Generous earned"> | <img src="../assets/art/badge-generous-locked.png" width="96" height="96" alt="Generous locked"> |
| Grandma Plant | <img src="../assets/art/badge-grandma-plant.png" width="96" height="96" alt="Grandma Plant earned"> | <img src="../assets/art/badge-grandma-plant-locked.png" width="96" height="96" alt="Grandma Plant locked"> |
| Medal | <img src="../assets/art/badge-medal.png" width="96" height="96" alt="Medal earned"> | Earned only |
| Propagator | <img src="../assets/art/badge-propagator.png" width="96" height="96" alt="Propagator earned"> | <img src="../assets/art/badge-propagator-locked.png" width="96" height="96" alt="Propagator locked"> |
| Survived Dry Season | <img src="../assets/art/badge-survived-dry-season.png" width="96" height="96" alt="Survived Dry Season earned"> | <img src="../assets/art/badge-survived-dry-season-locked.png" width="96" height="96" alt="Survived Dry Season locked"> |
| Survived Grey Season | <img src="../assets/art/badge-survived-grey-season.png" width="96" height="96" alt="Survived Grey Season earned"> | <img src="../assets/art/badge-survived-grey-season-locked.png" width="96" height="96" alt="Survived Grey Season locked"> |
| Survived Winter | <img src="../assets/art/badge-survived-winter.png" width="96" height="96" alt="Survived Winter earned"> | <img src="../assets/art/badge-survived-winter-locked.png" width="96" height="96" alt="Survived Winter locked"> |
| Ten Skips | <img src="../assets/art/badge-ten-skips.png" width="96" height="96" alt="Ten Skips earned"> | <img src="../assets/art/badge-ten-skips-locked.png" width="96" height="96" alt="Ten Skips locked"> |
