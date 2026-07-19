import { useState } from "react";
import { ArrowUpRight, Shield } from "lucide-react";
import FranchiseModal from "../components/home/FranchiseModal";
import { franchises } from "../data/mockData";

function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Franchises() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
          <Shield size={15} />
          Team universe
        </div>

        <h1 className="font-display text-5xl uppercase tracking-wide text-white sm:text-7xl">
          Meet the franchises
        </h1>

        <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
          Every crest has a story. Every squad has something to prove.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {franchises.map((franchise) => (
          <button
            key={franchise.id}
            type="button"
            onClick={() => setSelectedFranchise(franchise)}
            className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 p-4 text-left shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20"
            style={{
              boxShadow: `0 18px 45px rgba(0,0,0,0.38), inset 0 0 45px ${franchise.color}12`,
            }}
          >
            <span
              className="absolute inset-x-0 top-0 h-px"
              style={{ backgroundColor: franchise.color }}
            />

            <span className="relative flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Pool {franchise.pool}
              <ArrowUpRight
                size={17}
                className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </span>

            <span
              className="relative mx-auto mt-7 flex h-20 w-20 items-center justify-center rounded-full border text-2xl font-black text-white"
              style={{
                borderColor: `${franchise.color}88`,
                background: `radial-gradient(circle, ${franchise.color}55, #020617 70%)`,
                boxShadow: `0 0 30px ${franchise.color}55`,
              }}
            >
              {franchise.emoji || getInitials(franchise.name)}
            </span>

            <span className="relative mt-6 block text-center font-display text-xl uppercase tracking-wide text-white sm:text-2xl">
              {franchise.name}
            </span>

            <span className="relative mt-2 flex justify-center gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              <span>Rank #{franchise.overallRank}</span>
              <span>{franchise.roster?.length || 0} players</span>
            </span>
          </button>
        ))}
      </section>

      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={Boolean(selectedFranchise)}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
