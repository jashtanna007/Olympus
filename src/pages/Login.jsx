import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  UserPlus,
  LogIn,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const ALLOWED_DOMAIN = "@diu.iiitvadodara.ac.in";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@diu\.iiitvadodara\.ac\.in$/;

export default function Login() {
  const navigate = useNavigate();
  const { user, signUpWithPassword, signInWithPassword, resendConfirmationEmail } =
    useAuth();

  const [authMode, setAuthMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSignup = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setShowResend(false);

      const trimmed = email.trim().toLowerCase();
      if (!trimmed.endsWith(ALLOWED_DOMAIN) || !EMAIL_REGEX.test(trimmed)) {
        setError(`Only ${ALLOWED_DOMAIN} emails are allowed.`);
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);
      const { error: err } = await signUpWithPassword(trimmed, password);
      setLoading(false);

      if (err) {
        const msg = err.message || "Signup failed.";
        if (msg.toLowerCase().includes("already registered")) {
          setError("This email is already registered. Try logging in.");
        } else {
          setError(msg);
        }
        return;
      }
      setSuccess("Check your email to confirm your account.");
      setUnconfirmedEmail(trimmed);
    },
    [email, password, confirmPassword, signUpWithPassword]
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setShowResend(false);

      const trimmed = email.trim().toLowerCase();
      if (!trimmed.endsWith(ALLOWED_DOMAIN) || !EMAIL_REGEX.test(trimmed)) {
        setError(`Only ${ALLOWED_DOMAIN} emails are allowed.`);
        return;
      }

      setLoading(true);
      const { error: err } = await signInWithPassword(trimmed, password);
      setLoading(false);

      if (err) {
        const msg = err.message || "";
        if (msg.toLowerCase().includes("not confirmed")) {
          setError("Email not confirmed. Check your inbox or resend below.");
          setShowResend(true);
          setUnconfirmedEmail(trimmed);
          return;
        }
        setError("Invalid email or password.");
      }
    },
    [email, password, signInWithPassword]
  );

  const handleResend = useCallback(async () => {
    if (!unconfirmedEmail) return;
    setResendLoading(true);
    setError("");
    const { error: err } = await resendConfirmationEmail(unconfirmedEmail);
    setResendLoading(false);
    if (err) {
      setError(err.message || "Failed to resend.");
      return;
    }
    setSuccess("Confirmation email resent.");
    setShowResend(false);
  }, [unconfirmedEmail, resendConfirmationEmail]);

  const toggleMode = () => {
    setAuthMode((m) => (m === "signup" ? "login" : "signup"));
    setError("");
    setSuccess("");
    setShowResend(false);
    setPassword("");
    setConfirmPassword("");
  };

  const isSignup = authMode === "signup";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Stadium background */}
      <div className="fixed inset-0 z-0">
        <picture>
          <source srcSet="/backgrounds/stadium-desktop.png" media="(min-width: 768px)" />
          <img
            src="/backgrounds/stadium-mobile.png"
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-olympus-bg/20 via-olympus-bg/60 to-olympus-bg" />
      </div>
      <div className="noise-overlay" />

      {/* Ambient glows */}
      <div className="pointer-events-none fixed left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-olympus-gold/[0.06] blur-[150px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl glass-strong p-8 sm:p-10"
      >
        {/* Logo */}
        <motion.div className="mb-7 text-center" layout>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-olympus-gold to-olympus-gold/40">
            <Trophy className="h-6 w-6 text-olympus-bg" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-wider text-gradient-gold sm:text-5xl">
            OLYMPUS
          </h1>
          <p className="mt-1.5 text-xs text-olympus-muted">
            IIIT Vadodara Sports Fest
          </p>
        </motion.div>

        {/* Mode badge */}
        <motion.div layout className="mb-5 flex items-center justify-center gap-2">
          <motion.div
            key={authMode}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-full glass px-4 py-1.5"
          >
            {isSignup ? (
              <UserPlus className="h-3.5 w-3.5 text-olympus-gold" />
            ) : (
              <LogIn className="h-3.5 w-3.5 text-olympus-gold" />
            )}
            <span className="text-xs font-semibold text-olympus-gold">
              {isSignup ? "Create Account" : "Welcome Back"}
            </span>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={authMode}
            initial={{ opacity: 0, x: isSignup ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isSignup ? 15 : -15 }}
            transition={{ duration: 0.25 }}
            onSubmit={isSignup ? handleSignup : handleLogin}
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Institute Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-olympus-subtle" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  placeholder="yourname@diu.iiitvadodara.ac.in"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-white outline-none transition-all placeholder:text-olympus-subtle focus:border-olympus-gold/40 focus:bg-white/[0.06]"
                  autoFocus
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-olympus-subtle">
                Only <span className="font-semibold text-white/70">{ALLOWED_DOMAIN}</span> accepted
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-olympus-subtle" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={isSignup ? "Minimum 8 characters" : "Enter your password"}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-12 text-white outline-none transition-all placeholder:text-olympus-subtle focus:border-olympus-gold/40 focus:bg-white/[0.06]"
                  required
                  minLength={isSignup ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-olympus-subtle transition-colors hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <AnimatePresence>
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="mb-2 block text-sm font-medium text-white/90">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-olympus-subtle" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-12 text-white outline-none transition-all placeholder:text-olympus-subtle focus:border-olympus-gold/40 focus:bg-white/[0.06]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-olympus-subtle transition-colors hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-olympus-success/20 bg-olympus-success/[0.06] px-3 py-2.5"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-olympus-success" />
                  <p className="text-sm text-olympus-success">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-olympus-danger/20 bg-olympus-danger/[0.06] px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-olympus-danger" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resend */}
            <AnimatePresence>
              {showResend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl glass py-2.5 text-sm font-medium text-olympus-gold transition-all disabled:opacity-50"
                  >
                    {resendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Resend Confirmation Email
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || !email.trim() || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold py-3.5 font-semibold text-olympus-bg shadow-[0_4px_24px_-4px_rgba(244,200,74,0.5)] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignup ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>

            <p className="text-center text-xs text-olympus-subtle">
              <ShieldCheck className="mb-0.5 mr-1 inline h-3 w-3" />
              Secured with domain-locked authentication
            </p>

            {/* Toggle */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-olympus-muted transition-colors hover:text-white"
              >
                {isSignup ? (
                  <>
                    Already a user?{" "}
                    <span className="font-semibold text-olympus-gold">Login</span>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <span className="font-semibold text-olympus-gold">Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
