# SMALL POLES

3v3 Ghanaian street-football in the browser (Three.js).

## Play

**https://raaabeka-create.github.io/SMALL-POLES/**

Or serve locally: `npx serve .` then open the URL shown.

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrows | Joystick |
| Sprint | Shift | Sprint |
| Pass | **J** or **E** | Pass |
| Shoot (hold power) | **K** or **Space** | Shoot |
| Tackle | **L** or **F** | Tackle |
| Pause | Esc | Pause |
| Restart | HUD button | HUD |

## What's included

- Full match loop: menu → venue/kit select → 3v3 match → goals → full-time → rematch
- Sideline camera tracking the ball
- Ball physics: gravity, bounce, friction, spin, player collisions
- Human control + AI opponents/teammates
- Three venues (Accra, Jamestown, Kumasi) and team colours
- Scoreboard, timer, stamina, pause/restart
- Mobile touch controls

## Project layout

```
index.html
css/main.css
js/main.js
js/engine/   SceneManager.js, Pitch.js
js/entities/ Player.js, Ball.js
js/systems/  MatchManager.js
js/ui/       UIManager.js
js/utils/    input.js, math.js
```

No build step — ES modules + Three.js CDN.
