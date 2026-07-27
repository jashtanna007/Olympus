import { motion } from "framer-motion";
import {
  Gavel,
  Minus,
  Plus,
  CheckCircle2,
  XCircle,
  SkipForward,
} from "lucide-react";
import FranchiseEmblem from "../common/FranchiseEmblem";

export default function BiddingPanel({
  currentBid = 200,
  bidIncrement = 50,
  highestBidder = null,
  highestBidderFranchise = null,
  nextBidAmount,
  onNextBidChange,
  onPlaceBid,
  onSold,
  onUnsold,
  onNextPlayer,
  isAdmin = false,
  auctionStatus = "live",
}) {
  if (!isAdmin) {
    // Viewer mode — just show current bid info
    return (
      <div className="rounded-2xl glass-strong p-4">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
          Live Auction
        </h3>

        <div className="space-y-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
              Current Highest Bidder
            </span>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/[0.04] p-3">
              {highestBidderFranchise ? (
                <>
                  <FranchiseEmblem
                    franchise={highestBidderFranchise}
                    size="sm"
                  />
                  <span className="text-sm font-semibold text-white">
                    {highestBidderFranchise.name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-olympus-subtle">
                  No bids yet
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
              Current Bid
            </span>
            <motion.p
              key={currentBid}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="mt-1 font-display text-2xl font-bold text-olympus-gold"
            >
              ₹{currentBid.toLocaleString("en-IN")}
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  // Admin (auctioneer) mode — full controls
  return (
    <div className="rounded-2xl glass-strong p-4">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-olympus-muted">
        Live Auction
      </h3>

      <div className="space-y-4">
        {/* Current highest bidder */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
            Current Highest Bidder
          </span>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/[0.04] p-3">
            {highestBidderFranchise ? (
              <>
                <FranchiseEmblem
                  franchise={highestBidderFranchise}
                  size="sm"
                />
                <span className="text-sm font-semibold text-white">
                  {highestBidderFranchise.name}
                </span>
              </>
            ) : (
              <span className="text-sm text-olympus-subtle">No bids yet</span>
            )}
          </div>
        </div>

        {/* Current bid display */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
            Current Bid
          </span>
          <motion.p
            key={currentBid}
            initial={{ scale: 1.15, color: "#F4C84A" }}
            animate={{ scale: 1, color: "#FFFFFF" }}
            className="mt-1 font-display text-2xl font-bold"
          >
            ₹{currentBid.toLocaleString("en-IN")}
          </motion.p>
        </div>

        {/* Place next bid (for use when auctioneer calls a franchise's bid) */}
        <button
          onClick={onPlaceBid}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-olympus-gold px-4 py-3 text-sm font-bold text-olympus-bg transition hover:brightness-110 active:scale-[0.98]"
        >
          <Gavel className="h-4 w-4" />
          Place Next Bid
        </button>

        {/* Bid amount adjuster */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-2">
          <button
            onClick={() =>
              onNextBidChange?.(
                Math.max((nextBidAmount || currentBid) - bidIncrement, currentBid)
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-display text-lg font-bold text-olympus-gold">
            ₹{(nextBidAmount || currentBid + bidIncrement).toLocaleString("en-IN")}
          </span>
          <button
            onClick={() =>
              onNextBidChange?.(
                (nextBidAmount || currentBid) + bidIncrement
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSold}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-olympus-success/20 px-3 py-2.5 text-xs font-bold text-olympus-success transition hover:bg-olympus-success/30"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            SOLD
          </button>
          <button
            onClick={onUnsold}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-olympus-danger/20 px-3 py-2.5 text-xs font-bold text-olympus-danger transition hover:bg-olympus-danger/30"
          >
            <XCircle className="h-3.5 w-3.5" />
            UNSOLD
          </button>
        </div>

        <button
          onClick={onNextPlayer}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Next Player
        </button>
      </div>
    </div>
  );
}
