import { motion } from "framer-motion";
import { Tv, ChevronRight } from "lucide-react";

const cards = [
  {
    id: "live",
    title: "Live Matches / History",
    subtitle: "Watch live scores and browse past results",
    icon: Tv,
    accentColor: "var(--color-accent-blue)",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function ActionCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="grid gap-4 px-4 sm:gap-5 sm:px-6 md:grid-cols-1 lg:px-8 max-w-xl mx-auto"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.button
            key={card.id}
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="glass group relative flex items-center gap-5 overflow-hidden rounded-[20px] p-5 text-left transition-all duration-200 sm:p-6"
          >
            {/* Icon */}
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", color: "var(--color-accent-blue)" }}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold sm:text-lg" style={{ color: "var(--color-text-primary)" }}>
                {card.title}
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed sm:text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {card.subtitle}
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 transition-all duration-200 group-hover:translate-x-1" style={{ color: "var(--color-text-secondary)" }} />
          </motion.button>
        );
      })}
    </motion.div>
  );
}
