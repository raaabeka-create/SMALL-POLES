# SMALL POLES — Street Football

A browser-based 3v3 street-football game inspired by Ghanaian urban football culture.

## Play

Open `index.html` in a modern browser, or serve locally:

```bash
npx serve .
python -m http.server 8080
```

### GitHub Pages

Source: **GitHub Actions** (`.github/workflows/deploy-pages.yml`).

Live: https://raaabeka-create.github.io/SMALL-POLES/

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Shift | Sprint |
| J | Pass |
| K | Shoot (hold for power) |
| L | Tackle |
| Esc | Pause |

## Architecture

```
js/engine/   SceneManager, Pitch
js/entities/ Player, Ball
js/systems/  MatchManager
js/ui/       UIManager
js/utils/    input, math
```

Three.js via CDN import map. No build step.
