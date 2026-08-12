// Scorer console for ALL non-cricket sports.
// Rendered at /scorer/:matchId when match.sport isn't Cricket.
// Sports: Football, Volleyball, Basketball, Badminton, Table Tennis,
//         Kabaddi, Chess, Carrom, Relay, Arm Wrestling.

import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Loader2, RotateCcw, Trophy, Minus, Plus,
  Flag, Shirt, CircleDot, Check, X, Shield, Zap, Timer,
  Swords, Crown, Target, Clock, Dumbbell, ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTeamSportMatch } from "../hooks/useTeamSportMatch";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import EventModal from "../components/sports/EventModal";
import {
  footballRecordEvent, footballUndo,
  volleyballRecordPoint, volleyballUndo,
  basketballRecordPoint, basketballUndo,
  setTeamSportPeriod, completeTeamSportMatch,
  checkPenaltyWinner,
  rallyRecordPoint,
  kabaddiRecordEvent,
  chessRecordResult,
  carromRecordEvent, carromCompleteMatch,
  relayRecordTime,
  armWrestlingRecordPull,
  sportEventRecord, sportEventUndo,
} from "../lib/teamSports";

/* ────────────────────────────────────────────────────────── */
/*  Shared atoms                                               */
/* ────────────────────────────────────────────────────────── */
function TeamHeader({ fa, fb, scoreA, scoreB, center }) {
  return (
    <div className="rounded-2xl glass-strong p-3 sm:p-4">
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-1 flex-col items-center gap-1">
          {fa && <FranchiseEmblem franchise={fa} size="sm" />}
          <span className="max-w-[80px] truncate text-center text-[10px] font-bold text-white sm:text-xs">{fa?.short || fa?.name}</span>
          <span className="font-display text-2xl font-extrabold text-white sm:text-3xl">{scoreA}</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <span className="font-display text-[10px] font-bold text-olympus-muted">vs</span>
          {center}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          {fb && <FranchiseEmblem franchise={fb} size="sm" />}
          <span className="max-w-[80px] truncate text-center text-[10px] font-bold text-white sm:text-xs">{fb?.short || fb?.name}</span>
          <span className="font-display text-2xl font-extrabold text-white sm:text-3xl">{scoreB}</span>
        </div>
      </div>
    </div>
  );
}

function UndoButton({ onClick, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-bold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
    >
      <RotateCcw className="h-4 w-4" /> Undo last
    </button>
  );
}

function ActionButton({ onClick, disabled, className = "", children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-bold transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function InfoBanner({ children, color = "gold" }) {
  const cls = {
    gold: "border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold",
    blue: "border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue",
    red: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  }[color] || "border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold";
  return (
    <div className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${cls}`}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Main page component                                        */
/* ────────────────────────────────────────────────────────── */
export default function ScorerTeamSport() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, canScoreMatch } = useAuth();
  const { loading, match, franchises, events, derived, refresh } = useTeamSportMatch(matchId);
  const [busy, setBusy] = useState(false);

  // Football: null = normal play, "et1"/"et2" = extra time halves, "pen" = shootout
  const [footballPhase, setFootballPhase] = useState("normal");
  // Penalty shootout state
  const [penaltyShots, setPenaltyShots] = useState([]);

  /* ── Shared async runner ── */
  const run = useCallback(
    async (fn) => {
      setBusy(true);
      try {
        await fn();
        await refresh();
      } catch (e) {
        alert(e.message || "Action failed");
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  /* ── Penalty shot handler ── */
  const handlePenaltyShot = useCallback(
    async (teamId, scored, playerName) => {
      const newShots = [...penaltyShots, { teamId, scored, playerName }];
      setPenaltyShots(newShots);
      setBusy(true);
      try {
        // Record BOTH goal and miss via RPC for accurate history
        await footballRecordEvent(match.id, {
          type: scored ? "pen_goal" : "pen_miss",
          teamFranchiseId: teamId,
          minute: 121 + newShots.filter((s) => s.teamId === teamId).length - 1,
          playerName: playerName || null,
          assistName: null,
        });
        const winner = checkPenaltyWinner(newShots, match.franchise_a_id, match.franchise_b_id);
        if (winner) {
          await completeTeamSportMatch(match.id);
          setFootballPhase("normal");
          setPenaltyShots([]);
        }
        await refresh();
      } catch (e) {
        alert(e.message || "Penalty action failed");
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [penaltyShots, match, refresh],
  );

  const fa = match ? franchises[match.franchise_a_id] : null;
  const fb = match ? franchises[match.franchise_b_id] : null;
  const done = useMemo(() => match?.status === "completed", [match]);

  /* ── Guard: no scorer access ── */
  if (!canScoreMatch) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#07090F] text-center text-white">
        <p className="text-sm text-olympus-muted">You do not have scorer access.</p>
        <button
          onClick={() => navigate("/matches")}
          className="rounded-xl bg-olympus-gold px-4 py-2 text-sm font-bold text-olympus-bg"
        >
          Back to matches
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090F]">
        <Loader2 className="h-7 w-7 animate-spin text-olympus-gold" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#07090F] p-4 text-center text-white">
        <div className="w-full max-w-md rounded-2xl glass-strong p-8">
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

  const canScoreThisMatch =
    isAdmin ||
    (canScoreMatch &&
      Boolean(user?.id) &&
      match.assigned_scorer_id === user.id);

  if (!canScoreThisMatch) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#07090F] text-center text-white">
        <p className="text-sm text-olympus-muted">
          You are not assigned to score this match.
        </p>
        <button
          onClick={() => navigate("/matches")}
          className="rounded-xl bg-olympus-gold px-4 py-2 text-sm font-bold text-olympus-bg"
        >
          Back to matches
        </button>
      </div>
    );
  }

  /* ── Football: finish / ET / penalties trigger ── */
  const handleFootballFinish = () => {
    if (!derived) return;
    const { scoreA, scoreB } = derived;
    if (scoreA !== scoreB) {
      if (window.confirm(`Finish match? Score: ${scoreA}–${scoreB}`)) {
        void run(() => completeTeamSportMatch(match.id));
      }
      return;
    }
    // Tied — offer Extra Time
    if (footballPhase === "normal") {
      if (window.confirm(`Scores level ${scoreA}–${scoreB}. Go to Extra Time (2 × 15 min)?`)) {
        setFootballPhase("et1");
      } else if (window.confirm("Skip Extra Time and go directly to Penalty Shootout?")) {
        setFootballPhase("pen");
      }
      return;
    }
    if (footballPhase === "et1") {
      if (scoreA !== scoreB) {
        if (window.confirm(`ET result: ${scoreA}–${scoreB}. Finish match?`)) {
          void run(() => completeTeamSportMatch(match.id));
        }
      } else {
        if (window.confirm("Still level after ET 1st half. Continue to ET 2nd half?")) {
          setFootballPhase("et2");
        }
      }
      return;
    }
    if (footballPhase === "et2") {
      if (scoreA !== scoreB) {
        if (window.confirm(`ET result: ${scoreA}–${scoreB}. Finish match?`)) {
          void run(() => completeTeamSportMatch(match.id));
        }
      } else {
        if (window.confirm("Still level after Extra Time. Proceed to Penalty Shootout?")) {
          setFootballPhase("pen");
          setPenaltyShots([]);
        }
      }
      return;
    }
  };

  /* ── Generic finish (non-football) ── */
  const handleGenericFinish = (sport, d) => {
    // Basketball: block finish if tied at end of regulation
    if (sport === "Basketball" && d?.needsOvertime) {
      alert(`Scores are tied ${d.scoreA}–${d.scoreB} at end of regulation. Continue to Overtime before finishing.`);
      return;
    }
    const summary = (() => {
      if (!d) return "";
      if (sport === "Volleyball") return `${d.setsWonA}–${d.setsWonB} sets`;
      if (sport === "Basketball") return `${d.scoreA}–${d.scoreB}`;
      if (sport === "Kabaddi") return `${d.totalA}–${d.totalB}`;
      if (sport === "Badminton" || sport === "Table Tennis") return `${d.gamesWonA}–${d.gamesWonB} games`;
      if (sport === "Carrom") return `${d.boardsWonA}–${d.boardsWonB} boards`;
      if (sport === "Relay") return d.complete ? `${formatTime(d.timeA)} vs ${formatTime(d.timeB)}` : "Time not recorded";
      if (sport === "Arm Wrestling") return `${d.winsA}–${d.winsB} pulls`;
      return "";
    })();
    if (window.confirm(`Finish this ${sport} match?${summary ? ` Result: ${summary}.` : ""}`)) {
      void run(() => completeTeamSportMatch(match.id));
    }
  };

  const finish = () => {
    if (match.sport === "Football") {
      handleFootballFinish();
    } else {
      handleGenericFinish(match.sport, derived);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex h-screen w-screen flex-col overflow-hidden bg-[#07090F] text-white pt-[72px] sm:pt-[80px]">
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-white/[0.07] px-3 py-2 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            onClick={() => navigate("/matches")}
            className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Exit</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-olympus-muted">
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-bold text-rose-400">
              SCORER
            </span>
            <span className="hidden sm:inline">{match.sport}</span>
            {match.sport === "Football" && footballPhase !== "normal" && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-400">
                {footballPhase === "et1" ? "ET 1ST" : footballPhase === "et2" ? "ET 2ND" : "PEN"}
              </span>
            )}
          </div>
          <div className="w-12 text-right text-[10px] font-bold uppercase tracking-wider text-olympus-muted sm:hidden">
            {match.sport.split(" ")[0]}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
        <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
          {done ? (
            /* ── Completed ── */
            <div className="mx-auto max-w-md rounded-2xl glass-strong p-6 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-olympus-gold" />
              <h2 className="font-display text-xl font-bold text-white">
                {match.is_tie
                  ? "Match Drawn"
                  : `${franchises[match.winner_franchise_id]?.name || "Result"} ${match.result_summary || ""}`}
              </h2>
              <button
                onClick={() => navigate(`/matches/${match.id}`)}
                className="mt-4 rounded-xl bg-olympus-gold px-4 py-2 text-sm font-bold text-olympus-bg"
              >
                View scoreboard
              </button>
            </div>
          ) : (
            <>
              {/* ── Sport panels ── */}
              {match.sport === "Football" && footballPhase === "pen" ? (
                <PenaltyShootout
                  match={match}
                  fa={fa}
                  fb={fb}
                  shots={penaltyShots}
                  busy={busy}
                  derived={derived}
                  onShot={handlePenaltyShot}
                />
              ) : match.sport === "Football" ? (
                <FootballPanel
                  match={match}
                  fa={fa}
                  fb={fb}
                  derived={derived}
                  busy={busy}
                  run={run}
                  phase={footballPhase}
                />
              ) : match.sport === "Volleyball" ? (
                <VolleyballPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Basketball" ? (
                <BasketballPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Badminton" || match.sport === "Table Tennis" ? (
                <RallySportPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Kabaddi" ? (
                <KabaddiPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Chess" ? (
                <ChessPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Carrom" ? (
                <CarromPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Relay" ? (
                <RelayPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : match.sport === "Arm Wrestling" ? (
                <ArmWrestlingPanel match={match} fa={fa} fb={fb} derived={derived} busy={busy} run={run} />
              ) : (
                <div className="rounded-2xl glass p-8 text-center text-sm text-olympus-muted">
                  Scorer panel for <strong>{match.sport}</strong> is not yet available.
                </div>
              )}

              {/* ── Finish match button (hidden during penalty shootout) ── */}
              {!(match.sport === "Football" && footballPhase === "pen") && (
                <button
                  onClick={finish}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-olympus-gold/40 bg-olympus-gold/10 py-3 text-sm font-bold text-olympus-gold transition hover:bg-olympus-gold/20 disabled:opacity-40"
                >
                  <Trophy className="h-4 w-4" /> Finish match
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Football panel                                             */
/* ────────────────────────────────────────────────────────── */
const MODAL_CONFIG = {
  goal: { title: (t) => `Goal — ${t}`, showMinute: true, showPlayer: true, playerLabel: "Scorer (optional)", showAssist: true },
  own_goal: { title: (t) => `Own Goal — ${t}`, showMinute: true, showPlayer: true, playerLabel: "Player (optional)", showAssist: false },
  yellow: { title: (t) => `Yellow Card — ${t}`, showMinute: true, showPlayer: true, playerLabel: "Player (optional)", showAssist: false },
  red: { title: (t) => `Red Card — ${t}`, showMinute: true, showPlayer: true, playerLabel: "Player (optional)", showAssist: false },
};

function FootballPanel({ match, fa, fb, derived, busy, run, phase }) {
  const [pendingAction, setPendingAction] = useState(null);

  const teams = [
    { f: fa, id: match.franchise_a_id, accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
    { f: fb, id: match.franchise_b_id, accent: "border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20" },
  ];

  const open = (type, teamId, teamName) => setPendingAction({ type, teamId, teamName });

  const confirm = ({ minute, player, assist }) => {
    if (!pendingAction) return;
    const { type, teamId } = pendingAction;
    // In ET, minutes are 91–120
    const etMinOffset = phase === "et1" ? 90 : phase === "et2" ? 105 : 0;
    const minuteNum = Number(minute) || 0;
    const finalMinute = etMinOffset > 0 ? etMinOffset + Math.min(minuteNum, 15) : minuteNum;
    setPendingAction(null);
    void run(() =>
      footballRecordEvent(match.id, {
        type,
        teamFranchiseId: teamId,
        minute: finalMinute,
        playerName: player || null,
        assistName: type === "goal" ? assist || null : null,
      }),
    );
  };

  const cfg = pendingAction ? MODAL_CONFIG[pendingAction.type] : null;

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={derived?.scoreA ?? 0} scoreB={derived?.scoreB ?? 0}
        center={
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-olympus-muted">
            {phase === "normal" ? "FT" : phase === "et1" ? "ET1" : "ET2"}
          </span>
        }
      />

      {phase !== "normal" && (
        <InfoBanner color="gold">
          <Timer className="h-4 w-4" />
          Extra Time {phase === "et1" ? "1st Half (91–105 min)" : "2nd Half (106–120 min)"}
        </InfoBanner>
      )}

      <div className="grid grid-cols-2 gap-3">
        {teams.map(({ f, id, accent }) => {
          const name = f?.short || f?.name || "Team";
          return (
            <div key={id} className="space-y-2 rounded-xl glass p-3">
              <p className="truncate text-center text-xs font-bold text-white">{name}</p>
              <ActionButton disabled={busy} onClick={() => open("goal", id, name)} className={`w-full ${accent}`}>
                <CircleDot className="h-4 w-4" /> Goal
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => open("own_goal", id, name)} className="w-full border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                Own Goal
              </ActionButton>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton disabled={busy} onClick={() => open("yellow", id, name)} className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20">
                  Yellow
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => open("red", id, name)} className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">
                  Red
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>

      <UndoButton busy={busy} onClick={() => run(() => footballUndo(match.id))} />

      {pendingAction && cfg && (
        <EventModal
          title={cfg.title(pendingAction.teamName)}
          showMinute={cfg.showMinute}
          minuteLabel={phase !== "normal" ? "Minute (1–15 of this half)" : "Minute"}
          showPlayer={cfg.showPlayer}
          playerLabel={cfg.playerLabel}
          showAssist={cfg.showAssist}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirm}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Penalty Shootout (Football)                                */
/* ────────────────────────────────────────────────────────── */
function PenaltyShootout({ match, fa, fb, shots, busy, derived, onShot }) {
  const aId = match.franchise_a_id;
  const bId = match.franchise_b_id;
  const [goalModal, setGoalModal] = useState(null); // teamId or null

  // Strict ABAB alternation (A kicks first by convention; scorer can change with confirm)
  const nextTeamId = shots.length % 2 === 0 ? aId : bId;
  const nextTeam = nextTeamId === aId ? fa : fb;

  const aShots = shots.filter((s) => s.teamId === aId);
  const bShots = shots.filter((s) => s.teamId === bId);
  const aGoals = aShots.filter((s) => s.scored).length;
  const bGoals = bShots.filter((s) => s.scored).length;
  const totalKicks = Math.max(aShots.length, bShots.length);
  const phase1Done = aShots.length >= 5 && bShots.length >= 5;

  const ShotDot = ({ s }) => (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
        s.scored
          ? s.teamId === aId
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
            : "border-olympus-blue/30 bg-olympus-blue/15 text-olympus-blue"
          : "border-white/10 bg-white/[0.04] text-white/30"
      }`}
    >
      {s.scored ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl glass-strong p-5 text-center">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-muted">
          {phase1Done ? "Sudden Death" : "Penalty Shootout"}
        </p>
        <p className="mb-4 text-xs text-white/50">
          {derived?.scoreA ?? 0}–{derived?.scoreB ?? 0} after {derived?.hasExtraTime ? "extra time" : "full time"}
        </p>

        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-xs font-bold text-white">{fa?.short || fa?.name}</p>
            <p className="font-display text-5xl font-black text-olympus-gold">{aGoals}</p>
            <p className="text-[10px] text-white/40">({aShots.length} taken)</p>
          </div>
          <span className="font-display text-3xl font-bold text-white/20">–</span>
          <div className="text-center">
            <p className="text-xs font-bold text-white">{fb?.short || fb?.name}</p>
            <p className="font-display text-5xl font-black text-olympus-gold">{bGoals}</p>
            <p className="text-[10px] text-white/40">({bShots.length} taken)</p>
          </div>
        </div>

        {/* Shot dots — A row then B row */}
        {shots.length > 0 && (
          <div className="mt-4 space-y-2">
            {[
              { label: fa?.short, ts: aShots },
              { label: fb?.short, ts: bShots },
            ].map(({ label, ts }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-10 text-right text-[10px] font-bold text-olympus-muted">{label}</span>
                <div className="flex flex-wrap gap-1">
                  {ts.map((s, i) => <ShotDot key={i} s={s} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next kicker */}
      <div className="rounded-xl border border-white/10 bg-[#0C1120] p-4">
        <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
          Next kick — {phase1Done ? `Sudden Death Round ${totalKicks - 4}` : `Kick ${shots.length + 1} of 10`}
        </p>
        <p className="mb-4 text-center font-display text-base font-bold text-white">
          {nextTeam?.name}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => setGoalModal(nextTeamId)}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition"
          >
            <Check className="h-5 w-5" /> Scored
          </button>
          <button
            disabled={busy}
            onClick={() => onShot(nextTeamId, false, null)}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-bold text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 transition"
          >
            <X className="h-5 w-5" /> Missed
          </button>
        </div>
      </div>

      {goalModal && (
        <EventModal
          title={`Penalty Goal — ${(goalModal === aId ? fa : fb)?.short || "Team"}`}
          showPlayer
          playerLabel="Scorer (optional)"
          onCancel={() => setGoalModal(null)}
          onConfirm={({ player }) => {
            setGoalModal(null);
            onShot(goalModal, true, player);
          }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Volleyball panel                                           */
/* ────────────────────────────────────────────────────────── */
function VolleyballPanel({ match, fa, fb, derived, busy, run }) {
  const { sets, current, setsWonA, setsWonB, pointsPerSet = 25, numSets = 3, finalSetPoints = 15, isDeuce } = derived || {};
  const isFinalSet = current?.set >= numSets;

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={setsWonA ?? 0} scoreB={setsWonB ?? 0}
        center={
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <Flag className="h-3 w-3" /> Set {current?.set ?? 1}{isFinalSet && " (Final)"}
          </div>
        }
      />

      <div className="rounded-xl glass p-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
          Set {current?.set ?? 1} — {current?.a ?? 0} / {current?.b ?? 0}
          <span className="ml-1 text-white/30">
            (target: {isFinalSet ? finalSetPoints : pointsPerSet})
          </span>
        </p>
        {isFinalSet && (
          <p className="mt-1 text-[10px] text-olympus-gold">Final set: first to {finalSetPoints} (win by 2)</p>
        )}
      </div>

      <AnimatePresence>
        {isDeuce && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-olympus-gold/40 bg-olympus-gold/10 px-3 py-2.5 text-sm font-bold text-olympus-gold"
          >
            <Zap className="h-4 w-4" /> Deuce — win by 2 clear points
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          disabled={busy || current?.finished}
          onClick={() => run(() => volleyballRecordPoint(match.id, match.franchise_a_id))}
          className="border-emerald-500/40 bg-emerald-500/10 py-6 text-lg text-emerald-400 hover:bg-emerald-500/20"
        >
          <Plus className="h-5 w-5" /> {fa?.short || "Team A"}
        </ActionButton>
        <ActionButton
          disabled={busy || current?.finished}
          onClick={() => run(() => volleyballRecordPoint(match.id, match.franchise_b_id))}
          className="border-olympus-blue/40 bg-olympus-blue/10 py-6 text-lg text-olympus-blue hover:bg-olympus-blue/20"
        >
          <Plus className="h-5 w-5" /> {fb?.short || "Team B"}
        </ActionButton>
      </div>

      {current?.finished && (
        <p className="rounded-xl border border-olympus-gold/30 bg-olympus-gold/10 px-3 py-2 text-center text-xs font-bold text-olympus-gold">
          Set {current.set} complete — next point starts set {current.set + 1}.
        </p>
      )}

      {sets && sets.length > 0 && (
        <div className="space-y-1.5 rounded-xl glass p-3">
          {sets.map((s) => (
            <div key={s.set} className="flex items-center justify-between text-xs">
              <span className="text-olympus-muted">Set {s.set}{s.set >= numSets ? " (Final)" : ""}</span>
              <span className="font-display font-bold text-white">{s.a} – {s.b}</span>
              <span className="text-[10px] uppercase text-olympus-muted">{s.finished ? "Done" : "Live"}</span>
            </div>
          ))}
        </div>
      )}

      <UndoButton busy={busy} onClick={() => run(() => volleyballUndo(match.id))} />
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Basketball panel                                           */
/* ────────────────────────────────────────────────────────── */
function BasketballPanel({ match, fa, fb, derived, busy, run }) {
  const { scoreA, scoreB, currentQuarter, numQuarters = 4, needsOvertime, inOvertime } = derived || {};
  const [fouls, setFouls] = useState({ a: 0, b: 0 });
  const [pendingAction, setPendingAction] = useState(null);

  const openBasket = (teamKey, teamId, pts, teamName) =>
    setPendingAction({ type: "basket", pts, teamKey, teamId, teamName });
  const openFoul = (teamKey, teamId, teamName) =>
    setPendingAction({ type: "foul", teamKey, teamId, teamName });

  const confirmAction = ({ player }) => {
    if (!pendingAction) return;
    const { type, teamKey, teamId, pts } = pendingAction;
    setPendingAction(null);
    if (type === "basket") {
      void run(() => basketballRecordPoint(match.id, { teamFranchiseId: teamId, points: pts, playerName: player || null }));
    } else {
      setFouls((prev) => ({ ...prev, [teamKey]: prev[teamKey] + 1 }));
    }
  };

  const TeamCol = ({ f, id, teamKey, accent }) => {
    const name = f?.short || f?.name || "Team";
    return (
      <div className="space-y-2 rounded-xl glass p-3">
        <p className="truncate text-center text-xs font-bold text-white">{name}</p>
        {[3, 2, 1].map((pts) => (
          <ActionButton
            key={pts}
            disabled={busy}
            onClick={() => openBasket(teamKey, id, pts, name)}
            className={`w-full py-3.5 text-lg ${accent}`}
          >
            <Plus className="h-4 w-4" /> {pts}
          </ActionButton>
        ))}
        <ActionButton
          disabled={busy}
          onClick={() => openFoul(teamKey, id, name)}
          className="w-full border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
        >
          <Shield className="h-4 w-4" /> Foul ({fouls[teamKey]})
        </ActionButton>
      </div>
    );
  };

  return (
    <>
      <TeamHeader
        fa={fa} fb={fb} scoreA={scoreA ?? 0} scoreB={scoreB ?? 0}
        center={
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <Shirt className="h-3 w-3" /> {inOvertime ? `OT ${(currentQuarter ?? 1) - numQuarters}` : `Q${currentQuarter ?? 1}`}
          </div>
        }
      />

      {needsOvertime && (
        <InfoBanner color="gold">
          <Zap className="h-4 w-4" /> Scores level — advance to Overtime before finishing
        </InfoBanner>
      )}

      {/* Quarter / OT selector */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0C1120] px-3 py-2">
        <span className="text-xs font-bold text-white">{inOvertime ? "Overtime Period" : "Quarter"}</span>
        <div className="flex items-center gap-2">
          <button
            disabled={busy || (currentQuarter ?? 1) <= 1}
            onClick={() => run(() => setTeamSportPeriod(match.id, (currentQuarter ?? 1) - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-14 text-center font-display text-sm font-bold text-olympus-gold">
            {inOvertime ? `OT ${(currentQuarter ?? 1) - numQuarters}` : `Q${currentQuarter ?? 1}`}
          </span>
          <button
            disabled={busy || (currentQuarter ?? 1) >= 12}
            onClick={() => run(() => setTeamSportPeriod(match.id, (currentQuarter ?? 1) + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TeamCol f={fa} id={match.franchise_a_id} teamKey="a" accent="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" />
        <TeamCol f={fb} id={match.franchise_b_id} teamKey="b" accent="border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20" />
      </div>

      <UndoButton busy={busy} onClick={() => run(() => basketballUndo(match.id))} />

      {pendingAction && (
        <EventModal
          title={pendingAction.type === "basket" ? `+${pendingAction.pts} — ${pendingAction.teamName}` : `Foul — ${pendingAction.teamName}`}
          showPlayer
          playerLabel={pendingAction.type === "basket" ? "Scorer (optional)" : "Player (optional)"}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Rally sport panel (Badminton / Table Tennis)               */
/* ────────────────────────────────────────────────────────── */
function RallySportPanel({ match, fa, fb, derived, busy, run }) {
  const { games = [], current = { a: 0, b: 0 }, gamesWonA = 0, gamesWonB = 0,
    target = 21, cap, numGames = 3, isDeuce, atCap, isMatchPoint, sport } = derived || {};
  const isBad = match.sport === "Badminton";
  const currentGame = current?.game ?? 1;

  const pointFor = (fid) =>
    run(() => rallyRecordPoint(match.id, fid, "point"));

  const nextGamePrompt = () => {
    if (window.confirm(`Game ${currentGame} complete. Start Game ${currentGame + 1}?`)) {
      void run(() => setTeamSportPeriod(match.id, currentGame + 1));
    }
  };

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={gamesWonA} scoreB={gamesWonB}
        center={
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <Flag className="h-3 w-3" /> Game {currentGame}
          </div>
        }
      />

      {/* Current game score */}
      <div className="rounded-xl glass p-3 text-center">
        <p className="font-display text-2xl font-extrabold text-white">
          {current?.a ?? 0} <span className="text-olympus-muted">–</span> {current?.b ?? 0}
        </p>
        <p className="mt-1 text-[10px] text-olympus-muted">
          First to {target}{cap ? ` · cap at ${cap}` : ""} · win by 2
        </p>
      </div>

      {/* Deuce / match-point banners */}
      <AnimatePresence>
        {isDeuce && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-olympus-gold/40 bg-olympus-gold/10 px-3 py-2 text-sm font-bold text-olympus-gold"
          >
            <Zap className="h-4 w-4" /> Deuce{atCap ? ` — at cap (${cap})` : " — win by 2"}
          </motion.div>
        )}
        {isMatchPoint && !isDeuce && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-400"
          >
            <Trophy className="h-4 w-4" /> Match Point!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          disabled={busy || current?.finished}
          onClick={() => pointFor(match.franchise_a_id)}
          className="border-emerald-500/40 bg-emerald-500/10 py-7 text-xl text-emerald-400 hover:bg-emerald-500/20"
        >
          <Plus className="h-5 w-5" /> {fa?.short || "A"}
        </ActionButton>
        <ActionButton
          disabled={busy || current?.finished}
          onClick={() => pointFor(match.franchise_b_id)}
          className="border-olympus-blue/40 bg-olympus-blue/10 py-7 text-xl text-olympus-blue hover:bg-olympus-blue/20"
        >
          <Plus className="h-5 w-5" /> {fb?.short || "B"}
        </ActionButton>
      </div>

      {current?.finished && (
        <button
          onClick={nextGamePrompt}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-olympus-gold/30 bg-olympus-gold/10 py-3 text-sm font-bold text-olympus-gold hover:bg-olympus-gold/20 disabled:opacity-40"
        >
          <Flag className="h-4 w-4" /> Start Game {currentGame + 1}
        </button>
      )}

      {games.length > 0 && (
        <div className="space-y-1.5 rounded-xl glass p-3">
          {games.map((g) => (
            <div key={g.game} className="flex items-center justify-between text-xs">
              <span className="text-olympus-muted">Game {g.game}</span>
              <span className="font-display font-bold text-white">{g.a} – {g.b}</span>
              <span className="text-[10px] uppercase text-olympus-muted">{g.finished ? "Done" : "Live"}</span>
            </div>
          ))}
        </div>
      )}

      <UndoButton busy={busy} onClick={() => run(() => sportEventUndo(match.id))} />
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Kabaddi panel                                             */
/* ────────────────────────────────────────────────────────── */
function KabaddiPanel({ match, fa, fb, derived, busy, run }) {
  const {
    scoreA = 0, scoreB = 0, etScoreA = 0, etScoreB = 0,
    alloutsA = 0, alloutsB = 0, currentHalf = 1, halves = 2,
    halfMinutes = 20, alloutBonus = 2, inExtraTime, needsGoldenRaid, hasGoldenRaid,
  } = derived || {};

  const totalA = scoreA + etScoreA;
  const totalB = scoreB + etScoreB;

  const recordKabaddi = (fid, kind) =>
    run(() => kabaddiRecordEvent(match.id, fid, kind));

  const startExtraTime = () => {
    if (window.confirm("Regulation tied. Start Extra Time (2 × 3 min halves)?")) {
      void run(() => setTeamSportPeriod(match.id, halves + 1));
    }
  };

  const startGoldenRaid = async () => {
    if (!window.confirm("Still tied after Extra Time. Start Golden Raid (sudden death)?")) return;
    // Golden raid — handled as special event kind
    await run(() => sportEventRecord(match.id, { period: 99, kind: "golden_raid", label: "Golden Raid begins" }));
  };

  const TeamCol = ({ f, id, accent, scoreLabel, score }) => {
    const name = f?.short || f?.name || "Team";
    return (
      <div className="space-y-2 rounded-xl glass p-3">
        <p className="truncate text-center text-xs font-bold text-white">{name}</p>
        <p className="text-center font-display text-2xl font-extrabold text-olympus-gold">{score}</p>
        <ActionButton disabled={busy} onClick={() => recordKabaddi(id, "raid")}
          className={`w-full ${accent}`}>
          <Swords className="h-4 w-4" /> Raid (+1)
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => recordKabaddi(id, "tackle")}
          className="w-full border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">
          <Shield className="h-4 w-4" /> Tackle (+1)
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => recordKabaddi(id, "allout")}
          className="w-full border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">
          All Out (+{alloutBonus})
        </ActionButton>
        {hasGoldenRaid && (
          <ActionButton disabled={busy} onClick={() => recordKabaddi(id, "golden_raid")}
            className="w-full border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold hover:bg-olympus-gold/20">
            <Crown className="h-4 w-4" /> Golden Raid
          </ActionButton>
        )}
      </div>
    );
  };

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={totalA} scoreB={totalB}
        center={
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
              <Timer className="h-3 w-3" />
              {inExtraTime ? `ET ${currentHalf - halves}` : `Half ${currentHalf}`}
            </div>
            <span className="text-[9px] text-olympus-muted">{halfMinutes} min/half</span>
          </div>
        }
      />

      {/* Half navigation */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0C1120] px-3 py-2">
        <span className="text-xs font-bold text-white">
          {inExtraTime ? `Extra Time Half ${currentHalf - halves}` : `Half ${currentHalf}`}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={busy || currentHalf <= 1}
            onClick={() => run(() => setTeamSportPeriod(match.id, currentHalf - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center font-display text-sm font-bold text-olympus-gold">{currentHalf}</span>
          <button disabled={busy || currentHalf >= 8}
            onClick={() => run(() => setTeamSportPeriod(match.id, currentHalf + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Allout tracker */}
      {(alloutsA > 0 || alloutsB > 0) && (
        <div className="flex justify-between rounded-xl glass px-4 py-2 text-xs text-olympus-muted">
          <span>All-Outs: {fa?.short} {alloutsA}</span>
          <span>All-Outs: {fb?.short} {alloutsB}</span>
        </div>
      )}

      {/* Tiebreak banners */}
      {!inExtraTime && scoreA === scoreB && currentHalf > halves && (
        <InfoBanner color="gold">
          <Zap className="h-4 w-4" /> Scores level — Extra Time needed
        </InfoBanner>
      )}
      {hasGoldenRaid && (
        <InfoBanner color="red">
          <Crown className="h-4 w-4" /> Golden Raid — sudden death!
        </InfoBanner>
      )}
      {needsGoldenRaid && !hasGoldenRaid && (
        <button onClick={startGoldenRaid} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-olympus-gold/40 bg-olympus-gold/10 py-3 text-sm font-bold text-olympus-gold hover:bg-olympus-gold/20 disabled:opacity-40">
          <Crown className="h-4 w-4" /> Start Golden Raid
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TeamCol f={fa} id={match.franchise_a_id}
          accent="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          score={totalA} />
        <TeamCol f={fb} id={match.franchise_b_id}
          accent="border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20"
          score={totalB} />
      </div>

      <UndoButton busy={busy} onClick={() => run(() => sportEventUndo(match.id))} />
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Chess panel                                               */
/* ────────────────────────────────────────────────────────── */
function ChessPanel({ match, fa, fb, derived, busy, run }) {
  const { result } = derived || {};
  const [reason, setReason] = useState("");

  const record = (res) => {
    void run(() => chessRecordResult(match.id, res, reason || null));
  };

  if (result) {
    const label = result.value === "a" ? fa?.name : result.value === "b" ? fb?.name : "Draw";
    return (
      <div className="rounded-2xl glass-strong p-8 text-center">
        <Crown className="mx-auto mb-3 h-10 w-10 text-olympus-gold" />
        <p className="font-display text-lg font-bold text-white">Result recorded</p>
        <p className="mt-1 text-sm text-olympus-muted">{label}{result.label ? ` — ${result.label}` : ""}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl glass-strong p-5">
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-1 flex-col items-center gap-2">
            {fa && <FranchiseEmblem franchise={fa} size="lg" />}
            <span className="text-xs font-bold text-white">{fa?.name}</span>
          </div>
          <Crown className="h-8 w-8 text-olympus-gold" />
          <div className="flex flex-1 flex-col items-center gap-2">
            {fb && <FranchiseEmblem franchise={fb} size="lg" />}
            <span className="text-xs font-bold text-white">{fb?.name}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl glass p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-olympus-muted">Reason (optional)</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2 text-sm text-white focus:border-olympus-gold/50 focus:outline-none"
        >
          <option value="">— select —</option>
          <option value="Checkmate">Checkmate</option>
          <option value="Resignation">Resignation</option>
          <option value="Time forfeit">Time forfeit</option>
          <option value="Stalemate">Stalemate (Draw)</option>
          <option value="Mutual agreement">Mutual agreement (Draw)</option>
          <option value="Insufficient material">Insufficient material (Draw)</option>
          <option value="50-move rule">50-move rule (Draw)</option>
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-olympus-muted">Declare result</p>
        <div className="grid grid-cols-3 gap-2">
          <ActionButton disabled={busy} onClick={() => record("a")}
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
            <Check className="h-4 w-4" /> {fa?.short}
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => record("draw")}
            className="border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold hover:bg-olympus-gold/20">
            Draw
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => record("b")}
            className="border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20">
            <Check className="h-4 w-4" /> {fb?.short}
          </ActionButton>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Carrom panel                                              */
/* ────────────────────────────────────────────────────────── */
function CarromPanel({ match, fa, fb, derived, busy, run }) {
  const { boards = [], currentBoard = 1, boardsWonA = 0, boardsWonB = 0, queenPoints = 3, numBoards = 1 } = derived || {};
  const [piecesModal, setPiecesModal] = useState(null); // { teamId, teamName }

  const currentBoardData = boards.find((b) => b.board === currentBoard) || { a: 0, b: 0, winner: null };

  const recordPieces = (teamId, teamName) => setPiecesModal({ teamId, teamName });
  const confirmPieces = ({ player: piecesStr }) => {
    if (!piecesModal) return;
    const pieces = parseInt(piecesStr, 10) || 1;
    setPiecesModal(null);
    void run(() =>
      sportEventRecord(match.id, {
        period: currentBoard,
        kind: "piece",
        teamFranchiseId: piecesModal.teamId,
        value: pieces,
        label: `${pieces} piece${pieces > 1 ? "s" : ""}`,
      })
    );
  };

  const recordQueen = (teamId) =>
    run(() => sportEventRecord(match.id, { period: currentBoard, kind: "queen", teamFranchiseId: teamId, value: queenPoints, label: `Queen (+${queenPoints})` }));

  const recordBoardWin = (teamId) => {
    if (window.confirm(`${teamId === match.franchise_a_id ? fa?.name : fb?.name} wins Board ${currentBoard}?`)) {
      void run(() =>
        sportEventRecord(match.id, { period: currentBoard, kind: "board_win", teamFranchiseId: teamId, label: `Board ${currentBoard} won` })
      );
    }
  };

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={boardsWonA} scoreB={boardsWonB}
        center={
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
            <Target className="h-3 w-3" /> Board {currentBoard}
          </div>
        }
      />

      <div className="rounded-xl glass p-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
          Board {currentBoard} — points: {currentBoardData.a} / {currentBoardData.b}
        </p>
        <p className="mt-1 text-[10px] text-olympus-muted">Queen = {queenPoints} pts · Pocket all pieces to win board</p>
      </div>

      {/* Board navigation */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0C1120] px-3 py-2">
        <span className="text-xs font-bold text-white">Board {currentBoard} of {numBoards}</span>
        <div className="flex items-center gap-2">
          <button disabled={busy || currentBoard <= 1}
            onClick={() => run(() => setTeamSportPeriod(match.id, currentBoard - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center font-display text-sm font-bold text-olympus-gold">{currentBoard}</span>
          <button disabled={busy || currentBoard >= numBoards}
            onClick={() => run(() => setTeamSportPeriod(match.id, currentBoard + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { f: fa, id: match.franchise_a_id, accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
          { f: fb, id: match.franchise_b_id, accent: "border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20" },
        ].map(({ f, id, accent }) => (
          <div key={id} className="space-y-2 rounded-xl glass p-3">
            <p className="truncate text-center text-xs font-bold text-white">{f?.short || f?.name}</p>
            <ActionButton disabled={busy} onClick={() => recordPieces(id, f?.name)} className={`w-full ${accent}`}>
              <Plus className="h-4 w-4" /> Pieces
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => recordQueen(id)}
              className="w-full border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20">
              <Crown className="h-4 w-4" /> Queen (+{queenPoints})
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => recordBoardWin(id)}
              className="w-full border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold hover:bg-olympus-gold/20">
              <Trophy className="h-4 w-4" /> Win Board
            </ActionButton>
          </div>
        ))}
      </div>

      <UndoButton busy={busy} onClick={() => run(() => sportEventUndo(match.id))} />

      {piecesModal && (
        <EventModal
          title={`Pieces pocketed — ${piecesModal.teamName}`}
          showPlayer
          playerLabel="Number of pieces (e.g. 3)"
          onCancel={() => setPiecesModal(null)}
          onConfirm={confirmPieces}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Relay panel                                               */
/* ────────────────────────────────────────────────────────── */
function formatTime(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(2).padStart(5, "0");
  return m > 0 ? `${m}:${s}` : `${Number(s).toFixed(2)}s`;
}

function RelayPanel({ match, fa, fb, derived, busy, run }) {
  const { timeA, timeB, legs = 4, complete, deadHeat, leaderId } = derived || {};
  const [timeInput, setTimeInput] = useState({ a: "", b: "" });

  const recordTime = async (teamKey, fid) => {
    const raw = timeInput[teamKey].trim();
    if (!raw) return;
    // Accept formats: "1:23.45" or "83.45"
    let secs;
    if (raw.includes(":")) {
      const [m, s] = raw.split(":");
      secs = parseInt(m, 10) * 60 + parseFloat(s);
    } else {
      secs = parseFloat(raw);
    }
    if (isNaN(secs) || secs <= 0) { alert("Invalid time format. Use MM:SS.ss or seconds."); return; }
    setTimeInput((p) => ({ ...p, [teamKey]: "" }));
    await run(() => relayRecordTime(match.id, fid, secs, []));
  };

  const TeamTimeBlock = ({ f, id, teamKey, time, accent }) => (
    <div className="space-y-2 rounded-xl glass p-4">
      <div className="flex items-center gap-2">
        {f && <FranchiseEmblem franchise={f} size="sm" />}
        <span className="text-sm font-bold text-white">{f?.name}</span>
      </div>
      {time != null ? (
        <p className="font-display text-2xl font-extrabold text-olympus-gold">{formatTime(time)}</p>
      ) : (
        <>
          <input
            value={timeInput[teamKey]}
            onChange={(e) => setTimeInput((p) => ({ ...p, [teamKey]: e.target.value }))}
            placeholder="MM:SS.ss or seconds"
            className="w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-olympus-gold/50 focus:outline-none"
          />
          <ActionButton disabled={busy || !timeInput[teamKey]} onClick={() => recordTime(teamKey, id)}
            className={`w-full ${accent}`}>
            <Clock className="h-4 w-4" /> Record Finish
          </ActionButton>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl glass-strong p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-muted">{legs}×Relay Race</p>
        {complete && (
          <p className="mt-2 font-display text-lg font-bold text-olympus-gold">
            {deadHeat ? "Dead Heat!" : `${franchiseNameById(leaderId, { [match.franchise_a_id]: fa, [match.franchise_b_id]: fb })} wins`}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <TeamTimeBlock f={fa} id={match.franchise_a_id} teamKey="a" time={timeA}
          accent="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" />
        <TeamTimeBlock f={fb} id={match.franchise_b_id} teamKey="b" time={timeB}
          accent="border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20" />
      </div>

      {complete && <InfoBanner color="gold"><Trophy className="h-4 w-4" /> Both times recorded — finish the match above.</InfoBanner>}
    </>
  );
}

function franchiseNameById(id, map) {
  return map[id]?.short || map[id]?.name || "—";
}

/* ────────────────────────────────────────────────────────── */
/*  Arm Wrestling panel                                        */
/* ────────────────────────────────────────────────────────── */
function ArmWrestlingPanel({ match, fa, fb, derived, busy, run }) {
  const { winsA = 0, winsB = 0, foulsA = 0, foulsB = 0, pullsTarget = 3, needed, decided } = derived || {};

  const recordPull = (fid) => run(() => armWrestlingRecordPull(match.id, fid, "pull_win"));
  const recordFoul = (fid) => run(() => armWrestlingRecordPull(match.id, fid, "foul"));

  return (
    <>
      <TeamHeader fa={fa} fb={fb} scoreA={winsA} scoreB={winsB}
        center={
          <div className="flex flex-col items-center gap-0.5">
            <Dumbbell className="h-5 w-5 text-olympus-gold" />
            <span className="text-[9px] font-bold uppercase text-olympus-muted">Best of {pullsTarget}</span>
          </div>
        }
      />

      {decided && (
        <InfoBanner color="gold">
          <Trophy className="h-4 w-4" /> Match decided — finish above.
        </InfoBanner>
      )}

      <div className="rounded-xl glass p-3 text-center">
        <p className="text-[10px] text-olympus-muted">First to {needed} wins. Pulls: {winsA + winsB} of {pullsTarget}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { f: fa, id: match.franchise_a_id, wins: winsA, fouls: foulsA, accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
          { f: fb, id: match.franchise_b_id, wins: winsB, fouls: foulsB, accent: "border-olympus-blue/40 bg-olympus-blue/10 text-olympus-blue hover:bg-olympus-blue/20" },
        ].map(({ f, id, wins, fouls, accent }) => (
          <div key={id} className="space-y-2 rounded-xl glass p-3">
            <p className="truncate text-center text-xs font-bold text-white">{f?.short || f?.name}</p>
            <p className="text-center font-display text-2xl font-extrabold text-olympus-gold">{wins}</p>
            <ActionButton disabled={busy || decided} onClick={() => recordPull(id)} className={`w-full ${accent}`}>
              <Dumbbell className="h-4 w-4" /> Win Pull
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => recordFoul(id)}
              className="w-full border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">
              Foul ({fouls})
            </ActionButton>
          </div>
        ))}
      </div>

      <UndoButton busy={busy} onClick={() => run(() => sportEventUndo(match.id))} />
    </>
  );
}
