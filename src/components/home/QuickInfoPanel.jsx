import { motion } from "framer-motion";
import { Gavel, Handshake, Shield } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import FranchiseEmblem from "../common/FranchiseEmblem";
import { franchises } from "../../data/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function QuickInfoPanel() {
  const featuredFranchises = [...franchises]
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid gap-4 sm:grid-cols-3"
    >
      <motion.div variants={fadeUp}>
        <GlassCard variant="strong" className="h-full p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-gold/10">
              <Shield className="h-4 w-4 text-olympus-gold" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Franchise Lineup
            </h3>
          </div>

          <div className="space-y-2.5">
            {featuredFranchises.map((franchise) => (
              <div key={franchise.id} className="flex items-center gap-3">
                <FranchiseEmblem franchise={franchise} size="sm" />
                <div className="min-w-0">
                  <span className="block truncate text-xs font-medium text-white/90">
                    {franchise.name}
                  </span>
                  <span className="block truncate text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                    {franchise.leader.name}
                  </span>
                </div>
                <span className="ml-auto text-[9px] font-black text-olympus-gold">
                  {franchise.short}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard variant="strong" className="h-full p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-blue/10">
              <Gavel className="h-4 w-4 text-olympus-blue" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Auction Status
            </h3>
          </div>

          <div className="flex h-[calc(100%-3rem)] min-h-36 flex-col items-center justify-center rounded-2xl glass-dark px-5 text-center">
            <Gavel className="h-7 w-7 text-olympus-gold/70" />
            <strong className="mt-3 text-sm text-white/90">
              Leaders confirmed
            </strong>
            <p className="mt-2 text-xs leading-relaxed text-olympus-subtle">
              Pools and player rosters will be published after the auction.
            </p>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard variant="strong" className="h-full p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-success/10">
              <Handshake className="h-4 w-4 text-olympus-success" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Partners
            </h3>
          </div>

          <div className="space-y-3">
            {["IIIT Vadodara", "DIU Sports Club", "Student Council"].map(
              (partner) => (
                <div
                  key={partner}
                  className="flex items-center gap-3 rounded-xl glass-dark px-3 py-2.5"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-white/10 to-white/5" />
                  <span className="text-xs font-medium text-white/80">
                    {partner}
                  </span>
                </div>
              )
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
