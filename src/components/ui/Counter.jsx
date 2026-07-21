import { useEffect, useState } from "react";

/**
 * Counter — animates from 0 to `value` with cubic easing.
 *
 * @param {number} value — target number
 * @param {string} suffix — appended text like "+" or "K"
 * @param {boolean} active — starts counting when true (tie to InView)
 * @param {number} duration — animation duration in ms
 */
export default function Counter({ value, suffix = "", active = false, duration = 950 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(Math.round(value * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, value, duration]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}
