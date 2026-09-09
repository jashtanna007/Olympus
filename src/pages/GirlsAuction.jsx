import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, User, BadgeCheck, Star, ClipboardList,
  GraduationCap, Mail, Phone, Calendar, MapPin,
  CheckCircle2, XCircle, ArrowLeft, Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

/* ════════════════════════════════════════════════════════════
   GIRLS INDIVIDUAL AUCTION — Cricket & Football
   No franchise bidding. Admin marks players as selected/not selected.
   ════════════════════════════════════════════════════════════ */

const GIRLS_INDIVIDUAL_SPORTS = ["Cricket", "Football"];

function getRegistration(ap) {
  const raw = ap?.registration || ap?.player_registrations;
  return Array.isArray(raw) ? raw[0] ?? {} : raw ?? {};
}

export default function GirlsAuction() {
  const { canManageAuction } = useAuth();
  const isAdmin = canManageAuction;
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(null);

  const loadPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("auction_players")
        .select("*, registration:player_registrations(*)")
        .eq("auction_type", "girls_individual")
        .order("queue_order");

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error("Girls auction load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlayers(); }, [loadPlayers]);

  /* ─── Realtime ─── */
  useEffect(() => {
    let timeout;
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => void loadPlayers(), 150);
    };
    const ch = supabase
      .channel("girls-auction-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players" }, refresh)
      .subscribe();
    return () => { clearTimeout(timeout); supabase.removeChannel(ch); };
  }, [loadPlayers]);

  /* ─── Derived lists ─── */
  const enriched = useMemo(() => players.map((p) => {
    const reg = getRegistration(p);
    const sport = (reg.sports || []).find((s) => GIRLS_INDIVIDUAL_SPORTS.includes(s.name));
    return { ...p, ...reg, primarySport: sport };
  }), [players]);

  const upcoming = useMemo(() => enriched.filter((p) => p.status === "upcoming"), [enriched]);
  const selected = useMemo(() => enriched.filter((p) => p.status === "sold"), [enriched]);
  const notSelected = useMemo(() => enriched.filter((p) => p.status === "unsold"), [enriched]);

  /* ─── Admin: mark selected / not selected ─── */
  const markPlayer = useCallback(async (playerId, outcome) => {
    if (!isAdmin || actionPending) return;
    setActionPending(playerId);
    try {
      const updates = outcome === "selected"
        ? { status: "sold", sold_at: new Date().toISOString() }
        : { status: "unsold", sold_at: new Date().toISOString() };

      const { error } = await supabase
        .from("auction_players")
        .update(updates)
        .eq("id", playerId)
        .eq("auction_type", "girls_individual");

      if (error) { alert(error.message); return; }
      await loadPlayers();
    } finally {
      setActionPending(null);
    }
  }, [isAdmin, actionPending, loadPlayers]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090F]">
        <Gavel className="h-8 w-8 text-pink-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-white pb-20 pt-28 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button onClick={() => navigate("/auction")}
              className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Franchise Auction
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/30">
                <Gavel className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Girls Individual Auction
                </h1>
                <p className="text-xs text-white/40">
                  Cricket & Football · No franchise bidding
                </p>
              </div>
            </div>
          </div>
          {!isAdmin && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-white/45">
              READ ONLY
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Upcoming" value={upcoming.length} color="amber" />
          <StatCard label="Selected" value={selected.length} color="emerald" />
          <StatCard label="Not Selected" value={notSelected.length} color="rose" />
        </div>

        {/* Upcoming Players */}
        {upcoming.length > 0 && (
          <Section title="Upcoming Players" count={upcoming.length}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((p) => (
                <PlayerCard key={p.id} player={p} isAdmin={isAdmin}
                  actionPending={actionPending} onMark={markPlayer} showActions />
              ))}
            </div>
          </Section>
        )}

        {/* Selected Players */}
        {selected.length > 0 && (
          <Section title="Selected" count={selected.length}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.map((p) => (
                <PlayerCard key={p.id} player={p} status="selected" />
              ))}
            </div>
          </Section>
        )}

        {/* Not Selected */}
        {notSelected.length > 0 && (
          <Section title="Not Selected" count={notSelected.length}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notSelected.map((p) => (
                <PlayerCard key={p.id} player={p} status="not-selected" />
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {enriched.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User className="mb-3 h-12 w-12 text-white/10" />
            <p className="text-sm font-semibold text-white/30">
              No girls Cricket or Football players in the auction queue yet.
            </p>
            <p className="mt-1 text-xs text-white/20">
              Players registered for these sports will appear here once added to the auction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ label, value, color }) {
  const colorMap = {
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-400",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
        {title} ({count})
      </h2>
      {children}
    </div>
  );
}

function PlayerCard({ player, isAdmin, actionPending, onMark, showActions, status }) {
  const sport = player.primarySport;
  const skillLevel = sport?.skill_level;
  const filled = skillLevel === "Advanced" ? 5 : skillLevel === "Intermediate" ? 3 : 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border bg-[#0C1120]/95 p-4 ${
        status === "selected"
          ? "border-emerald-500/30"
          : status === "not-selected"
            ? "border-rose-500/20 opacity-60"
            : "border-white/[0.07]"
      }`}
    >
      {/* Status badge */}
      {status && (
        <div className="absolute right-3 top-3">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase ${
            status === "selected"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/40 bg-rose-500/10 text-rose-400"
          }`}>
            {status === "selected" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {status === "selected" ? "Selected" : "Not Selected"}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Photo */}
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.full_name}
              className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-6 w-6 text-white/15" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-white">{player.full_name}</h3>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-pink-400" />
          </div>
          <p className="text-[10px] font-bold text-pink-400">{sport?.name || "Player"}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
            <MiniInfo icon={GraduationCap} value={player.roll_number} />
            <MiniInfo icon={Calendar} value={player.year} />
            <MiniInfo icon={MapPin} value={sport?.position || "—"} />
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-2.5 w-2.5 ${i < filled ? "fill-amber-400 text-amber-400" : "text-white/10"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin actions */}
      {showActions && isAdmin && (
        <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
          <button
            onClick={() => onMark(player.id, "selected")}
            disabled={actionPending === player.id}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-40"
          >
            {actionPending === player.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCircle2 className="h-3.5 w-3.5" />}
            Select
          </button>
          <button
            onClick={() => onMark(player.id, "not-selected")}
            disabled={actionPending === player.id}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 py-2 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-40"
          >
            {actionPending === player.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <XCircle className="h-3.5 w-3.5" />}
            Skip
          </button>
        </div>
      )}
    </motion.div>
  );
}

function MiniInfo({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-white/20" />
      <span className="truncate text-[10px] text-white/50">{value || "—"}</span>
    </div>
  );
}
