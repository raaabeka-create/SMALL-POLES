# SMALL POLES

A Ghana-inspired neighbourhood street-football browser game. The current build is a local playable prototype built with HTML, CSS, JavaScript, and HTML Canvas.

## Current gameplay
- Local offline matches: 1v1, 2v2, and 3v3 against lightweight AI.
- Match durations: 60 seconds, 2 minutes, or 3 minutes.
- **Small Poles scoring:** score by kicking the ball into the marked rectangular brick on the end wall. Shots that miss the target rebound off the wall; there are no conventional goal nets.
- Player movement, collisions, ball momentum, passing, sprinting, shooting, celebrations, scoreboard, timer, pause, restart, and full-time results.
- Ghanaian neighbourhood court styling: dusty earth, enclosed red-brick walls, hand-painted graffiti, and subtle scattered litter.
- Responsive on-screen Pass, Sprint, Shoot, and Celebrate controls.
- No account or backend configuration is needed to play the current prototype.

## Controls
- **Move:** WASD or arrow keys.
- **Pass:** P, when close to the ball. In 2v2 and 3v3, passes aim toward the nearest teammate; in 1v1, it is a quick touch into space.
- **Shoot:** Space, when near the ball.
- **Sprint:** Hold Shift.
- **Celebrate:** C.
- **Pause / resume:** Pause button or Escape.
- **Mobile:** Use the direction pad and on-screen Pass, Sprint, Shoot, and Celebrate buttons.

## Run the current prototype
Open index.html in a modern browser, or publish the repository as a static site. The current build uses browser-native JavaScript and has no dependency-install step.

## Project structure
- index.html — match setup, rules, and game interface.
- styles.css — responsive visual styling and action controls.
- src/main.js — Canvas rendering, local match loop, controls, scoring, and AI.
- docs/architecture.md — planned system architecture and phases.

## Roadmap
1. Playable local match prototype and gameplay refinement.
2. Supabase project, PostgreSQL schema, and Row Level Security.
3. Authentication and player profiles.
4. Persisted match history.
5. Production deployment and runtime verification.

## Current limitations
- Matches are local and offline. There is no online multiplayer.
- Scores are not yet persisted to Supabase or an account.
- Opponent behaviour is deliberately lightweight prototype AI, not advanced tactical AI.
- Browser-only scores are not trustworthy for competitive leaderboards. Secure competitive multiplayer will require server-authoritative match simulation and validation.
- The visuals are currently drawn in Canvas, using procedural court details rather than final illustrated art assets.

## Security
Do not commit private credentials. Supabase client configuration will be introduced only in the backend integration phase, using public client configuration and database Row Level Security where appropriate.
