import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";
import { franchises } from "../../data/mockData";

export default function FranchiseSlider({ onFranchiseClick }) {
  const initialIndex = Math.min(2, Math.max(franchises.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const total = franchises.length;

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 640);

    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const goTo = useCallback(
    (index) => {
      setActiveIndex(((index % total) + total) % total);
    },
    [total],
  );

  const goPrevious = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (isPaused || total <= 1) return undefined;

    const timer = window.setInterval(goNext, 5200);

    return () => window.clearInterval(timer);
  }, [goNext, isPaused, total]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [goNext, goPrevious]);

  const visibleCards = useMemo(() => {
    return franchises
      .map((franchise, index) => {
        let offset = index - activeIndex;

        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;

        return {
          franchise,
          index,
          offset,
        };
      })
      .filter(({ offset }) => Math.abs(offset) <= (isMobile ? 1 : 2));
  }, [activeIndex, isMobile, total]);

  const handleCardClick = (index, offset, franchise) => {
    if (offset === 0) {
      onFranchiseClick?.(franchise);
      return;
    }

    goTo(index);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/15 blur-[70px] sm:h-56 sm:w-[460px]" />

      <div
        className="relative mx-auto h-[235px] max-w-6xl touch-pan-y sm:h-[295px]"
        onTouchStart={(event) => {
          event.currentTarget.dataset.touchStartX =
            event.touches[0].clientX.toString();
        }}
        onTouchEnd={(event) => {
          const startX = Number(event.currentTarget.dataset.touchStartX || 0);
          const endX = event.changedTouches[0].clientX;
          const distance = endX - startX;

          if (distance > 45) goPrevious();
          if (distance < -45) goNext();
        }}
      >
        {visibleCards.map(({ franchise, index, offset }) => {
          const isActive = offset === 0;
          const distance = Math.abs(offset);
          const spacing = isMobile ? 122 : 205;

          return (
            <motion.button
              key={franchise.id}
              type="button"
              initial={false}
              animate={{
                x: offset * spacing,
                y: distance * (isMobile ? 9 : 13),
                scale: isActive
                  ? 1
                  : distance === 1
                    ? isMobile
                      ? 0.83
                      : 0.88
                    : 0.72,
                rotateY: offset * -7,
                opacity: isActive ? 1 : distance === 1 ? 0.92 : 0.6,
                zIndex: 20 - distance,
              }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 28,
                mass: 0.8,
              }}
              onClick={() => handleCardClick(index, offset, franchise)}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-[#030914]/90 px-3 text-center outline-none backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-sky-400"
              style={{
                width: isMobile ? 145 : 205,
                height: isMobile ? 205 : 262,
                borderColor: isActive
                  ? franchise.color
                  : `${franchise.color}55`,
                boxShadow: isActive
                  ? `0 0 0 1px ${franchise.color}44, 0 0 34px ${franchise.color}70, inset 0 0 45px ${franchise.color}18`
                  : `0 16px 38px rgba(0,0,0,0.48), inset 0 0 28px ${franchise.color}10`,
              }}
              aria-label={
                isActive
                  ? `Open ${franchise.name}`
                  : `Select ${franchise.name}`
              }
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${franchise.color}, transparent)`,
                }}
              />

              <span
                className="pointer-events-none absolute inset-0 opacity-35"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${franchise.color}45, transparent 52%)`,
                }}
              />

              <FranchiseEmblem
                franchise={franchise}
                size={isMobile ? "lg" : "xl"}
                active={isActive}
                className="relative"
              />

              <span
                className="relative mt-4 font-display text-[17px] uppercase leading-[0.95] tracking-wide sm:text-[23px]"
                style={{
                  color: isActive ? "#ffffff" : franchise.color,
                }}
              >
                {franchise.name}
              </span>

              {isActive && (
                <>
                  <span
                    className="relative mt-3 h-px w-14"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${franchise.color}, transparent)`,
                    }}
                  />

                  <span className="relative mt-3 text-[8px] font-black uppercase tracking-[0.17em] text-slate-400 sm:text-[10px]">
                    Pool {franchise.pool}
                    <span className="mx-2 text-slate-700">•</span>
                    Rank #{franchise.overallRank}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}

        <button
          type="button"
          onClick={goPrevious}
          className="absolute left-0 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/25 bg-[#020711]/75 text-sky-400 backdrop-blur-xl transition hover:border-sky-400/60 hover:bg-sky-400/10 lg:flex"
          aria-label="Previous franchise"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={goNext}
          className="absolute right-0 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/25 bg-[#020711]/75 text-sky-400 backdrop-blur-xl transition hover:border-sky-400/60 hover:bg-sky-400/10 lg:flex"
          aria-label="Next franchise"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="-mt-1 flex items-center justify-center gap-2">
        {franchises.map((franchise, index) => (
          <button
            key={franchise.id}
            type="button"
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-6 bg-sky-400 shadow-[0_0_8px_#38bdf8]"
                : "w-1.5 bg-slate-600 hover:bg-slate-400"
            }`}
            aria-label={`Show ${franchise.name}`}
          />
        ))}
      </div>
    </div>
  );
}
