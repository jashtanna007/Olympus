/**
 * Sport-specific positions/roles for the registration form.
 * Sports without meaningful positions (Chess, Carrom, Relay, TT, Badminton) use null.
 */
export const SPORT_POSITIONS = {
  Cricket: ["Batsman", "Bowler", "All-Rounder", "Wicketkeeper"],
  Football: ["Forward", "Midfielder", "Defender", "Goalkeeper"],
  Volleyball: ["Setter", "Hitter", "Libero", "Blocker"],
  Basketball: [
    "Point Guard",
    "Shooting Guard",
    "Small Forward",
    "Power Forward",
    "Center",
  ],
  "Table Tennis": null,
  Badminton: null,
  Carrom: null,
  Chess: null,
  Relay: null,
};

export const SPORT_LIST = [
  { name: "Cricket", icon: "Swords" },
  { name: "Football", icon: "CircleDot" },
  { name: "Volleyball", icon: "Globe" },
  { name: "Basketball", icon: "Target" },
  { name: "Table Tennis", icon: "Disc" },
  { name: "Badminton", icon: "Feather" },
  { name: "Carrom", icon: "Crosshair" },
  { name: "Chess", icon: "Crown" },
  { name: "Relay", icon: "Timer" },
];

export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const BRANCHES = [
  "Computer Science and Engineering (CSE)",
  "Electronics and Communication Engineering (ECE)",
  "Artificial Intelligence (AI)",
  "Master of Computer Applications (MCA)",
  "Master of Technology (M.Tech)",
];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
