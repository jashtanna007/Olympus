import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Filter } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import FranchiseModal from "../components/home/FranchiseModal";
import { franchises } from "../data/mockData";

export default function Franchises() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [poolFilter, setPoolFilter] = useState("all"); // "all" | "A" | "B"

  const filtered =
    poolFilter === "all"
      ? franchises
      : franchises.filter((f) => f.pool === poolFilter);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2">
          <Shield className="h-3.5 w-3.5 text-olympus-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-gold">
            Season 2026
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
          Franchises
        </h1>
        <p className="mt-2 max-w-lg text-olympus-muted">
          8 elite teams competing across 11 sports. Tap any franchise to explore
          their roster, rankings, and legacy.
        </p>

        {/* Pool filter */}
        <div className="mt-6 flex items-center gap-2">
          <Filter className="h-4 w-4 text-olympus-subtle" />
          {["all", "A", "B"].map((pool) => (
            <button
              key={pool}
              type="button"
              onClick={() => setPoolFilter(pool)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                poolFilter === pool
                  ? "bg-olympus-gold/15 text-olympus-gold"
                  : "text-olympus-subtle hover:text-white hover:bg-white/5"
              }`}
            >
              {pool === "all" ? "All Teams" : `Pool ${pool}`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Card grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.06 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {filtered.map((franchise, i) => (
          <motion.div
            key={franchise.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <GlassCard
              variant="strong"
              tilt
              hover
              onClick={() => setSelectedFranchise(franchise)}
              className="group relative overflow-hidden p-5"
            >
              {/* Background glow */}
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: franchise.color }}
              />

              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <FranchiseEmblem franchise={franchise} size="md" />
                  <span className="rounded-full glass px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-olympus-muted">
                    Pool {franchise.pool}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-white">
                  {franchise.name}
                </h3>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-lg font-bold"
                      style={{ color: franchise.color }}
                    >
                      #{franchise.overallRank}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                      Rank
                    </span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white/80">
                      {franchise.roster.length}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                      Players
                    </span>
                  </div>
                </div>

                {/* Leader preview */}
                <div className="mt-4 flex items-center gap-2.5 rounded-xl glass-dark px-3 py-2.5">
                  <img
                    src={franchise.leader.image}
                    alt=""
                    className="h-8 w-8 rounded-lg border border-white/10 bg-olympus-surface object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white/90">
                      {franchise.leader.name}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                      {franchise.leader.role}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Modal */}
      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={!!selectedFranchise}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
