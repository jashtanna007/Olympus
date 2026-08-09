// Entry dispatcher for /scorer/:matchId — loads the match row and routes to
// the cricket console or the team-sport console based on match.sport.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { fetchMatch } from "../lib/cricket";
import ScorerConsole from "./ScorerConsole";
import ScorerTeamSport from "./ScorerTeamSport";

const CRICKET = "Cricket";

export default function ScorerEntry() {
  const { matchId } = useParams();
  const [sport, setSport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await fetchMatch(matchId);
        if (active) setSport(m?.sport || CRICKET);
      } catch {
        if (active) setSport(CRICKET);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090F]">
        <Loader2 className="h-7 w-7 animate-spin text-olympus-gold" />
      </div>
    );
  }

  return sport === CRICKET ? <ScorerConsole /> : <ScorerTeamSport />;
}
