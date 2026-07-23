import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

/**
 * GlassDropdown — custom select that portals its panel to <body> so it
 * is never clipped by any ancestor's overflow:hidden.
 *
 * @param {string}   label
 * @param {string}   value
 * @param {function} onChange    - called with the selected string value
 * @param {string[]} options
 * @param {string}   placeholder
 * @param {boolean}  compact     - smaller trigger padding
 * @param {string}   instanceId  - unique key for layoutId (avoid conflicts)
 */
export default function GlassDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  compact = false,
  instanceId = "default",
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);

  /* Position the portal panel under the trigger */
  const recalcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  /* Recalc on open */
  useLayoutEffect(() => {
    if (open) recalcPosition();
  }, [open, recalcPosition]);

  /* Reposition on scroll / resize while open */
  useEffect(() => {
    if (!open) return;
    const handler = () => recalcPosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, recalcPosition]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (opt) => {
      onChange(opt);
      setOpen(false);
    },
    [onChange]
  );

  const toggleOpen = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
          {label}
        </label>
      )}

      {/* Trigger button — anchors the panel position */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`group relative flex w-full items-center justify-between rounded-xl border transition-all duration-200 ${
          compact ? "px-3 py-2.5" : "px-4 py-3"
        } ${
          open
            ? "border-olympus-gold/30 bg-white/[0.05] shadow-[0_0_0_3px_rgba(244,200,74,0.08)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
        }`}
      >
        <span
          className={`text-sm transition-colors ${
            value ? "text-white" : "text-white/25"
          }`}
        >
          {value || placeholder}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-colors ${
              open
                ? "text-olympus-gold"
                : "text-olympus-subtle group-hover:text-white/50"
            }`}
          />
        </motion.div>

        {/* Gold bottom-line accent when open */}
        <span
          className={`absolute bottom-0 left-4 right-4 h-px rounded-full bg-olympus-gold transition-all duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
      </button>

      {/* Dropdown panel — portalled to <body> to escape overflow:hidden ancestors */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={panelStyle}
                className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.9)]"
                // Prevent outside-click handler from firing when clicking inside panel
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Panel background */}
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(22,27,40,0.98) 0%, rgba(16,20,29,0.99) 100%)",
                    backdropFilter: "blur(32px) saturate(180%)",
                    WebkitBackdropFilter: "blur(32px) saturate(180%)",
                  }}
                >
                  {/* Top shimmer */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-olympus-gold/30 to-transparent" />

                  <div className="max-h-64 overflow-y-auto py-1.5">
                    {options.map((opt, i) => {
                      const isSelected = opt === value;
                      return (
                        <motion.button
                          key={opt}
                          type="button"
                          onClick={() => handleSelect(opt)}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.15 }}
                          className={`group relative flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-all duration-150 ${
                            isSelected
                              ? "bg-olympus-gold/10 text-olympus-gold"
                              : "text-olympus-muted hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          {/* Left accent bar */}
                          {isSelected && (
                            <motion.span
                              layoutId={`dropdown-bar-${instanceId}`}
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-olympus-gold"
                            />
                          )}

                          <span className="pl-2">{opt}</span>

                          {isSelected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-olympus-gold" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Bottom shimmer */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
