import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { SimilarityResult } from "../backend";
import { useBTCCandles, useSimilarity } from "../hooks/useBackendData";

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
const SKEL_KEYS = ["sk1", "sk2", "sk3"];

function MiniSparkline({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <div className="flex items-end gap-0.5 h-6">
      {SPARKLINE_KEYS.map((k, i) => {
        const h =
          20 +
          Math.sin(i * 0.8 + (isUp ? 0 : Math.PI)) * 10 +
          (isUp ? i * 1.5 : -i * 0.5);
        return (
          <div
            key={k}
            className="w-1 rounded-sm"
            style={{
              height: `${Math.max(4, Math.min(24, h))}px`,
              background: isUp
                ? "oklch(0.75 0.14 162 / 0.6)"
                : "oklch(0.68 0.155 20 / 0.6)",
            }}
          />
        );
      })}
    </div>
  );
}

function nsToDate(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function SimilarityPanel() {
  const { data: candles } = useBTCCandles("1d");
  const currentPrice =
    candles && candles.length > 0 ? candles[candles.length - 1].close : 0;
  const recentReturn =
    candles && candles.length >= 31
      ? (candles[candles.length - 1].close -
          candles[candles.length - 31].close) /
        candles[candles.length - 31].close
      : 0;

  const { data: results, isLoading } = useSimilarity(
    currentPrice,
    recentReturn,
  );
  const top3 = results?.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col" data-ocid="similarity.panel">
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Context Similarity
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Top historical matches for current BTC behavior
        </p>
      </div>

      <div className="p-3 space-y-2.5">
        {isLoading && (
          <div className="space-y-2" data-ocid="similarity.loading_state">
            {SKEL_KEYS.map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded" />
            ))}
          </div>
        )}

        {!isLoading && top3.length === 0 && (
          <div
            className="text-center py-6 text-muted-foreground text-xs"
            data-ocid="similarity.empty_state"
          >
            Analyzing context...
          </div>
        )}

        {top3.map((result: SimilarityResult, i: number) => (
          <div
            key={result.periodLabel}
            data-ocid={`similarity.item.${i + 1}`}
            className="rounded p-3 border border-border"
            style={{ background: "oklch(0.13 0.022 240)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground leading-tight">
                  {result.periodLabel}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {nsToDate(result.startTime)} — {nsToDate(result.endTime)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-base font-bold font-mono"
                  style={{ color: "#F2B24C" }}
                >
                  {(result.similarityScore * 100).toFixed(0)}%
                </div>
                <div className="text-[9px] text-muted-foreground">
                  similarity
                </div>
              </div>
            </div>

            <MiniSparkline pct={result.returnPct30d} />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[9px] uppercase text-muted-foreground tracking-wide">
                  30D Return
                </div>
                <div
                  className={`text-xs font-mono font-semibold flex items-center gap-1 ${result.returnPct30d >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {result.returnPct30d >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {result.returnPct30d >= 0 ? "+" : ""}
                  {(result.returnPct30d * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase text-muted-foreground tracking-wide">
                  90D Return
                </div>
                <div
                  className={`text-xs font-mono font-semibold flex items-center gap-1 ${result.returnPct90d >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {result.returnPct90d >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {result.returnPct90d >= 0 ? "+" : ""}
                  {(result.returnPct90d * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {result.keyEvents.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {result.keyEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev}
                    className="text-[9px] px-1.5 py-0.5 rounded-sm"
                    style={{
                      background: "oklch(0.22 0.04 238)",
                      color: "#9AA4B2",
                    }}
                  >
                    {ev}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
