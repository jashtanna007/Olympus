import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Bell, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import Drawer from "./Drawer";

const navLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Franchises", path: "/" },
  { label: "Matches", path: "/" },
  { label: "Leaderboard", path: "/" },
  { label: "Schedule", path: "/" },
];

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* ═══ Desktop Navbar — floating glass ═══ */}
      <nav className="fixed left-0 right-0 top-0 z-30 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 pt-3 lg:px-6">
          <div
            className="glass-navbar flex h-[72px] items-center justify-between rounded-2xl px-5 lg:px-8"
          >
            {/* Left — Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                <span className="text-lg">⚡</span>
              </div>
              <h1 className="font-display text-2xl tracking-wider" style={{ color: "var(--color-text-primary)" }}>
                OLYMPUS
              </h1>
            </div>

            {/* Center — Nav Links */}
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = link.label === "Dashboard";
                return (
                  <motion.button
                    key={link.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                    style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-0.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
                        style={{
                          background: "var(--color-accent-blue)",
                          boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Right — Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {/* Notification dot */}
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--color-accent-orange)", boxShadow: "0 0 6px rgba(249, 115, 22, 0.5)" }} />
              </motion.button>

              {/* Player Stats */}
              <motion.button
                onClick={() => setDrawerOpen(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                aria-label="Open player stats"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.15)" }}>
                  👤
                </div>
              </motion.button>

              {/* Register CTA */}
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #F97316, #ea580c)",
                  boxShadow: "0 0 16px rgba(249, 115, 22, 0.25), 0 2px 8px rgba(0, 0, 0, 0.3)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Register
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Navbar — slim glass ═══ */}
      <nav
        className="fixed left-0 right-0 top-0 z-30 md:hidden"
        style={{
          background: "rgba(7, 19, 33, 0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {/* Hamburger */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h1 className="font-display text-xl tracking-wider" style={{ color: "var(--color-text-primary)" }}>
              OLYMPUS
            </h1>
          </div>

          {/* Notification */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--color-accent-orange)", boxShadow: "0 0 6px rgba(249, 115, 22, 0.5)" }} />
          </motion.button>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t px-4 pb-4"
              style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
            >
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors"
                  style={{ color: i === 0 ? "var(--color-accent-blue)" : "var(--color-text-secondary)" }}
                >
                  {link.label}
                </motion.button>
              ))}

              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.05 }}
                onClick={() => { setMobileMenuOpen(false); setDrawerOpen(true); }}
                className="mt-2 block w-full rounded-xl px-4 py-3 text-left text-sm font-medium"
                style={{ color: "var(--color-accent-gold)" }}
              >
                👤 Player Stats
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
