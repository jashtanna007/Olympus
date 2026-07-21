import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

export default function Leaderboard() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 pt-28 text-center sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-strong">
          <BarChart3 className="h-7 w-7 text-olympus-gold" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Leaderboard
        </h1>
        <p className="mt-3 max-w-md text-olympus-muted">
          Rankings across all 11 sports, pool standings, and point tables will
          be displayed here.
        </p>
        <span className="mt-6 rounded-full glass px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-gold">
          Coming Soon
        </span>
      </motion.div>
    </div>
  );
}
