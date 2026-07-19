import { useState } from "react";
import { motion } from "framer-motion";
import FranchiseSlider from "../components/home/FranchiseSlider";
import SportsLeaderboard from "../components/home/SportsLeaderboard";
import ActionCards from "../components/home/ActionCards";
import FranchiseModal from "../components/home/FranchiseModal";
import QuickInfoPanel from "../components/home/QuickInfoPanel";
import StatsBar from "../components/home/StatsBar";
import RegisterCTA from "../components/home/RegisterCTA";
import { franchises } from "../data/mockData";

export default function Home() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFranchiseClick = (franchise) => {
    setSelectedFranchise(franchise);
    setModalOpen(true);
  };

  const handleTeamClick = (team) => {
    const fullFranchise = franchises.find((f) => f.id === team.id);
    if (fullFranchise) {
      setSelectedFranchise(fullFranchise);
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedFranchise(null), 200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-0 py-4 sm:space-y-14 sm:py-8 lg:space-y-16">

        {/* ═══ HERO SECTION ═══ */}
        <section className="text-center px-4 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-2 text-xs font-semibold tracking-[0.3em] sm:text-sm"
            style={{ color: "var(--color-accent-blue)" }}
          >
            ⚡ COLLEGE SPORTS FEST ⚡
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl tracking-wider sm:text-5xl lg:text-7xl"
            style={{ color: "var(--color-text-primary)" }}
          >
            CHOOSE YOUR
          </motion.h2>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-display text-4xl tracking-wider sm:text-5xl lg:text-7xl glow-blue-text"
            style={{ color: "var(--color-accent-blue)" }}
          >
            FRANCHISE
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-3 text-sm sm:text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Represent. Compete. Conquer.
          </motion.p>
        </section>

        {/* ═══ FRANCHISE CAROUSEL ═══ */}
        <section>
          <FranchiseSlider onFranchiseClick={handleFranchiseClick} />
        </section>

        {/* ═══ QUICK INFO PANEL (Rankings / Next Match / Stats) ═══ */}
        <section>
          <QuickInfoPanel />
        </section>

        {/* ═══ STATS BAR ═══ */}
        <section>
          <StatsBar />
        </section>

        {/* ═══ TOURNAMENT STANDINGS ═══ */}
        <section>
          <SportsLeaderboard onTeamClick={handleTeamClick} />
        </section>

        {/* ═══ REGISTER CTA ═══ */}
        <section>
          <RegisterCTA />
        </section>

        {/* ═══ ACTION CARDS ═══ */}
        <section>
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-5 px-4 text-center font-display text-sm tracking-[0.2em] sm:mb-6 sm:px-6 sm:text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            QUICK ACCESS
          </motion.h3>
          <ActionCards />
        </section>

        <div className="h-8" />
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
