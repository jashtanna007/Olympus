import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Trophy, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCricketMatch } from "../hooks/useCricketMatch";
import { useTeamSportMatch } from "../hooks/useTeamSportMatch";
import { deleteMatch } from "../lib/cricket";
import { supabase } from "../lib/supabase";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import LivePanel from "../components/cricket/LivePanel";
import { BattingCard, BowlingCard, FallOfWickets } from "../components/cricket/Scorecard";
import { Commentary, OversList } from "../components/cricket/Commentary";
import RunRateGraph from "../components/cricket/RunRateGraph";
import WagonWheel from "../components/cricket/WagonWheel";
import TeamSportLive, {
  SportScorecardView,
  SportSquadView,
  SportInfoView,
} from "../components/sports/TeamSportLive";

const TABS = ["Live", "Scorecard", "Commentary", "Overs", "Graphs", "Shots", "Squads", "Info"];

const TEAM_SPORT_TABS = ["Live", "Scorecard", "Squad", "Info"];

/* ─── Team-sport branch (owns its own data hook; rendered only for
       non-cricket matches so hook order stays stable in MatchLive) ─── */
function TeamSportEntry({ matchId }) {
  const { loading, match, franchises, derived } = useTeamSportMatch(matchId);
  const navigate = useNavigate();
  const { user, isAdmin, canScoreMatch } = useAuth();
  const [tab, setTab] = useState("Live");
  const [squad, setSquad] = useState([]);

  // Fetch match_players for Squad tab
  useEffect(() => {
    if (!matchId) return;
    supabase
      .from("match_players")
      .select("*")
      .eq("match_id", matchId)
      .order("full_name")
      .then(({ data }) => setSquad(data || []));
  }, [matchId]);

  const canScoreThisMatch =
    isAdmin ||
    (canScoreMatch &&
      Boolean(user?.id) &&
      match?.assigned_scorer_id === user.id);

  const handleDeleteMatch = async () => {
    if (!match) return;
    if (!window.confirm("Delete this match and its score history?")) return;
    try {
      await deleteMatch(match.id);
      navigate("/matches");
    } catch (e) {
      alert("Failed to delete match: " + (e.message || "Permission denied"));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olympus-gold border-t-transparent" />
      </div>
    );
  }
  if (!match) return null;

  const ScorecardView = () => (
    <SportScorecardView match={match} franchises={franchises} derived={derived} />
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-2 sm:pt-4 pb-28">
      {/* Action bar */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate("/matches")} className="flex items-center gap-1.5 text-sm text-olympus-muted hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Matches
        </button>
        <div className="flex items-center gap-2">
          {canScoreThisMatch && match.status !== "completed" && (
            <Link to={`/scorer/${match.id}`} className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20">
              <Pencil className="h-3.5 w-3.5" /> Score
            </Link>
          )}
          {isAdmin && (
            <button onClick={handleDeleteMatch} className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-thin">
        {TEAM_SPORT_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === t ? "text-olympus-gold" : "text-olympus-muted hover:text-white"
            }`}
          >
            {tab === t && <motion.div layoutId="team-tab" className="absolute inset-0 rounded-xl bg-white/[0.07]" />}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Live" && derived && (
        <TeamSportLive match={match} franchises={franchises} derived={derived} />
      )}
      {tab === "Live" && !derived && <Empty>Loading match data…</Empty>}

      {tab === "Scorecard" && derived && <ScorecardView />}
      {tab === "Scorecard" && !derived && <Empty>No scorecard yet.</Empty>}

      {tab === "Squad" && (
        <SportSquadView match={match} franchises={franchises} squad={squad} />
      )}

      {tab === "Info" && <SportInfoView match={match} />}
    </div>
  );
}


export default function MatchLive() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, canScoreMatch } = useAuth();
  const { loading, match, franchises, players, innings, deliveries, derived } = useCricketMatch(matchId);
  const [tab, setTab] = useState("Live");
  const [scorecardInnings, setScorecardInnings] = useState(0);

  const canScoreThisMatch =
    isAdmin ||
    (canScoreMatch &&
      Boolean(user?.id) &&
      match?.assigned_scorer_id === user.id);

  const handleDeleteMatch = async () => {
    if (!match) return;
    const fa = franchises[match.franchise_a_id]?.name || "Team A";
    const fb = franchises[match.franchise_b_id]?.name || "Team B";
    if (!window.confirm(`Are you sure you want to delete the match "${fa} vs ${fb}"?\n\nAll scorecards, innings, and delivery history for this match will be permanently deleted.`)) {
      return;
    }
    try {
      await deleteMatch(match.id);
      navigate("/matches");
    } catch (e) {
      alert("Failed to delete match: " + (e.message || "Permission denied"));
    }
  };

  const playerMap = derived?.playerMap || {};

  const statusBadge = useMemo(() => {
    if (!match) return null;
    if (match.status === "live") return { label: "LIVE", cls: "bg-olympus-success/15 text-olympus-success", dot: true };
    if (match.status === "innings_break") return { label: "INNINGS BREAK", cls: "bg-amber-500/15 text-amber-400" };
    if (match.status === "completed") return { label: "RESULT", cls: "bg-white/10 text-white/70" };
    return { label: "UPCOMING", cls: "bg-olympus-blue/15 text-olympus-blue" };
  }, [match]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olympus-gold border-t-transparent" />
      </div>
    );
  }

  // Non-cricket matches render their own scorecard view.
  if (match && match.sport !== "Cricket") {
    return <TeamSportEntry matchId={matchId} />;
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 pb-24 text-center">
        <div className="rounded-2xl glass-strong p-8">
          <h2 className="font-display text-xl font-bold text-white">Match Not Available</h2>
          <p className="mt-2 text-sm text-olympus-muted">
            This match could not be loaded or has been deleted.
          </p>
          <button
            onClick={() => navigate("/matches")}
            className="mt-6 rounded-xl bg-olympus-gold px-5 py-2.5 text-sm font-bold text-olympus-bg hover:brightness-110"
          >
            Back to matches
          </button>
        </div>
      </div>
    );
  }

  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const inningsForScorecard = derived?.innings || [];
  const scInn = inningsForScorecard[scorecardInnings];
  const currentInn = derived?.current;

  const battingSquad = (franchiseId) => players.filter((p) => p.franchise_id === franchiseId);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-2 sm:pt-4 pb-28">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate("/matches")} className="flex items-center gap-1.5 text-sm text-olympus-muted hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Matches
        </button>
        <div className="flex items-center gap-2">
          {canScoreThisMatch && match.status !== "completed" && (
            <Link to={`/scorer/${match.id}`} className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20">
              <Pencil className="h-3.5 w-3.5" /> Score
            </Link>
          )}
          {isAdmin && (
            <button onClick={handleDeleteMatch} className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Match banner */}
      <div className="mb-5 rounded-2xl glass-strong p-5">
        <div className="mb-3 flex items-center justify-center">
          {statusBadge && (
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge.cls}`}>
              {statusBadge.dot && <span className="live-dot h-1.5 w-1.5 rounded-full bg-olympus-success" />}
              {statusBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-1 flex-col items-center gap-2">
            {fa && <FranchiseEmblem franchise={fa} size="lg" />}
            <span className="text-center text-xs font-bold text-white">{fa?.name}</span>
          </div>
          <span className="px-3 font-display text-sm font-bold text-olympus-muted">vs</span>
          <div className="flex flex-1 flex-col items-center gap-2">
            {fb && <FranchiseEmblem franchise={fb} size="lg" />}
            <span className="text-center text-xs font-bold text-white">{fb?.name}</span>
          </div>
        </div>
        {match.status === "completed" && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-olympus-gold/10 px-3 py-2 text-sm font-bold text-olympus-gold">
            <Trophy className="h-4 w-4" />
            {match.is_tie ? "Match Tied" : `${franchises[match.winner_franchise_id]?.name || ""} ${match.result_summary || ""}`}
          </div>
        )}
        {match.toss_winner_franchise_id && match.status !== "completed" && (
          <p className="mt-3 text-center text-[11px] text-olympus-muted">
            {franchises[match.toss_winner_franchise_id]?.name} won the toss &amp; chose to {match.toss_decision}
          </p>
        )}
      </div>

      {match.status === "scheduled" && (
        <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">
          This match hasn’t started yet. Check back at the scheduled time.
        </div>
      )}

      {match.status !== "scheduled" && (
        <>
          {/* Tabs */}
          <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === t ? "text-olympus-gold" : "text-olympus-muted hover:text-white"
                }`}
              >
                {tab === t && <motion.div layoutId="match-tab" className="absolute inset-0 rounded-xl bg-white/[0.07]" />}
                <span className="relative z-10">{t}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "Live" && currentInn && <LivePanel derived={derived} franchises={franchises} />}
          {tab === "Live" && !currentInn && <Empty>Waiting for play to begin.</Empty>}

          {(tab === "Scorecard" || tab === "Shots" || tab === "Graphs") && inningsForScorecard.length > 1 && (
            <div className="mb-4 flex gap-2">
              {inningsForScorecard.map((i, idx) => (
                <button
                  key={i.id}
                  onClick={() => setScorecardInnings(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${scorecardInnings === idx ? "bg-olympus-gold text-olympus-bg" : "glass text-white/70"}`}
                >
                  {franchises[i.battingFranchiseId]?.short || `Inn ${i.inningsNumber}`}
                </button>
              ))}
            </div>
          )}

          {tab === "Scorecard" && scInn && (
            <div className="space-y-4">
              <BattingCard innings={scInn} />
              <BowlingCard innings={scInn} />
              <FallOfWickets innings={scInn} />
            </div>
          )}

          {tab === "Commentary" && <Commentary deliveries={deliveries} players={playerMap} />}
          {tab === "Overs" && <OversList derived={derived} players={playerMap} />}

          {tab === "Graphs" && scInn && (
            <div className="space-y-4">
              <div className="rounded-2xl glass p-4">
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">Manhattan &amp; Worm</h4>
                <RunRateGraph manhattan={scInn.manhattan} worm={scInn.worm} />
              </div>
              <div className="rounded-2xl glass p-4">
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">Partnerships</h4>
                {scInn.partnerships.length + 1 > 0 && (
                  <div className="space-y-2">
                    {[...scInn.partnerships, scInn.currentPartnership].filter((p) => p.balls > 0).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-olympus-muted">Wkt {i + 1}</span>
                        <div className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full bg-olympus-gold" style={{ width: `${Math.min(100, (p.runs / Math.max(1, scInn.runs)) * 100)}%` }} />
                        </div>
                        <span className="font-bold text-white">{p.runs} ({p.balls})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Shots" && scInn && (
            <div className="rounded-2xl glass p-4">
              <h4 className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-muted">Wagon Wheel</h4>
              <WagonWheel points={scInn.wagonPoints} size={280} className="mx-auto w-full max-w-[280px]" />
              {scInn.wagonPoints.length === 0 && <p className="mt-2 text-center text-xs text-olympus-muted">No shot data.</p>}
            </div>
          )}

          {tab === "Squads" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[fa, fb].filter(Boolean).map((f) => (
                <div key={f.id} className="rounded-2xl glass p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FranchiseEmblem franchise={f} size="sm" />
                    <h4 className="text-sm font-bold text-white">{f.name}</h4>
                  </div>
                  <div className="space-y-1">
                    {battingSquad(f.id).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-white/80">
                        <span>{p.full_name}</span>
                        {p.role && <span className="text-[10px] text-olympus-muted">{p.role}</span>}
                      </div>
                    ))}
                    {battingSquad(f.id).length === 0 && <p className="text-xs text-olympus-muted">Squad not set.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "Info" && (
            <div className="space-y-2 rounded-2xl glass p-4 text-sm">
              <InfoRow label="Format" value={`${match.overs_per_innings} overs a side`} />
              <InfoRow label="Players" value={`${match.players_per_side} a side`} />
              {match.venue && <InfoRow label="Venue" value={match.venue} />}
              {match.toss_winner_franchise_id && (
                <InfoRow label="Toss" value={`${franchises[match.toss_winner_franchise_id]?.name} — ${match.toss_decision}`} />
              )}
              {match.scheduled_at && <InfoRow label="Scheduled" value={new Date(match.scheduled_at).toLocaleString()} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Empty({ children }) {
  return <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">{children}</div>;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="text-olympus-muted">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
