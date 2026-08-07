  // ─── useCricketMatch ───
// Loads a single match (match row, franchises, players, innings, deliveries) and
// keeps it live via one Supabase Realtime channel with a debounced refetch —
// mirroring the proven pattern in Auction.jsx. Returns the fully derived match
// model from cricketDerive so both the viewer and console consume the same data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchMatch,
  fetchMatchPlayers,
  fetchInnings,
  fetchDeliveries,
  enrichFranchise,
} from "../lib/cricket";
import { deriveMatch } from "../lib/cricketDerive";

export function useCricketMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [franchises, setFranchises] = useState({});
  const [players, setPlayers] = useState([]);
  const [innings, setInnings] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshTimeout = useRef(null);

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!matchId) return;
      if (showLoading) setLoading(true);
      try {
        const matchRow = await fetchMatch(matchId);
        if (!matchRow) {
          setMatch(null);
          setError(new Error("Match not found"));
          return;
        }

        setMatch(matchRow);

        // Use allSettled so a missing table (e.g. cricket_innings not yet
        // migrated) never kills the entire load — match still renders.
        const [playerRowsResult, inningsRowsResult, franchiseRowsResult] =
          await Promise.allSettled([
            fetchMatchPlayers(matchId),
            fetchInnings(matchId),
            supabase.from("franchises").select("*"),
          ]);

        const playerRows =
          playerRowsResult.status === "fulfilled" ? playerRowsResult.value : [];
        const inningsRows =
          inningsRowsResult.status === "fulfilled" ? inningsRowsResult.value : [];
        const franchiseRows =
          franchiseRowsResult.status === "fulfilled"
            ? franchiseRowsResult.value?.data || []
            : [];

        const inningsIds = inningsRows.map((i) => i.id);
        let deliveryRows = [];
        if (inningsIds.length > 0) {
          try {
            deliveryRows = await fetchDeliveries(inningsIds);
          } catch (e) {
            console.warn("Deliveries fetch warning:", e);
          }
        }

        const fMap = {};
        for (const f of franchiseRows) {
          fMap[f.id] = enrichFranchise(f);
        }

        setPlayers(playerRows);
        setInnings(inningsRows);
        setDeliveries(deliveryRows);
        setFranchises(fMap);
        setError(null);
      } catch (err) {
        console.error("Cricket match load error:", err);
        setError(err);
      } finally {
        // Always clear the spinner — even on error — so the UI doesn't hang.
        setLoading(false);
      }
    },
    [matchId],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  // Realtime: debounced refetch on any relevant change.
  useEffect(() => {
    if (!matchId) return undefined;
    const refreshSoon = () => {
      clearTimeout(refreshTimeout.current);
      refreshTimeout.current = setTimeout(() => void refresh(), 120);
    };

    const channel = supabase
      .channel(`cricket-match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "cricket_innings", filter: `match_id=eq.${matchId}` }, refreshSoon)
      // deliveries can't be filtered by match_id (no such column); refetch on any delivery change.
      .on("postgres_changes", { event: "*", schema: "public", table: "cricket_deliveries" }, refreshSoon)
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [matchId, refresh]);

  const derived = useMemo(() => {
    if (!match) return null;
    return deriveMatch(match, innings, deliveries, players);
  }, [match, innings, deliveries, players]);

  return {
    loading,
    error,
    match,
    franchises,
    players,
    innings,
    deliveries,
    derived,
    refresh,
  };
}
