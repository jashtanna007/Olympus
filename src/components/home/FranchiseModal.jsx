import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Mail, Users, X } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";

function formatMoney(amount) {
  if (amount == null) return "—";
  return `₹ ${Number(amount).toLocaleString("en-IN")}`;
}

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function FranchiseModal({ franchise, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && franchise && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-5"
        >
          <motion.article
            initial={{ opacity: 0, y: 50, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#070c16]/95 sm:rounded-3xl"
            style={{
              background: `
                radial-gradient(
                  circle at 10% 0%,
                  ${franchise.color}2C 0%,
                  transparent 36%
                ),
                radial-gradient(
                  circle at 92% 18%,
                  ${franchise.secondaryColor}2A 0%,
                  transparent 42%
                ),
                linear-gradient(
                  155deg,
                  rgba(255,255,255,0.06) 0%,
                  rgba(7,12,22,0.98) 40%,
                  rgba(3,7,15,0.99) 100%
                )
              `,
              boxShadow: `
                0 0 0 1px ${franchise.color}35,
                0 38px 100px -42px ${franchise.color}
              `,
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-90"
              style={{
                background: `
                  radial-gradient(
                    circle at 50% 0%,
                    ${franchise.color}3A,
                    transparent 62%
                  ),
                  linear-gradient(
                    110deg,
                    transparent 18%,
                    ${franchise.secondaryColor}12 50%,
                    transparent 82%
                  )
                `,
              }}
            />

            <div className="pointer-events-none absolute -left-36 top-24 h-24 w-[34rem] -rotate-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent blur-2xl" />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl glass text-white/60 transition hover:text-white"
              aria-label="Close franchise details"
            >
              <X size={19} />
            </button>

            <header className="relative flex flex-col items-center px-5 pb-7 pt-10 text-center sm:px-8">
              <FranchiseEmblem franchise={franchise} size="xl" active />

              <span className="mt-5 text-[9px] font-black uppercase tracking-[0.25em] text-olympus-muted">
                Official franchise
              </span>

              <h2 className="mt-2 font-display text-4xl font-bold text-white sm:text-6xl">
                {franchise.name}
              </h2>

              <div
                className="mt-3 h-1 w-28 rounded-full"
                style={{
                  background: `
                    linear-gradient(
                      90deg,
                      transparent,
                      ${franchise.color},
                      ${franchise.secondaryColor},
                      transparent
                    )
                  `,
                  boxShadow: `0 0 14px ${franchise.color}`,
                }}
              />

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="rounded-full glass px-4 py-2 text-[9px] font-black uppercase tracking-wider text-olympus-muted">
                  {franchise.roster?.length || 0} players bought
                </span>
                <span className="rounded-full glass px-4 py-2 text-[9px] font-black uppercase tracking-wider text-olympus-muted">
                  {formatMoney(franchise.remainingBudget)} purse left
                </span>
              </div>
            </header>

            <div
              className="relative grid gap-4 border-t p-4 sm:grid-cols-[0.9fr_1.1fr] sm:p-6"
              style={{ borderColor: `${franchise.color}24` }}
            >
              <section
                className="rounded-2xl border p-5"
                style={{
                  borderColor: `${franchise.color}35`,
                  background: `
                    linear-gradient(
                      145deg,
                      ${franchise.color}18,
                      rgba(8,13,24,0.82) 48%,
                      ${franchise.secondaryColor}12
                    )
                  `,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Crown size={17} style={{ color: franchise.color }} />
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                    Franchise leader
                  </h3>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-sm font-black"
                    style={{
                      color: franchise.color,
                      backgroundColor: `${franchise.color}18`,
                    }}
                  >
                    {getInitials(franchise.leader.name)}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-base text-white">
                      {franchise.leader.name}
                    </strong>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
                      {franchise.leader.role}
                    </span>

                  </div>
                </div>


              </section>

              <section
                className="rounded-2xl border p-5"
                style={{
                  borderColor: `${franchise.secondaryColor}35`,
                  background: `
                    linear-gradient(
                      145deg,
                      ${franchise.secondaryColor}16,
                      rgba(8,13,24,0.84) 50%,
                      ${franchise.color}10
                    )
                  `,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Users size={17} style={{ color: franchise.color }} />
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                    Team roster
                  </h3>
                </div>

                {franchise.roster?.length ? (
                  <div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {franchise.roster.map((player, index) => (
                      <div
                        key={player.id || player.rollNumber}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 text-[10px] font-black"
                          style={{
                            color: franchise.color,
                            backgroundColor: `${franchise.color}18`,
                          }}
                        >
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(player.name)
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-white">
                            {index + 1}. {player.name}
                          </strong>
                          <p className="mt-1 text-[10px] text-white/45">
                            {player.status === "retained" ? "Retained" : "Auctioned"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 glass-dark px-6 text-center">
                    <Users size={28} className="text-white/20" />
                    <strong className="mt-3 text-sm text-white/80">No players purchased yet</strong>
                    <p className="mt-2 max-w-xs text-xs leading-relaxed text-olympus-subtle">
                      Sold players will appear here immediately after the auctioneer confirms the sale.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
