import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="glass-strong max-w-md rounded-2xl p-8 text-center sm:p-10"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="mb-4 inline-block"
        >
          <Construction className="h-12 w-12 text-neon-gold" />
        </motion.div>

        <h1 className="font-display text-2xl font-bold tracking-wider text-white">
          Registration
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Player registration is coming soon. You'll be able to select your sports, join a franchise, and compete in the tournament.
        </p>
        {user?.email && (
          <p className="mt-4 rounded-lg border border-neon-cyan/10 bg-neon-cyan/5 px-3 py-2 text-xs text-neon-cyan">
            Logged in as: {user.email}
          </p>
        )}
      </motion.div>
    </div>
  );
}
