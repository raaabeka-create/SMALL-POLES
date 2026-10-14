# SMALL POLES

A Ghana-inspired street-football browser game. The current build is a local playable prototype built with HTML, CSS, JavaScript modules, and HTML Canvas.

## Current gameplay
- Local offline matches: 1v1, 2v2, and 3v3 against lightweight AI.
- Match durations: 60 seconds, 2 minutes, or 3 minutes.
- Movement, player collisions, ball momentum, shooting, goals, score display, timer, pause, restart, and full-time results.
- Responsive touch movement and shoot/sprint controls on mobile.
- No account or backend configuration is needed to play the current prototype.

## Controls
- **Move:** WASD or arrow keys.
- **Shoot:** Space, when near the ball.
- **Sprint:** Shift.
- **Pause / resume:** Pause button or Escape.
- **Mobile:** Use the on-screen direction pad, Sprint, and Shoot buttons.

## Run the current prototype
Open `index.html` in a modern browser, or publish the repository as a static site. The current build uses browser-native JavaScript modules and has no dependency-install step.

## Project structure
- `index.html` — match setup and game interface.
- `styles.css` — responsive visual styling.
- `src/main.js` — Canvas rendering, local match loop, controls, and AI.
- `docs/architecture.md` — planned system architecture and phases.

## Roadmap
1. Playable local match prototype.
2. Gameplay and responsive UI testing/refinement.
3. Supabase project, PostgreSQL schema, and Row Level Security.
4. Authentication and player profiles.
5. Persisted match history.
6. Public hosting and production verification.

## Current limitations
- Matches are local and offline. There is no online multiplayer.
- Scores are not yet persisted to Supabase or an account.
- Opponent behaviour is deliberately lightweight prototype AI, not advanced tactical AI.
- Browser-only scores are not trustworthy for competitive leaderboards. Secure competitive multiplayer will require server-authoritative match simulation and validation.

## Security
Do not commit private credentials. Supabase client configuration will be introduced only in the backend integration phase, using public client configuration and database Row Level Security where appropriate.
