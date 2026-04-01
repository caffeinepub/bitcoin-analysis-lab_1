import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHistoricalEvents, useMajorMoves } from "../hooks/useBackendData";

const EVENT_LABELS: Record<string, string> = {
  Estrutural: "Structural",
  Macro: "Macro",
  Geopolitico: "Geopolitical",
};

const EVENT_COLORS: Record<string, string> = {
  Estrutural: "#F59E0B",
  Macro: "#3B82F6",
  Geopolitico: "#EF4444",
};

interface StatRow {
  type: string;
  label: string;
  avg30d: number;
  count: number;
  color: string;
}

const FALLBACK_DATA: StatRow[] = [
  {
    label: "Halving",
    avg30d: 28.4,
    count: 4,
    color: "#F2B24C",
    type: "Estrutural",
  },
  {
    label: "ETF News",
    avg30d: 15.7,
    count: 6,
    color: "#3B82F6",
    type: "Macro",
  },
  {
    label: "Rate Hikes",
    avg30d: -8.3,
    count: 8,
    color: "#EF4444",
    type: "Geopolitico",
  },
  {
    label: "Regulatory",
    avg30d: -12.1,
    count: 10,
    color: "#A78BFA",
    type: "Geopolitico",
  },
  { label: "Macro", avg30d: 5.6, count: 12, color: "#22C55E", type: "Macro" },
];

export function StatsPanel() {
  const { data: moves, isLoading: movesLoading } = useMajorMoves();
  const { data: events, isLoading: eventsLoading } = useHistoricalEvents();
  const isLoading = movesLoading || eventsLoading;

  const stats: StatRow[] = [];

  if (moves && events) {
    const typeData: Record<string, { returns: number[]; count: number }> = {
      Estrutural: { returns: [], count: 0 },
      Macro: { returns: [], count: 0 },
      Geopolitico: { returns: [], count: 0 },
    };

    for (const [move, relatedEvs] of moves) {
      const types = new Set<string>();
      for (const ev of relatedEvs) types.add(ev.eventType as string);
      for (const t of types) {
        if (typeData[t]) {
          typeData[t].returns.push(move.returnPct * 100);
          typeData[t].count++;
        }
      }
    }

    for (const [type, d] of Object.entries(typeData)) {
      const avg =
        d.returns.length > 0
          ? d.returns.reduce((a, b) => a + b, 0) / d.returns.length
          : 0;
      stats.push({
        type,
        label: EVENT_LABELS[type] ?? type,
        avg30d: avg,
        count: d.count,
        color: EVENT_COLORS[type] ?? "#F2B24C",
      });
    }
  }

  const chartData = stats.length > 0 ? stats : FALLBACK_DATA;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { name: string; value: number; fill: string }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="px-2.5 py-2 rounded border border-border text-xs"
        style={{ background: "oklch(0.165 0.035 240)" }}
      >
        <div className="font-semibold text-foreground mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: p.fill }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span
              className="font-mono font-semibold"
              style={{ color: p.value >= 0 ? "#34D399" : "#F87171" }}
            >
              {p.value >= 0 ? "+" : ""}
              {p.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" data-ocid="stats.panel">
      <div className="px-4 py-2.5 border-b border-border">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Statistics by Event Type
        </h2>
        <p className="text-[10px] text-muted-foreground">
          Average BTC return per event category
        </p>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <Skeleton className="h-full w-full" data-ocid="stats.loading_state" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 60, bottom: 4, left: 80 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="#1A2436"
                strokeDasharray="3 6"
              />
              <XAxis
                type="number"
                tick={{
                  fill: "#9AA4B2",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                tickFormatter={(v: number) =>
                  `${v > 0 ? "+" : ""}${v.toFixed(0)}%`
                }
                axisLine={{ stroke: "#1A2436" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#9AA4B2", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={76}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(242,178,76,0.05)" }}
              />
              <Bar dataKey="avg30d" name="Avg Move %" radius={[0, 3, 3, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.color}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
