// Optional shot-capture overlay — lets the scorer tap the wagon wheel (shot
// direction on the ground) for the ball just scored. Non-blocking:
// "Skip" commits the ball without shot data.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MousePointerClick } from "lucide-react";
import WagonWheel from "./WagonWheel";

export default function ShotOverlay({ label, onCommit, onSkip }) {
  const [wagon, setWagon] = useState(null); // {angle, distance}

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4"
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="w-full max-w-sm overflow-hidden rounded-2xl glass-strong p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">Shot detail</h3>
            <span className="rounded-full bg-olympus-gold/15 px-2.5 py-1 text-[11px] font-bold text-olympus-gold">{label}</span>
          </div>

          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0C1120] p-3 text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Wagon Wheel (Shot Direction)</p>
            <WagonWheel
              interactive
              onPick={(angle, distance) => setWagon({ angle, distance })}
              points={wagon ? [{ id: "sel", angle: wagon.angle, distance: wagon.distance, runs: 4, isBoundary: true }] : []}
              size={220}
              className="mx-auto w-full max-w-[220px]"
            />
            <div className="mt-2 flex min-h-[24px] items-center justify-center gap-1.5 text-[11px] font-medium">
              {wagon ? (
                <span className="flex items-center gap-1 font-bold text-olympus-gold">
                  <Check className="h-3.5 w-3.5" /> Angle: {wagon.angle}° · Dist: {wagon.distance}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-white/40">
                  <MousePointerClick className="h-3.5 w-3.5" /> Tap the ground for shot direction
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10"
            >
              Skip (No Shots)
            </button>
            <button
              onClick={() =>
                onCommit({
                  wagonAngle: wagon?.angle ?? null,
                  wagonDistance: wagon?.distance ?? null,
                })
              }
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                wagon
                  ? "bg-olympus-gold text-olympus-bg shadow-md shadow-olympus-gold/20 hover:brightness-110"
                  : "bg-olympus-gold/80 text-olympus-bg hover:brightness-110"
              }`}
            >
              Save Shot Data
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
