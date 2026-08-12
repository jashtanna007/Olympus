import assert from "node:assert/strict";

import {
  computeCombinedStandings,
  computeStandings,
  extractComparableScore,
  supportsScoreDifference,
} from "../src/lib/leaderboard.js";

const franchises = {
  a: {
    id: "a",
    name: "Alpha",
    short: "ALP",
  },
  b: {
    id: "b",
    name: "Beta",
    short: "BET",
  },
  c: {
    id: "c",
    name: "Charlie",
    short: "CHA",
  },
  d: {
    id: "d",
    name: "Delta",
    short: "DEL",
  },
};

function completed({
  sport,
  a = "a",
  b = "b",
  winner,
  tie = false,
  summary,
}) {
  return {
    sport,
    status: "completed",
    franchise_a_id: a,
    franchise_b_id: b,
    winner_franchise_id:
      winner ?? null,
    is_tie: tie,
    result_summary: summary,
  };
}


// ============================================================
// 1. Franchise B wins a winner-first result.
//    First score must belong to B, not A.
// ============================================================

{
  const match = completed({
    sport: "Volleyball",
    winner: "b",
    summary: "won 3 - 1 sets",
  });

  const score =
    extractComparableScore(match);

  assert.deepEqual(score, {
    a: 1,
    b: 3,
  });

  const rows = computeStandings(
    [match],
    franchises,
    "Volleyball"
  );

  const alpha = rows.find(
    (row) => row.franchise.id === "a"
  );

  const beta = rows.find(
    (row) => row.franchise.id === "b"
  );

  assert.equal(alpha.gf, 1);
  assert.equal(alpha.ga, 3);
  assert.equal(alpha.diff, -2);

  assert.equal(beta.gf, 3);
  assert.equal(beta.ga, 1);
  assert.equal(beta.diff, 2);

  assert.equal(rows[0].franchise.id, "b");
}


// ============================================================
// 2. Football shootout must not contaminate goal difference.
// ============================================================

{
  const match = completed({
    sport: "Football",
    winner: "b",
    summary:
      "won 1 - 1 (4 - 3 pens)",
  });

  const score =
    extractComparableScore(match);

  assert.deepEqual(score, {
    a: 1,
    b: 1,
  });

  const rows = computeStandings(
    [match],
    franchises,
    "Football"
  );

  assert.equal(
    rows.find(
      (row) =>
        row.franchise.id === "a"
    ).diff,
    0
  );

  assert.equal(
    rows.find(
      (row) =>
        row.franchise.id === "b"
    ).diff,
    0
  );
}


// ============================================================
// 3. Basketball winner-first score maps correctly to side B.
// ============================================================

{
  const match = completed({
    sport: "Basketball",
    winner: "b",
    summary: "won 82 - 76",
  });

  assert.deepEqual(
    extractComparableScore(match),
    {
      a: 76,
      b: 82,
    }
  );
}


// ============================================================
// 4. Cricket margin is NOT pretending to be a numeric score.
// ============================================================

{
  const match = completed({
    sport: "Cricket",
    winner: "a",
    summary: "won by 3 wickets",
  });

  assert.equal(
    supportsScoreDifference(
      "Cricket"
    ),
    false
  );

  assert.equal(
    extractComparableScore(match),
    null
  );
}


// ============================================================
// 5. Held sports do not receive invented generic differential.
// ============================================================

assert.equal(
  supportsScoreDifference("Kabaddi"),
  false
);

assert.equal(
  supportsScoreDifference(
    "Arm Wrestling"
  ),
  false
);


// ============================================================
// 6. Combined standings must not mix different scoring units.
// ============================================================

{
  const matches = [
    completed({
      sport: "Football",
      a: "a",
      b: "c",
      winner: "a",
      summary: "won 9 - 0",
    }),

    completed({
      sport: "Basketball",
      a: "b",
      b: "d",
      winner: "b",
      summary: "won 81 - 80",
    }),
  ];

  const rows =
    computeCombinedStandings(
      ["Football", "Basketball"],
      matches,
      franchises
    );

  const alpha = rows.find(
    (row) => row.franchise.id === "a"
  );

  const beta = rows.find(
    (row) => row.franchise.id === "b"
  );

  assert.equal(alpha.pts, 2);
  assert.equal(beta.pts, 2);

  assert.equal(alpha.diff, 0);
  assert.equal(beta.diff, 0);

  // Same points and wins: deterministic fallback is team name,
  // not football +9 versus basketball +1.
  assert.ok(
    rows.findIndex(
      (row) =>
        row.franchise.id === "a"
    ) <
      rows.findIndex(
        (row) =>
          row.franchise.id === "b"
      )
  );
}

console.log(
  "Leaderboard regression tests passed."
);
