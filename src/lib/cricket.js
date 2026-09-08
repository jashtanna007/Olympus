// ─── Cricket data layer ───
// Thin wrappers over Supabase queries + scoring RPCs. All mutations flow
// through SECURITY DEFINER functions (see cricket_scoring_engine.sql); this
// module never writes match tables directly.

import { supabase } from "./supabase";
import { franchises as mockFranchises } from "../data/mockData";

/* ═══════════════════════ Franchise enrichment ═══════════════════════ */
// DB franchise rows lack the logo/color styling fields that FranchiseEmblem
// expects. Merge them from mockData by id/name/slug (same approach as Auction).
export function enrichFranchise(dbFranchise) {
  if (!dbFranchise) return null;
  const mock = mockFranchises.find(
    (m) =>
      m.id === dbFranchise.id ||
      m.name === dbFranchise.name ||
      m.short === dbFranchise.short_code,
  );
  return mock
    ? {
        ...dbFranchise,
        name: dbFranchise.name || mock.name,
        short: mock.short,
        logo: mock.logo,
        color: mock.color,
        secondaryColor: mock.secondaryColor,
        gradient: mock.gradient,
        logoFit: mock.logoFit,
        logoTransform: mock.logoTransform,
        logoObjectPosition: mock.logoObjectPosition,
        logoPadding: mock.logoPadding,
      }
    : {
        ...dbFranchise,
        short: dbFranchise.short_code,
        color: dbFranchise.primary_color,
        secondaryColor: dbFranchise.secondary_color,
      };
}

export async function fetchFranchises() {
  const { data, error } = await supabase
    .from("franchises")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data || []).map(enrichFranchise);
}

/* ═══════════════════════ Match fetchers ═══════════════════════ */
export async function fetchMatches(sport) {
  let query = supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (sport) query = query.eq("sport", sport);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchMatch(matchId) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMatchPlayers(matchId) {
  const { data, error } = await supabase
    .from("match_players")
    .select("*")
    .eq("match_id", matchId)
    .order("batting_order");
  if (error) throw error;
  return data || [];
}

export async function fetchInnings(matchId) {
  const { data, error } = await supabase
    .from("cricket_innings")
    .select("*")
    .eq("match_id", matchId)
    .order("innings_number");
  if (error) throw error;
  return data || [];
}

export async function fetchDeliveries(inningsIds) {
  if (!inningsIds || inningsIds.length === 0) return [];
  const { data, error } = await supabase
    .from("cricket_deliveries")
    .select("*")
    .in("innings_id", inningsIds)
    .order("global_seq");
  if (error) throw error;
  return data || [];
}

/* ═══════════════════════ Squad pre-fill (best effort) ═══════════════════════ */
// Fetch players from a franchise who are registered for the given sport.
// Sources: (1) auction_players sold/retained to this franchise, filtered by sport;
//          (2) fallback: all registrations whose franchise_id matches (if stored).
// Returns [] silently on any error — UI falls back to empty state.
export async function fetchFranchiseSquadForSport(franchiseId, sport) {
  try {
    const { data, error } = await supabase
      .from("auction_players")
      .select("registration_id, player_registrations(id, full_name, photo_url, sports, roll_number)")
      .eq("sold_to_franchise_id", franchiseId)
      .in("status", ["sold", "retained"]);
    if (error) throw error;

    return (data || [])
      .map((ap) => {
        const reg = Array.isArray(ap.player_registrations) ? ap.player_registrations[0] : ap.player_registrations;
        return reg;
      })
      .filter((reg) => {
        if (!reg) return false;
        const sports = Array.isArray(reg.sports) ? reg.sports : [];
        return sports.some((s) => (s?.name || s) === sport);
      })
      .map((reg) => {
        const sportEntry = (reg.sports || []).find((s) => (s?.name || s) === sport);
        return {
          registration_id: reg.id,
          full_name: reg.full_name,
          photo_url: reg.photo_url || null,
          roll_number: reg.roll_number || null,
          role: sportEntry?.position || null,
        };
      });
  } catch {
    return [];
  }
}

// ponytail: kept for backwards compat — callers in ScorerConsole use this name
export const fetchFranchiseCricketSquad = (id) => fetchFranchiseSquadForSport(id, "Cricket");

/* ═══════════════════════ Insert match players ═══════════════════════ */
// Called immediately after createMatch when admin pre-selects a squad.
// players = [{ registration_id, full_name, role }]
export async function insertMatchPlayers(matchId, franchiseId, players) {
  if (!players || players.length === 0) return;
  const rows = players.map((p, i) => ({
    match_id: matchId,
    franchise_id: franchiseId,
    registration_id: p.registration_id || null,
    full_name: p.full_name,
    batting_order: i,
    role: p.role || null,
  }));
  const { error } = await supabase.from("match_players").insert(rows);
  if (error) throw error;
}

/* ═══════════════════════ Admin: create match ═══════════════════════ */
export async function createMatch({
  sport = "Cricket",
  franchiseA,
  franchiseB,
  oversPerInnings = 10,
  playersPerSide = 11,
  venue = null,
  scheduledAt = null,
  assignedScorerId = null,
  config = {},
}) {
  const isCricket = sport === "Cricket";
  const safeOvers = isCricket ? Number(oversPerInnings) : 1;
  const safePlayers = Number(playersPerSide);
  if (!franchiseA || !franchiseB || franchiseA === franchiseB) {
    throw new Error("A match requires two different franchises.");
  }
  if (!Number.isInteger(safeOvers) || safeOvers < 1 || safeOvers > 90) {
    throw new Error("Overs must be a whole number between 1 and 90.");
  }
  if (!Number.isInteger(safePlayers) || safePlayers < 2 || safePlayers > 11) {
    throw new Error("Players per side must be a whole number between 2 and 11.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      sport,
      franchise_a_id: franchiseA,
      franchise_b_id: franchiseB,
      // These legacy cricket columns are constrained for every sport. The
      // actual non-cricket format remains authoritative in config.
      overs_per_innings: safeOvers,
      players_per_side: safePlayers,
      venue,
      scheduled_at: scheduledAt,
      assigned_scorer_id: assignedScorerId,
      config,
      created_by: userData?.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMatchScorer(matchId, assignedScorerId) {
  const { error } = await supabase
    .from("matches")
    .update({ assigned_scorer_id: assignedScorerId })
    .eq("id", matchId);
  if (error) throw error;
}

export async function deleteMatch(matchId) {
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);
  if (error) throw error;
  return true;
}

export async function listScorers() {
  const { data, error } = await supabase.rpc("list_match_scorers");
  if (error) throw error;
  return data || [];
}

/* ═══════════════════════ Scoring RPC wrappers ═══════════════════════ */
function rpc(fn, args) {
  return supabase.rpc(fn, args).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });
}

export const setupMatch = (matchId, playersA, playersB) =>
  rpc("cricket_setup_match", {
    p_match_id: matchId,
    p_players_a: playersA,
    p_players_b: playersB,
  });

export const recordToss = (matchId, tossWinnerFranchiseId, decision) =>
  rpc("cricket_record_toss", {
    p_match_id: matchId,
    p_toss_winner_franchise_id: tossWinnerFranchiseId,
    p_decision: decision,
  });

export const setOpeners = (inningsId, strikerId, nonStrikerId, bowlerId) =>
  rpc("cricket_set_openers", {
    p_innings_id: inningsId,
    p_striker_id: strikerId,
    p_non_striker_id: nonStrikerId,
    p_bowler_id: bowlerId,
  });

export const recordBall = (inningsId, opts = {}) =>
  rpc("cricket_record_ball", {
    p_innings_id: inningsId,
    p_ball_type: opts.ballType ?? "runs",
    p_runs_batter: opts.runsBatter ?? 0,
    p_runs_extra: opts.runsExtra ?? 0,
    p_wagon_angle: opts.wagonAngle ?? null,
    p_wagon_distance: opts.wagonDistance ?? null,
  });

export const recordWicket = (inningsId, opts = {}) =>
  rpc("cricket_record_wicket", {
    p_innings_id: inningsId,
    p_dismissal_type: opts.dismissalType,
    p_out_player_id: opts.outPlayerId,
    p_fielder_id: opts.fielderId ?? null,
    p_runs_batter: opts.runsBatter ?? 0,
    p_wagon_angle: opts.wagonAngle ?? null,
    p_wagon_distance: opts.wagonDistance ?? null,
  });

export const setNewBatsman = (inningsId, batsmanId, end = null) =>
  rpc("cricket_set_new_batsman", {
    p_innings_id: inningsId,
    p_batsman_id: batsmanId,
    p_end: end,
  });

export const setNewBowler = (inningsId, bowlerId) =>
  rpc("cricket_set_new_bowler", {
    p_innings_id: inningsId,
    p_bowler_id: bowlerId,
  });

export const swapStrike = (inningsId) =>
  rpc("cricket_swap_strike", { p_innings_id: inningsId });

export const undoLastBall = (inningsId) =>
  rpc("cricket_undo_last_ball", { p_innings_id: inningsId });

export const closeInnings = (inningsId) =>
  rpc("cricket_close_innings", { p_innings_id: inningsId });

export const completeMatch = (matchId) =>
  rpc("cricket_complete_match", { p_match_id: matchId });
