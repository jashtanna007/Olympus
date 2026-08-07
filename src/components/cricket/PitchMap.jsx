// Pitch map — SVG pitch that plots where deliveries landed, and (interactive
// mode) captures an x/y when the scorer taps.
// x 0–100 = across the pitch (0 = leg side, 100 = off side for a RH batter).
// y 0–100 = length from the batsman's stumps (0) to the bowler's end (100).

import { runColor } from "./WagonWheel";

export default function PitchMap({
  points = [],
  interactive = false,
  onPick,
  width = 150,
  height = 260,
  className = "",
}) {
  const padX = 22;
  const padY = 14;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const toPx = (x, y) => ({
    px: padX + (x / 100) * innerW,
    py: padY + (y / 100) * innerH,
  });

  const handleClick = (e) => {
    if (!interactive || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    const x = Math.min(100, Math.max(0, ((px - padX) / innerW) * 100));
    const y = Math.min(100, Math.max(0, ((py - padY) / innerH) * 100));
    onPick(Math.round(x), Math.round(y));
  };

  // Length zones (bowler's end at top): full, good, back-of-length, short.
  const zones = [
    { label: "Short", from: 0.0, to: 0.28, fill: "#152033" },
    { label: "Back", from: 0.28, to: 0.5, fill: "#111a2b" },
    { label: "Good", from: 0.5, to: 0.72, fill: "#16233a" },
    { label: "Full", from: 0.72, to: 0.9, fill: "#111a2b" },
    { label: "Yorker", from: 0.9, to: 1.0, fill: "#1b2942" },
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`${interactive ? "cursor-crosshair" : ""} ${className}`}
      onClick={handleClick}
    >
      {/* Pitch strip */}
      <rect x={padX} y={padY} width={innerW} height={innerH} rx="6" fill="#3f2f1c" stroke="#5b4526" strokeWidth="1.5" />
      {zones.map((z) => (
        <rect
          key={z.label}
          x={padX}
          y={padY + z.from * innerH}
          width={innerW}
          height={(z.to - z.from) * innerH}
          fill={z.fill}
          fillOpacity="0.55"
        />
      ))}
      {/* Creases */}
      <line x1={padX} y1={padY + innerH * 0.12} x2={padX + innerW} y2={padY + innerH * 0.12} stroke="#e5e7eb" strokeOpacity="0.5" strokeWidth="1" />
      <line x1={padX} y1={padY + innerH * 0.88} x2={padX + innerW} y2={padY + innerH * 0.88} stroke="#e5e7eb" strokeOpacity="0.5" strokeWidth="1" />
      {/* Stumps */}
      <line x1={width / 2} y1={padY + 2} x2={width / 2} y2={padY + 10} stroke="#e5e7eb" strokeWidth="2" />
      <line x1={width / 2} y1={padY + innerH - 10} x2={width / 2} y2={padY + innerH - 2} stroke="#e5e7eb" strokeWidth="2" />
      {/* Deliveries */}
      {points.map((pt) => {
        const { px, py } = toPx(pt.x, pt.y);
        return (
          <circle
            key={pt.id}
            cx={px}
            cy={py}
            r={pt.isWicket ? 5 : 3.4}
            fill={runColor(pt.runs, pt.isWicket)}
            stroke={pt.isWicket ? "#fff" : "none"}
            strokeWidth={pt.isWicket ? 1 : 0}
            fillOpacity="0.9"
          />
        );
      })}
    </svg>
  );
}
