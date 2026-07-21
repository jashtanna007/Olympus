import { motion } from "framer-motion";
import { ArrowUpRight, Trophy } from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

export default function RegisterCTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-10"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-olympus-gold/[0.08] blur-[100px]" />

      <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-olympus-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-olympus-gold">
              Season 2026
            </span>
          </div>
          <h3 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            Ready to enter the arena?
          </h3>
          <p className="mt-2 max-w-md text-sm text-olympus-muted">
            Join 128+ athletes managing elite rosters on Olympus. Register with
            your institute email to get started.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <MagneticButton variant="gold" size="lg">
            Register Now
            <ArrowUpRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="outline" size="lg">
            Learn More
          </MagneticButton>
        </div>
      </div>
    </motion.section>
  );
}
