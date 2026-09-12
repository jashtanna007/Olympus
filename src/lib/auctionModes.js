export const AUCTION_MODES = {
  all: {
    key: "all", label: "All", dbType: "franchise", femaleOnly: false,
    basePrice: 200, totalBudget: null, maxPlayers: null,
  },
  "female-football": {
    key: "female-football", label: "Female Football", dbType: "female_football", femaleOnly: true,
    basePrice: 50, totalBudget: 6000, maxPlayers: 11, sport: "Football",
  },
  "female-cricket": {
    key: "female-cricket", label: "Female Cricket", dbType: "female_cricket", femaleOnly: true,
    basePrice: 50, totalBudget: 6000, maxPlayers: 11, sport: "Cricket",
  },
};

export const FEMALE_AUCTION_FRANCHISE_SLUGS = [
  "ocean-giants",
  "shadow-fangs",
  "phoenix-clan",
  "fiery-falcons",
];

export function resolveAuctionMode(value) {
  return AUCTION_MODES[value] || AUCTION_MODES.all;
}
