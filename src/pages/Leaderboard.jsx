import { useState } from "react";
import SportsLeaderboard from "../components/home/SportsLeaderboard";
import FranchiseModal from "../components/home/FranchiseModal";

export default function Leaderboard() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:px-8">
      <SportsLeaderboard onTeamClick={setSelectedFranchise} />

      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={Boolean(selectedFranchise)}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
