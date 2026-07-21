import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Medal, Users, X } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";
import { sports } from "../../data/mockData";

export default function FranchiseModal({ franchise, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && franchise && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-5"
        >
          <motion.article
            initial={{ opacity: 0, y: 50, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl glass-strong sm:rounded-3xl"
          >
            {/* Color glow */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${franchise.color}55, transparent 65%)`,
              }}
            />

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl glass text-white/60 transition hover:text-white"
              aria-label="Close franchise details"
            >
              <X size={19} />
            </button>

            {/* Header */}
            <header className="relative flex flex-col items-center px-5 pb-7 pt-10 text-center sm:px-8">
              <FranchiseEmblem franchise={franchise} size="xl" active />

              <span className="mt-5 text-[9px] font-black uppercase tracking-[0.25em] text-olympus-muted">
                Pool {franchise.pool} franchise
              </span>

              <h2 className="mt-2 font-display text-4xl font-bold text-white sm:text-6xl">
                {franchise.name}
              </h2>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="rounded-full glass px-4 py-2 text-[9px] font-black uppercase tracking-wider text-olympus-muted">
                  Overall #{franchise.overallRank}
                </span>
                <span className="rounded-full glass px-4 py-2 text-[9px] font-black uppercase tracking-wider text-olympus-muted">
                  {franchise.roster.length} players
                </span>
              </div>
            </header>

            {/* Body */}
            <div className="relative grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-[0.8fr_1.2fr] sm:p-6">
              {/* Leader */}
              <section className="rounded-2xl glass p-5">
                <div className="flex items-center gap-2">
                  <Crown size={17} style={{ color: franchise.color }} />
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                    Franchise leader
                  </h3>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <img
                    src={franchise.leader.image}
                    alt=""
                    className="h-16 w-16 rounded-2xl border border-white/10 bg-olympus-surface object-cover"
                  />
                  <div>
                    <strong className="block text-base text-white">
                      {franchise.leader.name}
                    </strong>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
                      {franchise.leader.role}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-xl glass-dark p-3 text-center">
                    <strong className="block text-xl" style={{ color: franchise.color }}>
                      {franchise.roster.length}
                    </strong>
                    <span className="mt-1 block text-[7px] font-black uppercase tracking-wider text-olympus-subtle">
                      Players
                    </span>
                  </div>
                  <div className="rounded-xl glass-dark p-3 text-center">
                    <strong className="block text-xl" style={{ color: franchise.color }}>
                      #{franchise.overallRank}
                    </strong>
                    <span className="mt-1 block text-[7px] font-black uppercase tracking-wider text-olympus-subtle">
                      Rank
                    </span>
                  </div>
                </div>
              </section>

              {/* Roster */}
              <section className="rounded-2xl glass p-5">
                <div className="flex items-center gap-2">
                  <Users size={17} style={{ color: franchise.color }} />
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                    Active roster
                  </h3>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {franchise.roster.map((player, index) => (
                    <div
                      key={`${player.name}-${index}`}
                      className="flex items-center gap-3 rounded-xl glass-dark px-3 py-3"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                        style={{
                          color: franchise.color,
                          backgroundColor: `${franchise.color}18`,
                        }}
                      >
                        {player.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-[11px] text-white/90">
                          {player.name}
                        </strong>
                        <span className="mt-0.5 block truncate text-[8px] font-bold uppercase tracking-wide text-olympus-subtle">
                          {player.sport}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sport rankings */}
            <section className="relative border-t border-white/[0.06] px-4 pb-6 pt-5 sm:px-6">
              <div className="mb-4 flex items-center gap-2">
                <Medal size={17} style={{ color: franchise.color }} />
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                  Sport rankings
                </h3>
              </div>

              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                {sports.map((sport) => (
                  <div
                    key={sport.name}
                    className="min-w-[110px] rounded-xl glass-dark p-3"
                  >
                    <span className="block truncate text-[8px] font-black uppercase tracking-wider text-olympus-subtle">
                      {sport.name}
                    </span>
                    <strong
                      className="mt-2 block text-lg"
                      style={{ color: franchise.color }}
                    >
                      #{franchise.sportRanks[sport.name]}
                    </strong>
                    <span className="mt-1 block text-[7px] font-bold uppercase tracking-wider text-olympus-subtle">
                      {franchise.sportPoints[sport.name]} pts
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
