import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Shield } from "lucide-react";
import MagneticButton from "../components/ui/MagneticButton";
import FranchiseSlider from "../components/home/FranchiseSlider";
import FranchiseModal from "../components/home/FranchiseModal";
import QuickInfoPanel from "../components/home/QuickInfoPanel";
import StatsBar from "../components/home/StatsBar";
import RegisterCTA from "../components/home/RegisterCTA";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* ═══ Hero ═══ */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center pt-24 text-center sm:pt-28">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2">
            <Shield className="h-3.5 w-3.5 text-olympus-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-gold">
              Season 2026 — Now Live
            </span>
            <span className="live-dot h-2 w-2 rounded-full bg-olympus-success" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-8 font-display text-5xl font-bold leading-[1.1] sm:text-7xl lg:text-8xl"
        >
          <span className="text-gradient-white">Choose Your</span>
          <br />
          <span className="text-gradient-gold">Franchise</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-5 max-w-lg text-base text-olympus-muted sm:text-lg"
        >
          8 elite franchises. 11 sports. 5 days of glory.
          <br className="hidden sm:block" />
          The ultimate inter-college sports championship.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex items-center gap-3"
        >
          <MagneticButton variant="gold" size="lg">
            Enter the Arena
            <ArrowUpRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="outline" size="lg">
            View Schedule
          </MagneticButton>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-14 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-olympus-subtle">
            Explore teams
          </span>
          <div className="h-8 w-px bg-gradient-to-b from-olympus-gold/50 to-transparent" />
        </motion.div>
      </section>

      {/* ═══ Franchise Slider ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="py-12"
      >
        <div className="mb-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-olympus-gold">
            Meet the Teams
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            8 Elite Franchises
          </h2>
        </div>

        <FranchiseSlider onFranchiseClick={setSelectedFranchise} />
      </motion.section>

      {/* ═══ Quick Info ═══ */}
      <section className="cv-auto py-8">
        <QuickInfoPanel />
      </section>

      {/* ═══ Stats ═══ */}
      <section className="cv-auto py-8">
        <StatsBar />
      </section>

      {/* ═══ Register CTA ═══ */}
      <section className="cv-auto py-8 pb-16">
        <RegisterCTA />
      </section>

      {/* Franchise Modal */}
      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={!!selectedFranchise}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
