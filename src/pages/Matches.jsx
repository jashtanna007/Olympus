import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Plus, X, Loader2, Trash2, Calendar, Sparkles, Trophy, Activity,
  CircleDot, Zap, Flame, Shield, Crown, Target, Users, Dumbbell
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchMatches, fetchFranchises, createMatch, deleteMatch, listScorers,
} from "../lib/cricket";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

const SPORT_LUCIDE_ICONS = {
  All: Sparkles,
  Cricket: Target,
  Football: CircleDot,
  Volleyball: Zap,
  Basketball: CircleDot,
  Badminton: Activity,
  "Table Tennis": CircleDot,
  Chess: Crown,
  Carrom: Target,
  Kabaddi: Users,
  Relay: Flame,
  "Arm Wrestling": Dumbbell,
};

function SportIcon({ sport, className = "h-3.5 w-3.5" }) {
  const IconComponent = SPORT_LUCIDE_ICONS[sport] || Trophy;
  return <IconComponent className={className} />;
}

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
          className="flex items-center gap-4 rounded-2xl glass p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
              {fa && <FranchiseEmblem franchise={fa} size="md" />}
              <span className="text-[11px] font-bold text-white">{fa?.short || fa?.name}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 px-2">
              <StatusPill status={match.status} />
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-olympus-muted border border-white/5">
                <SportIcon sport={match.sport} className="h-3 w-3 text-olympus-gold shrink-0" />
                <span>{match.sport}</span>
                {match.sport === "Cricket" && match.overs_per_innings && (
                  <span className="text-white/40">· {match.overs_per_innings}ov</span>
                )}
              </span>
              {match.status !== "completed" && match.scheduled_at && (
                <span className="flex max-w-[160px] items-center justify-center gap-1 text-center text-[10px] text-olympus-muted">
                  <Calendar className="h-3 w-3 shrink-0 text-olympus-gold" />
                  {new Date(match.scheduled_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
              {match.status === "completed" && match.result_summary && (
                <span className="max-w-[140px] truncate text-center text-[10px] text-olympus-gold">
                  {match.is_tie ? "Draw " : `${franchises[match.winner_franchise_id]?.short || ""} `}{match.result_summary}
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

const SPORT_OPTIONS = [
  "Cricket", "Football", "Volleyball", "Basketball", "Badminton", "Table Tennis",
  "Chess", "Carrom", "Kabaddi", "Relay", "Arm Wrestling",
];

function CreateMatchModal({ franchiseList, onClose, onCreated }) {
  const [sport, setSport] = useState("Cricket");
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  // Cricket fields
  const [overs, setOvers] = useState(10);
  const [players, setPlayers] = useState(11);
  // Volleyball fields
  const [volPoints, setVolPoints] = useState(25);
  const [numSets, setNumSets] = useState(3);
  const [volFinalSet, setVolFinalSet] = useState(15);
  // Basketball fields
  const [numQuarters, setNumQuarters] = useState(4);
  const [quarterMinutes, setQuarterMinutes] = useState(8);
  // Football
  const [footballHalves, setFootballHalves] = useState(2);
  const [footballHalfMinutes, setFootballHalfMinutes] = useState(10);
  // Badminton / Table Tennis
  const [rallyGames, setRallyGames] = useState(3);
  const [rallyPoints, setRallyPoints] = useState(21);
  // Chess
  const [timeControl, setTimeControl] = useState("5+0 blitz");
  // Carrom
  const [carromBoards, setCarromBoards] = useState(1);
  const [queenPoints, setQueenPoints] = useState(3);
  // Kabaddi
  const [kabaddiHalfMinutes, setKabaddiHalfMinutes] = useState(10);
  const [kabaddiAlloutBonus, setKabaddiAlloutBonus] = useState(2);
  // Relay
  const [relayLegs, setRelayLegs] = useState(4);
  // Arm Wrestling
  const [armPulls, setArmPulls] = useState(3);
  const [armSide, setArmSide] = useState("right");
  const [weightClass, setWeightClass] = useState("");

  const [venue, setVenue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scorerId, setScorerId] = useState("");
  const [scorers, setScorers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listScorers().then(setScorers).catch(() => setScorers([]));
  }, []);

  // Reset rally points default when switching between Badminton/TT.
  useEffect(() => {
    if (sport === "Badminton") setRallyPoints(21);
    if (sport === "Table Tennis") setRallyPoints(11);
  }, [sport]);

  const buildConfig = () => {
    switch (sport) {
      case "Football":
        return { halves: Number(footballHalves), half_minutes: Number(footballHalfMinutes) };
      case "Volleyball":
        return { sets: Number(numSets), points_per_set: Number(volPoints), final_set_points: Number(volFinalSet) };
      case "Basketball":
        return { quarters: Number(numQuarters), quarter_minutes: Number(quarterMinutes) };
      case "Badminton":
        return { games: Number(rallyGames), points_per_game: Number(rallyPoints), deuce_cap: 30 };
      case "Table Tennis":
        return { games: Number(rallyGames), points_per_game: Number(rallyPoints), deuce_cap: null };
      case "Chess":
        return {
          time_control: timeControl || null,
        };
      case "Carrom":
        return { boards: Number(carromBoards), queen_points: Number(queenPoints) };
      case "Kabaddi":
        return { halves: 2, half_minutes: Number(kabaddiHalfMinutes), allout_bonus: Number(kabaddiAlloutBonus) };
      case "Relay":
        return { legs: Number(relayLegs) };
      case "Arm Wrestling":
        return { pulls: Number(armPulls), arms: armSide, weight_class: weightClass || null };
      default:
        return {};
    }
  };

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
        oversPerInnings: sport === "Cricket" ? Number(overs) : undefined,
        playersPerSide: sport === "Cricket" ? Number(players) : undefined,
        venue: venue || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        assignedScorerId: scorerId || null,
        config: buildConfig(),
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
            <Field label="Sport">
              <div className="grid grid-cols-3 gap-1.5">
                {SPORT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSport(s)}
                    className={`rounded-lg border py-2 text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                      sport === s
                        ? "border-olympus-gold bg-olympus-gold/15 text-olympus-gold shadow-sm"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                    }`}
                  >
                    <SportIcon sport={s} className="h-3.5 w-3.5" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </Field>
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
            {sport === "Cricket" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Overs"><input type="number" min="1" max="50" value={overs} onChange={(e) => setOvers(e.target.value)} className={inputCls} /></Field>
                <Field label="Players/side"><input type="number" min="2" max="11" value={players} onChange={(e) => setPlayers(e.target.value)} className={inputCls} /></Field>
              </div>
            )}
            {sport === "Football" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Halves">
                  <select value={footballHalves} onChange={(e) => setFootballHalves(Number(e.target.value))} className={inputCls}>
                    <option value={1}>1 period</option>
                    <option value={2}>2 halves</option>
                    <option value={4}>4 quarters</option>
                  </select>
                </Field>
                <Field label="Minutes per half">
                  <input type="number" min="1" max="45" value={footballHalfMinutes} onChange={(e) => setFootballHalfMinutes(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
            {sport === "Volleyball" && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Sets">
                  <select value={numSets} onChange={(e) => setNumSets(Number(e.target.value))} className={inputCls}>
                    <option value={3}>Best of 3</option>
                    <option value={5}>Best of 5</option>
                    <option value={1}>Single set</option>
                  </select>
                </Field>
                <Field label="Points / set">
                  <input type="number" min="5" max="50" value={volPoints} onChange={(e) => setVolPoints(e.target.value)} className={inputCls} placeholder="25" />
                </Field>
                <Field label="Deciding set">
                  <input type="number" min="5" max="25" value={volFinalSet} onChange={(e) => setVolFinalSet(e.target.value)} className={inputCls} placeholder="15" />
                </Field>
              </div>
            )}
            {sport === "Basketball" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quarters">
                  <select value={numQuarters} onChange={(e) => setNumQuarters(Number(e.target.value))} className={inputCls}>
                    <option value={4}>4 Quarters (standard)</option>
                    <option value={2}>2 Halves</option>
                    <option value={1}>Single period</option>
                  </select>
                </Field>
                <Field label="Minutes / quarter">
                  <input type="number" min="1" max="12" value={quarterMinutes} onChange={(e) => setQuarterMinutes(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
            {(sport === "Badminton" || sport === "Table Tennis") && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Format">
                    <select value={rallyGames} onChange={(e) => setRallyGames(Number(e.target.value))} className={inputCls}>
                      <option value={3}>Best of 3 games</option>
                      <option value={5}>Best of 5 games</option>
                      <option value={1}>Single game</option>
                    </select>
                  </Field>
                  <Field label="Points per game">
                    <input type="number" min="5" max="30" value={rallyPoints} onChange={(e) => setRallyPoints(e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <p className="text-[11px] text-olympus-muted">
                  {sport === "Badminton"
                    ? "Win by 2 clear points; hard cap at 30."
                    : "Win by 2 clear points; no cap."}
                </p>
              </div>
            )}
            {sport === "Chess" && (
              <div className="space-y-3">
                <Field label="Time control">
                  <input value={timeControl} onChange={(e) => setTimeControl(e.target.value)} className={inputCls} placeholder="e.g. 5+0 blitz" />
                </Field>

              </div>
            )}
            {sport === "Carrom" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Boards">
                  <select value={carromBoards} onChange={(e) => setCarromBoards(Number(e.target.value))} className={inputCls}>
                    <option value={1}>Single board</option>
                    <option value={3}>Best of 3 boards</option>
                  </select>
                </Field>
                <Field label="Queen points">
                  <select value={queenPoints} onChange={(e) => setQueenPoints(Number(e.target.value))} className={inputCls}>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                  </select>
                </Field>
              </div>
            )}
            {sport === "Kabaddi" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minutes per half">
                  <input type="number" min="1" max="20" value={kabaddiHalfMinutes} onChange={(e) => setKabaddiHalfMinutes(e.target.value)} className={inputCls} />
                </Field>
                <Field label="All-out bonus">
                  <input type="number" min="1" max="4" value={kabaddiAlloutBonus} onChange={(e) => setKabaddiAlloutBonus(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
            {sport === "Relay" && (
              <Field label="Legs">
                <select value={relayLegs} onChange={(e) => setRelayLegs(Number(e.target.value))} className={inputCls}>
                  <option value={4}>4 legs (4×100)</option>
                  <option value={6}>6 legs</option>
                  <option value={2}>2 legs</option>
                </select>
              </Field>
            )}
            {sport === "Arm Wrestling" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Format">
                    <select value={armPulls} onChange={(e) => setArmPulls(Number(e.target.value))} className={inputCls}>
                      <option value={3}>Best of 3 pulls</option>
                      <option value={5}>Best of 5 pulls</option>
                    </select>
                  </Field>
                  <Field label="Arm">
                    <select value={armSide} onChange={(e) => setArmSide(e.target.value)} className={inputCls}>
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="both">Both</option>
                    </select>
                  </Field>
                </div>
                <Field label="Weight class (optional)">
                  <input value={weightClass} onChange={(e) => setWeightClass(e.target.value)} className={inputCls} placeholder="e.g. U-70kg" />
                </Field>
              </div>
            )}
            <Field label="Venue (optional)"><input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} placeholder="Main Ground" /></Field>
            <Field label="Schedule (optional)">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-olympus-gold" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={`${inputCls} pl-9 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100`}
                />
              </div>
            </Field>
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
  const [selectedSport, setSelectedSport] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, fs] = await Promise.all([fetchMatches(), fetchFranchises()]);
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

  const sportCategories = useMemo(() => {
    const base = ["All", ...SPORT_OPTIONS];
    const existing = Array.from(new Set(matches.map((m) => m.sport).filter(Boolean)));
    for (const s of existing) {
      if (!base.some((b) => b.toLowerCase() === s.toLowerCase())) {
        base.push(s);
      }
    }
    return base;
  }, [matches]);

  const displayMatches = useMemo(() => {
    if (selectedSport === "All") return matches;
    return matches.filter((m) => (m.sport || "Cricket").toLowerCase() === selectedSport.toLowerCase());
  }, [matches, selectedSport]);

  const live = displayMatches.filter((m) => m.status === "live" || m.status === "innings_break");
  const upcoming = displayMatches.filter((m) => m.status === "scheduled");
  const results = displayMatches.filter((m) => m.status === "completed" || m.status === "abandoned");

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
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl glass-strong shadow-inner">
            <Swords className="h-5 w-5 text-olympus-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Matches</h1>
            <p className="text-xs text-olympus-muted">Live scores &amp; results by sport</p>
          </div>
        </div>
        {(isAdmin || canCreateMatch) && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-xl bg-olympus-gold px-3.5 py-2 text-xs font-bold text-olympus-bg hover:brightness-110 shadow-lg shadow-olympus-gold/15 transition">
            <Plus className="h-4 w-4" /> Create
          </button>
        )}
      </div>

      {/* Sport Category Filter Bar */}
      {!loading && matches.length > 0 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {sportCategories.map((sport) => {
            const isSelected = selectedSport === sport;
            const count = sport === "All"
              ? matches.length
              : matches.filter((m) => (m.sport || "Cricket").toLowerCase() === sport.toLowerCase()).length;

            return (
              <button
                key={sport}
                type="button"
                onClick={() => setSelectedSport(sport)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "border border-olympus-gold/50 bg-olympus-gold/15 text-olympus-gold shadow-md shadow-olympus-gold/10"
                    : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <SportIcon sport={sport} className={`h-3.5 w-3.5 ${isSelected ? "text-olympus-gold" : "text-white/60"}`} />
                <span>{sport}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      isSelected ? "bg-olympus-gold/30 text-white" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-olympus-gold border-t-transparent" />
        </div>
      ) : displayMatches.length === 0 ? (
        <div className="rounded-2xl glass p-10 text-center">
          <p className="text-sm text-olympus-muted">No {selectedSport === "All" ? "" : selectedSport} matches found.</p>
          {(isAdmin || canCreateMatch) && <p className="mt-1 text-xs text-olympus-muted">Create one to get started.</p>}
        </div>
      ) : (
        <div className="space-y-7">
          {live.length > 0 && (
            <Section
              title="Live"
              items={live}
              franchises={franchises}
              isAdmin={isAdmin}
              onDelete={handleDeleteMatch}
              isFilteredBySport={selectedSport !== "All"}
            />
          )}
          {upcoming.length > 0 && (
            <Section
              title="Upcoming"
              items={upcoming}
              franchises={franchises}
              isAdmin={isAdmin}
              onDelete={handleDeleteMatch}
              isFilteredBySport={selectedSport !== "All"}
            />
          )}
          {results.length > 0 && (
            <Section
              title="Results"
              items={results}
              franchises={franchises}
              isAdmin={isAdmin}
              onDelete={handleDeleteMatch}
              isFilteredBySport={selectedSport !== "All"}
            />
          )}
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

function Section({ title, items, franchises, isAdmin, onDelete, isFilteredBySport }) {
  // Group items by sport if not already filtered by a single sport tab
  const groupedBySport = useMemo(() => {
    if (isFilteredBySport) {
      return { [items[0]?.sport || "Cricket"]: items };
    }
    const groups = {};
    for (const item of items) {
      const s = item.sport || "Cricket";
      if (!groups[s]) groups[s] = [];
      groups[s].push(item);
    }
    return groups;
  }, [items, isFilteredBySport]);

  const sports = Object.keys(groupedBySport);
  const showSubHeaders = !isFilteredBySport;

  return (
    <div className="rounded-2xl glass p-4 border border-white/10">
      <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-2.5">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2">
          {title === "Live" && <span className="live-dot h-2 w-2 rounded-full bg-olympus-success animate-pulse" />}
          <span>{title}</span>
        </h2>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
          {items.length} {items.length === 1 ? "match" : "matches"}
        </span>
      </div>

      <div className="space-y-4">
        {sports.map((sportName) => {
          const sportItems = groupedBySport[sportName];
          return (
            <div key={sportName} className="space-y-2.5">
              {showSubHeaders && (
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-olympus-gold/15 border border-olympus-gold/20">
                    <SportIcon sport={sportName} className="h-3.5 w-3.5 text-olympus-gold" />
                  </div>
                  <span className="text-[11px] font-bold text-olympus-gold uppercase tracking-wider">{sportName}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-olympus-gold/30 via-white/10 to-transparent" />
                  <span className="text-[10px] text-white/40 font-mono">({sportItems.length})</span>
                </div>
              )}
              <div className="space-y-2.5">
                {sportItems.map((m) => (
                  <MatchCard key={m.id} match={m} franchises={franchises} isAdmin={isAdmin} onDelete={onDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
