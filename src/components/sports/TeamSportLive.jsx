// Live scorecard views for ALL non-cricket sports.
// Rendered inside MatchLive when match.sport isn't Cricket. Pure presentational
// — data comes from useTeamSportMatch via the `derived` prop.
// Exports: per-sport Live, per-sport Scorecard, SportSquadView, SportInfoView,
//          default dispatcher (TeamSportLive → Live tab).

import { Calendar, MapPin, Trophy, Shirt, Flag, Timer, Zap, Shield,
         Swords, Crown, Target, Clock, Dumbbell } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";

/* ────────────────────────────────────────────────────────── */
/*  Shared atoms                                               */
/* ────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    live: { label: "LIVE", cls: "bg-olympus-success/15 text-olympus-success", dot: true },
    completed: { label: "RESULT", cls: "bg-white/10 text-white/70" },
    abandoned: { label: "ABANDONED", cls: "bg-white/10 text-white/40" },
    scheduled: { label: "UPCOMING", cls: "bg-olympus-blue/15 text-olympus-blue" },
  };
  const s = map[status] || map.scheduled;
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.dot && <span className="live-dot h-1.5 w-1.5 rounded-full bg-olympus-success" />}
      {s.label}
    </span>
  );
}

function MatchMeta({ match }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-olympus-muted">
      {match.scheduled_at && (
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-olympus-gold" />
          {new Date(match.scheduled_at).toLocaleString()}
        </span>
      )}
      {match.venue && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-olympus-blue" />
          {match.venue}
        </span>
      )}
    </div>
  );
}

function ResultBanner({ match, franchises }) {
  if (match.status !== "completed") return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-olympus-gold/10 px-3 py-2 text-sm font-bold text-olympus-gold">
      <Trophy className="h-4 w-4" />
      {match.is_tie
        ? "Match Drawn"
        : `${franchises[match.winner_franchise_id]?.name || ""} ${match.result_summary || ""}`}
    </div>
  );
}

function Scoreshell({ match, franchises, children, scoreLeft, scoreRight, center, subLeft, subRight }) {
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="rounded-2xl glass-strong p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-center">
        <StatusPill status={match.status} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          {fa && <FranchiseEmblem franchise={fa} size="md" />}
          <span className="max-w-[90px] truncate text-center text-[10px] font-bold text-white sm:text-xs">{fa?.name}</span>
          <span className="font-display text-2xl font-extrabold text-white sm:text-3xl">{scoreLeft}</span>
          {subLeft && <span className="text-[10px] text-olympus-muted">{subLeft}</span>}
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <span className="font-display text-xs font-bold text-olympus-muted">vs</span>
          {center}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5">
          {fb && <FranchiseEmblem franchise={fb} size="md" />}
          <span className="max-w-[90px] truncate text-center text-[10px] font-bold text-white sm:text-xs">{fb?.name}</span>
          <span className="font-display text-2xl font-extrabold text-white sm:text-3xl">{scoreRight}</span>
          {subRight && <span className="text-[10px] text-olympus-muted">{subRight}</span>}
        </div>
      </div>
      <MatchMeta match={match} />
      <ResultBanner match={match} franchises={franchises} />
      {children}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl glass p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">
        {Icon && <Icon className="h-3.5 w-3.5 text-olympus-gold" />} {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm border-b border-white/[0.06] last:border-0">
      <span className="text-olympus-muted">{label}</span>
      <span className="font-semibold capitalize text-white">{value}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Football                                                   */
/* ────────────────────────────────────────────────────────── */
const FOOTBALL_EVENT_META = {
  goal: { label: "Goal", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  pen_goal: { label: "Pen Goal", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  pen_miss: { label: "Pen Miss", cls: "border-rose-500/40 bg-rose-500/10 text-rose-400" },
  own_goal: { label: "Own Goal", cls: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
  yellow: { label: "Yellow Card", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
  red: { label: "Red Card", cls: "border-rose-500/40 bg-rose-500/10 text-rose-400" },
  sub: { label: "Substitution", cls: "border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue" },
};

export function FootballLive({ match, franchises, derived }) {
  const { scoreA = 0, scoreB = 0, penScoreA = 0, penScoreB = 0, hasPenalties = false } = derived;
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={scoreA} scoreRight={scoreB}
        subLeft={hasPenalties ? `(${penScoreA} pens)` : undefined}
        subRight={hasPenalties ? `(${penScoreB} pens)` : undefined}
      >
        {hasPenalties && (
          <div className="mt-3 rounded-xl bg-olympus-gold/10 px-3 py-2 text-center text-xs font-bold text-olympus-gold">
            Penalties: {penScoreA} – {penScoreB}
          </div>
        )}
      </Scoreshell>
      <FootballTimeline derived={derived} franchises={franchises} />
    </div>
  );
}

export function FootballTimeline({ derived, franchises }) {
  const { timeline = [] } = derived;
  return (
    <SectionCard icon={Timer} title="Match Timeline">
      {timeline.length === 0 ? (
        <p className="text-center text-xs text-olympus-muted">No events yet.</p>
      ) : (
        <div className="space-y-2">
          {timeline.map((e) => {
            const meta = FOOTBALL_EVENT_META[e.type] || FOOTBALL_EVENT_META.goal;
            const team = franchises[e.team_franchise_id];
            const isPenalty = e.type === "pen_goal" || e.type === "pen_miss" || e.minute >= 121;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="w-10 shrink-0 text-center font-display text-sm font-bold text-olympus-gold">
                  {isPenalty ? "Pen" : `${e.minute}'`}
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {e.player_name || team?.short || team?.name || "—"}
                  </p>
                  {e.assist_name && <p className="truncate text-[10px] text-olympus-muted">Assist: {e.assist_name}</p>}
                </div>
                {team && <span className="shrink-0 text-[10px] font-bold text-olympus-muted">{team.short}</span>}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

export function FootballScorecard({ match, franchises, derived }) {
  const { timeline = [], penScoreA = 0, penScoreB = 0, hasPenalties = false } = derived;
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];

  const scorer = {};
  const carder = {};
  const penGoals = { a: [], b: [] };
  const penMisses = { a: [], b: [] };

  timeline.forEach((e) => {
    if ((e.type === "goal" || e.type === "pen_goal") && e.player_name && e.minute < 121) {
      scorer[e.player_name] = (scorer[e.player_name] || 0) + 1;
    }
    if ((e.type === "yellow" || e.type === "red") && e.player_name) {
      carder[e.player_name] = [...(carder[e.player_name] || []), e.type];
    }
    if (e.type === "pen_goal" || e.minute >= 121) {
      const key = e.team_franchise_id === match.franchise_a_id ? "a" : "b";
      if (e.type === "pen_miss") penMisses[key].push(e.player_name || "—");
      else penGoals[key].push(e.player_name || "—");
    }
  });

  return (
    <div className="space-y-4">
      <SectionCard icon={Target} title="Goalscorers">
        {Object.keys(scorer).length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No goals recorded with names.</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(scorer).map(([name, n]) => (
              <div key={name} className="flex justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="font-semibold text-white">{name}</span>
                <span className="font-display font-bold text-olympus-gold">{n}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {hasPenalties && (
        <SectionCard icon={Target} title="Penalty Shootout">
          <div className="grid grid-cols-2 gap-3">
            {[{ label: fa?.short, g: penGoals.a, m: penMisses.a, score: penScoreA },
              { label: fb?.short, g: penGoals.b, m: penMisses.b, score: penScoreB }].map(({ label, g, m, score }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-center text-xs font-bold text-white">{label}</p>
                <p className="text-center font-display text-2xl font-extrabold text-olympus-gold">{score}</p>
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {g.map((n, i) => <span key={`g${i}`} className="h-5 w-5 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]">✓</span>)}
                  {m.map((n, i) => <span key={`m${i}`} className="h-5 w-5 flex items-center justify-center rounded-full bg-rose-500/15 text-rose-400 text-[10px]">✗</span>)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {Object.keys(carder).length > 0 && (
        <SectionCard icon={Shield} title="Cards">
          <div className="space-y-1.5">
            {Object.entries(carder).map(([name, cards]) => (
              <div key={name} className="flex justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="font-semibold text-white">{name}</span>
                <div className="flex gap-1">
                  {cards.map((c, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${c === "yellow" ? "bg-yellow-500/20 text-yellow-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {c === "yellow" ? "Y" : "R"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Volleyball                                                 */
/* ────────────────────────────────────────────────────────── */
export function VolleyballLive({ match, franchises, derived }) {
  const { sets = [], current = { set: 1, a: 0, b: 0 }, setsWonA = 0, setsWonB = 0,
    pointsPerSet = 25, finalSetPoints = 15, numSets = 3, isDeuce = false } = derived;
  const isFinalSet = current.set >= numSets;
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={`${setsWonA}`} scoreRight={`${setsWonB}`}
        center={
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            Set {current.set}{isFinalSet ? " (Final)" : ""}
          </span>
        }
      >
        <div className="mt-4 rounded-xl bg-[#0C1120] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Current set</p>
          <p className="font-display text-2xl font-extrabold text-white">
            {current.a} <span className="text-olympus-muted">–</span> {current.b}
            <span className="ml-1 text-sm font-normal text-white/30">/ {isFinalSet ? finalSetPoints : pointsPerSet}</span>
          </p>
          {isDeuce && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-olympus-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-olympus-gold">
              <Zap className="h-3 w-3" /> Deuce
            </span>
          )}
        </div>
      </Scoreshell>

      <SectionCard icon={Flag} title="Sets">
        {sets.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No points scored yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sets.map((s) => (
              <div key={s.set} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-xs font-bold text-olympus-muted">Set {s.set}{s.set >= numSets ? " ★" : ""}</span>
                <span className="font-display font-bold text-white">
                  <span className={s.winner === match.franchise_a_id ? "text-olympus-gold" : ""}>{s.a}</span>
                  <span className="mx-1.5 text-olympus-muted">–</span>
                  <span className={s.winner === match.franchise_b_id ? "text-olympus-gold" : ""}>{s.b}</span>
                </span>
                <span className="text-[10px] font-bold uppercase text-olympus-muted">{s.finished ? "Done" : "Live"}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function VolleyballScorecard({ match, franchises, derived }) {
  const { sets = [], setsWonA = 0, setsWonB = 0, pointsPerSet = 25, numSets = 3, finalSetPoints = 15 } = derived;
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl glass p-4 overflow-x-auto">
        <table className="w-full min-w-[300px] text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              <th className="pb-2 text-left">Team</th>
              {sets.map((s) => <th key={s.set} className="pb-2 text-center">Set {s.set}{s.set >= numSets ? "★" : ""}</th>)}
              <th className="pb-2 text-right text-olympus-gold">Sets Won</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            <tr>
              <td className="py-2 font-bold text-white">{fa?.short || fa?.name}</td>
              {sets.map((s) => <td key={s.set} className={`py-2 text-center font-bold ${s.winner === match.franchise_a_id ? "text-olympus-gold" : "text-white"}`}>{s.a}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{setsWonA}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-white">{fb?.short || fb?.name}</td>
              {sets.map((s) => <td key={s.set} className={`py-2 text-center font-bold ${s.winner === match.franchise_b_id ? "text-olympus-gold" : "text-white"}`}>{s.b}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{setsWonB}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-[11px] text-olympus-muted">
        Sets 1–{numSets - 1}: first to {pointsPerSet} · Final set: first to {finalSetPoints} · Deuce rule (win by 2) applies
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Basketball                                                 */
/* ────────────────────────────────────────────────────────── */
export function BasketballLive({ match, franchises, derived }) {
  const { scoreA = 0, scoreB = 0, quarters = [], currentQuarter = 1, numQuarters = 4,
    inOvertime, foulsA = 0, foulsB = 0 } = derived;
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={scoreA} scoreRight={scoreB}
        subLeft={`${foulsA} foul${foulsA === 1 ? "" : "s"}`}
        subRight={`${foulsB} foul${foulsB === 1 ? "" : "s"}`}
        center={
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            {inOvertime ? `OT ${currentQuarter - numQuarters}` : `Q${currentQuarter}`}
          </span>
        }
      />

      <SectionCard icon={Shirt} title="Quarter Scores">
        {quarters.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No baskets yet.</p>
        ) : (
          <div className="space-y-1.5">
            {quarters.map((q) => (
              <div key={q.quarter} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-xs font-bold text-olympus-muted">
                  {q.quarter > numQuarters ? `OT ${q.quarter - numQuarters}` : `Q${q.quarter}`}
                </span>
                <span className="font-display font-bold text-white">{q.a} <span className="text-olympus-muted">–</span> {q.b}</span>
                <span className="text-[10px] font-bold uppercase text-olympus-muted">
                  {q.quarter === currentQuarter && match.status === "live" ? "Live" : "Done"}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function BasketballScorecard({ match, franchises, derived }) {
  const { quarters = [], scoreA = 0, scoreB = 0, numQuarters = 4 } = derived;
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="rounded-2xl glass p-4 overflow-x-auto">
      <table className="w-full min-w-[300px] text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <th className="pb-2 text-left">Team</th>
            {quarters.map((q) => <th key={q.quarter} className="pb-2 text-center">{q.quarter > numQuarters ? `OT${q.quarter - numQuarters}` : `Q${q.quarter}`}</th>)}
            <th className="pb-2 text-right text-olympus-gold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          <tr>
            <td className="py-2 font-bold text-white">{fa?.short || fa?.name}</td>
            {quarters.map((q) => <td key={q.quarter} className="py-2 text-center text-white">{q.a}</td>)}
            <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{scoreA}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold text-white">{fb?.short || fb?.name}</td>
            {quarters.map((q) => <td key={q.quarter} className="py-2 text-center text-white">{q.b}</td>)}
            <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{scoreB}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


/* ────────────────────────────────────────────────────────── */
/*  Rally sports (Badminton / Table Tennis)                    */
/* ────────────────────────────────────────────────────────── */
export function RallySportLive({ match, franchises, derived }) {
  const { games = [], current = { a: 0, b: 0 }, gamesWonA = 0, gamesWonB = 0,
    target, cap, numGames = 3, isDeuce, isMatchPoint } = derived || {};
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={gamesWonA} scoreRight={gamesWonB}
        center={
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            Game {current.game ?? 1}
          </span>
        }
      >
        <div className="mt-4 rounded-xl bg-[#0C1120] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Current game</p>
          <p className="font-display text-2xl font-extrabold text-white">
            {current.a} <span className="text-olympus-muted">–</span> {current.b}
            <span className="ml-1 text-sm font-normal text-white/30">/ {target}</span>
          </p>
          {isDeuce && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-olympus-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-olympus-gold">
              <Zap className="h-3 w-3" /> Deuce{cap ? ` · cap ${cap}` : ""}
            </span>
          )}
          {isMatchPoint && !isDeuce && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
              Match Point!
            </span>
          )}
        </div>
      </Scoreshell>

      <SectionCard icon={Flag} title="Games">
        {games.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No points scored yet.</p>
        ) : (
          <div className="space-y-1.5">
            {games.map((g) => (
              <div key={g.game} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-xs font-bold text-olympus-muted">Game {g.game}</span>
                <span className="font-display font-bold text-white">
                  <span className={g.winner === match.franchise_a_id ? "text-olympus-gold" : ""}>{g.a}</span>
                  <span className="mx-1.5 text-olympus-muted">–</span>
                  <span className={g.winner === match.franchise_b_id ? "text-olympus-gold" : ""}>{g.b}</span>
                </span>
                <span className="text-[10px] font-bold uppercase text-olympus-muted">{g.finished ? "Done" : "Live"}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function RallySportScorecard({ match, franchises, derived }) {
  const { games = [], gamesWonA = 0, gamesWonB = 0, numGames = 3, target } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl glass p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              <th className="pb-2 text-left">Team</th>
              {games.map((g) => <th key={g.game} className="pb-2 text-center">G{g.game}</th>)}
              <th className="pb-2 text-right text-olympus-gold">Games Won</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            <tr>
              <td className="py-2 font-bold text-white">{fa?.short || fa?.name}</td>
              {games.map((g) => <td key={g.game} className={`py-2 text-center font-bold ${g.winner === match.franchise_a_id ? "text-olympus-gold" : "text-white"}`}>{g.a}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{gamesWonA}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-white">{fb?.short || fb?.name}</td>
              {games.map((g) => <td key={g.game} className={`py-2 text-center font-bold ${g.winner === match.franchise_b_id ? "text-olympus-gold" : "text-white"}`}>{g.b}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{gamesWonB}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-[11px] text-olympus-muted">
        Best of {numGames} · {match.sport === "Badminton" ? "21 pts (cap 30)" : "11 pts"} · win by 2
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Kabaddi                                                    */
/* ────────────────────────────────────────────────────────── */
export function KabaddiLive({ match, franchises, derived }) {
  const { totalA = 0, totalB = 0, scoreA = 0, scoreB = 0, alloutsA = 0, alloutsB = 0,
    currentHalf = 1, halves = 2, halfMinutes = 20, inExtraTime, hasGoldenRaid, timeline = [] } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={totalA} scoreRight={totalB}
        center={
          <div className="flex flex-col items-center gap-0.5">
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              {inExtraTime ? `ET ${currentHalf - halves}` : `Half ${currentHalf}`}
            </span>
            {hasGoldenRaid && (
              <span className="rounded-full bg-olympus-gold/15 px-2 py-0.5 text-[9px] font-bold text-olympus-gold">Golden Raid</span>
            )}
          </div>
        }
      >
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[[fa, alloutsA, "A"], [fb, alloutsB, "B"]].map(([f, ao, key]) => (
            <div key={key} className="rounded-xl bg-[#0C1120] p-2 text-center">
              <p className="text-[10px] font-bold text-olympus-muted">{f?.short || f?.name}</p>
              <p className="text-[10px] text-olympus-muted">All-Outs: {ao}</p>
            </div>
          ))}
        </div>
      </Scoreshell>

      <SectionCard icon={Swords} title="Timeline">
        {timeline.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No events yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {timeline.slice(0, 20).map((e, i) => {
              const team = franchises[e.team_franchise_id];
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                  <span className="font-bold text-olympus-gold capitalize">{e.kind}</span>
                  <span className="text-olympus-muted">Half {e.period}</span>
                  <span className="font-semibold text-white">{team?.short || "—"}</span>
                  {e.value != null && <span className="text-olympus-muted">+{e.value}</span>}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function KabaddiScorecard({ match, franchises, derived }) {
  const { scoreA = 0, scoreB = 0, etScoreA = 0, etScoreB = 0, goldenA = 0, goldenB = 0,
    alloutsA = 0, alloutsB = 0, inExtraTime, hasGoldenRaid } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const rows = [
    { label: "Regulation score", a: scoreA, b: scoreB },
    ...(inExtraTime ? [{ label: "Extra time", a: etScoreA, b: etScoreB }] : []),
    ...(hasGoldenRaid ? [{ label: "Golden Raid", a: goldenA, b: goldenB }] : []),
    { label: "All-Outs conceded", a: alloutsA, b: alloutsB },
    { label: "TOTAL", a: scoreA + etScoreA + goldenA, b: scoreB + etScoreB + goldenB, bold: true },
  ];
  return (
    <div className="rounded-2xl glass p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <th className="pb-2 text-left" />
            <th className="pb-2 text-center">{fa?.short || fa?.name}</th>
            <th className="pb-2 text-center">{fb?.short || fb?.name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-2 text-olympus-muted text-xs">{r.label}</td>
              <td className={`py-2 text-center font-bold ${r.bold ? "text-olympus-gold font-display text-lg" : "text-white"}`}>{r.a}</td>
              <td className={`py-2 text-center font-bold ${r.bold ? "text-olympus-gold font-display text-lg" : "text-white"}`}>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Chess                                                      */
/* ────────────────────────────────────────────────────────── */
export function ChessLive({ match, franchises, derived }) {
  const { result } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const winner = result?.outcome === "a" ? fa?.name : result?.outcome === "b" ? fb?.name : result?.outcome === "draw" ? "Draw" : null;
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={result?.outcome === "a" ? 1 : result?.outcome === "draw" ? "½" : 0}
        scoreRight={result?.outcome === "b" ? 1 : result?.outcome === "draw" ? "½" : 0}
        center={<Crown className="h-6 w-6 text-olympus-gold" />}
      >
        {result ? (
          <div className="mt-4 rounded-xl bg-olympus-gold/10 px-3 py-2 text-center text-sm font-bold text-olympus-gold">
            {winner}{result.label ? ` — ${result.label}` : ""}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-olympus-muted">Game in progress</p>
        )}
      </Scoreshell>
    </div>
  );
}

export function ChessScorecard({ match, franchises, derived }) {
  const { result } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="rounded-2xl glass p-4 text-center">
      {result ? (
        <>
          <Crown className="mx-auto mb-3 h-8 w-8 text-olympus-gold" />
          <p className="font-display text-lg font-bold text-white">
            {result.outcome === "draw" ? "Draw" : result.outcome === "a" ? fa?.name : fb?.name}
          </p>
          {result.label && <p className="mt-1 text-sm text-olympus-muted">{result.label}</p>}
        </>
      ) : (
        <p className="text-sm text-olympus-muted">No result recorded yet.</p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Carrom                                                     */
/* ────────────────────────────────────────────────────────── */
export function CarromLive({ match, franchises, derived }) {
  const { boards = [], boardsWonA = 0, boardsWonB = 0, pointsA = 0, pointsB = 0,
    currentBoard = 1, queenPoints = 3 } = derived || {};
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={boardsWonA} scoreRight={boardsWonB}
        subLeft="boards won" subRight="boards won"
        center={
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <Target className="inline h-3 w-3 mr-1" /> Board {currentBoard}
          </span>
        }
      />

      <SectionCard icon={Target} title="Board Results">
        {boards.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No boards recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {boards.map((b) => {
              const winFa = b.winner === match.franchise_a_id;
              return (
                <div key={b.board} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="text-xs font-bold text-olympus-muted">Board {b.board}</span>
                  <span className="font-display font-bold text-white">
                    <span className={winFa ? "text-olympus-gold" : ""}>{b.a}</span>
                    <span className="mx-1.5 text-olympus-muted">–</span>
                    <span className={!winFa && b.winner ? "text-olympus-gold" : ""}>{b.b}</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase text-olympus-muted">
                    {b.winner ? (winFa ? franchises[match.franchise_a_id]?.short : franchises[match.franchise_b_id]?.short) : "Live"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function CarromScorecard({ match, franchises, derived }) {
  const { boards = [], boardsWonA = 0, boardsWonB = 0, pointsA = 0, pointsB = 0 } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl glass p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              <th className="pb-2 text-left" />
              {boards.map((b) => <th key={b.board} className="pb-2 text-center">Board {b.board}</th>)}
              <th className="pb-2 text-right text-olympus-gold">Boards Won</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            <tr>
              <td className="py-2 font-bold text-white">{fa?.short || fa?.name}</td>
              {boards.map((b) => <td key={b.board} className={`py-2 text-center font-bold ${b.winner === match.franchise_a_id ? "text-olympus-gold" : "text-white"}`}>{b.a}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{boardsWonA}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-white">{fb?.short || fb?.name}</td>
              {boards.map((b) => <td key={b.board} className={`py-2 text-center font-bold ${b.winner === match.franchise_b_id ? "text-olympus-gold" : "text-white"}`}>{b.b}</td>)}
              <td className="py-2 text-right font-display font-extrabold text-olympus-gold">{boardsWonB}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Relay                                                      */
/* ────────────────────────────────────────────────────────── */
function fmtTime(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(2).padStart(5, "0");
  return m > 0 ? `${m}:${s}` : `${Number(secs).toFixed(2)}s`;
}

export function RelayLive({ match, franchises, derived }) {
  const { timeA, timeB, legs = 4, complete, deadHeat, leaderId } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={timeA != null ? fmtTime(timeA) : "—"}
        scoreRight={timeB != null ? fmtTime(timeB) : "—"}
        center={<span className="text-[10px] font-bold text-olympus-muted">{legs}× Relay</span>}
      >
        {complete && (
          <div className="mt-3 rounded-xl bg-olympus-gold/10 px-3 py-2 text-center text-sm font-bold text-olympus-gold">
            {deadHeat ? "Dead Heat!" : `${franchises[leaderId]?.name || ""} wins by ${Math.abs((timeA || 0) - (timeB || 0)).toFixed(2)}s`}
          </div>
        )}
      </Scoreshell>
    </div>
  );
}

export function RelayScorecard({ match, franchises, derived }) {
  const { timeA, timeB, legs = 4, deadHeat, leaderId } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="rounded-2xl glass p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <th className="pb-2 text-left">Team</th>
            <th className="pb-2 text-center">Finish Time</th>
            <th className="pb-2 text-right">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {[[fa, timeA, match.franchise_a_id], [fb, timeB, match.franchise_b_id]].map(([f, t, id]) => (
            <tr key={id}>
              <td className="py-2 font-bold text-white">{f?.name}</td>
              <td className="py-2 text-center font-display font-bold text-olympus-gold">{fmtTime(t)}</td>
              <td className="py-2 text-right text-xs font-bold uppercase text-olympus-muted">
                {t == null ? "—" : leaderId === id ? (deadHeat ? "Draw" : "1st") : "2nd"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deadHeat && <p className="mt-2 text-center text-xs text-olympus-gold">Dead Heat — times identical</p>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Arm Wrestling                                              */
/* ────────────────────────────────────────────────────────── */
export function ArmWrestlingLive({ match, franchises, derived }) {
  const { winsA = 0, winsB = 0, foulsA = 0, foulsB = 0, pullsTarget = 3, needed, decided } = derived || {};
  return (
    <div className="space-y-4">
      <Scoreshell match={match} franchises={franchises}
        scoreLeft={winsA} scoreRight={winsB}
        subLeft="pulls won" subRight="pulls won"
        center={<Dumbbell className="h-6 w-6 text-olympus-gold" />}
      >
        <p className="mt-3 text-center text-[10px] text-olympus-muted">Best of {pullsTarget} · first to {needed} wins</p>
        {decided && (
          <div className="mt-3 rounded-xl bg-olympus-gold/10 px-3 py-2 text-center text-sm font-bold text-olympus-gold">
            <Trophy className="inline h-4 w-4 mr-1" /> Match decided
          </div>
        )}
      </Scoreshell>

      {(foulsA > 0 || foulsB > 0) && (
        <SectionCard icon={Shield} title="Fouls">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-white/[0.03] p-2">
              <p className="text-xs font-bold text-white">{franchises[match.franchise_a_id]?.short}</p>
              <p className="font-display text-xl font-bold text-rose-400">{foulsA}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2">
              <p className="text-xs font-bold text-white">{franchises[match.franchise_b_id]?.short}</p>
              <p className="font-display text-xl font-bold text-rose-400">{foulsB}</p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export function ArmWrestlingScorecard({ match, franchises, derived }) {
  const { winsA = 0, winsB = 0, foulsA = 0, foulsB = 0, pullsTarget = 3 } = derived || {};
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="rounded-2xl glass p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <th className="pb-2 text-left">Team</th>
            <th className="pb-2 text-center">Pulls Won</th>
            <th className="pb-2 text-center">Fouls</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          <tr>
            <td className="py-2 font-bold text-white">{fa?.name}</td>
            <td className="py-2 text-center font-display font-extrabold text-olympus-gold">{winsA}</td>
            <td className="py-2 text-center text-rose-400">{foulsA}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold text-white">{fb?.name}</td>
            <td className="py-2 text-center font-display font-extrabold text-olympus-gold">{winsB}</td>
            <td className="py-2 text-center text-rose-400">{foulsB}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Info view (sport-specific config)                          */
/* ────────────────────────────────────────────────────────── */
export function SportInfoView({ match }) {
  const cfg = match?.config || {};
  const rows = [
    { label: "Sport", value: match.sport },
    { label: "Status", value: match.status },
    match.venue && { label: "Venue", value: match.venue },
    match.scheduled_at && { label: "Date", value: new Date(match.scheduled_at).toLocaleString() },
    // Cricket
    match.sport === "Cricket" && match.overs_per_innings && { label: "Overs", value: match.overs_per_innings },
    match.sport === "Cricket" && match.players_per_side && { label: "Players", value: `${match.players_per_side} a side` },
    // Football
    match.sport === "Football" && { label: "Format", value: "90 min + ET (if tied) + Penalties" },
    // Basketball
    match.sport === "Basketball" && { label: "Quarters", value: cfg.quarters ?? match.players_per_side ?? 4 },
    match.sport === "Basketball" && { label: "OT period", value: "5 minutes" },
    // Volleyball
    match.sport === "Volleyball" && { label: "Sets format", value: `Best of ${cfg.sets ?? match.players_per_side ?? 3}` },
    match.sport === "Volleyball" && { label: "Points per set", value: cfg.points_per_set ?? match.overs_per_innings ?? 25 },
    match.sport === "Volleyball" && { label: "Final set points", value: cfg.final_set_points ?? 15 },
    // Badminton
    match.sport === "Badminton" && { label: "Games format", value: `Best of ${cfg.games ?? 3}` },
    match.sport === "Badminton" && { label: "Points per game", value: "21 (cap 30, win by 2)" },
    // Table Tennis
    match.sport === "Table Tennis" && { label: "Games format", value: `Best of ${cfg.games ?? 3}` },
    match.sport === "Table Tennis" && { label: "Points per game", value: "11 (win by 2)" },
    // Kabaddi
    match.sport === "Kabaddi" && { label: "Halves", value: cfg.halves ?? 2 },
    match.sport === "Kabaddi" && { label: "Half duration", value: `${cfg.half_minutes ?? 20} minutes` },
    match.sport === "Kabaddi" && { label: "All-Out bonus", value: cfg.allout_bonus ?? 2 },
    match.sport === "Kabaddi" && { label: "Tiebreaker", value: "2×3 min Extra Time → Golden Raid" },
    // Carrom
    match.sport === "Carrom" && { label: "Boards", value: cfg.boards ?? 1 },
    match.sport === "Carrom" && { label: "Queen points", value: cfg.queen_points ?? 3 },
    // Relay
    match.sport === "Relay" && { label: "Legs", value: cfg.legs ?? 4 },
    // Arm Wrestling
    match.sport === "Arm Wrestling" && { label: "Pulls format", value: `Best of ${cfg.pulls ?? 3}` },
    // Chess
    match.sport === "Chess" && { label: "Format", value: "Single game" },
    match.sport === "Chess" && { label: "Outcomes", value: "Win / Draw / Loss" },
  ].filter(Boolean);

  return (
    <div className="rounded-2xl glass p-4">
      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">Match Info</h4>
      <div className="divide-y divide-white/[0.06]">
        {rows.map((r) => <InfoRow key={r.label} label={r.label} value={r.value} />)}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Squad view                                                 */
/* ────────────────────────────────────────────────────────── */
export function SportSquadView({ match, franchises, squad = [] }) {
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const teamSquad = (fid) => squad.filter((p) => p.franchise_id === fid);

  const TeamBlock = ({ franchise }) => {
    if (!franchise) return null;
    const players = teamSquad(franchise.id);
    return (
      <div className="rounded-2xl glass p-4">
        <div className="mb-3 flex items-center gap-2">
          <FranchiseEmblem franchise={franchise} size="sm" />
          <h4 className="font-display text-sm font-bold text-white">{franchise.name}</h4>
        </div>
        {players.length === 0 ? (
          <p className="text-center text-xs text-olympus-muted">No squad assigned.</p>
        ) : (
          <div className="space-y-1.5">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="font-semibold text-white">{p.full_name}</span>
                {p.role && <span className="text-[10px] font-bold uppercase text-olympus-muted">{p.role}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TeamBlock franchise={fa} />
      <TeamBlock franchise={fb} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Scorecard dispatcher (used by MatchLive "Scorecard" tab)  */
/* ────────────────────────────────────────────────────────── */
export function SportScorecardView({ match, franchises, derived }) {
  if (!derived) return <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">No scorecard data yet.</div>;
  switch (match.sport) {
    case "Football": return <FootballScorecard match={match} franchises={franchises} derived={derived} />;
    case "Basketball": return <BasketballScorecard match={match} franchises={franchises} derived={derived} />;
    case "Volleyball": return <VolleyballScorecard match={match} franchises={franchises} derived={derived} />;
    case "Badminton":
    case "Table Tennis": return <RallySportScorecard match={match} franchises={franchises} derived={derived} />;
    case "Kabaddi": return <KabaddiScorecard match={match} franchises={franchises} derived={derived} />;
    case "Chess": return <ChessScorecard match={match} franchises={franchises} derived={derived} />;
    case "Carrom": return <CarromScorecard match={match} franchises={franchises} derived={derived} />;
    case "Relay": return <RelayScorecard match={match} franchises={franchises} derived={derived} />;
    case "Arm Wrestling": return <ArmWrestlingScorecard match={match} franchises={franchises} derived={derived} />;
    default: return <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">Scorecard for {match.sport} not available.</div>;
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Dispatcher — used by MatchLive "Live" tab                  */
/* ────────────────────────────────────────────────────────── */
export default function TeamSportLive({ match, franchises, derived }) {
  switch (match.sport) {
    case "Football": return <FootballLive match={match} franchises={franchises} derived={derived} />;
    case "Volleyball": return <VolleyballLive match={match} franchises={franchises} derived={derived} />;
    case "Basketball": return <BasketballLive match={match} franchises={franchises} derived={derived} />;
    case "Badminton":
    case "Table Tennis": return <RallySportLive match={match} franchises={franchises} derived={derived} />;
    case "Kabaddi": return <KabaddiLive match={match} franchises={franchises} derived={derived} />;
    case "Chess": return <ChessLive match={match} franchises={franchises} derived={derived} />;
    case "Carrom": return <CarromLive match={match} franchises={franchises} derived={derived} />;
    case "Relay": return <RelayLive match={match} franchises={franchises} derived={derived} />;
    case "Arm Wrestling": return <ArmWrestlingLive match={match} franchises={franchises} derived={derived} />;
    default:
      return (
        <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">
          Live scoreboard for {match.sport} isn&rsquo;t available yet.
        </div>
      );
  }
}
