import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import Drawer from "./Drawer";

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed left-0 right-0 top-0 z-30 border-b"
        style={{
          background: "var(--color-surface-900)",
          borderColor: "rgba(138, 155, 176, 0.12)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left — Hamburger */}
          <motion.button
            onClick={() => setDrawerOpen(true)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-charcoal)]"
            style={{ color: "var(--color-stone)" }}
            aria-label="Open player stats"
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          {/* Center — Logo */}
          <h1
            className="font-display text-2xl tracking-wider sm:text-3xl"
            style={{ color: "var(--color-flame)" }}
          >
            OLYMPUS
          </h1>

          {/* Right — Register CTA */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="group flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:py-2.5 sm:text-sm"
            style={{
              background: "var(--color-flame)",
              color: "#ffffff",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:rotate-12 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Register for Fest</span>
            <span className="sm:hidden">Register</span>
          </motion.button>
        </div>
      </nav>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
