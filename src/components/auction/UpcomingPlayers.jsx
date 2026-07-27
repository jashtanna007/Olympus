import { motion } from "framer-motion";
import { User } from "lucide-react";

export default function UpcomingPlayers({ players = [] }) {
  return (
    <div className="rounded-2xl glass-strong p-4">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
        Upcoming Players
      </h3>

      <div className="space-y-2">
        {players.length === 0 ? (
          <p className="py-6 text-center text-xs text-olympus-subtle">
            No upcoming players
          </p>
        ) : (
          players.slice(0, 4).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/5">
                    <User className="h-4 w-4 text-olympus-subtle" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {p.full_name}
                </p>
                <p className="text-[10px] text-olympus-muted">
                  {p.sports?.[0]?.position || p.sports?.[0]?.name || "Player"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
                  Base Price
                </span>
                <p className="text-xs font-bold text-olympus-gold">
                  ₹{(p.base_price || 200).toLocaleString("en-IN")}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
