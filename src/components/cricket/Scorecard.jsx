// Batting + bowling scorecards and extras/FoW summary for one innings.

function Ball({ token, isWicket }) {
  const style = isWicket
    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
    : token === "4"
      ? "bg-olympus-gold/20 text-olympus-gold border-olympus-gold/40"
      : token === "6"
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
        : token === "0"
          ? "bg-white/5 text-olympus-muted border-white/10"
          : "bg-white/[0.07] text-white border-white/15";
  return (
    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold ${style}`}>
      {token}
    </span>
  );
}

export function BattingCard({ innings }) {
  return (
    <div className="overflow-hidden rounded-2xl glass">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
        <span>Batter</span>
        <span className="w-8 text-right">R</span>
        <span className="w-8 text-right">B</span>
        <span className="w-8 text-right">4s</span>
        <span className="w-8 text-right">6s</span>
        <span className="w-12 text-right">SR</span>
      </div>
      {innings.battingCard.map((b) => (
        <div
          key={b.id}
          className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm ${
            b.isBatting ? "bg-olympus-gold/[0.04]" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-white">{b.name}</span>
              {b.onStrike && <span className="text-olympus-gold">*</span>}
            </div>
            <span className="text-[10px] text-olympus-muted">{b.outText}</span>
          </div>
          <span className="w-8 text-right font-bold text-white">{b.runs}</span>
          <span className="w-8 text-right text-olympus-muted">{b.balls}</span>
          <span className="w-8 text-right text-olympus-muted">{b.fours}</span>
          <span className="w-8 text-right text-olympus-muted">{b.sixes}</span>
          <span className="w-12 text-right text-olympus-muted">{b.sr.toFixed(1)}</span>
        </div>
      ))}

      <div className="flex items-center justify-between px-4 py-2.5 text-xs">
        <span className="font-bold uppercase tracking-wider text-olympus-muted">Extras</span>
        <span className="text-white">
          {innings.extras.total}{" "}
          <span className="text-olympus-muted">
            (wd {innings.extras.wide}, nb {innings.extras.noball}, b {innings.extras.bye}, lb {innings.extras.legbye})
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <span className="font-display text-sm font-bold uppercase tracking-wider text-white">Total</span>
        <span className="font-display text-lg font-extrabold text-olympus-gold">
          {innings.runs}/{innings.wickets}{" "}
          <span className="text-sm text-olympus-muted">({innings.oversText} ov)</span>
        </span>
      </div>

      {innings.yetToBat.length > 0 && (
        <div className="border-t border-white/10 px-4 py-2.5 text-xs">
          <span className="font-bold uppercase tracking-wider text-olympus-muted">Yet to bat: </span>
          <span className="text-white/70">{innings.yetToBat.map((p) => p.name).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

export function BowlingCard({ innings }) {
  return (
    <div className="overflow-hidden rounded-2xl glass">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
        <span>Bowler</span>
        <span className="w-10 text-right">O</span>
        <span className="w-8 text-right">M</span>
        <span className="w-8 text-right">R</span>
        <span className="w-8 text-right">W</span>
        <span className="w-12 text-right">Econ</span>
      </div>
      {innings.bowlingCard.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-olympus-muted">No bowling yet.</div>
      )}
      {innings.bowlingCard.map((b) => (
        <div
          key={b.id}
          className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm ${
            b.isCurrent ? "bg-olympus-blue/[0.05]" : ""
          }`}
        >
          <span className="truncate font-semibold text-white">{b.name}</span>
          <span className="w-10 text-right text-olympus-muted">{b.overs}</span>
          <span className="w-8 text-right text-olympus-muted">{b.maidens}</span>
          <span className="w-8 text-right text-olympus-muted">{b.runs}</span>
          <span className="w-8 text-right font-bold text-white">{b.wickets}</span>
          <span className="w-12 text-right text-olympus-muted">{b.econ.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export function FallOfWickets({ innings }) {
  if (!innings.fallOfWickets.length) return null;
  return (
    <div className="rounded-2xl glass p-4">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">Fall of Wickets</h4>
      <div className="flex flex-wrap gap-2">
        {innings.fallOfWickets.map((w) => (
          <span key={w.wicket} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs">
            <span className="font-bold text-white">{w.score}</span>
            <span className="text-olympus-muted"> - {w.wicket} ({w.player}, {w.over})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export { Ball };
