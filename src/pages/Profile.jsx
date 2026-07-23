import { motion } from "framer-motion";
import {
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Profile() {
  const navigate = useNavigate();

  const {
    user,
    role,
    rollNumber,
    signOut,
  } = useAuth();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Olympus Participant";

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-28 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl glass-strong">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="h-7 w-7 text-olympus-gold" />
          )}
        </div>

        <h1 className="mt-5 font-display text-4xl font-bold text-white sm:text-5xl">
          {fullName}
        </h1>

        <span className="mt-3 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-gold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified institute account
        </span>
      </motion.header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl glass-strong p-5">
          <Mail className="h-5 w-5 text-olympus-gold" />

          <span className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
            Institute email
          </span>

          <strong className="mt-2 block break-all text-sm text-white">
            {user?.email}
          </strong>
        </article>

        <article className="rounded-2xl glass-strong p-5">
          <User className="h-5 w-5 text-olympus-gold" />

          <span className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
            Roll number
          </span>

          <strong className="mt-2 block text-sm text-white">
            {rollNumber || "Unavailable"}
          </strong>
        </article>

        <article className="rounded-2xl glass-strong p-5">
          <ShieldCheck className="h-5 w-5 text-olympus-gold" />

          <span className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
            Platform role
          </span>

          <strong className="mt-2 block text-sm uppercase text-white">
            {role || "viewer"}
          </strong>
        </article>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-200 transition hover:bg-red-400/15"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
