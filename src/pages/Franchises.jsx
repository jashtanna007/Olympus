import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Shield } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import FranchiseEmblem from "../components/common/FranchiseEmblem";
import FranchiseModal from "../components/home/FranchiseModal";
import { franchises as mockFranchises } from "../data/mockData";
import { supabase } from "../lib/supabase";

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getJoinedRegistration(row) {
  const raw = row?.registration || row?.player_registrations;
  return Array.isArray(raw) ? raw[0] || null : raw || null;
}

export default function Franchises() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [dbFranchises, setDbFranchises] = useState([]);
  const [members, setMembers] = useState([]);
  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFranchises = useCallback(async () => {
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
          .in("status", ["sold", "retained"])
          .order("sold_at", { ascending: true, nullsFirst: false }),
      ]);

      if (franchiseResult.error) throw franchiseResult.error;
      if (memberResult.error) throw memberResult.error;
      if (playerResult.error) throw playerResult.error;

      setDbFranchises(franchiseResult.data || []);
      setMembers(memberResult.data || []);
      setAuctionPlayers(playerResult.data || []);
    } catch (loadError) {
      console.error("Franchise roster load failed:", loadError);
      setError(loadError.message || "Unable to load franchise rosters.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFranchises();
  }, [loadFranchises]);

  useEffect(() => {
    let refreshTimeout;
    const refreshSoon = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => void loadFranchises(), 150);
    };

    const channel = supabase
      .channel("franchise-rosters-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "franchises" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "franchise_members" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_players" }, refreshSoon)
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [loadFranchises]);

  const franchises = useMemo(() => {
    const source = dbFranchises.length ? dbFranchises : mockFranchises;

    return source.map((franchise) => {
      const mock = mockFranchises.find(
        (item) => item.name === franchise.name || String(item.id) === String(franchise.id)
      );
      const leaderRow = members.find(
        (member) =>
          String(member.franchise_id) === String(franchise.id) && member.role === "leader"
      );
      const roster = auctionPlayers
        .filter(
          (player) =>
            String(player.sold_to_franchise_id) === String(franchise.id) &&
            ["sold", "retained"].includes(player.status)
        )
        .map((player) => ({
          id: player.id,
          name: getJoinedRegistration(player)?.full_name || "Registered player",
          rollNumber: getJoinedRegistration(player)?.roll_number || "—",
          photoUrl: getJoinedRegistration(player)?.photo_url || null,
          sports: getJoinedRegistration(player)?.sports || [],
          amount: player.sold_price,
          status: player.status,
        }));

      const leader = leaderRow
        ? {
            name: leaderRow.full_name,
            role: "Franchise Leader",
            rollNumber: leaderRow.roll_number,
            email: leaderRow.institute_email,
            image: null,
          }
        : mock?.leader;

      return {
        ...mock,
        ...franchise,
        logo: mock?.logo,
        color: mock?.color || "#F4C84A",
        secondaryColor: mock?.secondaryColor || "#2563EB",
        leader,
        roster,
        remainingBudget:
          Number(franchise.total_budget || 0) - Number(franchise.spent_amount || 0),
      };
    });
  }, [auctionPlayers, dbFranchises, members]);

  useEffect(() => {
    if (!selectedFranchise) return;
    const refreshed = franchises.find(
      (franchise) => String(franchise.id) === String(selectedFranchise.id)
    );
    if (refreshed) setSelectedFranchise(refreshed);
  }, [franchises, selectedFranchise?.id]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2">
          <Shield className="h-3.5 w-3.5 text-olympus-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-olympus-gold">
            Season 2026
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
          Franchises
        </h1>
        <p className="mt-2 max-w-2xl text-olympus-muted">
          Meet the eight official franchises, their leaders, live purse balances,
          and players purchased during the auction.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-olympus-gold" />
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.06 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {franchises.map((franchise, index) => (
            <motion.div
              key={franchise.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <GlassCard
                variant="strong"
                tilt
                hover
                onClick={() => setSelectedFranchise(franchise)}
                className="group relative overflow-hidden p-5"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                  style={{ backgroundColor: franchise.color }}
                />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <FranchiseEmblem franchise={franchise} size="lg" />
                    <span className="rounded-full glass px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-olympus-muted">
                      {franchise.short}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-white">
                    {franchise.name}
                  </h3>

                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-olympus-subtle">
                    Official franchise
                  </p>

                  <div className="mt-4 flex items-center gap-2.5 rounded-xl glass-dark px-3 py-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                      style={{
                        color: franchise.color,
                        backgroundColor: `${franchise.color}18`,
                      }}
                    >
                      {getInitials(franchise.leader?.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white/90">
                        {franchise.leader?.name || "Leader pending"}
                      </p>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-olympus-subtle">
                        Franchise leader
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-black/10 p-2.5 text-center">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-olympus-subtle">Players</p>
                      <p className="mt-1 text-sm font-extrabold text-white">{franchise.roster.length}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-olympus-subtle">Purse left</p>
                      <p className="mt-1 text-sm font-extrabold text-olympus-gold">
                        ₹ {Number(franchise.remainingBudget || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      <FranchiseModal
        franchise={selectedFranchise}
        isOpen={!!selectedFranchise}
        onClose={() => setSelectedFranchise(null)}
      />
    </div>
  );
}
