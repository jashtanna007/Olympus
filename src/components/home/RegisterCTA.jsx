import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function RegisterCTA() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-400/25 bg-[#030a16]/85 px-5 py-5 shadow-[0_0_40px_rgba(14,165,233,0.1)] backdrop-blur-xl sm:px-7">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(0,132,255,0.2),transparent_70%)]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-400">
            <ShieldCheck size={23} />
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-sky-400 sm:text-base">
              Be part of the legacy
            </h2>

            <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
              Compete for glory. Create history.
            </p>
          </div>
        </div>

        <Link
          to="/profile"
          className="group flex min-h-11 items-center justify-center gap-3 rounded-lg border border-sky-300/35 bg-gradient-to-r from-blue-600 to-sky-400 px-7 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(0,145,255,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(0,145,255,0.48)]"
        >
          Register now
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
}
