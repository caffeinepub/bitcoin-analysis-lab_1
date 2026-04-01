import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Star,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FutureEvent, HistoricalEvent } from "../backend";
import { useFutureEvents, useHistoricalEvents } from "../hooks/useBackendData";

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Estrutural: {
    label: "Structural",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
  },
  Macro: { label: "Macro", color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
  Geopolitico: {
    label: "Geopolitical",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
  },
};

const C_GOLD = "#F2B24C";
const STAR_KEYS = ["s1", "s2", "s3", "s4", "s5"];
const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"];

function nsToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function formatDate(ns: bigint): string {
  return new Date(nsToMs(ns)).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getYear(ns: bigint): number {
  return new Date(nsToMs(ns)).getUTCFullYear();
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const filled = Math.round((value / 10) * max);
  return (
    <div className="flex gap-0.5">
      {STAR_KEYS.slice(0, max).map((sk, i) => (
        <Star
          key={sk}
          className="h-3 w-3"
          fill={i < filled ? C_GOLD : "transparent"}
          stroke={i < filled ? C_GOLD : "oklch(0.4 0.03 238)"}
        />
      ))}
    </div>
  );
}

type SortField =
  | "date"
  | "eventType"
  | "title"
  | "importance"
  | "predictability";
type SortDir = "asc" | "desc";

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 10);
  const color = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ color, background: `${color}22` }}
    >
      {label} ({pct}%)
    </span>
  );
}

function PredictivePanel({
  futureEvents,
  historicalEvents,
}: {
  futureEvents: FutureEvent[];
  historicalEvents: HistoricalEvent[];
}) {
  const analyses = useMemo(() => {
    return futureEvents.slice(0, 6).map((fe) => {
      const similar = historicalEvents
        .filter(
          (he) =>
            he.eventType === fe.eventType &&
            Math.abs(he.importance - fe.importance) < 3,
        )
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3);

      const avgImportance =
        similar.length > 0
          ? similar.reduce((s, e) => s + e.importance, 0) / similar.length
          : fe.importance;

      const signal =
        avgImportance >= 7
          ? "bullish"
          : avgImportance >= 4
            ? "neutral"
            : "bearish";

      return { fe, similar, signal };
    });
  }, [futureEvents, historicalEvents]);

  const overallSignal = useMemo(() => {
    const counts = { bullish: 0, neutral: 0, bearish: 0 };
    for (const a of analyses) {
      counts[a.signal as keyof typeof counts]++;
    }
    const maxVal = Math.max(counts.bullish, counts.neutral, counts.bearish);
    if (counts.bullish === maxVal) return "bullish";
    if (counts.bearish === maxVal) return "bearish";
    return "neutral";
  }, [analyses]);

  const signalColor =
    overallSignal === "bullish"
      ? "#22C55E"
      : overallSignal === "bearish"
        ? "#EF4444"
        : "#F59E0B";

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ background: "oklch(0.14 0.025 240)" }}
      data-ocid="predictive.panel"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4" style={{ color: C_GOLD }} />
        <h3 className="text-sm font-bold" style={{ color: C_GOLD }}>
          Predictive Analysis — Forward Signals
        </h3>
      </div>

      {analyses.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No upcoming events to analyze.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {analyses.map((a) => {
          const cfg =
            TYPE_CONFIG[a.fe.eventType as string] ?? TYPE_CONFIG.Macro;
          const expectedDate = new Date(nsToMs(a.fe.expectedTime));
          const dateStr = expectedDate.toLocaleDateString("pt-BR", {
            year: "numeric",
            month: "short",
          });
          return (
            <div
              key={String(a.fe.id)}
              className="rounded-lg border border-border p-3"
              style={{ background: "oklch(0.12 0.02 240)" }}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                  style={{ color: cfg.color, background: cfg.bg }}
                >
                  {cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {dateStr}
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground mb-2 leading-tight">
                {a.fe.title}
              </p>
              <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">
                {a.fe.description}
              </p>
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1">
                  Similar past events:
                </p>
                {a.similar.length === 0 && (
                  <p className="text-[10px] italic text-muted-foreground">
                    No close historical analogues
                  </p>
                )}
                {a.similar.map((he) => (
                  <div
                    key={String(he.id)}
                    className="text-[10px] text-foreground/70 flex items-start gap-1 mb-0.5"
                  >
                    <span style={{ color: C_GOLD }}>›</span>
                    <span className="line-clamp-1">{he.title}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">
                      {getYear(he.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <ConfidenceBadge score={a.fe.predictability} />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color:
                      a.signal === "bullish"
                        ? "#22C55E"
                        : a.signal === "bearish"
                          ? "#EF4444"
                          : "#F59E0B",
                  }}
                >
                  {a.signal}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {analyses.length > 0 && (
        <div
          className="mt-4 rounded-lg p-3 border text-sm font-medium"
          style={{
            borderColor: `${signalColor}44`,
            background: `${signalColor}0d`,
            color: signalColor,
          }}
        >
          Based on {historicalEvents.length} historical patterns, the next 30–90
          days signal <strong className="uppercase">{overallSignal}</strong>{" "}
          momentum.
        </div>
      )}
    </div>
  );
}

export function HistoricalEventsPage() {
  const { data: events = [], isLoading } = useHistoricalEvents();
  const { data: futureEvents = [] } = useFutureEvents();

  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [categories, setCategories] = useState<string[]>([]);
  const [yearMin, setYearMin] = useState(2009);
  const [yearMax, setYearMax] = useState(2026);
  const [magnitudeMin, setMagnitudeMin] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allCategories = ["Macro", "Geopolitico", "Estrutural"];

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  const filtered = useMemo(() => {
    let result = [...events];
    if (categories.length > 0) {
      result = result.filter((e) => categories.includes(e.eventType as string));
    }
    result = result.filter((e) => {
      const yr = getYear(e.timestamp);
      return yr >= yearMin && yr <= yearMax;
    });
    result = result.filter((e) => e.importance >= magnitudeMin);
    return result;
  }, [events, categories, yearMin, yearMax, magnitudeMin]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = Number(a.timestamp - b.timestamp);
          break;
        case "eventType":
          cmp = (a.eventType as string).localeCompare(b.eventType as string);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "importance":
          cmp = a.importance - b.importance;
          break;
        case "predictability":
          cmp = a.predictability - b.predictability;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" style={{ color: C_GOLD }} />
    ) : (
      <ArrowDown className="h-3 w-3" style={{ color: C_GOLD }} />
    );
  }

  // Group for timeline
  const byYear = useMemo(() => {
    const map = new Map<number, HistoricalEvent[]>();
    const chronological = [...sorted].sort((a, b) =>
      Number(b.timestamp - a.timestamp),
    );
    for (const ev of chronological) {
      const yr = getYear(ev.timestamp);
      if (!map.has(yr)) map.set(yr, []);
      map.get(yr)!.push(ev);
    }
    return map;
  }, [sorted]);
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "oklch(0.11 0.015 240)" }}
      data-ocid="historical.page"
    >
      {/* Sticky filter bar */}
      <div
        className="sticky top-0 z-20 border-b border-border px-4 py-3"
        style={{ background: "oklch(0.11 0.015 240)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden border border-border"
            data-ocid="historical.toggle"
          >
            {(["table", "timeline"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                style={{
                  background:
                    viewMode === mode ? "oklch(0.22 0.04 238)" : "transparent",
                  color: viewMode === mode ? C_GOLD : "oklch(0.675 0.018 238)",
                }}
              >
                {mode === "table" ? "Table" : "Timeline"}
              </button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Category filter */}
          <div className="flex gap-1.5">
            {allCategories.map((cat) => {
              const cfg = TYPE_CONFIG[cat];
              const active = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  data-ocid={`historical.${cat.toLowerCase()}.toggle`}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium"
                  style={{
                    borderColor: active ? cfg.color : "oklch(0.22 0.04 238)",
                    background: active ? cfg.bg : "transparent",
                    color: active ? cfg.color : "oklch(0.675 0.018 238)",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Year range */}
          <div className="flex items-center gap-2">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={yearMin}
              onChange={(e) => setYearMin(Number(e.target.value))}
              data-ocid="historical.year_min.select"
              className="text-xs bg-transparent border border-border rounded px-1.5 py-1 text-foreground"
            >
              {Array.from({ length: 18 }, (_, i) => 2009 + i).map((y) => (
                <option
                  key={y}
                  value={y}
                  style={{ background: "oklch(0.14 0.025 240)" }}
                >
                  {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">–</span>
            <select
              value={yearMax}
              onChange={(e) => setYearMax(Number(e.target.value))}
              data-ocid="historical.year_max.select"
              className="text-xs bg-transparent border border-border rounded px-1.5 py-1 text-foreground"
            >
              {Array.from({ length: 18 }, (_, i) => 2009 + i).map((y) => (
                <option
                  key={y}
                  value={y}
                  style={{ background: "oklch(0.14 0.025 240)" }}
                >
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Magnitude slider */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Min importance
            </span>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[magnitudeMin]}
              onValueChange={([v]) => setMagnitudeMin(v)}
              data-ocid="historical.magnitude.input"
              className="w-24"
            />
            <span className="text-[11px] font-mono" style={{ color: C_GOLD }}>
              {magnitudeMin}
            </span>
          </div>

          <div className="ml-auto text-[11px] text-muted-foreground">
            {sorted.length} events
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {isLoading && (
          <div className="space-y-2" data-ocid="historical.loading_state">
            {SKELETON_KEYS.map((sk) => (
              <Skeleton key={sk} className="h-12 w-full rounded" />
            ))}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            data-ocid="historical.empty_state"
          >
            <BookOpen className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No events match your filters</p>
          </div>
        )}

        {/* TABLE VIEW */}
        {!isLoading && sorted.length > 0 && viewMode === "table" && (
          <div
            className="rounded-xl border border-border overflow-hidden"
            style={{ background: "oklch(0.14 0.025 240)" }}
            data-ocid="historical.table"
          >
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "oklch(0.22 0.04 238)" }}>
                  {(
                    [
                      ["date", "Date"],
                      ["eventType", "Category"],
                      ["title", "Event"],
                      ["importance", "Importance"],
                      ["predictability", "Predictability"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <TableHead
                      key={field}
                      className="cursor-pointer select-none text-[11px] uppercase tracking-wider"
                      onClick={() => handleSort(field)}
                    >
                      <div className="flex items-center gap-1.5">
                        {label}
                        <SortIcon field={field} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((ev, i) => {
                  const cfg =
                    TYPE_CONFIG[ev.eventType as string] ?? TYPE_CONFIG.Macro;
                  const id = String(ev.id);
                  const isExpanded = expandedRow === id;
                  return (
                    <>
                      <TableRow
                        key={id}
                        data-ocid={`historical.item.${i + 1}`}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderColor: "oklch(0.20 0.035 238)",
                          background: isExpanded
                            ? "oklch(0.16 0.030 240)"
                            : undefined,
                        }}
                        onClick={() =>
                          setExpandedRow((prev) => (prev === id ? null : id))
                        }
                      >
                        <TableCell className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {formatDate(ev.timestamp)}
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-sm font-medium whitespace-nowrap"
                            style={{
                              color: cfg.color,
                              background: cfg.bg,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-xs font-medium text-foreground">
                              {ev.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StarRating value={ev.importance} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress
                              value={ev.predictability * 10}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground w-6">
                              {Math.round(ev.predictability * 10)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow
                          key={`${id}-expanded`}
                          style={{ borderColor: "oklch(0.20 0.035 238)" }}
                        >
                          <TableCell
                            colSpan={5}
                            style={{ background: "oklch(0.16 0.030 240)" }}
                          >
                            <div className="py-2 px-4">
                              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                                {ev.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60">
                                Source: {ev.source}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TIMELINE VIEW */}
        {!isLoading && sorted.length > 0 && viewMode === "timeline" && (
          <div className="relative" data-ocid="historical.list">
            {years.map((yr) => (
              <div key={yr} className="mb-8">
                {/* Year header */}
                <div
                  className="flex items-center gap-3 mb-4 sticky top-14 z-10 py-1"
                  style={{ background: "oklch(0.11 0.015 240)" }}
                >
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.22 0.04 238)" }}
                  />
                  <span
                    className="text-xl font-bold font-mono px-3"
                    style={{ color: C_GOLD }}
                  >
                    {yr}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {byYear.get(yr)?.length} events
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.22 0.04 238)" }}
                  />
                </div>

                {/* Events in this year */}
                <div className="relative">
                  {/* Center line */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
                    style={{
                      background:
                        "linear-gradient(to bottom, oklch(0.30 0.06 65), oklch(0.20 0.04 238))",
                    }}
                  />

                  {byYear.get(yr)?.map((ev, ei) => {
                    const cfg =
                      TYPE_CONFIG[ev.eventType as string] ?? TYPE_CONFIG.Macro;
                    const isLeft = ei % 2 === 0;
                    const dateStr = new Date(
                      nsToMs(ev.timestamp),
                    ).toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={String(ev.id)}
                        data-ocid={`historical.item.${ei + 1}`}
                        className={`flex mb-4 ${
                          isLeft ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className="w-[45%] rounded-lg border border-border p-3 transition-all hover:border-opacity-70"
                          style={{
                            background: "oklch(0.14 0.025 240)",
                            borderColor: `${cfg.color}33`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                              style={{ color: cfg.color, background: cfg.bg }}
                            >
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {dateStr}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground mb-1.5 leading-tight">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-snug mb-2 line-clamp-3">
                            {ev.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <StarRating value={ev.importance} />
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(ev.predictability * 10)}% predictable
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PREDICTIVE ANALYSIS */}
        {!isLoading && (
          <PredictivePanel
            futureEvents={futureEvents}
            historicalEvents={events}
          />
        )}
      </div>
    </div>
  );
}
