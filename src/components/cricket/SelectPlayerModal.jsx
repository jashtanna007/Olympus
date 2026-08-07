// Modal for picking a player (openers, new batsman, new bowler) or a dismissal.

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function SelectPlayerModal({ title, subtitle, players = [], onSelect, onClose, disabledIds = [] }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="w-full max-w-md overflow-hidden rounded-2xl glass-strong"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="font-display text-base font-bold text-white">{title}</h3>
              {subtitle && <p className="text-[11px] text-olympus-muted">{subtitle}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3 scrollbar-thin">
            {players.length === 0 && <p className="px-2 py-6 text-center text-sm text-olympus-muted">No players available.</p>}
            {players.map((p) => {
              const disabled = disabledIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  disabled={disabled}
                  onClick={() => onSelect(p)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    disabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/30"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-olympus-gold/40 hover:bg-olympus-gold/[0.06]"
                  }`}
                >
                  <span className="font-semibold">{p.full_name}</span>
                  {p.role && <span className="text-[10px] text-olympus-muted">{p.role}</span>}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const DISMISSALS = [
  { key: "bowled", label: "Bowled" },
  { key: "caught", label: "Caught" },
  { key: "lbw", label: "LBW" },
  { key: "run_out", label: "Run Out" },
  { key: "stumped", label: "Stumped" },
  { key: "hit_wicket", label: "Hit Wicket" },
];

export function WicketModal({ batters = [], fielders = [], onConfirm, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="w-full max-w-md overflow-hidden rounded-2xl glass-strong"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-display text-base font-bold text-rose-400">Wicket!</h3>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <WicketForm batters={batters} fielders={fielders} onConfirm={onConfirm} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from "react";

function WicketForm({ batters, fielders, onConfirm }) {
  const [dismissal, setDismissal] = useState("bowled");
  const [outPlayer, setOutPlayer] = useState(batters[0]?.id || "");
  const [fielder, setFielder] = useState("");
  const needsFielder = ["caught", "stumped", "run_out"].includes(dismissal);

  return (
    <div className="space-y-3 p-4">
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Dismissal</label>
        <div className="grid grid-cols-3 gap-1.5">
          {DISMISSALS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDismissal(d.key)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                dismissal === d.key
                  ? "border-rose-500/50 bg-rose-500/20 text-rose-300"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Batsman out</label>
        <select
          value={outPlayer}
          onChange={(e) => setOutPlayer(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2 text-sm text-white"
        >
          {batters.map((b) => (
            <option key={b.id} value={b.id}>{b.full_name}</option>
          ))}
        </select>
      </div>

      {needsFielder && (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">Fielder</label>
          <select
            value={fielder}
            onChange={(e) => setFielder(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0C1120] px-3 py-2 text-sm text-white"
          >
            <option value="">—</option>
            {fielders.map((f) => (
              <option key={f.id} value={f.id}>{f.full_name}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => onConfirm({ dismissalType: dismissal, outPlayerId: outPlayer, fielderId: fielder || null })}
        disabled={!outPlayer}
        className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        Confirm Wicket
      </button>
    </div>
  );
}
