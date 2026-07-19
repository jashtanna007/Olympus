import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useInactivityTimeout } from "../../hooks/useInactivityTimeout";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

export default function GlobalLayout() {
  const location = useLocation();

  // Activate inactivity timeout
  useInactivityTimeout();

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "var(--color-bg-primary)" }}>
      {/* ═══ Stadium Atmosphere ═══ */}
      <div className="stadium-bg" />
      <div className="stadium-fog" />
      <div className="stadium-vignette" />

      {/* Top Navbar */}
      <Navbar />

      {/* Page content */}
      <main className="relative z-10 flex-1 pt-20 md:pt-24 bottom-nav-safe-area">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
