import { useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import FranchiseModal from "../components/home/FranchiseModal";
import { franchises } from "../data/mockData";

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Franchises() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
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
        <p className="mt-2 max-w-2xl text-olympus-muted">
          Meet the eight official franchises and their leaders. Pools and player
          rosters will be published after the auction.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.06 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {franchises.map((franchise, index) => (
          <motion.div
            key={franchise.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <GlassCard
              variant="strong"
              tilt
              hover
              onClick={() => setSelectedFranchise(franchise)}
              className="group relative overflow-hidden p-5"
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: franchise.color }}
              />

              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <FranchiseEmblem franchise={franchise} size="lg" />
                  <span className="rounded-full glass px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-olympus-muted">
                    {franchise.short}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-white">
                  {franchise.name}
                </h3>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-olympus-subtle">
                  Official franchise
                </p>

                <div className="mt-4 flex items-center gap-2.5 rounded-xl glass-dark px-3 py-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                    style={{
                      color: franchise.color,
                      backgroundColor: `${franchise.color}18`,
                    }}
                  >
                    {getInitials(franchise.leader.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white/90">
                      {franchise.leader.name}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                      Franchise leader
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
                  <span>Roll {franchise.leader.rollNumber}</span>
                  <span>Roster pending</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={!!selectedFranchise}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
