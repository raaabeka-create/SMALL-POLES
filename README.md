# SMALL POLES — Street Tour

**Ghana-born street football. Built for the court.**

SMALL POLES is an original browser-based 3D street-football game rooted in Ghanaian neighbourhood culture. The match objective is different from conventional football: strike the marked brick on the opponent's wall to score. There are no goal nets.

The project is an evolving indie prototype, not a FIFA product and not affiliated with EA Sports. It uses an original SMALL POLES identity and procedural 3D art rather than proprietary FIFA assets.

## The current experience

- **Real-time 3D matches:** Three.js WebGL rendering, perspective camera, lighting, shadows, textured brickwork and a dusty enclosed court.
- **Three match formats:** 1v1, 2v2 and 3v3 against local AI opponents.
- **Street football controls:** dribble, pass, shoot, sprint, press, shove/tackle, feint and celebrate.
- **Ball physics:** loose-ball movement, gravity, bounce, wall rebounds, shots and passes.
- **Street Tour profile:** local match record, wins, draws, losses, poles hit, reputation XP, levels and progress toward the next level.
- **Player identity:** choose a street name, kit colour and skin tone.
- **Three Ghanaian venues:** Accra — Dust & Brick; Jamestown — Coastal Heat; Kumasi — Green Quarter.
- **Neighbourhood world dressing:** compound houses, kiosks, market stalls, utility poles and wires, palms, spectators, street litter and coastal details where appropriate.
- **Match presentation:** responsive scoreboard and timer, pause/restart/full-time overlays, action prompts, score animations and lightweight synthesized match sounds.
- **Desktop and mobile input:** keyboard plus touch movement and action buttons.
- **Responsive game hub:** custom SMALL POLES visual identity, match setup, career progress and controls guide.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys | Move |
| S | Pass with possession; press when defending |
| A | Shoot |
| D | Shove / tackle |
| E or Shift | Sprint |
| Space or F | Feint / quick cut |
| C | Celebrate |
| Escape | Pause / resume |
| Touch controls | Move and use actions on mobile |

With possession, S passes toward a teammate. Without possession, S applies defensive pressure. D is a close-range tackle attempt, so timing and distance matter.

## Run locally

Open `index.html` in a modern browser, or deploy the repository as a static site. The Three.js module is loaded from jsDelivr, so an internet connection is needed to load the 3D engine on first use. No package installation or private API credentials are required.

## Project structure

- `index.html` — game hub, match setup, HUD, controls and overlays.
- `styles.css` — responsive visual design and interaction states.
- `src/game3d.js` — Three.js scene, player and ball models, match loop, controls, AI, scoring, audio feedback and local career progression.
- `src/neighborhood.js` — procedural Ghanaian neighbourhood environment dressing.
- `docs/architecture.md` — architecture and planned development phases.

## Honest status and next steps

This is a playable **local prototype**. The visual presentation and match feel are being upgraded iteratively, but it has not yet been validated as a production game across browsers and devices.

Important current limitations:

- There is no online multiplayer, matchmaking, or shared online leaderboard.
- Career data is saved in the current browser/device using local storage; it is not an account-backed cloud profile.
- Opponent AI is lightweight and needs more tactical depth, animation variety and balancing.
- Characters and neighbourhood objects are built from procedural geometry. They are not yet equivalent to the fidelity of a full commercial football game's custom character rigs, motion capture, animation system or authored environments.
- Sound is synthesized locally; there is no recorded crowd commentary, licensed soundtrack or full audio mix.
- Real-device performance, browser compatibility, accessibility and gameplay balance still need hands-on testing.

## Development priorities

1. Test and tune possession, tackling, shot accuracy, teammate movement and opponent AI.
2. Improve character animation, facial detail, ball response, crowd ambience and camera direction.
3. Add structured Street Tour events, tournament brackets, rewards and unlocks.
4. Add secure accounts and cloud-saved profiles if the backend phase proceeds.
5. Consider online multiplayer only with server-authoritative simulation and anti-cheat validation.

## Security

Never commit private credentials. Any future Supabase integration should use public client configuration and database Row Level Security; service-role secrets must remain server-side.
