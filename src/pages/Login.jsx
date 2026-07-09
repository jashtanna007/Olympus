import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck, Loader2, AlertCircle, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Strict domain lock: ONLY @diu.iiitvadodara.ac.in
const ALLOWED_DOMAIN = "@diu.iiitvadodara.ac.in";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@diu\.iiitvadodara\.ac\.in$/;

export default function Login() {
  const navigate = useNavigate();
  const { user, signInWithOtp, verifyOtp } = useAuth();

  const [authMode, setAuthMode] = useState("signup"); // 'signup' | 'login'
  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // ─── Resend countdown timer ───
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ─── Domain validation & OTP send ───
  const handleEmailSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      const trimmed = email.trim().toLowerCase();

      // Strict domain check — reject anything that doesn't end with the allowed domain
      if (!trimmed.endsWith(ALLOWED_DOMAIN) || !EMAIL_REGEX.test(trimmed)) {
        setError(`Only ${ALLOWED_DOMAIN} emails are allowed. Please use your institute email.`);
        return;
      }

      setLoading(true);
      const { error: otpError } = await signInWithOtp(trimmed);
      setLoading(false);

      if (otpError) {
        setError(otpError.message || "Failed to send OTP. Try again.");
        return;
      }

      setStep("otp");
      setResendTimer(60);
      // Focus first OTP input after transition
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    },
    [email, signInWithOtp]
  );

  // ─── OTP input handling ───
  const handleOtpChange = useCallback(
    (index, value) => {
      // Only allow single digit
      const digit = value.replace(/\D/g, "").slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      setError("");

      // Auto-advance to next input
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits filled
      if (digit && index === 5) {
        const fullOtp = newOtp.join("");
        if (fullOtp.length === 6) {
          handleOtpVerify(fullOtp);
        }
      }
    },
    [otp]
  );

  const handleOtpKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  // Handle paste
  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 0) return;

    const newOtp = Array(6).fill("");
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or last one
    const focusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[focusIndex]?.focus();

    // Auto-submit if all 6 digits pasted
    if (pastedData.length === 6) {
      handleOtpVerify(pastedData);
    }
  }, []);

  // ─── Verify OTP ───
  const handleOtpVerify = useCallback(
    async (token) => {
      setLoading(true);
      setError("");

      const { error: verifyError } = await verifyOtp(email.trim().toLowerCase(), token);
      setLoading(false);

      if (verifyError) {
        setError(verifyError.message || "Invalid OTP. Please try again.");
        setOtp(Array(6).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }

      navigate("/", { replace: true });
    },
    [email, verifyOtp, navigate]
  );

  // ─── Resend OTP ───
  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    const { error: otpError } = await signInWithOtp(email.trim().toLowerCase());
    setLoading(false);

    if (otpError) {
      setError(otpError.message || "Failed to resend OTP.");
      return;
    }
    setResendTimer(60);
    setOtp(Array(6).fill(""));
    otpRefs.current[0]?.focus();
  }, [resendTimer, email, signInWithOtp]);

  // ─── Toggle auth mode ───
  const toggleAuthMode = () => {
    setAuthMode((m) => (m === "signup" ? "login" : "signup"));
    setError("");
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
          {step === "email" ? (
            <motion.form
              key="email-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleEmailSubmit}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Institute Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
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

              <motion.button
                type="submit"
                disabled={loading || !email.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="gradient-border flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isSignup ? "Sign Up with OTP" : "Login with OTP"}{" "}
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
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="text-center">
                <p className="text-sm text-slate-400">
                  Enter the 6-digit code sent to
                </p>
                <p className="mt-1 text-sm font-semibold text-neon-cyan">{email}</p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="otp-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                  />
                ))}
              </div>

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

              {/* Verify button */}
              <motion.button
                onClick={() => handleOtpVerify(otp.join(""))}
                disabled={loading || otp.join("").length < 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="gradient-border flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Verify & Enter <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              {/* Resend & Back */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setOtp(Array(6).fill(""));
                  }}
                  className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                >
                  ← Change email
                </button>

                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="text-sm font-medium text-neon-cyan transition-colors disabled:text-slate-600"
                >
                  {resendTimer > 0 ? (
                    <span className="tabular-nums">Resend in {resendTimer}s</span>
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
