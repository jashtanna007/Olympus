import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Play, Pause, Shuffle, Shield, User, BadgeCheck, Star,
  GraduationCap, MapPin, Phone, Mail, Calendar, Minus, Plus,
  CheckCircle2, XCircle, SkipForward, Timer,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { franchises as mockFranchises } from "../data/mockData";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

/* ─── Countdown Timer Hook (60 seconds) ─── */
function useCountdown(isActive, endsAt, initialSeconds = 60) {
  const getSeconds = useCallback(() => {
    if (!endsAt) return initialSeconds;
    return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
  }, [endsAt, initialSeconds]);
  const [seconds, setSeconds] = useState(getSeconds);
  const [flash, setFlash] = useState(false);
  const ref = useRef(null);

  const reset = useCallback(() => {
    setSeconds(getSeconds());
    setFlash(false);
  }, [getSeconds]);

  useEffect(() => {
    clearInterval(ref.current);
    if (!isActive) return;
    setSeconds(getSeconds());
    ref.current = setInterval(() => setSeconds(getSeconds()), 1000);
    return () => clearInterval(ref.current);
  }, [isActive, getSeconds]);

  const bump = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
  }, []);

  return { seconds, flash, reset, bump };
}

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
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(null);
  const [nextBidAmount, setNextBidAmount]   = useState(null);
  const [flashFid, setFlashFid]             = useState(null);
  const [loading, setLoading]               = useState(true);

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

  /* ─── Derived: upcoming (show mock when empty for demo) ─── */
  const MOCK_UPCOMING = useMemo(() => enrichedFranchises.slice(0, 4).map((f, i) => ({
    id: `mock-up-${i}`,
    full_name: ["Rohan Singh", "Vikram Iyer", "Kabir Das", "Aditya Nair"][i],
    role: ["Batsman", "Goalkeeper", "Power Hitter", "All-Rounder"][i],
    base_price: 200,
    photo_url: null,
  })), [enrichedFranchises]);

  const upcomingList = useMemo(() => {
    const real = auctionPlayers
      .filter((p) => p.status === "upcoming")
      .sort((a, b) => a.queue_order - b.queue_order)
      .slice(0, 4)
      .map((p) => {
        const regRaw = p.registration || p.player_registrations;
        const reg = Array.isArray(regRaw) ? (regRaw[0] ?? {}) : (regRaw ?? {});
        return { ...p, ...reg };
      });
    return real.length > 0 ? real : MOCK_UPCOMING;
  }, [auctionPlayers, MOCK_UPCOMING]);

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

  // Per-franchise last bid map for bottom strip
  const lastBidsMap = useMemo(() => {
    const map = {};
    // DB bids
    if (auctionConfig?.current_player_id) {
      bids
        .filter((b) => b.auction_player_id === auctionConfig.current_player_id)
        .forEach((b) => {
          const k = String(b.franchise_id);
          if (!map[k] || b.amount > map[k]) map[k] = b.amount;
        });
    }
    return map;
  }, [bids, auctionConfig]);

  const basePrice = currentPlayer?.base_price ?? auctionConfig?.base_price ?? 200;
  const bidInc    = auctionConfig?.bid_increment ?? 50;
  const highestAmount = highestBid?.amount ?? null;
  const displayNextBid = nextBidAmount ?? ((highestAmount ?? basePrice) + bidInc);

  /* ─── Timer ─── */
  const isLive = auctionConfig?.status === "live";
  const { seconds: timerSec, flash: timerFlash, reset: resetTimer, bump: bumpTimer } =
    useCountdown(isLive && !!currentPlayer, auctionConfig?.round_ends_at, 60);

  const prevPlayerId = useRef(null);
  useEffect(() => {
    if (currentPlayer?.id && currentPlayer.id !== prevPlayerId.current) {
      prevPlayerId.current = currentPlayer.id;
      resetTimer();
    }
  }, [currentPlayer?.id, resetTimer]);

  /* ─── Load Data ─── */
  const refreshAuctionData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [configResult, franchisesResult, playersResult, bidsResult] = await Promise.all([
        supabase.from("auction_config").select("*").order("created_at").limit(1).maybeSingle(),
        supabase.from("franchises").select("*").order("display_order"),
        supabase.from("auction_players").select("*, registration:player_registrations(*)").order("queue_order"),
        supabase.from("auction_bids").select("*").order("created_at", { ascending: false }),
      ]);
      if (configResult.error) throw configResult.error;
      if (franchisesResult.error) throw franchisesResult.error;
      if (playersResult.error) throw playersResult.error;
      if (bidsResult.error) throw bidsResult.error;
      setAuctionConfig(configResult.data);
      if (franchisesResult.data?.length) setFranchiseList(franchisesResult.data);
      setAuctionPlayers(playersResult.data || []);
      setBids(bidsResult.data || []);
    } catch (error) {
      console.error("Auction load error:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

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
        bumpTimer();
        setTimeout(() => setFlashFid(null), 1200);
        refreshSoon();
      })
      .on("postgres_changes", { event: "*",      schema: "public", table: "auction_players" }, refreshSoon)
      .on("postgres_changes", { event: "*",      schema: "public", table: "franchises"      }, refreshSoon)
      .subscribe();
    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(ch);
    };
  }, [bumpTimer, refreshAuctionData]);

  /* ─── BID NOW ─── */
  const placeBidForFranchise = useCallback(async (franchiseId) => {
    if (!isAdmin || !currentPlayer) return;
    const fid = String(franchiseId);
    const amount = nextBidAmount ?? ((highestAmount ?? basePrice) + bidInc);

    const { error } = await supabase.rpc("auction_place_bid", {
      p_franchise_id: franchiseId,
      p_amount: amount,
    });
    if (error) {
      console.error("Bid rejected:", error);
      alert(error.message);
      await refreshAuctionData();
      return;
    }
    setSelectedFranchiseId(franchiseId);
    setNextBidAmount(null);
    setFlashFid(fid);
    bumpTimer();
    setTimeout(() => setFlashFid(null), 1200);
    await refreshAuctionData();
  }, [currentPlayer, nextBidAmount, highestAmount, basePrice, bidInc, isAdmin, bumpTimer, refreshAuctionData]);

  const placeNextBid = useCallback(() => {
    if (selectedFranchiseId) placeBidForFranchise(selectedFranchiseId);
  }, [selectedFranchiseId, placeBidForFranchise]);

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
    setNextBidAmount(null);
    setSelectedFranchiseId(null);
    resetTimer();
    await refreshAuctionData();
  }, [isAdmin, currentPlayer, resetTimer, refreshAuctionData]);

  /* ─── SOLD ─── */
  const markSold = useCallback(async () => {
    if (!isAdmin || !currentPlayer || !highestBid) return;
    const { error } = await supabase.rpc("auction_complete_current", { p_outcome: "sold" });
    if (error) {
      console.error("Unable to mark sold:", error);
      alert(error.message);
      return;
    }
    setNextBidAmount(null);
    setSelectedFranchiseId(null);
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
    setNextBidAmount(null);
    setSelectedFranchiseId(null);
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
  const timerDanger = timerSec > 0 && timerSec <= 10;
  const selectedF = enrichedFranchises.find((f) => String(f.id) === String(selectedFranchiseId));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090F]">
        <Gavel className="h-8 w-8 text-amber-400 animate-pulse" />
      </div>
    );
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="fixed inset-0 z-20 flex h-screen w-screen flex-col overflow-hidden bg-[#07090F] text-white select-none pt-[64px]">

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
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CANVAS ── */}
      <div className="flex-1 overflow-hidden p-2.5">
        <div className="mx-auto flex h-full max-w-[1480px] flex-col gap-2.5">

          {/* TOP 3-COL */}
          <div className="grid flex-1 gap-2.5 overflow-hidden lg:grid-cols-[215px_1fr_252px]">

            {/* LEFT: FRANCHISES */}
            <div className="flex flex-col rounded-xl border border-white/[0.07] bg-[#0C1120]/95 p-3 overflow-hidden">
              <h2 className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                FRANCHISES
              </h2>
              <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5 scrollbar-thin">
                {enrichedFranchises.map((f) => {
                  const fid = String(f.id);
                  const isHighest = highestBidderFranchise && String(highestBidderFranchise.id) === fid;
                  const isSelected = fid === String(selectedFranchiseId);
                  const isFlashing = fid === String(flashFid);
                  const remaining = (f.total_budget || 10000) - (f.spent_amount || 0);

                  return (
                    <motion.button
                      key={f.id}
                      onClick={() => placeBidForFranchise(f.id)}
                      animate={isFlashing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all ${
                        isHighest
                          ? "border border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(244,200,74,0.18)]"
                          : isSelected
                          ? "border border-white/20 bg-white/[0.06]"
                          : "border border-white/[0.04] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                      }`}
                    >
                      <FranchiseEmblem franchise={f} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-white">{f.name}</p>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-amber-400">
                            ₹ {remaining.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] text-white/25">
                            {f.roster?.length || 0}P
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

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
                          <InfoItem icon={User} label="Sports"
                            value={(currentPlayer.sports || []).map((s) => s.name).join(", ") || "—"} />
                        </div>
                      </div>
                    </div>

                    {/* Price Strip + Timer */}
                    <div className="grid grid-cols-[1fr_1fr_96px] divide-x divide-white/[0.06] border-t border-white/[0.06] bg-[#080C16]/90 shrink-0">
                      <div className="flex flex-col items-center justify-center py-2.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/30">BASE PRICE</span>
                        <span className="mt-0.5 font-display text-2xl font-extrabold text-amber-400">
                          ₹ {basePrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/30">CURRENT HIGHEST BID</span>
                        {highestAmount ? (
                          <motion.span key={highestAmount}
                            initial={{ scale: 1.3, color: "#F4C84A" }} animate={{ scale: 1, color: "#F4C84A" }}
                            transition={{ duration: 0.4 }}
                            className="mt-0.5 font-display text-2xl font-extrabold text-amber-400">
                            ₹ {highestAmount.toLocaleString("en-IN")}
                          </motion.span>
                        ) : (
                          <span className="mt-0.5 font-display text-xl font-extrabold text-white/20">No bids yet</span>
                        )}
                        {highestBidderFranchise && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
                            <FranchiseEmblem franchise={highestBidderFranchise} size="sm" className="!h-4 !w-4" />
                            By {highestBidderFranchise.name}
                          </div>
                        )}
                      </div>
                      {/* Timer */}
                      <div className={`flex flex-col items-center justify-center px-3 py-2.5 transition-colors ${
                        timerDanger ? "bg-rose-500/10" : timerFlash ? "bg-amber-400/10" : ""}`}>
                        <Timer className={`h-4 w-4 mb-0.5 ${timerDanger ? "text-rose-400" : timerFlash ? "text-amber-400" : "text-white/25"}`} />
                        <span className={`font-display text-2xl font-extrabold tabular-nums ${
                          timerSec === 0 ? "text-rose-500" : timerDanger ? "text-rose-400" : timerFlash ? "text-amber-400" : "text-white"}`}>
                          {String(Math.floor(timerSec / 60)).padStart(2, "0")}:{String(timerSec % 60).padStart(2, "0")}
                        </span>
                        <span className="text-[7px] uppercase text-white/25">Timer</span>
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
                            {p.role || (p.sports?.[0]?.name) || p.branch || "Player"}
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

                {/* Highest Bidder */}
                <div className="mb-2">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">
                    CURRENT HIGHEST BIDDER
                  </span>
                  <div className="mt-1 flex min-h-[36px] items-center gap-2 rounded-lg border border-white/10 bg-[#070A0F] px-2.5 py-1.5">
                    {highestBidderFranchise ? (
                      <>
                        <FranchiseEmblem franchise={highestBidderFranchise} size="sm" />
                        <span className="truncate text-xs font-bold text-white">{highestBidderFranchise.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-white/25">No bids yet — click BID NOW below</span>
                    )}
                  </div>
                </div>

                {/* Current Bid */}
                <div className="mb-2">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-white/30">CURRENT BID</span>
                  <p className="font-display text-xl font-extrabold leading-tight text-amber-400">
                    {highestAmount ? `₹ ${highestAmount.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>

                {/* Place Next Bid */}
                <button onClick={placeNextBid}
                  disabled={!selectedFranchiseId || !currentPlayer}
                  className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2 text-[10px] font-black text-black transition hover:brightness-110 active:scale-[0.98] shadow-md shadow-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Gavel className="h-3.5 w-3.5" />
                  {selectedFranchiseId
                    ? `Place Next Bid — ${selectedF?.name || ""}`
                    : "Select a Franchise Below"}
                </button>

                {/* Bid Adjuster */}
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#070A0F] px-1.5 py-0.5 mb-2.5">
                  <button onClick={() => setNextBidAmount(Math.max(displayNextBid - bidInc, basePrice))}
                    className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-display text-sm font-extrabold text-white">
                    ₹ {displayNextBid.toLocaleString("en-IN")}
                  </span>
                  <button onClick={() => setNextBidAmount(displayNextBid + bidInc)}
                    className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* SOLD / UNSOLD / NEXT */}
                <div className="flex gap-1.5">
                  <button onClick={markSold}
                    disabled={!highestBid || !currentPlayer}
                    title={!highestBid ? "Place a bid first" : "Mark as Sold"}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-1.5 text-[9px] font-bold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-35 disabled:cursor-not-allowed">
                    <CheckCircle2 className="h-3 w-3" /> SOLD
                  </button>
                  <button onClick={markUnsold}
                    disabled={!currentPlayer}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 py-1.5 text-[9px] font-bold text-rose-400 transition hover:bg-rose-500/25 disabled:opacity-35 disabled:cursor-not-allowed">
                    <XCircle className="h-3 w-3" /> UNSOLD
                  </button>
                  <button onClick={advanceToNextPlayer}
                    disabled={!currentPlayer}
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
              BID FROM FRANCHISES
            </h3>
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
              {enrichedFranchises.map((f) => {
                const fid      = String(f.id);
                const isHighest = highestBidderFranchise && String(highestBidderFranchise.id) === fid;
                const isFlashing = fid === String(flashFid);
                const lastBid  = lastBidsMap[fid];
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
                    <p className={`mt-0.5 text-[11px] font-extrabold ${lastBid ? "text-amber-400" : "text-white/30"}`}>
                      {lastBid
                        ? `₹ ${lastBid.toLocaleString("en-IN")}`
                        : `₹ ${remaining.toLocaleString("en-IN")}`}
                    </p>
                    <button onClick={() => placeBidForFranchise(f.id)}
                      disabled={!currentPlayer}
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
