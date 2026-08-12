const SCORE_DIFF_SPORTS = new Set([
  "Football",
  "Basketball",
  "Volleyball",
  "Badminton",
  "Table Tennis",
  "Carrom",
]);

function teamName(row) {
  return row.franchise?.name || "";
}

export function supportsScoreDifference(sport) {
  return SCORE_DIFF_SPORTS.has(sport);
}

/**
 * Most completed-match summaries are stored winner-first:
 *
 *   won 3 - 1 sets
 *   won 82 - 76
 *
 * That means the first number cannot automatically be assigned
 * to franchise A. Use winner_franchise_id to restore the score
 * to the actual A/B sides.
 *
 * Cricket margin summaries ("won by 3 wickets"), Chess and Relay
 * intentionally do not participate in this generic score-difference
 * calculation.
 */
export function extractComparableScore(match) {
  if (!match || !supportsScoreDifference(match.sport)) {
    return null;
  }

  const summary = match.result_summary || "";

  const scoreMatch = summary.match(
    /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/
  );

  if (!scoreMatch) {
    return null;
  }

  const first = Number(scoreMatch[1]);
  const second = Number(scoreMatch[2]);

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(second)
  ) {
    return null;
  }

  const aId = match.franchise_a_id;
  const bId = match.franchise_b_id;

  // Draw/tie summaries preserve A/B order. In normal tied-score
  // sports both values are equal anyway.
  if (
    match.is_tie ||
    !match.winner_franchise_id
  ) {
    return {
      a: first,
      b: second,
    };
  }

  if (match.winner_franchise_id === aId) {
    return {
      a: first,
      b: second,
    };
  }

  if (match.winner_franchise_id === bId) {
    return {
      a: second,
      b: first,
    };
  }

  // Invalid/inconsistent winner reference: do not invent a score.
  return null;
}

function compareSportRows(a, b, sport) {
  const base =
    b.pts - a.pts ||
    b.w - a.w;

  if (base !== 0) {
    return base;
  }

  switch (sport) {
    case "Football":
      return (
        b.diff - a.diff ||
        b.gf - a.gf ||
        teamName(a).localeCompare(teamName(b))
      );

    case "Volleyball":
      return (
        b.gf - a.gf ||
        b.diff - a.diff ||
        teamName(a).localeCompare(teamName(b))
      );

    case "Basketball":
    case "Badminton":
    case "Table Tennis":
      return (
        b.diff - a.diff ||
        teamName(a).localeCompare(teamName(b))
      );

    case "Carrom":
      return (
        b.gf - a.gf ||
        b.diff - a.diff ||
        teamName(a).localeCompare(teamName(b))
      );

    default:
      return teamName(a).localeCompare(
        teamName(b)
      );
  }
}

export function computeStandings(
  matches,
  franchiseMap,
  sport
) {
  const stats = {};

  const ensure = (franchiseId) => {
    if (!stats[franchiseId]) {
      stats[franchiseId] = {
        w: 0,
        d: 0,
        l: 0,
        pts: 0,
        gf: 0,
        ga: 0,
        played: 0,
      };
    }

    return stats[franchiseId];
  };

  const relevantMatches = matches.filter(
    (match) =>
      match.status === "completed" &&
      (sport === "All" ||
        match.sport === sport)
  );

  for (const match of relevantMatches) {
    const aId = match.franchise_a_id;
    const bId = match.franchise_b_id;

    if (!aId || !bId) {
      continue;
    }

    const a = ensure(aId);
    const b = ensure(bId);

    a.played += 1;
    b.played += 1;

    if (
      match.is_tie ||
      !match.winner_franchise_id
    ) {
      a.d += 1;
      b.d += 1;

      a.pts += 1;
      b.pts += 1;
    } else if (
      match.winner_franchise_id === aId
    ) {
      a.w += 1;
      a.pts += 2;

      b.l += 1;
    } else if (
      match.winner_franchise_id === bId
    ) {
      b.w += 1;
      b.pts += 2;

      a.l += 1;
    } else {
      // Completed match contains an invalid winner reference.
      // Do not award an incorrect win/loss.
      continue;
    }

    const score =
      extractComparableScore(match);

    if (score) {
      a.gf += score.a;
      a.ga += score.b;

      b.gf += score.b;
      b.ga += score.a;
    }
  }

  return Object.entries(stats)
    .filter(
      ([franchiseId]) =>
        franchiseId in franchiseMap
    )
    .map(([franchiseId, row]) => ({
      franchise:
        franchiseMap[franchiseId],
      ...row,
      diff: row.gf - row.ga,
    }))
    .sort((a, b) =>
      compareSportRows(a, b, sport)
    );
}

/**
 * Combined standings deliberately do NOT sum score differences.
 *
 * A football goal, basketball point, volleyball set and badminton
 * game are different units and cannot form a meaningful combined
 * score difference.
 */
export function computeCombinedStandings(
  activeSports,
  matches,
  franchiseMap
) {
  const totals = {};

  for (const sport of activeSports) {
    const rows = computeStandings(
      matches,
      franchiseMap,
      sport
    );

    for (const row of rows) {
      const franchiseId =
        row.franchise?.id;

      if (!franchiseId) {
        continue;
      }

      if (!totals[franchiseId]) {
        totals[franchiseId] = {
          franchise: row.franchise,
          pts: 0,
          w: 0,
          d: 0,
          l: 0,
          played: 0,

          // StandingsTable expects these properties, although
          // combined standings intentionally do not use them.
          gf: 0,
          ga: 0,
          diff: 0,
        };
      }

      totals[franchiseId].pts += row.pts;
      totals[franchiseId].w += row.w;
      totals[franchiseId].d += row.d;
      totals[franchiseId].l += row.l;
      totals[franchiseId].played +=
        row.played;
    }
  }

  return Object.values(totals).sort(
    (a, b) =>
      b.pts - a.pts ||
      b.w - a.w ||
      teamName(a).localeCompare(
        teamName(b)
      )
  );
}

export function getTiebreakerLabel(sport) {
  switch (sport) {
    case "Football":
      return "Ranking: Points → Wins → Goal Difference → Goals For → Team Name";

    case "Basketball":
      return "Ranking: Points → Wins → Point Difference → Team Name";

    case "Volleyball":
      return "Ranking: Points → Wins → Sets Won → Set Difference → Team Name";

    case "Badminton":
    case "Table Tennis":
      return "Ranking: Points → Wins → Game Difference → Team Name";

    case "Carrom":
      return "Ranking: Points → Wins → Boards Won → Board Difference → Team Name";

    case "Cricket":
      return "Ranking: Points → Wins → Team Name. NRR is not implemented yet.";

    case "Chess":
      return "Ranking: Points → Wins → Team Name. Head-to-head tiebreaking is not implemented yet.";

    case "Relay":
      return "Ranking: Points → Wins → Team Name. Cumulative-time tiebreaking is not implemented yet.";

    case "Kabaddi":
      return "Olympus Kabaddi tiebreaker rules are currently on hold.";

    case "Arm Wrestling":
      return "Olympus Arm Wrestling tiebreaker rules are currently on hold.";

    default:
      return "Ranking: Points → Wins → Team Name";
  }
}
