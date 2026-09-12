import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Bell, Megaphone, Send, X, ChevronDown,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { franchises as mockFranchises } from "../../data/mockData";
import GlassCard from "../ui/GlassCard";

/* ─── Feed event types ─── */
// Each entry in the unified feed is either:
//   { kind: "player", player: {...}, ts: Date }
//   { kind: "announcement", message: "...", ts: Date }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function getFranchiseName(franchiseId, dbFranchises) {
  if (!franchiseId) return null;
  const found = dbFranchises.find((f) => String(f.id) === String(franchiseId));
  return found?.name || found?.short_code || null;
}

/* ─── Single feed row ─── */
function FeedRow({ item }) {
  if (item.kind === "announcement") {
    return (
      <div className="flex gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/15">
          <Megaphone className="h-3 w-3 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-snug text-white/90">{item.message}</p>
          <p className="mt-0.5 text-[9px] text-white/35">{timeAgo(item.ts)}</p>
        </div>
      </div>
    );
  }

  // player event
  const isSold = item.status === "sold";
  return (
    <div className={`flex gap-2.5 rounded-xl border p-2.5 ${
      isSold
        ? "border-emerald-500/20 bg-emerald-500/[0.05]"
        : "border-rose-500/20 bg-rose-500/[0.05]"
    }`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
        isSold ? "bg-emerald-500/15" : "bg-rose-500/15"
      }`}>
        {isSold
          ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          : <XCircle className="h-3 w-3 text-rose-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-white">{item.playerName}</p>
        {isSold ? (
          <p className="text-[10px] text-emerald-300/80">
            → {item.franchiseName} · <span className="font-bold">₹{(item.soldPrice || 0).toLocaleString("en-IN")}</span>
          </p>
        ) : (
          <p className="text-[10px] text-rose-300/60">Unsold</p>
        )}
        <p className="mt-0.5 text-[9px] text-white/30">{timeAgo(item.ts)}</p>
      </div>
      <span className={`self-start rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
        isSold
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-rose-500/20 text-rose-400"
      }`}>
        {isSold ? "SOLD" : "UNSOLD"}
      </span>
    </div>
  );
}

/* ─── Full drawer ─── */
function FeedDrawer({ open, onClose, feed, isAdmin }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const sendAnnouncement = async () => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("send_auction_announcement", { p_message: text });
      if (error) throw error;
      setMsg("");
    } catch (e) {
      alert(e.message || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0C1120] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
              <Bell className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <h2 className="font-display text-sm font-bold text-white">Auction Feed</h2>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black text-emerald-400">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Admin compose box */}
        {isAdmin && (
          <div className="shrink-0 border-b border-white/10 bg-amber-400/[0.04] px-4 py-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400/70">Send Announcement</p>
            <div className="flex gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendAnnouncement(); } }}
                placeholder="Type a message for all viewers..."
                maxLength={500}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400/40 focus:ring-0"
              />
              <button
                onClick={sendAnnouncement}
                disabled={!msg.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-black transition hover:brightness-110 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Feed list */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gavel className="mb-3 h-8 w-8 text-white/15" />
              <p className="text-sm text-white/30">No events yet — auction feed will appear here live.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {feed.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FeedRow item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function AuctionFeedPanel() {
  const { isAdmin } = useAuth();

  const [players, setPlayers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dbFranchises, setDbFranchises] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mountedRef = useRef(true);

  // Load sold/unsold player events — runs independently of announcements
  const loadPlayers = useCallback(async () => {
    try {
      const [{ data: ap }, { data: fran }] = await Promise.all([
        supabase
          .from("auction_players")
          .select("id, status, sold_to_franchise_id, sold_price, updated_at, registration:player_registrations(full_name)")
          .in("status", ["sold", "unsold"])
          .order("updated_at", { ascending: false })
          .limit(30),
        supabase.from("franchises").select("id, name, short_code"),
      ]);
      if (!mountedRef.current) return;
      if (ap) setPlayers(ap);
      if (fran) setDbFranchises(fran);
    } catch {
      // Non-critical — silently fail
    }
  }, []);

  // Load announcements — silently fails if table doesn't exist yet
  const loadAnnouncements = useCallback(async () => {
    try {
      const { data: ann } = await supabase
        .from("auction_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!mountedRef.current) return;
      if (ann) setAnnouncements(ann);
    } catch {
      // auction_announcements table may not exist yet — ignore
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadPlayers();
    void loadAnnouncements();
    return () => { mountedRef.current = false; };
  }, [loadPlayers, loadAnnouncements]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase
      .channel("auction-feed-panel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auction_players" },
        (payload) => {
          if (!mountedRef.current) return;
          // Refetch with registration join so player name shows correctly
          if (["sold", "unsold"].includes(payload.new?.status)) {
            void loadPlayers();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auction_announcements" },
        (payload) => {
          if (!mountedRef.current) return;
          setAnnouncements((prev) => [payload.new, ...prev].slice(0, 30));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadPlayers]);

  // Build unified feed, sorted newest first
  const feed = useMemo(() => {
    const playerItems = players.map((p) => {
      const regRaw = p.registration;
      const reg = Array.isArray(regRaw) ? (regRaw[0] ?? {}) : (regRaw ?? {});
      return {
        id: `p-${p.id}`,
        kind: "player",
        status: p.status,
        playerName: reg.full_name || "Unknown Player",
        franchiseName: getFranchiseName(p.sold_to_franchise_id, [...mockFranchises, ...dbFranchises]),
        soldPrice: p.sold_price,
        ts: p.updated_at,
      };
    });
    const annItems = announcements.map((a) => ({
      id: `a-${a.id}`,
      kind: "announcement",
      message: a.message,
      ts: a.created_at,
    }));
    return [...playerItems, ...annItems].sort(
      (a, b) => new Date(b.ts) - new Date(a.ts)
    );
  }, [players, announcements, dbFranchises]);

  const preview = feed.slice(0, 3);

  return (
    <>
      <GlassCard variant="strong" className="h-full p-5 flex flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olympus-blue/10">
              <Gavel className="h-4 w-4 text-olympus-blue" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-olympus-muted">
              Auction Feed
            </h3>
          </div>
          {feed.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black text-emerald-400">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
            </span>
          )}
        </div>

        {/* Preview rows */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {preview.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-2xl glass-dark px-5 text-center">
              <Gavel className="h-7 w-7 text-olympus-gold/70" />
              <strong className="mt-3 text-sm text-white/90">Auction Coming Soon</strong>
              <p className="mt-2 text-xs leading-relaxed text-olympus-subtle">
                Live player updates and announcements will appear here.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {preview.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FeedRow item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Open full feed button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-[10px] font-bold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
        >
          <Bell className="h-3 w-3" />
          {feed.length > 0 ? `View all ${feed.length} updates` : "Open feed"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </GlassCard>

      <AnimatePresence>
        {drawerOpen && (
          <FeedDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            feed={feed}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>
    </>
  );
}
