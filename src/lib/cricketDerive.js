// ─── Cricket derivation engine (pure) ───
// Turns the event log (deliveries) + innings pointers + match_players into
// every stat the UI shows: scorecards, run rates, fall of wickets, partnerships,
// this-over, graphs (Manhattan/worm), wagon-wheel & pitch points, projected
// score, and a transparent win-probability heuristic. No side effects — fully
// unit-testable and shared by both the viewer and the scorer console.

/* ═══════════════════════ Win-probability constants ═══════════════════════ */
// Tunable in one place. The model is an honest estimate, not an ML prediction.
export const WIN_PROB_CONFIG = {
  parRunRate: 7.5, // baseline "par" scoring rate for a 1st-innings total
  scale1: 22, // logistic scale for 1st innings margin (runs)
  scaleChase: 16, // logistic scale for 2nd innings margin (runs)
  wicketDamping: 0.5, // how much low wickets dampen projected remaining runs
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const logistic = (x) => 1 / (1 + Math.exp(-x));

/* ═══════════════════════ Small helpers ═══════════════════════ */
export function oversFromBalls(balls, ballsPerOver = 6) {
  const o = Math.floor(balls / ballsPerOver);
  const b = balls % ballsPerOver;
  return `${o}.${b}`;
}

export function ballToken(d) {
  if (d.is_wicket) {
    if (d.ball_type === "wide") return `wd+W`;
    if (d.ball_type === "noball") return `nb+W`;
    return "W";
  }
  switch (d.ball_type) {
    case "wide":
      return d.runs_extra > 1 ? `${d.runs_extra}wd` : "wd";
    case "noball":
      return d.runs_batter > 0 ? `${d.runs_batter}nb` : "nb";
    case "bye":
      return `${d.runs_extra}b`;
    case "legbye":
      return `${d.runs_extra}lb`;
    default:
      return String(d.runs_batter);
  }
}

function dismissalText(d, nameOf) {
  const bowler = nameOf(d.bowler_id);
  const fielder = nameOf(d.fielder_id);
  switch (d.dismissal_type) {
    case "bowled":
      return `b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "caught":
      return `c ${fielder} b ${bowler}`;
    case "stumped":
      return `st ${fielder} b ${bowler}`;
    case "run_out":
      return `run out (${fielder})`;
    case "hit_wicket":
      return `hit wicket b ${bowler}`;
    case "retired":
      return "retired";
    default:
      return "out";
  }
}

// Runs charged to the bowler (excludes byes/leg-byes).
function bowlerRuns(d) {
  if (d.ball_type === "bye" || d.ball_type === "legbye") return 0;
  if (d.ball_type === "wide") return d.runs_extra;
  return d.runs_batter + (d.ball_type === "noball" ? d.runs_extra : 0);
}

const isLegal = (d) => d.ball_type !== "wide" && d.ball_type !== "noball";
const facedByBatter = (d) => d.ball_type !== "wide"; // wides aren't faced
const creditsBatterRuns = (d) => d.ball_type === "runs" || d.ball_type === "noball";
const bowlerWicket = (d) =>
  d.is_wicket &&
  ["bowled", "lbw", "caught", "stumped", "hit_wicket"].includes(d.dismissal_type);

/* ═══════════════════════ Per-innings derivation ═══════════════════════ */
export function deriveInnings(innings, deliveries, match, playerMap) {
  const bpo = match?.balls_per_over || 6;
  const totalOvers = match?.overs_per_innings || 10;
  const totalBalls = totalOvers * bpo;
  const playersPerSide = match?.players_per_side || 11;
  const nameOf = (id) => (id ? playerMap[id]?.full_name || "—" : "—");

  const balls = deliveries
    .filter((d) => d.innings_id === innings.id)
    .sort((a, b) => a.global_seq - b.global_seq);

  const legalBalls = innings.legal_balls;
  const runs = innings.total_runs;
  const wickets = innings.wickets;
  const ballsLeft = Math.max(0, totalBalls - legalBalls);
  const oversDone = legalBalls / bpo;
  const crr = oversDone > 0 ? runs / oversDone : 0;

  /* ── Batting card ── */
  const batters = new Map();
  const ensureBatter = (id, seq) => {
    if (!id) return null;
    if (!batters.has(id)) {
      batters.set(id, {
        id,
        name: nameOf(id),
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        outText: "not out",
        firstSeq: seq,
        order: playerMap[id]?.batting_order ?? 999,
      });
    }
    return batters.get(id);
  };
  // Seed current batsmen so they show even with 0 balls (use a high seq so the
  // real arrival order from deliveries wins where available).
  ensureBatter(innings.striker_id, Number.MAX_SAFE_INTEGER);
  ensureBatter(innings.non_striker_id, Number.MAX_SAFE_INTEGER);

  for (const d of balls) {
    const bat = ensureBatter(d.striker_id, d.global_seq);
    if (bat) {
      if (d.global_seq < bat.firstSeq) bat.firstSeq = d.global_seq;
      if (facedByBatter(d)) bat.balls += 1;
      if (creditsBatterRuns(d)) {
        bat.runs += d.runs_batter;
        if (d.runs_batter === 4) bat.fours += 1;
        if (d.runs_batter === 6) bat.sixes += 1;
      }
    }
    if (d.is_wicket && d.out_player_id) {
      const outBat = ensureBatter(d.out_player_id, d.global_seq);
      if (outBat) {
        outBat.out = true;
        outBat.outText = dismissalText(d, nameOf);
      }
    }
  }

  const battingCard = [...batters.values()]
    .sort((a, b) => a.order - b.order || a.firstSeq - b.firstSeq)
    .map((b) => ({
      ...b,
      sr: b.balls > 0 ? (b.runs / b.balls) * 100 : 0,
      onStrike: b.id === innings.striker_id,
      isNotOut: !b.out,
      isBatting: b.id === innings.striker_id || b.id === innings.non_striker_id,
    }));

  const yetToBat = Object.values(playerMap)
    .filter(
      (p) =>
        p.franchise_id === innings.batting_franchise_id && !batters.has(p.id),
    )
    .sort((a, b) => (a.batting_order || 0) - (b.batting_order || 0))
    .map((p) => ({ id: p.id, name: p.full_name }));

  /* ── Bowling card ── */
  const bowlers = new Map();
  const overRunsByBowler = new Map(); // `${bowlerId}:${over}` -> {runs, legal}
  for (const d of balls) {
    if (!d.bowler_id) continue;
    if (!bowlers.has(d.bowler_id)) {
      bowlers.set(d.bowler_id, {
        id: d.bowler_id,
        name: nameOf(d.bowler_id),
        legalBalls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        firstSeq: d.global_seq,
      });
    }
    const bw = bowlers.get(d.bowler_id);
    if (isLegal(d)) bw.legalBalls += 1;
    bw.runs += bowlerRuns(d);
    if (bowlerWicket(d)) bw.wickets += 1;

    const key = `${d.bowler_id}:${d.over_number}`;
    const agg = overRunsByBowler.get(key) || { runs: 0, legal: 0 };
    agg.runs += bowlerRuns(d);
    if (isLegal(d)) agg.legal += 1;
    overRunsByBowler.set(key, agg);
  }
  // Maidens: a completed over by the bowler conceding 0 runs.
  for (const [key, agg] of overRunsByBowler) {
    if (agg.legal >= bpo && agg.runs === 0) {
      const bowlerId = key.split(":")[0];
      const bw = bowlers.get(bowlerId);
      if (bw) bw.maidens += 1;
    }
  }
  const bowlingCard = [...bowlers.values()]
    .sort((a, b) => a.firstSeq - b.firstSeq)
    .map((b) => ({
      ...b,
      overs: oversFromBalls(b.legalBalls, bpo),
      econ: b.legalBalls > 0 ? b.runs / (b.legalBalls / bpo) : 0,
      isCurrent: b.id === innings.current_bowler_id,
    }));

  /* ── Fall of wickets + partnerships ── */
  const fallOfWickets = [];
  const partnerships = [];
  let runningScore = 0;
  let partnershipRuns = 0;
  let partnershipBalls = 0;
  let wicketNo = 0;
  for (const d of balls) {
    const ballRuns = d.runs_batter + d.runs_extra;
    runningScore += ballRuns;
    partnershipRuns += ballRuns;
    if (isLegal(d)) partnershipBalls += 1;
    if (d.is_wicket) {
      wicketNo += 1;
      fallOfWickets.push({
        wicket: wicketNo,
        score: runningScore,
        over: `${d.over_number}.${d.ball_in_over}`,
        player: nameOf(d.out_player_id),
      });
      partnerships.push({ runs: partnershipRuns, balls: partnershipBalls });
      partnershipRuns = 0;
      partnershipBalls = 0;
    }
  }
  const currentPartnership = {
    runs: partnershipRuns,
    balls: partnershipBalls,
    striker: nameOf(innings.striker_id),
    nonStriker: nameOf(innings.non_striker_id),
  };
  const lastWicket = fallOfWickets.length
    ? fallOfWickets[fallOfWickets.length - 1]
    : null;

  /* ── This over + recent balls ── */
  const lastOverNumber = balls.length ? balls[balls.length - 1].over_number : 0;
  const thisOver = balls
    .filter((d) => d.over_number === lastOverNumber)
    .map((d) => ({ token: ballToken(d), isWicket: d.is_wicket, id: d.id }));
  const recentBalls = balls
    .slice(-6)
    .map((d) => ({ token: ballToken(d), isWicket: d.is_wicket, id: d.id }));

  /* ── Extras ── */
  const extras = {
    wide: innings.extras_wide,
    noball: innings.extras_noball,
    bye: innings.extras_bye,
    legbye: innings.extras_legbye,
    total:
      innings.extras_wide +
      innings.extras_noball +
      innings.extras_bye +
      innings.extras_legbye,
  };

  /* ── Graphs ── */
  const manhattan = [];
  const worm = [];
  let cumulative = 0;
  const perOver = new Map();
  for (const d of balls) {
    const o = d.over_number;
    const agg = perOver.get(o) || { over: o + 1, runs: 0, wickets: 0 };
    agg.runs += d.runs_batter + d.runs_extra;
    if (d.is_wicket) agg.wickets += 1;
    perOver.set(o, agg);
  }
  for (const [, agg] of [...perOver.entries()].sort((a, b) => a[0] - b[0])) {
    manhattan.push(agg);
    cumulative += agg.runs;
    worm.push({ over: agg.over, runs: cumulative });
  }

  /* ── Wagon wheel points ── */
  const wagonPoints = balls
    .filter((d) => d.wagon_angle != null && d.wagon_distance != null)
    .map((d) => ({
      id: d.id,
      angle: d.wagon_angle,
      distance: d.wagon_distance,
      runs: d.runs_batter,
      isBoundary: d.runs_batter === 4 || d.runs_batter === 6,
    }));

  /* ── Projected score (1st innings) ── */
  const projected =
    ballsLeft > 0 ? Math.round(runs + crr * (ballsLeft / bpo)) : runs;

  /* ── Required run rate (2nd innings chase) ── */
  const target = innings.target;
  const runsNeeded = target != null ? Math.max(0, target - runs) : null;
  const rrr =
    target != null && ballsLeft > 0 ? runsNeeded / (ballsLeft / bpo) : null;

  return {
    id: innings.id,
    inningsNumber: innings.innings_number,
    battingFranchiseId: innings.batting_franchise_id,
    bowlingFranchiseId: innings.bowling_franchise_id,
    isClosed: innings.is_closed,
    runs,
    wickets,
    legalBalls,
    oversText: oversFromBalls(legalBalls, bpo),
    ballsLeft,
    crr,
    rrr,
    target,
    runsNeeded,
    projected,
    extras,
    battingCard,
    yetToBat,
    bowlingCard,
    fallOfWickets,
    partnerships,
    currentPartnership,
    lastWicket,
    thisOver,
    recentBalls,
    manhattan,
    worm,
    wagonPoints,
    striker: innings.striker_id ? playerMap[innings.striker_id] : null,
    nonStriker: innings.non_striker_id ? playerMap[innings.non_striker_id] : null,
    bowler: innings.current_bowler_id ? playerMap[innings.current_bowler_id] : null,
    playersPerSide,
    wicketsLeft: playersPerSide - 1 - wickets,
    allOut: wickets >= playersPerSide - 1,
    oversComplete: legalBalls >= totalBalls,
  };
}

/* ═══════════════════════ Win probability ═══════════════════════ */
export function winProbability(currentInn, match, cfg = WIN_PROB_CONFIG) {
  if (!currentInn) return null;
  const bpo = match?.balls_per_over || 6;
  const totalOvers = match?.overs_per_innings || 10;
  const wicketAdj = currentInn.wicketsLeft / (currentInn.playersPerSide - 1);
  const remainingOvers = currentInn.ballsLeft / bpo;
  const expectedRemaining =
    currentInn.crr * remainingOvers * (cfg.wicketDamping + (1 - cfg.wicketDamping) * wicketAdj);

  let battingPct;
  if (currentInn.inningsNumber === 2 && currentInn.target != null) {
    if (currentInn.runsNeeded <= 0) battingPct = 1;
    else if (currentInn.ballsLeft <= 0 || currentInn.wicketsLeft <= 0) battingPct = 0;
    else {
      const margin = currentInn.runs + expectedRemaining - currentInn.target;
      battingPct = logistic(margin / cfg.scaleChase);
    }
  } else {
    const par = cfg.parRunRate * totalOvers;
    const expectedFinal = currentInn.runs + expectedRemaining;
    battingPct = logistic((expectedFinal - par) / cfg.scale1);
  }

  battingPct = clamp(battingPct, 0.02, 0.98);
  return {
    battingFranchiseId: currentInn.battingFranchiseId,
    bowlingFranchiseId: currentInn.bowlingFranchiseId,
    battingPct: Math.round(battingPct * 100),
    bowlingPct: Math.round((1 - battingPct) * 100),
  };
}

/* ═══════════════════════ Top-level match derivation ═══════════════════════ */
export function buildPlayerMap(players) {
  const map = {};
  for (const p of players) map[p.id] = p;
  return map;
}

export function deriveMatch(match, inningsRows, deliveries, players) {
  const playerMap = buildPlayerMap(players);
  const innings = inningsRows
    .slice()
    .sort((a, b) => a.innings_number - b.innings_number)
    .map((inn) => deriveInnings(inn, deliveries, match, playerMap));

  const current = innings.length ? innings[innings.length - 1] : null;
  const winProb = winProbability(current, match);

  return { match, innings, current, winProb, playerMap };
}
