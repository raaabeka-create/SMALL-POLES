# SMALL POLES — Street Football

**An original Ghana-born, 3v3 street-football game for the browser.**

SMALL POLES is being rebuilt around the match itself: small-sided football, a walled dirt court, quick transitions, physical challenges, and a persistent local player card. Its presentation takes broad inspiration from modern street-sports games, while its name, characters, kits, courts, UI, and generated assets are original.

## Current rebuild

- Real-time 3D court rendered with Three.js.
- Six procedural player characters with team kits, numbers, simple run cycles, and celebrations.
- 3v3 matches against CPU-controlled opponents.
- Ball possession, shooting, passing, rebounds, player separation, and close-range tackles.
- Two framed goals with nets; goals count when the ball crosses the end line inside the goal opening.
- Three court selections: Accra, Jamestown, and Kumasi.
- Player name, kit colour, and skin-tone selection.
- Match clock, scoreboard, pause, restart, full-time result, and responsive touch controls.
- Local Street Tour progression stored in browser local storage.
- Generated scenery and materials; no proprietary game models, logos, or ripped FIFA assets.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | W / A / S / D or arrow keys | Direction pad |
| Sprint | Shift | Sprint |
| Shoot | J | Shoot |
| Pass when in possession | K | Pass / Tackle |
| Tackle when defending | Hold K while closing down | Hold Pass / Tackle while closing down |
| Pause / resume | Escape | Pause button |

## Run locally

This is a browser-based ES-module project. Serve the repository through a local HTTP server rather than opening the HTML file directly.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Three.js is loaded from jsDelivr, so an internet connection is required for the 3D module. The game has no backend database: career progress is saved in local storage in the current browser.

## Project structure

- `index.html` — player hub, match HUD, result overlays, and touch controls.
- `styles.css` — responsive original street-sports visual system.
- `src/game3d.js` — 3D scene, players, ball physics, CPU behaviour, scoring, controls, and career progression.
- `src/neighborhood.js` — procedural Ghanaian neighbourhood dressing.
- `src/main.js` — compatibility entry point for the current game module.

## Important status

This is an ambitious browser-game prototype, not a finished AAA release. The rebuild has passed a static JavaScript syntax check and basic HTML selector checks, but a full live browser play-test is still required. The next development priorities are more sophisticated animation, tactical opponent behaviour, goalkeeper/goal logic, audio polish, and performance testing on mobile devices.
