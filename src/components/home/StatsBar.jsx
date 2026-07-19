import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  CalendarDays,
  GraduationCap,
  Medal,
  Trophy,
} from "lucide-react";

const stats = [
  {
    icon: Trophy,
    value: 8,
    suffix: "",
    label: "Franchises",
  },
  {
    icon: GraduationCap,
    value: 24,
    suffix: "+",
    label: "Colleges",
  },
  {
    icon: CalendarDays,
    value: 100,
    suffix: "+",
    label: "Events",
  },
  {
    icon: Medal,
    value: 5,
    suffix: "",
    label: "Days of glory",
  },
];

function Counter({ value, suffix, active }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    const startedAt = performance.now();
    const duration = 950;
    let frame;

    const update = (time) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(update);
      }
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [active, value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

export default function StatsBar() {
  const containerRef = useRef(null);
  const isVisible = useInView(containerRef, {
    once: true,
    amount: 0.35,
  });

  return (
    <section
      ref={containerRef}
      className="grid grid-cols-4 overflow-hidden rounded-2xl border border-sky-400/15 bg-[#030a16]/80 shadow-[0_20px_55px_rgba(0,0,0,0.32)] backdrop-blur-xl"
    >
      {stats.map(({ icon: Icon, value, suffix, label }, index) => (
        <div
          key={label}
          className={`flex min-w-0 items-center justify-center gap-2 px-2 py-4 sm:gap-4 sm:px-5 sm:py-5 ${
            index !== stats.length - 1 ? "border-r border-white/5" : ""
          }`}
        >
          <Icon
            size={20}
            strokeWidth={1.8}
            className="shrink-0 text-sky-400 sm:h-7 sm:w-7"
          />

          <div className="min-w-0">
            <strong className="block text-base leading-none text-sky-400 sm:text-2xl">
              <Counter value={value} suffix={suffix} active={isVisible} />
            </strong>

            <span className="mt-1 block truncate text-[6px] font-black uppercase tracking-wide text-slate-500 sm:text-[8px]">
              {label}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
