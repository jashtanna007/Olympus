import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  });

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
    <div className="relative">
      {/* Navigation arrows */}
      <button
        type="button"
        onClick={prev}
        disabled={activeIndex === 0}
        className="absolute -left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full glass text-white/60 transition-all hover:text-white disabled:opacity-30 sm:flex"
        aria-label="Previous franchise"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={next}
        disabled={activeIndex === franchises.length - 1}
        className="absolute -right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full glass text-white/60 transition-all hover:text-white disabled:opacity-30 sm:flex"
        aria-label="Next franchise"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-4"
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
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`group relative flex w-[180px] shrink-0 snap-center cursor-pointer flex-col items-center gap-3 rounded-2xl p-5 transition-all sm:w-[200px] ${
                isActive ? "glass-strong aurora-border" : "glass"
              }`}
              style={{
                transform: isActive ? "perspective(600px)" : undefined,
              }}
            >
              <FranchiseEmblem
                franchise={franchise}
                size="lg"
                active={isActive}
              />

              <div className="text-center">
                <p className="font-display text-sm font-bold text-white">
                  {franchise.name}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-olympus-muted">
                  Pool {franchise.pool} · #{franchise.overallRank}
                </p>
              </div>

              {/* Hover glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${franchise.color}20, transparent 70%)`,
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {franchises.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex
                ? "w-6 bg-olympus-gold"
                : "w-1.5 bg-white/15 hover:bg-white/25"
            }`}
            aria-label={`Go to franchise ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
