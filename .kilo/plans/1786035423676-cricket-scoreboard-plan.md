# Olympus Cricket Scoreboard — Implementation Plan

CREX-style live cricket scoring for the Olympus fest site. Ball-by-ball engine
powering a viewer live scoreboard and a scorer console, built on the existing
Supabase + React 19 + Vite + Tailwind 4 + Framer Motion stack. Cricket is the
first sport on a generic multi-sport `matches` foundation.

> Implementation requires source edits and Supabase SQL migrations. This plan is
> for an implementation-capable agent. Do not run migrations against production
> without review.

## Resolved Decisions

1. **Scope:** Full CREX 1:1 parity — live screen, full scorecard, ball-by-ball
   commentary, over-by-over, squads, wagon wheel, pitch map, Manhattan/worm +
   partnership graphs, projected score, and win probability.
2. **Teams:** Franchise vs franchise (the 8 existing franchises). Each match
   snapshots its playing XI into `match_players`, pre-filled from that
   franchise's cricket players, editable per match.
3. **Format:** T20 rules, but `overs_per_innings` is a per-match config value
   **defaulting to 10**. 11 a side (configurable 6–11), 6-ball overs, standard
   wide/no-ball (1 penalty run + re-ball). Two innings, limited-overs.
4. **Ball input:** Fast run/extra/wicket buttons commit instantly; optional
   two-tap overlay captures shot direction (wagon wheel) + pitch line/length
   (pitch map). Undo reverts the last ball.
5. **Scorer authority:** Admin creates match and assigns one scorer
   (`assigned_scorer_id`). Scoring RPCs allow the assigned scorer OR any admin.
6. **Viewer access:** Authenticated-only, consistent with the rest of the app
   (anon stays revoked). Writes are admin/scorer-only.
7. **Win probability:** Transparent heuristic from current match state (par-score
   curve in 1st innings; target/balls/wickets/RRR in 2nd). Constants in one config.
8. **Structure:** Generic `matches` shell (all sports) + cricket detail tables
   (`cricket_innings`, `cricket_deliveries`, `match_players`).
9. **Flow:** Guided — toss → openers → forced modals on wicket (incoming batsman,
   dismissal type, fielder/bowler credit) and over-complete (next bowler, no
   consecutive-over bowler), auto strike rotation with manual swap, guarded
   innings/match end.

## Architecture Overview

Mirror the proven auction pattern (`supabase/migrations/create_auction_tables.sql`,
`20260727_atomic_auction_engine.sql`, `src/pages/Auction.jsx`):

- **Event-sourced engine.** `cricket_deliveries` is the source of truth. Each
  ball is one row. `cricket_innings` holds running aggregates
  (runs/wickets/overs/extras) maintained transactionally inside the RPCs. The
  scorecard, graphs, wagon wheel, and pitch map are all derived from deliveries.
- **All writes via `SECURITY DEFINER` RPCs** with `FOR UPDATE` row locks so
  concurrent taps cannot corrupt state (exactly like `auction_place_bid`).
  Direct table INSERT/UPDATE/DELETE on match tables is revoked from
  `authenticated`.
- **Reads open to all authenticated users** via RLS SELECT policies; realtime via
  `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.
- **Client realtime:** one Supabase channel subscribed to the match's tables with
  a debounced refetch (copy the `refreshSoon` pattern in `Auction.jsx:186-209`).

## Database Migrations

Create new files under `supabase/migrations/` (do not edit existing ones). Follow
existing conventions: `BEGIN;/COMMIT;`, RLS enabled, `authenticated` gets SELECT
only, `service_role` gets ALL, realtime added, `updated_at` trigger reuse.

### Migration A — `create_match_core.sql`
- `matches` (generic shell):
  - `id UUID PK`, `sport TEXT NOT NULL` (CHECK in the sports list; `'Cricket'` first),
    `franchise_a_id`/`franchise_b_id UUID REFERENCES franchises`,
    `status TEXT` CHECK `('scheduled','live','innings_break','completed','abandoned')`
    default `'scheduled'`, `scheduled_at TIMESTAMPTZ`, `venue TEXT`,
    `assigned_scorer_id UUID REFERENCES auth.users`, `result_summary TEXT`,
    `winner_franchise_id UUID`, `created_by UUID`, timestamps.
  - CHECK `franchise_a_id <> franchise_b_id`.
- `match_players` (per-match XI snapshot):
  - `id UUID PK`, `match_id UUID REFERENCES matches ON DELETE CASCADE`,
    `franchise_id UUID`, `registration_id UUID NULL REFERENCES player_registrations`,
    `full_name TEXT NOT NULL`, `batting_order SMALLINT`,
    `is_playing BOOLEAN default TRUE`, `role TEXT NULL` (e.g. Wicketkeeper).
  - `registration_id` nullable so a scorer can add an ad-hoc name; UNIQUE
    `(match_id, registration_id)` where not null.
- Helper `public.is_match_scorer(p_match_id UUID) RETURNS BOOLEAN` (SECURITY
  DEFINER, STABLE) — true if `auth.uid()` is admin OR the match's
  `assigned_scorer_id`. Model on `is_auction_admin()`.
- RLS: authenticated SELECT on both tables; admins (`is_auction_admin`) may
  INSERT/UPDATE `matches` and `match_players`. Revoke anon.
- Realtime: add `matches`, `match_players`.

### Migration B — `create_cricket_tables.sql`
- `cricket_innings`:
  - `id UUID PK`, `match_id UUID REFERENCES matches ON DELETE CASCADE`,
    `innings_number SMALLINT` CHECK `(1,2)`,
    `batting_franchise_id`/`bowling_franchise_id UUID`,
    `total_runs INT default 0`, `wickets INT default 0`,
    `legal_balls INT default 0` (overs derived: `legal_balls/6` + `%6`),
    `extras_wide INT`, `extras_noball INT`, `extras_bye INT`, `extras_legbye INT`,
    `target INT NULL` (set for innings 2), `is_closed BOOLEAN default FALSE`,
    `striker_id`/`non_striker_id`/`current_bowler_id UUID REFERENCES match_players`.
  - UNIQUE `(match_id, innings_number)`.
- `cricket_deliveries` (the event log):
  - `id UUID PK`, `innings_id UUID REFERENCES cricket_innings ON DELETE CASCADE`,
    `over_number INT`, `ball_in_over INT`, `legal_ball_seq INT` (nullable for
    extras that don't count as a legal ball), `global_seq INT` (monotonic per
    innings for reliable Undo ordering),
    `striker_id`/`non_striker_id`/`bowler_id UUID`,
    `runs_batter INT default 0`, `runs_extra INT default 0`,
    `extra_type TEXT NULL` CHECK `('wide','noball','bye','legbye')`,
    `is_wicket BOOLEAN default FALSE`, `dismissal_type TEXT NULL`
    (`bowled,caught,lbw,run_out,stumped,hit_wicket,retired`),
    `out_player_id UUID NULL`, `fielder_id UUID NULL`,
    `wagon_angle SMALLINT NULL`, `wagon_distance SMALLINT NULL` (0–100),
    `pitch_x SMALLINT NULL`, `pitch_y SMALLINT NULL` (grid coords for pitch map),
    `commentary TEXT`, `created_at TIMESTAMPTZ`.
- Indexes on `innings_id`, `(innings_id, global_seq)`.
- RLS: authenticated SELECT; no direct writes (RPCs only). Revoke anon.
- Realtime: add `cricket_innings`, `cricket_deliveries`.

### Migration C — `cricket_scoring_engine.sql` (RPCs)
All `SECURITY DEFINER`, `SET search_path = public`, guard with
`is_match_scorer(match_id)`, use `FOR UPDATE` locks. All aggregate updates happen
inside the same transaction as the delivery insert.

- `cricket_setup_match(p_match_id, p_overs, p_players_per_side, p_players JSONB)`
  — writes `match_players`, sets format config on the match (store `overs`,
  `players_per_side`, `balls_per_over`, `wide_noball_penalty` on `matches` or a
  small `cricket_match_config` — put them on `matches` as columns to keep it
  simple; default overs = 10).
- `cricket_record_toss(p_match_id, p_toss_winner_franchise_id, p_decision)` —
  `'bat'|'bowl'`; derives batting/bowling sides, creates innings 1, sets status
  `'live'`.
- `cricket_set_openers(p_innings_id, p_striker_id, p_non_striker_id, p_bowler_id)`.
- `cricket_record_ball(p_innings_id, payload)` — the core. Validates state,
  computes `runs_batter`/`runs_extra`, whether the ball is legal (wide/no-ball →
  re-ball, no `legal_balls` increment), auto-rotates strike (odd runs; end of
  over swaps + requires new bowler), auto-generates `commentary`, appends the
  delivery, and updates innings aggregates. Rejects if over already complete and
  no new bowler set, or if bowler equals previous over's bowler.
- `cricket_record_wicket(...)` — variant/param of record_ball that requires
  `dismissal_type`, `out_player_id`, optional `fielder_id`; increments wickets;
  does NOT auto-pick the incoming batsman (the console sends it next via
  `cricket_set_new_batsman`).
- `cricket_set_new_batsman(p_innings_id, p_batsman_id)` — fills the vacated end.
- `cricket_set_new_bowler(p_innings_id, p_bowler_id)` — enforces no consecutive
  overs.
- `cricket_swap_strike(p_innings_id)` — manual override.
- `cricket_undo_last_ball(p_innings_id)` — deletes the row with the highest
  `global_seq` and fully reverses its aggregate effects (runs, wickets, balls,
  strike). Because everything is derived, the safest implementation recomputes
  innings aggregates from remaining deliveries after the delete.
- `cricket_close_innings(p_innings_id)` — guarded end (all out / overs done /
  chase achieved). Creates innings 2 with `target = innings1.total_runs + 1`,
  sets status `'innings_break'` then `'live'` on openers set.
- `cricket_complete_match(p_match_id)` — computes `result_summary`,
  `winner_franchise_id`, status `'completed'`.
- Grants: `EXECUTE` to `authenticated`; internal guard enforces scorer/admin.

## Frontend

### Routing (`src/App.jsx`)
Add inside the protected `GlobalLayout` block:
- `/matches` — replace placeholder list (see below).
- `/matches/:matchId` — viewer live scoreboard.
- `/scorer` — scorer's match list (their assigned + all if admin).
- `/scorer/:matchId` — scorer console (register in `FULLSCREEN_ROUTES` in
  `GlobalLayout.jsx:7`, like `/auction`).

Guard scorer routes with a small wrapper using `canScoreMatch` from
`useAuth()` (already exists, `AuthContext.jsx:234`). Add a "Scorer" nav entry in
`Navbar.jsx`/`BottomNav.jsx` shown only when `canScoreMatch`.

### Data layer
`src/lib/cricket.js` — thin wrappers over `supabase.rpc(...)` for each RPC plus
fetchers (`fetchMatch`, `fetchInnings`, `fetchDeliveries`, `fetchMatchPlayers`).
`src/hooks/useCricketMatch.js` — loads a match + innings + deliveries and
subscribes to a realtime channel with a debounced refetch (copy
`Auction.jsx:186-209`). Returns derived scorecard via a pure selector module.

### Derivation (pure, tested) — `src/lib/cricketDerive.js`
From deliveries compute: batting card (R/B/4s/6s/SR, out description), bowling
card (O/M/R/W/econ), extras breakdown, fall of wickets, partnerships, current
over balls, CRR/RRR, projected score, this-over/last-wkt, Manhattan (runs/over),
worm (cumulative), wagon points, pitch points, and the **win% heuristic**
(constants exported from one object). Keeping this pure makes it unit-testable
and reused by both viewer and console.

### Viewer scoreboard — `src/pages/MatchLive.jsx`
CREX-style tabs (Framer Motion, glass styling to match the app):
- **Live:** scoreline, striker/non-striker, bowler, this over, recent balls,
  CRR/RRR, projected, last wicket, partnership, win% bar.
- **Scorecard:** full batting + bowling cards, extras, FoW, yet-to-bat.
- **Commentary:** reverse ball-by-ball list.
- **Overs:** over-by-over summary.
- **Graphs:** Manhattan/worm + partnership (Chart.js or lightweight SVG — no
  chart lib currently in deps; prefer small custom SVG to avoid new dependency,
  or add one deliberately).
- **Wagon/Pitch:** wagon wheel (SVG ground + plotted shots) and pitch map (SVG
  grid heat).
- **Squads / Info:** XIs, toss, venue, result.

### Scorer console — `src/pages/ScorerConsole.jsx` (fullscreen)
Guided flow: setup XI → toss → openers → live pad. Live pad: run buttons
(0,1,2,3,4,6), extras (Wide/No-ball/Bye/Leg-bye), Wicket, Undo, Swap strike.
Optional post-ball overlay for wagon direction + pitch zone. Forced modals for
new batsman (with dismissal type + fielder), new bowler (blocks consecutive
over). Start-2nd-innings and Complete-match buttons appear when guarded
conditions are met. Every action calls an RPC and relies on realtime refetch;
disable buttons while a call is in flight (mirror `Auction.jsx`).

### Match list — `src/pages/Matches.jsx`
Replace the placeholder with a sport-aware list (Cricket first). Cards show
franchises (reuse `FranchiseEmblem`), status badge (Live/Upcoming/Result), and
link to `/matches/:id`. Admins get a "Create match" affordance (basic form:
sport, two franchises, overs default 10, schedule, assign scorer).

## Files

New:
- `supabase/migrations/create_match_core.sql`
- `supabase/migrations/create_cricket_tables.sql`
- `supabase/migrations/cricket_scoring_engine.sql`
- `src/lib/cricket.js`, `src/lib/cricketDerive.js`
- `src/hooks/useCricketMatch.js`
- `src/pages/MatchLive.jsx`, `src/pages/ScorerConsole.jsx`
- `src/components/cricket/*` (ScoreHeader, BattingCard, BowlingCard, OverStrip,
  Commentary, WagonWheel, PitchMap, RunRateGraph, WinProbBar, ScorePad,
  SelectPlayerModal, MatchInfo)

Edited:
- `src/App.jsx` (routes), `src/pages/Matches.jsx` (list + create),
  `src/components/layout/GlobalLayout.jsx` (add scorer route to
  `FULLSCREEN_ROUTES`), `Navbar.jsx` + `BottomNav.jsx` (Scorer link).

## Failure Modes & Guards
- Concurrent taps: row locks in RPCs (proven by auction engine).
- Wrong scorer: `is_match_scorer` guard rejects with 42501.
- Illegal state (ball after over complete, consecutive bowler, wicket without
  incoming batsman): RPC raises; console keeps the pad disabled until resolved.
- Undo correctness: recompute aggregates from remaining deliveries after delete.
- Missing/incomplete squad: `match_players` editable; ad-hoc names allowed
  (`registration_id` nullable).

## Validation
- `npm run build` must pass (Vite). No test runner exists; if adding unit tests
  for `cricketDerive.js`, set up Vitest (standard for Vite) — otherwise verify
  derivations manually against a scripted sample innings.
- Manual E2E: create match → assign scorer → toss → score a full 10-over innings
  incl. wides/no-balls/wickets → start 2nd innings → complete; confirm the
  viewer scoreboard, scorecard, commentary, graphs, wagon wheel, pitch map, and
  win% all update live in a second browser session.
- Verify anon cannot read match tables; verify a non-assigned scorer is blocked.

## Out of Scope (this phase)
- Sports other than cricket (foundation is laid; detail tables come later).
- Leaderboard/points auto-integration from results (result is stored; wiring to
  `sportPoints` is a follow-up).
- DLS/rain rules, super overs, multi-innings/Test formats.
- Public (unauthenticated) viewing.

## Open Follow-ups (non-blocking)
- Decide SVG-only graphs vs adding a chart dependency (plan assumes SVG to avoid
  new deps).
- Confirm how a franchise's "cricket squad" is resolved for XI pre-fill: from
  `auction_players` sold to the franchise filtered to cricket in
  `player_registrations.sports`. Implementer should confirm auction data is
  populated; fall back to manual XI entry when empty.
