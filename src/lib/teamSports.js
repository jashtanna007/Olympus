// ─── Team-sport data layer (all non-cricket sports) ───
// Thin wrappers over the scoring RPCs. Like the cricket module, mutations never
// hit tables directly — everything flows through SECURITY DEFINER functions
// guarded by is_match_scorer().

import { supabase } from "./supabase.js";

function rpc(fn, args) {
  return supabase.rpc(fn, args).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });
}

const TABLE_BY_SPORT = {
  Football: "football_events",
  Volleyball: "volleyball_points",
  Basketball: "basketball_points",
};

// Sports that log into the generic match_sport_events table.
const GENERIC_EVENT_SPORTS = new Set([
  "Badminton",
  "Table Tennis",
  "Chess",
  "Carrom",
  "Kabaddi",
  "Relay",
  "Arm Wrestling",
]);

const GENERIC_TABLE = "match_sport_events";

export function tableForSport(sport) {
  return TABLE_BY_SPORT[sport] || (GENERIC_EVENT_SPORTS.has(sport) ? GENERIC_TABLE : null);
}

// Realtime tables to subscribe to for a sport (legacy table + generic table).
export function tablesForSport(sport) {
  const out = [];
  if (TABLE_BY_SPORT[sport]) out.push(TABLE_BY_SPORT[sport]);
  if (GENERIC_EVENT_SPORTS.has(sport) || sport === "Basketball") out.push(GENERIC_TABLE);
  return out;
}

export async function fetchSportEvents(matchId, sport) {
  const tables = tablesForSport(sport);
  if (tables.length === 0) return [];
  const results = await Promise.all(
    tables.map((t) =>
      supabase.from(t).select("*").eq("match_id", matchId).order("created_at"),
    ),
  );
  const merged = [];
  results.forEach(({ data, error }, i) => {
    if (error) {
      console.warn(`fetchSportEvents: ${tables[i]} failed`, error.message);
      return;
    }
    merged.push(...(data || []));
  });
  merged.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return merged;
}

/* ══════════ Football ══════════ */
export const footballRecordEvent = (matchId, { type, teamFranchiseId, minute = 0, playerName = null, assistName = null }) =>
  rpc("football_record_event", {
    p_match_id: matchId,
    p_type: type,
    p_team_franchise_id: teamFranchiseId,
    p_minute: minute,
    p_player_name: playerName,
    p_assist_name: assistName,
  });

export const footballUndo = (matchId) => rpc("football_undo_last_event", { p_match_id: matchId });

/* ══════════ Volleyball ══════════ */
export const volleyballRecordPoint = (matchId, teamFranchiseId, type = "rally") =>
  rpc("volleyball_record_point", {
    p_match_id: matchId,
    p_scoring_team_franchise_id: teamFranchiseId,
    p_type: type,
  });

export const volleyballUndo = (matchId) => rpc("volleyball_undo_last_point", { p_match_id: matchId });

/* ══════════ Basketball ══════════ */
export const basketballRecordPoint = (matchId, { teamFranchiseId, points, playerName = null }) =>
  rpc("basketball_record_point", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_points: points,
    p_player_name: playerName,
  });

export const basketballUndo = (matchId) => rpc("basketball_undo_last_point", { p_match_id: matchId });

// Team fouls persist in the generic event table (kind='foul', period=quarter).
export const basketballRecordFoul = (matchId, teamFranchiseId, quarter, playerName = null) =>
  rpc("sport_event_record", {
    p_match_id: matchId,
    p_period: quarter,
    p_kind: "foul",
    p_team_franchise_id: teamFranchiseId,
    p_value: null,
    p_label: playerName ? `Foul — ${playerName}` : "Team foul",
    p_meta: {},
  });

/* ══════════ Shared ══════════ */

/**
 * Determine the penalty-shootout winner given the sequence of shots.
 * Covers both the standard 5-kick phase and sudden-death.
 *
 * Rules (FIFA/IFAB):
 *  - Phase 1: 5 kicks each, alternating A/B. Mathematical elimination applies.
 *  - Phase 2 (sudden death): 1 kick each alternating until one leads after equal kicks.
 *  - Player rotation: in sudden death, all eligible players must kick once before repeating.
 *    We don't enforce eligibility here — the scorer UI handles the order.
 *
 * @param {{teamId:string,scored:boolean}[]} shots  — ordered sequence of all kicks
 * @param {string} aId  franchise_a_id
 * @param {string} bId  franchise_b_id
 * @returns {string|null}  winning franchise id, or null if not yet decided
 */
export function checkPenaltyWinner(shots, aId, bId) {
  const aShots = shots.filter((s) => s.teamId === aId);
  const bShots = shots.filter((s) => s.teamId === bId);
  const aG = aShots.filter((s) => s.scored).length;
  const bG = bShots.filter((s) => s.scored).length;
  const aT = aShots.length;
  const bT = bShots.length;

  if (aT === 0 && bT === 0) return null;

  // ── Phase 1: first 5 kicks ──
  if (aT < 5 || bT < 5) {
    const aMax = 5 - aT; // kicks A still has
    const bMax = 5 - bT; // kicks B still has
    // A has already won (B can't catch up even if they score all remaining)
    if (aG > bG + bMax) return aId;
    // B has already won
    if (bG > aG + aMax) return bId;
    // Both done with 5 kicks
    if (aT >= 5 && bT >= 5 && aG !== bG) return aG > bG ? aId : bId;
    return null;
  }

  // Both completed five kicks: a lead decides the initial phase.
  if (aT === 5 && bT === 5 && aG !== bG) return aG > bG ? aId : bId;

  // ── Phase 2: sudden death ──
  // After equal kicks, whichever team leads wins.
  if (aT === bT && aG !== bG) return aG > bG ? aId : bId;
  return null;
}

export const setTeamSportPeriod = (matchId, period) =>
  rpc("team_sport_set_period", { p_match_id: matchId, p_period: period });

export const completeTeamSportMatch = (matchId) =>
  rpc("team_sport_complete_match", { p_match_id: matchId });

/* ══════════ Squad setup (all non-cricket sports) ══════════ */
export const teamSportSetupMatch = (matchId, playersA, playersB) =>
  rpc("team_sport_setup_match", {
    p_match_id: matchId,
    p_players_a: JSON.stringify(playersA),
    p_players_b: JSON.stringify(playersB),
  });

/* ══════════ Rally sports (Badminton / Table Tennis) ══════════ */
export const rallyRecordPoint = (matchId, teamFranchiseId, kind = "point") =>
  rpc("rally_record_point", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_kind: kind,
  });

export const rallyCompleteMatch = (matchId) =>
  rpc("rally_complete_match", { p_match_id: matchId });

/* ══════════ Kabaddi ══════════ */
export const kabaddiRecordEvent = (matchId, teamFranchiseId, kind) =>
  rpc("kabaddi_record_event", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_kind: kind,
  });

/* ══════════ Chess ══════════ */
export const chessRecordResult = (matchId, result, reason = null) =>
  rpc("chess_record_result", {
    p_match_id: matchId,
    p_result: result,
    p_reason: reason,
  });

/* ══════════ Carrom ══════════ */
export const carromRecordEvent = (matchId, teamFranchiseId, kind, player = null) =>
  rpc("carrom_record_event", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_kind: kind,
    p_player: player,
  });

export const carromCompleteMatch = (matchId) =>
  rpc("carrom_complete_match", { p_match_id: matchId });

/* ══════════ Relay ══════════ */
export const relayRecordTime = (matchId, teamFranchiseId, seconds, legs = []) =>
  rpc("relay_record_time", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_seconds: seconds,
    p_legs: JSON.stringify(legs),
  });

/* ══════════ Arm Wrestling ══════════ */
export const armWrestlingRecordPull = (matchId, teamFranchiseId, kind = "pull_win", meta = {}) =>
  rpc("armwrestling_record_pull", {
    p_match_id: matchId,
    p_team_franchise_id: teamFranchiseId,
    p_kind: kind,
    p_meta: JSON.stringify(meta),
  });

/* ══════════ Generic events / undo ══════════ */
export const sportEventRecord = (matchId, { period = 1, kind, teamFranchiseId = null, value = null, label = null, meta = {} }) =>
  rpc("sport_event_record", {
    p_match_id: matchId,
    p_period: period,
    p_kind: kind,
    p_team_franchise_id: teamFranchiseId,
    p_value: value,
    p_label: label,
    p_meta: JSON.stringify(meta),
  });

export const sportEventUndo = (matchId) =>
  rpc("sport_event_undo_last", { p_match_id: matchId });

/* ══════════ Derivations (pure) ══════════ */
// events are raw rows sorted by created_at.

// Legacy shape: shootout goals were stored as type='goal' with minute >= 121.
// New shape: type='pen_goal'/'pen_miss'. Support both.
const PENALTY_MINUTE = 121;

const isPenEvent = (e) =>
  e.type === "pen_goal" || e.type === "pen_miss" ||
  (e.type === "goal" && e.minute >= PENALTY_MINUTE);
const isPenScored = (e) =>
  e.type === "pen_goal" || (e.type === "goal" && e.minute >= PENALTY_MINUTE);
const isRegularEvent = (e) =>
  e.type !== "pen_goal" && e.type !== "pen_miss" &&
  !(e.type === "goal" && e.minute >= PENALTY_MINUTE);

export function deriveFootball(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const evts = events.filter((e) => e.type !== undefined); // exclude generic rows

  const regularGoalsFor = (fid) =>
    evts.filter(
      (e) =>
        isRegularEvent(e) &&
        ((e.type === "goal" && e.team_franchise_id === fid) ||
          (e.type === "own_goal" && e.team_franchise_id !== fid)),
    ).length;

  const penEvents = evts.filter(isPenEvent);
  const penGoalsFor = (fid) =>
    penEvents.filter((e) => isPenScored(e) && e.team_franchise_id === fid).length;
  const penTotal = (fid) => penEvents.filter((e) => e.team_franchise_id === fid).length;

  // Build ordered shots array for penalty winner checking
  const penShots = penEvents.map((e) => ({
    teamId: e.team_franchise_id,
    scored: isPenScored(e),
  }));

  // Extra time events (stored with minute 91-120)
  const etEvents = evts.filter(
    (e) => isRegularEvent(e) && e.type === "goal" && e.minute >= 91 && e.minute <= 120
  );

  return {
    scoreA: aId ? regularGoalsFor(aId) : 0,
    scoreB: aId ? regularGoalsFor(bId) : 0,
    penScoreA: aId ? penGoalsFor(aId) : 0,
    penScoreB: bId ? penGoalsFor(bId) : 0,
    penTotalA: aId ? penTotal(aId) : 0,
    penTotalB: bId ? penTotal(bId) : 0,
    hasPenalties: penEvents.length > 0,
    penShots,
    hasExtraTime: etEvents.length > 0,
    timeline: evts.slice().reverse(), // newest first
  };
}

export function deriveVolleyball(match, points) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const pointsPerSet = cfg.points_per_set ?? match?.overs_per_innings ?? 25;
  const numSets = cfg.sets ?? match?.players_per_side ?? 3;
  const finalSetPoints = cfg.final_set_points ?? 15;

  const setNumbers = [...new Set(points.map((p) => p.set_number))].sort((x, y) => x - y);
  const setTarget = (n) => (n >= numSets ? finalSetPoints : pointsPerSet);
  const sets = setNumbers.map((n) => {
    const rows = points.filter((p) => p.set_number === n);
    const a = rows.filter((p) => p.scoring_team_franchise_id === aId).length;
    const b = rows.filter((p) => p.scoring_team_franchise_id === bId).length;
    const finished = Math.max(a, b) >= setTarget(n) && Math.abs(a - b) >= 2;
    return { set: n, a, b, target: setTarget(n), finished, winner: finished ? (a > b ? aId : bId) : null };
  });
  const currentSet = match?.current_period || setNumbers[setNumbers.length - 1] || 1;
  const current = sets.find((s) => s.set === currentSet) || { set: currentSet, a: 0, b: 0, target: setTarget(currentSet), finished: false };
  const setsWonA = sets.filter((s) => s.finished && s.winner === aId).length;
  const setsWonB = sets.filter((s) => s.finished && s.winner === bId).length;

  const isDeuce =
    !current.finished &&
    current.a >= current.target - 1 &&
    current.b >= current.target - 1;

  return { sets, current, setsWonA, setsWonB, pointsPerSet, finalSetPoints, numSets, isDeuce };
}

export function deriveBasketball(match, basketRows, genericRows = []) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const numQuarters = cfg.quarters ?? match?.players_per_side ?? 4;

  const sumFor = (fid, quarter) =>
    basketRows
      .filter((r) => r.team_franchise_id === fid && (quarter == null || r.quarter === quarter))
      .reduce((s, r) => s + r.points, 0);
  const quarterNums = [...new Set(basketRows.map((r) => r.quarter))].sort((x, y) => x - y);
  const quarters = quarterNums.map((q) => ({
    quarter: q,
    a: sumFor(aId, q),
    b: sumFor(bId, q),
  }));

  const fouls = genericRows.filter((r) => r.kind === "foul");
  const foulCount = (fid, q) =>
    fouls.filter((r) => r.team_franchise_id === fid && r.period === q).length;
  const foulsByQuarter = {};
  for (const q of new Set(fouls.map((f) => f.period))) {
    foulsByQuarter[q] = { a: foulCount(aId, q), b: foulCount(bId, q) };
  }

  const currentQuarter = match?.current_period || 1;
  const scoreA = sumFor(aId);
  const scoreB = sumFor(bId);
  const inOvertime = currentQuarter > numQuarters;
  const regulationComplete = currentQuarter >= numQuarters;

  return {
    scoreA,
    scoreB,
    quarters,
    foulsByQuarter,
    foulsA: fouls.filter((r) => r.team_franchise_id === aId).length,
    foulsB: fouls.filter((r) => r.team_franchise_id === bId).length,
    currentQuarter,
    numQuarters,
    totalQuarters: Math.max(numQuarters, ...quarterNums, currentQuarter),
    inOvertime,
    // True when regulation is done and scores are tied → must go to OT
    needsOvertime: scoreA === scoreB && regulationComplete && !inOvertime,
    regulationComplete,
    recent: basketRows.slice(-8).reverse(),
  };
}

/* ══════════ Generic-sport helpers ══════════ */
const gen = (events) => events.filter((e) => e.kind !== undefined);

/**
 * Shared rally-sport derive (Badminton, Table Tennis).
 * Win a game: reach target with 2-pt lead, or hit hard cap (badminton 30).
 */
export function deriveRallySport(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const isBad = match?.sport === "Badminton";
  const target = cfg.points_per_game ?? (isBad ? 21 : 11);
  const cap = cfg.deuce_cap ?? (isBad ? 30 : null); // TT: no cap
  const numGames = cfg.games ?? 3;

  const rows = gen(events).filter((e) => e.kind === "point");
  const gameNums = [...new Set(rows.map((r) => r.period))].sort((x, y) => x - y);
  const isFinished = (a, b) =>
    (Math.max(a, b) >= target && Math.abs(a - b) >= 2) || (cap != null && Math.max(a, b) >= cap);
  const games = gameNums.map((n) => {
    const rs = rows.filter((r) => r.period === n);
    const a = rs.filter((r) => r.team_franchise_id === aId).length;
    const b = rs.filter((r) => r.team_franchise_id === bId).length;
    const finished = isFinished(a, b);
    return { game: n, a, b, finished, winner: finished ? (a > b ? aId : bId) : null };
  });
  const currentGame = match?.current_period || gameNums[gameNums.length - 1] || 1;
  const current = games.find((g) => g.game === currentGame) || { game: currentGame, a: 0, b: 0, finished: false };
  const gamesWonA = games.filter((g) => g.finished && g.winner === aId).length;
  const gamesWonB = games.filter((g) => g.finished && g.winner === bId).length;
  const gamesNeeded = Math.floor(numGames / 2) + 1;
  const isDeuce = !current.finished && current.a >= target - 1 && current.b >= target - 1;
  const atCap = cap != null && !current.finished && (current.a >= cap - 1 || current.b >= cap - 1);
  const serveRow = gen(events).filter((e) => e.kind === "serve").slice(-1)[0];

  return {
    sport: match?.sport,
    games, current, gamesWonA, gamesWonB, gamesNeeded,
    target, cap, numGames, isDeuce, atCap,
    serving: serveRow?.team_franchise_id || null,
    isMatchPoint: !current.finished &&
      (gamesWonA === gamesNeeded - 1 || gamesWonB === gamesNeeded - 1) &&
      isFinishedPreview(current),
    timeline: gen(events).slice().reverse(),
  };

  function isFinishedPreview(c) {
    const leadA = c.a + 1, leadB = c.b + 1;
    return (isFinished(leadA, c.b) && gamesWonA === gamesNeeded - 1) ||
           (isFinished(c.a, leadB) && gamesWonB === gamesNeeded - 1);
  }
}

export function deriveBadminton(match, events) { return deriveRallySport(match, events); }
export function deriveTableTennis(match, events) { return deriveRallySport(match, events); }

export function deriveKabaddi(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const halves = cfg.halves ?? 2;
  const halfMinutes = cfg.half_minutes ?? 20; // standard kabaddi: 2×20min
  const alloutBonus = cfg.allout_bonus ?? 2;
  const rows = gen(events);

  const scoreFor = (fid, { extraTimeOnly = false, tiebreakOnly = false } = {}) =>
    rows
      .filter((r) => {
        if (r.team_franchise_id !== fid) return false;
        if (tiebreakOnly) return r.kind === "tiebreak" || r.kind === "golden_raid";
        if (extraTimeOnly) {
          return r.period > halves && r.kind !== "tiebreak" && r.kind !== "golden_raid";
        }
        return r.period <= halves && r.kind !== "tiebreak" && r.kind !== "golden_raid";
      })
      .reduce((s, r) => s + Number(r.value || 0), 0);

  const allouts = (fid) => rows.filter((r) => r.kind === "allout" && r.team_franchise_id === fid).length;
  const currentHalf = match?.current_period || 1;

  // Regulation score (halves 1..halves)
  const regScoreA = scoreFor(aId);
  const regScoreB = scoreFor(bId);

  // Extra time score (halves halves+1 and above)
  const etScoreA = scoreFor(aId, { extraTimeOnly: true });
  const etScoreB = scoreFor(bId, { extraTimeOnly: true });

  // Golden raid (tiebreak) score
  const goldenA = scoreFor(aId, { tiebreakOnly: true });
  const goldenB = scoreFor(bId, { tiebreakOnly: true });

  const inExtraTime = currentHalf > halves;
  const hasGoldenRaid = rows.some((r) => r.kind === "golden_raid" || r.kind === "golden_raid_start");

  // After regulation: tied → needs extra time
  // After extra time: still tied → needs golden raid
  const needsExtraTime = currentHalf === halves && regScoreA === regScoreB;
  const needsGoldenRaid = currentHalf >= halves + 2 && (regScoreA + etScoreA === regScoreB + etScoreB);

  return {
    scoreA: regScoreA,
    scoreB: regScoreB,
    etScoreA,
    etScoreB,
    goldenA,
    goldenB,
    totalA: regScoreA + etScoreA + goldenA,
    totalB: regScoreB + etScoreB + goldenB,
    alloutsA: allouts(aId),
    alloutsB: allouts(bId),
    currentHalf,
    halves,
    halfMinutes,
    alloutBonus,
    inExtraTime,
    hasGoldenRaid,
    needsExtraTime,
    needsGoldenRaid,
    timeline: rows.slice().reverse(),
  };
}

export function deriveChess(match, events) {
  const row = gen(events).find((e) => e.kind === "result");
  const result = row
    ? {
        ...row,
        outcome: row.team_franchise_id === match?.franchise_a_id
          ? "a"
          : row.team_franchise_id === match?.franchise_b_id
            ? "b"
            : "draw",
      }
    : null;
  return {
    result: result || null,
    timeline: gen(events).slice().reverse(),
  };
}

export function deriveCarrom(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const numBoards = cfg.boards ?? 1;
  const queenPoints = cfg.queen_points ?? 3;
  const rows = gen(events);

  const boardNums = [...new Set(rows.map((r) => r.period))].sort((x, y) => x - y);
  const boards = boardNums.map((n) => {
    const rs = rows.filter((r) => r.period === n);
    const pointsFor = (fid) =>
      rs.filter((r) => r.team_franchise_id === fid).reduce((s, r) => s + Number(r.value || 0), 0);
    const winRow = rs.find((r) => r.kind === "board_win");
    return {
      board: n,
      a: pointsFor(aId),
      b: pointsFor(bId),
      winner: winRow?.team_franchise_id || null,
      queenBy: rs.find((r) => r.kind === "queen")?.team_franchise_id || null,
    };
  });

  const currentBoard = match?.current_period || 1;
  const pointsFor = (fid) =>
    rows.filter((r) => r.team_franchise_id === fid).reduce((s, r) => s + Number(r.value || 0), 0);

  return {
    boards,
    currentBoard,
    numBoards,
    queenPoints,
    boardsWonA: boards.filter((bd) => bd.winner === aId).length,
    boardsWonB: boards.filter((bd) => bd.winner === bId).length,
    pointsA: pointsFor(aId),
    pointsB: pointsFor(bId),
    timeline: rows.slice().reverse(),
  };
}

export function deriveRelay(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const legs = cfg.legs ?? 4;
  const rows = gen(events);

  const timeRow = (fid) => rows.find((r) => r.kind === "result_time" && r.team_franchise_id === fid);
  const tA = timeRow(aId);
  const tB = timeRow(bId);
  const both = Boolean(tA && tB);

  return {
    timeA: tA ? Number(tA.value) : null,
    timeB: tB ? Number(tB.value) : null,
    legsA: tA?.meta?.legs || [],
    legsB: tB?.meta?.legs || [],
    legs,
    recorded: [tA, tB].filter(Boolean).length,
    complete: both,
    deadHeat: both && Number(tA.value) === Number(tB.value),
    leaderId: both
      ? (Number(tA.value) < Number(tB.value) ? aId : Number(tB.value) < Number(tA.value) ? bId : null)
      : (tA && !tB ? aId : tB && !tA ? bId : null),
    timeline: rows.slice().reverse(),
  };
}

export function deriveArmWrestling(match, events) {
  const aId = match?.franchise_a_id;
  const bId = match?.franchise_b_id;
  const cfg = match?.config || {};
  const pullsTarget = cfg.pulls ?? 3;
  const needed = Math.floor(pullsTarget / 2) + 1;
  const rows = gen(events);

  const wins = (fid) => rows.filter((r) => r.kind === "pull_win" && r.team_franchise_id === fid).length;
  const fouls = (fid) => rows.filter((r) => r.kind === "foul" && r.team_franchise_id === fid).length;

  return {
    winsA: wins(aId),
    winsB: wins(bId),
    foulsA: fouls(aId),
    foulsB: fouls(bId),
    pullsTarget,
    needed,
    decided: Math.max(wins(aId), wins(bId)) >= needed,
    timeline: rows.slice().reverse(),
  };
}

/* ══════════ Derive dispatcher ══════════ */
export function deriveSport(match, events) {
  if (!match) return null;
  switch (match.sport) {
    case "Football": return deriveFootball(match, events);
    case "Volleyball": return deriveVolleyball(match, events.filter((e) => e.set_number !== undefined));
    case "Basketball":
      return deriveBasketball(
        match,
        events.filter((e) => e.points !== undefined),
        events.filter((e) => e.kind !== undefined),
      );
    case "Badminton": return deriveBadminton(match, events);
    case "Table Tennis": return deriveTableTennis(match, events);
    case "Kabaddi": return deriveKabaddi(match, events);
    case "Chess": return deriveChess(match, events);
    case "Carrom": return deriveCarrom(match, events);
    case "Relay": return deriveRelay(match, events);
    case "Arm Wrestling": return deriveArmWrestling(match, events);
    default: return null;
  }
}

/** Human-readable label for a generic match_sport_events row. */
export function genericEventLabel(e) {
  if (e.label) return e.label;
  const map = {
    point: "Point", serve: "Serve", result: "Result", queen: "Queen", foul: "Foul",
    board_win: "Board won", raid: "Raid", tackle: "Tackle", allout: "All Out",
    tiebreak: "Tiebreak raid", golden_raid: "Golden Raid", result_time: "Finish time",
    pull_win: "Pin", piece: "Pieces pocketed",
  };
  return map[e.kind] || e.kind;
}
