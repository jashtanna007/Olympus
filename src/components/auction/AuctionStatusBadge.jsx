import { motion } from "framer-motion";

const STATUS_CONFIG = {
  "UP FOR AUCTION": {
    bg: "bg-gradient-to-r from-olympus-gold/20 to-olympus-gold/5",
    border: "border-olympus-gold/40",
    text: "text-olympus-gold",
    dot: "bg-olympus-gold",
    pulse: true,
  },
  SOLD: {
    bg: "bg-gradient-to-r from-olympus-success/20 to-olympus-success/5",
    border: "border-olympus-success/40",
    text: "text-olympus-success",
    dot: "bg-olympus-success",
    pulse: false,
  },
  UNSOLD: {
    bg: "bg-gradient-to-r from-olympus-danger/20 to-olympus-danger/5",
    border: "border-olympus-danger/40",
    text: "text-olympus-danger",
    dot: "bg-olympus-danger",
    pulse: false,
  },
  RETAINED: {
    bg: "bg-gradient-to-r from-olympus-purple/20 to-olympus-purple/5",
    border: "border-olympus-purple/40",
    text: "text-olympus-purple",
    dot: "bg-olympus-purple",
    pulse: false,
  },
};

export default function AuctionStatusBadge({ status = "UP FOR AUCTION" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["UP FOR AUCTION"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      key={status}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 ${config.bg} ${config.border}`}
    >
      <span className={`relative flex h-2 w-2`}>
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`}
        />
      </span>
      <span
        className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.text}`}
      >
        {status}
      </span>
    </motion.div>
  );
}
