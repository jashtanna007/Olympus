// ─── useTeamSportMatch ───
// Loads a single non-cricket match (match row, franchises, sport events) and
// keeps it live via one Supabase Realtime channel with a debounced refetch —
// same pattern as useCricketMatch. Returns the derived scoreboard model from
// lib/teamSports so scorer console and live view consume the same data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchMatch, enrichFranchise } from "../lib/cricket";
import { fetchSportEvents, tablesForSport, deriveSport } from "../lib/teamSports";

export function useTeamSportMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [franchises, setFranchises] = useState({});
  const [events, setEvents] = useState([]);
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

        const [eventsResult, franchiseRowsResult] = await Promise.allSettled([
          fetchSportEvents(matchId, matchRow.sport),
          supabase.from("franchises").select("*"),
        ]);

        const fMap = {};
        if (franchiseRowsResult.status === "fulfilled") {
          for (const f of franchiseRowsResult.value?.data || []) {
            fMap[f.id] = enrichFranchise(f);
          }
        }

        setEvents(eventsResult.status === "fulfilled" ? eventsResult.value : []);
        setFranchises(fMap);
        setError(null);
      } catch (err) {
        console.error("Team-sport match load error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [matchId],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  // Realtime: debounced refetch on match row or sport-event changes.
  const sport = match?.sport;
  useEffect(() => {
    if (!matchId || !sport) return undefined;
    const tables = tablesForSport(sport);
    const refreshSoon = () => {
      clearTimeout(refreshTimeout.current);
      refreshTimeout.current = setTimeout(() => void refresh(), 120);
    };

    let channel = supabase
      .channel(`team-sport-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refreshSoon);
    for (const table of tables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshSoon);
    }
    channel.subscribe();

    return () => {
      clearTimeout(refreshTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [matchId, sport, refresh]);

  const derived = useMemo(() => deriveSport(match, events), [match, events]);

  return { loading, error, match, franchises, events, derived, refresh };
}
