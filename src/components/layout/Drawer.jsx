import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Swords, Users, Gamepad2, LogOut } from "lucide-react";
import { playerStats } from "../../data/mockData";
import { useAuth } from "../../contexts/AuthContext";

export default function Drawer({ isOpen, onClose }) {
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="glass-strong fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700/50 p-5">
              <h2 className="font-display text-lg font-bold tracking-wider text-neon-cyan">
                Player Stats
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Player info */}
            <div className="flex-1 space-y-6 p-5">
              {/* Avatar & Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 text-2xl ring-2 ring-neon-cyan/30">
                  🎮
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {user?.email?.split("@")[0] || playerStats.name}
                  </h3>
                  <p className="text-xs text-slate-400">{user?.email || playerStats.email}</p>
                  {role && (
                    <span className="mt-1 inline-block rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neon-purple">
                      {role}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Team badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass flex items-center gap-3 rounded-xl p-4"
              >
                <Users className="h-5 w-5 text-neon-purple" />
                <div>
                  <p className="text-xs text-slate-400">Current Team</p>
                  <p className="font-semibold text-white">{playerStats.team}</p>
                </div>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                <StatCard
                  icon={<Swords className="h-4 w-4 text-neon-cyan" />}
                  label="Matches Played"
                  value={playerStats.matchesPlayed}
                  delay={0.25}
                />
                <StatCard
                  icon={<Trophy className="h-4 w-4 text-neon-gold" />}
                  label="Wins"
                  value={playerStats.matchesWon}
                  delay={0.3}
                />
                <StatCard
                  icon={<X className="h-4 w-4 text-neon-red" />}
                  label="Losses"
                  value={playerStats.matchesLost}
                  delay={0.35}
                />
                <StatCard
                  icon={<Gamepad2 className="h-4 w-4 text-neon-green" />}
                  label="Rank"
                  value={`#${playerStats.rank}`}
                  delay={0.4}
                />
              </motion.div>

              {/* Sports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Registered Sports
                </h4>
                <div className="flex flex-wrap gap-2">
                  {playerStats.sports.map((sport) => (
                    <span
                      key={sport}
                      className="rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1 text-xs font-medium text-neon-cyan"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Footer — Sign Out */}
            <div className="border-t border-slate-700/50 p-5">
              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 py-3 text-sm font-semibold text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </motion.button>
              <p className="mt-3 text-center text-[10px] text-slate-600">
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
      className="glass flex flex-col items-center gap-1.5 rounded-xl p-3 text-center"
    >
      {icon}
      <span className="text-xl font-bold text-white">{value}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </motion.div>
  );
}
