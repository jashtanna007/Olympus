import {
  CalendarDays,
  Home,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { label: "Home", path: "/", icon: Home, end: true },
  { label: "Franchises", path: "/franchises", icon: Shield },
  { label: "Matches", path: "/matches", icon: CalendarDays },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "Profile", path: "/profile", icon: UserRound },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#020711]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[7px] font-bold uppercase tracking-tight transition ${
                isActive ? "text-sky-400" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-x-3 top-0 h-px bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                )}

                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "drop-shadow-[0_0_8px_#38bdf8]" : ""}
                />

                <span className="max-w-full truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
