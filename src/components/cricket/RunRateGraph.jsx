// Run-rate graphs — Manhattan (runs per over with wicket markers) plus an
// optional worm (cumulative) overlay. Pure SVG, no chart dependency.

export default function RunRateGraph({ manhattan = [], worm = [], height = 200, className = "" }) {
  if (!manhattan.length) {
    return (
      <div className={`flex h-40 items-center justify-center text-xs text-olympus-muted ${className}`}>
        No overs bowled yet.
      </div>
    );
  }

  const width = Math.max(280, manhattan.length * 34);
  const padL = 26;
  const padB = 20;
  const padT = 12;
  const chartH = height - padB - padT;
  const chartW = width - padL - 8;
  const barW = Math.min(24, (chartW / manhattan.length) * 0.7);
  const gap = chartW / manhattan.length;

  const maxRuns = Math.max(6, ...manhattan.map((m) => m.runs));
  const maxCum = worm.length ? worm[worm.length - 1].runs : 0;

  const yRuns = (r) => padT + chartH - (r / maxRuns) * chartH;
  const xOver = (i) => padL + gap * i + gap / 2;

  const wormPath = worm
    .map((w, i) => {
      const x = xOver(i);
      const y = padT + chartH - (maxCum > 0 ? (w.runs / maxCum) * chartH : 0);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${className}`}>
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={padL} y1={padT + chartH * t} x2={width - 8} y2={padT + chartH * t} stroke="#1f2937" strokeWidth="1" />
          <text x={4} y={padT + chartH * t + 3} fontSize="8" fill="#636A78">
            {Math.round(maxRuns * (1 - t))}
          </text>
        </g>
      ))}
      {/* Bars */}
      {manhattan.map((m, i) => {
        const x = xOver(i) - barW / 2;
        const y = yRuns(m.runs);
        const h = padT + chartH - y;
        return (
          <g key={m.over}>
            <rect x={x} y={y} width={barW} height={h} rx="2" fill="#F4C84A" fillOpacity="0.85" />
            {m.wickets > 0 && <circle cx={xOver(i)} cy={y - 6} r="3" fill="#F43F5E" />}
            <text x={xOver(i)} y={height - 6} fontSize="8" fill="#636A78" textAnchor="middle">
              {m.over}
            </text>
          </g>
        );
      })}
      {/* Worm overlay */}
      {worm.length > 1 && <path d={wormPath} fill="none" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.9" />}
    </svg>
  );
}
