import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Swords, Users, Gamepad2, LogOut, BarChart3 } from "lucide-react";
import { playerStats } from "../../data/mockData";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

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

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    async function fetchStats() {
      const { data, error } = await supabase
        .from("registered_players")
        .select("stats")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!cancelled && data?.stats) setDynamicStats(data.stats);
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [isOpen, user]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

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
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto"
            style={{
              background: "rgba(7, 19, 33, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRight: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}>
              <h2 className="font-display text-lg tracking-wider" style={{ color: "var(--color-accent-blue)" }}>
                Player Stats
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg p-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 p-5">
              {/* Avatar */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl ring-2"
                  style={{ background: "rgba(59, 130, 246, 0.1)", ringColor: "rgba(59, 130, 246, 0.2)" }}
                >
                  🎮
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {user?.email?.split("@")[0] || playerStats.name}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{user?.email || playerStats.email}</p>
                  {role && (
                    <span
                      className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-accent-gold)", borderColor: "rgba(251, 191, 36, 0.2)", background: "rgba(251, 191, 36, 0.08)" }}
                    >
                      {role}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Team badge */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass flex items-center gap-3 rounded-xl p-4">
                <Users className="h-5 w-5" style={{ color: "var(--color-accent-gold)" }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Current Team</p>
                  <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{playerStats.team}</p>
                </div>
              </motion.div>

              {/* Stats grid */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
                <StatCard icon={<Swords className="h-4 w-4" style={{ color: "var(--color-accent-blue)" }} />} label="Matches Played" value={playerStats.matchesPlayed} delay={0.25} />
                <StatCard icon={<Trophy className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />} label="Wins" value={playerStats.matchesWon} delay={0.3} />
                <StatCard icon={<X className="h-4 w-4" style={{ color: "var(--color-accent-red)" }} />} label="Losses" value={playerStats.matchesLost} delay={0.35} />
                <StatCard icon={<Gamepad2 className="h-4 w-4" style={{ color: "var(--color-accent-green)" }} />} label="Rank" value={`#${playerStats.rank}`} delay={0.4} />
              </motion.div>

              {/* Dynamic Stats */}
              {visibleStats.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Performance Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleStats.map(([key, value], i) => (
                      <motion.div key={key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.05 }} className="glass flex items-center justify-between rounded-xl px-3 py-2.5">
                        <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{formatStatLabel(key)}</span>
                        <span className="text-sm font-bold" style={{ color: "var(--color-accent-blue)" }}>{value}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sports */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: visibleStats.length > 0 ? 0.6 : 0.45 }}>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                  Registered Sports
                </h4>
                <div className="flex flex-wrap gap-2">
                  {playerStats.sports.map((sport) => (
                    <span
                      key={sport}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{ color: "var(--color-accent-blue)", borderColor: "rgba(59, 130, 246, 0.2)", background: "rgba(59, 130, 246, 0.06)" }}
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="border-t p-5" style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}>
              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all"
                style={{ color: "var(--color-accent-red)", borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)" }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </motion.button>
              <p className="mt-3 text-center text-[10px]" style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>
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
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className="glass flex flex-col items-center gap-1.5 rounded-xl p-3 text-center">
      {icon}
      <span className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{value}</span>
      <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
    </motion.div>
  );
}
