// ─── Mock Data for Olympus ───
// UI-level dummy data for franchises, sports, leaderboard, and player stats.
// Auth is handled by real Supabase — this file provides display data only.

// ─── Franchises (8 teams, split into Pool A & Pool B) ───
export const franchises = [
  // ── Pool A ──
  {
    id: 1,
    name: "Shadow Wolves",
    emoji: "🐺",
    color: "#6366f1",
    gradient: "from-indigo-600 to-purple-700",
    pool: "A",
    overallRank: 1,
    leader: {
      name: "Arjun Mehta",
      role: "Captain",
      avatar: "🧑‍💼",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Arjun&backgroundColor=b6e3f4",
    },
    roster: [
      { name: "Arjun Mehta", sport: "Cricket", role: "Captain" },
      { name: "Neha Sharma", sport: "Badminton", role: "Player" },
      { name: "Rohan Das", sport: "Football", role: "Player" },
      { name: "Priya Singh", sport: "Chess", role: "Player" },
      { name: "Vikram Rao", sport: "Basketball", role: "Player" },
      { name: "Simran Kaur", sport: "Table Tennis", role: "Player" },
    ],
    sportRanks: {
      Cricket: 1, Football: 3, Basketball: 2, Badminton: 1, Chess: 4,
      "Table Tennis": 2, Volleyball: 5, Carrom: 6, Kabaddi: 7, Relay: 4, "Arm Wrestling": 6,
    },
    sportPoints: {
      Cricket: 320, Football: 240, Basketball: 280, Badminton: 310, Chess: 200,
      "Table Tennis": 270, Volleyball: 150, Carrom: 130, Kabaddi: 110, Relay: 200, "Arm Wrestling": 120,
    },
  },
  {
    id: 2,
    name: "Blazing Phoenixes",
    emoji: "🔥",
    color: "#ef4444",
    gradient: "from-red-600 to-orange-600",
    pool: "A",
    overallRank: 2,
    leader: {
      name: "Kavya Joshi",
      role: "Captain",
      avatar: "👩‍💼",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Kavya&backgroundColor=ffd5dc",
    },
    roster: [
      { name: "Kavya Joshi", sport: "Volleyball", role: "Captain" },
      { name: "Amit Patel", sport: "Cricket", role: "Player" },
      { name: "Riya Gupta", sport: "Badminton", role: "Player" },
      { name: "Suresh Nair", sport: "Carrom", role: "Player" },
      { name: "Ananya Iyer", sport: "Kabaddi", role: "Player" },
      { name: "Deepak Kumar", sport: "Arm Wrestling", role: "Player" },
    ],
    sportRanks: {
      Cricket: 2, Football: 5, Basketball: 6, Badminton: 3, Chess: 5,
      "Table Tennis": 5, Volleyball: 1, Carrom: 1, Kabaddi: 2, Relay: 6, "Arm Wrestling": 1,
    },
    sportPoints: {
      Cricket: 290, Football: 160, Basketball: 140, Badminton: 250, Chess: 170,
      "Table Tennis": 160, Volleyball: 320, Carrom: 310, Kabaddi: 280, Relay: 130, "Arm Wrestling": 320,
    },
  },
  {
    id: 3,
    name: "Thunder Titans",
    emoji: "⚡",
    color: "#eab308",
    gradient: "from-yellow-500 to-amber-600",
    pool: "A",
    overallRank: 3,
    leader: {
      name: "Rahul Verma",
      role: "Captain",
      avatar: "🧔",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Rahul&backgroundColor=c0aede",
    },
    roster: [
      { name: "Rahul Verma", sport: "Football", role: "Captain" },
      { name: "Sneha Reddy", sport: "Table Tennis", role: "Player" },
      { name: "Karan Singh", sport: "Basketball", role: "Player" },
      { name: "Meera Nair", sport: "Chess", role: "Player" },
      { name: "Ajay Pillai", sport: "Relay", role: "Player" },
      { name: "Divya Menon", sport: "Volleyball", role: "Player" },
    ],
    sportRanks: {
      Cricket: 5, Football: 1, Basketball: 1, Badminton: 7, Chess: 2,
      "Table Tennis": 3, Volleyball: 4, Carrom: 5, Kabaddi: 6, Relay: 1, "Arm Wrestling": 5,
    },
    sportPoints: {
      Cricket: 180, Football: 340, Basketball: 330, Badminton: 120, Chess: 280,
      "Table Tennis": 250, Volleyball: 190, Carrom: 150, Kabaddi: 140, Relay: 330, "Arm Wrestling": 150,
    },
  },
  {
    id: 4,
    name: "Frost Dragons",
    emoji: "🐉",
    color: "#06b6d4",
    gradient: "from-cyan-500 to-teal-600",
    pool: "A",
    overallRank: 4,
    leader: {
      name: "Ishaan Malik",
      role: "Captain",
      avatar: "🧑‍🦱",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Ishaan&backgroundColor=d1f4d9",
    },
    roster: [
      { name: "Ishaan Malik", sport: "Chess", role: "Captain" },
      { name: "Pooja Bhat", sport: "Carrom", role: "Player" },
      { name: "Manoj Tiwari", sport: "Cricket", role: "Player" },
      { name: "Sakshi Jain", sport: "Badminton", role: "Player" },
      { name: "Nikhil Agarwal", sport: "Kabaddi", role: "Player" },
      { name: "Tanvi Desai", sport: "Football", role: "Player" },
    ],
    sportRanks: {
      Cricket: 4, Football: 6, Basketball: 5, Badminton: 2, Chess: 1,
      "Table Tennis": 6, Volleyball: 6, Carrom: 2, Kabaddi: 1, Relay: 5, "Arm Wrestling": 7,
    },
    sportPoints: {
      Cricket: 210, Football: 150, Basketball: 160, Badminton: 290, Chess: 340,
      "Table Tennis": 140, Volleyball: 140, Carrom: 290, Kabaddi: 320, Relay: 160, "Arm Wrestling": 110,
    },
  },

  // ── Pool B ──
  {
    id: 5,
    name: "Crimson Lions",
    emoji: "🦁",
    color: "#dc2626",
    gradient: "from-red-700 to-rose-600",
    pool: "B",
    overallRank: 5,
    leader: {
      name: "Aditya Saxena",
      role: "Captain",
      avatar: "🧑‍🎤",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Aditya&backgroundColor=ffdfbf",
    },
    roster: [
      { name: "Aditya Saxena", sport: "Basketball", role: "Captain" },
      { name: "Nisha Pandey", sport: "Volleyball", role: "Player" },
      { name: "Gaurav Mishra", sport: "Arm Wrestling", role: "Player" },
      { name: "Shruti Shah", sport: "Table Tennis", role: "Player" },
      { name: "Vivek Chauhan", sport: "Relay", role: "Player" },
      { name: "Kavitha Ramesh", sport: "Cricket", role: "Player" },
    ],
    sportRanks: {
      Cricket: 6, Football: 4, Basketball: 3, Badminton: 5, Chess: 6,
      "Table Tennis": 1, Volleyball: 2, Carrom: 7, Kabaddi: 5, Relay: 3, "Arm Wrestling": 2,
    },
    sportPoints: {
      Cricket: 160, Football: 220, Basketball: 300, Badminton: 180, Chess: 150,
      "Table Tennis": 330, Volleyball: 290, Carrom: 100, Kabaddi: 170, Relay: 270, "Arm Wrestling": 290,
    },
  },
  {
    id: 6,
    name: "Emerald Vipers",
    emoji: "🐍",
    color: "#22c55e",
    gradient: "from-green-600 to-emerald-700",
    pool: "B",
    overallRank: 6,
    leader: {
      name: "Sanya Kapoor",
      role: "Captain",
      avatar: "👩‍🔬",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Sanya&backgroundColor=b6e3f4",
    },
    roster: [
      { name: "Sanya Kapoor", sport: "Badminton", role: "Captain" },
      { name: "Tarun Bhatt", sport: "Football", role: "Player" },
      { name: "Pallavi Sinha", sport: "Carrom", role: "Player" },
      { name: "Raj Malhotra", sport: "Cricket", role: "Player" },
      { name: "Uma Devi", sport: "Chess", role: "Player" },
      { name: "Harsh Vardhan", sport: "Kabaddi", role: "Player" },
    ],
    sportRanks: {
      Cricket: 3, Football: 2, Basketball: 7, Badminton: 4, Chess: 3,
      "Table Tennis": 4, Volleyball: 7, Carrom: 3, Kabaddi: 3, Relay: 7, "Arm Wrestling": 4,
    },
    sportPoints: {
      Cricket: 250, Football: 300, Basketball: 110, Badminton: 210, Chess: 260,
      "Table Tennis": 200, Volleyball: 120, Carrom: 260, Kabaddi: 250, Relay: 100, "Arm Wrestling": 200,
    },
  },
  {
    id: 7,
    name: "Neon Raptors",
    emoji: "🦅",
    color: "#8b5cf6",
    gradient: "from-violet-600 to-fuchsia-600",
    pool: "B",
    overallRank: 7,
    leader: {
      name: "Dev Anand",
      role: "Captain",
      avatar: "🧑‍✈️",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Dev&backgroundColor=c0aede",
    },
    roster: [
      { name: "Dev Anand", sport: "Table Tennis", role: "Captain" },
      { name: "Lakshmi Rao", sport: "Volleyball", role: "Player" },
      { name: "Pranav Jha", sport: "Basketball", role: "Player" },
      { name: "Aarti Choudhary", sport: "Relay", role: "Player" },
      { name: "Mohit Saxena", sport: "Arm Wrestling", role: "Player" },
      { name: "Rhea Fernandes", sport: "Badminton", role: "Player" },
    ],
    sportRanks: {
      Cricket: 7, Football: 7, Basketball: 4, Badminton: 6, Chess: 7,
      "Table Tennis": 7, Volleyball: 3, Carrom: 4, Kabaddi: 4, Relay: 2, "Arm Wrestling": 3,
    },
    sportPoints: {
      Cricket: 140, Football: 130, Basketball: 220, Badminton: 160, Chess: 130,
      "Table Tennis": 130, Volleyball: 260, Carrom: 210, Kabaddi: 200, Relay: 300, "Arm Wrestling": 250,
    },
  },
  {
    id: 8,
    name: "Obsidian Hawks",
    emoji: "🦇",
    color: "#f97316",
    gradient: "from-orange-500 to-red-600",
    pool: "B",
    overallRank: 8,
    leader: {
      name: "Zara Khan",
      role: "Captain",
      avatar: "👩‍🚀",
      image: "https://api.dicebear.com/9.x/notionists/svg?seed=Zara&backgroundColor=ffd5dc",
    },
    roster: [
      { name: "Zara Khan", sport: "Kabaddi", role: "Captain" },
      { name: "Farhan Ali", sport: "Football", role: "Player" },
      { name: "Jaya Krishnan", sport: "Cricket", role: "Player" },
      { name: "Siddharth Pal", sport: "Carrom", role: "Player" },
      { name: "Nandini Hegde", sport: "Chess", role: "Player" },
      { name: "Rajesh Iyer", sport: "Volleyball", role: "Player" },
    ],
    sportRanks: {
      Cricket: 8, Football: 8, Basketball: 8, Badminton: 8, Chess: 8,
      "Table Tennis": 8, Volleyball: 8, Carrom: 8, Kabaddi: 8, Relay: 8, "Arm Wrestling": 8,
    },
    sportPoints: {
      Cricket: 100, Football: 100, Basketball: 90, Badminton: 100, Chess: 100,
      "Table Tennis": 100, Volleyball: 100, Carrom: 90, Kabaddi: 100, Relay: 80, "Arm Wrestling": 90,
    },
  },
];

// ─── Sports (all 11) ───
export const sports = [
  { name: "Cricket", emoji: "🏏", icon: "cricket" },
  { name: "Football", emoji: "⚽", icon: "football" },
  { name: "Basketball", emoji: "🏀", icon: "basketball" },
  { name: "Volleyball", emoji: "🏐", icon: "volleyball" },
  { name: "Badminton", emoji: "🏸", icon: "badminton" },
  { name: "Table Tennis", emoji: "🏓", icon: "table-tennis" },
  { name: "Chess", emoji: "♟️", icon: "chess" },
  { name: "Carrom", emoji: "🎯", icon: "carrom" },
  { name: "Kabaddi", emoji: "🤼", icon: "kabaddi" },
  { name: "Relay", emoji: "🏃", icon: "relay" },
  { name: "Arm Wrestling", emoji: "💪", icon: "arm-wrestling" },
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

// ─── Player Stats (for Drawer) ───
export const playerStats = {
  name: "Guest Player",
  email: "guest@diu.iiitvadodara.ac.in",
  team: "Shadow Wolves",
  matchesPlayed: 12,
  matchesWon: 8,
  matchesLost: 4,
  sports: ["Cricket", "Chess"],
  rank: 42,
};

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
  canViewDashboard: () => true, // all roles
  isAdmin: (role) => role === ROLES.ADMIN,
};
