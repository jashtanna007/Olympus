import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";

export default function FranchiseBidStrip({
  franchises = [],
  lastBids = {},
  onBid,
  isAdmin = false,
  currentHighestFranchiseId = null,
}) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir * 200,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-2xl glass-strong p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
          Bid From Franchises
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {franchises.map((f) => {
          const bid = lastBids[f.id] || 0;
          const isHighest = f.id === currentHighestFranchiseId;
          const remaining = (f.total_budget || 10000) - (f.spent_amount || 0);

          return (
            <motion.div
              key={f.id}
              style={{ scrollSnapAlign: "start" }}
              whileHover={{ y: -2 }}
              className={`flex w-32 shrink-0 flex-col items-center rounded-xl p-3 transition ${
                isHighest
                  ? "ring-2 ring-olympus-gold/50 glass-strong"
                  : "bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <FranchiseEmblem franchise={f} size="sm" />
              <p className="mt-2 truncate text-[10px] font-semibold text-white">
                {f.name}
              </p>

              {bid > 0 ? (
                <motion.p
                  key={bid}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="mt-1 font-display text-sm font-bold text-olympus-gold"
                >
                  ₹{bid.toLocaleString("en-IN")}
                </motion.p>
              ) : (
                <p className="mt-1 text-[10px] text-olympus-subtle">—</p>
              )}

              {isAdmin ? (
                <button
                  onClick={() => onBid?.(f.id)}
                  disabled={remaining <= 0}
                  className="mt-2 w-full rounded-lg bg-olympus-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-olympus-gold transition hover:bg-olympus-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  BID NOW
                </button>
              ) : (
                <div className="mt-2 w-full rounded-lg bg-white/[0.03] px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
                  {bid > 0 ? "BID PLACED" : "NO BID"}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
