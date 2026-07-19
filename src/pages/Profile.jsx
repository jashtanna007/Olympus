import { LogOut, Mail, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const name =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Olympus Player";

  const email = user?.email || "College account";
  const initial = name.trim().charAt(0).toUpperCase() || "P";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
          <UserRound size={15} />
          Player identity
        </div>

        <h1 className="font-display text-5xl uppercase tracking-wide text-white sm:text-7xl">
          Your profile
        </h1>

        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Manage your Olympus identity and account.
        </p>
      </header>

      <section className="rounded-3xl border border-sky-400/20 bg-slate-950/75 p-6 shadow-[0_0_50px_rgba(14,165,233,0.1)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-sky-400/35 bg-sky-400/10 text-5xl font-black text-sky-400 shadow-[0_0_35px_rgba(14,165,233,0.18)]">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck size={13} />
              Verified account
            </span>

            <h2 className="mt-4 truncate text-2xl font-bold text-white sm:text-3xl">
              {name}
            </h2>

            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-400 sm:justify-start">
              <Mail size={15} />
              {email}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Access role
            </span>
            <strong className="mt-1 block uppercase text-sky-400">
              {role || "viewer"}
            </strong>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/65 p-5">
          <Trophy className="text-sky-400" />
          <h3 className="mt-5 font-bold text-white">Player registration</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registration and franchise information will appear here.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/65 p-5">
          <ShieldCheck className="text-sky-400" />
          <h3 className="mt-5 font-bold text-white">Account security</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your existing Supabase authentication remains unchanged.
          </p>
        </article>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-400 transition hover:bg-red-400/15"
      >
        <LogOut size={17} />
        Sign out of Olympus
      </button>
    </div>
  );
}
