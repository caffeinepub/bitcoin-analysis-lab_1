import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import type { HistoricalEvent } from "../backend";
import { useHistoricalEvents } from "../hooks/useBackendData";

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Estrutural: {
    label: "Structural",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
  },
  Macro: { label: "Macro", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  Geopolitico: {
    label: "Geopolitical",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
  },
};

const C_GOLD = "#F2B24C";
const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"];
const STAR_KEYS = ["s1", "s2", "s3", "s4", "s5"];

function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function groupByYear(
  events: HistoricalEvent[],
): Map<number, HistoricalEvent[]> {
  const map = new Map<number, HistoricalEvent[]>();
  for (const ev of events) {
    const yr = new Date(nsToMs(ev.timestamp)).getUTCFullYear();
    if (!map.has(yr)) map.set(yr, []);
    map.get(yr)!.push(ev);
  }
  return map;
}

export function EventsTimeline() {
  const { data: events, isLoading } = useHistoricalEvents();

  const sorted = events
    ? [...events].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];
  const byYear = groupByYear(sorted);
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="flex flex-col h-full" data-ocid="events.panel">
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Historical Events Timeline
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {isLoading && (
            <div className="space-y-3" data-ocid="events.loading_state">
              {SKELETON_KEYS.map((k) => (
                <Skeleton key={k} className="h-16 w-full rounded" />
              ))}
            </div>
          )}

          {!isLoading && sorted.length === 0 && (
            <div
              className="text-center py-8 text-muted-foreground text-xs"
              data-ocid="events.empty_state"
            >
              No events found
            </div>
          )}

          {years.map((yr) => (
            <div key={yr} className="mb-4">
              <div
                className="flex items-center gap-2 mb-2 sticky top-0 py-1"
                style={{ background: "oklch(0.14 0.025 240)" }}
              >
                <span className="text-[10px] font-mono font-bold text-gold">
                  {yr}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground">
                  {byYear.get(yr)?.length}
                </span>
              </div>

              <div className="relative pl-3">
                <div
                  className="absolute left-1 top-0 bottom-0 w-px"
                  style={{
                    background:
                      "linear-gradient(to bottom, oklch(0.22 0.04 238), transparent)",
                  }}
                />

                {byYear.get(yr)?.map((ev, ei) => {
                  const cfg =
                    TYPE_CONFIG[ev.eventType as string] ?? TYPE_CONFIG.Macro;
                  const date = new Date(nsToMs(ev.timestamp));
                  const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const stars = Math.round(ev.importance * 5);

                  return (
                    <div
                      key={String(ev.id)}
                      data-ocid={`events.item.${ei + 1}`}
                      className="mb-2.5 pl-3 relative group"
                    >
                      <div
                        className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full -translate-x-[3px]"
                        style={{ background: cfg.color }}
                      />
                      <div
                        className="rounded p-2 border transition-colors group-hover:border-border"
                        style={{
                          background: "oklch(0.13 0.022 240)",
                          borderColor: "oklch(0.20 0.035 238)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                            {dateStr}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground leading-tight mb-1">
                          {ev.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                          {ev.description}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          {STAR_KEYS.map((sk, si) => (
                            <Star
                              key={sk}
                              className="h-2.5 w-2.5"
                              fill={si < stars ? C_GOLD : "transparent"}
                              stroke={
                                si < stars ? C_GOLD : "oklch(0.4 0.03 238)"
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
