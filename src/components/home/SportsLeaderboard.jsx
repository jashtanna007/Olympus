import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Trophy } from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";
import {
  getLeaderboardByPool,
  getOverallLeaderboard,
  sports,
} from "../../data/mockData";

const OVERALL_TAB = {
  name: "Overall",
};

export default function SportsLeaderboard({ onTeamClick }) {
  const [selectedTab, setSelectedTab] = useState(OVERALL_TAB.name);
  const allTabs = useMemo(() => [OVERALL_TAB, ...sports], []);

  const { poolA, poolB } = useMemo(() => {
    if (selectedTab === "Overall") {
      return getOverallLeaderboard();
    }

    return getLeaderboardByPool(selectedTab);
  }, [selectedTab]);

  return (
    <section>
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-sky-400">
          <Trophy size={16} />
          Tournament standings
        </div>

        <h1 className="font-display text-5xl uppercase tracking-wide text-white sm:text-7xl">
          Leaderboard
        </h1>

        <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
          Compare every franchise across the Olympus sporting programme.
        </p>
      </header>

      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {allTabs.map((tab) => {
            const isActive = selectedTab === tab.name;

            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => setSelectedTab(tab.name)}
                className={`relative rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition sm:text-xs ${
                  isActive
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-300"
                    : "border-white/[0.07] bg-white/[0.025] text-slate-500 hover:border-white/15 hover:text-slate-300"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="leaderboard-tab"
                    className="absolute inset-0 rounded-full shadow-[inset_0_0_18px_rgba(56,189,248,0.12),0_0_18px_rgba(56,189,248,0.08)]"
                  />
                )}

                <span className="relative">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PoolSection
          title="Pool A"
          teams={poolA}
          onTeamClick={onTeamClick}
        />

        <PoolSection
          title="Pool B"
          teams={poolB}
          onTeamClick={onTeamClick}
        />
      </div>
    </section>
  );
}

function PoolSection({ title, teams, onTeamClick }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-sky-400/15 bg-[#030a16]/80 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-sky-400" />
          <h2 className="text-sm font-black uppercase tracking-[0.13em] text-white">
            {title}
          </h2>
        </div>

        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
          {teams.length} franchises
        </span>
      </div>

      <div>
        {teams.map((team, index) => (
          <button
            key={team.id}
            type="button"
            onClick={() => onTeamClick?.(team)}
            className="group grid w-full grid-cols-[34px_46px_1fr_auto] items-center gap-3 border-b border-white/[0.04] px-4 py-4 text-left transition last:border-b-0 hover:bg-sky-400/[0.045] sm:grid-cols-[42px_52px_1fr_auto] sm:px-5"
          >
            <RankBadge rank={index + 1} />

            <FranchiseEmblem franchise={team} size="sm" />

            <div className="min-w-0">
              <strong className="block truncate text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
                {team.name}
              </strong>

              <span className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                Overall rank #{team.overallRank}
              </span>
            </div>

            <div className="text-right">
              <strong className="block text-sm text-sky-300 sm:text-base">
                {team.points.toLocaleString()}
              </strong>

              <span className="mt-1 block text-[7px] font-black uppercase tracking-widest text-slate-600">
                Points
              </span>
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}

function RankBadge({ rank }) {
  const styles = {
    1: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    2: "border-slate-300/20 bg-slate-300/[0.07] text-slate-300",
    3: "border-orange-400/25 bg-orange-400/[0.08] text-orange-300",
  };

  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-black sm:h-9 sm:w-9 ${
        styles[rank] ||
        "border-white/[0.07] bg-white/[0.025] text-slate-500"
      }`}
    >
      #{rank}
    </span>
  );
}
