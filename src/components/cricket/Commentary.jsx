// Commentary + over-by-over tabs, derived from the delivery log.

import { ballToken } from "../../lib/cricketDerive";

export function Commentary({ deliveries, players }) {
  const nameOf = (id) => players[id]?.full_name || "—";
  const ordered = deliveries.slice().sort((a, b) => b.global_seq - a.global_seq);

  if (!ordered.length) {
    return <div className="rounded-2xl glass p-6 text-center text-sm text-olympus-muted">No commentary yet.</div>;
  }

  return (
    <div className="space-y-2">
      {ordered.map((d) => (
        <div key={d.id} className="flex items-start gap-3 rounded-2xl glass p-3">
          <span
            className={`mt-0.5 inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border px-1.5 text-xs font-bold ${
              d.is_wicket
                ? "border-rose-500/40 bg-rose-500/20 text-rose-400"
                : d.runs_batter === 4 || d.runs_batter === 6
                  ? "border-olympus-gold/40 bg-olympus-gold/20 text-olympus-gold"
                  : "border-white/15 bg-white/[0.06] text-white"
            }`}
          >
            {ballToken(d)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">
              {d.over_number}.{d.ball_in_over} · {nameOf(d.bowler_id)} to {nameOf(d.striker_id)}
            </p>
            <p className="text-xs text-olympus-muted">{d.commentary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OversList({ derived, players }) {
  const nameOf = (id) => players[id]?.full_name || "—";
  const inn = derived.current;
  if (!inn || !inn.manhattan.length) {
    return <div className="rounded-2xl glass p-6 text-center text-sm text-olympus-muted">No overs bowled yet.</div>;
  }

  return (
    <div className="space-y-2">
      {inn.manhattan
        .slice()
        .reverse()
        .map((o) => (
          <div key={o.over} className="flex items-center justify-between rounded-2xl glass p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-olympus-muted">Over {o.over}</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white">
                <span className="font-bold text-olympus-gold">{o.runs}</span> runs
              </span>
              {o.wickets > 0 && <span className="text-rose-400">{o.wickets} wkt</span>}
            </div>
          </div>
        ))}
    </div>
  );
}
