import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Plus, X, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchMatches, fetchFranchises, createMatch, deleteMatch, listScorers,
} from "../lib/cricket";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

function StatusPill({ status }) {
  const map = {
    live: { label: "LIVE", cls: "bg-olympus-success/15 text-olympus-success", dot: true },
    innings_break: { label: "BREAK", cls: "bg-amber-500/15 text-amber-400" },
    completed: { label: "RESULT", cls: "bg-white/10 text-white/60" },
    scheduled: { label: "UPCOMING", cls: "bg-olympus-blue/15 text-olympus-blue" },
    abandoned: { label: "ABANDONED", cls: "bg-white/10 text-white/40" },
  };
  const s = map[status] || map.scheduled;
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.dot && <span className="live-dot h-1.5 w-1.5 rounded-full bg-olympus-success" />}
      {s.label}
    </span>
  );
}

function MatchCard({ match, franchises, isAdmin, onDelete }) {
  const fa = franchises[match.franchise_a_id];
  const fb = franchises[match.franchise_b_id];
  return (
    <div className="flex items-center gap-2">
      <Link to={`/matches/${match.id}`} className="flex-1 min-w-0">
        <motion.div
          whileHover={{ scale: 1.005, y: -1 }}
          className="flex items-center gap-4 rounded-2xl glass p-4 transition hover:border-white/20"
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
              {fa && <FranchiseEmblem franchise={fa} size="md" />}
              <span className="text-[11px] font-bold text-white">{fa?.short || fa?.name}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 px-2">
              <StatusPill status={match.status} />
              <span className="text-[10px] text-olympus-muted">{match.sport} · {match.overs_per_innings}ov</span>
              {match.status === "completed" && match.result_summary && (
                <span className="max-w-[140px] truncate text-center text-[10px] text-olympus-gold">
                  {franchises[match.winner_franchise_id]?.short} {match.result_summary}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
              {fb && <FranchiseEmblem franchise={fb} size="md" />}
              <span className="text-[11px] font-bold text-white">{fb?.short || fb?.name}</span>
            </div>
          </div>
        </motion.div>
      </Link>
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(match);
          }}
          className="flex h-12 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 hover:text-rose-300 transition shadow-sm"
          title="Delete match (Admin only)"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function CreateMatchModal({ franchiseList, onClose, onCreated }) {
  const [sport] = useState("Cricket");
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [overs, setOvers] = useState(10);
  const [players, setPlayers] = useState(11);
  const [venue, setVenue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scorerId, setScorerId] = useState("");
  const [scorers, setScorers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listScorers().then(setScorers).catch(() => setScorers([]));
  }, []);

  const submit = async () => {
    if (!aId || !bId || aId === bId) {
      alert("Pick two different franchises.");
      return;
    }
    setBusy(true);
    try {
      const m = await createMatch({
        sport,
        franchiseA: aId,
        franchiseB: bId,
        oversPerInnings: Number(overs),
        playersPerSide: Number(players),
        venue: venue || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        assignedScorerId: scorerId || null,
      });
      onCreated(m);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-md overflow-hidden rounded-2xl glass-strong">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-display text-base font-bold text-white">Create match</h3>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 scrollbar-thin">
            <Field label="Team A">
              <select value={aId} onChange={(e) => setAId(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {franchiseList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Team B">
              <select value={bId} onChange={(e) => setBId(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {franchiseList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Overs"><input type="number" min="1" max="50" value={overs} onChange={(e) => setOvers(e.target.value)} className={inputCls} /></Field>
              <Field label="Players/side"><input type="number" min="2" max="11" value={players} onChange={(e) => setPlayers(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Venue (optional)"><input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} placeholder="Main Ground" /></Field>
            <Field label="Schedule (optional)"><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} /></Field>
            <Field label="Assign scorer">
              <select value={scorerId} onChange={(e) => setScorerId(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {scorers.map((s) => <option key={s.id} value={s.id}>{s.email} ({s.role})</option>)}
              </select>
            </Field>
          </div>
          <div className="border-t border-white/10 p-4">
            <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold py-3 text-sm font-bold text-olympus-bg hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create match
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const inputCls = "w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2 text-sm text-white placeholder:text-white/25";
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">{label}</label>
      {children}
    </div>
  );
}

export default function Matches() {
  const { isAdmin, canCreateMatch } = useAuth();
  const [matches, setMatches] = useState([]);
  const [franchises, setFranchises] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, fs] = await Promise.all([fetchMatches("Cricket"), fetchFranchises()]);
      const fMap = {};
      for (const f of fs) fMap[f.id] = f;
      setMatches(ms);
      setFranchises(fMap);
    } catch (e) {
      console.error("Matches load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const franchiseList = useMemo(() => Object.values(franchises), [franchises]);
  const live = matches.filter((m) => m.status === "live" || m.status === "innings_break");
  const upcoming = matches.filter((m) => m.status === "scheduled");
  const results = matches.filter((m) => m.status === "completed" || m.status === "abandoned");

  const handleDeleteMatch = useCallback(async (matchItem) => {
    const fa = franchises[matchItem.franchise_a_id]?.name || "Team A";
    const fb = franchises[matchItem.franchise_b_id]?.name || "Team B";
    if (!window.confirm(`Are you sure you want to delete the match "${fa} vs ${fb}"?\n\nAll scorecards, innings, and delivery history for this match will be permanently deleted.`)) {
      return;
    }
    try {
      await deleteMatch(matchItem.id);
      await load();
    } catch (e) {
      alert("Failed to delete match: " + (e.message || "Permission denied"));
    }
  }, [franchises, load]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-2 sm:pt-4 pb-28">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl glass-strong">
            <Swords className="h-5 w-5 text-olympus-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Matches</h1>
            <p className="text-xs text-olympus-muted">Live scores &amp; results</p>
          </div>
        </div>
        {(isAdmin || canCreateMatch) && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-xl bg-olympus-gold px-3 py-2 text-xs font-bold text-olympus-bg hover:brightness-110">
            <Plus className="h-4 w-4" /> Create
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-olympus-gold border-t-transparent" /></div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl glass p-10 text-center">
          <p className="text-sm text-olympus-muted">No matches yet.</p>
          {(isAdmin || canCreateMatch) && <p className="mt-1 text-xs text-olympus-muted">Create one to get started.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {live.length > 0 && <Section title="Live" items={live} franchises={franchises} isAdmin={isAdmin} onDelete={handleDeleteMatch} />}
          {upcoming.length > 0 && <Section title="Upcoming" items={upcoming} franchises={franchises} isAdmin={isAdmin} onDelete={handleDeleteMatch} />}
          {results.length > 0 && <Section title="Results" items={results} franchises={franchises} isAdmin={isAdmin} onDelete={handleDeleteMatch} />}
        </div>
      )}

      {showCreate && (
        <CreateMatchModal
          franchiseList={franchiseList}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void load(); }}
        />
      )}
    </div>
  );
}

function Section({ title, items, franchises, isAdmin, onDelete }) {
  return (
    <div>
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-olympus-muted">{title}</h2>
      <div className="space-y-2.5">
        {items.map((m) => (
          <MatchCard key={m.id} match={m} franchises={franchises} isAdmin={isAdmin} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
