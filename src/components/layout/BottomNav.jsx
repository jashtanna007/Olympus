import { motion } from "framer-motion";
import { Home, Swords, Trophy, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "matches", label: "Matches", icon: Swords, path: "/" },
  { id: "leaderboard", label: "Standings", icon: Trophy, path: "/" },
  { id: "profile", label: "Profile", icon: User, path: "/" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // For now, all tabs go to "/" since we only have one page active
  const activeTab = "home";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: "rgba(7, 19, 33, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <motion.button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center gap-1 px-3 py-1.5"
            >
              {/* Active glow indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute -top-1 h-[3px] w-8 rounded-full"
                  style={{
                    background: "var(--color-accent-blue)",
                    boxShadow: "0 0 12px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.2)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <Icon
                className="h-5 w-5 transition-colors duration-200"
                style={{
                  color: isActive ? "var(--color-accent-blue)" : "var(--color-text-secondary)",
                }}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className="text-[10px] font-medium tracking-wide transition-colors duration-200"
                style={{
                  color: isActive ? "var(--color-accent-blue)" : "var(--color-text-secondary)",
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Safe area for iOS home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
