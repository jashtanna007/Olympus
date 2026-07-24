/**
 * FranchiseEmblem — official franchise logo displayed inside a
 * consistent colour-matched premium frame.
 */
export default function FranchiseEmblem({
  franchise,
  size = "md",
  active = false,
  className = "",
}) {
  const sizes = {
    sm: {
      box: "h-9 w-9",
      text: "text-[9px]",
      framePadding: "2px",
      imagePadding: "6%",
      star: "hidden",
    },
    md: {
      box: "h-12 w-12",
      text: "text-xs",
      framePadding: "3px",
      imagePadding: "7%",
      star: "hidden",
    },
    lg: {
      box: "h-20 w-20",
      text: "text-base",
      framePadding: "4px",
      imagePadding: "7%",
      star: "-top-3 h-7 w-7",
    },
    xl: {
      box: "h-28 w-28",
      text: "text-xl",
      framePadding: "5px",
      imagePadding: "8%",
      star: "-top-4 h-9 w-9",
    },
  };

  const selectedSize = sizes[size] || sizes.md;

  const primaryColor = franchise.color || "#64748B";
  const secondaryColor =
    franchise.secondaryColor || franchise.color || "#1E293B";

  const showGoldenStar =
    franchise.name === "Ocean Giants" &&
    (size === "lg" || size === "xl");

  const logoTransform =
    franchise.logoTransform || "translateX(0) scale(0.9)";

  return (
    <div
      className={`relative shrink-0 ${selectedSize.box} ${selectedSize.text} ${className}`}
    >
      {showGoldenStar && (
        <div
          className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 ${selectedSize.star}`}
          aria-label="Champion"
          title="Champion"
        >
          <span className="absolute inset-0 rounded-full bg-amber-300/70 blur-md animate-pulse" />

          <svg
            viewBox="0 0 24 24"
            className="relative h-full w-full drop-shadow-[0_0_9px_rgba(251,191,36,0.95)]"
            aria-hidden="true"
          >
            <path
              d="M12 1.9l2.8 5.67 6.26.91-4.53 4.42 1.07 6.23L12 16.18l-5.6 2.95 1.07-6.23-4.53-4.42 6.26-.91L12 1.9z"
              fill="#FACC15"
              stroke="#FFF7C2"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <path
              d="M12 4.4l1.7 3.45 3.8.55-2.75 2.68.65 3.78L12 13.07l-3.4 1.79.65-3.78L6.5 8.4l3.8-.55L12 4.4z"
              fill="#FDE68A"
              opacity="0.8"
            />
          </svg>
        </div>
      )}

      <div
        className="pointer-events-none absolute -inset-[18%] rounded-[34%] opacity-60 blur-[18px]"
        style={{
          background: `radial-gradient(
            circle,
            ${primaryColor}A8 0%,
            ${secondaryColor}60 43%,
            transparent 72%
          )`,
        }}
      />

      <div
        className="relative h-full w-full rounded-[30%] border border-white/20"
        style={{
          padding: selectedSize.framePadding,
          background: `
            linear-gradient(
              145deg,
              ${primaryColor}E6 0%,
              ${secondaryColor}B8 48%,
              #101521 100%
            )
          `,
          boxShadow: active
            ? `
              0 0 0 2px ${primaryColor}4D,
              0 18px 38px -13px ${primaryColor}D0,
              inset 0 1px 1px rgba(255,255,255,0.4),
              inset 0 -3px 8px rgba(0,0,0,0.45)
            `
            : `
              0 13px 30px -16px ${primaryColor}B0,
              inset 0 1px 1px rgba(255,255,255,0.34),
              inset 0 -3px 8px rgba(0,0,0,0.42)
            `,
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[27%] border border-white/10 bg-[#080D17]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  circle at 20% 12%,
                  ${primaryColor}65 0%,
                  transparent 48%
                ),
                radial-gradient(
                  circle at 86% 88%,
                  ${secondaryColor}70 0%,
                  transparent 54%
                ),
                linear-gradient(
                  145deg,
                  rgba(255,255,255,0.09),
                  rgba(255,255,255,0.01) 45%,
                  rgba(0,0,0,0.22)
                )
              `,
            }}
          />

          <div
            className="relative h-full w-full"
            style={{
              padding: franchise.logoPadding || selectedSize.imagePadding,
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden border border-white/15 bg-black/20"
              style={{
                borderRadius: "22%",
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.16),
                  inset 0 -5px 15px rgba(0,0,0,0.25)
                `,
              }}
            >
              {franchise.logo ? (
                <img
                  src={franchise.logo}
                  alt={`${franchise.name} logo`}
                  className="h-full w-full select-none"
                  style={{
                    objectFit: franchise.logoFit || "contain",
                    objectPosition:
                      franchise.logoObjectPosition || "center center",
                    transform: logoTransform,
                    transformOrigin: "center center",
                  }}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-display font-bold text-white"
                  style={{
                    borderRadius: "20%",
                    background: `
                      linear-gradient(
                        135deg,
                        ${primaryColor},
                        ${secondaryColor}
                      )
                    `,
                    letterSpacing: "0.08em",
                  }}
                >
                  {franchise.short}
                </span>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-[15%] top-[7%] h-[2px] rounded-full bg-white/35 blur-[1px]" />

          <div className="pointer-events-none absolute -left-[28%] top-[-16%] h-[45%] w-[90%] -rotate-[28deg] bg-gradient-to-r from-transparent via-white/15 to-transparent blur-sm" />
        </div>
      </div>
    </div>
  );
}
