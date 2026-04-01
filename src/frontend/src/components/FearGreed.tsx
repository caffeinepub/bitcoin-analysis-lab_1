import { Skeleton } from "@/components/ui/skeleton";
import { useBTCCandles, useFearGreedIndex } from "../hooks/useBackendData";

function computeFearGreed(prices: number[]): {
  score: number;
  label: string;
  color: string;
} {
  if (prices.length < 30)
    return { score: 50, label: "Neutral", color: "#F2B24C" };

  const ret30 =
    (prices[prices.length - 1] - prices[prices.length - 30]) /
    prices[prices.length - 30];

  const returns: number[] = [];
  for (let i = prices.length - 30; i < prices.length; i++) {
    if (prices[i - 1] > 0)
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const vol = Math.sqrt(variance);

  const momentumScore = Math.min(100, Math.max(0, 50 + ret30 * 100));
  const volScore = Math.min(100, Math.max(0, 100 - vol * 1000));
  const score = Math.round(momentumScore * 0.6 + volScore * 0.4);

  let label: string;
  let color: string;
  if (score <= 25) {
    label = "Extreme Fear";
    color = "#EF4444";
  } else if (score <= 45) {
    label = "Fear";
    color = "#F87171";
  } else if (score <= 55) {
    label = "Neutral";
    color = "#F2B24C";
  } else if (score <= 75) {
    label = "Greed";
    color = "#34D399";
  } else {
    label = "Extreme Greed";
    color = "#10B981";
  }

  return { score, label, color };
}

function classifyScore(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Extreme Fear", color: "#EF4444" };
  if (score <= 45) return { label: "Fear", color: "#F87171" };
  if (score <= 55) return { label: "Neutral", color: "#F2B24C" };
  if (score <= 75) return { label: "Greed", color: "#34D399" };
  return { label: "Extreme Greed", color: "#10B981" };
}

function GaugeSVG({ score, color }: { score: number; color: string }) {
  const r = 44;
  const cx = 56;
  const cy = 56;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const bgStart = {
    x: cx + r * Math.cos(toRad(180)),
    y: cy - r * Math.sin(toRad(180)),
  };
  const bgEnd = {
    x: cx + r * Math.cos(toRad(0)),
    y: cy - r * Math.sin(toRad(0)),
  };

  const angle = 180 - (score / 100) * 180;
  const fillEnd = {
    x: cx + r * Math.cos(toRad(angle)),
    y: cy - r * Math.sin(toRad(angle)),
  };
  const largeArc = score > 50 ? 1 : 0;

  const nx = cx + (r - 8) * Math.cos(toRad(angle));
  const ny = cy - (r - 8) * Math.sin(toRad(angle));

  return (
    <svg
      width={112}
      height={64}
      viewBox="0 0 112 64"
      role="img"
      aria-label="Fear and greed gauge"
    >
      <title>Fear and Greed Gauge</title>
      <path
        d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`}
        fill="none"
        stroke="oklch(0.22 0.04 238)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.9}
      />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={3} fill={color} />
    </svg>
  );
}

export function FearGreed() {
  const { data: candles, isLoading: candlesLoading } = useBTCCandles("1d");
  const {
    data: fngData,
    isLoading: fngLoading,
    isError: fngError,
  } = useFearGreedIndex();

  const prices = candles?.map((c) => c.close) ?? [];
  const fallback = computeFearGreed(prices);

  const isLive = !fngError && fngData && fngData.length > 0;
  const score = isLive ? Number.parseInt(fngData[0].value) : fallback.score;
  const { label, color } = isLive ? classifyScore(score) : fallback;

  const isLoading = candlesLoading && fngLoading;

  return (
    <div
      className="rounded border border-border p-3"
      style={{ background: "oklch(0.13 0.022 240)" }}
      data-ocid="feargreed.panel"
    >
      <div className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
        Fear &amp; Greed Index
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" data-ocid="feargreed.loading_state" />
      ) : (
        <div className="flex items-center gap-3">
          <GaugeSVG score={score} color={color} />
          <div>
            <div className="text-2xl font-bold font-mono" style={{ color }}>
              {score}
            </div>
            <div className="text-xs font-semibold" style={{ color }}>
              {label}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {isLive ? "Real-time data" : "30-day signal"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2.5 flex justify-between text-[9px] text-muted-foreground">
        <span style={{ color: "#EF4444" }}>Ext. Fear</span>
        <span style={{ color: "#F2B24C" }}>Neutral</span>
        <span style={{ color: "#10B981" }}>Ext. Greed</span>
      </div>

      <div className="mt-1.5 flex justify-end">
        {isLive ? (
          <span
            className="text-[9px] font-semibold"
            style={{ color: "#22C55E" }}
          >
            Live • alternative.me
          </span>
        ) : (
          <span className="text-[9px] text-muted-foreground">Estimated</span>
        )}
      </div>
    </div>
  );
}
