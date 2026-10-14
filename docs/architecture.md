# SMALL POLES — Initial Architecture

## Frontend
- Plain HTML, CSS, and modern JavaScript modules for the first release.
- HTML Canvas for the game rendering and local match simulation.
- Keep the gameplay engine independent from account and database code.
- No framework or local build tooling is required for the initial static foundation.

## Backend (later phase)
- Supabase Auth for registration, sign-in, and sessions.
- Supabase Postgres for player profiles and completed-match history.
- Row Level Security (RLS) for ownership and access control.
- Never put a Supabase service-role or secret key in browser code.

## Deployment (later phase)
- GitHub stores the source code and commit history.
- A static hosting platform publishes the browser game.
- Supabase stores data and provides backend services; it does not host the frontend by itself.

## Development order
1. Establish the repository and application structure.
2. Implement and test local 1v1, 2v2, and 3v3 gameplay.
3. Refine branding, interface, responsive layouts, and accessibility.
4. Create the Supabase project and apply a reviewed schema and RLS policies.
5. Add authentication and player profiles.
6. Save completed match records and show each user's own history.
7. Configure hosting and verify the public deployment.
8. Run desktop, mobile, security, and persistence checks.

## Important limitation
Local browser gameplay is not secure competitive multiplayer. Online multiplayer would require a networking layer and server-authoritative match state to prevent clients from inventing results.
