import { formatNumber, formatShortDate } from "@/lib/format";

/** Accessible inline SVG line chart of recorded test mileage (no client JS). */
export function MileageChart({ records }: { records: { date: string | null; km: number }[] }) {
  const pts = records.filter((r) => r.date).slice(-12);
  if (pts.length < 2) return null;
  const w = 480, h = 160, pad = { t: 12, r: 12, b: 28, l: 48 };
  const xs = pts.map((p) => new Date(p.date!).getTime());
  const ys = pts.map((p) => p.km);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = 0, maxY = Math.max(...ys) * 1.1;
  const X = (x: number) => pad.l + ((x - minX) / Math.max(1, maxX - minX)) * (w - pad.l - pad.r);
  const Y = (y: number) => h - pad.b - ((y - minY) / Math.max(1, maxY - minY)) * (h - pad.t - pad.b);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(xs[i]!).toFixed(1)},${Y(p.km).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxY * f));
  return (
    <figure className="rounded-md bg-secondary/60 p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-labelledby="mileage-chart-title mileage-chart-desc" direction="ltr">
        <title id="mileage-chart-title">גרף נסועה לפי טסטים</title>
        <desc id="mileage-chart-desc">{pts.map((p) => `${formatShortDate(p.date)}: ${formatNumber(p.km)} ק״מ`).join("; ")}</desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="#E2E6E2" strokeWidth="1" />
            <text x={pad.l - 6} y={Y(t) + 4} fontSize="10" textAnchor="end" fill="#647274">{formatNumber(t)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="#16454A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={X(xs[i]!)} cy={Y(p.km)} r="4" fill="#C48A45" stroke="#fff" strokeWidth="1.5" />
            {(i === 0 || i === pts.length - 1) && <text x={X(xs[i]!)} y={h - 8} fontSize="10" textAnchor="middle" fill="#647274">{new Date(p.date!).getFullYear()}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">נסועה מתועדת לאורך זמן</figcaption>
    </figure>
  );
}
