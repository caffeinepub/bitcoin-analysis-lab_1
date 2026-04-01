import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBTCCandlesAt } from "../hooks/useBackendData";
import { getWindowMs } from "../services/binance";
import type { CompareTimeframe, OHLCVCandle } from "../types";

// Chart color constants
const C = {
  grid: "#1A2436",
  axisText: "#9AA4B2",
  green: "#34D399",
  red: "#F87171",
  gold: "#F2B24C",
  crosshair: "rgba(242,178,76,0.3)",
};

const PAD = { top: 16, right: 64, bottom: 36, left: 8 };

const TIMEFRAMES: CompareTimeframe[] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "3d",
];

const YEAR_OFFSETS = [
  { label: "2025", years: 1 },
  { label: "2024", years: 2 },
  { label: "2023", years: 3 },
  { label: "2022", years: 4 },
  { label: "2021", years: 5 },
];

function msToMonthYear(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatPrice(p: number): string {
  if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
  return `$${p.toFixed(0)}`;
}

function formatAxisDate(ts: number, interval: CompareTimeframe): string {
  const d = new Date(ts);
  if (["1m", "3m", "5m", "15m"].includes(interval)) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (["1h", "4h"].includes(interval)) {
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false })}`;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

interface TooltipState {
  x: number;
  y: number;
  candle: OHLCVCandle;
}

interface CandlestickChartProps {
  candles: OHLCVCandle[] | undefined;
  isLoading: boolean;
  isError: boolean;
  interval: CompareTimeframe;
  title: string;
  periodLabel: string;
}

function CandlestickChart({
  candles,
  isLoading,
  isError,
  interval,
  title,
  periodLabel,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 360 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chartW = dims.w - PAD.left - PAD.right;
  const chartH = dims.h - PAD.top - PAD.bottom;

  const data = candles && candles.length > 0 ? candles : [];
  const n = data.length;

  const priceMin = n > 0 ? Math.min(...data.map((c) => c.low)) * 0.997 : 0;
  const priceMax =
    n > 0 ? Math.max(...data.map((c) => c.high)) * 1.003 : 100000;

  const xScale = useCallback(
    (i: number) => PAD.left + (i + 0.5) * (chartW / Math.max(n, 1)),
    [chartW, n],
  );
  const yScale = useCallback(
    (price: number) =>
      PAD.top + (1 - (price - priceMin) / (priceMax - priceMin)) * chartH,
    [chartH, priceMin, priceMax],
  );

  const candleW = Math.max(1, (chartW / Math.max(n, 1)) * 0.7);

  // Y-axis grid
  const yGridPrices: number[] = Array.from(
    { length: 7 },
    (_, i) => priceMin + (i / 6) * (priceMax - priceMin),
  );

  // X-axis labels
  const xLabels: { i: number; label: string }[] = [];
  if (n > 0) {
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) {
      xLabels.push({ i, label: formatAxisDate(data[i].timestamp, interval) });
    }
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || n === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const relX = mouseX - PAD.left;
      const candleSpacing = chartW / n;
      const idx = Math.round(relX / candleSpacing - 0.5);
      if (idx >= 0 && idx < n) {
        setTooltip({
          x: xScale(idx),
          y: yScale(data[idx].close),
          candle: data[idx],
        });
      }
    },
    [n, chartW, xScale, yScale, data],
  );

  // Stats: open of period vs close of period
  const firstCandle = data[0];
  const lastCandle = data[n - 1];
  const periodChange =
    firstCandle && lastCandle ? lastCandle.close - firstCandle.open : 0;
  const periodPct =
    firstCandle && firstCandle.open > 0
      ? (periodChange / firstCandle.open) * 100
      : 0;

  return (
    <div
      className="flex flex-col rounded border border-border overflow-hidden"
      style={{ background: "oklch(0.12 0.02 240)" }}
      data-ocid="comparative.chart.panel"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div>
          <div className="text-xs font-semibold text-foreground tracking-wide">
            {title}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {periodLabel}
          </div>
        </div>
        {lastCandle && (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-foreground">
              {formatPrice(lastCandle.close)}
            </span>
            <span
              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
              style={{
                color: periodChange >= 0 ? C.green : C.red,
                background:
                  periodChange >= 0
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(248,113,113,0.1)",
              }}
            >
              {periodPct >= 0 ? "+" : ""}
              {periodPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: 280 }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            data-ocid="comparative.chart.loading_state"
          >
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: C.gold }}
            />
          </div>
        )}
        {isError && !isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            data-ocid="comparative.chart.error_state"
          >
            <p className="text-xs" style={{ color: C.red }}>
              Failed to load price data
            </p>
          </div>
        )}
        {!isLoading && !isError && n === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            data-ocid="comparative.chart.empty_state"
          >
            <p className="text-xs text-muted-foreground">
              No data available for this period
            </p>
          </div>
        )}

        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label={`${title} BTC Candlestick Chart`}
          style={{ display: "block", cursor: "crosshair" }}
        >
          <title>{title} BTC Price Chart</title>

          {/* Grid lines */}
          {yGridPrices.map((price) => {
            const y = yScale(price);
            return (
              <g key={price.toFixed(0)}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={PAD.left + chartW}
                  y2={y}
                  stroke={C.grid}
                  strokeWidth={0.5}
                  strokeDasharray="3 6"
                />
                <text
                  x={PAD.left + chartW + 6}
                  y={y + 4}
                  fill={C.axisText}
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={`x-${i}`}
              x={xScale(i)}
              y={PAD.top + chartH + 18}
              fill={C.axisText}
              fontSize={8}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          ))}

          {/* Candlesticks */}
          {data.map((c, ci) => {
            const cx = xScale(ci);
            const isUp = c.close >= c.open;
            const color = isUp ? C.green : C.red;
            const bodyTop = yScale(Math.max(c.open, c.close));
            const bodyBot = yScale(Math.min(c.open, c.close));
            const bodyH = Math.max(bodyBot - bodyTop, 1);
            const wickTop = yScale(c.high);
            const wickBot = yScale(c.low);
            const hw = Math.max(candleW / 2, 0.5);
            return (
              <g key={`${c.time}-${ci}`}>
                <line
                  x1={cx}
                  y1={wickTop}
                  x2={cx}
                  y2={bodyTop}
                  stroke={color}
                  strokeWidth={0.8}
                />
                <rect
                  x={cx - hw}
                  y={bodyTop}
                  width={hw * 2}
                  height={bodyH}
                  fill={color}
                  opacity={0.9}
                />
                <line
                  x1={cx}
                  y1={bodyTop + bodyH}
                  x2={cx}
                  y2={wickBot}
                  stroke={color}
                  strokeWidth={0.8}
                />
              </g>
            );
          })}

          {/* Crosshair */}
          {tooltip && (
            <>
              <line
                x1={tooltip.x}
                y1={PAD.top}
                x2={tooltip.x}
                y2={PAD.top + chartH}
                stroke={C.crosshair}
                strokeWidth={1}
              />
              <line
                x1={PAD.left}
                y1={tooltip.y}
                x2={PAD.left + chartW}
                y2={tooltip.y}
                stroke={C.crosshair}
                strokeWidth={1}
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 px-2.5 py-2 rounded text-xs font-mono border border-border"
            style={{
              background: "oklch(0.165 0.035 240 / 0.95)",
              left:
                tooltip.x + 12 > dims.w - 160
                  ? tooltip.x - 155
                  : tooltip.x + 12,
              top: 16,
              minWidth: 140,
            }}
          >
            <div className="text-muted-foreground mb-1">
              {tooltip.candle.time}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">O</span>
              <span className="text-foreground">
                {formatPrice(tooltip.candle.open)}
              </span>
              <span className="text-muted-foreground">H</span>
              <span style={{ color: C.green }}>
                {formatPrice(tooltip.candle.high)}
              </span>
              <span className="text-muted-foreground">L</span>
              <span style={{ color: C.red }}>
                {formatPrice(tooltip.candle.low)}
              </span>
              <span className="text-muted-foreground">C</span>
              <span className="text-foreground font-bold">
                {formatPrice(tooltip.candle.close)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div
        className="px-3 py-2 border-t border-border flex items-center gap-6"
        style={{ background: "oklch(0.105 0.015 240)" }}
      >
        {firstCandle && lastCandle ? (
          <>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                OPEN
              </div>
              <div className="text-xs font-mono font-semibold text-foreground">
                {formatPrice(firstCandle.open)}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                CLOSE
              </div>
              <div className="text-xs font-mono font-semibold text-foreground">
                {formatPrice(lastCandle.close)}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                HIGH
              </div>
              <div
                className="text-xs font-mono font-semibold"
                style={{ color: C.green }}
              >
                {formatPrice(Math.max(...data.map((c) => c.high)))}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                LOW
              </div>
              <div
                className="text-xs font-mono font-semibold"
                style={{ color: C.red }}
              >
                {formatPrice(Math.min(...data.map((c) => c.low)))}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                CHANGE
              </div>
              <div
                className="text-xs font-mono font-semibold"
                style={{ color: periodChange >= 0 ? C.green : C.red }}
              >
                {periodPct >= 0 ? "+" : ""}
                {periodPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                CANDLES
              </div>
              <div className="text-xs font-mono font-semibold text-foreground">
                {n}
              </div>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-muted-foreground font-mono">—</div>
        )}
      </div>
    </div>
  );
}

export function ComparativeChartsPage() {
  const [timeframe, setTimeframe] = useState<CompareTimeframe>("1h");
  const [compareYears, setCompareYears] = useState(1);

  // Round to nearest 5 minutes so the query key is stable across re-renders
  const now = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000);
  const windowMs = getWindowMs(timeframe);

  // Current chart: recent window
  const currentStart = now - windowMs;
  const currentEnd = now;

  // Comparative chart: same window shifted back by N years
  const yearShiftMs = compareYears * 365.25 * 24 * 60 * 60 * 1000;
  const compareStart = now - yearShiftMs - windowMs;
  const compareEnd = now - yearShiftMs;

  const currentQuery = useBTCCandlesAt(timeframe, currentStart, currentEnd);
  const compareQuery = useBTCCandlesAt(timeframe, compareStart, compareEnd);

  const currentLabel = msToMonthYear(now);
  const compareLabel = msToMonthYear(compareEnd);

  const selectedYearLabel =
    YEAR_OFFSETS.find((y) => y.years === compareYears)?.label ?? "";

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "oklch(0.11 0.015 240)" }}
      data-ocid="comparative.page"
    >
      {/* Page header */}
      <div
        className="px-4 py-3 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "oklch(0.12 0.02 240)" }}
      >
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-wide">
            Comparative Analysis
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Compare current BTC price action against identical periods in past
            years
          </p>
        </div>

        {/* Shared timeframe selector */}
        <div
          className="flex items-center gap-1 flex-wrap"
          data-ocid="comparative.timeframe.tab"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              type="button"
              key={tf}
              data-ocid={`comparative.${tf}.tab`}
              onClick={() => setTimeframe(tf)}
              className="px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors"
              style={{
                background:
                  timeframe === tf ? "rgba(242,178,76,0.15)" : "transparent",
                color: timeframe === tf ? C.gold : C.axisText,
                border: `1px solid ${
                  timeframe === tf
                    ? "rgba(242,178,76,0.4)"
                    : "rgba(255,255,255,0.08)"
                }`,
              }}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="flex-1 p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Current chart */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: C.green,
                border: "1px solid rgba(52,211,153,0.3)",
              }}
            >
              CURRENT
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {currentLabel}
            </span>
          </div>
          <div className="flex-1">
            <CandlestickChart
              candles={currentQuery.data}
              isLoading={currentQuery.isLoading}
              isError={currentQuery.isError}
              interval={timeframe}
              title="Current Period"
              periodLabel={`${currentLabel} · ${timeframe.toUpperCase()} timeframe`}
            />
          </div>
        </div>

        {/* Right: Comparative chart */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: "rgba(242,178,76,0.12)",
                color: C.gold,
                border: "1px solid rgba(242,178,76,0.3)",
              }}
            >
              COMPARATIVE
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {compareLabel}
            </span>

            {/* Year selector pills */}
            <div
              className="flex items-center gap-1 ml-auto"
              data-ocid="comparative.year.select"
            >
              {YEAR_OFFSETS.map(({ label, years }) => (
                <button
                  type="button"
                  key={label}
                  data-ocid={`comparative.year.${label}.button`}
                  onClick={() => setCompareYears(years)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors"
                  style={{
                    background:
                      compareYears === years
                        ? "rgba(242,178,76,0.18)"
                        : "rgba(255,255,255,0.04)",
                    color: compareYears === years ? C.gold : C.axisText,
                    border: `1px solid ${
                      compareYears === years
                        ? "rgba(242,178,76,0.45)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <CandlestickChart
              candles={compareQuery.data}
              isLoading={compareQuery.isLoading}
              isError={compareQuery.isError}
              interval={timeframe}
              title={`${selectedYearLabel} Period`}
              periodLabel={`${compareLabel} · ${timeframe.toUpperCase()} timeframe · ${selectedYearLabel}`}
            />
          </div>
        </div>
      </div>

      {/* Correlation strip */}
      {currentQuery.data &&
        compareQuery.data &&
        currentQuery.data.length > 0 &&
        compareQuery.data.length > 0 && (
          <div
            className="px-4 py-3 border-t border-border"
            style={{ background: "oklch(0.12 0.02 240)" }}
            data-ocid="comparative.correlation.panel"
          >
            <CorrelationStrip
              current={currentQuery.data}
              compare={compareQuery.data}
              currentLabel={currentLabel}
              compareLabel={compareLabel}
            />
          </div>
        )}
    </div>
  );
}

function CorrelationStrip({
  current,
  compare,
  currentLabel,
  compareLabel,
}: {
  current: OHLCVCandle[];
  compare: OHLCVCandle[];
  currentLabel: string;
  compareLabel: string;
}) {
  const currentFirst = current[0];
  const currentLast = current[current.length - 1];
  const compareFirst = compare[0];
  const compareLast = compare[compare.length - 1];

  const currentPct =
    currentFirst?.open > 0
      ? ((currentLast.close - currentFirst.open) / currentFirst.open) * 100
      : 0;
  const comparePct =
    compareFirst?.open > 0
      ? ((compareLast.close - compareFirst.open) / compareFirst.open) * 100
      : 0;
  const diff = currentPct - comparePct;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
        Period Correlation
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono" style={{ color: C.green }}>
          {currentLabel}
        </span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: currentPct >= 0 ? C.green : C.red }}
        >
          {currentPct >= 0 ? "+" : ""}
          {currentPct.toFixed(2)}%
        </span>
      </div>
      <span className="text-muted-foreground text-xs">vs</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono" style={{ color: C.gold }}>
          {compareLabel}
        </span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: comparePct >= 0 ? C.green : C.red }}
        >
          {comparePct >= 0 ? "+" : ""}
          {comparePct.toFixed(2)}%
        </span>
      </div>
      <div
        className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded"
        style={{
          background:
            Math.abs(diff) < 5
              ? "rgba(242,178,76,0.1)"
              : diff > 0
                ? "rgba(52,211,153,0.1)"
                : "rgba(248,113,113,0.1)",
          color: Math.abs(diff) < 5 ? C.gold : diff > 0 ? C.green : C.red,
          border: `1px solid ${
            Math.abs(diff) < 5
              ? "rgba(242,178,76,0.3)"
              : diff > 0
                ? "rgba(52,211,153,0.3)"
                : "rgba(248,113,113,0.3)"
          }`,
        }}
      >
        Δ {diff >= 0 ? "+" : ""}
        {diff.toFixed(2)}% vs {compareLabel}
      </div>
    </div>
  );
}
