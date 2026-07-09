import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const THROTTLE_MS = 2000; // Throttle event handlers to 2s intervals

/**
 * useInactivityTimeout
 *
 * Logs the user out after 15 minutes of no mouse/keyboard/touch activity.
 * Bypassed entirely for admin and scorer roles.
 * Event listeners are throttled via requestAnimationFrame + timestamp check to prevent lag.
 */
export function useInactivityTimeout() {
  const { user, role, signOut } = useAuth();
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const rafPendingRef = useRef(false);

  // Bypass for admin and scorer roles — they should never be auto-logged out
  const shouldBypass = role === "admin" || role === "scorer";

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      signOut();
    }, TIMEOUT_MS);
  }, [signOut]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle: only process if enough time has passed since last activity
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    // Use rAF to batch with paint cycle and prevent layout thrashing
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;

    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      resetTimer();
    });
  }, [resetTimer]);

  useEffect(() => {
    // Don't set up listeners if no user or bypass applies
    if (!user || shouldBypass) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Start the initial timer
    resetTimer();

    // Attach throttled listeners (passive for scroll/touch perf)
    events.forEach((event) => {
      const opts = event === "scroll" || event === "touchstart" ? { passive: true } : undefined;
      window.addEventListener(event, handleActivity, opts);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, shouldBypass, handleActivity, resetTimer]);
}
