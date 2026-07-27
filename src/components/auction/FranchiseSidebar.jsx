import { motion } from "framer-motion";
import FranchiseEmblem from "../common/FranchiseEmblem";

export default function FranchiseSidebar({
  franchises = [],
  selectedId,
  onSelect,
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl glass-strong p-4">
      <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
        Franchises
      </h3>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {franchises.map((f) => {
          const isSelected = f.id === selectedId;
          const remaining = (f.total_budget || 10000) - (f.spent_amount || 0);

          return (
            <motion.button
              key={f.id}
              onClick={() => onSelect?.(f.id)}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                isSelected
                  ? "glass-strong ring-1 ring-olympus-gold/40"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="franchise-indicator"
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-olympus-gold"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}

              <FranchiseEmblem franchise={f} size="sm" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {f.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-olympus-gold">
                    ₹{remaining.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] text-olympus-subtle">
                    {f.roster?.length || 0} Players
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
