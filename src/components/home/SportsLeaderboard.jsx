import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, ChevronRight } from "lucide-react";
import { sports, getLeaderboardByPool, getOverallLeaderboard } from "../../data/mockData";

const OVERALL_TAB = { name: "Overall", emoji: "🏆", icon: "overall" };

export default function SportsLeaderboard({ onTeamClick }) {
  const [selectedTab, setSelectedTab] = useState(OVERALL_TAB.name);

  const allTabs = useMemo(() => [OVERALL_TAB, ...sports], []);

  const { poolA, poolB } = useMemo(() => {
    if (selectedTab === "Overall") return getOverallLeaderboard();
    return getLeaderboardByPool(selectedTab);
  }, [selectedTab]);

  const isOverall = selectedTab === "Overall";

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="px-4 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl tracking-wider sm:text-3xl lg:text-4xl"
          style={{ color: "var(--color-text-primary)" }}
        >
          TOURNAMENT{" "}
          <span className="glow-blue-text" style={{ color: "var(--color-accent-blue)" }}>STANDINGS</span>
        </motion.h2>
        <p className="mt-1.5 text-xs sm:text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {isOverall ? "Combined standings across all sports" : "Rankings by pool for each sport"}
        </p>
      </div>

      {/* ── Tab Selector — Premium Glass Chips ── */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:justify-center sm:gap-2 sm:px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {allTabs.map((tab) => {
            const isActive = selectedTab === tab.name;
            return (
              <motion.button
                key={tab.name}
                onClick={() => setSelectedTab(tab.name)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:py-2.5 sm:text-sm"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #F97316, #ea580c)",
                        color: "#ffffff",
                        boxShadow: "0 0 16px rgba(249, 115, 22, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)",
                      }
                    : {
                        background: "rgba(20, 35, 52, 0.6)",
                        backdropFilter: "blur(12px)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }
                }
              >
                <span className="text-sm">{tab.emoji}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mobile active tab label */}
      <div className="px-4 text-center sm:hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={selectedTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm font-semibold"
            style={{ color: "var(--color-accent-orange)" }}
          >
            {allTabs.find((t) => t.name === selectedTab)?.emoji}{" "}
            {selectedTab}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pool Sections */}
      <div className="grid gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8">
        <PoolSection title="Pool A" teams={poolA} selectedTab={selectedTab} onTeamClick={onTeamClick} isOverall={isOverall} />
        <PoolSection title="Pool B" teams={poolB} selectedTab={selectedTab} onTeamClick={onTeamClick} isOverall={isOverall} />
      </div>
    </div>
  );
}

// ─── Pool Section ───
function PoolSection({ title, teams, selectedTab, onTeamClick, isOverall }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      className="glass overflow-hidden rounded-[20px]"
    >
      {/* Pool Header */}
      <div
        className="flex items-center gap-2.5 border-b px-5 py-4"
        style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "rgba(251, 191, 36, 0.12)" }}
        >
          <Trophy className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
        </div>
        <h3 className="font-display text-base tracking-wider" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>
        <div className="ml-auto rounded-full px-2.5 py-0.5" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
          <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {teams.length} Teams
          </span>
        </div>
      </div>

      {/* Team Rankings */}
      <div>
        <AnimatePresence>
          {teams.map((team, i) => (
            <motion.div
              key={`${selectedTab}-${team.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              onClick={() => onTeamClick?.(team)}
              className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-all duration-200"
              style={{
                borderBottom: i < teams.length - 1 ? "1px solid rgba(255, 255, 255, 0.03)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.06)";
                e.currentTarget.style.transform = "scale(1.01)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {/* Rank badge */}
              <RankBadge rank={team.rank} teamColor={team.color} />

              {/* Team info */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{team.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {team.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                    {isOverall ? `Pool ${team.pool}` : `Overall #${team.overallRank}`}
                  </p>
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums" style={{ color: team.color }}>
                    {team.points.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-medium tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                    {isOverall ? "TOTAL" : "PTS"}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 transition-all duration-200 group-hover:translate-x-0.5"
                  style={{ color: "var(--color-text-secondary)" }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Rank Badge ───
function RankBadge({ rank, teamColor }) {
  const isTop3 = rank <= 3;

  const colors = {
    1: { bg: "rgba(251, 191, 36, 0.15)", text: "#FBBF24", border: "rgba(251, 191, 36, 0.3)" },
    2: { bg: "rgba(148, 163, 184, 0.12)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.25)" },
    3: { bg: "rgba(205, 127, 50, 0.12)", text: "#CD7F32", border: "rgba(205, 127, 50, 0.25)" },
  };

  const style = isTop3
    ? colors[rank]
    : { bg: `${teamColor}10`, text: teamColor, border: `${teamColor}20` };

  return (
    <div
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
      style={{
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        boxShadow: isTop3 ? `0 0 12px ${style.border}` : "none",
      }}
    >
      {isTop3 && (
        <Medal
          className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5"
          style={{ color: style.text }}
        />
      )}
      <span className="text-sm font-bold" style={{ color: style.text }}>
        #{rank}
      </span>
    </div>
  );
}
