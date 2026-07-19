import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import FranchiseSlider from "../components/home/FranchiseSlider";
import SportsLeaderboard from "../components/home/SportsLeaderboard";
import ActionCards from "../components/home/ActionCards";
import FranchiseModal from "../components/home/FranchiseModal";
import { franchises } from "../data/mockData";

export default function Home() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFranchiseClick = (franchise) => {
    setSelectedFranchise(franchise);
    setModalOpen(true);
  };

  // Handle clicks from leaderboard rows — find the full franchise object by id
  const handleTeamClick = (team) => {
    const fullFranchise = franchises.find((f) => f.id === team.id);
    if (fullFranchise) {
      setSelectedFranchise(fullFranchise);
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Delay clearing franchise data so exit animation plays
    setTimeout(() => setSelectedFranchise(null), 200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient glow orbs */}
      <motion.div
        className="pointer-events-none absolute -right-60 top-20 h-[600px] w-[600px] rounded-full opacity-10 blur-[140px]"
        style={{ background: "radial-gradient(circle, #00f0ff, transparent 70%)" }}
        animate={{ opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -left-60 bottom-40 h-[500px] w-[500px] rounded-full opacity-10 blur-[120px]"
        style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }}
        animate={{ opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-0 py-8 sm:space-y-14 sm:py-12 lg:space-y-16">
        {/* Hero — 3D Franchise Slider */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 sm:mb-6"
          >
            <h2 className="font-display text-2xl font-bold tracking-wider text-white sm:text-3xl lg:text-4xl">
              The <span className="text-glow-cyan text-neon-cyan">Arena</span> Awaits
            </h2>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Choose your franchise. Dominate the tournament.
            </p>
          </motion.div>

          <FranchiseSlider onFranchiseClick={handleFranchiseClick} />
        </section>

        {/* Sports-wise Team Leaderboard */}
        <section>
          <SportsLeaderboard onTeamClick={handleTeamClick} />
        </section>

        {/* Action Cards */}
        <section>
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-5 px-4 text-center font-display text-xs font-semibold tracking-[0.3em] text-slate-500 sm:mb-6 sm:px-6 sm:text-sm"
          >
            QUICK ACCESS
          </motion.h3>
          <ActionCards />
        </section>

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>

      {/* Franchise Detail Modal */}
      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={modalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
