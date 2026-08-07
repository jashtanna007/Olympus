// Wagon wheel — SVG ground that plots shot directions, and (interactive mode)
// captures an angle/distance when the scorer taps.
// Angle convention: 0° points straight down the ground (up on screen),
// increasing clockwise. Distance 0–100 scales from the batsman to the rope.

function polarToXY(cx, cy, maxR, angle, distance) {
  const r = (Math.min(100, Math.max(0, distance)) / 100) * maxR;
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function runColor(runs, isWicket) {
  if (isWicket) return "#F43F5E";
  if (runs === 6) return "#34D399";
  if (runs === 4) return "#F4C84A";
  if (runs >= 2) return "#60A5FA";
  if (runs === 1) return "#A4A9B6";
  return "#4B5563";
}

export default function WagonWheel({
  points = [],
  interactive = false,
  onPick,
  size = 260,
  className = "",
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 8;

  const handleClick = (e) => {
    if (!interactive || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size;
    const py = ((e.clientY - rect.top) / rect.height) * size;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.min(100, (Math.hypot(dx, dy) / maxR) * 100);
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    onPick(Math.round(angle), Math.round(dist));
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`${interactive ? "cursor-crosshair" : ""} ${className}`}
      onClick={handleClick}
    >
      {/* Outfield */}
      <circle cx={cx} cy={cy} r={maxR} fill="#0C1120" stroke="#1f2937" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={maxR * 0.62} fill="none" stroke="#1f2937" strokeWidth="1" strokeDasharray="4 5" />
      {/* 30-yard-ish inner ring */}
      <circle cx={cx} cy={cy} r={maxR * 0.34} fill="#0e1728" stroke="#243044" strokeWidth="1" />
      {/* Pitch */}
      <rect
        x={cx - 6}
        y={cy - maxR * 0.16}
        width="12"
        height={maxR * 0.32}
        rx="2"
        fill="#3f2f1c"
        stroke="#5b4526"
      />
      {/* Field guide lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const p = polarToXY(cx, cy, maxR, a, 100);
        return <line key={a} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#141c2b" strokeWidth="1" />;
      })}
      {/* Shots */}
      {points.map((pt) => {
        const p = polarToXY(cx, cy, maxR, pt.angle, pt.distance);
        const color = runColor(pt.runs, false);
        return (
          <g key={pt.id}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={color} strokeWidth={pt.isBoundary ? 2.2 : 1.3} strokeOpacity="0.85" />
            <circle cx={p.x} cy={p.y} r={pt.isBoundary ? 4 : 2.6} fill={color} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill="#F4C84A" />
    </svg>
  );
}

export { runColor };
