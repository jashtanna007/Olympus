import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  MapPin,
  BadgeCheck,
  Star,
} from "lucide-react";
import AuctionStatusBadge from "./AuctionStatusBadge";

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
        <Icon className="h-3.5 w-3.5 text-olympus-subtle" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function SkillStars({ level }) {
  const stars =
    level === "Advanced" ? 5 : level === "Intermediate" ? 3 : 1;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < stars
              ? "fill-olympus-gold text-olympus-gold"
              : "text-white/10"
          }`}
        />
      ))}
    </div>
  );
}

export default function PlayerCard({
  player,
  basePrice = 200,
  highestBid = null,
  highestBidder = null,
  status = "UP FOR AUCTION",
}) {
  if (!player) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl glass-strong p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.04]">
            <User className="h-10 w-10 text-olympus-subtle" />
          </div>
          <p className="font-display text-lg font-semibold text-olympus-muted">
            No player selected
          </p>
          <p className="mt-1 text-sm text-olympus-subtle">
            Waiting for the auctioneer to begin...
          </p>
        </div>
      </div>
    );
  }

  const primarySport = player.sports?.[0];
  const sportNames = (player.sports || []).map((s) => s.name).join(", ");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl glass-strong"
      >
        {/* Top section: Photo + Info */}
        <div className="flex flex-col gap-6 p-6 sm:flex-row">
          {/* Player photo */}
          <div className="relative">
            <AuctionStatusBadge status={status} />
            <div className="mt-3 h-48 w-40 overflow-hidden rounded-2xl border border-white/10 sm:h-56 sm:w-44">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
                  <User className="h-16 w-16 text-olympus-subtle" />
                </div>
              )}
            </div>
          </div>

          {/* Player details */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {player.full_name}
              </h2>
              <BadgeCheck className="h-5 w-5 text-olympus-blue" />
            </div>

            {primarySport && (
              <p className="mt-1 text-sm font-medium text-olympus-gold">
                {primarySport.position || primarySport.name}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
              <DetailItem
                icon={GraduationCap}
                label="Roll Number"
                value={player.roll_number}
              />
              <DetailItem
                icon={Calendar}
                label="Year"
                value={player.year}
              />
              <DetailItem
                icon={Mail}
                label="Email"
                value={player.email}
              />
              <DetailItem
                icon={MapPin}
                label="Position"
                value={primarySport?.position || "—"}
              />
              <DetailItem
                icon={Phone}
                label="Phone"
                value={player.phone}
              />
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Star className="h-3.5 w-3.5 text-olympus-subtle" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-olympus-subtle">
                    Skill Level
                  </p>
                  <div className="mt-1">
                    <SkillStars level={primarySport?.skill_level} />
                  </div>
                </div>
              </div>
              <DetailItem
                icon={GraduationCap}
                label="Branch"
                value={player.branch}
              />
              <DetailItem
                icon={User}
                label="Sports"
                value={sportNames}
              />
            </div>
          </div>
        </div>

        {/* Price strip */}
        <div className="grid grid-cols-2 gap-px border-t border-white/[0.06]">
          <div className="flex flex-col items-center justify-center p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
              Base Price
            </span>
            <span className="mt-1 font-display text-3xl font-bold text-white">
              <span className="mr-1 text-lg text-olympus-muted">₹</span>
              {basePrice.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-white/[0.06] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-olympus-subtle">
              Current Highest Bid
            </span>
            <motion.span
              key={highestBid}
              initial={{ scale: 1.2, color: "#F4C84A" }}
              animate={{ scale: 1, color: "#FFFFFF" }}
              className="mt-1 font-display text-3xl font-bold"
            >
              <span className="mr-1 text-lg text-olympus-muted">₹</span>
              {(highestBid || basePrice).toLocaleString("en-IN")}
            </motion.span>
            {highestBidder && (
              <span className="mt-1 text-[10px] font-semibold text-olympus-muted">
                By {highestBidder}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
