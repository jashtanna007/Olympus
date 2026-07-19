import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Handshake,
} from "lucide-react";
import { Link } from "react-router-dom";
import FranchiseEmblem from "../common/FranchiseEmblem";
import { franchises, getOverallLeaderboard } from "../../data/mockData";

export default function QuickInfoPanel() {
  const { poolA, poolB } = getOverallLeaderboard();
  const leaderboard = [...poolA, ...poolB]
    .sort((first, second) => second.points - first.points)
    .slice(0, 3);

  const homeTeam = franchises[2] || franchises[0];
  const awayTeam = franchises[4] || franchises[1] || franchises[0];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1.05fr_0.9fr]">
      <article className="rounded-2xl border border-sky-400/15 bg-[#030a16]/80 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-sky-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-white">
              Rankings
            </h2>
          </div>

          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
            Overall
          </span>
        </div>

        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={team.id}
              className="grid grid-cols-[22px_1fr_auto] items-center gap-2 text-[10px] sm:text-xs"
            >
              <span className="font-black text-slate-500">{index + 1}</span>

              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{
                    backgroundColor: team.color,
                    boxShadow: `0 0 8px ${team.color}66`,
                  }}
                />
                <span className="truncate font-semibold text-slate-300">
                  {team.name}
                </span>
              </div>

              <strong className="text-white">
                {team.points.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>

        <Link
          to="/leaderboard"
          className="mt-5 flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-[9px] font-black uppercase tracking-[0.12em] text-sky-400 transition hover:text-sky-300"
        >
          View full rankings
          <ArrowRight size={13} />
        </Link>
      </article>

      <article className="rounded-2xl border border-sky-400/15 bg-[#030a16]/80 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays size={17} className="text-sky-400" />
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-white">
            Next match
          </h2>
        </div>

        <div className="flex items-center justify-center gap-6">
          <TeamBadge franchise={homeTeam} />

          <div className="text-center">
            <strong className="font-display text-xl text-white">VS</strong>
            <span className="mt-1 block text-[7px] font-bold uppercase tracking-widest text-slate-600">
              Group stage
            </span>
          </div>

          <TeamBadge franchise={awayTeam} />
        </div>

        <p className="mt-4 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          July 25, 2026
          <span className="mx-2 text-slate-700">•</span>
          4:30 PM
        </p>

        <Link
          to="/matches"
          className="mt-4 flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-[9px] font-black uppercase tracking-[0.12em] text-sky-400 transition hover:text-sky-300"
        >
          View schedule
          <ArrowRight size={13} />
        </Link>
      </article>

      <article className="hidden rounded-2xl border border-sky-400/15 bg-[#030a16]/80 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
        <div className="flex items-center gap-2">
          <Handshake size={17} className="text-sky-400" />
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-white">
            Partners
          </h2>
        </div>

        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          Powered by the campus community.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {["Title", "Gear", "Media"].map((partner) => (
            <div
              key={partner}
              className="flex min-h-14 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] px-2 text-center"
            >
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {partner}
                <span className="mt-1 block text-[6px] text-slate-700">
                  Partner
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/5 pt-4 text-center text-[8px] font-bold uppercase tracking-[0.14em] text-sky-400">
          Olympus 2026
        </p>
      </article>
    </div>
  );
}

function TeamBadge({ franchise }) {
  if (!franchise) return null;

  return (
    <div className="w-20 text-center">
      <FranchiseEmblem
        franchise={franchise}
        size="md"
        active
        className="mx-auto"
      />

      <strong
        className="mt-2 block truncate text-[8px] font-black uppercase tracking-wide"
        style={{ color: franchise.color }}
      >
        {franchise.name.split(" ").pop()}
      </strong>
    </div>
  );
}
