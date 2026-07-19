import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Trophy, GraduationCap, Medal, CalendarDays } from "lucide-react";

const stats = [
  { icon: Trophy, value: 8, label: "FRANCHISES", suffix: "" },
  { icon: GraduationCap, value: 24, label: "COLLEGES", suffix: "+" },
  { icon: Medal, value: 100, label: "EVENTS", suffix: "+" },
  { icon: CalendarDays, value: 5, label: "DAYS OF GLORY", suffix: "" },
];

function AnimatedCounter({ value, suffix, inView }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text-primary)" }}>
      {count}{suffix}
    </span>
  );
}

export default function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="glass mx-4 rounded-[20px] sm:mx-6 lg:mx-8"
    >
      <div className="grid grid-cols-2 divide-x divide-white/5 sm:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex flex-col items-center gap-1.5 py-5 sm:py-6"
            >
              <Icon className="h-5 w-5 mb-1" style={{ color: "var(--color-accent-blue)" }} strokeWidth={1.8} />
              <AnimatedCounter value={stat.value} suffix={stat.suffix} inView={inView} />
              <span className="text-[10px] font-semibold tracking-[0.15em]" style={{ color: "var(--color-text-secondary)" }}>
                {stat.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
