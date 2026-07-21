import { useRef } from "react";
import { useInView } from "framer-motion";
import {
  CalendarDays,
  GraduationCap,
  Medal,
  Trophy,
} from "lucide-react";
import Counter from "../ui/Counter";

const stats = [
  { icon: Trophy, value: 8, suffix: "", label: "Franchises" },
  { icon: GraduationCap, value: 24, suffix: "+", label: "Colleges" },
  { icon: CalendarDays, value: 100, suffix: "+", label: "Events" },
  { icon: Medal, value: 5, suffix: "", label: "Days of Glory" },
];

export default function StatsBar() {
  const ref = useRef(null);
  const isVisible = useInView(ref, { once: true, amount: 0.35 });

  return (
    <section
      ref={ref}
      className="grid grid-cols-4 overflow-hidden rounded-2xl glass-strong"
    >
      {stats.map(({ icon: Icon, value, suffix, label }, index) => (
        <div
          key={label}
          className={`flex min-w-0 items-center justify-center gap-2 px-2 py-4 sm:gap-4 sm:px-5 sm:py-5 ${
            index !== stats.length - 1 ? "border-r border-white/[0.06]" : ""
          }`}
        >
          <Icon
            size={20}
            strokeWidth={1.8}
            className="shrink-0 text-olympus-gold sm:h-7 sm:w-7"
          />

          <div className="min-w-0">
            <strong className="block text-base leading-none text-olympus-gold sm:text-2xl">
              <Counter value={value} suffix={suffix} active={isVisible} />
            </strong>

            <span className="mt-1 block truncate text-[6px] font-black uppercase tracking-wide text-olympus-subtle sm:text-[8px]">
              {label}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
