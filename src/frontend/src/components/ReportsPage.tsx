import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart3,
  Building2,
  Clock,
  Download,
  Flame,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHistoricalEvents } from "../hooks/useBackendData";

const C_GOLD = "#F2B24C";

const INSTITUTIONAL_KEYWORDS = [
  "etf",
  "microstrategy",
  "grayscale",
  "paypal",
  "corporate",
  "tesla",
  "blackrock",
  "fidelity",
  "galaxy",
  "institution",
  "treasury",
  "fund",
  "sec",
  "square",
  "coinbase",
  "ipo",
];

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function compute() {
      const now = new Date();
      // Next 00:00 UTC (= 21:00 BRT)
      const next = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0,
        ),
      );
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

interface Ticker24h {
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

function useBinanceTicker() {
  const [data, setData] = useState<Ticker24h | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
      .then((r) => r.json())
      .then((d: Ticker24h) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatVolume(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function MarketMomentumCard({
  ticker,
  loading,
}: { ticker: Ticker24h | null; loading: boolean }) {
  const price = ticker ? Number(ticker.lastPrice) : 0;
  const change = ticker ? Number(ticker.priceChangePercent) : 0;
  const volume = ticker ? Number(ticker.quoteVolume) : 0;

  const trend = change > 2 ? "Bullish" : change < -2 ? "Bearish" : "Neutral";
  const trendColor =
    trend === "Bullish"
      ? "#22C55E"
      : trend === "Bearish"
        ? "#EF4444"
        : "#F59E0B";

  const priceComponent = Math.min(Math.abs(change) * 5, 50);
  const volumeComponent =
    volume > 50_000_000_000 ? 50 : (volume / 50_000_000_000) * 50;
  const momentum = Math.round(priceComponent + volumeComponent);

  return (
    <Card
      className="border-border"
      style={{ background: "oklch(0.14 0.025 240)" }}
      data-ocid="reports.momentum.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" style={{ color: C_GOLD }} />
          Market Momentum
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" data-ocid="reports.momentum.loading_state">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-3">
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: C_GOLD }}
              >
                {formatPrice(price)}
              </span>
              <span
                className="text-sm font-semibold mb-1"
                style={{ color: trendColor }}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">
                Vol 24h: {formatVolume(volume)}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: trendColor, background: `${trendColor}22` }}
              >
                {trend}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Momentum Score</span>
                <span className="font-mono" style={{ color: C_GOLD }}>
                  {momentum}/100
                </span>
              </div>
              <Progress value={momentum} className="h-1.5" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InstitutionalCard() {
  const { data: events = [], isLoading } = useHistoricalEvents();

  const { score, label, labelColor, recentEvents } = useMemo(() => {
    const structural = events.filter((e) => {
      const text = `${e.title} ${e.description}`.toLowerCase();
      return (
        (e.eventType as string) === "Estrutural" &&
        INSTITUTIONAL_KEYWORDS.some((k) => text.includes(k))
      );
    });

    const now = Date.now();
    let rawScore = 0;
    for (const ev of structural) {
      const ageYears =
        (now - Number(ev.timestamp) / 1_000_000) / (365.25 * 24 * 3600 * 1000);
      const decay = Math.max(0, 1 - ageYears / 5);
      rawScore += ev.importance * decay;
    }
    const maxScore = structural.length > 0 ? structural.length * 10 : 1;
    const pct = Math.round(Math.min((rawScore / maxScore) * 100, 100));

    const lbl =
      pct >= 70
        ? "Institutional Accumulation"
        : pct >= 40
          ? "Neutral"
          : "Distribution Risk";
    const clr = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";

    const recent = [...structural]
      .sort((a, b) => Number(b.timestamp - a.timestamp))
      .slice(0, 3);

    return { score: pct, label: lbl, labelColor: clr, recentEvents: recent };
  }, [events]);

  return (
    <Card
      className="border-border"
      style={{ background: "oklch(0.14 0.025 240)" }}
      data-ocid="reports.institutional.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4" style={{ color: C_GOLD }} />
          Institutional Exposure
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton
            className="h-20 w-full"
            data-ocid="reports.institutional.loading_state"
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: labelColor, background: `${labelColor}22` }}
              >
                {label}
              </span>
              <span
                className="text-lg font-bold font-mono"
                style={{ color: C_GOLD }}
              >
                {score}/100
              </span>
            </div>
            <Progress value={score} className="h-1.5 mb-3" />
            <div className="space-y-1">
              {recentEvents.map((ev) => (
                <div
                  key={String(ev.id)}
                  className="text-[10px] text-muted-foreground flex items-start gap-1"
                >
                  <span style={{ color: C_GOLD }}>›</span>
                  <span className="line-clamp-1">{ev.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FomoCard({ ticker }: { ticker: Ticker24h | null }) {
  const price = ticker ? Number(ticker.lastPrice) : 0;
  const change = ticker ? Number(ticker.priceChangePercent) : 0;

  const { score, label, color } = useMemo(() => {
    if (price === 0)
      return { score: 50, label: "Calculating...", color: "#F59E0B" };

    const ath = price > 80_000 ? 108_000 : 69_000;
    let s = 0;

    const athRatio = price / ath;
    if (athRatio >= 0.95) s += 45;
    else if (athRatio >= 0.8) s += 30;
    else if (athRatio >= 0.6) s += 15;
    else s += 5;

    if (change > 10) s += 35;
    else if (change > 5) s += 20;
    else if (change > 2) s += 10;
    else if (change < -10) s -= 10;
    else if (change < -5) s -= 5;

    s = Math.max(0, Math.min(100, Math.round(s)));

    const lbl =
      s >= 80
        ? "Extreme FOMO"
        : s >= 60
          ? "FOMO Building"
          : s >= 40
            ? "Calm"
            : "Fear";
    const clr =
      s >= 80
        ? "#EF4444"
        : s >= 60
          ? "#F97316"
          : s >= 40
            ? "#22C55E"
            : "#3B82F6";

    return { score: s, label: lbl, color: clr };
  }, [price, change]);

  const gaugeAngle = (score / 100) * 180 - 90;

  return (
    <Card
      className="border-border"
      style={{ background: "oklch(0.14 0.025 240)" }}
      data-ocid="reports.fomo.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flame className="h-4 w-4" style={{ color: C_GOLD }} />
          FOMO Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 120 70"
            className="w-28 mb-2"
            role="img"
            aria-label={`FOMO Index gauge: ${score} — ${label}`}
          >
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="oklch(0.22 0.04 238)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 157} 157`}
            />
            <line
              x1="60"
              y1="60"
              x2={60 + 38 * Math.cos(((gaugeAngle - 90) * Math.PI) / 180)}
              y2={60 + 38 * Math.sin(((gaugeAngle - 90) * Math.PI) / 180)}
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="60" cy="60" r="4" fill={color} />
          </svg>

          <span className="text-3xl font-bold font-mono mb-1" style={{ color }}>
            {score}
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ color, background: `${color}22` }}
          >
            {label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

type Period = "diario" | "semanal" | "quinzenal" | "mensal";

const PERIOD_CONFIG: Record<
  Period,
  { label: string; days: number; title: string }
> = {
  diario: { label: "Diário", days: 1, title: "Daily Report" },
  semanal: { label: "Semanal", days: 7, title: "Weekly Report" },
  quinzenal: { label: "Quinzenal", days: 15, title: "Bi-Weekly Report" },
  mensal: { label: "Mensal", days: 30, title: "Monthly Report" },
};

function generateSummary(
  period: Period,
  price: number,
  change: number,
  eventCount: number,
): string {
  const trend = change > 2 ? "bullish" : change < -2 ? "bearish" : "neutral";
  const priceFmt = price > 0 ? ` at ${formatPrice(price)}` : "";
  const periodLabel = PERIOD_CONFIG[period].label.toLowerCase();

  const summaries: Record<string, string> = {
    bullish: `Bitcoin continues its upward trajectory${priceFmt}, showing strong ${periodLabel} momentum. ${eventCount > 0 ? `${eventCount} key events influenced this period.` : ""} Institutional demand and on-chain metrics remain constructive. Resistance levels are being tested; a clean break could trigger further upside.`,
    bearish: `Bitcoin faced selling pressure${priceFmt} over the ${periodLabel} period. ${eventCount > 0 ? `${eventCount} events contributed to the negative sentiment.` : ""} Watch for support zone defense before considering new positions. Macro headwinds remain a concern.`,
    neutral: `Bitcoin consolidates${priceFmt} in a tight range, reflecting market indecision. ${eventCount > 0 ? `${eventCount} events noted during this period.` : ""} On-chain fundamentals remain stable. A directional catalyst is likely needed to break the current range.`,
  };
  return summaries[trend];
}

function PeriodReport({
  period,
  ticker,
  events,
}: {
  period: Period;
  ticker: Ticker24h | null;
  events: import("../backend").HistoricalEvent[];
}) {
  const config = PERIOD_CONFIG[period];
  const price = ticker ? Number(ticker.lastPrice) : 0;
  const change = ticker ? Number(ticker.priceChangePercent) : 0;

  const nowMs = Date.now();
  const startMs = nowMs - config.days * 24 * 3600 * 1000;

  const periodEvents = useMemo(
    () =>
      events.filter((e) => {
        const ms = Number(e.timestamp) / 1_000_000;
        return ms >= startMs && ms <= nowMs;
      }),
    [events, startMs, nowMs],
  );

  const endDate = new Date(nowMs).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startDate = new Date(startMs).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const summary = generateSummary(period, price, change, periodEvents.length);

  return (
    <div
      className="rounded-xl border border-border p-5"
      style={{ background: "oklch(0.14 0.025 240)" }}
      data-ocid={`reports.${period}.panel`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: C_GOLD }}>
            {config.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {startDate} — {endDate}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2.5 py-1"
          data-ocid={`reports.${period}.button`}
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          className="rounded-lg p-3 border border-border"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          <p className="text-[10px] text-muted-foreground mb-1">BTC Price</p>
          <p className="text-sm font-bold font-mono" style={{ color: C_GOLD }}>
            {price > 0 ? formatPrice(price) : "—"}
          </p>
        </div>
        <div
          className="rounded-lg p-3 border border-border"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          <p className="text-[10px] text-muted-foreground mb-1">24h Change</p>
          <p
            className="text-sm font-bold"
            style={{ color: change >= 0 ? "#22C55E" : "#EF4444" }}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </p>
        </div>
        <div
          className="rounded-lg p-3 border border-border"
          style={{ background: "oklch(0.12 0.02 240)" }}
        >
          <p className="text-[10px] text-muted-foreground mb-1">Events</p>
          <p className="text-sm font-bold text-foreground">
            {periodEvents.length}
          </p>
        </div>
      </div>

      <div
        className="rounded-lg p-3 border border-border mb-4"
        style={{ background: "oklch(0.12 0.02 240)" }}
      >
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
          Market Summary
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">{summary}</p>
      </div>

      {periodEvents.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Key Events This Period
          </p>
          <div className="space-y-1.5">
            {periodEvents.slice(0, 5).map((ev) => {
              const TYPE_COLORS: Record<string, string> = {
                Estrutural: "#F59E0B",
                Macro: "#3B82F6",
                Geopolitico: "#EF4444",
              };
              const color = TYPE_COLORS[ev.eventType as string] ?? "#3B82F6";
              return (
                <div
                  key={String(ev.id)}
                  className="flex items-start gap-2 text-xs"
                >
                  <span
                    className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-foreground/80 line-clamp-1">
                    {ev.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {periodEvents.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No recorded events in this period.
        </p>
      )}
    </div>
  );
}

export function ReportsPage() {
  const countdown = useCountdown();
  const { data: ticker, loading: tickerLoading } = useBinanceTicker();
  const { data: events = [] } = useHistoricalEvents();
  const [activePeriod, setActivePeriod] = useState<Period>("diario");

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "oklch(0.11 0.015 240)" }}
      data-ocid="reports.page"
    >
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: C_GOLD }} />
          <h2 className="text-base font-bold" style={{ color: C_GOLD }}>
            Market Reports
          </h2>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border"
          style={{ background: "oklch(0.14 0.025 240)" }}
          data-ocid="reports.countdown.panel"
        >
          <Clock className="h-3.5 w-3.5" style={{ color: C_GOLD }} />
          <span className="text-xs text-muted-foreground">
            Próximo relatório em
          </span>
          <span
            className="text-xs font-mono font-bold"
            style={{ color: C_GOLD }}
          >
            {countdown}
          </span>
          <span className="text-[10px] text-muted-foreground">(21:00 BRT)</span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MarketMomentumCard ticker={ticker} loading={tickerLoading} />
          <InstitutionalCard />
          <FomoCard ticker={ticker} />
        </div>

        <Separator />

        <Tabs
          value={activePeriod}
          onValueChange={(v) => setActivePeriod(v as Period)}
          data-ocid="reports.period.tab"
        >
          <TabsList
            className="grid grid-cols-4 w-full max-w-sm"
            style={{ background: "oklch(0.14 0.025 240)" }}
          >
            {(
              Object.entries(PERIOD_CONFIG) as [
                Period,
                (typeof PERIOD_CONFIG)[Period],
              ][]
            ).map(([key, cfg]) => (
              <TabsTrigger
                key={key}
                value={key}
                data-ocid={`reports.${key}.tab`}
                className="text-xs"
              >
                {cfg.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(PERIOD_CONFIG) as Period[]).map((p) => (
            <TabsContent key={p} value={p} className="mt-4">
              <PeriodReport period={p} ticker={ticker} events={events} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
