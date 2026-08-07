// Win-probability bar — a two-team split bar driven by the heuristic in
// cricketDerive (WIN_PROB_CONFIG). Clearly labelled as a live estimate.

import FranchiseEmblem from "../common/FranchiseEmblem";

export default function WinProbBar({ winProb, franchises, className = "" }) {
  if (!winProb) return null;
  const batting = franchises[winProb.battingFranchiseId];
  const bowling = franchises[winProb.bowlingFranchiseId];
  if (!batting || !bowling) return null;

  return (
    <div className={`rounded-2xl glass p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">
        <span>Win Probability</span>
        <span className="text-olympus-muted/60">Live estimate</span>
      </div>

      <div className="flex items-center justify-between text-xs font-bold text-white">
        <div className="flex items-center gap-2">
          <FranchiseEmblem franchise={batting} size="sm" className="!h-6 !w-6" />
          <span>{batting.short || batting.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{bowling.short || bowling.name}</span>
          <FranchiseEmblem franchise={bowling} size="sm" className="!h-6 !w-6" />
        </div>
      </div>

      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full bg-olympus-gold transition-all duration-500"
          style={{ width: `${winProb.battingPct}%` }}
        />
        <div
          className="h-full bg-olympus-blue transition-all duration-500"
          style={{ width: `${winProb.bowlingPct}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-sm font-extrabold">
        <span className="text-olympus-gold">{winProb.battingPct}%</span>
        <span className="text-olympus-blue">{winProb.bowlingPct}%</span>
      </div>
    </div>
  );
}
