import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

export default function GlobalLayout() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-olympus-bg">
      {/* Stadium background — fixed behind everything */}
      <div className="fixed inset-0 z-0">
        {/* Desktop image */}
        <picture>
          <source
            srcSet="/backgrounds/stadium-desktop.png"
            media="(min-width: 768px)"
          />
          <img
            src="/backgrounds/stadium-mobile.png"
            alt=""
            className="h-full w-full object-cover object-top"
            loading="eager"
          />
        </picture>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-olympus-bg/5 via-olympus-bg/40 to-olympus-bg" />
        <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-transparent to-black/30" />

        {/* Ambient glow accents */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-olympus-gold/[0.04] blur-[150px]" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-olympus-blue/[0.03] blur-[120px]" />
      </div>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Nav */}
      <Navbar />

      {/* Page content */}
      <main className="relative z-10 bottom-nav-safe-area">
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

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
