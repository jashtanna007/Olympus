import { motion } from "framer-motion";
import { BarChart3, Swords, Handshake } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { franchises } from "../../data/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function QuickInfoPanel() {
  // Take top 4 franchises for rankings
  const topTeams = [...franchises].sort((a, b) => a.overallRank - b.overallRank).slice(0, 4);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid gap-4 sm:grid-cols-3"
    >
      {/* Rankings */}
      <motion.div variants={fadeUp}>
        <GlassCard variant="strong" className="h-full p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-gold/10">
              <BarChart3 className="h-4 w-4 text-olympus-gold" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Rankings
            </h3>
          </div>

          <div className="space-y-2.5">
            {topTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold"
                  style={{
                    color: team.color,
                    backgroundColor: `${team.color}18`,
                  }}
                >
                  {team.overallRank}
                </span>
                <span className="truncate text-xs font-medium text-white/90">
                  {team.name}
                </span>
                <div
                  className="ml-auto h-1 w-12 rounded-full"
                  style={{ backgroundColor: `${team.color}25` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${100 - (team.overallRank - 1) * 12}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Next match */}
      <motion.div variants={fadeUp}>
        <GlassCard variant="strong" className="h-full p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-blue/10">
              <Swords className="h-4 w-4 text-olympus-blue" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Next Match
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-center">
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${franchises[0].color}CC, ${franchises[0].color}66)`,
                  color: "#fff",
                }}
              >
                {franchises[0].short}
              </div>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-white/70">
                {franchises[0].name.split(" ")[0]}
              </p>
            </div>

            <div className="text-center">
              <p className="font-display text-lg font-bold text-olympus-gold">VS</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                Cricket · 3:00 PM
              </p>
            </div>

            <div className="text-center">
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${franchises[1].color}CC, ${franchises[1].color}66)`,
                  color: "#fff",
                }}
              >
                {franchises[1].short}
              </div>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-white/70">
                {franchises[1].name.split(" ")[0]}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Partners */}
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
