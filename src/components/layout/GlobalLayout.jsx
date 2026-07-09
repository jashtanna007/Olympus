import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import { useInactivityTimeout } from "../../hooks/useInactivityTimeout";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
};

export default function GlobalLayout() {
  const location = useLocation();

  // Activate inactivity timeout
  useInactivityTimeout();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Animated background grid */}
      <div className="bg-grid" />

      <Navbar />

      {/* Page content with AnimatePresence for route transitions */}
      <main className="relative z-10 flex-1 pt-16">
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
    </div>
  );
}
