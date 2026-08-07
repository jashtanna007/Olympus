import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, RotateCcw, Repeat, Crown, Loader2, CheckCircle2, Users, Plus, Trash2, Camera,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCricketMatch } from "../hooks/useCricketMatch";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import { SelectPlayerModal, WicketModal } from "../components/cricket/SelectPlayerModal";
import ShotOverlay from "../components/cricket/ShotOverlay";
import {
  setupMatch, recordToss, setOpeners, recordBall, recordWicket,
  setNewBatsman, setNewBowler, swapStrike, undoLastBall, closeInnings,
  completeMatch, fetchFranchiseCricketSquad,
} from "../lib/cricket";

/* ─── Squad setup step ─── */
function SquadColumn({ side, franchise, squad, onEditRow, onAddRow, onRemoveRow }) {
  const handleKeyDown = (e, i) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i < squad.length - 1) {
        const nextInput = document.getElementById(`squad-input-${side}-${i + 1}`);
        if (nextInput) nextInput.focus();
      } else {
        onAddRow(side);
        setTimeout(() => {
          const nextInput = document.getElementById(`squad-input-${side}-${i + 1}`);
          if (nextInput) nextInput.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="flex flex-col rounded-2xl glass p-4">
      <div className="mb-3 flex items-center gap-2">
        {franchise && <FranchiseEmblem franchise={franchise} size="sm" />}
        <h3 className="font-display text-sm font-bold text-white">{franchise?.name}</h3>
      </div>
      <div className="space-y-1.5">
        {squad.map((r, i) => (
          <div key={r.registration_id || `${side}-${i}`} className="flex items-center gap-1.5">
            <span className="w-5 text-right text-[11px] text-olympus-muted">{i + 1}</span>
            <input
              id={`squad-input-${side}-${i}`}
              value={r.full_name}
              onChange={(e) => onEditRow(side, i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder="Player name"
              className="flex-1 rounded-lg border border-white/10 bg-[#0C1120] px-2.5 py-1.5 text-sm text-white placeholder:text-white/25 focus:border-olympus-gold/50 focus:outline-none"
            />
            <button
              onClick={() => onRemoveRow(side, i)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onAddRow(side)}
        className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-white/10 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"
      >
        <Plus className="h-3.5 w-3.5" /> Add player
      </button>
    </div>
  );
}

function SquadSetup({ match, franchises, onDone, busy, setBusy }) {
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const [squadA, setSquadA] = useState([]);
  const [squadB, setSquadB] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, b] = await Promise.all([
        fetchFranchiseCricketSquad(match.franchise_a_id),
        fetchFranchiseCricketSquad(match.franchise_b_id),
      ]);
      if (!active) return;
      const pad = (arr) => {
        const out = arr.slice(0, match.players_per_side);
        while (out.length < Math.min(match.players_per_side, 11) && out.length < match.players_per_side)
          out.push({ full_name: "", registration_id: null, role: null });
        return out.length ? out : [{ full_name: "", registration_id: null, role: null }];
      };
      setSquadA(pad(a));
      setSquadB(pad(b));
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [match.franchise_a_id, match.franchise_b_id, match.players_per_side]);

  const editRow = (side, i, name) => {
    const setter = side === "a" ? setSquadA : setSquadB;
    setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, full_name: name } : r)));
  };
  const addRow = (side) => {
    const setter = side === "a" ? setSquadA : setSquadB;
    setter((prev) => [...prev, { full_name: "", registration_id: null, role: null }]);
  };
  const removeRow = (side, i) => {
    const setter = side === "a" ? setSquadA : setSquadB;
    setter((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    const clean = (arr) =>
      arr
        .filter((r) => r.full_name.trim())
        .map((r, i) => ({
          full_name: r.full_name.trim(),
          registration_id: r.registration_id,
          batting_order: i + 1,
          role: r.role,
        }));
    const a = clean(squadA);
    const b = clean(squadB);
    if (a.length < 2 || b.length < 2) {
      alert("Each side needs at least 2 players.");
      return;
    }
    setBusy(true);
    try {
      await setupMatch(match.id, a, b);
      onDone();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <CenterLoader />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-olympus-gold" />
        <h2 className="font-display text-lg font-bold text-white">Playing XIs</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SquadColumn
          side="a"
          franchise={fa}
          squad={squadA}
          onEditRow={editRow}
          onAddRow={addRow}
          onRemoveRow={removeRow}
        />
        <SquadColumn
          side="b"
          franchise={fb}
          squad={squadB}
          onEditRow={editRow}
          onAddRow={addRow}
          onRemoveRow={removeRow}
        />
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Save squads &amp; continue
      </button>
    </div>
  );
}

/* ─── Toss step ─── */
function TossStep({ match, franchises, busy, setBusy, onDone }) {
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  const [winner, setWinner] = useState(match.franchise_a_id);
  const [decision, setDecision] = useState("bat");

  const submit = async () => {
    setBusy(true);
    try {
      await recordToss(match.id, winner, decision);
      onDone();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-4 text-center font-display text-lg font-bold text-white">Toss</h2>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[fa, fb].filter(Boolean).map((f) => (
          <button
            key={f.id}
            onClick={() => setWinner(f.id)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
              winner === f.id ? "border-olympus-gold bg-olympus-gold/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <FranchiseEmblem franchise={f} size="md" />
            <span className="text-sm font-bold text-white">{f.name}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {["bat", "bowl"].map((d) => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            className={`rounded-xl border py-3 text-sm font-bold uppercase tracking-wider transition ${
              decision === d ? "border-olympus-blue bg-olympus-blue/15 text-olympus-blue" : "border-white/10 text-white/70"
            }`}
          >
            Chose to {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg hover:brightness-110 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm toss
      </button>
    </div>
  );
}

/* ─── Openers step ─── */
function OpenersStep({ rawInn, players, busy, setBusy, onDone }) {
  const batting = players.filter((p) => p.franchise_id === rawInn.batting_franchise_id);
  const bowling = players.filter((p) => p.franchise_id === rawInn.bowling_franchise_id);
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  const submit = async () => {
    if (!striker || !nonStriker || !bowler || striker === nonStriker) {
      alert("Pick two different batsmen and a bowler.");
      return;
    }
    setBusy(true);
    try {
      await setOpeners(rawInn.id, striker, nonStriker, bowler);
      onDone();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const Select = ({ label, value, onChange, options }) => (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2.5 text-sm text-white">
        <option value="">Select…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.full_name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h2 className="text-center font-display text-lg font-bold text-white">
        Innings {rawInn.innings_number} · Openers
      </h2>
      <Select label="Striker" value={striker} onChange={setStriker} options={batting.filter((p) => p.id !== nonStriker)} />
      <Select label="Non-striker" value={nonStriker} onChange={setNonStriker} options={batting.filter((p) => p.id !== striker)} />
      <Select label="Opening bowler" value={bowler} onChange={setBowler} options={bowling} />
      <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg hover:brightness-110 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Start innings
      </button>
    </div>
  );
}

/* ─── Runs prompt (byes/leg-byes/no-ball off bat) ─── */
function RunsPrompt({ title, max = 6, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl glass-strong p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-center font-display text-sm font-bold text-white">{title}</h3>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: max + 1 }).map((_, n) => (
            <button key={n} onClick={() => onPick(n)} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-lg font-bold text-white hover:border-olympus-gold/40 hover:bg-olympus-gold/[0.08]">
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CenterLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-olympus-gold" />
    </div>
  );
}

/* ════════════════════════ SCORER CONSOLE ════════════════════════ */
export default function ScorerConsole() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { canScoreMatch } = useAuth();
  const { loading, match, franchises, players, innings, derived, refresh } = useCricketMatch(matchId);

  const [busy, setBusy] = useState(false);
  const [captureShot, setCaptureShot] = useState(false);
  const [pendingBall, setPendingBall] = useState(null); // {opts, label}
  const [showWicket, setShowWicket] = useState(false);
  const [runsPrompt, setRunsPrompt] = useState(null); // {type,title,max}

  const rawInn = useMemo(() => {
    if (!innings.length) return null;
    return innings.slice().sort((a, b) => b.innings_number - a.innings_number)[0];
  }, [innings]);

  const inn = derived?.current || null;

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

  if (!canScoreMatch) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#07090F] text-center text-white">
        <p className="text-sm text-olympus-muted">You do not have scorer access.</p>
        <button onClick={() => navigate("/matches")} className="rounded-xl bg-olympus-gold px-4 py-2 text-sm font-bold text-olympus-bg">Back to matches</button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#07090F]"><Loader2 className="h-7 w-7 animate-spin text-olympus-gold" /></div>;
  }

  if (!match) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#07090F] text-center text-white p-4">
        <div className="w-full max-w-md rounded-2xl glass-strong p-8">
          <h2 className="font-display text-xl font-bold text-white">Match Not Available</h2>
          <p className="mt-2 text-sm text-olympus-muted">This match could not be loaded or has been deleted.</p>
          <button onClick={() => navigate("/matches")} className="mt-6 rounded-xl bg-olympus-gold px-5 py-2.5 text-sm font-bold text-olympus-bg hover:brightness-110">
            Back to matches
          </button>
        </div>
      </div>
    );
  }

  /* ── Derive current step ── */
  let step = "PAD";
  if (players.length === 0) step = "SETUP";
  else if (match.status === "completed") step = "RESULT";
  else if (!rawInn) step = "TOSS";
  else if (rawInn.legal_balls === 0 && (!rawInn.striker_id || !rawInn.non_striker_id || !rawInn.current_bowler_id)) step = "OPENERS";
  else if (inn && (inn.oversComplete || inn.allOut || (inn.target != null && inn.runs >= inn.target)) && !rawInn.is_closed) step = "END";
  else if (!rawInn.striker_id || !rawInn.non_striker_id) step = "NEW_BATSMAN";
  else if (!rawInn.current_bowler_id) step = "NEW_BOWLER";

  /* ── Ball commit helpers ── */
  const commitBall = (opts, label) => {
    if (captureShot && (opts.ballType === "runs")) {
      setPendingBall({ opts, label });
    } else {
      void run(() => recordBall(rawInn.id, opts));
    }
  };

  const eligibleBatsmen = inn ? inn.yetToBat : [];
  const eligibleBowlers = rawInn
    ? players.filter((p) => p.franchise_id === rawInn.bowling_franchise_id && p.id !== rawInn.last_over_bowler_id)
    : [];
  const currentBatsmen = rawInn
    ? players.filter((p) => p.id === rawInn.striker_id || p.id === rawInn.non_striker_id)
    : [];
  const fielders = rawInn ? players.filter((p) => p.franchise_id === rawInn.bowling_franchise_id) : [];

  const battingF = inn ? franchises[inn.battingFranchiseId] : null;

  return (
    <div className="fixed inset-0 z-20 flex h-screen w-screen flex-col overflow-hidden bg-[#07090F] text-white pt-20 sm:pt-24">
      {/* Top bar */}
      <div className="shrink-0 border-b border-white/[0.07] px-4 py-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button onClick={() => navigate("/matches")} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <div className="flex items-center gap-2 text-xs text-olympus-muted">
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-bold text-rose-400">SCORER</span>
            <span>{match.overs_per_innings} ov</span>
          </div>
        </div>
      </div>

      {/* Scoreline strip */}
      {inn && (
        <div className="shrink-0 border-b border-white/[0.07] bg-[#0C1120]/60 px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2">
              {battingF && <FranchiseEmblem franchise={battingF} size="sm" />}
              <span className="text-sm font-bold text-white">{battingF?.short || battingF?.name}</span>
            </div>
            <div className="font-display text-xl font-extrabold text-white">
              {inn.runs}/{inn.wickets} <span className="text-sm font-normal text-olympus-muted">({inn.oversText})</span>
            </div>
            <div className="text-right text-[11px] text-olympus-muted">
              CRR {inn.crr.toFixed(2)}
              {inn.rrr != null && <div>RRR {inn.rrr.toFixed(2)}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="mx-auto max-w-4xl">
          {step === "SETUP" && <SquadSetup match={match} franchises={franchises} busy={busy} setBusy={setBusy} onDone={refresh} />}
          {step === "TOSS" && <TossStep match={match} franchises={franchises} busy={busy} setBusy={setBusy} onDone={refresh} />}
          {step === "OPENERS" && rawInn && <OpenersStep rawInn={rawInn} players={players} busy={busy} setBusy={setBusy} onDone={refresh} />}
          {step === "RESULT" && (
            <div className="mx-auto max-w-md rounded-2xl glass-strong p-6 text-center">
              <Crown className="mx-auto mb-3 h-10 w-10 text-olympus-gold" />
              <h2 className="font-display text-xl font-bold text-white">
                {match.is_tie ? "Match Tied" : `${franchises[match.winner_franchise_id]?.name || "Result"} ${match.result_summary || ""}`}
              </h2>
              <button onClick={() => navigate(`/matches/${match.id}`)} className="mt-4 rounded-xl bg-olympus-gold px-4 py-2 text-sm font-bold text-olympus-bg">View scoreboard</button>
            </div>
          )}

          {step === "END" && inn && (
            <div className="mx-auto max-w-md rounded-2xl glass-strong p-6 text-center">
              <h2 className="mb-2 font-display text-lg font-bold text-white">
                {inn.inningsNumber === 1 ? "Innings complete" : "Match complete"}
              </h2>
              <p className="mb-4 text-sm text-olympus-muted">
                {inn.allOut ? "All out." : inn.oversComplete ? "Overs completed." : "Target chased."}
              </p>
              {inn.inningsNumber === 1 ? (
                <button onClick={() => run(() => closeInnings(rawInn.id))} disabled={busy} className="w-full rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg disabled:opacity-50">
                  End innings &amp; start 2nd
                </button>
              ) : (
                <button onClick={() => run(() => completeMatch(match.id))} disabled={busy} className="w-full rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg disabled:opacity-50">
                  Complete match
                </button>
              )}
            </div>
          )}

          {step === "NEW_BATSMAN" && (
            <SelectPlayerModal
              title="Select new batsman"
              subtitle="A wicket has fallen"
              players={eligibleBatsmen.map((b) => ({ id: b.id, full_name: b.name }))}
              onSelect={(p) => run(() => setNewBatsman(rawInn.id, p.id))}
            />
          )}

          {step === "NEW_BOWLER" && (
            <SelectPlayerModal
              title="Select next bowler"
              subtitle="Over complete"
              players={eligibleBowlers}
              onSelect={(p) => run(() => setNewBowler(rawInn.id, p.id))}
            />
          )}

          {/* Scoring pad */}
          {step === "PAD" && inn && (
            <div className="space-y-4">
              {/* At the crease */}
              <div className="grid grid-cols-2 gap-3">
                {inn.battingCard.filter((b) => b.isBatting).map((b) => (
                  <div key={b.id} className={`rounded-xl glass p-3 ${b.onStrike ? "ring-1 ring-olympus-gold/40" : ""}`}>
                    <div className="flex items-center gap-1"><span className="truncate text-sm font-bold text-white">{b.name}</span>{b.onStrike && <span className="text-olympus-gold">*</span>}</div>
                    <span className="text-xs text-olympus-muted">{b.runs} ({b.balls})</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl glass p-3 text-sm">
                <span className="text-olympus-muted">Bowler: </span>
                <span className="font-semibold text-white">{inn.bowler?.full_name || "—"}</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inn.thisOver.map((x, i) => (
                    <span key={i} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold ${x.isWicket ? "border-rose-500/40 bg-rose-500/20 text-rose-400" : "border-white/15 bg-white/[0.06] text-white"}`}>{x.token}</span>
                  ))}
                </div>
              </div>

              {/* Shot capture toggle */}
              <div className="rounded-xl border border-white/10 bg-[#0C1120] p-3 shadow-inner">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Camera className="h-4 w-4 text-olympus-gold" /> Scoring &amp; Shot Tracking Mode
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${captureShot ? "bg-olympus-gold/20 text-olympus-gold" : "bg-white/10 text-white/50"}`}>
                    {captureShot ? "ON — Interactive Maps" : "OFF — Quick Score"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCaptureShot(false)}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      !captureShot ? "bg-white/15 text-white shadow-md border border-white/20" : "bg-white/5 text-white/40 hover:text-white/70"
                    }`}
                  >
                    ⚡ Fast Score (No Shots)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureShot(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                      captureShot ? "bg-olympus-gold text-olympus-bg font-extrabold shadow-md shadow-olympus-gold/20" : "bg-white/5 text-white/40 hover:text-white/70"
                    }`}
                  >
                    🎯 Shot &amp; Pitch Tracking
                  </button>
                </div>
                {captureShot && (
                  <p className="mt-2 text-center text-[10px] font-semibold text-olympus-gold">
                    ✨ Tapping run buttons will show Wagon Wheel &amp; Pitch Map for spectators!
                  </p>
                )}
              </div>

              {/* Runs */}
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    disabled={busy}
                    onClick={() => commitBall({ ballType: "runs", runsBatter: r }, r === 4 ? "FOUR" : r === 6 ? "SIX" : `${r} run`)}
                    className={`rounded-xl border py-4 text-xl font-extrabold transition disabled:opacity-40 ${
                      r === 4 ? "border-olympus-gold/40 bg-olympus-gold/10 text-olympus-gold" : r === 6 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button disabled={busy} onClick={() => setShowWicket(true)} className="col-span-2 rounded-xl border border-rose-500/40 bg-rose-500/15 py-4 text-lg font-extrabold text-rose-400 transition hover:bg-rose-500/25 disabled:opacity-40">
                  WICKET
                </button>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-4 gap-2">
                <button disabled={busy} onClick={() => commitBall({ ballType: "wide", runsExtra: match.wide_noball_penalty }, "Wide")} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white hover:bg-white/[0.08] disabled:opacity-40">Wide</button>
                <button disabled={busy} onClick={() => setRunsPrompt({ type: "noball", title: "No ball — runs off bat", max: 6 })} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white hover:bg-white/[0.08] disabled:opacity-40">No ball</button>
                <button disabled={busy} onClick={() => setRunsPrompt({ type: "bye", title: "Byes", max: 4 })} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white hover:bg-white/[0.08] disabled:opacity-40">Bye</button>
                <button disabled={busy} onClick={() => setRunsPrompt({ type: "legbye", title: "Leg byes", max: 4 })} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white hover:bg-white/[0.08] disabled:opacity-40">Leg bye</button>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={() => run(() => swapStrike(rawInn.id))} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white hover:bg-white/[0.08] disabled:opacity-40">
                  <Repeat className="h-4 w-4" /> Swap strike
                </button>
                <button disabled={busy} onClick={() => run(() => undoLastBall(rawInn.id))} className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40">
                  <RotateCcw className="h-4 w-4" /> Undo ball
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wicket modal */}
      {showWicket && (
        <WicketModal
          batters={currentBatsmen}
          fielders={fielders}
          onClose={() => setShowWicket(false)}
          onConfirm={(w) => {
            setShowWicket(false);
            void run(() => recordWicket(rawInn.id, w));
          }}
        />
      )}

      {/* Runs prompt for extras */}
      {runsPrompt && (
        <RunsPrompt
          title={runsPrompt.title}
          max={runsPrompt.max}
          onClose={() => setRunsPrompt(null)}
          onPick={(n) => {
            const type = runsPrompt.type;
            setRunsPrompt(null);
            if (type === "noball") void run(() => recordBall(rawInn.id, { ballType: "noball", runsBatter: n, runsExtra: match.wide_noball_penalty }));
            else void run(() => recordBall(rawInn.id, { ballType: type, runsExtra: n }));
          }}
        />
      )}

      {/* Shot overlay */}
      {pendingBall && (
        <ShotOverlay
          label={pendingBall.label}
          onSkip={() => {
            const opts = pendingBall.opts;
            setPendingBall(null);
            void run(() => recordBall(rawInn.id, opts));
          }}
          onCommit={(shot) => {
            const opts = { ...pendingBall.opts, ...shot };
            setPendingBall(null);
            void run(() => recordBall(rawInn.id, opts));
          }}
        />
      )}
    </div>
  );
}
