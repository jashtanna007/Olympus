import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  TEST_BATCH_FIRST_ROLL,
  TEST_BATCH_LAST_ROLL,
} from "../utils/instituteEmail";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.46-.19-2.15H12v4.07h5.38a4.6 4.6 0 0 1-2 3.02v2.64h3.24c1.9-1.75 2.98-4.33 2.98-7.58Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.64c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.72A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.76A6.02 6.02 0 0 1 6.08 12c0-.61.11-1.2.31-1.76V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.72Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.11c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.72C7.18 7.87 9.39 6.11 12 6.11Z"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading: authLoading,
    authError,
    signInWithGoogle,
    clearAuthError,
  } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const routeError = location.state?.authError || "";
  const visibleError = localError || routeError || authError;

  useEffect(() => {
    if (!authLoading && user) {
      const destination = location.state?.from || "/";
      navigate(destination, { replace: true });
    }
  }, [
    authLoading,
    location.state,
    navigate,
    user,
  ]);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setLocalError("");
    clearAuthError();

    const { error } = await signInWithGoogle();

    if (error) {
      setLocalError(
        error.message || "Unable to start Google sign-in.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="fixed inset-0 z-0">
        <picture>
          <source
            srcSet="/backgrounds/stadium-desktop.png"
            media="(min-width: 768px)"
          />

          <img
            src="/backgrounds/stadium-mobile.png"
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </picture>

        <div className="absolute inset-0 bg-gradient-to-b from-olympus-bg/20 via-olympus-bg/65 to-olympus-bg" />
      </div>

      <div className="noise-overlay" />

      <div className="pointer-events-none fixed left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-olympus-gold/[0.06] blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative z-10 w-full max-w-md rounded-3xl glass-strong p-8 sm:p-10"
      >
        <div className="text-center">
          <img
            src="/olympus-logo.png"
            alt="Olympus"
            className="mx-auto mb-2 h-24 w-24 object-contain"
          />

          <h1 className="font-display text-4xl font-bold tracking-wider text-gradient-gold sm:text-5xl">
            OLYMPUS
          </h1>

          <p className="mt-1.5 text-xs text-olympus-muted">
            IIIT Vadodara Sports Fest
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-olympus-gold" />

            <div>
              <h2 className="text-[11px] font-semibold text-white">
                Institute accounts only
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-olympus-muted">
                Only eligible IIIT Vadodara institute accounts can access Olympus.
              </p>
            </div>
          </div>
        </div>

        {visibleError && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{visibleError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting || authLoading}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}

          {submitting
            ? "Opening Google..."
            : "Continue with Google"}
        </button>

        <p className="mt-5 text-center text-[11px] leading-5 text-olympus-subtle">
          Google will ask you to choose an account. Select your{" "}
          <span className="font-semibold text-white/70">
            @diu.iiitvadodara.ac.in
          </span>{" "}
          account.
        </p>
      </motion.div>
    </div>
  );
}
