/**
 * FranchiseEmblem — professional gradient monogram badge.
 * Replaces emoji icons with styled 2-letter abbreviations.
 *
 * @param {object} franchise — { short, color, name }
 * @param {"sm"|"md"|"lg"|"xl"} size
 * @param {boolean} active — shows glow ring
 * @param {string} className
 */
export default function FranchiseEmblem({
  franchise,
  size = "md",
  active = false,
  className = "",
}) {
  const dimensions = {
    sm: { box: "h-8 w-8", text: "text-[10px]", ring: 2 },
    md: { box: "h-12 w-12", text: "text-sm", ring: 3 },
    lg: { box: "h-16 w-16", text: "text-lg", ring: 3 },
    xl: { box: "h-24 w-24", text: "text-2xl", ring: 4 },
  };

  const { box, text, ring } = dimensions[size] || dimensions.md;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-2xl font-display font-bold ${box} ${text} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${franchise.color}CC, ${franchise.color}66)`,
        color: "#FFFFFF",
        boxShadow: active
          ? `0 0 0 ${ring}px ${franchise.color}40, 0 8px 24px -4px ${franchise.color}55`
          : `0 4px 16px -4px ${franchise.color}40`,
        letterSpacing: "0.06em",
      }}
    >
      {franchise.short}

      {/* Inner sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
