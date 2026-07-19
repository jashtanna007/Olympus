import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown, Eye } from "lucide-react";
import { franchises } from "../../data/mockData";

export default function FranchiseSlider({ onFranchiseClick }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef(null);
  const dragX = useMotionValue(0);

  const count = franchises.length;

  const goTo = useCallback(
    (newIndex, dir) => {
      const wrapped = ((newIndex % count) + count) % count;
      setDirection(dir);
      setActiveIndex(wrapped);
    },
    [count]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const handleDragEnd = useCallback(
    (_, info) => {
      const threshold = 50;
      if (info.offset.x < -threshold) goNext();
      else if (info.offset.x > threshold) goPrev();
    },
    [goNext, goPrev]
  );

  const getOffset = (index) => {
    let diff = index - activeIndex;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  };

  const visibleCards = franchises
    .map((franchise, index) => ({ franchise, index, offset: getOffset(index) }))
    .filter(({ offset }) => Math.abs(offset) <= 3);

  return (
    <div className="relative mx-auto w-full max-w-6xl select-none px-4 py-2">
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: "440px", perspective: "1200px" }}
      >
        {/* Glow behind active card */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "280px",
            height: "400px",
            background: `radial-gradient(ellipse, ${franchises[activeIndex].color}18 0%, transparent 70%)`,
            transition: "background 0.5s ease",
          }}
        />

        {/* Drag area */}
        <motion.div
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
        />

        {/* Cards */}
        <AnimatePresence initial={false}>
          {visibleCards.map(({ franchise, index, offset }) => (
            <SliderCard
              key={franchise.id}
              franchise={franchise}
              offset={offset}
              isActive={offset === 0}
              onClick={() => {
                if (offset === 0) onFranchiseClick(franchise);
                else goTo(index, offset > 0 ? 1 : -1);
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Chevron Controls */}
      <motion.button
        onClick={goPrev}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-2.5 sm:left-4 sm:p-3"
        style={{
          background: "rgba(20, 35, 52, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "var(--color-text-secondary)",
        }}
        aria-label="Previous franchise"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>
      <motion.button
        onClick={goNext}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-2.5 sm:right-4 sm:p-3"
        style={{
          background: "rgba(20, 35, 52, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "var(--color-text-secondary)",
        }}
        aria-label="Next franchise"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>

      {/* Swipe hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-3 flex items-center justify-center gap-2"
      >
        <span className="text-base">👆</span>
        <span className="text-[11px] font-medium tracking-[0.15em]" style={{ color: "var(--color-text-secondary)" }}>
          SWIPE TO EXPLORE
        </span>
      </motion.div>

      {/* Dot Indicators */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {franchises.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
            className="relative h-2 rounded-full transition-all duration-300"
            animate={{
              width: i === activeIndex ? 28 : 8,
              backgroundColor: i === activeIndex ? "var(--color-accent-blue)" : "rgba(100, 116, 139, 0.3)",
            }}
            whileHover={{ scale: 1.3 }}
            aria-label={`Go to ${f.name}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Slider Card ───
function SliderCard({ franchise, offset, isActive, onClick }) {
  const absOffset = Math.abs(offset);

  const translateX = offset * 200;
  const translateZ = isActive ? 0 : -(absOffset * 90);
  const rotateY = offset * -10;
  const scale = isActive ? 1 : Math.max(0.55, 1 - absOffset * 0.18);
  const opacity = isActive ? 1 : Math.max(0.2, 1 - absOffset * 0.35);
  const zIndex = 10 - absOffset;
  const blur = isActive ? 0 : Math.min(absOffset * 2, 4);

  return (
    <motion.div
      className="absolute"
      style={{ zIndex, filter: blur > 0 ? `blur(${blur}px)` : "none" }}
      initial={false}
      animate={{
        x: translateX,
        z: translateZ,
        rotateY,
        scale,
        opacity,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
        mass: 0.8,
      }}
    >
      <motion.button
        onClick={onClick}
        whileHover={isActive ? { scale: 1.03, y: -4 } : {}}
        whileTap={{ scale: 0.97 }}
        className="relative flex h-[360px] w-[230px] flex-col items-center justify-center overflow-hidden rounded-[22px] cursor-pointer transition-all duration-300 sm:h-[400px] sm:w-[260px]"
        style={{
          background: isActive
            ? `linear-gradient(170deg, ${franchise.color}12, rgba(20, 35, 52, 0.75) 50%, ${franchise.color}08)`
            : "rgba(20, 35, 52, 0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isActive
            ? `2px solid ${franchise.color}55`
            : "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: isActive
            ? `0 0 30px ${franchise.color}20, 0 0 80px ${franchise.color}08, 0 8px 32px rgba(0,0,0,0.4)`
            : "0 4px 16px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Team Leader Image */}
        <div className="relative mb-3 h-20 w-20 sm:h-24 sm:w-24">
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div
                key={`leader-${franchise.id}`}
                initial={{ opacity: 0, y: -20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
                className="absolute inset-0 overflow-hidden rounded-2xl ring-2"
                style={{
                  ringColor: `${franchise.color}44`,
                  background: `linear-gradient(135deg, ${franchise.color}20, ${franchise.color}08)`,
                }}
              >
                <img
                  src={franchise.leader.image}
                  alt={franchise.leader.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                <div
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: franchise.color }}
                >
                  <Crown className="h-3.5 w-3.5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isActive && (
            <div
              className="flex h-full w-full items-center justify-center rounded-2xl text-4xl sm:text-5xl"
              style={{ background: `${franchise.color}10` }}
            >
              {franchise.emoji}
            </div>
          )}
        </div>

        {/* Emoji (active only) */}
        {isActive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-1 text-2xl"
          >
            {franchise.emoji}
          </motion.span>
        )}

        {/* Team name */}
        <h3
          className={`px-4 text-center font-display tracking-wider ${isActive ? "text-lg sm:text-xl" : "text-sm sm:text-base"}`}
          style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
        >
          {franchise.name}
        </h3>

        {/* Active state info */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="mt-3 flex flex-col items-center gap-2.5 px-4"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                <span>POOL {franchise.pool}</span>
                <span>•</span>
                <span>RANK #{franchise.overallRank}</span>
              </div>

              {/* View Team button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--color-accent-blue), #2563eb)",
                  boxShadow: "0 0 16px rgba(59, 130, 246, 0.3)",
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                VIEW TEAM
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
