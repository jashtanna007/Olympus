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
// A franchise's cricket squad = auction players it won whose registration lists
// Cricket. Requires admin read access to registrations (auction_admin_policies).
// Returns [] silently when auction data isn't populated — the setup UI then
// falls back to manual entry.
export async function fetchFranchiseCricketSquad(franchiseId) {
  try {
    const { data, error } = await supabase
      .from("auction_players")
      .select("registration_id, registration:player_registrations(*)")
      .eq("sold_to_franchise_id", franchiseId)
      .in("status", ["sold", "retained"]);
    if (error) throw error;

    return (data || [])
      .map((ap) => {
        const regRaw = ap.registration || ap.player_registrations;
        const reg = Array.isArray(regRaw) ? regRaw[0] : regRaw;
        return reg;
      })
      .filter((reg) => {
        if (!reg) return false;
        const sports = Array.isArray(reg.sports) ? reg.sports : [];
        return sports.some((s) => (s?.name || s) === "Cricket");
      })
      .map((reg) => {
        const cricket = (reg.sports || []).find(
          (s) => (s?.name || s) === "Cricket",
        );
        return {
          registration_id: reg.id,
          full_name: reg.full_name,
          role: cricket?.position || null,
        };
      });
  } catch {
    return [];
  }
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
  const normalizedOvers = Number(oversPerInnings ?? 10);
  const normalizedPlayers = Number(playersPerSide ?? 11);

  if (
    !Number.isInteger(normalizedOvers) ||
    normalizedOvers < 1 ||
    normalizedOvers > 90
  ) {
    throw new Error(
      "Overs per innings must be a whole number between 1 and 90."
    );
  }

  if (
    !Number.isInteger(normalizedPlayers) ||
    normalizedPlayers < 2 ||
    normalizedPlayers > 11
  ) {
    throw new Error(
      "Players per side must be a whole number between 2 and 11."
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      sport,
      franchise_a_id: franchiseA,
      franchise_b_id: franchiseB,
      overs_per_innings: normalizedOvers,
      players_per_side: normalizedPlayers,
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
  rpc("cricket_record_wicket_v2", {
    p_innings_id: inningsId,
    p_dismissal_type: opts.dismissalType,
    p_out_player_id: opts.outPlayerId,
    p_ball_type: opts.ballType ?? "runs",
    p_runs_batter: opts.runsBatter ?? 0,
    p_runs_extra: opts.runsExtra ?? 0,
    p_fielder_id: opts.fielderId ?? null,
    p_vacant_end: opts.vacantEnd ?? null,
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
