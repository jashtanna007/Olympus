import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck, Loader2, AlertCircle, UserPlus, LogIn, Lock, Eye, EyeOff, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Strict domain lock: ONLY @diu.iiitvadodara.ac.in
const ALLOWED_DOMAIN = "@diu.iiitvadodara.ac.in";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@diu\.iiitvadodara\.ac\.in$/;

export default function Login() {
  const navigate = useNavigate();
  const { user, signUpWithPassword, signInWithPassword, resendConfirmationEmail } = useAuth();

  const [authMode, setAuthMode] = useState("signup"); // 'signup' | 'login'
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
  // Track the email that needs confirmation (for resend)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // ─── Signup handler ───
  const handleSignup = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setShowResend(false);

      const trimmedEmail = email.trim().toLowerCase();

      // Domain check
      if (!trimmedEmail.endsWith(ALLOWED_DOMAIN) || !EMAIL_REGEX.test(trimmedEmail)) {
        setError(`Only ${ALLOWED_DOMAIN} emails are allowed. Please use your institute email.`);
        return;
      }

      // Password validation
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);
      const { error: signUpError } = await signUpWithPassword(trimmedEmail, password);
      setLoading(false);

      if (signUpError) {
        const msg = signUpError.message || "Signup failed. Please try again.";
        // Surface DB trigger errors directly
        if (msg.toLowerCase().includes("roll number")) {
          setError(msg);
        } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
          setError("This email is already registered. Try logging in instead.");
        } else {
          setError(msg);
        }
        return;
      }

      // Success — email confirmation required
      setSuccess("Check your email to confirm your account. Once confirmed, you can log in.");
      setUnconfirmedEmail(trimmedEmail);
    },
    [email, password, confirmPassword, signUpWithPassword]
  );

  // ─── Login handler ───
  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setShowResend(false);

      const trimmedEmail = email.trim().toLowerCase();

      // Domain check
      if (!trimmedEmail.endsWith(ALLOWED_DOMAIN) || !EMAIL_REGEX.test(trimmedEmail)) {
        setError(`Only ${ALLOWED_DOMAIN} emails are allowed. Please use your institute email.`);
        return;
      }

      setLoading(true);
      const { error: signInError } = await signInWithPassword(trimmedEmail, password);
      setLoading(false);

      if (signInError) {
        const msg = signInError.message || "";
        // Check for unconfirmed email
        if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("not confirmed")) {
          setError("Your email is not confirmed yet. Please check your inbox or resend the confirmation.");
          setShowResend(true);
          setUnconfirmedEmail(trimmedEmail);
          return;
        }
        // Generic invalid credentials
        setError("Invalid email or password.");
        return;
      }

      // On success, onAuthStateChange will fire and user will be set → redirect happens via useEffect
    },
    [email, password, signInWithPassword]
  );

  // ─── Resend confirmation ───
  const handleResendConfirmation = useCallback(async () => {
    if (!unconfirmedEmail) return;
    setResendLoading(true);
    setError("");
    const { error: resendError } = await resendConfirmationEmail(unconfirmedEmail);
    setResendLoading(false);

    if (resendError) {
      setError(resendError.message || "Failed to resend confirmation email.");
      return;
    }
    setSuccess("Confirmation email resent. Please check your inbox.");
    setShowResend(false);
  }, [unconfirmedEmail, resendConfirmationEmail]);

  // ─── Toggle auth mode ───
  const toggleAuthMode = () => {
    setAuthMode((m) => (m === "signup" ? "login" : "signup"));
    setError("");
    setSuccess("");
    setShowResend(false);
    setPassword("");
    setConfirmPassword("");
  };

  const isSignup = authMode === "signup";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Animated background */}
      <div className="bg-grid" />

      {/* Ambient glow orbs */}
      <motion.div
        className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #00f0ff 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.1, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10"
      >
        {/* Logo */}
        <motion.div className="mb-6 text-center" layout>
          <motion.h1
            className="font-display text-4xl font-bold tracking-wider text-neon-cyan text-glow-cyan sm:text-5xl"
            animate={{
              textShadow: [
                "0 0 10px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.3)",
                "0 0 20px rgba(0,240,255,0.8), 0 0 60px rgba(0,240,255,0.4)",
                "0 0 10px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.3)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            OLYMPUS
          </motion.h1>
          <p className="mt-2 text-sm text-slate-400">Sports Tournament Platform</p>
        </motion.div>

        {/* Auth mode badge */}
        <motion.div
          layout
          className="mb-5 flex items-center justify-center gap-2"
        >
          <motion.div
            key={authMode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-full border border-neon-cyan/15 bg-neon-cyan/5 px-4 py-1.5"
          >
            {isSignup ? (
              <UserPlus className="h-3.5 w-3.5 text-neon-cyan" />
            ) : (
              <LogIn className="h-3.5 w-3.5 text-neon-cyan" />
            )}
            <span className="text-xs font-semibold text-neon-cyan">
              {isSignup ? "Create Account" : "Welcome Back"}
            </span>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={authMode}
            initial={{ opacity: 0, x: isSignup ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isSignup ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={isSignup ? handleSignup : handleLogin}
            className="space-y-4"
          >
            {/* Email input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Institute Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  placeholder="yourname@diu.iiitvadodara.ac.in"
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-900/80 py-3.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/25"
                  autoFocus
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Only <span className="font-semibold text-slate-400">{ALLOWED_DOMAIN}</span> emails accepted
              </p>
            </div>

            {/* Password input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={isSignup ? "Minimum 8 characters" : "Enter your password"}
                  className="w-full rounded-xl border border-slate-700/50 bg-slate-900/80 py-3.5 pl-11 pr-12 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/25"
                  required
                  minLength={isSignup ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Confirm password (signup only) */}
            <AnimatePresence>
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="login-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-900/80 py-3.5 pl-11 pr-12 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/25"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-emerald-300">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resend confirmation button */}
            <AnimatePresence>
              {showResend && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 py-2.5 text-sm font-medium text-neon-cyan transition-all hover:border-neon-cyan/40 hover:bg-neon-cyan/10 disabled:opacity-50"
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

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || !email.trim() || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="gradient-border flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignup ? "Create Account" : "Sign In"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>

            <p className="text-center text-xs text-slate-500">
              <ShieldCheck className="mb-0.5 mr-1 inline h-3 w-3" />
              Secured with domain-locked authentication
            </p>

            {/* Auth mode toggle */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-sm text-slate-400 transition-colors hover:text-neon-cyan"
              >
                {isSignup ? (
                  <>Already a user? <span className="font-semibold text-neon-cyan">Login</span></>
                ) : (
                  <>New here? <span className="font-semibold text-neon-cyan">Sign Up</span></>
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
