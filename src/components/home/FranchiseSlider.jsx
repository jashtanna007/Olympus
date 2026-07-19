import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { franchises } from "../../data/mockData";

/**
 * FranchiseSlider — 3D Cover Flow / Story-style carousel
 *
 * - Active center card: full scale, full opacity, franchise color accent
 * - Adjacent cards: scaled down, dimmed, pushed back in z
 * - Swipeable/draggable on mobile, chevron buttons on desktop
 * - Team leader photo animates in when card becomes active
 */
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Drag end handler
  const handleDragEnd = useCallback(
    (_, info) => {
      const threshold = 50;
      if (info.offset.x < -threshold) {
        goNext();
      } else if (info.offset.x > threshold) {
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  // Get position offset from active (circular)
  const getOffset = (index) => {
    let diff = index - activeIndex;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  };

  // Only show cards within visible range (-3 to +3)
  const visibleCards = franchises
    .map((franchise, index) => ({ franchise, index, offset: getOffset(index) }))
    .filter(({ offset }) => Math.abs(offset) <= 3);

  return (
    <div className="relative mx-auto w-full max-w-5xl select-none px-4 py-2">
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: "420px", perspective: "1200px" }}
      >
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
                if (offset === 0) {
                  onFranchiseClick(franchise);
                } else {
                  goTo(index, offset > 0 ? 1 : -1);
                }
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
        className="absolute left-1 top-1/2 z-30 -translate-y-1/2 rounded-full border p-2.5 transition-colors hover:text-[var(--color-cream)] sm:left-2 sm:p-3"
        style={{
          background: "var(--color-charcoal)",
          borderColor: "rgba(138, 155, 176, 0.2)",
          color: "var(--color-stone)",
        }}
        aria-label="Previous franchise"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>
      <motion.button
        onClick={goNext}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-1 top-1/2 z-30 -translate-y-1/2 rounded-full border p-2.5 transition-colors hover:text-[var(--color-cream)] sm:right-2 sm:p-3"
        style={{
          background: "var(--color-charcoal)",
          borderColor: "rgba(138, 155, 176, 0.2)",
          color: "var(--color-stone)",
        }}
        aria-label="Next franchise"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>

      {/* Dot Indicators */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {franchises.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
            className="relative h-2 rounded-full transition-all duration-300"
            animate={{
              width: i === activeIndex ? 28 : 8,
              backgroundColor: i === activeIndex ? f.color : "rgba(138, 155, 176, 0.3)",
            }}
            whileHover={{ scale: 1.3 }}
            aria-label={`Go to ${f.name}`}
          />
        ))}
      </div>

      {/* Active franchise name */}
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center"
      >
        <p className="font-display text-xs tracking-[0.25em]" style={{ color: "var(--color-stone)" }}>
          {franchises[activeIndex].pool === "A" ? "POOL A" : "POOL B"} • RANK #{franchises[activeIndex].overallRank}
        </p>
      </motion.div>
    </div>
  );
}

// ─── Individual Slider Card ───
function SliderCard({ franchise, offset, isActive, onClick }) {
  const absOffset = Math.abs(offset);

  // 3D positioning
  const translateX = offset * 220;
  const translateZ = isActive ? 0 : -(absOffset * 80);
  const rotateY = offset * -8;
  const scale = isActive ? 1 : Math.max(0.6, 1 - absOffset * 0.15);
  const opacity = isActive ? 1 : Math.max(0.25, 1 - absOffset * 0.3);
  const zIndex = 10 - absOffset;

  return (
    <motion.div
      className="absolute"
      style={{ zIndex }}
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
        whileHover={isActive ? { scale: 1.03 } : {}}
        whileTap={{ scale: 0.97 }}
        className="relative flex h-[340px] w-[240px] flex-col items-center overflow-hidden rounded-2xl border-2 transition-all duration-200 cursor-pointer sm:h-[370px] sm:w-[260px]"
        style={{
          background: isActive
            ? `linear-gradient(165deg, ${franchise.color}15, var(--color-charcoal) 60%)`
            : "var(--color-charcoal)",
          borderColor: isActive ? `${franchise.color}55` : "rgba(138, 155, 176, 0.1)",
          boxShadow: isActive
            ? `0 8px 32px ${franchise.color}20`
            : "var(--shadow-card)",
        }}
      >
        {/* Franchise color accent stripe (left edge) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: franchise.color, opacity: isActive ? 1 : 0.3 }}
        />

        {/* Team Leader Image (animated on active) */}
        <div className="relative mt-6 mb-3 h-20 w-20 sm:h-24 sm:w-24">
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div
                key={`leader-${franchise.id}`}
                initial={{ opacity: 0, y: -20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                  delay: 0.1,
                }}
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
                {/* Crown badge */}
                <div
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: franchise.color }}
                >
                  <Crown className="h-3.5 w-3.5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fallback emoji when not active */}
          {!isActive && (
            <div
              className="flex h-full w-full items-center justify-center rounded-2xl text-4xl sm:text-5xl"
              style={{
                background: `${franchise.color}10`,
              }}
            >
              {franchise.emoji}
            </div>
          )}
        </div>

        {/* Franchise emoji (visible below leader on active) */}
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
        <motion.h3
          className={`px-4 text-center font-display tracking-wider ${
            isActive ? "text-lg sm:text-xl" : "text-sm sm:text-base"
          }`}
          style={{ color: isActive ? "var(--color-cream)" : "var(--color-stone)" }}
        >
          {franchise.name}
        </motion.h3>

        {/* Active state: additional info */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="mt-3 flex flex-col items-center gap-2.5 px-4"
            >
              {/* Leader name */}
              <div className="flex items-center gap-1.5">
                <Crown className="h-3 w-3" style={{ color: "var(--color-gold)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--color-stone)" }}>
                  {franchise.leader.name}
                </span>
              </div>

              {/* Pool & Rank badges */}
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
                  style={{
                    color: franchise.color,
                    background: `${franchise.color}12`,
                    border: `1px solid ${franchise.color}28`,
                  }}
                >
                  POOL {franchise.pool}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
                  style={{
                    color: franchise.color,
                    background: `${franchise.color}0A`,
                    border: `1px solid ${franchise.color}1A`,
                  }}
                >
                  RANK #{franchise.overallRank}
                </span>
              </div>

              {/* Tap hint */}
              <p className="mt-1 text-[10px] tracking-widest" style={{ color: "var(--color-stone)", opacity: 0.6 }}>
                TAP TO EXPLORE
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
