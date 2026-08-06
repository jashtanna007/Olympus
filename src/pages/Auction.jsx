import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Play, Pause, Shuffle, Shield, User, BadgeCheck, Star, ClipboardList,
  GraduationCap, MapPin, Phone, Mail, Calendar,
  CheckCircle2, XCircle, SkipForward, Undo2, Redo2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { franchises as mockFranchises } from "../data/mockData";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

/* ════════════════════════════════════════════════════════════
   LIVE AUCTION — Zero-scroll, all bugs fixed
   ════════════════════════════════════════════════════════════ */
export default function Auction() {
  const { canManageAuction } = useAuth();
  const isAdmin = canManageAuction;
  const navigate = useNavigate();

  /* ─── State ─── */
  const [auctionConfig, setAuctionConfig]   = useState(null);
  const [franchiseList, setFranchiseList]   = useState(mockFranchises);
  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [bids, setBids]                     = useState([]);
  const [flashFid, setFlashFid]             = useState(null);
  const [loading, setLoading]               = useState(true);
  const [bidPending, setBidPending]         = useState(false);
  const [historyPending, setHistoryPending] = useState(false);
  const [canUndo, setCanUndo]               = useState(false);
  const [canRedo, setCanRedo]               = useState(false);

  /* ─── Merge DB franchises with mock logo data ─── */
  // DB rows may not have logo/color fields → patch them from mockFranchises
  const enrichedFranchises = useMemo(() => {
    return franchiseList.map((f) => {
      const mock = mockFranchises.find(
        (m) => m.id === f.id || m.name === f.name
      );
      return mock ? { ...mock, ...f, logo: mock.logo, color: mock.color, secondaryColor: mock.secondaryColor } : f;
    });
  }, [franchiseList]);

  /* ─── Derived: current player ─── */
  const currentPlayer = useMemo(() => {
    if (!auctionConfig?.current_player_id) return null;
    const ap = auctionPlayers.find((p) => p.id === auctionConfig.current_player_id);
    if (!ap) return null;
    // Supabase foreign-key join returns an array for one-to-many relations;
    // grab the first element (or fall back to the object if it's already flat)
    const regRaw = ap.registration || ap.player_registrations;
    const reg = Array.isArray(regRaw) ? (regRaw[0] ?? {}) : (regRaw ?? {});
    return { ...ap, ...reg };
  }, [auctionConfig, auctionPlayers]);

  /* ─── Derived: upcoming players from the real auction queue ─── */
  const upcomingList = useMemo(() => {
    return auctionPlayers
      .filter((p) => p.status === "upcoming")
      .sort((a, b) => a.queue_order - b.queue_order)
      .slice(0, 5)
      .map((p) => {
        const regRaw = p.registration || p.player_registrations;
        const reg = Array.isArray(regRaw) ? (regRaw[0] ?? {}) : (regRaw ?? {});
        return { ...p, ...reg };
      });
  }, [auctionPlayers]);

  /* ─── Derived: bids for current player (DB + local) ─── */
  const dbBidsForCurrent = useMemo(() => {
    if (!auctionConfig?.current_player_id) return [];
    return bids
      .filter((b) => b.auction_player_id === auctionConfig.current_player_id)
      .sort((a, b) => b.amount - a.amount);
  }, [bids, auctionConfig]);

  const highestBid = dbBidsForCurrent[0] || null;

  const highestBidderFranchise = useMemo(() => {
    if (!highestBid) return null;
    return enrichedFranchises.find((f) => String(f.id) === String(highestBid.franchise_id)) || null;
  }, [highestBid, enrichedFranchises]);


  const basePrice = currentPlayer?.base_price ?? auctionConfig?.base_price ?? 200;
  const highestAmount = highestBid?.amount ?? null;
  const nextBidAmount = highestAmount == null
    ? basePrice
    : highestAmount + (highestAmount < 500 ? 50 : 100);
  const rosterCountsByFranchise = useMemo(() => {
    const counts = {};
    auctionPlayers.forEach((player) => {
      if (!["sold", "retained"].includes(player.status) || !player.sold_to_franchise_id) return;
      const key = String(player.sold_to_franchise_id);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [auctionPlayers]);

  const isLive = auctionConfig?.status === "live";

  /* ─── Load Data ─── */
  const refreshAuctionData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [configResult, franchisesResult, playersResult, bidsResult, historyResult] = await Promise.all([
        supabase.from("auction_config").select("*").order("created_at").limit(1).maybeSingle(),
        supabase.from("franchises").select("*").order("display_order"),
        supabase.from("auction_players").select("*, registration:player_registrations(*)").order("queue_order"),
        supabase.from("auction_bids").select("*").order("created_at", { ascending: false }),
        isAdmin
          ? supabase.rpc("auction_history_state")
          : Promise.resolve({ data: [{ can_undo: false, can_redo: false }], error: null }),
      ]);
      if (configResult.error) throw configResult.error;
      if (franchisesResult.error) throw franchisesResult.error;
      if (playersResult.error) throw playersResult.error;
      if (bidsResult.error) throw bidsResult.error;
      if (historyResult.error) throw historyResult.error;
      setAuctionConfig(configResult.data);
      if (franchisesResult.data?.length) setFranchiseList(franchisesResult.data);
      setAuctionPlayers(playersResult.data || []);
      setBids(bidsResult.data || []);
      const historyState = Array.isArray(historyResult.data)
        ? historyResult.data[0]
        : historyResult.data;
      setCanUndo(Boolean(historyState?.can_undo));
      setCanRedo(Boolean(historyState?.can_redo));
    } catch (error) {
      console.error("Auction load error:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refreshAuctionData(true);
  }, [refreshAuctionData]);

  /* ─── Realtime ─── */
  useEffect(() => {
    let refreshTimeout;
    const refreshSoon = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => void refreshAuctionData(), 150);
    };
    const ch = supabase.channel("auction-live-v2")
      .on("postgres_changes", { event: "*",      schema: "public", table: "auction_config"  }, (p) =>
        setAuctionConfig((prev) => ({ ...prev, ...p.new })))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids"    }, (p) => {
        const fid = String(p.new.franchise_id);
        setFlashFid(fid);
        setTimeout(() => setFlashFid(null), 1200);
        refreshSoon();
      })
      .on("postgres_changes", { event: "*",      schema: "public", table: "auction_players" }, refreshSoon)
      .on("postgres_changes", { event: "*",      schema: "public", table: "franchises"      }, refreshSoon)
      .on("postgres_changes", { event: "*",      schema: "public", table: "auction_action_history" }, refreshSoon)
      .subscribe();
    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(ch);
    };
  }, [refreshAuctionData]);

  /* ─── BID NOW ─── */
  const placeBidForFranchise = useCallback(async (franchiseId) => {
    if (!currentPlayer || bidPending) return;

    if (!isAdmin) {
      alert("Only an admin or auctioneer can place auction bids.");
      return;
    }

    if (
      highestBidderFranchise &&
      String(highestBidderFranchise.id) === String(franchiseId)
    ) {
      alert("This franchise is already the highest bidder.");
      return;
    }

    const fid = String(franchiseId);
    setBidPending(true);

    try {
      const { error } = await supabase.rpc("auction_place_bid", {
        p_franchise_id: franchiseId,
      });

      if (error) {
        console.error("Bid rejected:", error);
        alert(error.message);
        await refreshAuctionData();
        return;
      }

      setFlashFid(fid);
      setTimeout(() => setFlashFid(null), 1200);
      await refreshAuctionData();
    } finally {
      setBidPending(false);
    }
  }, [
    currentPlayer,
    bidPending,
    isAdmin,
    highestBidderFranchise,
    refreshAuctionData,
  ]);

  /* ─── Undo / Redo ─── */
  const runHistoryAction = useCallback(async (direction) => {
    if (!isAdmin || historyPending) return;

    setHistoryPending(true);
    try {
      const functionName = direction === "undo"
        ? "auction_undo_last"
        : "auction_redo_last";
      const { error } = await supabase.rpc(functionName);

      if (error) {
        console.error(`Unable to ${direction} auction action:`, error);
        alert(error.message);
        return;
      }

      await refreshAuctionData();
    } finally {
      setHistoryPending(false);
    }
  }, [historyPending, isAdmin, refreshAuctionData]);

  /* ─── Advance Player ─── */
  const advanceToNextPlayer = useCallback(async () => {
    if (!isAdmin || !currentPlayer) return;
    // A skipped player is recorded as unsold; the database advances the queue atomically.
    const { error } = await supabase.rpc("auction_complete_current", { p_outcome: "unsold" });
    if (error) {
      console.error("Unable to advance auction:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, currentPlayer, refreshAuctionData]);

  /* ─── SOLD ─── */
  const markSold = useCallback(async () => {
    if (!isAdmin || !currentPlayer || !highestBid) return;
    const { error } = await supabase.rpc("auction_complete_current", { p_outcome: "sold" });
    if (error) {
      console.error("Unable to mark sold:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, currentPlayer, highestBid, refreshAuctionData]);

  /* ─── UNSOLD ─── */
  const markUnsold = useCallback(async () => {
    if (!isAdmin || !currentPlayer) return;
    const { error } = await supabase.rpc("auction_complete_current", { p_outcome: "unsold" });
    if (error) {
      console.error("Unable to mark unsold:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, currentPlayer, refreshAuctionData]);

  /* ─── Toggle / Switch / Start ─── */
  const toggleAuction = useCallback(async () => {
    if (!isAdmin || !auctionConfig) return;
    const { error } = await supabase.rpc("auction_toggle_live");
    if (error) {
      console.error("Unable to toggle auction:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, auctionConfig, refreshAuctionData]);

  const switchGenderMode = useCallback(async (mode) => {
    if (!isAdmin || !auctionConfig) return;
    const { error } = await supabase.rpc("auction_set_gender", { p_gender_mode: mode });
    if (error) {
      console.error("Unable to change gender mode:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, auctionConfig, refreshAuctionData]);

  const startAuction = useCallback(async () => {
    if (!isAdmin || !auctionConfig) return;
    const { error } = await supabase.rpc("auction_start");
    if (error) {
      console.error("Unable to start auction:", error);
      alert(error.message);
      return;
    }
    await refreshAuctionData();
  }, [isAdmin, auctionConfig, refreshAuctionData]);

  /* ─── UI vars ─── */
  const isPaused   = auctionConfig?.status === "paused";
  const isSetup    = !auctionConfig || ["setup", "retention", "completed"].includes(auctionConfig?.status);
  const primarySport = currentPlayer?.sports?.[0];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090F]">
        <Gavel className="h-8 w-8 text-amber-400 animate-pulse" />
      </div>
    );
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="fixed inset-0 z-20 flex h-screen w-screen flex-col overflow-hidden bg-[#07090F] text-white select-none pt-[92px]">

      {/* ── TOP BAR ── */}
      <div className="shrink-0 border-b border-white/[0.07] bg-[#07090F]/95 px-5 py-2">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/30">
              <Gavel className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-white leading-tight">Live Auction</h1>
              <p className="text-[10px] text-white/40 leading-none">
                {auctionConfig?.gender_mode || "Male"} Players · Season 2026
              </p>
            </div>
            {isLive && (
              <span className="ml-2 flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-black text-emerald-400">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
              </span>
            )}
            {isPaused && (
              <span className="ml-2 flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-black text-amber-400">
                PAUSED
              </span>
            )}
            {!isAdmin && (
              <span className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[9px] font-bold text-white/45">
                READ ONLY
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/auction-summary")}
              className="flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-200 transition hover:bg-cyan-400/20">
              <ClipboardList className="h-3 w-3" /> Summary
            </button>
            {isAdmin && (
              <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => runHistoryAction("undo")}
                  disabled={!canUndo || historyPending}
                  title="Undo last bid or player result"
                  className="flex items-center gap-1 border-r border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </button>
                <button
                  type="button"
                  onClick={() => runHistoryAction("redo")}
                  disabled={!canRedo || historyPending}
                  title="Redo last undone action"
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Redo2 className="h-3 w-3" /> Redo
                </button>
              </div>
            )}
            {isAdmin && (
              <>
              <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                {["Male", "Female"].map((g) => (
                  <button key={g} onClick={() => switchGenderMode(g)}
                    className={`px-2.5 py-0.5 text-[11px] font-bold transition ${auctionConfig?.gender_mode === g ? "bg-amber-400 text-black" : "text-white/40 hover:text-white"}`}>
                    {g}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate("/retention")}
                className="flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 transition">
                <Shield className="h-3 w-3" /> Retention
              </button>
              {isSetup ? (
                <button onClick={startAuction}
                  className="flex items-center gap-1 rounded-md bg-amber-400 px-3 py-1 text-[11px] font-bold text-black hover:brightness-110 transition shadow-md shadow-amber-400/20">
                  <Shuffle className="h-3 w-3" /> Start Auction
                </button>
              ) : (
                <button onClick={toggleAuction}
                  className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition">
                  {isLive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {isLive ? "Pause" : "Resume"}
                </button>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CANVAS ── */}
      <div className="flex-1 overflow-hidden p-2.5">
        <div className="mx-auto flex h-full max-w-[1480px] flex-col gap-2.5">

          {/* PLAYER + AUCTION SIDEBAR */}
          <div className="grid flex-1 gap-2.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">

            {/* CENTER: PLAYER CARD */}
            <div className="flex flex-col rounded-xl border border-white/[0.07] bg-[#0C1120]/95 overflow-hidden">
              {!currentPlayer ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                      <User className="h-7 w-7 text-white/20" />
                    </div>
                    <p className="text-sm font-semibold text-white/30">
                      {isSetup ? "Click 'Start Auction' to begin" : "Waiting for next player..."}
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={currentPlayer.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }} className="flex flex-1 flex-col">

                    {/* Player Info */}
                    <div className="relative flex flex-1 items-start gap-4 p-4">
                      {/* Status badge */}
                      <div className="absolute left-4 top-3 z-10">
                        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          currentPlayer.status === "sold"   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : currentPlayer.status === "unsold" ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                          : "border-amber-400/40 bg-amber-400/10 text-amber-400"
                        }`}>
                          {currentPlayer.status === "sold" ? "SOLD" : currentPlayer.status === "unsold" ? "UNSOLD" : "UP FOR AUCTION"}
                        </span>
                      </div>

                      {/* Photo */}
                      <div className="relative shrink-0 pt-5">
                        <div className="relative h-52 w-44 overflow-hidden rounded-xl border border-blue-500/25 bg-gradient-to-b from-blue-900/40 via-blue-950/80 to-[#07090F]">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18)_0%,transparent_70%)]" />
                          {currentPlayer.photo_url ? (
                            <img src={currentPlayer.photo_url} alt={currentPlayer.full_name}
                              className="relative z-10 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-16 w-16 text-blue-300/20" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col pt-7 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h2 className="font-display text-2xl font-extrabold tracking-tight text-white truncate">
                            {currentPlayer.full_name}
                          </h2>
                          <BadgeCheck className="h-5 w-5 text-amber-400 shrink-0" />
                        </div>
                        <p className="text-xs font-bold text-amber-400 mb-3.5">
                          {primarySport?.position || currentPlayer.role || "Player"}
                        </p>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          <InfoItem icon={GraduationCap} label="Roll Number" value={currentPlayer.roll_number} />
                          <InfoItem icon={Calendar}      label="Year"        value={currentPlayer.year} />
                          <InfoItem icon={Mail}          label="Email"       value={currentPlayer.email} />
                          <InfoItem icon={MapPin}        label="Position"    value={primarySport?.position || currentPlayer.role} />
                          <InfoItem icon={Phone}         label="Phone"       value={currentPlayer.phone} />
                          <div className="flex items-start gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
                              <Star className="h-3.5 w-3.5 text-white/25" />
                            </div>
                            <div>
                              <p className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">Skill Level</p>
                              <div className="mt-0.5 flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => {
                                  const lvl   = primarySport?.skill_level;
                                  const filled = lvl === "Advanced" ? 5 : lvl === "Intermediate" ? 3 : 1;
                                  return <Star key={i} className={`h-3 w-3 ${i < filled ? "fill-amber-400 text-amber-400" : "text-white/10"}`} />;
                                })}
                              </div>
                            </div>
                          </div>
                          <InfoItem icon={GraduationCap} label="Branch" value={currentPlayer.branch} />
                          <SportsList sports={currentPlayer.sports} />
                        </div>
                      </div>
                    </div>


                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* RIGHT: UPCOMING + LIVE AUCTION */}
            <div className="flex flex-col gap-2.5 overflow-hidden">

              {/* Upcoming Players */}
              <div className="flex flex-1 flex-col rounded-xl border border-white/[0.07] bg-[#0C1120]/95 p-3 overflow-hidden">
                <h3 className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  UPCOMING PLAYERS
                </h3>
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
                  {upcomingList.length === 0 && (
                    <div className="flex h-full min-h-24 items-center justify-center rounded-lg border border-dashed border-white/10 px-3 text-center text-[10px] text-white/30">
                      No upcoming players are queued yet.
                    </div>
                  )}
                  {upcomingList.map((p) => (
                    <div key={p.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-1.5 hover:bg-white/[0.04] transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-blue-900/30 flex items-center justify-center">
                          {p.photo_url
                            ? <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" />
                            : <User className="h-3.5 w-3.5 text-white/20" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-white">{p.full_name}</p>
                          <p className="text-[9px] text-amber-400/80 font-medium leading-none">
                            {p.sports?.[0]?.position || p.sports?.[0]?.name || p.branch || "Player"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 text-right">
                        <p className="text-[7px] font-bold uppercase text-white/25">BASE</p>
                        <p className="text-[10px] font-extrabold text-white">
                          ₹ {(p.base_price || 200).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Auction Controls */}
              <div className="rounded-xl border border-white/[0.07] bg-[#0C1120]/95 p-3 shrink-0">
                <h3 className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  LIVE AUCTION
                </h3>

                {/* Highest bidder */}
                <div className="mb-2">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">
                    CURRENT HIGHEST BIDDER
                  </span>
                  <div className="mt-1 flex min-h-[40px] items-center gap-2 rounded-lg border border-white/10 bg-[#070A0F] px-2.5 py-1.5">
                    {highestBidderFranchise ? (
                      <>
                        <FranchiseEmblem franchise={highestBidderFranchise} size="sm" />
                        <span className="truncate text-xs font-bold text-white">{highestBidderFranchise.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-white/25">No bids yet — select a franchise below.</span>
                    )}
                  </div>
                </div>

                {/* Current and next bid */}
                <div className="mb-2.5 grid grid-cols-[1.25fr_0.75fr] gap-2 rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.10] to-transparent p-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">Current bid</p>
                    <motion.p
                      key={highestAmount ?? "opening"}
                      initial={{ scale: 1.08 }}
                      animate={{ scale: 1 }}
                      className="mt-1 font-display text-4xl font-black leading-none text-amber-400"
                    >
                      {highestAmount ? `₹${highestAmount.toLocaleString("en-IN")}` : "—"}
                    </motion.p>
                  </div>
                  <div className="border-l border-white/10 pl-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">Next bid</p>
                    <p className="mt-1 font-display text-2xl font-extrabold leading-none text-white">
                      ₹{nextBidAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[9px] text-white/35">
                    <span>Base price ₹{basePrice.toLocaleString("en-IN")}</span>
                    <span>Click a franchise card to place the next bid</span>
                  </div>
                </div>

                {/* SOLD / UNSOLD / NEXT */}
                <div className="flex gap-1.5">
                  <button onClick={markSold}
                    disabled={!highestBid || !currentPlayer || !isAdmin}
                    title={!highestBid ? "Place a bid first" : "Mark as Sold"}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-1.5 text-[9px] font-bold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-35 disabled:cursor-not-allowed">
                    <CheckCircle2 className="h-3 w-3" /> SOLD
                  </button>
                  <button onClick={markUnsold}
                    disabled={!currentPlayer || !isAdmin}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 py-1.5 text-[9px] font-bold text-rose-400 transition hover:bg-rose-500/25 disabled:opacity-35 disabled:cursor-not-allowed">
                    <XCircle className="h-3 w-3" /> UNSOLD
                  </button>
                  <button onClick={advanceToNextPlayer}
                    disabled={!currentPlayer || !isAdmin}
                    title="Skip to Next Player"
                    className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed">
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM STRIP */}
          <div className="shrink-0 rounded-xl border border-white/[0.07] bg-[#0C1120]/95 p-2.5">
            <h3 className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
              SELECT FRANCHISE TO PLACE NEXT BID
            </h3>
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
              {enrichedFranchises.map((f) => {
                const fid      = String(f.id);
                const isHighest = highestBidderFranchise && String(highestBidderFranchise.id) === fid;
                const isFlashing = fid === String(flashFid);
                const remaining = (f.total_budget || 10000) - (f.spent_amount || 0);

                return (
                  <motion.div key={f.id}
                    animate={isFlashing ? {
                      scale: [1, 1.06, 1],
                      boxShadow: ["0 0 0px transparent", "0 0 20px rgba(244,200,74,0.5)", "0 0 0px transparent"]
                    } : {}}
                    transition={{ duration: 0.55 }}
                    className={`flex flex-col items-center rounded-xl border p-2 text-center transition-all ${
                      isHighest
                        ? "border-amber-400 bg-amber-400/10 shadow-[0_0_14px_rgba(244,200,74,0.22)]"
                        : "border-white/[0.05] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="mb-1">
                      <FranchiseEmblem franchise={f} size="sm" />
                    </div>
                    <p className="w-full truncate text-[10px] font-bold text-white leading-tight">{f.name}</p>
                    <p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-white/30">Purse remaining</p>
                    <p className="mt-0.5 text-[12px] font-extrabold text-emerald-300">
                      ₹ {remaining.toLocaleString("en-IN")}
                    </p>
                    <button onClick={() => placeBidForFranchise(f.id)}
                      disabled={!currentPlayer || !isAdmin || bidPending || isHighest}
                      className={`mt-1.5 w-full rounded-lg py-1 text-[9px] font-black uppercase tracking-wide transition disabled:opacity-30 disabled:cursor-not-allowed ${
                        isHighest
                          ? "bg-amber-400 text-black hover:brightness-110"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                      }`}>
                      BID NOW
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Sports helper ── */
function SportsList({ sports }) {
  const values = Array.isArray(sports) ? sports.filter(Boolean) : [];

  return (
    <div className="col-span-2 flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
        <User className="h-3.5 w-3.5 text-white/25" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">Sports</p>
        {values.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {values.map((sport, index) => (
              <span key={`${sport.name || "sport"}-${index}`}
                className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[9px] font-semibold text-amber-100/80">
                {sport.name || "Sport"}
                {sport.position ? ` · ${sport.position}` : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 text-[11px] font-bold text-white/35">—</p>
        )}
      </div>
    </div>
  );
}

/* ── Info row helper ── */
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
        <Icon className="h-3.5 w-3.5 text-white/25" />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">{label}</p>
        <p className="mt-0.5 truncate text-[11px] font-bold text-white">{value || "—"}</p>
      </div>
    </div>
  );
}
