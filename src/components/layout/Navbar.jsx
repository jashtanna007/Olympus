import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Home,
  Shield,
  Swords,
  BarChart3,
  Gavel,
  User,
  Menu,
  X,
  ArrowUpRight,
  FileSpreadsheet,
  Loader2,
  ClipboardEdit,
} from "lucide-react";
import MagneticButton from "../ui/MagneticButton";
import { downloadRegisteredPlayersWorkbook } from "../../utils/downloadRegisteredPlayersWorkbook";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const NAV_LINKS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Franchises", path: "/franchises", icon: Shield },
  { label: "Matches", path: "/matches", icon: Swords, adminOnly: true },
  { label: "Leaderboard", path: "/leaderboard", icon: BarChart3 },
  { label: "Auction", path: "/auction", icon: Gavel, adminOnly: true },
  { label: "Profile", path: "/profile", icon: User },
];

export default function Navbar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  const [
    registeredPlayersDownloading,
    setRegisteredPlayersDownloading,
  ] = useState(false);

  const isHomeDashboard = location.pathname === "/";

  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.adminOnly || isAdmin
  );

  // Hide on scroll down, show on scroll up, and track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Track scrolled state for backdrop styling
      setScrolled(currentScrollY > 15);

      // Always show near the top of the page
      if (currentScrollY < 40) {
        setVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;
      // Scroll threshold of 8px to prevent micro-jitter
      if (Math.abs(diff) > 8) {
        if (diff > 0) {
          setVisible(false);
        } else {
          setVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      setVisible(true);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const handleDownloadRegisteredPlayers = async () => {
    if (!isAdmin || !isHomeDashboard || registeredPlayersDownloading) return;

    setRegisteredPlayersDownloading(true);
    try {
      const { data: registrations, error: registrationError } = await supabase
        .from("player_registrations")
        .select("id, full_name, roll_number, email, phone, gender, branch, year, sports, created_at")
        .order("roll_number", { ascending: true });

      if (registrationError) throw registrationError;
      await downloadRegisteredPlayersWorkbook({ registrations: registrations || [] });
    } catch (downloadError) {
      console.error("Registered-player workbook download failed:", downloadError);
      window.alert(downloadError?.message || "Unable to download the registered-player spreadsheet.");
    } finally {
      setRegisteredPlayersDownloading(false);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#07090F]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.65)] py-2 sm:py-2.5"
            : "bg-transparent border-b border-transparent pt-3 sm:pt-4 pb-1"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav
            className={`flex h-14 items-center justify-between rounded-2xl px-4 sm:h-16 sm:px-6 transition-all duration-300 ${
              scrolled
                ? "bg-[#0C101C]/90 border border-white/10 shadow-lg"
                : "glass-strong"
            }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/olympus-logo.png"
                alt="Olympus"
                className="h-10 w-10 object-contain"
              />
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              {visibleLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="relative px-4 py-2 text-sm font-medium transition-colors"
                    style={{ color: isActive ? "#F4C84A" : "#A4A9B6" }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-white/[0.07]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right cluster */}
            <div className="hidden items-center gap-3 md:flex">
              {isHomeDashboard && isAdmin && (
                <button
                  type="button"
                  onClick={handleDownloadRegisteredPlayers}
                  disabled={registeredPlayersDownloading}
                  title="Download registered players"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-400/10 px-3 text-[10px] font-black uppercase tracking-wide text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {registeredPlayersDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  <span className="hidden xl:inline">
                    {registeredPlayersDownloading ? "Preparing..." : "Registered Players"}
                  </span>
                </button>
              )}

              {/* Live badge */}
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <span className="live-dot h-2 w-2 rounded-full bg-olympus-success" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-success">
                  Live
                </span>
              </div>

              <Link to="/register">
                <MagneticButton variant="gold" size="sm">
                  Register
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </MagneticButton>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </motion.header>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col glass-dark"
          >
            {/* Close button */}
            <div className="flex justify-end px-6 pt-6">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu links */}
            <nav className="flex flex-1 flex-col items-center justify-center gap-2 px-8">
              {visibleLinks.map((link, i) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className="w-full max-w-xs"
                  >
                    <Link
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-lg font-medium transition-all ${
                        isActive
                          ? "glass-strong text-olympus-gold"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" style={{ color: isActive ? "#F4C84A" : undefined }} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              {/* Register link in mobile menu */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * visibleLinks.length, duration: 0.3 }}
                className="w-full max-w-xs"
              >
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-lg font-medium transition-all ${
                    location.pathname === "/register"
                      ? "glass-strong text-olympus-gold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <ClipboardEdit
                    className="h-5 w-5"
                    style={{ color: location.pathname === "/register" ? "#F4C84A" : undefined }}
                  />
                  Register
                </Link>
              </motion.div>
            </nav>

            {/* Logo at bottom */}
            <div className="flex items-center justify-center gap-2 pb-8 pt-4">
              <Trophy className="h-4 w-4 text-olympus-gold/50" />
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-white/30">
                OLYMPUS
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
