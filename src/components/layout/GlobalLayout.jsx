import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import desktopBackground from "../../assets/backgrounds/stadium-desktop.png";
import mobileBackground from "../../assets/backgrounds/stadium-mobile.png";
import { useInactivityTimeout } from "../../hooks/useInactivityTimeout";
import BottomNav from "./BottomNav";
import Navbar from "./Navbar";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
    },
  },
};

export default function GlobalLayout() {
  const location = useLocation();

  useInactivityTimeout();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#01050d] text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <picture className="absolute inset-0 block h-full w-full">
          <source
            media="(max-width: 767px)"
            srcSet={mobileBackground}
          />

          <img
            src={desktopBackground}
            alt=""
            draggable="false"
            className="h-full w-full select-none object-cover object-center"
          />
        </picture>

        <div className="absolute inset-0 bg-black/10" />

        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(1,5,13,0.02)_0%,rgba(1,5,13,0.1)_45%,rgba(1,5,13,0.52)_100%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.3)_100%)]" />
      </div>

      <div className="relative z-10 min-h-screen">
        <Navbar />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative pb-24 md:pb-0"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>

        <BottomNav />
      </div>
    </div>
  );
}
