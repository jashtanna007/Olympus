import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { franchises } from "../data/mockData";

const fixtures = [
  {
    id: 1,
    sport: "Basketball",
    stage: "Group Stage",
    day: "Day 1",
    time: "4:30 PM",
    venue: "Main Arena",
    home: 0,
    away: 3,
  },
  {
    id: 2,
    sport: "Football",
    stage: "Pool A",
    day: "Day 1",
    time: "6:00 PM",
    venue: "Football Ground",
    home: 1,
    away: 4,
  },
  {
    id: 3,
    sport: "Volleyball",
    stage: "Pool B",
    day: "Day 2",
    time: "10:00 AM",
    venue: "Sports Complex",
    home: 2,
    away: 5,
  },
  {
    id: 4,
    sport: "Badminton",
    stage: "Quarter Final",
    day: "Day 2",
    time: "3:00 PM",
    venue: "Indoor Court",
    home: 6,
    away: 7,
  },
];

function Team({ franchise }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-sm font-black text-white"
        style={{
          borderColor: `${franchise.color}88`,
          background: `radial-gradient(circle, ${franchise.color}55, #020617 72%)`,
          boxShadow: `0 0 22px ${franchise.color}44`,
        }}
      >
        {franchise.emoji || franchise.name.slice(0, 2).toUpperCase()}
      </span>

      <strong className="text-xs uppercase tracking-wide text-white sm:text-sm">
        {franchise.name}
      </strong>
    </div>
  );
}

export default function Matches() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
          <CalendarDays size={15} />
          Match centre
        </div>

        <h1 className="font-display text-5xl uppercase tracking-wide text-white sm:text-7xl">
          Fixtures and results
        </h1>

        <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
          Follow upcoming contests across every Olympus arena.
        </p>
      </header>

      <section className="space-y-4">
        {fixtures.map((fixture, index) => {
          const home = franchises[fixture.home % franchises.length];
          const away = franchises[fixture.away % franchises.length];

          return (
            <article
              key={fixture.id}
              className={`rounded-2xl border bg-slate-950/70 p-5 backdrop-blur-xl sm:p-6 ${
                index === 0
                  ? "border-sky-400/35 shadow-[0_0_40px_rgba(14,165,233,0.12)]"
                  : "border-white/10"
              }`}
            >
              <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    {fixture.sport}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{fixture.stage}</p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {fixture.day}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-8">
                <Team franchise={home} />

                <div className="text-center">
                  <strong className="font-display text-2xl text-white">VS</strong>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    Upcoming
                  </p>
                </div>

                <Team franchise={away} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-white/5 pt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-2">
                  <Clock3 size={13} />
                  {fixture.time}
                </span>

                <span className="flex items-center gap-2">
                  <MapPin size={13} />
                  {fixture.venue}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
