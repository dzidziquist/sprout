# Light: where plants sit and the light they get

The simple version of the light map: no floor plan, furniture or scanning.

## What the user sets
- **Room windows** (Jungle, Light view, then Set up or Edit on a room): each window in the room, with which way it faces (N, E, S or W, or not sure) and what's in its way: nothing, a curtain or frosted glass, or a tree or building. A room can have none. Open-plan spaces count as one room. Rooms saved before each window had its own view read as one window per direction, all with the room's old shade.
- **Which window a plant is by**: asked on the spot sheet when the room has two or more. Until it's picked (or if that window is removed), the brightest counts.
- **Where each plant sits**: Sill, Below (the floor or a stool under the window), about 1 m, or Far (across the room). Stored as `plant.windowSpot`.

## How light is worked out (`src/engine/light.ts`)
- **The sun's path comes from the city's latitude**, so it works anywhere. Hemispheres flip, and near the equator the sun is so high that window direction matters less. For each window, direct sun on a vertical pane is `cos(elevation) × cos(angle to the facing)`, added up over the day. Sky light is counted for every daylight hour.
- **Spot and shade scale it**: below the sill the wall blocks the beam, and a sheer curtain or a tree cuts it.
- **Weather**: on the day, a forecast's cloud lowers the direct sun. With no forecast, a typical share of sun is assumed.
- **Levels**: low, medium, bright or direct (shown as Sunny). These are compared with the species' `defaultLight`, which is what the plant wants.

## Tips, only when they matter (one per plant, in priority order)
1. **Heat**: a 30 °C+ day in the next 3 days, on a sill that gets strong sun. "Pull X back from the sill that afternoon."
2. **Harsh**: direct sun for a plant that wants medium or low light. It's said as a summer thing when the winter light would be fine.
3. **Dim**: less light than the plant wants. It names the nearest spot in the same room that would suit, else another room. It's said as a short-days thing when summer would be fine.
4. **Grey**: 4 or more cloudy days ahead, for a plant that's only just getting enough light. "Try X closer for now."

Each spot also gets one plain verdict: **Likely suitable**, **Likely too dark** or **Likely too sunny** (today's light against what the species wants).

## Where it shows
- **Jungle, Light view** (the sun icon next to search): a "rooms left to set up" card with progress, then each set-up room with its windows and today's sun. Each plant shows where it sits and its verdict, with "Find a brighter spot" or "Find a shadier spot" when it doesn't suit, or "Set position" when its spot isn't known. Rooms not set up yet are dashed cards with a Set up button.
- **Room sheet**: a card per window and ＋ Add a window. Adding or editing one asks which way it faces, by phone compass (iOS asks for location access, which it uses for the compass; only the direction is kept) or by tapping North / East / South / West or Not sure (an average window), then what blocks the light at it: clear view, curtain or frosted, or trees and buildings. A room with no cards has no window.
- **Where it sits sheet**: four pictured spots (on the sill, below the window, about 1 m away, across the room), each with its verdict, and Save position.
- **Plant page**: a "Light at this spot" card with the verdict and what to do, or the over-the-year light when all is well, where it sits with Change, and Compare spots. Before setup it shows the one next step: choose a room, set up the room, or set the position.

## Later, if wanted
A drawn floor plan, a RoomPlan scan on LiDAR iPhones, and a room photo journey.
