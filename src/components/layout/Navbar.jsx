import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Menu, UserRound, X, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { label: "Home", path: "/" },
  { label: "Franchises", path: "/franchises" },
  { label: "Matches", path: "/matches" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Profile", path: "/profile" },
];

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
        <Zap size={25} fill="currentColor" />
      </span>

      <span className="leading-none">
        <strong className="font-display text-xl uppercase tracking-wider text-white">
          Olympus
        </strong>
        <small className="mt-1 block text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500">
          College sports fest
        </small>
      </span>
    </span>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 hidden border-b border-white/5 bg-[#020711]/80 backdrop-blur-2xl md:block">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6">
          <NavLink to="/" aria-label="Olympus home">
            <Brand />
          </NavLink>

          <nav className="flex items-center gap-8">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                className={({ isActive }) =>
                  `relative py-7 text-xs font-bold uppercase tracking-wider transition ${
                    isActive
                      ? "text-sky-400"
                      : "text-slate-400 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="desktop-navigation-indicator"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.9)]"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:text-white"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            </button>

            <NavLink
              to="/profile"
              className="flex h-10 items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/5 px-4 text-xs font-bold uppercase tracking-wider text-sky-400"
            >
              <UserRound size={17} />
              Profile
            </NavLink>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020711]/85 backdrop-blur-2xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            <Brand />
          </NavLink>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-sky-400"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              aria-label="Open navigation menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/5 bg-[#020711]/95 px-4 py-3"
            >
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 text-sm font-semibold ${
                      isActive
                        ? "bg-sky-400/10 text-sky-400"
                        : "text-slate-400"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
