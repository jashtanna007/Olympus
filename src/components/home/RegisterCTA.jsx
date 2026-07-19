import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";

export default function RegisterCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mx-4 sm:mx-6 lg:mx-8"
    >
      <div
        className="relative overflow-hidden rounded-[20px] p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(20, 35, 52, 0.8) 50%, rgba(249, 115, 22, 0.08) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Subtle glow behind */}
        <div
          className="absolute -top-20 -right-20 h-60 w-60 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {/* Icon */}
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(251, 191, 36, 0.12)", border: "1px solid rgba(251, 191, 36, 0.15)" }}
          >
            <Trophy className="h-7 w-7" style={{ color: "var(--color-accent-gold)" }} />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="font-display text-xl tracking-wider sm:text-2xl" style={{ color: "var(--color-text-primary)" }}>
              BE PART OF THE LEGACY
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Compete for glory. Create history.
            </p>
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all sm:px-8 sm:py-3.5"
            style={{
              background: "linear-gradient(135deg, #F97316, #ea580c)",
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            REGISTER NOW
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
