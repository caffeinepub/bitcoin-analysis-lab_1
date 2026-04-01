import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { HistoricalEvent, MajorMove } from "../backend";
import { useMajorMoves } from "../hooks/useBackendData";

const SKEL_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"];

function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function dateRange(startNs: bigint, endNs: bigint): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  return `${fmt(nsToMs(startNs))} → ${fmt(nsToMs(endNs))}`;
}

export function MajorMoves() {
  const { data: moves, isLoading } = useMajorMoves();

  const sorted = moves
    ? [...moves].sort(
        (a, b) => Math.abs(b[0].returnPct) - Math.abs(a[0].returnPct),
      )
    : [];

  return (
    <div className="flex flex-col h-full" data-ocid="moves.panel">
      <div className="px-4 py-2.5 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Major Moves
        </h2>
        <p className="text-[10px] text-muted-foreground">
          Significant historical price movements
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading && (
            <div className="space-y-2" data-ocid="moves.loading_state">
              {SKEL_KEYS.map((k) => (
                <Skeleton key={k} className="h-16 w-full rounded" />
              ))}
            </div>
          )}

          {!isLoading && sorted.length === 0 && (
            <div
              className="text-center py-8 text-muted-foreground text-xs"
              data-ocid="moves.empty_state"
            >
              No major moves found
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {sorted.map(
              ([move, events]: [MajorMove, HistoricalEvent[]], i: number) => {
                const isUp = (move.direction as string) === "Alta";
                const color = isUp ? "#34D399" : "#F87171";
                const bg = isUp
                  ? "rgba(52,211,153,0.06)"
                  : "rgba(248,113,113,0.06)";
                const pct = move.returnPct * 100;

                return (
                  <div
                    key={String(move.id)}
                    data-ocid={`moves.item.${i + 1}`}
                    className="rounded p-3 border"
                    style={{
                      background: bg,
                      borderColor: isUp
                        ? "rgba(52,211,153,0.2)"
                        : "rgba(248,113,113,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-sm"
                          style={{
                            color,
                            background: isUp
                              ? "rgba(52,211,153,0.12)"
                              : "rgba(248,113,113,0.12)",
                          }}
                        >
                          {isUp ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {isUp ? "BULL RUN" : "BEAR DROP"}
                        </span>
                        <span className="text-xs font-mono" style={{ color }}>
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        {isUp ? (
                          <TrendingUp className="h-3 w-3" style={{ color }} />
                        ) : (
                          <TrendingDown className="h-3 w-3" style={{ color }} />
                        )}
                        {dateRange(move.startTime, move.endTime)}
                      </div>
                    </div>

                    {events.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {events.slice(0, 4).map((ev) => (
                          <span
                            key={String(ev.id)}
                            className="text-[9px] px-1.5 py-0.5 rounded-sm max-w-[140px] truncate"
                            style={{
                              background: "oklch(0.22 0.04 238)",
                              color: "#9AA4B2",
                            }}
                            title={ev.title}
                          >
                            {ev.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
