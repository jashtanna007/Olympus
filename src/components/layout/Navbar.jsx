import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import Drawer from "./Drawer";

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="glass-strong fixed left-0 right-0 top-0 z-30 border-b border-slate-700/30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left — Hamburger */}
          <motion.button
            onClick={() => setDrawerOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Open player stats"
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          {/* Center — Logo */}
          <motion.h1
            className="font-display text-xl font-bold tracking-[0.2em] text-neon-cyan text-glow-cyan sm:text-2xl"
            animate={{
              textShadow: [
                "0 0 10px rgba(0,240,255,0.5), 0 0 30px rgba(0,240,255,0.2)",
                "0 0 20px rgba(0,240,255,0.7), 0 0 50px rgba(0,240,255,0.3)",
                "0 0 10px rgba(0,240,255,0.5), 0 0 30px rgba(0,240,255,0.2)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            OLYMPUS
          </motion.h1>

          {/* Right — Register CTA */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="gradient-border group flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-neon-gold transition-transform group-hover:rotate-12 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Register for Fest</span>
            <span className="sm:hidden">Register</span>
          </motion.button>
        </div>
      </nav>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
