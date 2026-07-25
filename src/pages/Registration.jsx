import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crown,
  Crosshair,
  Disc,
  Dumbbell,
  Feather,
  Globe,
  Loader2,
  Swords,
  Target,
  Timer,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { prepareProfilePhoto } from "../utils/prepareProfilePhoto";
import GlassDropdown from "../components/ui/GlassDropdown";
import {
  BRANCHES,
  SKILL_LEVELS,
  SPORT_LIST,
  SPORT_POSITIONS,
  YEARS,
} from "../data/sportPositions";

/* ─── Icon map ─── */
const ICON_MAP = {
  Swords,
  CircleDot,
  Globe,
  Target,
  Disc,
  Feather,
  Crosshair,
  Crown,
  Timer,
  Dumbbell,
  Users,
};

/* ─── Step labels ─── */
const STEPS = ["Personal Details", "Choose Sports", "Review & Submit"];

/* ─── Slide variants ─── */
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

/* ════════════════════════════════════════════════════════════
   REGISTRATION PAGE
   ════════════════════════════════════════════════════════════ */
export default function Registration() {
  const { user, rollNumber } = useAuth();

  /* ─── Form state ─── */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || ""
  );
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");

  // { sportName: { selected, position, skillLevel } }
  const [sportSelections, setSportSelections] = useState({});

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const fileInputRef = useRef(null);

  const email = user?.email || "";

  /* ─── Load existing registration on mount ─── */
  useEffect(() => {
    if (!user?.id) {
      setLoadingExisting(false);
      return;
    }
    async function loadExisting() {
      try {
        const { data, error } = await supabase
          .from("player_registrations")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Could not load existing registration:", error.message);
          return;
        }

        if (data) {
          setIsEditing(true);
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
          setBranch(data.branch || "");
          setYear(data.year || "");
          setExistingPhotoUrl(data.photo_url || "");
          if (data.photo_url) setPhotoPreview(data.photo_url);

          // Rebuild sport selections from saved JSONB
          const sportsObj = {};
          (data.sports || []).forEach((s) => {
            sportsObj[s.name] = {
              selected: true,
              position: s.position || "",
              skillLevel: s.skill_level || "Beginner",
            };
          });
          setSportSelections(sportsObj);
        }
      } finally {
        setLoadingExisting(false);
      }
    }
    loadExisting();
  }, [user?.id]);

  /* ─── Helpers ─── */
  const selectedSports = useMemo(
    () =>
      Object.entries(sportSelections)
        .filter(([, v]) => v.selected)
        .map(([name, v]) => ({ name, ...v })),
    [sportSelections]
  );

  const toggleSport = useCallback((name) => {
    setSportSelections((prev) => {
      const current = prev[name];
      if (current?.selected) {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      }
      return {
        ...prev,
        [name]: { selected: true, position: "", skillLevel: "Beginner" },
      };
    });
  }, []);

  const updateSport = useCallback((name, field, value) => {
    setSportSelections((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  }, []);

  /* ─── Photo upload ─── */
  const handlePhotoChange = useCallback(
    async (e) => {
      const originalFile = e.target.files?.[0];
      if (!originalFile) return;

      setPhotoProcessing(true);
      setSubmitError("");

      try {
        const prepared = await prepareProfilePhoto(originalFile);

        setPhotoFile(prepared.file);

        const reader = new FileReader();
        reader.onload = (event) => setPhotoPreview(event.target.result);
        reader.readAsDataURL(prepared.file);
      } catch (error) {
        console.error("Photo processing failed:", error);
        setPhotoFile(null);
        setPhotoPreview(existingPhotoUrl || null);
        setSubmitError(error.message || "Could not process the photo.");
        e.target.value = "";
      } finally {
        setPhotoProcessing(false);
      }
    },
    [existingPhotoUrl]
  );

  /* ─── Validation ─── */
  // Every registration must have either a newly processed photo
  // or a previously uploaded photo.
  const hasPhoto =
    !photoProcessing &&
    (photoFile !== null || existingPhotoUrl.length > 0);

  const step1Valid =
    fullName.trim().length > 0 &&
    phone.trim().length >= 10 &&
    branch.length > 0 &&
    year.length > 0 &&
    hasPhoto;

  const step2Valid = selectedSports.length > 0;

  const canProceed = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  /* ─── Navigation ─── */
  const goNext = () => {
    if (!canProceed) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  /* ─── Submit (upsert = create OR update) ─── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      // 1. Keep one stable Storage object per user.
      // The URL version prevents the browser/CDN from showing an old photo.
      let photoUrl = existingPhotoUrl;

      if (photoFile) {
        const filePath = `player-photos/${user.id}/profile`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("olympus-assets")
          .upload(filePath, photoFile, {
            upsert: true,
            cacheControl: "0",
            contentType: photoFile.type,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        if (!uploadData?.path) {
          throw new Error("Photo upload completed without a storage path.");
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("olympus-assets")
          .getPublicUrl(uploadData.path);

        photoUrl = `${publicUrl}?v=${Date.now()}`;
      }

      if (!photoUrl) {
        throw new Error("A profile photo is required.");
      }

      // 2. Upsert registration — one row per user_id
      const { data: savedRegistration, error: upsertError } = await supabase
        .from("player_registrations")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName.trim(),
            email,
            roll_number: rollNumber || "",
            phone: phone.trim(),
            branch,
            year,
            photo_url: photoUrl,
            sports: selectedSports.map((s) => ({
              name: s.name,
              position: s.position || null,
              skill_level: s.skillLevel,
            })),
          },
          { onConflict: "user_id" }
        )
        .select("photo_url")
        .single();

      if (upsertError) throw upsertError;

      setExistingPhotoUrl(savedRegistration.photo_url);
      setPhotoPreview(savedRegistration.photo_url);
      setPhotoFile(null);
      setSubmitted(true);
    } catch (err) {
      console.error("Registration error:", err);
      setSubmitError(
        err?.message || "Something went wrong. Check the console for details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══════════════ SUCCESS STATE ═══════════════ */
  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 pb-28 pt-28">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-olympus-gold to-olympus-gold/40"
        >
          <Check className="h-12 w-12 text-olympus-bg" strokeWidth={3} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 font-display text-4xl font-bold text-white sm:text-5xl"
        >
          You're In!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center text-olympus-muted"
        >
          Registration complete. Franchise leaders will see your profile during
          the auction. Get ready to compete!
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {selectedSports.map((s) => (
            <span
              key={s.name}
              className="rounded-full glass px-4 py-2 text-xs font-semibold text-olympus-gold"
            >
              {s.name}
            </span>
          ))}
        </motion.div>
      </div>
    );
  }

  /* ─── Loading state while fetching existing record ─── */
  if (loadingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-olympus-gold" />
      </div>
    );
  }

  /* ═══════════════ FORM RENDER ═══════════════ */
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-28 sm:px-6">
      {/* Page header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
          {isEditing ? "Edit Registration" : "Player Registration"}
        </h1>
        <p className="mt-3 text-olympus-muted">
          {isEditing
            ? "Update your details below. Changes are saved immediately."
            : "Register for the sports fest auction. Fill your details & pick your sports."}
        </p>
        {isEditing && (
          <span className="mt-3 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-olympus-gold">
            <Check className="h-3.5 w-3.5" />
            Already registered — editing your entry
          </span>
        )}
      </motion.header>

      {/* Step indicator */}
      <div className="mx-auto mt-10 flex max-w-md items-center justify-between gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-px flex-1 transition-colors duration-300 ${
                      done ? "bg-olympus-gold" : "bg-white/10"
                    }`}
                  />
                )}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${
                    done
                      ? "bg-olympus-gold text-olympus-bg"
                      : active
                        ? "glass-strong text-olympus-gold ring-1 ring-olympus-gold/30"
                        : "glass text-olympus-subtle"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 transition-colors duration-300 ${
                      done ? "bg-olympus-gold" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  active ? "text-olympus-gold" : "text-olympus-subtle"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-200"
        >
          <X className="h-4 w-4 shrink-0" />
          {submitError}
        </motion.div>
      )}

      {/* Step content */}
      <div className="relative mt-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <Step1PersonalDetails
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                rollNumber={rollNumber}
                phone={phone}
                setPhone={setPhone}
                branch={branch}
                setBranch={setBranch}
                year={year}
                setYear={setYear}
                photoPreview={photoPreview}
                photoProcessing={photoProcessing}
                fileInputRef={fileInputRef}
                handlePhotoChange={handlePhotoChange}
              />
            )}
            {step === 1 && (
              <Step2Sports
                sportSelections={sportSelections}
                toggleSport={toggleSport}
                updateSport={updateSport}
              />
            )}
            {step === 2 && (
              <Step3Review
                fullName={fullName}
                email={email}
                rollNumber={rollNumber}
                phone={phone}
                branch={branch}
                year={year}
                photoPreview={photoPreview}
                selectedSports={selectedSports}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className={`flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition ${
              canProceed
                ? "bg-olympus-gold text-olympus-bg shadow-[0_4px_20px_-4px_rgba(244,200,74,0.5)] hover:brightness-110"
                : "cursor-not-allowed bg-white/5 text-white/30"
            }`}
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-olympus-gold px-6 py-3.5 text-sm font-semibold text-olympus-bg shadow-[0_4px_20px_-4px_rgba(244,200,74,0.5)] transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEditing ? "Save Changes" : "Submit Registration"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STEP 1 — Personal Details
   ════════════════════════════════════════════════════════════ */
function Step1PersonalDetails({
  fullName,
  setFullName,
  email,
  rollNumber,
  phone,
  setPhone,
  branch,
  setBranch,
  year,
  setYear,
  photoPreview,
  photoProcessing,
  fileInputRef,
  handlePhotoChange,
}) {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photoProcessing}
          className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl glass-strong transition hover:ring-2 hover:ring-olympus-gold/40 disabled:cursor-wait disabled:opacity-70"
        >
          {photoProcessing ? (
            <div className="flex flex-col items-center gap-2 text-olympus-gold">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">
                Optimizing
              </span>
            </div>
          ) : photoPreview ? (
            <img
              src={photoPreview}
              alt="Your photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-olympus-subtle">
              <Camera className="h-8 w-8" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Upload Photo
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Upload className="h-6 w-6 text-olympus-gold" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <span className="text-[10px] text-olympus-subtle">
          Original max 5 MB · automatically optimized to 700 KB
        </span>
      </div>

      {/* Full Name */}
      <InputField
        label="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your full name"
      />

      {/* Email (auto-filled, read-only) */}
      <InputField label="Institute Email" value={email} readOnly />

      {/* Roll Number (auto-filled, read-only) */}
      <InputField
        label="Roll Number"
        value={rollNumber || "—"}
        readOnly
      />

      {/* Phone */}
      <InputField
        label="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="10-digit mobile number"
        type="tel"
        maxLength={10}
      />

      {/* Branch */}
      <GlassDropdown
        label="Branch / Department"
        value={branch}
        onChange={setBranch}
        options={BRANCHES}
        placeholder="Select your branch"
      />

      {/* Year */}
      <GlassDropdown
        label="Year of Study"
        value={year}
        onChange={setYear}
        options={YEARS}
        placeholder="Select your year"
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STEP 2 — Choose Sports
   ════════════════════════════════════════════════════════════ */
function Step2Sports({ sportSelections, toggleSport, updateSport }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-center text-sm text-olympus-muted">
        Select the sports you play. Franchise leaders will see your selections
        during the auction.
      </p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {SPORT_LIST.map((sport) => {
          const sel = sportSelections[sport.name];
          const Icon = ICON_MAP[sport.icon] || CircleDot;
          const isSelected = !!sel?.selected;

          return (
            <button
              key={sport.name}
              type="button"
              onClick={() => toggleSport(sport.name)}
              className={`group flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 ${
                isSelected
                  ? "glass-strong ring-1 ring-olympus-gold/40 text-olympus-gold"
                  : "glass text-olympus-subtle hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                  isSelected
                    ? "bg-olympus-gold/15"
                    : "bg-white/5 group-hover:bg-white/8"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold">{sport.name}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-olympus-gold"
                >
                  <Check className="h-3 w-3 text-olympus-bg" strokeWidth={3} />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sport-specific details */}
      <AnimatePresence mode="popLayout">
        {Object.entries(sportSelections)
          .filter(([, v]) => v.selected)
          .map(([name, data]) => {
            const positions = SPORT_POSITIONS[name];
            return (
              // Outer: handles height animation — needs overflow-hidden for the collapse
              // Inner: visual card — no overflow so the dropdown can freely extend below it
              <motion.div
                key={name}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div className="rounded-2xl glass-strong p-5 mb-0 overflow-visible">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{name}</h3>
                    <button
                      type="button"
                      onClick={() => toggleSport(name)}
                      className="rounded-lg p-1 text-olympus-subtle transition hover:bg-white/5 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Position (only for team sports) */}
                    {positions && (
                      <GlassDropdown
                        label="Position / Role"
                        value={data.position}
                        onChange={(val) => updateSport(name, "position", val)}
                        options={positions}
                        placeholder="Select position"
                        compact
                        instanceId={name}
                      />
                    )}

                    {/* Skill Level */}
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
                        Skill Level
                      </label>
                      <div className="flex gap-2">
                        {SKILL_LEVELS.map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              updateSport(name, "skillLevel", level)
                            }
                            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                              data.skillLevel === level
                                ? "bg-olympus-gold/15 text-olympus-gold ring-1 ring-olympus-gold/30"
                                : "glass text-olympus-subtle hover:text-white"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STEP 3 — Review & Submit
   ════════════════════════════════════════════════════════════ */
function Step3Review({
  fullName,
  email,
  rollNumber,
  phone,
  branch,
  year,
  photoPreview,
  selectedSports,
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-center text-sm text-olympus-muted">
        Review your details before submitting.
      </p>

      {/* Player card preview */}
      <div className="overflow-hidden rounded-2xl glass-strong">
        <div className="relative h-32 bg-gradient-to-br from-olympus-gold/20 via-transparent to-olympus-blue/10">
          <div className="absolute -bottom-10 left-6 h-20 w-20 overflow-hidden rounded-2xl border-4 border-olympus-bg glass-strong">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/5">
                <User className="h-8 w-8 text-olympus-subtle" />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-14">
          <h2 className="font-display text-xl font-bold text-white">
            {fullName}
          </h2>
          <p className="mt-1 text-xs text-olympus-muted">{email}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <ReviewField label="Roll No." value={rollNumber || "—"} />
            <ReviewField label="Phone" value={phone} />
            <ReviewField label="Branch" value={branch} />
            <ReviewField label="Year" value={year} />
          </div>
        </div>
      </div>

      {/* Sports summary */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
          Selected Sports ({selectedSports.length})
        </h3>
        {selectedSports.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between rounded-xl glass p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olympus-gold/10">
                {(() => {
                  const sportDef = SPORT_LIST.find((sp) => sp.name === s.name);
                  const Icon = ICON_MAP[sportDef?.icon] || CircleDot;
                  return (
                    <Icon className="h-4 w-4 text-olympus-gold" />
                  );
                })()}
              </div>
              <div>
                <span className="text-sm font-semibold text-white">
                  {s.name}
                </span>
                {s.position && (
                  <span className="ml-2 text-xs text-olympus-muted">
                    · {s.position}
                  </span>
                )}
              </div>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-olympus-muted">
              {s.skillLevel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REUSABLE FIELD COMPONENTS
   ════════════════════════════════════════════════════════════ */
function InputField({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = "text",
  maxLength,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={maxLength}
        className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-olympus-gold/40 focus:ring-1 focus:ring-olympus-gold/20 ${
          readOnly ? "cursor-not-allowed opacity-50" : ""
        }`}
      />
    </div>
  );
}


function ReviewField({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-4 py-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
        {label}
      </span>
      <span className="mt-1 block text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}
