import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock } from "lucide-react";
import type { FutureEvent } from "../backend";
import { useFutureEvents } from "../hooks/useBackendData";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  Estrutural: { label: "Structural", color: "#F59E0B" },
  Macro: { label: "Macro", color: "#3B82F6" },
  Geopolitico: { label: "Geopolitical", color: "#EF4444" },
};

const SKEL_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5"];

function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function daysUntil(ms: number): number {
  return Math.ceil((ms - Date.now()) / (24 * 3600 * 1000));
}

export function UpcomingEvents() {
  const { data: events, isLoading } = useFutureEvents();

  const upcoming = events
    ? [...events]
        .filter((e) => nsToMs(e.expectedTime) > Date.now())
        .sort((a, b) => Number(a.expectedTime - b.expectedTime))
        .slice(0, 8)
    : [];

  return (
    <div className="flex flex-col" data-ocid="upcoming.panel">
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Upcoming Events
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Anticipated market catalysts
        </p>
      </div>

      <div className="p-3 space-y-1.5">
        {isLoading && (
          <div className="space-y-2" data-ocid="upcoming.loading_state">
            {SKEL_KEYS.map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded" />
            ))}
          </div>
        )}

        {!isLoading && upcoming.length === 0 && (
          <div
            className="text-center py-4 text-muted-foreground text-xs"
            data-ocid="upcoming.empty_state"
          >
            No upcoming events
          </div>
        )}

        {upcoming.map((ev: FutureEvent, i: number) => {
          const cfg = TYPE_CONFIG[ev.eventType as string] ?? TYPE_CONFIG.Macro;
          const ms = nsToMs(ev.expectedTime);
          const days = daysUntil(ms);
          const dateStr = new Date(ms).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={String(ev.id)}
              data-ocid={`upcoming.item.${i + 1}`}
              className="flex items-center gap-2.5 p-2 rounded border border-border hover:border-primary/30 transition-colors"
              style={{ background: "oklch(0.13 0.022 240)" }}
            >
              <div className="shrink-0">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-foreground truncate">
                  {ev.title}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] px-1 py-0.5 rounded-sm"
                    style={{ color: cfg.color, background: `${cfg.color}18` }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {dateStr}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="flex items-center gap-1"
                  style={{ color: "#F2B24C" }}
                >
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-mono font-bold">{days}d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
