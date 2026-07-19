import {
  Bird,
  Crown,
  Flame,
  Leaf,
  Shield,
  Snowflake,
  Star,
  Zap,
} from "lucide-react";

const iconByFranchiseId = {
  1: Shield,
  2: Flame,
  3: Zap,
  4: Snowflake,
  5: Crown,
  6: Leaf,
  7: Star,
  8: Bird,
};

const sizeClasses = {
  sm: "h-10 w-10 rounded-xl",
  md: "h-14 w-14 rounded-2xl",
  lg: "h-20 w-20 rounded-[22px]",
  xl: "h-24 w-24 rounded-[26px]",
};

const iconSizes = {
  sm: 20,
  md: 29,
  lg: 42,
  xl: 52,
};

export default function FranchiseEmblem({
  franchise,
  size = "md",
  active = false,
  className = "",
}) {
  if (!franchise) return null;

  const Icon = iconByFranchiseId[franchise.id] || Shield;
  const initials = franchise.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border ${sizeClasses[size]} ${className}`}
      style={{
        color: franchise.color,
        borderColor: `${franchise.color}${active ? "aa" : "55"}`,
        background: `radial-gradient(circle at 50% 35%, ${franchise.color}42, rgba(2,7,18,0.97) 72%)`,
        boxShadow: active
          ? `0 0 0 1px ${franchise.color}30, 0 0 28px ${franchise.color}75, inset 0 0 24px ${franchise.color}22`
          : `0 12px 28px rgba(0,0,0,0.32), inset 0 0 20px ${franchise.color}18`,
      }}
    >
      <span
        className="absolute inset-1 rounded-[inherit] border opacity-50"
        style={{ borderColor: `${franchise.color}35` }}
      />

      <span
        className="absolute -bottom-6 h-12 w-20 rounded-full blur-xl"
        style={{ backgroundColor: `${franchise.color}55` }}
      />

      <Icon
        size={iconSizes[size]}
        strokeWidth={1.8}
        className="relative z-10"
        style={{
          filter: active
            ? `drop-shadow(0 0 8px ${franchise.color})`
            : undefined,
        }}
      />

      <span className="absolute bottom-1 right-1 z-10 text-[6px] font-black tracking-tighter text-white/45">
        {initials}
      </span>
    </span>
  );
}
