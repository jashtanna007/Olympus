import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, ChevronRight } from "lucide-react";
import { sports, getLeaderboardByPool } from "../../data/mockData";

/**
 * SportsLeaderboard — Pool-based, sport-wise team leaderboard
 *
 * - Horizontal pill tabs to select sport
 * - Pool A and Pool B sections with team rankings
 * - Animated rank badges (gold/silver/bronze)
 */
export default function SportsLeaderboard() {
  const [selectedSport, setSelectedSport] = useState(sports[0].name);

  const { poolA, poolB } = useMemo(
    () => getLeaderboardByPool(selectedSport),
    [selectedSport]
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="px-4 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-xl font-bold tracking-wider text-white sm:text-2xl"
        >
          Sports-wise Team{" "}
          <span className="text-glow-purple text-neon-purple">Leaderboard</span>
        </motion.h2>
        <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
          Rankings by pool for each sport
        </p>
      </div>

      {/* Sport Selector Tabs */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:justify-center sm:gap-2.5 sm:px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {sports.map((sport) => (
            <motion.button
              key={sport.name}
              onClick={() => setSelectedSport(sport.name)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:py-2.5 sm:text-sm ${
                selectedSport === sport.name
                  ? "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                  : "border border-slate-700/40 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              <span>{sport.emoji}</span>
              <span className="hidden sm:inline">{sport.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Selected sport label (mobile) */}
      <div className="px-4 text-center sm:hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={selectedSport}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm font-semibold text-neon-cyan"
          >
            {sports.find((s) => s.name === selectedSport)?.emoji}{" "}
            {selectedSport}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pool Sections */}
      <div className="grid gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <PoolSection title="Pool A" teams={poolA} selectedSport={selectedSport} />
        <PoolSection title="Pool B" teams={poolB} selectedSport={selectedSport} />
      </div>
    </div>
  );
}

// ─── Pool Section ───
function PoolSection({ title, teams, selectedSport }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Pool Header */}
      <div className="flex items-center gap-2 border-b border-slate-700/30 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neon-purple/10">
          <Trophy className="h-4 w-4 text-neon-purple" />
        </div>
        <h3 className="font-display text-sm font-bold tracking-wider text-white">
          {title}
        </h3>
        <div className="ml-auto rounded-full bg-slate-800/60 px-2.5 py-0.5">
          <span className="text-[10px] font-semibold text-slate-400">
            {teams.length} Teams
          </span>
        </div>
      </div>

      {/* Team Rankings */}
      <div className="divide-y divide-slate-700/20">
        <AnimatePresence mode="wait">
          {teams.map((team, i) => (
            <motion.div
              key={`${selectedSport}-${team.id}`}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-800/30"
            >
              {/* Rank badge */}
              <RankBadge rank={team.rank} teamColor={team.color} />

              {/* Team info */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{team.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors">
                    {team.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Overall #{team.overallRank}
                  </p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="text-right">
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ color: team.color }}
                  >
                    {team.points}
                  </p>
                  <p className="text-[9px] font-medium tracking-wider text-slate-500">
                    PTS
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Rank Badge (gold/silver/bronze for top 3) ───
function RankBadge({ rank, teamColor }) {
  const isTop3 = rank <= 3;

  const colors = {
    1: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
    2: { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
    3: { bg: "rgba(180, 83, 9, 0.15)", text: "#d97706", border: "rgba(180, 83, 9, 0.3)" },
  };

  const style = isTop3
    ? colors[rank]
    : { bg: `${teamColor}10`, text: teamColor, border: `${teamColor}20` };

  return (
    <motion.div
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
      style={{
        background: style.bg,
        border: `1.5px solid ${style.border}`,
      }}
      whileHover={{ scale: 1.1 }}
    >
      {isTop3 && (
        <Medal
          className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5"
          style={{ color: style.text }}
        />
      )}
      <span
        className="text-sm font-bold"
        style={{ color: style.text }}
      >
        #{rank}
      </span>
    </motion.div>
  );
}
