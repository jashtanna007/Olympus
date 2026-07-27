import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  User,
  Search,
  Check,
  X,
  Lock,
  Unlock,
  ChevronDown,
  Users,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { franchises as mockFranchises } from "../data/mockData";
import FranchiseEmblem from "../components/common/FranchiseEmblem";

/* ─── Retention cost (fixed per retained player) ─── */
const RETENTION_COST = 500;

/* ════════════════════════════════════════════════════════════
   RETENTION PAGE
   Franchise leaders (or admin) pick players to retain before
   the live auction. Each retained player costs a flat fee
   deducted from the franchise's budget.
   ════════════════════════════════════════════════════════════ */
export default function Retention() {
  const { canManageAuction, isAdmin } = useAuth();

  const [franchiseList, setFranchiseList] = useState(mockFranchises);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [retainedMap, setRetainedMap] = useState({}); // { franchise_id: [registration_id, ...] }
  const [auctionConfig, setAuctionConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("Male");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedFranchise = useMemo(
    () => franchiseList.find((f) => f.id === selectedFranchiseId),
    [franchiseList, selectedFranchiseId]
  );

  const retainedForSelected = useMemo(
    () => retainedMap[selectedFranchiseId] || [],
    [retainedMap, selectedFranchiseId]
  );

  const budgetUsed = retainedForSelected.length * RETENTION_COST;
  const totalBudget = auctionConfig?.total_budget || 10000;
  const remainingBudget = totalBudget - budgetUsed;

  /* ─── Filtered players ─── */
  const filteredPlayers = useMemo(() => {
    let list = players.filter((p) => p.gender === genderFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.roll_number?.toLowerCase().includes(q) ||
          p.branch?.toLowerCase().includes(q) ||
          (p.sports || []).some((s) => s.name?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [players, genderFilter, searchQuery]);

  /* ─── Load data ─── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Auction config
        const { data: config } = await supabase
          .from("auction_config")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (config) setAuctionConfig(config);

        // Franchises
        const { data: dbFranchises } = await supabase
          .from("franchises")
          .select("*")
          .order("display_order");
        if (dbFranchises?.length) {
          setFranchiseList(dbFranchises);
          if (!selectedFranchiseId) setSelectedFranchiseId(dbFranchises[0].id);
        } else if (mockFranchises.length) {
          setSelectedFranchiseId(mockFranchises[0].id);
        }

        // All registered players
        const { data: allPlayers } = await supabase
          .from("player_registrations")
          .select("*")
          .order("full_name");
        if (allPlayers) setPlayers(allPlayers);

        // Already retained players (from auction_players table)
        const { data: retained } = await supabase
          .from("auction_players")
          .select("registration_id, sold_to_franchise_id")
          .eq("status", "retained");

        if (retained?.length) {
          const map = {};
          for (const r of retained) {
            const fId = r.sold_to_franchise_id;
            if (!fId) continue;
            if (!map[fId]) map[fId] = [];
            map[fId].push(r.registration_id);
          }
          setRetainedMap(map);
        }
      } catch (err) {
        console.error("Failed to load retention data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ─── Toggle retain ─── */
  const toggleRetain = useCallback(
    (registrationId) => {
      if (!selectedFranchiseId) return;

      setRetainedMap((prev) => {
        const current = prev[selectedFranchiseId] || [];
        const isRetained = current.includes(registrationId);

        // Check if already retained by another franchise
        if (!isRetained) {
          for (const [fId, ids] of Object.entries(prev)) {
            if (fId !== selectedFranchiseId && ids.includes(registrationId)) {
              alert("This player is already retained by another franchise.");
              return prev;
            }
          }
        }

        return {
          ...prev,
          [selectedFranchiseId]: isRetained
            ? current.filter((id) => id !== registrationId)
            : [...current, registrationId],
        };
      });
    },
    [selectedFranchiseId]
  );

  /* ─── Check if player is retained by any franchise ─── */
  const getRetainedBy = useCallback(
    (registrationId) => {
      for (const [fId, ids] of Object.entries(retainedMap)) {
        if (ids.includes(registrationId)) {
          return franchiseList.find((f) => String(f.id) === String(fId)) || null;
        }
      }
      return null;
    },
    [retainedMap, franchiseList]
  );

  /* ─── Save retentions to DB ─── */
  const saveRetentions = useCallback(async () => {
    if (!canManageAuction) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const retentions = Object.entries(retainedMap).map(
        ([franchise_id, registration_ids]) => ({ franchise_id, registration_ids })
      );
      const { error } = await supabase.rpc("auction_save_retentions", {
        p_retentions: retentions,
      });
      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save retentions:", err);
      alert("Failed to save. Check console for details.");
    } finally {
      setSaving(false);
    }
  }, [canManageAuction, retainedMap, franchiseList, auctionConfig]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Shield className="h-12 w-12 text-olympus-gold animate-pulse" />
          <p className="font-display text-lg font-semibold text-olympus-muted">
            Loading retention data...
          </p>
        </motion.div>
      </div>
    );
  }

  /* ─── Access check ─── */
  if (!canManageAuction) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-olympus-subtle" />
          <h2 className="font-display text-xl font-bold text-white">
            Access Restricted
          </h2>
          <p className="mt-2 text-sm text-olympus-muted">
            Only administrators and auctioneers can manage player retention.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-24 sm:px-6 sm:pt-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-olympus-purple/20 to-olympus-purple/5">
              <Shield className="h-6 w-6 text-olympus-purple" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">
                Player Retention
              </h1>
              <p className="text-sm text-olympus-muted">
                Select players for each franchise to retain before the auction
              </p>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={saveRetentions}
            disabled={saving}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition ${
              saveSuccess
                ? "bg-olympus-success/20 text-olympus-success"
                : "bg-olympus-gold text-olympus-bg hover:brightness-110"
            } disabled:cursor-wait disabled:opacity-60`}
          >
            {saving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="h-4 w-4 rounded-full border-2 border-olympus-bg/30 border-t-olympus-bg"
                />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Retentions
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left — Franchise selector + budget */}
        <div className="space-y-4">
          {/* Franchise list */}
          <div className="rounded-2xl glass-strong p-4">
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
              Select Franchise
            </h3>
            <div className="space-y-2">
              {franchiseList.map((f) => {
                const retained = (retainedMap[f.id] || []).length;
                const isSelected = f.id === selectedFranchiseId;

                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFranchiseId(f.id)}
                    className={`group relative flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      isSelected
                        ? "glass-strong ring-1 ring-olympus-purple/40"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="retention-indicator"
                        className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-olympus-purple"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 28,
                        }}
                      />
                    )}
                    <FranchiseEmblem franchise={f} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {f.name}
                      </p>
                      <span className="text-[10px] text-olympus-subtle">
                        {retained} retained
                      </span>
                    </div>
                    {retained > 0 && (
                      <span className="rounded-full bg-olympus-purple/20 px-2 py-0.5 text-[10px] font-bold text-olympus-purple">
                        {retained}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget summary */}
          {selectedFranchise && (
            <motion.div
              key={selectedFranchiseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl glass-strong p-4"
            >
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
                Budget Summary
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-olympus-subtle">
                    Total Budget
                  </span>
                  <span className="font-display text-sm font-bold text-white">
                    ₹{totalBudget.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-olympus-subtle">
                    Retention Cost
                  </span>
                  <span className="font-display text-sm font-bold text-olympus-danger">
                    -₹{budgetUsed.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="h-px bg-white/10" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    For Auction
                  </span>
                  <span
                    className={`font-display text-lg font-bold ${
                      remainingBudget < 0
                        ? "text-olympus-danger"
                        : "text-olympus-gold"
                    }`}
                  >
                    ₹{remainingBudget.toLocaleString("en-IN")}
                  </span>
                </div>

                {remainingBudget < 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-olympus-danger/10 px-3 py-2 text-[10px] font-semibold text-olympus-danger">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Budget exceeded!
                  </div>
                )}

                {/* Retention cost info */}
                <p className="text-[10px] text-olympus-subtle">
                  Each retained player costs ₹{RETENTION_COST.toLocaleString("en-IN")}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right — Player list */}
        <div className="rounded-2xl glass-strong p-4">
          {/* Search + filter bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-olympus-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, roll number, sport..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-olympus-gold/40"
              />
            </div>

            <div className="flex rounded-xl glass overflow-hidden">
              {["Male", "Female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-4 py-2 text-xs font-bold transition ${
                    genderFilter === g
                      ? "bg-olympus-purple/20 text-olympus-purple"
                      : "text-olympus-subtle hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Player count */}
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-olympus-subtle" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
              {filteredPlayers.length} players available ·{" "}
              {retainedForSelected.length} retained
            </span>
          </div>

          {/* Player grid */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map((player) => {
                const isRetainedBySelected = retainedForSelected.includes(
                  player.id
                );
                const retainedByOther = getRetainedBy(player.id);
                const isRetainedByAnother =
                  retainedByOther &&
                  String(retainedByOther.id) !== String(selectedFranchiseId);

                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative rounded-xl border p-3 transition-all ${
                      isRetainedBySelected
                        ? "border-olympus-purple/40 bg-olympus-purple/5"
                        : isRetainedByAnother
                          ? "border-white/5 bg-white/[0.01] opacity-50"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Photo */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5">
                            <User className="h-5 w-5 text-olympus-subtle" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {player.full_name}
                        </p>
                        <p className="text-[10px] text-olympus-muted">
                          {player.roll_number} · {player.branch}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(player.sports || []).slice(0, 2).map((s) => (
                            <span
                              key={s.name}
                              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-olympus-muted"
                            >
                              {s.name}
                            </span>
                          ))}
                          {(player.sports || []).length > 2 && (
                            <span className="text-[9px] text-olympus-subtle">
                              +{player.sports.length - 2}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Retain toggle */}
                      <button
                        onClick={() => toggleRetain(player.id)}
                        disabled={isRetainedByAnother}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                          isRetainedBySelected
                            ? "bg-olympus-purple text-white"
                            : isRetainedByAnother
                              ? "cursor-not-allowed bg-white/5 text-white/20"
                              : "bg-white/[0.06] text-white/40 hover:bg-olympus-purple/20 hover:text-olympus-purple"
                        }`}
                      >
                        {isRetainedBySelected ? (
                          <Check className="h-4 w-4" />
                        ) : isRetainedByAnother ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Retained by label */}
                    {isRetainedByAnother && retainedByOther && (
                      <p className="mt-2 text-[9px] font-semibold text-olympus-subtle">
                        Retained by {retainedByOther.name || retainedByOther.short}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-olympus-subtle" />
              <p className="text-sm text-olympus-muted">
                No players found matching your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
