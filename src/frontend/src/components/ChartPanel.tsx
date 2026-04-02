import {
  Activity,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoricalEvent } from "../backend";
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
  trendLine: "#A78BFA",
};

const EVENT_COLORS: Record<string, string> = {
  Estrutural: C.amber,
  Macro: C.blue,
  Geopolitico: C.red,
};

const PAD = { top: 16, right: 64, bottom: 36, left: 8 };

type ExtendedMarker = ChartMarker & { event?: HistoricalEvent };

// Trend lines stored in price-space so they reproject correctly on timeframe/zoom changes
interface TrendLine {
  id: string;
  // Normalized x position: 0 = leftmost candle, 1 = rightmost candle (relative to current view)
  xRatio1: number;
  xRatio2: number;
  price1: number;
  price2: number;
}

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

function formatEventDate(ns: bigint): string {
  return new Date(nsToMs(ns)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface TooltipData {
  x: number;
  y: number;
  candle: OHLCVCandle;
}

interface ZoomRange {
  start: number;
  end: number;
}

interface Props {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onPriceData?: (price: number, ret30d: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1M", label: "1M" },
];

export function ChartPanel({
  timeframe,
  onTimeframeChange,
  onPriceData,
  isFullscreen = false,
  onToggleFullscreen,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 420 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [focusedEvent, setFocusedEvent] = useState<HistoricalEvent | null>(
    null,
  );
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  // Trend line state — stored in price-space, not pixel-space
  const [trendMode, setTrendMode] = useState(false);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [drawing, setDrawing] = useState<{
    xRatio1: number;
    y1: number;
    price1: number;
    xRatio2: number;
    y2: number;
  } | null>(null);

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

  // Clear trend lines when timeframe changes so stale lines don't confuse
  // biome-ignore lint/correctness/useExhaustiveDependencies: timeframe is a prop, valid dependency
  useEffect(() => {
    setTrendLines([]);
    setDrawing(null);
  }, [timeframe]);

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

  const fullChartData = candles && candles.length > 0 ? candles : [];
  const totalN = fullChartData.length;

  const chartData = zoomRange
    ? fullChartData.slice(zoomRange.start, zoomRange.end)
    : fullChartData;
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
  const yToPrice = useCallback(
    (y: number) =>
      priceMin + (1 - (y - PAD.top) / chartH) * (priceMax - priceMin),
    [chartH, priceMin, priceMax],
  );

  // Convert pixel X to xRatio (0..1 across the chart plot area)
  const xToRatio = useCallback(
    (x: number) => (x - PAD.left) / Math.max(chartW, 1),
    [chartW],
  );
  // Convert xRatio back to pixel X
  const ratioToX = useCallback(
    (ratio: number) => PAD.left + ratio * chartW,
    [chartW],
  );

  const candleW = Math.max(1, (chartW / Math.max(n, 1)) * 0.7);

  // Build event markers
  const allMarkers: ExtendedMarker[] = [];
  if (events && totalN > 0) {
    for (const ev of events) {
      const evMs = nsToMs(ev.timestamp);
      let bestIdx = 0;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (let i = 0; i < totalN; i++) {
        const diff = Math.abs(fullChartData[i].timestamp - evMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      if (bestDiff < 10 * 24 * 3600 * 1000) {
        allMarkers.push({
          index: bestIdx,
          time: fullChartData[bestIdx].time,
          color: EVENT_COLORS[ev.eventType as string] ?? C.gold,
          label: ev.title.slice(0, 18),
          eventType: ev.eventType as string,
          event: ev,
        });
      }
    }
  }

  const markers: ExtendedMarker[] = zoomRange
    ? allMarkers
        .filter((m) => m.index >= zoomRange.start && m.index < zoomRange.end)
        .map((m) => ({ ...m, index: m.index - zoomRange.start }))
    : allMarkers;

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

  // Get SVG coordinates from mouse event
  const getSvgCoords = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const coords = getSvgCoords(e);
      if (!coords || n === 0) return;
      const { x, y } = coords;

      // Update drawing line preview (store as ratio)
      if (trendMode && drawing) {
        setDrawing((d) => (d ? { ...d, xRatio2: xToRatio(x), y2: y } : null));
      }

      // Tooltip (only in non-trend mode or when not drawing)
      if (!trendMode || !drawing) {
        const relX = x - PAD.left;
        const candleSpacing = chartW / n;
        const idx = Math.round(relX / candleSpacing - 0.5);
        if (idx >= 0 && idx < n) {
          setTooltip({
            x: xScale(idx),
            y: yScale(chartData[idx].close),
            candle: chartData[idx],
          });
        }
      }
    },
    [
      n,
      chartW,
      xScale,
      yScale,
      chartData,
      trendMode,
      drawing,
      getSvgCoords,
      xToRatio,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!trendMode) return;
      const coords = getSvgCoords(e);
      if (!coords) return;
      const price = yToPrice(coords.y);
      const ratio = xToRatio(coords.x);
      setDrawing({
        xRatio1: ratio,
        y1: coords.y,
        price1: price,
        xRatio2: ratio,
        y2: coords.y,
      });
    },
    [trendMode, getSvgCoords, yToPrice, xToRatio],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!trendMode || !drawing) return;
      const coords = getSvgCoords(e);
      if (!coords) return;
      const x1px = ratioToX(drawing.xRatio1);
      const x2px = ratioToX(xToRatio(coords.x));
      const dist = Math.sqrt((x2px - x1px) ** 2 + (coords.y - drawing.y1) ** 2);
      if (dist > 10) {
        const price2 = yToPrice(coords.y);
        const ratio2 = xToRatio(coords.x);
        setTrendLines((prev) => [
          ...prev,
          {
            id: `tl-${Date.now()}`,
            xRatio1: drawing.xRatio1,
            xRatio2: ratio2,
            price1: drawing.price1,
            price2,
          },
        ]);
      }
      setDrawing(null);
    },
    [trendMode, drawing, getSvgCoords, yToPrice, xToRatio, ratioToX],
  );

  const handleMarkerClick = useCallback(
    (marker: ExtendedMarker, globalIdx: number) => {
      if (trendMode) return;
      const start = Math.max(0, globalIdx - 35);
      const end = Math.min(totalN, globalIdx + 65);
      setZoomRange({ start, end });
      if (marker.event) setFocusedEvent(marker.event);
    },
    [totalN, trendMode],
  );

  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
    setFocusedEvent(null);
    setTooltip(null);
  }, []);

  const handleDeleteTrendLine = useCallback((id: string) => {
    setTrendLines((prev) => prev.filter((l) => l.id !== id));
    setHoveredLineId(null);
  }, []);

  const handleClearAllTrendLines = useCallback(() => {
    setTrendLines([]);
    setDrawing(null);
    setHoveredLineId(null);
  }, []);

  // Stats strip uses FULL data last candle
  const fullLastCandle = fullChartData[totalN - 1];
  const fullPrevCandle = fullChartData[totalN - 2];
  const priceChange =
    fullLastCandle && fullPrevCandle
      ? fullLastCandle.close - fullPrevCandle.close
      : 0;
  const pricePct = fullPrevCandle
    ? (priceChange / fullPrevCandle.close) * 100
    : 0;

  const lastCandle = fullLastCandle;

  const chartCursor = trendMode
    ? drawing
      ? "crosshair"
      : "cell"
    : "crosshair";

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
                className={`text-xs font-medium flex items-center gap-1 ${
                  priceChange >= 0 ? "text-positive" : "text-negative"
                }`}
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

        <div className="flex items-center gap-1.5">
          {zoomRange && (
            <button
              type="button"
              data-ocid="chart.reset_zoom.button"
              onClick={handleResetZoom}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-medium text-gold border border-gold/40 bg-gold/10 hover:bg-gold/20 transition-colors flex items-center gap-1"
            >
              ↩ Full View
            </button>
          )}

          {/* Timeframe buttons */}
          {TIMEFRAMES.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              data-ocid={`chart.${value}.tab`}
              onClick={() => onTimeframeChange(value)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                timeframe === value
                  ? "bg-primary/15 text-gold border border-gold/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Separator */}
          <div className="w-px h-4 bg-border mx-1" />

          {/* Trend line toggle */}
          <button
            type="button"
            title={
              trendMode
                ? "Sair do modo de linha de tendência"
                : "Traçar linha de tendência"
            }
            onClick={() => {
              setTrendMode((v) => !v);
              setDrawing(null);
            }}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors flex items-center gap-1 ${
              trendMode
                ? "bg-purple-500/20 text-purple-300 border border-purple-400/50"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Minus className="h-3 w-3" />
            <span className="hidden sm:inline">Trend</span>
          </button>

          {trendLines.length > 0 && (
            <button
              type="button"
              title="Apagar todas as linhas de tendência"
              onClick={handleClearAllTrendLines}
              className="px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-negative hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              title={
                isFullscreen ? "Sair da tela cheia" : "Expandir em tela cheia"
              }
              onClick={onToggleFullscreen}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}

          <Activity className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        </div>
      </div>

      {/* Mode hint */}
      {trendMode && (
        <div
          className="px-4 py-1.5 text-[10px] font-mono border-b border-border"
          style={{ background: "oklch(0.18 0.04 280 / 0.5)", color: "#c4b5fd" }}
        >
          Modo de linha ativo — clique e arraste para traçar. Clique sobre uma
          linha para remover.
        </div>
      )}
      {!trendMode && trendLines.length > 0 && (
        <div
          className="px-4 py-1.5 text-[10px] font-mono border-b border-border"
          style={{ background: "oklch(0.14 0.02 240 / 0.5)", color: "#9AA4B2" }}
        >
          {trendLines.length} linha{trendLines.length > 1 ? "s" : ""} de
          tendência — clique sobre uma linha para remover, ou use o X para
          apagar todas.
        </div>
      )}

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
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (!trendMode) setTooltip(null);
            if (drawing) setDrawing(null);
          }}
          role="img"
          aria-label="BTC/USDT Candlestick Chart"
          style={{ display: "block", cursor: chartCursor }}
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
          {chartData.map((c, ci) => {
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
            const globalIdx = zoomRange ? m.index + zoomRange.start : m.index;
            return (
              <g
                key={`ev-${m.time}-${m.eventType}`}
                tabIndex={0}
                style={{ cursor: trendMode ? "crosshair" : "pointer" }}
                onClick={() =>
                  handleMarkerClick(
                    zoomRange ? { ...m, index: globalIdx } : m,
                    globalIdx,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleMarkerClick(
                      zoomRange ? { ...m, index: globalIdx } : m,
                      globalIdx,
                    );
                  }
                }}
              >
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
                <rect
                  x={x - 8}
                  y={PAD.top}
                  width={16}
                  height={chartH}
                  fill="transparent"
                  stroke="none"
                />
              </g>
            );
          })}

          {/* Saved trend lines — projected from price/ratio space */}
          {trendLines.map((line) => {
            const x1 = ratioToX(line.xRatio1);
            const x2 = ratioToX(line.xRatio2);
            const y1 = yScale(line.price1);
            const y2 = yScale(line.price2);
            const isHovered = hoveredLineId === line.id;
            return (
              <g key={line.id}>
                {/* Visible line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHovered ? "#F87171" : C.trendLine}
                  strokeWidth={isHovered ? 2 : 1.5}
                  opacity={isHovered ? 1 : 0.85}
                />
                {/* Endpoints */}
                <circle
                  cx={x1}
                  cy={y1}
                  r={isHovered ? 5 : 4}
                  fill={isHovered ? "#F87171" : C.trendLine}
                  opacity={0.8}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={isHovered ? 5 : 4}
                  fill={isHovered ? "#F87171" : C.trendLine}
                  opacity={0.8}
                />
                {/* Price labels */}
                <text
                  x={x1 + 6}
                  y={y1 - 5}
                  fill={C.trendLine}
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatPrice(line.price1)}
                </text>
                <text
                  x={x2 + 6}
                  y={y2 - 5}
                  fill={C.trendLine}
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatPrice(line.price2)}
                </text>
                {/* Wide hit area — always clickable to delete */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrendLine(line.id);
                  }}
                  onMouseEnter={() => setHoveredLineId(line.id)}
                  onMouseLeave={() => setHoveredLineId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleDeleteTrendLine(line.id);
                  }}
                />
              </g>
            );
          })}

          {/* Drawing preview line */}
          {drawing && (
            <>
              <line
                x1={ratioToX(drawing.xRatio1)}
                y1={drawing.y1}
                x2={ratioToX(drawing.xRatio2)}
                y2={drawing.y2}
                stroke={C.trendLine}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                opacity={0.7}
              />
              <circle
                cx={ratioToX(drawing.xRatio1)}
                cy={drawing.y1}
                r={3}
                fill={C.trendLine}
              />
            </>
          )}

          {/* Crosshair */}
          {tooltip && !drawing && (
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
        {tooltip && !drawing && (
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

        {/* Focused event context card */}
        {focusedEvent && (
          <div
            className="absolute z-20 rounded-lg shadow-xl border border-border p-3"
            style={{
              background: "oklch(0.165 0.035 240 / 0.97)",
              top: 12,
              left: 12,
              maxWidth: 280,
            }}
            data-ocid="chart.event.card"
          >
            <button
              type="button"
              onClick={() => setFocusedEvent(null)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="chart.event.close_button"
              aria-label="Close event card"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <span
              className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-2"
              style={{
                background: `${EVENT_COLORS[focusedEvent.eventType as string] ?? C.gold}22`,
                color: EVENT_COLORS[focusedEvent.eventType as string] ?? C.gold,
                border: `1px solid ${EVENT_COLORS[focusedEvent.eventType as string] ?? C.gold}55`,
              }}
            >
              {focusedEvent.eventType as string}
            </span>

            <div className="font-semibold text-sm text-foreground leading-tight mb-1 pr-5">
              {focusedEvent.title}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mb-2">
              {formatEventDate(focusedEvent.timestamp)}
            </div>
            <p
              className="text-xs text-muted-foreground leading-relaxed mb-2"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {focusedEvent.description}
            </p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((starNum) => (
                <Star
                  key={starNum}
                  className="h-3 w-3"
                  style={{
                    color:
                      starNum <= focusedEvent.importance ? C.gold : "#374151",
                    fill:
                      starNum <= focusedEvent.importance
                        ? C.gold
                        : "transparent",
                  }}
                />
              ))}
              <span className="text-[9px] text-muted-foreground ml-1 font-mono">
                importance
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
          {trendLines.length > 0 && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-6 border-t"
                style={{ borderColor: C.trendLine }}
              />
              Trend ({trendLines.length})
            </span>
          )}
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
