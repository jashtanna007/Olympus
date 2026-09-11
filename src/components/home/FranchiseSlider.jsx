import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { franchises as mockFranchises } from "../../data/mockData";
import { supabase } from "../../lib/supabase";
import FranchiseEmblem from "../common/FranchiseEmblem";

export default function FranchiseSlider({ onFranchiseClick }) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [liveFranchises, setLiveFranchises] = useState([]);

  const loadLiveFranchises = useCallback(async () => {
    try {
      const [franchiseResult, memberResult] = await Promise.all([
        supabase
          .from("franchises")
          .select("*")
          .order("display_order"),
        supabase.rpc("get_franchise_display_members"),
      ]);

      if (franchiseResult.error) throw franchiseResult.error;
      if (memberResult.error) throw memberResult.error;

      const dbFranchises = franchiseResult.data || [];
      const members = memberResult.data || [];

      const enriched = dbFranchises.map((franchise) => {
        const mock = mockFranchises.find(
          (item) =>
            item.name === franchise.name ||
            String(item.id) === String(franchise.id)
        );

        const leaderRow = members.find(
          (member) =>
            String(member.franchise_id) === String(franchise.id) &&
            member.role === "leader"
        );

        const roster = members
          .filter(
            (member) =>
              String(member.franchise_id) === String(franchise.id) &&
              member.role === "player"
          )
          .map((member) => ({
            id: member.id,
            name: member.display_name || member.roll_number,
            rollNumber: member.roll_number,
            photoUrl: member.photo_url || null,
            sports: Array.isArray(member.sports) ? member.sports : [],
            amount: member.purchase_price,
            status: "sold",
          }));

        return {
          ...mock,
          ...franchise,
          short: mock?.short || franchise.short_code,
          logo: mock?.logo,
          color:
            mock?.color ||
            franchise.primary_color ||
            "#F4C84A",
          secondaryColor:
            mock?.secondaryColor ||
            franchise.secondary_color ||
            "#2563EB",
          leader: leaderRow
            ? {
                name:
                  leaderRow.display_name ||
                  leaderRow.roll_number,
                role: "Franchise Leader",
                image: null,
              }
            : mock?.leader,
          roster,
          remainingBudget:
            Number(franchise.total_budget || 0) -
            Number(franchise.spent_amount || 0),
        };
      });

      setLiveFranchises(enriched);
    } catch (error) {
      console.error("Homepage franchise load failed:", error);
    }
  }, []);

  useEffect(() => {
    void loadLiveFranchises();

    let refreshTimeout;

    const refreshSoon = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(
        () => void loadLiveFranchises(),
        150
      );
    };

    const channel = supabase
      .channel("homepage-franchise-rosters")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "franchises" },
        refreshSoon
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "franchise_members" },
        refreshSoon
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_players" },
        refreshSoon
      )
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [loadLiveFranchises]);

  const franchises =
    liveFranchises.length > 0 ? liveFranchises : mockFranchises;

  const scrollToIndex = useCallback((index) => {
    if (!trackRef.current) return;
    const clamped = Math.max(0, Math.min(index, franchises.length - 1));
    setActiveIndex(clamped);
    const cards = trackRef.current.children;
    if (cards[clamped]) {
      cards[clamped].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  const next = useCallback(
    () => scrollToIndex(activeIndex + 1),
    [activeIndex, scrollToIndex]
  );
  const prev = useCallback(
    () => scrollToIndex(activeIndex - 1),
    [activeIndex, scrollToIndex]
  );

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  useEffect(() => {
    const container = trackRef.current;
    if (!container) return undefined;

    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        const cards = Array.from(container.children);
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const distance = Math.abs(containerCenter - cardCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        setActiveIndex(closestIndex);
      }, 50);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleMouseDown = (event) => {
    if (!trackRef.current) return;
    setIsDown(true);
    setStartX(event.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
  };

  const handleMouseUp = () => setIsDown(false);

  const handleMouseMove = (event) => {
    if (!isDown || !trackRef.current) return;
    event.preventDefault();
    const x = event.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };

  return (
    <div className="relative w-full py-4">
      <button
        type="button"
        onClick={prev}
        disabled={activeIndex === 0}
        className="absolute -left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full glass text-white/70 shadow-lg transition-all hover:scale-110 hover:border-olympus-gold/50 hover:text-white disabled:pointer-events-none disabled:opacity-20"
        aria-label="Previous franchise"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={next}
        disabled={activeIndex === franchises.length - 1}
        className="absolute -right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full glass text-white/70 shadow-lg transition-all hover:scale-110 hover:border-olympus-gold/50 hover:text-white disabled:pointer-events-none disabled:opacity-20"
        aria-label="Next franchise"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="no-scrollbar flex snap-x snap-mandatory items-center justify-start gap-4 overflow-x-auto px-6 py-8 sm:gap-6 sm:px-12"
        style={{ cursor: isDown ? "grabbing" : "grab" }}
      >
        {franchises.map((franchise, index) => {
          const isActive = index === activeIndex;

          return (
            <motion.div
              key={franchise.id}
              onClick={() => {
                setActiveIndex(index);
                onFranchiseClick?.(franchise);
              }}
              animate={{
                scale: isActive ? 1.05 : 0.9,
                opacity: isActive ? 1 : 0.65,
                y: isActive ? -8 : 0,
              }}
              whileHover={{ scale: isActive ? 1.08 : 0.95, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`group relative flex h-[340px] w-[210px] shrink-0 snap-center cursor-pointer flex-col items-center justify-between rounded-3xl p-6 transition-all duration-300 sm:h-[380px] sm:w-[230px] ${
                isActive
                  ? "glass-strong border-2 border-olympus-gold/80 shadow-[0_0_35px_rgba(244,200,74,0.22)]"
                  : "glass border border-white/10 hover:border-white/20"
              }`}
            >
              {isActive && (
                <div className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-olympus-gold to-transparent shadow-[0_0_12px_#F4C84A]" />
              )}

              <div className="flex w-full items-center justify-between">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-olympus-muted">
                  Official franchise
                </span>
                <span className="text-[10px] font-black text-olympus-gold">
                  {franchise.short}
                </span>
              </div>

              <div className="my-auto flex flex-col items-center gap-4">
                <div className="relative">
                  <FranchiseEmblem
                    franchise={franchise}
                    size="xl"
                    active={isActive}
                  />
                  {isActive && (
                    <div
                      className="absolute -inset-3 -z-10 rounded-[28px] opacity-40 blur-xl transition-all group-hover:opacity-70"
                      style={{ background: franchise.color }}
                    />
                  )}
                </div>

                <div className="text-center">
                  <h3 className="font-display text-lg font-extrabold uppercase tracking-wide text-white sm:text-xl">
                    {franchise.name}
                  </h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-olympus-muted">
                    Led by {franchise.leader.name}
                  </p>
                </div>
              </div>

              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFranchiseClick?.(franchise);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-olympus-gold font-extrabold text-olympus-bg shadow-md hover:bg-yellow-400"
                      : "glass text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  VIEW TEAM
                </button>
              </div>

              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${franchise.color}18, transparent 70%)`,
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {franchises.map((franchise, index) => (
          <button
            key={franchise.id}
            type="button"
            onClick={() => scrollToIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-8 bg-olympus-gold shadow-[0_0_8px_#F4C84A]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Go to ${franchise.name}`}
          />
        ))}
      </div>
    </div>
  );
}
