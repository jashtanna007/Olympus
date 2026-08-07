// Live panel — the CREX-style "Live" tab: scoreline, batters at the crease,
// current bowler, this over, run rates, partnership, last wicket, projected
// score, and the win-probability bar.

import { motion } from "framer-motion";
import FranchiseEmblem from "../common/FranchiseEmblem";
import WinProbBar from "./WinProbBar";
import { Ball } from "./Scorecard";

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center rounded-xl glass px-3 py-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-muted">{label}</span>
      <span className={`font-display text-lg font-extrabold ${accent || "text-white"}`}>{value}</span>
    </div>
  );
}

export default function LivePanel({ derived, franchises }) {
  const inn = derived.current;
  if (!inn) return null;
  const battingF = franchises[inn.battingFranchiseId];
  const bowlingF = franchises[inn.bowlingFranchiseId];

  const striker = inn.battingCard.find((b) => b.onStrike);
  const nonStriker = inn.battingCard.find((b) => b.isBatting && !b.onStrike);
  const bowler = inn.bowlingCard.find((b) => b.isCurrent);

  return (
    <div className="space-y-4">
      {/* Scoreline */}
      <div className="rounded-2xl glass-strong p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {battingF && <FranchiseEmblem franchise={battingF} size="md" />}
            <div>
              <p className="font-display text-sm font-bold text-white">{battingF?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-olympus-gold">Batting</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-white">
              {inn.runs}
              <span className="text-olympus-muted">/{inn.wickets}</span>
            </p>
            <p className="text-xs text-olympus-muted">({inn.oversText} ov)</p>
          </div>
        </div>

        {inn.target != null && (
          <div className="mt-3 rounded-xl bg-olympus-blue/10 px-3 py-2 text-center text-xs text-white">
            Target <span className="font-bold text-olympus-blue">{inn.target}</span> · Need{" "}
            <span className="font-bold text-white">{inn.runsNeeded}</span> off{" "}
            <span className="font-bold text-white">{inn.ballsLeft}</span> balls
          </div>
        )}
      </div>

      {/* Batters */}
      <div className="grid grid-cols-2 gap-3">
        {[striker, nonStriker].filter(Boolean).map((b) => (
          <div key={b.id} className={`rounded-2xl glass p-3 ${b.onStrike ? "ring-1 ring-olympus-gold/40" : ""}`}>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-white">{b.name}</span>
              {b.onStrike && <span className="text-olympus-gold">*</span>}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-xl font-extrabold text-white">{b.runs}</span>
              <span className="text-xs text-olympus-muted">({b.balls})</span>
              <span className="ml-auto text-[10px] text-olympus-muted">
                4s {b.fours} · 6s {b.sixes} · SR {b.sr.toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bowler + this over */}
      <div className="rounded-2xl glass p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-olympus-muted">Bowler</p>
            <p className="text-sm font-bold text-white">{bowler?.name || "—"}</p>
          </div>
          <div className="text-right text-xs text-olympus-muted">
            {bowler ? `${bowler.overs}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}` : ""}
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-olympus-muted">This Over</p>
          <div className="flex flex-wrap gap-1.5">
            {inn.thisOver.length ? (
              inn.thisOver.map((b) => <Ball key={b.id} token={b.token} isWicket={b.isWicket} />)
            ) : (
              <span className="text-xs text-olympus-muted">New over</span>
            )}
          </div>
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="CRR" value={inn.crr.toFixed(2)} accent="text-olympus-gold" />
        <Stat label={inn.rrr != null ? "RRR" : "Projected"} value={inn.rrr != null ? inn.rrr.toFixed(2) : inn.projected} accent="text-olympus-blue" />
        <Stat label="Partnership" value={`${inn.currentPartnership.runs}(${inn.currentPartnership.balls})`} />
      </div>

      {inn.lastWicket && (
        <div className="rounded-2xl glass p-3 text-xs">
          <span className="font-bold uppercase tracking-wider text-rose-400">Last wkt: </span>
          <span className="text-white">
            {inn.lastWicket.player} — {inn.lastWicket.score}/{inn.lastWicket.wicket} ({inn.lastWicket.over})
          </span>
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <WinProbBar winProb={derived.winProb} franchises={franchises} />
      </motion.div>
    </div>
  );
}
