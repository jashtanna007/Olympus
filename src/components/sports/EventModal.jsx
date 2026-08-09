// Generic contextual event-input modal — slides up from the bottom when the
// scorer taps an action button. Caller specifies which fields to show.
// Uses framer-motion for the spring animation; no emojis, Lucide icons only.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

/**
 * @param {object}   props
 * @param {string}   props.title          — header text, e.g. "Goal — OG"
 * @param {boolean}  [props.showMinute]   — show minute input
 * @param {boolean}  [props.showPlayer]   — show scorer/player input
 * @param {string}   [props.playerLabel]  — label for the player field
 * @param {boolean}  [props.showAssist]   — show assist input (football goals)
 * @param {function} props.onConfirm      — called with { minute, player, assist }
 * @param {function} props.onCancel
 */
export default function EventModal({
  title,
  showMinute = false,
  showPlayer = false,
  playerLabel = "Player (optional)",
  showAssist = false,
  selectLabel = null,
  selectOptions = null, // [{ value, label }] — renders a dropdown, returned as `selected`
  onConfirm,
  onCancel,
}) {
  const [minute, setMinute] = useState("");
  const [player, setPlayer] = useState("");
  const [assist, setAssist] = useState("");
  const [selected, setSelected] = useState(selectOptions?.[0]?.value ?? "");

  const handleConfirm = () =>
    onConfirm({
      minute: minute !== "" ? Number(minute) : 0,
      player: player.trim() || null,
      assist: assist.trim() || null,
      selected: selected || null,
    });

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-end justify-center bg-black/75 px-4 pb-4 sm:items-center"
        onClick={onCancel}
      >
        <motion.div
          key="sheet"
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl p-5 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white">{title}</h3>
            <button
              onClick={onCancel}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Fields ── */}
          <div className="space-y-3">
            {showMinute && (
              <ModalField label="Minute">
                <input
                  autoFocus
                  type="number"
                  min="0"
                  max="200"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  placeholder="e.g. 45"
                  className={inputCls}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = e.currentTarget
                        .closest(".space-y-3")
                        ?.querySelector("input:not(:focus)");
                      if (next) next.focus();
                      else handleConfirm();
                    }
                  }}
                />
              </ModalField>
            )}
            {showPlayer && (
              <ModalField label={playerLabel}>
                <input
                  autoFocus={!showMinute}
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                  placeholder="Name (optional)"
                  className={inputCls}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (showAssist) {
                        const next = e.currentTarget
                          .closest(".space-y-3")
                          ?.querySelector("[data-assist]");
                        if (next) { next.focus(); return; }
                      }
                      handleConfirm();
                    }
                  }}
                />
              </ModalField>
            )}
            {selectOptions && (
              <ModalField label={selectLabel || "Option"}>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className={inputCls}
                >
                  {selectOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </ModalField>
            )}
            {showAssist && (
              <ModalField label="Assist (optional)">
                <input
                  data-assist
                  value={assist}
                  onChange={(e) => setAssist(e.target.value)}
                  placeholder="Assisting player"
                  className={inputCls}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                />
              </ModalField>
            )}
          </div>

          {/* ── Buttons ── */}
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-olympus-gold py-2.5 text-sm font-bold text-olympus-bg hover:brightness-110 transition"
            >
              <Check className="h-4 w-4" /> Confirm
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0a0e15] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-olympus-gold/50 transition";

function ModalField({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-olympus-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
