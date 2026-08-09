import { Link, useLocation } from "react-router-dom";
import { Home, Shield, Swords, BarChart3, User } from "lucide-react";

const TABS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Teams", path: "/franchises", icon: Shield },
  { label: "Matches", path: "/matches", icon: Swords },
  { label: "Board", path: "/leaderboard", icon: BarChart3 },
  { label: "Profile", path: "/profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] glass-dark md:hidden">
      <div className="flex h-16 items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: isActive ? "#F4C84A" : "#636A78" }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 h-[2px] w-8 rounded-full bg-olympus-gold" />
              )}

              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.6} />
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: isActive ? "#F4C84A" : "#636A78" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* iOS safe area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
