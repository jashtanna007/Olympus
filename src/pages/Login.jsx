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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4" style={{ background: "var(--color-navy)" }}>
      {/* Torch stripe accent */}
      <div className="torch-stripe" style={{ top: "-100px", right: "15%", opacity: 0.5 }} />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="card-elevated relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10"
        style={{ background: "var(--color-charcoal)" }}
      >
        {/* Logo */}
        <motion.div className="mb-6 text-center" layout>
          <h1
            className="font-display text-4xl tracking-wider sm:text-5xl"
            style={{ color: "var(--color-flame)" }}
          >
            OLYMPUS
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-stone)" }}>IIIT Vadodara Sports Fest</p>
        </motion.div>

        {/* Auth mode badge */}
        <motion.div
          layout
          className="mb-5 flex items-center justify-center gap-2"
        >
          <motion.div
            key={authMode}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{
              borderColor: "rgba(232, 97, 45, 0.2)",
              background: "rgba(232, 97, 45, 0.06)",
            }}
          >
            {isSignup ? (
              <UserPlus className="h-3.5 w-3.5" style={{ color: "var(--color-flame)" }} />
            ) : (
              <LogIn className="h-3.5 w-3.5" style={{ color: "var(--color-flame)" }} />
            )}
            <span className="text-xs font-semibold" style={{ color: "var(--color-flame)" }}>
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
            {/* Email input */}
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-cream)" }}>
                Institute Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--color-stone)" }} />
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
                  className="w-full rounded-xl border py-3.5 pl-11 pr-4 outline-none transition-all duration-200"
                  style={{
                    background: "var(--color-surface-900)",
                    borderColor: "rgba(138, 155, 176, 0.15)",
                    color: "var(--color-cream)",
                  }}
                  autoFocus
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-stone)" }}>
                Only <span className="font-semibold" style={{ color: "var(--color-cream)" }}>{ALLOWED_DOMAIN}</span> emails accepted
              </p>
            </div>

            {/* Password input */}
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-cream)" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--color-stone)" }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={isSignup ? "Minimum 8 characters" : "Enter your password"}
                  className="w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition-all duration-200"
                  style={{
                    background: "var(--color-surface-900)",
                    borderColor: "rgba(138, 155, 176, 0.15)",
                    color: "var(--color-cream)",
                  }}
                  required
                  minLength={isSignup ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--color-stone)" }}
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
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-cream)" }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--color-stone)" }} />
                    <input
                      id="login-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition-all duration-200"
                      style={{
                        background: "var(--color-surface-900)",
                        borderColor: "rgba(138, 155, 176, 0.15)",
                        color: "var(--color-cream)",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "var(--color-stone)" }}
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
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: "rgba(34, 197, 94, 0.2)",
                    background: "rgba(34, 197, 94, 0.08)",
                  }}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
                  <p className="text-sm" style={{ color: "#86efac" }}>{success}</p>
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
                  className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: "rgba(239, 68, 68, 0.2)",
                    background: "rgba(239, 68, 68, 0.08)",
                  }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
                  <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                    style={{
                      color: "var(--color-flame)",
                      borderColor: "rgba(232, 97, 45, 0.2)",
                      background: "rgba(232, 97, 45, 0.06)",
                    }}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--color-flame)" }}
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

            <p className="text-center text-xs" style={{ color: "var(--color-stone)" }}>
              <ShieldCheck className="mb-0.5 mr-1 inline h-3 w-3" />
              Secured with domain-locked authentication
            </p>

            {/* Auth mode toggle */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-sm transition-colors"
                style={{ color: "var(--color-stone)" }}
              >
                {isSignup ? (
                  <>Already a user? <span className="font-semibold" style={{ color: "var(--color-flame)" }}>Login</span></>
                ) : (
                  <>New here? <span className="font-semibold" style={{ color: "var(--color-flame)" }}>Sign Up</span></>
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
