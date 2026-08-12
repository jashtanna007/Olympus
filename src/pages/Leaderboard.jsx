// Per-sport leaderboard page.
// Fetches all matches + franchises from Supabase and computes:
//   W / D / L / Points / sport-specific tiebreaker
// Supports filter pills for each sport + "All Sports" combined view.
//
// Point formula: Win = 2, Draw/Tie = 1, Loss = 0 (standard for all sports).
// Tiebreakers: sport-specific delta (goals diff, sets won, pts diff, etc.)

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Trophy, Medal, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { enrichFranchise } from "../lib/cricket";
import {
  computeStandings,
  computeCombinedStandings,
  getTiebreakerLabel,
  supportsScoreDifference,
} from "../lib/leaderboard";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

const ALL_SPORTS = [
  "Cricket", "Football", "Basketball", "Volleyball",
  "Badminton", "Table Tennis", "Kabaddi",
  "Chess", "Carrom", "Relay", "Arm Wrestling",
];

const SPORT_ICONS = {
  Cricket: "🏏", Football: "⚽", Basketball: "🏀", Volleyball: "🏐",
  Badminton: "🏸", "Table Tennis": "🏓", Kabaddi: "🤼",
  Chess: "♟️", Carrom: "🎯", Relay: "🏃", "Arm Wrestling": "💪",
};

/* ── Rank badge ── */
function RankBadge({ rank }) {
  if (rank === 1)
    return <Trophy className="h-5 w-5 text-olympus-gold" />;
  if (rank === 2)
    return <Medal className="h-5 w-5 text-olympus-muted" style={{ color: "#C0C0C0" }} />;
  if (rank === 3)
    return <Medal className="h-5 w-5" style={{ color: "#CD7F32" }} />;
  return <span className="w-5 text-center text-sm font-bold text-olympus-muted">{rank}</span>;
}

/* ── Single leaderboard table ── */
function StandingsTable({ rows, sport }) {
  const showDiff =
    supportsScoreDifference(sport);

  return (
    <div className="rounded-2xl glass overflow-hidden overflow-x-auto">
      <div className="min-w-[420px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              <th className="px-3 py-3 text-left sm:px-4">#</th>
              <th className="px-3 py-3 text-left sm:px-4">Team</th>
              <th className="px-3 py-3 text-center sm:px-4">P</th>
              <th className="px-3 py-3 text-center sm:px-4">W</th>
              <th className="px-3 py-3 text-center sm:px-4">D</th>
              <th className="px-3 py-3 text-center sm:px-4">L</th>
              {showDiff && <th className="px-3 py-3 text-center sm:px-4">+/−</th>}
              <th className="px-3 py-3 text-right text-olympus-gold sm:px-4">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showDiff ? 8 : 7} className="py-8 text-center text-xs text-olympus-muted">
                  No completed matches yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <motion.tr
                  key={row.franchise?.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`transition hover:bg-white/[0.04] ${i < 3 ? "bg-white/[0.02]" : ""}`}
                >
                  <td className="px-3 py-3 sm:px-4">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      {row.franchise && <FranchiseEmblem franchise={row.franchise} size="sm" />}
                      <div>
                        <p className="font-bold text-white">{row.franchise?.short || row.franchise?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-olympus-muted sm:px-4">{row.played}</td>
                  <td className="px-3 py-3 text-center font-bold text-olympus-success sm:px-4">{row.w}</td>
                  <td className="px-3 py-3 text-center text-olympus-muted sm:px-4">{row.d}</td>
                  <td className="px-3 py-3 text-center text-rose-400 sm:px-4">{row.l}</td>
                  {showDiff && (
                    <td className="px-3 py-3 text-center font-bold sm:px-4">
                      <span className={row.diff > 0 ? "text-olympus-success" : row.diff < 0 ? "text-rose-400" : "text-olympus-muted"}>
                        {row.diff > 0 ? `+${row.diff}` : row.diff}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3 text-right font-display text-lg font-extrabold text-olympus-gold sm:px-4">
                    {row.pts}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Per-sport mini card (used in "All Sports" view) ── */
function SportCard({ sport, rows }) {
  const [expanded, setExpanded] = useState(false);
  const preview = rows.slice(0, expanded ? rows.length : 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass overflow-hidden"
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between border-b border-white/[0.07] px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{SPORT_ICONS[sport] || "🏅"}</span>
          <h3 className="font-display text-sm font-bold text-white">{sport}</h3>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-olympus-muted">
            {rows.length} teams
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-olympus-muted" />
          : <ChevronDown className="h-4 w-4 text-olympus-muted" />
        }
      </button>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-white/[0.06]">
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-center text-xs text-olympus-muted">No results yet.</td>
              </tr>
            ) : (
              preview.map((row, i) => (
                <tr key={row.franchise?.id} className="hover:bg-white/[0.03]">
                  <td className="w-8 px-3 py-2.5">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.franchise && <FranchiseEmblem franchise={row.franchise} size="xs" />}
                      <span className="font-bold text-white">{row.franchise?.short || row.franchise?.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-olympus-muted">{row.played}P</td>
                  <td className="px-3 py-2.5 text-center text-xs font-bold text-olympus-success">{row.w}W</td>
                  <td className="px-3 py-2.5 text-center text-xs text-rose-400">{row.l}L</td>
                  <td className="px-3 py-2.5 text-right font-display font-extrabold text-olympus-gold">{row.pts}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 3 && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full py-2 text-center text-[10px] font-bold uppercase tracking-wider text-olympus-muted hover:text-white transition border-t border-white/[0.06]"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </motion.div>
  );
}

/* ── Main leaderboard page ── */
export default function Leaderboard() {
  const [matches, setMatches] = useState([]);
  const [franchiseMap, setFranchiseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState("All");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [matchRes, franchiseRes] = await Promise.all([
          supabase.from("matches").select("*").order("scheduled_at"),
          supabase.from("franchises").select("*"),
        ]);
        if (!active) return;
        const fMap = {};
        for (const f of franchiseRes.data || []) {
          fMap[f.id] = enrichFranchise(f);
        }
        setMatches(matchRes.data || []);
        setFranchiseMap(fMap);
      } catch (e) {
        console.error("Leaderboard load error:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Sports that actually have completed matches
  const activeSports = useMemo(
    () => ALL_SPORTS.filter((s) => matches.some((m) => m.sport === s && m.status === "completed")),
    [matches],
  );

  // Standings for selected sport
  const rows = useMemo(
    () => computeStandings(matches, franchiseMap, selectedSport),
    [matches, franchiseMap, selectedSport],
  );

  // Per-sport rows for "All" view
  const allSportRows = useMemo(
    () =>
      activeSports.map((s) => ({
        sport: s,
        rows: computeStandings(matches, franchiseMap, s),
      })),
    [matches, franchiseMap, activeSports],
  );

  // Combined all-sports points.
  // Score differences are intentionally not combined because
  // goals, basketball points, sets and games are different units.
  const combinedRows = useMemo(
    () =>
      computeCombinedStandings(
        activeSports,
        matches,
        franchiseMap
      ),
    [
      activeSports,
      matches,
      franchiseMap,
    ],
  );

  const availableSports = ["All", ...activeSports];

  return (
    <div className="mx-auto max-w-4xl px-3 pt-4 pb-28 sm:px-6 sm:pt-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-olympus-gold" />
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Leaderboard</h1>
        </div>
        <p className="text-sm text-olympus-muted">
          Win = 2 pts · Draw = 1 pt · Loss = 0 pts
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-olympus-gold" />
        </div>
      ) : (
        <>
          {/* Sport filter pills */}
          <div className="mb-5 flex flex-wrap gap-2">
            {availableSports.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSport(s)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  selectedSport === s
                    ? "bg-olympus-gold text-olympus-bg"
                    : "glass text-olympus-muted hover:text-white"
                }`}
              >
                {s !== "All" && <span>{SPORT_ICONS[s]}</span>}
                {s}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedSport === "All" ? (
              /* ── All Sports view: combined table + per-sport cards ── */
              <motion.div
                key="all"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Combined leaderboard */}
                {combinedRows.length > 0 && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-white">
                      <Trophy className="h-5 w-5 text-olympus-gold" /> Combined Standings
                    </h2>
                    <StandingsTable rows={combinedRows} sport="All" />
                    <p className="mt-2 text-center text-[10px] text-olympus-muted">
                      Points summed across all sports · Final ranking pending remaining matches
                    </p>
                  </div>
                )}

                {/* Per-sport mini cards */}
                {allSportRows.length > 0 && (
                  <div>
                    <h2 className="mb-3 font-display text-base font-bold text-white">By Sport</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {allSportRows.map(({ sport, rows: sr }) => (
                        <SportCard key={sport} sport={sport} rows={sr} />
                      ))}
                    </div>
                  </div>
                )}

                {activeSports.length === 0 && (
                  <div className="rounded-2xl glass p-10 text-center">
                    <Trophy className="mx-auto mb-3 h-10 w-10 text-olympus-gold/30" />
                    <p className="text-sm text-olympus-muted">No completed matches yet across any sport.</p>
                    <p className="mt-1 text-[11px] text-olympus-muted">Leaderboard will populate automatically as matches are completed.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── Single sport view ── */
              <motion.div
                key={selectedSport}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
                    <span>{SPORT_ICONS[selectedSport]}</span>
                    {selectedSport} Standings
                  </h2>
                  <span className="text-xs text-olympus-muted">{rows.length} teams</span>
                </div>
                <StandingsTable rows={rows} sport={selectedSport} />

                {rows.length > 0 && (
                  <div className="rounded-xl glass p-3 text-center text-[11px] text-olympus-muted">
                    {getTiebreakerLabel(
                      selectedSport
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
