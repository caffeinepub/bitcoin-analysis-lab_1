import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Zap } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimilarityResult } from "../backend";
import { useBTCCandles, useSimilarity } from "../hooks/useBackendData";
import type { OHLCVCandle } from "../types";

const C_GOLD = "#F2B24C";
const C_BG = "oklch(0.11 0.015 240)";
const C_CARD = "oklch(0.14 0.025 240)";
const C_CARD2 = "oklch(0.13 0.022 240)";

const MATCH_COLORS = ["#60A5FA", "#A78BFA", "#34D399"];

const SKEL_KEYS = ["sk1", "sk2", "sk3"];
const SPARKLINE_KEYS = [
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
  "b10",
  "b11",
  "b12",
];

function nsToDate(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function ReturnBadge({ pct, label }: { pct: number; label: string }) {
  const isUp = pct >= 0;
  return (
    <div>
      <div className="text-[9px] uppercase text-muted-foreground tracking-wide mb-0.5">
        {label}
      </div>
      <div
        className={`text-xs font-mono font-semibold flex items-center gap-1 ${
          isUp ? "text-green-400" : "text-red-400"
        }`}
      >
        {isUp ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {isUp ? "+" : ""}
        {(pct * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function MiniSparkline({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <div className="flex items-end gap-0.5 h-8 my-2">
      {SPARKLINE_KEYS.map((k, i) => {
        const h =
          20 +
          Math.sin(i * 0.8 + (isUp ? 0 : Math.PI)) * 10 +
          (isUp ? i * 1.5 : -i * 0.5);
        return (
          <div
            key={k}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(4, Math.min(32, h))}px`,
              background: isUp
                ? "oklch(0.75 0.14 162 / 0.55)"
                : "oklch(0.68 0.155 20 / 0.55)",
            }}
          />
        );
      })}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? C_GOLD : pct >= 60 ? "#60A5FA" : "#9AA4B2";
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Similarity
        </span>
        <span className="text-xl font-bold font-mono" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full"
        style={{ background: "oklch(0.22 0.04 238)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function buildCycleData(candles: OHLCVCandle[], results: SimilarityResult[]) {
  if (!candles.length || !results.length) return [];
  const currentBase =
    candles.length >= 31
      ? candles[candles.length - 31].close
      : candles[0].close;

  const totalWeight = results
    .slice(0, 3)
    .reduce((s, r) => s + r.similarityScore, 0);
  const weightedReturn30 =
    totalWeight > 0
      ? results
          .slice(0, 3)
          .reduce((s, r) => s + r.returnPct30d * r.similarityScore, 0) /
        totalWeight
      : 0;

  const rows: Record<string, number | string>[] = [];
  for (let day = -30; day <= 90; day++) {
    const row: Record<string, number | string> = { day };
    const candleIdx = candles.length - 31 + (day + 30);

    if (day <= 0 && candleIdx >= 0 && candleIdx < candles.length) {
      row.current = Number.parseFloat(
        ((candles[candleIdx].close / currentBase) * 100).toFixed(2),
      );
    } else if (day > 0) {
      row.current = Number.parseFloat(
        (100 * (1 + weightedReturn30 * (day / 30))).toFixed(2),
      );
    }

    results.slice(0, 3).forEach((r, i) => {
      if (day <= 0) {
        row[`match${i}`] = Number.parseFloat(
          (100 + Math.sin(day * 0.15 + i) * 5).toFixed(2),
        );
      } else if (day <= 30) {
        row[`match${i}`] = Number.parseFloat(
          (100 * (1 + r.returnPct30d * (day / 30))).toFixed(2),
        );
      } else {
        const progress = (day - 30) / 60;
        const base30 = 100 * (1 + r.returnPct30d);
        row[`match${i}`] = Number.parseFloat(
          (base30 * (1 + (r.returnPct90d - r.returnPct30d) * progress)).toFixed(
            2,
          ),
        );
      }
    });

    rows.push(row);
  }
  return rows;
}

function MatchCard({
  result,
  color,
  index,
}: { result: SimilarityResult; color: string; index: number }) {
  const r30pct = (result.returnPct30d * 100).toFixed(1);
  const r90pct = (result.returnPct90d * 100).toFixed(1);
  const narrative = `After this period, BTC moved ${
    Number(r30pct) >= 0 ? "+" : ""
  }${r30pct}% in 30d and ${Number(r90pct) >= 0 ? "+" : ""}${r90pct}% in 90d.`;

  return (
    <div
      data-ocid={`similarity.item.${index + 1}`}
      className="rounded-lg border p-4 flex flex-col gap-2"
      style={{ background: C_CARD2, borderColor: `${color}33` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="text-xs font-bold text-foreground truncate">
              {result.periodLabel}
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground ml-4">
            {nsToDate(result.startTime)} — {nsToDate(result.endTime)}
          </div>
        </div>
      </div>

      <ScoreBar score={result.similarityScore} />
      <MiniSparkline pct={result.returnPct30d} />

      <div className="grid grid-cols-2 gap-3">
        <ReturnBadge pct={result.returnPct30d} label="30D Return" />
        <ReturnBadge pct={result.returnPct90d} label="90D Return" />
      </div>

      <div
        className="rounded p-2 text-[10px] text-muted-foreground italic"
        style={{ background: "oklch(0.11 0.015 240)" }}
      >
        {narrative}
      </div>

      {result.keyEvents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.keyEvents.slice(0, 4).map((ev) => (
            <span
              key={ev}
              className="text-[9px] px-1.5 py-0.5 rounded-sm"
              style={{ background: "oklch(0.22 0.04 238)", color: "#9AA4B2" }}
            >
              {ev}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SimilarityEnginePage() {
  const { data: candles, isLoading: candlesLoading } = useBTCCandles("1d");

  const currentPrice =
    candles && candles.length > 0 ? candles[candles.length - 1].close : 0;
  const prevPrice =
    candles && candles.length >= 31 ? candles[candles.length - 31].close : 0;
  const recentReturn =
    prevPrice > 0 ? (currentPrice - prevPrice) / prevPrice : 0;

  const { data: results, isLoading: simLoading } = useSimilarity(
    currentPrice,
    recentReturn,
  );
  const top3 = results?.slice(0, 3) ?? [];
  const isLoading = candlesLoading || simLoading;

  const bestMatch = top3[0];
  const totalWeight = top3.reduce((s, r) => s + r.similarityScore, 0);
  const weighted30d =
    totalWeight > 0
      ? top3.reduce((s, r) => s + r.returnPct30d * r.similarityScore, 0) /
        totalWeight
      : 0;
  const weighted90d =
    totalWeight > 0
      ? top3.reduce((s, r) => s + r.returnPct90d * r.similarityScore, 0) /
        totalWeight
      : 0;
  const confidence = totalWeight > 0 ? (totalWeight / top3.length) * 100 : 0;

  const cycleData = candles ? buildCycleData(candles, top3) : [];

  const change30d =
    candles && candles.length >= 31
      ? ((candles[candles.length - 1].close -
          candles[candles.length - 31].close) /
          candles[candles.length - 31].close) *
        100
      : 0;

  const heroStats = [
    {
      label: "Current BTC Price",
      value: isLoading ? "—" : formatPrice(currentPrice),
      color: C_GOLD,
    },
    {
      label: "30D Change",
      value: isLoading
        ? "—"
        : `${change30d >= 0 ? "+" : ""}${change30d.toFixed(1)}%`,
      color: change30d >= 0 ? "#4ade80" : "#f87171",
    },
    {
      label: "Best Match Period",
      value: isLoading ? "—" : (bestMatch?.periodLabel ?? "Analyzing…"),
      color: undefined as string | undefined,
    },
    {
      label: "Best Match Score",
      value: isLoading
        ? "—"
        : bestMatch
          ? `${(bestMatch.similarityScore * 100).toFixed(0)}%`
          : "—",
      color: C_GOLD,
    },
  ];

  return (
    <div
      className="flex flex-col gap-4 p-4"
      style={{ background: C_BG, minHeight: "100%" }}
    >
      {/* Hero Stats Bar */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        data-ocid="similarity.section"
      >
        {heroStats.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg border border-border p-3"
            style={{ background: C_CARD }}
          >
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
              {label}
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div
                className="text-base font-bold font-mono truncate"
                style={color ? { color } : {}}
              >
                {value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top Matches Grid */}
      <div>
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
          Top Historical Matches
        </h2>
        {isLoading ? (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
            data-ocid="similarity.loading_state"
          >
            {SKEL_KEYS.map((k) => (
              <Skeleton key={k} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        ) : top3.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground text-sm"
            data-ocid="similarity.empty_state"
          >
            No similarity data available. Loading market context…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {top3.map((r, i) => (
              <MatchCard
                key={r.periodLabel}
                result={r}
                color={MATCH_COLORS[i]}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cycle Comparison Chart */}
      {!isLoading && cycleData.length > 0 && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ background: C_CARD }}
        >
          <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
            Cycle Comparison — Normalized Price Trajectory (Base 100)
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={cycleData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.22 0.04 238)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: "#9AA4B2" }}
                  tickFormatter={(v) => `D${v}`}
                  interval={14}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9AA4B2" }}
                  tickFormatter={(v) => `${v}`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: C_CARD2,
                    border: "1px solid oklch(0.22 0.04 238)",
                    borderRadius: 6,
                    fontSize: 10,
                  }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(val: number, name: string) => [`${val}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: "#9AA4B2" }} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Current"
                  stroke={C_GOLD}
                  strokeWidth={2}
                  dot={false}
                />
                {top3.map((r, i) => (
                  <Line
                    key={r.periodLabel}
                    type="monotone"
                    dataKey={`match${i}`}
                    name={r.periodLabel}
                    stroke={MATCH_COLORS[i]}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    opacity={0.7}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Predictive Outlook + Events Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Predictive Outlook */}
        <div
          className="rounded-lg border border-border p-4"
          style={{ background: C_CARD }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5" style={{ color: C_GOLD }} />
            <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Predictive Outlook
            </h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {["s1", "s2", "s3"].map((k) => (
                <Skeleton key={k} className="h-8 w-full" />
              ))}
            </div>
          ) : top3.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded p-2 text-center"
                  style={{ background: C_CARD2 }}
                >
                  <div className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1">
                    30D Forecast
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${weighted30d >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {weighted30d >= 0 ? "+" : ""}
                    {(weighted30d * 100).toFixed(1)}%
                  </div>
                </div>
                <div
                  className="rounded p-2 text-center"
                  style={{ background: C_CARD2 }}
                >
                  <div className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1">
                    90D Forecast
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${weighted90d >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {weighted90d >= 0 ? "+" : ""}
                    {(weighted90d * 100).toFixed(1)}%
                  </div>
                </div>
                <div
                  className="rounded p-2 text-center"
                  style={{ background: C_CARD2 }}
                >
                  <div className="text-[9px] uppercase text-muted-foreground tracking-wide mb-1">
                    Confidence
                  </div>
                  <div
                    className="text-lg font-bold font-mono"
                    style={{ color: C_GOLD }}
                  >
                    {confidence.toFixed(0)}%
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Based on{" "}
                <strong className="text-foreground">{top3.length}</strong>{" "}
                historical analogues, current conditions most resemble{" "}
                <strong style={{ color: C_GOLD }}>
                  {bestMatch?.periodLabel ?? "—"}
                </strong>
                . Historical precedent suggests{" "}
                {weighted30d >= 0 ? "an upward" : "a downward"} trajectory over
                the next 30 days, with{" "}
                {weighted90d >= 0
                  ? "continued gains"
                  : "potential further decline"}{" "}
                over 90 days.
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Loading analysis…
            </div>
          )}
        </div>

        {/* Events Context */}
        <div
          className="rounded-lg border border-border p-4"
          style={{ background: C_CARD }}
        >
          <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
            Key Events — Best Match Period
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {["e1", "e2", "e3"].map((k) => (
                <Skeleton key={k} className="h-7 w-full" />
              ))}
            </div>
          ) : bestMatch && bestMatch.keyEvents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground mb-3 italic">
                Key events that shaped{" "}
                <strong className="not-italic" style={{ color: C_GOLD }}>
                  {bestMatch.periodLabel}
                </strong>
                :
              </p>
              {bestMatch.keyEvents.map((ev) => (
                <div
                  key={ev}
                  className="flex items-start gap-2 rounded p-2"
                  style={{ background: C_CARD2 }}
                >
                  <div
                    className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: C_GOLD }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {ev}
                  </span>
                </div>
              ))}
              <div className="flex flex-wrap gap-1 mt-2">
                {top3.map((r, i) => (
                  <Badge
                    key={r.periodLabel}
                    variant="outline"
                    className="text-[9px]"
                    style={{
                      borderColor: `${MATCH_COLORS[i]}55`,
                      color: MATCH_COLORS[i],
                    }}
                  >
                    {r.periodLabel}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No event data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
