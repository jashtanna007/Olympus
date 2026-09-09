// ─── Mock Data for Olympus ───
// UI-level dummy data for franchises, sports, leaderboard, and player stats.
// Auth is handled by real Supabase — this file provides display data only.

// ─── Lucide icon names for each franchise (gradient monograms are primary) ───
// These are fallback icon identifiers, not emojis.

// ─── Official franchises ───
// Pools, rosters, rankings, and sport points will be added after the auction.
export const franchises = [
  {
    id: 1,
    displayOrder: 1,
    name: "Ocean Giants",
    short: "OG",
    logo: "/franchise-logos/ocean-giants.webp",

    logoTransform: "scale(1.06)",
    iconName: "Waves",
    color: "#FFFFFF",
    secondaryColor: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    pool: null,
    overallRank: null,
    leader: {
      name: "Vikas Gurjar",
      role: "Franchise Leader",
      rollNumber: "202411042",
      email: "202411042@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 2,
    displayOrder: 2,
    name: "Deccan Knights",
    short: "DK",
    logo: "/franchise-logos/deccan-knights.webp",
    logoFit: "cover",
    logoTransform: "scale(1.08)",
    logoObjectPosition: "center center",
    iconName: "Shield",
    color: "#111111",
    secondaryColor: "#D4AF37",
    gradient: "from-zinc-900 to-amber-600",
    pool: null,
    overallRank: null,
    leader: {
      name: "AZMEERA ROHITH",
      role: "Franchise Leader",
      rollNumber: "202411014",
      email: "202411014@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 3,
    displayOrder: 3,
    name: "Spartan Vortex",
    short: "SV",
    logo: "/franchise-logos/spartan-vortex.webp",
    logoFit: "cover",
    logoTransform: "scale(1.24)",
    logoObjectPosition: "center 44%",
    iconName: "Orbit",
    color: "#0F2747",
    secondaryColor: "#C0C0C0",
    gradient: "from-slate-900 to-slate-500",
    pool: null,
    overallRank: null,
    leader: {
      name: "Kunal Roy",
      role: "Franchise Leader",
      rollNumber: "20252651031",
      email: "20252651031@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 4,
    displayOrder: 4,
    name: "Shadow Fangs",
    short: "SW",
    logo: "/franchise-logos/shadow-fangs.webp",

    logoTransform: "scale(1.03)",
    iconName: "Swords",
    color: "#6B7280",
    secondaryColor: "#DC2626",
    gradient: "from-gray-600 to-red-600",
    pool: null,
    overallRank: null,
    leader: {
      name: "Abhishek Beniwal",
      role: "Franchise Leader",
      rollNumber: "202411002",
      email: "202411002@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 5,
    displayOrder: 5,
    name: "Phoenix Clan",
    short: "PC",
    logo: "/franchise-logos/phoenix-clan.webp",
    iconName: "Flame",
    color: "#DC143C",
    secondaryColor: "#D4AF37",
    modalColor: "#B31232",
    modalSecondaryColor: "#A98A2B",
    gradient: "from-rose-700 to-amber-500",
    pool: null,
    overallRank: null,
    leader: {
      name: "JADHAV KARTHIK",
      role: "Franchise Leader",
      rollNumber: "202411045",
      email: "202411045@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 6,
    displayOrder: 6,
    name: "Desert Fighters",
    short: "DF",
    logo: "/franchise-logos/desert-fighters.webp",
    iconName: "Bird",
    color: "#EAB308",
    secondaryColor: "#92400E",
    modalColor: "#8F6A06",
    modalSecondaryColor: "#542709",
    gradient: "from-yellow-500 to-amber-800",
    pool: null,
    overallRank: null,
    leader: {
      name: "Khemraj Sharma",
      role: "Franchise Leader",
      rollNumber: "202492001",
      email: "202492001@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 7,
    displayOrder: 7,
    name: "Trident Titans",
    short: "TT",
    logo: "/franchise-logos/trident-titans.webp",

    logoFit: "cover",

    logoTransform: "scale(1.30)",

    logoObjectPosition: "center 46%",
    iconName: "Crown",
    color: "#B91C1C",
    secondaryColor: "#D4AF37",
    gradient: "from-red-700 to-amber-500",
    pool: null,
    overallRank: null,
    leader: {
      name: "Kishan N Prasad",
      role: "Franchise Leader",
      rollNumber: "202411054",
      email: "202411054@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
  {
    id: 8,
    displayOrder: 8,
    name: "Fiery Falcons",
    short: "FF",
    logo: "/franchise-logos/fiery-falcons.webp",

    logoFit: "cover",

    logoTransform: "translateX(-8%) scale(1.08)",

    logoObjectPosition: "center center",

    logoPadding: "0%",
    iconName: "Flame",
    color: "#F97316",
    secondaryColor: "#0A0A0A",
    modalColor: "#A9470D",
    modalSecondaryColor: "#070707",
    gradient: "from-orange-500 to-neutral-950",
    pool: null,
    overallRank: null,
    leader: {
      name: "Jash Tanna",
      role: "Franchise Leader",
      rollNumber: "202411046",
      email: "202411046@diu.iiitvadodara.ac.in",
      image: null,
    },
    roster: [],
    sportRanks: {},
    sportPoints: {},
  },
];

// ─── Sports (all 11) — Lucide icon names instead of emojis ───
export const sports = [
  { name: "Cricket", iconName: "Swords" },
  { name: "Football", iconName: "CircleDot" },
  { name: "Basketball", iconName: "Target" },
  { name: "Volleyball", iconName: "Globe" },
  { name: "Badminton", iconName: "Feather" },
  { name: "Table Tennis", iconName: "Disc" },
  { name: "Chess", iconName: "Crown" },
  { name: "Carrom", iconName: "Crosshair" },
  { name: "Relay", iconName: "Timer" },
];

// ─── Helper: Get teams by pool, sorted by rank for a given sport ───
export function getLeaderboardByPool(sportName) {
  const poolA = franchises
    .filter((f) => f.pool === "A")
    .map((f) => ({
      ...f,
      rank: f.sportRanks[sportName] ?? 99,
      points: f.sportPoints[sportName] ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank);

  const poolB = franchises
    .filter((f) => f.pool === "B")
    .map((f) => ({
      ...f,
      rank: f.sportRanks[sportName] ?? 99,
      points: f.sportPoints[sportName] ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank);

  return { poolA, poolB };
}

// ─── Helper: Get overall leaderboard aggregated across all sports ───
export function getOverallLeaderboard() {
  const allSportNames = sports.map((s) => s.name);

  const poolA = franchises
    .filter((f) => f.pool === "A")
    .map((f) => {
      const totalPoints = allSportNames.reduce(
        (sum, sport) => sum + (f.sportPoints[sport] ?? 0),
        0
      );
      return { ...f, points: totalPoints };
    })
    .sort((a, b) => b.points - a.points)
    .map((f, i) => ({ ...f, rank: i + 1 }));

  const poolB = franchises
    .filter((f) => f.pool === "B")
    .map((f) => {
      const totalPoints = allSportNames.reduce(
        (sum, sport) => sum + (f.sportPoints[sport] ?? 0),
        0
      );
      return { ...f, points: totalPoints };
    })
    .sort((a, b) => b.points - a.points)
    .map((f, i) => ({ ...f, rank: i + 1 }));

  return { poolA, poolB };
}

// ─── RBAC Roles ───
export const ROLES = {
  VIEWER: "viewer",
  ADMIN: "admin",
  SCORER: "scorer",
  AUCTIONEER: "auctioneer",
};

// ─── Role permission checks ───
export const ROLE_PERMISSIONS = {
  canCreateMatch: (role) => role === ROLES.ADMIN,
  canScoreMatch: (role) => role === ROLES.ADMIN || role === ROLES.SCORER,
  canManageAuction: (role) => role === ROLES.ADMIN || role === ROLES.AUCTIONEER,
  canViewDashboard: () => true,
  isAdmin: (role) => role === ROLES.ADMIN,
};
