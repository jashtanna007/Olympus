import { useState } from "react";
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
      {/* Torch stripe — signature diagonal accent */}
      <div
        className="torch-stripe"
        style={{ top: "-80px", right: "10%", opacity: 0.7 }}
      />
      <div
        className="torch-stripe"
        style={{ top: "200px", left: "-40px", opacity: 0.4, width: "80px" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-0 py-8 sm:space-y-14 sm:py-12 lg:space-y-16">
        {/* Hero — Franchise Slider */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 sm:mb-6"
          >
            <h2 className="font-display text-3xl tracking-wider sm:text-4xl lg:text-5xl" style={{ color: "var(--color-cream)" }}>
              THE <span style={{ color: "var(--color-flame)" }}>OLYMPUS</span> ARENA
            </h2>
            <p className="mt-2 text-sm sm:text-base" style={{ color: "var(--color-stone)" }}>
              IIIT Vadodara Inter-College Sports Fest
            </p>
          </motion.div>

          <FranchiseSlider onFranchiseClick={handleFranchiseClick} />
        </section>

        {/* Unified Leaderboard — Sport tabs + Overall */}
        <section>
          <SportsLeaderboard onTeamClick={handleTeamClick} />
        </section>

        {/* Action Cards */}
        <section>
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-5 px-4 text-center font-display text-sm tracking-[0.2em] sm:mb-6 sm:px-6 sm:text-base"
            style={{ color: "var(--color-stone)" }}
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
