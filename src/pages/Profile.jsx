import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LogOut,
  Mail,
  ShieldCheck,
  User,
  Gavel,
  Swords,
  Settings,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const navigate = useNavigate();

  const {
    user,
    role,
    rollNumber,
    isAdmin,
    signOut,
  } = useAuth();

  const [registrationPhotoUrl, setRegistrationPhotoUrl] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationPhoto() {
      if (!user?.id) {
        setRegistrationPhotoUrl("");
        return;
      }

      const { data, error } = await supabase
        .from("player_registrations")
        .select("photo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Could not load registration photo:", error.message);
        return;
      }

      if (!cancelled) {
        setRegistrationPhotoUrl(data?.photo_url || "");
      }
    }

    loadRegistrationPhoto();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Load registration status for admin
  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "registration_open")
          .maybeSingle();
        if (data) setRegistrationOpen(data.value === true);
      } catch { /* table may not exist yet */ }
    }
    load();
  }, [isAdmin]);

  const toggleRegistration = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const { error } = await supabase.rpc("toggle_registration", {
        p_open: !registrationOpen,
      });
      if (error) {
        alert(error.message);
        return;
      }
      setRegistrationOpen(!registrationOpen);
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  }, [toggling, registrationOpen]);

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Olympus Participant";

  const avatarUrl =
    registrationPhotoUrl ||
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

      {/* ─── Admin Panel ─── */}
      {isAdmin && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white/60">
              Admin Controls
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Registration toggle */}
            <div className="rounded-2xl glass-strong p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
                Registration Status
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-sm font-bold ${registrationOpen ? "text-emerald-400" : "text-rose-400"}`}>
                  {registrationOpen ? "OPEN" : "CLOSED"}
                </span>
                <button
                  type="button"
                  onClick={toggleRegistration}
                  disabled={toggling}
                  className={`rounded-lg px-4 py-2 text-[11px] font-bold transition ${
                    registrationOpen
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                      : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  } disabled:opacity-40`}
                >
                  {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : registrationOpen ? "Close Registrations" : "Open Registrations"}
                </button>
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl glass-strong p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
                Management
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  to="/auction"
                  className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/10"
                >
                  <Gavel className="h-3.5 w-3.5" /> Franchise Auction
                </Link>
                <Link
                  to="/girls-auction"
                  className="flex items-center gap-2 rounded-lg border border-pink-400/20 bg-pink-400/5 px-4 py-2.5 text-xs font-bold text-pink-300 transition hover:bg-pink-400/10"
                >
                  <Gavel className="h-3.5 w-3.5" /> Girls Individual Auction
                </Link>
                <Link
                  to="/matches"
                  className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  <Swords className="h-3.5 w-3.5" /> Match Management
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

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
