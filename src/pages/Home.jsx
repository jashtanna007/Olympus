import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Trophy, Users, Calendar, Award } from "lucide-react";
import MagneticButton from "../components/ui/MagneticButton";
import FranchiseSlider from "../components/home/FranchiseSlider";
import FranchiseModal from "../components/home/FranchiseModal";
import QuickInfoPanel from "../components/home/QuickInfoPanel";
import RegisterCTA from "../components/home/RegisterCTA";

export default function Home() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  const heroStats = [
    { label: "Franchises", value: "8", icon: Shield },
    { label: "Events / Sports", value: "9", icon: Trophy },
    { label: "Participants", value: "300+", icon: Users },
    { label: "Days of Glory", value: "5", icon: Calendar },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* ═══ 2-Column Split Hero (Left: Text & Stats, Right: 3D Franchise Cards) ═══ */}
      <section className="relative min-h-[85vh] pt-6 pb-12 sm:pt-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Column: Hero Copy & CTA */}
          <div className="flex flex-col items-start justify-center lg:col-span-5">
            
            {/* Live Eyebrow Badge */}
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

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-6 font-display text-5xl font-black leading-[1.05] text-white sm:text-6xl lg:text-7xl"
            >
              ONE FEST.
              <br />
              MANY <span className="text-gradient-gold">LEGACIES.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-5 text-base leading-relaxed text-olympus-muted sm:text-lg"
            >
              Elite franchises. Epic battles. Unforgettable moments.
              <br />
              The ultimate inter-college sports championship.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <MagneticButton
                variant="gold"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("teams-slider");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explore Franchises
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </motion.div>

            {/* Integrated Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="mt-12 grid w-full grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4"
            >
              {heroStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1.5 text-olympus-gold">
                      <Icon className="h-4 w-4 opacity-80" />
                      <span className="font-display text-2xl font-black text-white">
                        {stat.value}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Right Column: 3D Franchise Cards Slider */}
          <motion.div
            id="teams-slider"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="w-full lg:col-span-7"
          >
            <div className="relative rounded-3xl p-2 sm:p-4">
              <FranchiseSlider onFranchiseClick={setSelectedFranchise} />
            </div>
          </motion.div>

        </div>
      </section>

      {/* ═══ Quick Info Section ═══ */}
      <section className="cv-auto py-8">
        <QuickInfoPanel />
      </section>

      {/* ═══ Register CTA ═══ */}
      <section className="cv-auto py-8 pb-16">
        <RegisterCTA />
      </section>

      {/* Franchise Detail Modal */}
      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={!!selectedFranchise}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
