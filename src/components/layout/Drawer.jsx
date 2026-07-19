import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Swords, Users, Gamepad2, LogOut, BarChart3 } from "lucide-react";
import { playerStats } from "../../data/mockData";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * Format a JSONB stat key into a readable label.
 * e.g. "goals" → "Goals", "three_pointers" → "Three Pointers"
 */
function formatStatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Drawer({ isOpen, onClose }) {
  // TEMP: auth disabled for dev — restore before launch
  // const { user, role, signOut } = useAuth();
  const user = null;
  const role = "viewer";
  const signOut = async () => {};

  const [dynamicStats, setDynamicStats] = useState(null);

  // Fetch the player's stats JSONB from registered_players
  useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;

    async function fetchStats() {
      const { data, error } = await supabase
        .from("registered_players")
        .select("stats")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!cancelled && data?.stats) {
        setDynamicStats(data.stats);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [isOpen, user]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  // Filter dynamic stats to only show truthy, non-zero values
  const visibleStats = dynamicStats
    ? Object.entries(dynamicStats).filter(([, value]) => value && value !== 0)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/55"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto"
            style={{
              background: "var(--color-surface-900)",
              borderRight: "1px solid rgba(138, 155, 176, 0.12)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "rgba(138, 155, 176, 0.1)" }}>
              <h2 className="font-display text-lg tracking-wider" style={{ color: "var(--color-flame)" }}>
                Player Stats
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg p-1.5 transition-colors hover:bg-[var(--color-charcoal)]"
                style={{ color: "var(--color-stone)" }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Player info */}
            <div className="flex-1 space-y-6 p-5">
              {/* Avatar & Name */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl ring-2"
                  style={{
                    background: "var(--color-charcoal)",
                    ringColor: "rgba(232, 97, 45, 0.25)",
                  }}
                >
                  🎮
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--color-cream)" }}>
                    {user?.email?.split("@")[0] || playerStats.name}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--color-stone)" }}>{user?.email || playerStats.email}</p>
                  {role && (
                    <span
                      className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--color-gold)",
                        borderColor: "rgba(212, 168, 67, 0.2)",
                        background: "rgba(212, 168, 67, 0.08)",
                      }}
                    >
                      {role}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Team badge */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="card flex items-center gap-3 rounded-xl p-4"
              >
                <Users className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--color-stone)" }}>Current Team</p>
                  <p className="font-semibold" style={{ color: "var(--color-cream)" }}>{playerStats.team}</p>
                </div>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                <StatCard
                  icon={<Swords className="h-4 w-4" style={{ color: "var(--color-flame)" }} />}
                  label="Matches Played"
                  value={playerStats.matchesPlayed}
                  delay={0.25}
                />
                <StatCard
                  icon={<Trophy className="h-4 w-4" style={{ color: "var(--color-gold)" }} />}
                  label="Wins"
                  value={playerStats.matchesWon}
                  delay={0.3}
                />
                <StatCard
                  icon={<X className="h-4 w-4" style={{ color: "#ef4444" }} />}
                  label="Losses"
                  value={playerStats.matchesLost}
                  delay={0.35}
                />
                <StatCard
                  icon={<Gamepad2 className="h-4 w-4" style={{ color: "#22c55e" }} />}
                  label="Rank"
                  value={`#${playerStats.rank}`}
                  delay={0.4}
                />
              </motion.div>

              {/* Dynamic Stats from JSONB (Change 3) */}
              {visibleStats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-stone)" }}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Performance Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleStats.map(([key, value], i) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="card flex items-center justify-between rounded-xl px-3 py-2.5"
                      >
                        <span className="text-[11px] font-medium" style={{ color: "var(--color-stone)" }}>
                          {formatStatLabel(key)}
                        </span>
                        <span className="text-sm font-bold" style={{ color: "var(--color-flame)" }}>
                          {value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sports */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: visibleStats.length > 0 ? 0.6 : 0.45 }}
              >
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-stone)" }}>
                  Registered Sports
                </h4>
                <div className="flex flex-wrap gap-2">
                  {playerStats.sports.map((sport) => (
                    <span
                      key={sport}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        color: "var(--color-flame)",
                        borderColor: "rgba(232, 97, 45, 0.2)",
                        background: "rgba(232, 97, 45, 0.06)",
                      }}
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Footer — Sign Out */}
            <div className="border-t p-5" style={{ borderColor: "rgba(138, 155, 176, 0.1)" }}>
              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all hover:bg-red-500/10"
                style={{
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  background: "rgba(239, 68, 68, 0.05)",
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </motion.button>
              <p className="mt-3 text-center text-[10px]" style={{ color: "var(--color-stone)", opacity: 0.5 }}>
                IIIT Vadodara Sports Platform
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ icon, label, value, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="card flex flex-col items-center gap-1.5 rounded-xl p-3 text-center"
    >
      {icon}
      <span className="text-xl font-bold" style={{ color: "var(--color-cream)" }}>{value}</span>
      <span className="text-[10px]" style={{ color: "var(--color-stone)" }}>{label}</span>
    </motion.div>
  );
}
