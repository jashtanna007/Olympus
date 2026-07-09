import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { franchises } from "../../data/mockData";

/**
 * FranchiseSlider — 3D Cover Flow / Story-style carousel
 *
 * - Active center card: full scale, full opacity, glowing border
 * - Adjacent cards: scaled down (75%), dimmed, pushed back in z
 * - Swipeable/draggable on mobile, chevron buttons on desktop
 * - Team leader photo animates in when card becomes active
 */
export default function FranchiseSlider({ onFranchiseClick }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right
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
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        className="absolute left-1 top-1/2 z-30 -translate-y-1/2 rounded-full border border-slate-700/50 bg-slate-900/80 p-2.5 text-slate-300 backdrop-blur-sm transition-colors hover:border-neon-cyan/30 hover:text-white sm:left-2 sm:p-3"
        aria-label="Previous franchise"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>
      <motion.button
        onClick={goNext}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-1 top-1/2 z-30 -translate-y-1/2 rounded-full border border-slate-700/50 bg-slate-900/80 p-2.5 text-slate-300 backdrop-blur-sm transition-colors hover:border-neon-cyan/30 hover:text-white sm:right-2 sm:p-3"
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
              backgroundColor: i === activeIndex ? f.color : "rgb(71, 85, 105)",
            }}
            whileHover={{ scale: 1.3 }}
            aria-label={`Go to ${f.name}`}
          />
        ))}
      </div>

      {/* Active franchise name */}
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center"
      >
        <p className="font-display text-xs font-semibold tracking-[0.25em] text-slate-500">
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
  const translateX = offset * 220; // px horizontal spacing
  const translateZ = isActive ? 0 : -(absOffset * 80); // push back non-active cards
  const rotateY = offset * -8; // subtle Y-axis rotation for depth
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
        whileHover={isActive ? { scale: 1.04 } : {}}
        whileTap={{ scale: 0.97 }}
        className={`relative flex h-[340px] w-[240px] flex-col items-center overflow-hidden rounded-3xl border-2 transition-all duration-300 sm:h-[370px] sm:w-[260px] ${
          isActive ? "cursor-pointer" : "cursor-pointer"
        }`}
        style={{
          background: isActive
            ? `linear-gradient(165deg, ${franchise.color}18, rgba(15,23,42,0.9) 60%)`
            : "rgba(15, 23, 42, 0.7)",
          borderColor: isActive ? `${franchise.color}66` : "rgba(51, 65, 85, 0.3)",
          boxShadow: isActive
            ? `0 0 40px ${franchise.color}30, 0 0 80px ${franchise.color}15, inset 0 1px 0 ${franchise.color}22`
            : "none",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Glow ring at top for active card */}
        {isActive && (
          <motion.div
            className="absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full blur-[60px]"
            style={{ background: franchise.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Team Leader Image (animated on active) */}
        <div className="relative mt-5 mb-3 h-20 w-20 sm:h-24 sm:w-24">
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div
                key={`leader-${franchise.id}`}
                initial={{ opacity: 0, y: -30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                  delay: 0.15,
                }}
                className="absolute inset-0 overflow-hidden rounded-2xl ring-2"
                style={{
                  ringColor: `${franchise.color}55`,
                  background: `linear-gradient(135deg, ${franchise.color}25, ${franchise.color}08)`,
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
                background: `linear-gradient(135deg, ${franchise.color}15, ${franchise.color}05)`,
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
            transition={{ delay: 0.25 }}
            className="mb-1 text-2xl"
          >
            {franchise.emoji}
          </motion.span>
        )}

        {/* Team name */}
        <motion.h3
          className={`px-4 text-center font-display font-bold tracking-wider ${
            isActive ? "text-base sm:text-lg" : "text-xs sm:text-sm"
          }`}
          style={{ color: isActive ? "#ffffff" : "rgb(148, 163, 184)" }}
        >
          {franchise.name}
        </motion.h3>

        {/* Active state: additional info */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-3 flex flex-col items-center gap-2.5 px-4"
            >
              {/* Leader name */}
              <div className="flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-neon-gold" />
                <span className="text-xs font-medium text-slate-300">
                  {franchise.leader.name}
                </span>
              </div>

              {/* Pool & Rank badges */}
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
                  style={{
                    color: franchise.color,
                    background: `${franchise.color}15`,
                    border: `1px solid ${franchise.color}33`,
                  }}
                >
                  POOL {franchise.pool}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
                  style={{
                    color: franchise.color,
                    background: `${franchise.color}10`,
                    border: `1px solid ${franchise.color}22`,
                  }}
                >
                  RANK #{franchise.overallRank}
                </span>
              </div>

              {/* Tap hint */}
              <motion.p
                className="mt-1 text-[10px] tracking-widest text-slate-500"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                TAP TO EXPLORE
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom gradient fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
          style={{
            background: isActive
              ? `linear-gradient(transparent, ${franchise.color}08)`
              : "linear-gradient(transparent, rgba(15,23,42,0.5))",
          }}
        />
      </motion.button>
    </motion.div>
  );
}
