import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Home,
  Shield,
  Swords,
  BarChart3,
  User,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

const NAV_LINKS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Franchises", path: "/franchises", icon: Shield },
  { label: "Matches", path: "/matches", icon: Swords },
  { label: "Leaderboard", path: "/leaderboard", icon: BarChart3 },
  { label: "Profile", path: "/profile", icon: User },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <nav className="flex h-14 items-center justify-between rounded-2xl glass-strong px-4 sm:h-16 sm:px-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-olympus-gold to-olympus-gold/40">
                <Trophy className="h-4 w-4 text-olympus-bg" strokeWidth={2.5} />
              </span>
              <span className="font-display text-base font-bold tracking-[0.2em] text-white sm:text-lg">
                OLYMPUS
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="relative px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      color: isActive ? "#F4C84A" : "#A4A9B6",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-white/[0.07]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right cluster */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Live badge */}
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <span className="live-dot h-2 w-2 rounded-full bg-olympus-success" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-success">
                  Live
                </span>
              </div>

              <Link to="/register">
                <MagneticButton variant="gold" size="sm">
                  Register
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </MagneticButton>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </motion.header>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col glass-dark"
          >
            {/* Close button */}
            <div className="flex justify-end px-6 pt-6">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu links */}
            <nav className="flex flex-1 flex-col items-center justify-center gap-2 px-8">
              {NAV_LINKS.map((link, i) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className="w-full max-w-xs"
                  >
                    <Link
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-lg font-medium transition-all ${
                        isActive
                          ? "glass-strong text-olympus-gold"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: isActive ? "#F4C84A" : undefined }}
                      />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Logo at bottom */}
            <div className="flex items-center justify-center gap-2 pb-8 pt-4">
              <Trophy className="h-4 w-4 text-olympus-gold/50" />
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-white/30">
                OLYMPUS
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
