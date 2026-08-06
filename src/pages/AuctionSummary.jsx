import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  IndianRupee,
  ClipboardList,
  Crown,
  Download,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import { franchises as mockFranchises } from "../data/mockData";
import { supabase } from "../lib/supabase";
import { downloadAuctionWorkbook } from "../utils/downloadAuctionWorkbook";
import { useAuth } from "../contexts/AuthContext";

function getJoinedRegistration(row) {
  const raw = row?.registration || row?.player_registrations;
  return Array.isArray(raw) ? raw[0] || null : raw || null;
}

function formatMoney(amount) {
  if (amount == null) return "—";
  return `₹ ${Number(amount).toLocaleString("en-IN")}`;
}

export default function AuctionSummary() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [franchises, setFranchises] = useState([]);
  const [members, setMembers] = useState([]);
  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [franchiseResult, memberResult, playerResult] = await Promise.all([
        supabase.from("franchises").select("*").order("display_order"),
        supabase
          .from("franchise_members")
          .select("id, franchise_id, full_name, roll_number, institute_email, role, display_order, is_active")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("auction_players")
          .select(
            "id, status, sold_price, sold_at, sold_to_franchise_id, registration:player_registrations(id, full_name, roll_number, photo_url, sports)"
          )
          .in("status", ["sold", "retained", "unsold"])
          .order("sold_at", { ascending: true, nullsFirst: false }),
      ]);

      if (franchiseResult.error) throw franchiseResult.error;
      if (memberResult.error) throw memberResult.error;
      if (playerResult.error) throw playerResult.error;

      setFranchises(franchiseResult.data || []);
      setMembers(memberResult.data || []);
      setAuctionPlayers(playerResult.data || []);
    } catch (loadError) {
      console.error("Auction summary load failed:", loadError);
      setError(loadError.message || "Unable to load the auction summary.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    let refreshTimeout;
    const refreshSoon = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => void loadSummary({ silent: true }), 150);
    };

    const channel = supabase
      .channel("auction-summary-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "franchises" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "franchise_members" }, refreshSoon)
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [loadSummary]);

  const summary = useMemo(() => {
    return franchises.map((franchise) => {
      const mock = mockFranchises.find((item) => item.name === franchise.name);
      const leaderRow = members.find(
        (member) => String(member.franchise_id) === String(franchise.id) && member.role === "leader"
      );

      const roster = auctionPlayers
        .filter(
          (player) =>
            ["sold", "retained"].includes(player.status) &&
            String(player.sold_to_franchise_id) === String(franchise.id)
        )
        .map((player) => ({
          ...player,
          registration: getJoinedRegistration(player),
        }));

      const leader = leaderRow
        ? {
            name: leaderRow.full_name,
            rollNumber: leaderRow.roll_number,
            email: leaderRow.institute_email,
          }
        : mock?.leader || null;

      return {
        ...mock,
        ...franchise,
        logo: mock?.logo,
        color: mock?.color || "#F4C84A",
        secondaryColor: mock?.secondaryColor || "#2563EB",
        leader,
        roster,
        remainingBudget: Number(franchise.total_budget || 0) - Number(franchise.spent_amount || 0),
      };
    });
  }, [auctionPlayers, franchises, members]);

  const unsoldPlayers = useMemo(
    () =>
      auctionPlayers
        .filter((player) => player.status === "unsold")
        .map((player) => ({ ...player, registration: getJoinedRegistration(player) })),
    [auctionPlayers]
  );

  const totals = useMemo(() => {
    const soldPlayers = auctionPlayers.filter((player) => player.status === "sold");
    const retainedPlayers = auctionPlayers.filter((player) => player.status === "retained");
    return {
      sold: soldPlayers.length,
      retained: retainedPlayers.length,
      spent: summary.reduce((sum, franchise) => sum + Number(franchise.spent_amount || 0), 0),
      unsold: unsoldPlayers.length,
    };
  }, [auctionPlayers, summary, unsoldPlayers]);

  const downloadSummarySpreadsheet = useCallback(async () => {
    if (!isAdmin || downloading) return;

    setDownloading(true);
    setError("");

    try {
      await downloadAuctionWorkbook({
        summary,
        unsoldPlayers,
      });
    } catch (downloadError) {
      console.error(
        "Auction workbook download failed:",
        downloadError
      );

      setError(
        downloadError.message ||
          "Unable to prepare the auction spreadsheet."
      );
    } finally {
      setDownloading(false);
    }
  }, [
    downloading,
    isAdmin,
    summary,
    unsoldPlayers,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090F] pt-20 text-white">
        <RefreshCw className="h-7 w-7 animate-spin text-olympus-gold" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090F] px-4 pb-16 pt-24 text-white sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/auction")}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to auction
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border border-olympus-gold/25 bg-olympus-gold/10 px-4 py-2">
              <ClipboardList className="h-3.5 w-3.5 text-olympus-gold" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-olympus-gold">
                Live auction register
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Auction Summary</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/50">
              Franchise-wise leaders, purchased players, prices, purse usage, and unsold-player status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={downloadSummarySpreadsheet}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading
                  ? "Preparing workbook..."
                  : "Download auction summary"}
              </button>
            )}

            <button
              type="button"
              onClick={() => loadSummary()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-olympus-gold px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Players sold", value: totals.sold, icon: UserRound },
            { label: "Retained", value: totals.retained, icon: Crown },
            { label: "Unsold", value: totals.unsold, icon: Users },
            { label: "Total spent", value: formatMoney(totals.spent), icon: IndianRupee },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#0C1120]/95 p-4">
              <div className="flex items-center gap-2 text-white/35">
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0F1B]">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <h2 className="font-display text-lg font-bold">Franchise purchase register</h2>
            <p className="mt-1 text-xs text-white/35">
              All eight franchises are displayed in a four-column purchase register.
            </p>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.map((franchise, franchiseIndex) => (
                <motion.article
                  key={franchise.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: franchiseIndex * 0.04 }}
                  className="min-w-0 overflow-hidden rounded-xl border bg-[#0C1120]"
                  style={{ borderColor: `${franchise.color}45` }}
                >
                  <header
                    className="flex min-h-24 items-center gap-3 border-b border-white/[0.06] p-3"
                    style={{ background: `linear-gradient(135deg, ${franchise.color}18, transparent 65%)` }}
                  >
                    <FranchiseEmblem franchise={franchise} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-base font-bold">{franchise.name}</h3>
                      <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wide text-white/35">
                        <span>{franchise.roster.length} bought</span>
                        <span>{formatMoney(franchise.remainingBudget)} left</span>
                      </div>
                    </div>
                  </header>

                  <div className="grid grid-cols-[42px_1fr_82px] border-b border-white/[0.07] bg-white/[0.03] px-2 py-2 text-[9px] font-black uppercase tracking-wider text-white/40">
                    <span>Sr.</span>
                    <span>Member</span>
                    <span className="text-right">Amount</span>
                  </div>

                  <div className="min-h-[300px]">
                    {franchise.leader && (
                      <div className="grid grid-cols-[42px_1fr_82px] items-center border-b border-white/[0.05] px-2 py-2.5 text-xs">
                        <span className="text-white/35">1</span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{franchise.leader.name}</p>
                          <p className="mt-0.5 truncate text-[9px] text-amber-300/75">Leader · {franchise.leader.rollNumber}</p>
                        </div>
                        <span className="text-right font-bold text-white/35">—</span>
                      </div>
                    )}

                    {franchise.roster.map((player, playerIndex) => (
                      <div
                        key={player.id}
                        className="grid grid-cols-[42px_1fr_82px] items-center border-b border-white/[0.05] px-2 py-2.5 text-xs"
                      >
                        <span className="text-white/35">{playerIndex + 2}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {player.registration?.full_name || "Registered player"}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-white/35">
                            {player.registration?.roll_number || "—"}
                            {player.status === "retained" ? " · Retained" : ""}
                          </p>
                        </div>
                        <span className="text-right font-extrabold text-amber-400">
                          {formatMoney(player.sold_price)}
                        </span>
                      </div>
                    ))}

                    {franchise.roster.length === 0 && (
                      <div className="flex min-h-44 items-center justify-center px-5 text-center text-xs text-white/25">
                        No purchased players yet.
                      </div>
                    )}
                  </div>

                  <footer className="grid grid-cols-2 divide-x divide-white/[0.06] border-t border-white/[0.07] bg-black/15 text-center">
                    <div className="p-2.5">
                      <p className="text-[8px] font-black uppercase tracking-wider text-white/30">Spent</p>
                      <p className="mt-1 text-xs font-extrabold text-amber-400">{formatMoney(franchise.spent_amount)}</p>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[8px] font-black uppercase tracking-wider text-white/30">Purse left</p>
                      <p className="mt-1 text-xs font-extrabold text-emerald-400">{formatMoney(franchise.remainingBudget)}</p>
                    </div>
                  </footer>
                </motion.article>
              ))}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-white/[0.08] bg-[#0C1120]/95 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-rose-300" />
            <h2 className="font-display text-lg font-bold">Unsold players</h2>
          </div>
          {unsoldPlayers.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unsoldPlayers.map((player) => (
                <div key={player.id} className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3">
                  <p className="font-bold text-white">{player.registration?.full_name || "Registered player"}</p>
                  <p className="mt-1 text-xs text-white/40">Roll {player.registration?.roll_number || "—"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/30">No players have been marked unsold.</p>
          )}
        </section>
      </div>
    </main>
  );
}
