import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { franchises } from "../../data/mockData";
import FranchiseEmblem from "../common/FranchiseEmblem";

export default function FranchiseSlider({ onFranchiseClick }) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scrollToIndex = useCallback(
    (index) => {
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
    },
    []
  );

  const next = () => scrollToIndex(activeIndex + 1);
  const prev = () => scrollToIndex(activeIndex - 1);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, scrollToIndex]);

  // Auto-detect and pop up card closest to center during manual scroll / swipe / drag
  useEffect(() => {
    const container = trackRef.current;
    if (!container) return;

    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        const cards = Array.from(container.children);
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const distance = Math.abs(containerCenter - cardCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
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

  // Drag scrolling
  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
  };
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };

  return (
    <div className="relative w-full py-4">
      {/* Navigation arrows flanking the slider */}
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

      {/* Cards track with 3D perspective feel */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="no-scrollbar flex snap-x snap-mandatory items-center justify-start gap-4 overflow-x-auto px-6 py-8 sm:gap-6 sm:px-12"
        style={{ cursor: isDown ? "grabbing" : "grab" }}
      >
        {franchises.map((franchise, i) => {
          const isActive = i === activeIndex;
          return (
            <motion.div
              key={franchise.id}
              onClick={() => {
                setActiveIndex(i);
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
              {/* Top spotlight glow line on active card */}
              {isActive && (
                <div className="absolute top-0 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-olympus-gold to-transparent shadow-[0_0_12px_#F4C84A]" />
              )}

              {/* Header Badge */}
              <div className="flex w-full items-center justify-between">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-olympus-muted">
                  Pool {franchise.pool}
                </span>
                <span className="text-[10px] font-black text-olympus-gold">
                  #{franchise.overallRank}
                </span>
              </div>

              {/* Franchise Emblem / Leader Photo Placeholder */}
              <div className="my-auto flex flex-col items-center gap-3">
                <div className="relative">
                  <FranchiseEmblem
                    franchise={franchise}
                    size="lg"
                    active={isActive}
                  />
                  {isActive && (
                    <div
                      className="absolute -inset-3 -z-10 rounded-full opacity-40 blur-xl transition-all group-hover:opacity-70"
                      style={{ background: franchise.color }}
                    />
                  )}
                </div>

                <div className="text-center">
                  <h3 className="font-display text-lg font-extrabold uppercase tracking-wide text-white sm:text-xl">
                    {franchise.name}
                  </h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-olympus-muted">
                    Pool {franchise.pool} · Rank #{franchise.overallRank}
                  </p>
                </div>
              </div>

              {/* Card Action Button */}
              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFranchiseClick?.(franchise);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-olympus-gold text-olympus-bg font-extrabold shadow-md hover:bg-yellow-400"
                      : "glass text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  VIEW TEAM
                </button>
              </div>

              {/* Ambient radial color background */}
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

      {/* Dot Indicators */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {franchises.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-8 bg-olympus-gold shadow-[0_0_8px_#F4C84A]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Go to franchise ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
