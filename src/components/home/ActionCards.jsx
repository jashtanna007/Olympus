import { motion } from "framer-motion";
import { Trophy, BarChart3, Tv } from "lucide-react";

const cards = [
  {
    id: "individual",
    title: "Individual Leaderboard",
    subtitle: "Track your personal ranking across all sports",
    icon: Trophy,
    gradient: "from-neon-cyan to-cyan-600",
    glowColor: "rgba(0, 240, 255, 0.15)",
    borderColor: "rgba(0, 240, 255, 0.2)",
    iconColor: "text-neon-cyan",
  },
  {
    id: "overall",
    title: "Overall Fest Leaderboard",
    subtitle: "See which franchise dominates the tournament",
    icon: BarChart3,
    gradient: "from-neon-purple to-fuchsia-600",
    glowColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.2)",
    iconColor: "text-neon-purple",
  },
  {
    id: "live",
    title: "Live Matches / History",
    subtitle: "Watch live scores and browse past results",
    icon: Tv,
    gradient: "from-neon-gold to-orange-500",
    glowColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.2)",
    iconColor: "text-neon-gold",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function ActionCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="grid gap-4 px-4 sm:gap-5 sm:px-6 md:grid-cols-3 lg:px-8"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.button
            key={card.id}
            variants={cardVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="glass group relative flex flex-col items-center overflow-hidden rounded-2xl p-6 text-center transition-all duration-300 sm:p-8"
            style={{
              borderColor: card.borderColor,
              boxShadow: `0 0 30px ${card.glowColor}, inset 0 1px 0 ${card.borderColor}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 50px ${card.glowColor}, 0 0 80px ${card.glowColor}, inset 0 1px 0 ${card.borderColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `0 0 30px ${card.glowColor}, inset 0 1px 0 ${card.borderColor}`;
            }}
          >
            {/* Glow accent at top */}
            <div
              className="absolute -top-12 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full opacity-20 blur-[50px] transition-opacity group-hover:opacity-40"
              style={{
                background: `radial-gradient(ellipse, ${card.glowColor.replace("0.15", "1")}, transparent)`,
              }}
            />

            {/* Icon */}
            <div
              className={`relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} p-0.5 sm:h-16 sm:w-16`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${card.iconColor}`} />
              </div>
            </div>

            {/* Title */}
            <h3 className="relative mb-2 text-lg font-bold text-white sm:text-xl">
              {card.title}
            </h3>

            {/* Subtitle */}
            <p className="relative text-xs leading-relaxed text-slate-400 sm:text-sm">
              {card.subtitle}
            </p>

            {/* Arrow indicator */}
            <motion.div
              className="relative mt-4 flex items-center gap-1 text-xs font-semibold tracking-wider text-slate-500 transition-colors group-hover:text-white"
              animate={{}}
            >
              <span>EXPLORE</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
