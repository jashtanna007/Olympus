import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

// Pages that are full-screen fixed overlays — skip layout padding/animation
const FULLSCREEN_ROUTES = ["/auction", "/retention"];
const FULLSCREEN_PREFIXES = ["/scorer"];

export default function GlobalLayout() {
  const location = useLocation();
  const isFullscreen =
    FULLSCREEN_ROUTES.includes(location.pathname) ||
    FULLSCREEN_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <div className="relative min-h-screen bg-olympus-bg">
      {/* Stadium background — fixed behind everything */}
      <div className="fixed inset-0 z-0" style={{ willChange: "transform", transform: "translateZ(0)" }}>
        {/* Desktop image — WebP for 96% smaller file */}
        <picture>
          <source
            srcSet="/backgrounds/stadium-desktop.webp"
            media="(min-width: 768px)"
            type="image/webp"
          />
          <source
            srcSet="/backgrounds/stadium-mobile.webp"
            type="image/webp"
          />
          <img
            src="/backgrounds/stadium-mobile.webp"
            alt=""
            className="h-full w-full object-cover object-top"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-olympus-bg/5 via-olympus-bg/40 to-olympus-bg" />
        <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-transparent to-black/30" />
      </div>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Nav */}
      <Navbar />

      {/* Page content */}
      {isFullscreen ? (
        <Outlet />
      ) : (
        <main className="relative z-10 pt-[76px] sm:pt-[84px] bottom-nav-safe-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
