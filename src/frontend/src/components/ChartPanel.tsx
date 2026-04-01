import { Activity, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useBTCCandles,
  useHistoricalEvents,
  useMajorMoves,
} from "../hooks/useBackendData";
import type { ChartMarker, OHLCVCandle, Timeframe } from "../types";

// Chart colors (literal values for SVG)
const C = {
  grid: "#1A2436",
  axisText: "#9AA4B2",
  green: "#34D399",
  red: "#F87171",
  gold: "#F2B24C",
  blue: "#3B82F6",
  amber: "#F59E0B",
  crosshair: "rgba(242,178,76,0.3)",
};

const EVENT_COLORS: Record<string, string> = {
  Estrutural: C.amber,
  Macro: C.blue,
  Geopolitico: C.red,
};

// Constant — not reactive
const PAD = { top: 16, right: 64, bottom: 36, left: 8 };

function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function formatPrice(p: number): string {
  if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
  return `$${p.toFixed(0)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

interface TooltipData {
  x: number;
  y: number;
  candle: OHLCVCandle;
}

interface Props {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onPriceData?: (price: number, ret30d: number) => void;
}

export function ChartPanel({
  timeframe,
  onTimeframeChange,
  onPriceData,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 420 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const {
    data: candles,
    isLoading: loadingCandles,
    isError,
  } = useBTCCandles(timeframe);
  const { data: events } = useHistoricalEvents();
  const { data: majorMoves } = useMajorMoves();

  // Report current price to parent
  useEffect(() => {
    if (!candles || candles.length < 30 || !onPriceData) return;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 31];
    const ret30d = prev.close > 0 ? (last.close - prev.close) / prev.close : 0;
    onPriceData(last.close, ret30d);
  }, [candles, onPriceData]);

  // Resize observer
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

  const chartData = candles && candles.length > 0 ? candles : [];
  const n = chartData.length;

  const priceMin = n > 0 ? Math.min(...chartData.map((c) => c.low)) * 0.997 : 0;
  const priceMax =
    n > 0 ? Math.max(...chartData.map((c) => c.high)) * 1.003 : 100000;

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

  // Build event markers
  const markers: ChartMarker[] = [];
  if (events && n > 0) {
    for (const ev of events) {
      const evMs = nsToMs(ev.timestamp);
      let bestIdx = 0;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i++) {
        const diff = Math.abs(chartData[i].timestamp - evMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      if (bestDiff < 10 * 24 * 3600 * 1000) {
        markers.push({
          index: bestIdx,
          time: chartData[bestIdx].time,
          color: EVENT_COLORS[ev.eventType as string] ?? C.gold,
          label: ev.title.slice(0, 18),
          eventType: ev.eventType as string,
        });
      }
    }
  }

  // Major move rectangles
  const moveRects: { x1: number; x2: number; isUp: boolean; key: string }[] =
    [];
  if (majorMoves && n > 0) {
    for (const [move] of majorMoves) {
      const startMs = nsToMs(move.startTime);
      const endMs = nsToMs(move.endTime);
      let si = 0;
      let ei = n - 1;
      let bestSD = Number.POSITIVE_INFINITY;
      let bestED = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i++) {
        const ds = Math.abs(chartData[i].timestamp - startMs);
        const de = Math.abs(chartData[i].timestamp - endMs);
        if (ds < bestSD) {
          bestSD = ds;
          si = i;
        }
        if (de < bestED) {
          bestED = de;
          ei = i;
        }
      }
      if (ei > si) {
        moveRects.push({
          x1: xScale(si) - candleW / 2,
          x2: xScale(ei) + candleW / 2,
          isUp: (move.direction as string) === "Alta",
          key: String(move.id),
        });
      }
    }
  }

  // Y-axis grid
  const yGridLines = 6;
  const yGridPrices: number[] = Array.from(
    { length: yGridLines + 1 },
    (_, i) => priceMin + (i / yGridLines) * (priceMax - priceMin),
  );

  // X-axis labels
  const xLabels: { i: number; label: string; key: string }[] = [];
  if (n > 0) {
    const step = Math.floor(n / 6);
    for (let i = 0; i < n; i += step) {
      xLabels.push({
        i,
        label: formatDate(chartData[i].timestamp),
        key: chartData[i].time,
      });
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
          y: yScale(chartData[idx].close),
          candle: chartData[idx],
        });
      }
    },
    [n, chartW, xScale, yScale, chartData],
  );

  const lastCandle = chartData[n - 1];
  const prevCandle = chartData[n - 2];
  const priceChange =
    lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const pricePct = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-foreground">
              {lastCandle
                ? `$${lastCandle.close.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : "—"}
            </span>
            {lastCandle && (
              <span
                className={`text-xs font-medium flex items-center gap-1 ${priceChange >= 0 ? "text-positive" : "text-negative"}`}
              >
                {priceChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {pricePct >= 0 ? "+" : ""}
                {pricePct.toFixed(2)}%
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            BTC/USDT
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(["1d", "1w", "1M"] as Timeframe[]).map((tf) => (
            <button
              type="button"
              key={tf}
              data-ocid={`chart.${tf}.tab`}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                timeframe === tf
                  ? "bg-primary/15 text-gold border border-gold/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
          <Activity className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        </div>
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        data-ocid="chart.canvas_target"
      >
        {loadingCandles && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            data-ocid="chart.loading_state"
          >
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        )}
        {isError && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            data-ocid="chart.error_state"
          >
            <p className="text-negative text-sm">Failed to load price data</p>
          </div>
        )}
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label="BTC/USDT Candlestick Chart"
          style={{ display: "block", cursor: "crosshair" }}
        >
          <title>BTC/USDT Price Chart</title>

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
          {xLabels.map(({ i, label, key }) => (
            <text
              key={key}
              x={xScale(i)}
              y={PAD.top + chartH + 18}
              fill={C.axisText}
              fontSize={9}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          ))}

          {/* Major move rectangles */}
          {moveRects.map((rect) => (
            <rect
              key={rect.key}
              x={rect.x1}
              y={PAD.top}
              width={Math.max(rect.x2 - rect.x1, 2)}
              height={chartH}
              fill={
                rect.isUp ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)"
              }
              stroke={
                rect.isUp ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"
              }
              strokeWidth={0.5}
            />
          ))}

          {/* Candlesticks */}
          {chartData.map((c) => {
            const cx = xScale(chartData.indexOf(c));
            const isUp = c.close >= c.open;
            const color = isUp ? C.green : C.red;
            const bodyTop = yScale(Math.max(c.open, c.close));
            const bodyBot = yScale(Math.min(c.open, c.close));
            const bodyH = Math.max(bodyBot - bodyTop, 1);
            const wickTop = yScale(c.high);
            const wickBot = yScale(c.low);
            const hw = Math.max(candleW / 2, 0.5);
            return (
              <g key={c.time}>
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

          {/* Event markers */}
          {markers.map((m) => {
            const x = xScale(m.index);
            return (
              <g key={`ev-${m.time}-${m.eventType}`}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + chartH}
                  stroke={m.color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  opacity={0.7}
                />
                <rect
                  x={x - 1}
                  y={PAD.top}
                  width={2}
                  height={6}
                  fill={m.color}
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

          {/* Current price line */}
          {lastCandle && (
            <line
              x1={PAD.left}
              y1={yScale(lastCandle.close)}
              x2={PAD.left + chartW}
              y2={yScale(lastCandle.close)}
              stroke={C.gold}
              strokeWidth={0.7}
              strokeDasharray="6 4"
              opacity={0.5}
            />
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 px-2.5 py-2 rounded text-xs font-mono border border-border"
            style={{
              background: "oklch(0.165 0.035 240 / 0.95)",
              left: tooltip.x + 12,
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
              <span className="text-positive">
                {formatPrice(tooltip.candle.high)}
              </span>
              <span className="text-muted-foreground">L</span>
              <span className="text-negative">
                {formatPrice(tooltip.candle.low)}
              </span>
              <span className="text-muted-foreground">C</span>
              <span className="text-foreground font-bold">
                {formatPrice(tooltip.candle.close)}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-8 left-4 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ background: C.green }}
            />
            Bullish
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ background: C.red }}
            />
            Bearish
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-6 border-t border-dashed"
              style={{ borderColor: C.amber }}
            />
            Structural
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-6 border-t border-dashed"
              style={{ borderColor: C.blue }}
            />
            Macro
          </span>
        </div>
      </div>

      {/* Stats strip */}
      {lastCandle && (
        <div
          className="px-4 py-2 border-t border-border grid grid-cols-4 gap-4"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          {[
            {
              label: "24H HIGH",
              value: formatPrice(lastCandle.high),
              color: "text-positive",
            },
            {
              label: "24H LOW",
              value: formatPrice(lastCandle.low),
              color: "text-negative",
            },
            {
              label: "VOLUME",
              value: `${(lastCandle.volume / 1e9).toFixed(2)}B`,
              color: "text-foreground",
            },
            {
              label: "30D CHANGE",
              value:
                candles && candles.length >= 31
                  ? (() => {
                      const p = candles[candles.length - 31];
                      const pct =
                        ((lastCandle.close - p.close) / p.close) * 100;
                      return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
                    })()
                  : "—",
              color:
                candles && candles.length >= 31
                  ? lastCandle.close - candles[candles.length - 31].close >= 0
                    ? "text-positive"
                    : "text-negative"
                  : "text-foreground",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                {label}
              </div>
              <div
                className={`text-xs font-mono font-semibold mt-0.5 ${color}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
