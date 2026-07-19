import { motion } from "framer-motion";
import { Trophy, Swords, ChevronRight, Calendar } from "lucide-react";
import { franchises, getOverallLeaderboard } from "../../data/mockData";

/**
 * QuickInfoPanel — Three glass cards: Rankings, Next Match, Quick Stats
 * Uses existing mockData — no new API calls.
 */
export default function QuickInfoPanel() {
  const { poolA, poolB } = getOverallLeaderboard();
  const allSorted = [...poolA, ...poolB].sort((a, b) => b.points - a.points);
  const top3 = allSorted.slice(0, 3);

  // Mock upcoming match from existing franchise data
  const teamA = franchises[2]; // Thunder Titans
  const teamB = franchises[4]; // Crimson Lions

  return (
    <div className="grid gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:gap-6 lg:px-8">
      {/* ── Rankings Preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="glass rounded-[20px] p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(251, 191, 36, 0.12)" }}>
            <Trophy className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>RANKINGS</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>Top franchises this season</p>
          </div>
        </div>

        <div className="space-y-3">
          {top3.map((team, i) => (
            <div key={team.id} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm font-bold" style={{ color: i === 0 ? "#FBBF24" : i === 1 ? "#94a3b8" : "#CD7F32" }}>
                {i + 1}
              </span>
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: team.color }} />
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{team.name}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: team.color }}>{team.points.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ x: 4 }}
          className="mt-4 flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--color-accent-blue)" }}
        >
          View Full Rankings <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      {/* ── Next Match ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-[20px] p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(59, 130, 246, 0.12)" }}>
            <Swords className="h-4 w-4" style={{ color: "var(--color-accent-blue)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>NEXT MATCH</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>Pool A • Group Stage</p>
          </div>
        </div>

        {/* Match Display */}
        <div className="flex items-center justify-center gap-4 py-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: `${teamA.color}15` }}>
              {teamA.emoji}
            </div>
            <span className="text-[11px] font-bold tracking-wider" style={{ color: "var(--color-text-primary)" }}>
              {teamA.name.split(" ").pop()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold" style={{ color: "var(--color-text-secondary)" }}>VS</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: `${teamB.color}15` }}>
              {teamB.emoji}
            </div>
            <span className="text-[11px] font-bold tracking-wider" style={{ color: "var(--color-text-primary)" }}>
              {teamB.name.split(" ").pop()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          <Calendar className="h-3 w-3" />
          <span>Jul 25, 2026 • 4:30 PM</span>
        </div>

        <motion.button
          whileHover={{ x: 4 }}
          className="mt-3 flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--color-accent-blue)" }}
        >
          View Schedule <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </motion.div>

      {/* ── Quick Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass rounded-[20px] p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(249, 115, 22, 0.12)" }}>
            <Swords className="h-4 w-4" style={{ color: "var(--color-accent-orange)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>TOURNAMENT</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>Season overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "64", label: "Matches Played" },
            { value: "28", label: "Matches Left" },
            { value: "8", label: "Active Teams" },
            { value: "11", label: "Sports" },
          ].map((stat, i) => (
            <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <p className="text-xl font-bold" style={{ color: "var(--color-accent-blue)" }}>{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
