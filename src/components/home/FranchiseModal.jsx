import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Medal, Users, ChevronRight } from "lucide-react";
import { sports } from "../../data/mockData";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.93, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.96, y: 15, transition: { duration: 0.2 } },
};

const leaderSlideVariants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 120, damping: 14, delay: 0.1 },
  },
};

const rosterItemVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.2 + i * 0.04, type: "spring", stiffness: 150, damping: 18 },
  }),
};

export default function FranchiseModal({ franchise, isOpen, onClose }) {
  if (!franchise) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px]"
            style={{
              background: "rgba(12, 23, 40, 0.88)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${franchise.color}22`,
              boxShadow: `0 0 40px ${franchise.color}10, 0 16px 48px rgba(0, 0, 0, 0.5)`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-5 py-4 sm:px-6"
              style={{ borderColor: `${franchise.color}15` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{franchise.emoji}</span>
                <div>
                  <h2 className="text-lg font-bold sm:text-xl" style={{ color: "var(--color-text-primary)" }}>{franchise.name}</h2>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Tournament Franchise</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-xl p-2 transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-6 md:grid-cols-5">
                {/* Leader card */}
                <div className="md:col-span-2">
                  <motion.div
                    variants={leaderSlideVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center rounded-[18px] p-5"
                    style={{
                      background: `${franchise.color}08`,
                      border: `1px solid ${franchise.color}15`,
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <div
                      className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-5xl ring-3 sm:h-28 sm:w-28"
                      style={{
                        background: `${franchise.color}12`,
                        ringColor: `${franchise.color}25`,
                      }}
                    >
                      {franchise.leader.avatar}
                    </div>

                    <Crown className="mb-1 h-5 w-5" style={{ color: "var(--color-accent-gold)" }} />
                    <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{franchise.leader.name}</h3>
                    <p className="mb-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>{franchise.leader.role}</p>

                    <div
                      className="flex items-center gap-2 rounded-full px-4 py-2"
                      style={{
                        background: `${franchise.color}0D`,
                        border: `1px solid ${franchise.color}1A`,
                      }}
                    >
                      <Medal className="h-4 w-4" style={{ color: franchise.color }} />
                      <span className="text-sm font-bold" style={{ color: franchise.color }}>
                        Rank #{franchise.overallRank}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Sport ranks & roster */}
                <div className="space-y-5 md:col-span-3">
                  {/* Sport Rankings */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      <ChevronRight className="h-4 w-4" style={{ color: "var(--color-accent-blue)" }} />
                      Sport Rankings
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sports.map((sport) => {
                        const rank = franchise.sportRanks?.[sport.name];
                        return (
                          <motion.div
                            key={sport.name}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.random() * 0.2 }}
                            className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                          >
                            <span className="text-sm">{sport.emoji}</span>
                            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{sport.name}</span>
                            {rank ? (
                              <span
                                className="ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ color: franchise.color, background: `${franchise.color}12` }}
                              >
                                #{rank}
                              </span>
                            ) : (
                              <span className="ml-1 text-[10px]" style={{ color: "var(--color-text-secondary)", opacity: 0.4 }}>—</span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Roster */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                      <Users className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
                      Roster ({franchise.roster.length} players)
                    </h4>
                    <div className="space-y-2">
                      {franchise.roster.map((player, i) => (
                        <motion.div
                          key={player.name}
                          custom={i}
                          variants={rosterItemVariants}
                          initial="hidden"
                          animate="visible"
                          className="glass flex items-center justify-between rounded-xl px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                              style={{ background: `${franchise.color}12`, color: franchise.color }}
                            >
                              {player.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{player.name}</p>
                              <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{player.sport}</p>
                            </div>
                          </div>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: player.role === "Captain" ? "var(--color-accent-gold)" : franchise.color,
                              background: player.role === "Captain" ? "rgba(251, 191, 36, 0.1)" : `${franchise.color}0A`,
                              border: `1px solid ${player.role === "Captain" ? "rgba(251, 191, 36, 0.2)" : `${franchise.color}18`}`,
                            }}
                          >
                            {player.role}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
