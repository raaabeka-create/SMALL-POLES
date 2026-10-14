# SMALL POLES

A Ghana-inspired neighbourhood street-football browser game. The current build is a local playable prototype built with HTML, CSS, JavaScript, and Three.js WebGL rendering. The 3D scene is generated procedurally; Three.js loads from jsDelivr, so the first load requires internet access.

## 3D presentation
- Real-time perspective camera and WebGL-rendered enclosed dirt court.
- Procedural brick walls with Ghana-inspired street lettering, target bricks, scattered court debris, lights, and directional shadows.
- 3D player characters with animated running limbs, skin tones, team kits, and celebration movement.
- A rolling/bouncing 3D ball, wall rebounds, local possession, passes, shots, tackles, and 1v1/2v2/3v3 AI.

## Street Tour foundation
- Street Tour profile with locally saved matches, wins/draws/losses, poles hit, reputation points, and levels.
- Player identity setup: street name tag, skin tone, and crew kit colour.
- Three selectable Ghanaian court settings: Accra, Jamestown, and Kumasi, each with distinct sky/lighting and neighbourhood colour treatment.
- Procedural compound houses, kiosks, market stalls, utility poles and wires, coastal props, spectators, palms, and dusty surroundings.
- Court selection rebuilds the 3D scene so changing venues between matches takes effect.

## Current gameplay
- Local offline matches: 1v1, 2v2, and 3v3 against lightweight AI.
- Match durations: 60 seconds, 2 minutes, or 3 minutes.
- Small Poles scoring: hit the marked rectangular brick on the end wall. Misses rebound; there are no conventional goal nets.
- Close-control dribbling: the ball follows the carrier with stride-based touches; hard direction changes and sprinting alter control.
- A quick feint/directional cut can create space and makes a defender's tackle less likely to win the ball.
- Ball spin bends shots and passes; loose-ball drag and wall rebounds are tuned for a dusty enclosed court.
- Ball possession sticks to the carrier's feet until a pass, shot, tackle, or interception releases it.
- Passing travels toward a teammate with a lead based on their movement. Opponents can intercept passes and claim loose balls.
- Defensive pressing builds pressure while held close and facing the carrier; shoving is a cooldown-limited, angle- and distance-sensitive tackle.
- Teammates make support runs, open passing lanes, and AI carriers choose between shooting near the pole and passing to a more open teammate.
- Ghanaian street-court callouts react to skills, tackles, interceptions, wall rebounds, shots, and poles.
- Basic AI dribbles, passes under pressure, and shoots when close enough to the pole.
- Ghanaian neighbourhood court styling: dusty earth, enclosed red-brick walls, hand-painted graffiti, and subtle scattered litter.
- Responsive on-screen controls for Pass/Press, Sprint, Shoot, Shove, and Celebrate.

## Controls
- Move: Arrow keys or on-screen direction controls; diagonals are supported.
- S — Pass / Press: with possession, pass automatically targets a teammate; without possession, hold S to pressure the opposing carrier.
- A — Shoot: shoot toward the opponent's half. Directional movement adjusts the shot angle.
- D — Shove: attempt a close-range tackle when defending. Timing and distance matter.
- E — Sprint: hold to sprint; sprinting with the ball is slower than sprinting off the ball.
- Space or F — Feint / quick cut while in possession.
- C — Celebrate.
- Escape — pause/resume.
- Mobile: use directional controls and on-screen action buttons, including Feint. Hold Pass/Press while defending to build pressure.

## Run the current prototype
Open index.html in a modern browser, or publish the repository as a static site. No dependency-install step is required.

## Project structure
- index.html — match setup, rules, and game interface.
- styles.css — responsive visual styling and action controls.
- src/main.js — Canvas rendering, local match loop, possession, actions, scoring, and AI.
- docs/architecture.md — planned system architecture and phases.

## Roadmap
1. Refine and test local 1v1, 2v2, and 3v3 gameplay.
2. Supabase project, PostgreSQL schema, and Row Level Security.
3. Authentication and player profiles.
4. Persisted match history.
5. Production deployment and runtime verification.

## Current limitations
- Matches are local and offline. There is no online multiplayer.
- Scores are not yet persisted to Supabase or an account.
- Opponent behaviour is lightweight prototype AI, not advanced tactical AI.
- Browser-only scores are not trustworthy for competitive leaderboards. Secure competitive multiplayer will require server-authoritative match simulation and validation.
- The visuals are drawn in Canvas, using procedural court details rather than final illustrated art assets. The new ball-control, AI and street-callout systems still need hands-on browser playtesting and balancing.

## Security
Do not commit private credentials. Supabase client configuration will be introduced only in the backend integration phase, using public client configuration and database Row Level Security where appropriate.
