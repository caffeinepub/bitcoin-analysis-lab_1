import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const C_GOLD = "#F2B24C";
const C_GREEN = "#22C55E";
const C_RED = "#EF4444";
const C_ORANGE = "#F97316";

const BG_CARD = "oklch(0.14 0.025 240)";
const BG_DEEP = "oklch(0.12 0.02 240)";

const SKEL_5 = ["s0", "s1", "s2", "s3", "s4"];
const SKEL_6 = ["s0", "s1", "s2", "s3", "s4", "s5"];
const SKEL_4 = ["s0", "s1", "s2", "s3"];

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function fmtCompact(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
function fmtBTC(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M BTC`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K BTC`;
  return `${n.toFixed(0)} BTC`;
}
function relTime(unixSec: number): string {
  const diff = (Date.now() - unixSec * 1000) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
function fmtAbsDate(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}
function round100(n: number) {
  return Math.round(n / 100) * 100;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string;
  title: string;
  body: string;
  source: string;
  publishedOn: number;
  url: string;
}

interface Ticker24h {
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

interface FGData {
  value: string;
  value_classification: string;
}

interface CoinGeckoGlobal {
  btc_dominance: number;
  total_market_cap_usd: number;
  market_cap_change_percentage_24h_usd: number;
}

interface Asset {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Trend = "Bullish" | "Bearish" | "Neutral";

interface TrendAnalysis {
  trend: Trend;
  bullProb: number;
  bearProb: number;
  weeklyChange: number;
  support: number;
  resistance: number;
  candlePattern: string;
  candles: Candle[];
}

interface DailyAnalysis extends TrendAnalysis {
  dailyChange: number;
  shortTermMomentum: string;
  dailySupport: number;
  dailyResistance: number;
}

// ─── Fallback data ────────────────────────────────────────────────────────────
// No static fallback news — we use stale cache or show real error state

const FALLBACK_ASSETS: Asset[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "btc",
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap: 0,
    image: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "eth",
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap: 0,
    image: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "sol",
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap: 0,
    image: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  },
];

// ─── Candle analysis helpers ──────────────────────────────────────────────────
function parseBinanceCandles(raw: unknown[][]): Candle[] {
  return (raw as [number, string, string, string, string, string][]).map(
    (r) => ({
      open: Number.parseFloat(r[1]),
      high: Number.parseFloat(r[2]),
      low: Number.parseFloat(r[3]),
      close: Number.parseFloat(r[4]),
      volume: Number.parseFloat(r[5]),
    }),
  );
}

function detectCandlePattern(c: Candle): string {
  const range = c.high - c.low;
  if (range === 0) return "Doji (Indecision)";
  const body = Math.abs(c.close - c.open) / range;
  if (body < 0.1) return "Doji (Indecision)";
  if (c.close > c.open && (c.high - c.close) / range < 0.15)
    return "Bullish Marubozu";
  if (c.close < c.open && (c.close - c.low) / range < 0.15)
    return "Bearish Marubozu";
  if (c.close > c.open) return "Bullish Candle";
  return "Bearish Candle";
}

function analyzeTrend(candles: Candle[]): TrendAnalysis {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  let trend: Trend;
  if (last.close > last.open) {
    trend = "Bullish";
  } else if (last.close < last.open && prev && last.close < prev.close) {
    trend = "Bearish";
  } else {
    trend = "Neutral";
  }

  const lookback = candles.slice(-7);
  const upCount = lookback.filter((c) => c.close > c.open).length;
  const bullProb = Math.round(((upCount / lookback.length) * 100) / 5) * 5;
  const bearProb = 100 - bullProb;

  const weeklyHigh = Math.max(...candles.map((c) => c.high));
  const weeklyLow = Math.min(...candles.map((c) => c.low));
  const support = round100(weeklyLow * 0.99);
  const resistance = round100(weeklyHigh * 1.01);

  const firstCandle = candles[0];
  const weeklyChange =
    firstCandle && firstCandle.close > 0
      ? ((last.close - firstCandle.close) / firstCandle.close) * 100
      : 0;

  return {
    trend,
    bullProb,
    bearProb,
    weeklyChange,
    support,
    resistance,
    candlePattern: detectCandlePattern(last),
    candles,
  };
}

// ─── Data hooks ───────────────────────────────────────────────────────────────
const NEWS_CACHE_KEY = "btc_lab_news_cache";
const NEWS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

// Fetch from CryptoCompare
async function fetchFromCryptoCompare(): Promise<NewsItem[]> {
  const res = await fetch(
    "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,Market&sortOrder=latest",
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const json = await res.json();
  return (json.Data ?? []).slice(0, 20).map(
    (d: {
      id: string;
      title: string;
      body: string;
      source_info: { name: string };
      published_on: number;
      url: string;
    }) => ({
      id: String(d.id),
      title: d.title,
      body: d.body?.slice(0, 120) ?? "",
      source: d.source_info?.name ?? "CryptoCompare",
      publishedOn: d.published_on,
      url: d.url,
    }),
  );
}

// Fetch from CoinGecko news (free, no API key needed)
async function fetchFromCoinGecko(): Promise<NewsItem[]> {
  const res = await fetch("https://api.coingecko.com/api/v3/news?per_page=20", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = await res.json();
  const list: {
    id?: string;
    title?: string;
    description?: string;
    news_site?: string;
    published_at?: string;
    url?: string;
  }[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  return list.slice(0, 20).map((d, i) => ({
    id: d.id ? String(d.id) : `cg-${i}`,
    title: d.title ?? "",
    body: d.description?.slice(0, 120) ?? "",
    source: d.news_site ?? "CoinGecko",
    publishedOn: d.published_at
      ? Math.floor(new Date(d.published_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
    url: d.url ?? "https://coingecko.com",
  }));
}

function filterByRecency(items: NewsItem[]): NewsItem[] {
  items.sort((a, b) => b.publishedOn - a.publishedOn);
  const now = Math.floor(Date.now() / 1000);
  let filtered = items.filter((item) => item.publishedOn >= now - 24 * 3600);
  if (filtered.length < 3)
    filtered = items.filter((item) => item.publishedOn >= now - 48 * 3600);
  if (filtered.length < 3)
    filtered = items.filter((item) => item.publishedOn >= now - 72 * 3600);
  return filtered;
}

function useNewsItems() {
  const [data, setData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    // Check localStorage cache first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(NEWS_CACHE_KEY);
        if (cached) {
          const { items, fetchedAt } = JSON.parse(cached) as {
            items: NewsItem[];
            fetchedAt: number;
          };
          if (Date.now() - fetchedAt < NEWS_CACHE_TTL && items.length > 0) {
            setData(items);
            setUsingFallback(false);
            setFetchError(false);
            setLastFetched(fetchedAt);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    setLoading(true);
    setFetchError(false);

    let items: NewsItem[] = [];

    // Try CryptoCompare first
    try {
      items = await fetchFromCryptoCompare();
    } catch {
      // Try CoinGecko as backup
      try {
        items = await fetchFromCoinGecko();
      } catch {
        // Both failed — try stale cache before giving up
        try {
          const cached = localStorage.getItem(NEWS_CACHE_KEY);
          if (cached) {
            const { items: staleItems, fetchedAt } = JSON.parse(cached) as {
              items: NewsItem[];
              fetchedAt: number;
            };
            if (staleItems.length > 0) {
              setData(staleItems);
              setLastFetched(fetchedAt);
              setUsingFallback(true);
              setFetchError(false);
              setLoading(false);
              return;
            }
          }
        } catch {
          /* ignore */
        }
        setData([]);
        setUsingFallback(false);
        setFetchError(true);
        setLoading(false);
        return;
      }
    }

    const filtered = filterByRecency(items);
    if (filtered.length === 0) {
      // No recent items — use unfiltered recent items (last 7d)
      const fallbackFiltered = items.filter(
        (i) => i.publishedOn >= Math.floor(Date.now() / 1000) - 7 * 24 * 3600,
      );
      if (fallbackFiltered.length === 0) {
        setFetchError(true);
        setLoading(false);
        return;
      }
      items = fallbackFiltered;
    } else {
      items = filtered;
    }

    const fetchedAt = Date.now();
    try {
      localStorage.setItem(
        NEWS_CACHE_KEY,
        JSON.stringify({ items, fetchedAt }),
      );
    } catch {
      /* ignore */
    }

    setData(items);
    setLastFetched(fetchedAt);
    setUsingFallback(false);
    setFetchError(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, usingFallback, lastFetched, refresh, fetchError };
}

function useYesterdayCandle() {
  const [data, setData] = useState<Candle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=3",
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const raw: unknown[][] = await res.json();
        const candles = parseBinanceCandles(raw);
        if (!cancelled) setData(candles[1] ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useTicker() {
  const [data, setData] = useState<Ticker24h | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
      .then((r) => r.json())
      .then((d: Ticker24h) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useFearGreed() {
  const [data, setData] = useState<FGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.alternative.me/fng/?limit=1")
      .then((r) => r.json())
      .then((j: { data: FGData[] }) => {
        if (!cancelled) {
          setData(j.data?.[0] ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useCoinGeckoGlobal() {
  const [data, setData] = useState<CoinGeckoGlobal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.coingecko.com/api/v3/global")
      .then((r) => r.json())
      .then(
        (j: {
          data: {
            market_cap_percentage: { btc: number };
            total_market_cap: { usd: number };
            market_cap_change_percentage_24h_usd: number;
          };
        }) => {
          if (!cancelled) {
            setData({
              btc_dominance: j.data?.market_cap_percentage?.btc ?? 0,
              total_market_cap_usd: j.data?.total_market_cap?.usd ?? 0,
              market_cap_change_percentage_24h_usd:
                j.data?.market_cap_change_percentage_24h_usd ?? 0,
            });
            setLoading(false);
          }
        },
      )
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useAssets() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,avalanche-2,polkadot&order=market_cap_desc&sparkline=false&price_change_percentage=24h",
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const json: Asset[] = await res.json();
        if (!cancelled) setData(json.length > 0 ? json : FALLBACK_ASSETS);
      } catch {
        if (!cancelled) setData(FALLBACK_ASSETS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useWeeklyAnalysis() {
  const [data, setData] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1w&limit=8",
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const raw: unknown[][] = await res.json();
        const candles = parseBinanceCandles(raw);
        if (!cancelled && candles.length >= 2) setData(analyzeTrend(candles));
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

function useDailyAnalysis() {
  const [data, setData] = useState<DailyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=15",
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const raw: unknown[][] = await res.json();
        const candles = parseBinanceCandles(raw);
        if (candles.length < 5) throw new Error("insufficient data");

        const last = candles[candles.length - 1];

        // 14-candle trend
        const trendCandles = candles.slice(-14);
        const upCount14 = trendCandles.filter((c) => c.close > c.open).length;
        const bullProb =
          Math.round(((upCount14 / trendCandles.length) * 100) / 5) * 5;
        const bearProb = 100 - bullProb;

        let trend: Trend;
        const prev = candles[candles.length - 2];
        if (last.close > last.open) {
          trend = "Bullish";
        } else if (last.close < last.open && prev && last.close < prev.close) {
          trend = "Bearish";
        } else {
          trend = "Neutral";
        }

        const last5 = candles.slice(-5);
        const dailyLow = Math.min(...last5.map((c) => c.low));
        const dailyHigh = Math.max(...last5.map((c) => c.high));
        const dailySupport = round100(dailyLow * 0.995);
        const dailyResistance = round100(dailyHigh * 1.005);

        const allLow = Math.min(...candles.map((c) => c.low));
        const allHigh = Math.max(...candles.map((c) => c.high));
        const support = round100(allLow * 0.99);
        const resistance = round100(allHigh * 1.01);

        const dailyChange = ((last.close - last.open) / last.open) * 100;

        const last3 = candles.slice(-3);
        let shortTermMomentum: string;
        if (
          dailyChange > 2 &&
          last3[2]?.close > last3[1]?.close &&
          last3[1]?.close > last3[0]?.close
        ) {
          shortTermMomentum = "Strong Uptrend";
        } else if (
          dailyChange < -2 &&
          last3[2]?.close < last3[1]?.close &&
          last3[1]?.close < last3[0]?.close
        ) {
          shortTermMomentum = "Strong Downtrend";
        } else {
          shortTermMomentum = "Consolidation";
        }

        if (!cancelled) {
          setData({
            trend,
            bullProb,
            bearProb,
            weeklyChange:
              candles.length > 1
                ? ((last.close - candles[0].close) / candles[0].close) * 100
                : 0,
            support,
            resistance,
            candlePattern: detectCandlePattern(last),
            candles,
            dailyChange,
            shortTermMomentum,
            dailySupport,
            dailyResistance,
          });
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function useLiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TrendBadge({ trend }: { trend: Trend }) {
  const color =
    trend === "Bullish" ? C_GREEN : trend === "Bearish" ? C_RED : C_ORANGE;
  const Icon =
    trend === "Bullish"
      ? TrendingUp
      : trend === "Bearish"
        ? TrendingDown
        : Activity;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color, background: `${color}22` }}
    >
      <Icon className="h-3.5 w-3.5" />
      {trend}
    </span>
  );
}

function MetricRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold font-mono text-foreground">
          {value}
        </span>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function ProbBar({
  bull,
  bear,
}: {
  bull: number;
  bear: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Bullish {bull}%</span>
        <span>Bearish {bear}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: `${C_RED}33` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${bull}%`, background: C_GREEN }}
        />
      </div>
    </div>
  );
}

// ─── Section: News Feed ───────────────────────────────────────────────────────
function NewsFeed() {
  const { data, loading, usingFallback, lastFetched, refresh, fetchError } =
    useNewsItems();

  const cacheLabel = lastFetched
    ? `Atualizado ${new Date(lastFetched).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <Card
      className="border-border h-full flex flex-col"
      style={{ background: BG_CARD }}
      data-ocid="news.feed.card"
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" style={{ color: C_GOLD }} />
            Top Crypto News
          </CardTitle>
          <div className="flex items-center gap-2">
            {usingFallback && (
              <Badge
                variant="outline"
                className="text-[10px] text-yellow-500/80"
              >
                Cache antigo
              </Badge>
            )}
            {fetchError && (
              <Badge variant="outline" className="text-[10px] text-red-400/80">
                Sem dados
              </Badge>
            )}
            {cacheLabel && !usingFallback && !fetchError && (
              <span className="text-[10px] text-muted-foreground">
                {cacheLabel}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              className="p-1 rounded hover:bg-accent transition-colors"
              data-ocid="news.feed.button"
              title="Forçar atualização"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          SKEL_5.map((sk) => (
            <div
              key={sk}
              className="space-y-2 pb-3 border-b border-border"
              data-ocid="news.feed.loading_state"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Não foi possível carregar as notícias no momento.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-gold underline hover:no-underline"
              style={{ color: C_GOLD }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          data.map((item, idx) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid={`news.feed.item.${idx + 1}`}
              className="block group pb-3 border-b border-border last:border-0 last:pb-0 hover:bg-accent/30 -mx-1 px-1 rounded transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-foreground group-hover:text-gold line-clamp-2 transition-colors leading-relaxed">
                  {item.title}
                </p>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
                {item.body}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: C_GOLD }}
                >
                  {item.source}
                </span>
                <span className="text-[10px] text-muted-foreground/70 font-mono">
                  {fmtAbsDate(item.publishedOn)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {relTime(item.publishedOn)}
                </span>
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Yesterday Summary ───────────────────────────────────────────────
function YesterdaySummary() {
  const { data: candle, loading } = useYesterdayCandle();

  const change =
    candle && candle.open > 0
      ? ((candle.close - candle.open) / candle.open) * 100
      : null;

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.yesterday.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart2 className="h-4 w-4" style={{ color: C_GOLD }} />
          Yesterday's BTC Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" data-ocid="news.yesterday.loading_state">
            {SKEL_5.map((sk) => (
              <Skeleton key={sk} className="h-5 w-full" />
            ))}
          </div>
        ) : !candle ? (
          <p
            className="text-xs text-muted-foreground italic"
            data-ocid="news.yesterday.error_state"
          >
            Data unavailable
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            <MetricRow
              label="Close Price"
              value={<span style={{ color: C_GOLD }}>{fmt(candle.close)}</span>}
            />
            <MetricRow
              label="24h Change"
              value={
                change !== null ? (
                  <span
                    className="flex items-center gap-1"
                    style={{ color: change >= 0 ? C_GREEN : C_RED }}
                  >
                    {change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <MetricRow
              label="24h High"
              value={<span style={{ color: C_GREEN }}>{fmt(candle.high)}</span>}
            />
            <MetricRow
              label="24h Low"
              value={<span style={{ color: C_RED }}>{fmt(candle.low)}</span>}
            />
            <MetricRow label="Volume" value={fmtBTC(candle.volume)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Market Analysis ─────────────────────────────────────────────────
function MarketAnalysis() {
  const { data: ticker, loading: tickerLoading } = useTicker();
  const { data: fg, loading: fgLoading } = useFearGreed();
  const { data: cgGlobal, loading: cgLoading } = useCoinGeckoGlobal();

  const price = ticker ? Number(ticker.lastPrice) : 0;
  const change = ticker ? Number(ticker.priceChangePercent) : 0;
  const volume = ticker ? Number(ticker.quoteVolume) : 0;

  const momentum = Math.round(
    Math.min(Math.abs(change) * 5, 50) +
      (volume > 50_000_000_000 ? 50 : (volume / 50_000_000_000) * 50),
  );

  const ath = 108_000;
  const athRatio = price > 0 ? price / ath : 0;
  let fomoScore = 0;
  if (athRatio >= 0.95) fomoScore += 45;
  else if (athRatio >= 0.8) fomoScore += 30;
  else if (athRatio >= 0.6) fomoScore += 15;
  else fomoScore += 5;
  if (change > 10) fomoScore += 35;
  else if (change > 5) fomoScore += 20;
  else if (change > 2) fomoScore += 10;
  else if (change < -5) fomoScore -= 5;
  fomoScore = Math.max(0, Math.min(100, Math.round(fomoScore)));

  const fgValue = fg ? Number(fg.value) : null;
  const fgLabel = fg?.value_classification ?? "—";
  const fgColor =
    fgValue !== null
      ? fgValue <= 25
        ? C_RED
        : fgValue <= 45
          ? C_ORANGE
          : fgValue <= 55
            ? "#FACC15"
            : fgValue <= 75
              ? C_GREEN
              : "#16A34A"
      : C_GOLD;

  const allLoading = tickerLoading && fgLoading && cgLoading;

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.market.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" style={{ color: C_GOLD }} />
          Current Market Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allLoading ? (
          <div
            className="grid grid-cols-2 gap-2"
            data-ocid="news.market.loading_state"
          >
            {SKEL_6.map((sk) => (
              <Skeleton key={sk} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Current Price */}
            <div
              className="rounded-lg p-3 border border-border col-span-2"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Current Price
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xl font-bold font-mono"
                  style={{ color: C_GOLD }}
                >
                  {tickerLoading ? "—" : fmt(price)}
                </span>
                {!tickerLoading && (
                  <span
                    className="text-sm font-semibold"
                    style={{ color: change >= 0 ? C_GREEN : C_RED }}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* BTC Dominance */}
            <div
              className="rounded-lg p-3 border border-border"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-1">
                BTC Dominance
              </p>
              {cgLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: C_GOLD }}
                >
                  {cgGlobal ? `${cgGlobal.btc_dominance.toFixed(1)}%` : "—"}
                </span>
              )}
            </div>

            {/* Market Cap */}
            <div
              className="rounded-lg p-3 border border-border"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-1">
                Total Market Cap
              </p>
              {cgLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className="text-sm font-bold font-mono text-foreground">
                  {cgGlobal ? fmtCompact(cgGlobal.total_market_cap_usd) : "—"}
                </span>
              )}
            </div>

            {/* Fear & Greed */}
            <div
              className="rounded-lg p-3 border border-border"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-1">
                Fear & Greed
              </p>
              {fgLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div>
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: fgColor }}
                  >
                    {fgValue ?? "—"}
                  </span>
                  <span
                    className="ml-1.5 text-[10px]"
                    style={{ color: fgColor }}
                  >
                    {fgLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Momentum */}
            <div
              className="rounded-lg p-3 border border-border"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-1">Momentum</p>
              {tickerLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <div>
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: C_GOLD }}
                  >
                    {momentum}/100
                  </span>
                  <Progress value={momentum} className="h-1 mt-1.5" />
                </div>
              )}
            </div>

            {/* FOMO */}
            <div
              className="rounded-lg p-3 border border-border col-span-2"
              style={{ background: BG_DEEP }}
            >
              <p className="text-[10px] text-muted-foreground mb-1">
                FOMO Index
              </p>
              {tickerLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-bold font-mono"
                      style={{
                        color:
                          fomoScore >= 60
                            ? C_RED
                            : fomoScore >= 40
                              ? C_ORANGE
                              : C_GREEN,
                      }}
                    >
                      {fomoScore}/100
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        color:
                          fomoScore >= 60
                            ? C_RED
                            : fomoScore >= 40
                              ? C_ORANGE
                              : C_GREEN,
                        background:
                          fomoScore >= 60
                            ? `${C_RED}22`
                            : fomoScore >= 40
                              ? `${C_ORANGE}22`
                              : `${C_GREEN}22`,
                      }}
                    >
                      {fomoScore >= 80
                        ? "Extreme FOMO"
                        : fomoScore >= 60
                          ? "FOMO Building"
                          : fomoScore >= 40
                            ? "Calm"
                            : "Fear"}
                    </span>
                  </div>
                  <Progress value={fomoScore} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Assets in Focus ─────────────────────────────────────────────────
function AssetsInFocus() {
  const { data, loading } = useAssets();

  const sortedAssets = [...data].sort((a, b) => b.market_cap - a.market_cap);

  const topGainer = data.length
    ? [...data].sort(
        (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h,
      )[0]
    : null;
  const topLoser = data.length
    ? [...data].sort(
        (a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h,
      )[0]
    : null;

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.assets.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4" style={{ color: C_GOLD }} />
          Assets in Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4" data-ocid="news.assets.loading_state">
            {SKEL_5.map((sk) => (
              <Skeleton key={sk} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className="text-left text-[10px] text-muted-foreground border-b border-border"
                  style={{ background: BG_DEEP }}
                >
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Asset</th>
                  <th className="px-4 py-2 font-medium text-right">Price</th>
                  <th className="px-4 py-2 font-medium text-right">24h</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Market Cap
                  </th>
                  <th className="px-4 py-2 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map((asset, idx) => {
                  const chg = asset.price_change_percentage_24h;
                  const isGainer = topGainer?.id === asset.id;
                  const isLoser = topLoser?.id === asset.id;
                  return (
                    <tr
                      key={asset.id}
                      data-ocid={`news.assets.item.${idx + 1}`}
                      className="border-b border-border hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={asset.image}
                            alt={asset.name}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <span className="font-semibold text-foreground">
                            {asset.name}
                          </span>
                          <span className="text-muted-foreground uppercase">
                            {asset.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        {asset.current_price > 0
                          ? asset.current_price > 1
                            ? fmt(asset.current_price)
                            : `$${asset.current_price.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className="font-semibold"
                          style={{ color: chg >= 0 ? C_GREEN : C_RED }}
                        >
                          {chg >= 0 ? "+" : ""}
                          {chg !== 0 ? chg.toFixed(2) : "—"}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {asset.market_cap > 0
                          ? fmtCompact(asset.market_cap)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {isGainer && (
                          <Badge
                            className="text-[9px] px-1.5 py-0.5"
                            style={{
                              background: `${C_GREEN}22`,
                              color: C_GREEN,
                              border: `1px solid ${C_GREEN}44`,
                            }}
                          >
                            Top Gainer
                          </Badge>
                        )}
                        {isLoser && (
                          <Badge
                            className="text-[9px] px-1.5 py-0.5"
                            style={{
                              background: `${C_RED}22`,
                              color: C_RED,
                              border: `1px solid ${C_RED}44`,
                            }}
                          >
                            Top Loser
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: BTC Weekly Macro ────────────────────────────────────────────────
function WeeklyMacro() {
  const { data, loading } = useWeeklyAnalysis();

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.weekly.card"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4" style={{ color: C_GOLD }} />
            BTC Weekly — Macro
          </CardTitle>
          {data && <TrendBadge trend={data.trend} />}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" data-ocid="news.weekly.loading_state">
            {SKEL_6.map((sk) => (
              <Skeleton key={sk} className="h-5 w-full" />
            ))}
          </div>
        ) : !data ? (
          <p
            className="text-xs text-muted-foreground italic"
            data-ocid="news.weekly.error_state"
          >
            Weekly data unavailable
          </p>
        ) : (
          <div className="space-y-3">
            <ProbBar bull={data.bullProb} bear={data.bearProb} />

            <Separator />

            <div className="space-y-0 divide-y divide-border">
              <MetricRow
                label="Weekly Change"
                value={
                  <span
                    style={{
                      color: data.weeklyChange >= 0 ? C_GREEN : C_RED,
                    }}
                  >
                    {data.weeklyChange >= 0 ? "+" : ""}
                    {data.weeklyChange.toFixed(2)}%
                  </span>
                }
              />
              <MetricRow
                label="Support"
                value={
                  <span style={{ color: C_GREEN }}>{fmt(data.support)}</span>
                }
              />
              <MetricRow
                label="Resistance"
                value={
                  <span style={{ color: C_RED }}>{fmt(data.resistance)}</span>
                }
              />
              <MetricRow label="Candle Pattern" value={data.candlePattern} />
              <MetricRow
                label="Trend Probability"
                value={
                  data.trend === "Neutral"
                    ? `Bullish ${data.bullProb}% / Bearish ${data.bearProb}%`
                    : data.trend === "Bullish"
                      ? `${data.bullProb}% confidence`
                      : `${data.bearProb}% confidence`
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: BTC Daily Micro ─────────────────────────────────────────────────
function DailyMicro() {
  const { data, loading } = useDailyAnalysis();

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.daily.card"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" style={{ color: C_GOLD }} />
            BTC Daily — Micro
          </CardTitle>
          {data && <TrendBadge trend={data.trend} />}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" data-ocid="news.daily.loading_state">
            {SKEL_6.map((sk) => (
              <Skeleton key={sk} className="h-5 w-full" />
            ))}
          </div>
        ) : !data ? (
          <p
            className="text-xs text-muted-foreground italic"
            data-ocid="news.daily.error_state"
          >
            Daily data unavailable
          </p>
        ) : (
          <div className="space-y-3">
            <ProbBar bull={data.bullProb} bear={data.bearProb} />

            <Separator />

            <div className="space-y-0 divide-y divide-border">
              <MetricRow
                label="Daily Change"
                value={
                  <span
                    style={{
                      color: data.dailyChange >= 0 ? C_GREEN : C_RED,
                    }}
                  >
                    {data.dailyChange >= 0 ? "+" : ""}
                    {data.dailyChange.toFixed(2)}%
                  </span>
                }
              />
              <MetricRow
                label="Daily Support"
                value={
                  <span style={{ color: C_GREEN }}>
                    {fmt(data.dailySupport)}
                  </span>
                }
              />
              <MetricRow
                label="Daily Resistance"
                value={
                  <span style={{ color: C_RED }}>
                    {fmt(data.dailyResistance)}
                  </span>
                }
              />
              <MetricRow
                label="Short-Term Momentum"
                value={
                  <span
                    style={{
                      color:
                        data.shortTermMomentum === "Strong Uptrend"
                          ? C_GREEN
                          : data.shortTermMomentum === "Strong Downtrend"
                            ? C_RED
                            : C_ORANGE,
                    }}
                  >
                    {data.shortTermMomentum}
                  </span>
                }
              />
              <MetricRow label="Candle Pattern" value={data.candlePattern} />
              <MetricRow
                label="Trend Probability"
                value={
                  data.trend === "Neutral"
                    ? `Bullish ${data.bullProb}% / Bearish ${data.bearProb}%`
                    : data.trend === "Bullish"
                      ? `${data.bullProb}% confidence`
                      : `${data.bearProb}% confidence`
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Predictions ─────────────────────────────────────────────────────
function Predictions() {
  const { data: weekly, loading: wLoading } = useWeeklyAnalysis();
  const { data: daily } = useDailyAnalysis();
  const { data: ticker } = useTicker();

  const price = ticker ? Number(ticker.lastPrice) : 0;

  const loading = wLoading;

  const predictions =
    weekly && price > 0
      ? (() => {
          const bullCase = round100(weekly.resistance * 1.05);
          const baseCase = round100(price);
          const bearCase = round100(weekly.support * 0.95);

          let bullProb: number;
          let baseProb: number;
          let bearProb: number;

          if (weekly.trend === "Bullish") {
            bullProb = weekly.bullProb;
            baseProb = 15;
            bearProb = 100 - weekly.bullProb - 15;
          } else if (weekly.trend === "Bearish") {
            bearProb = weekly.bearProb;
            baseProb = 15;
            bullProb = 100 - weekly.bearProb - 15;
          } else {
            bullProb = 35;
            baseProb = 30;
            bearProb = 35;
          }

          // clamp
          bullProb = Math.max(5, bullProb);
          bearProb = Math.max(5, bearProb);
          baseProb = Math.max(5, baseProb);

          return {
            bullCase,
            baseCase,
            bearCase,
            bullProb,
            baseProb,
            bearProb,
          };
        })()
      : null;

  const keyLevels = [
    {
      label: "Daily Support",
      value: daily ? daily.dailySupport : null,
      color: C_GREEN,
    },
    {
      label: "Daily Resistance",
      value: daily ? daily.dailyResistance : null,
      color: C_RED,
    },
    {
      label: "Weekly Support",
      value: weekly ? weekly.support : null,
      color: C_GREEN,
    },
    {
      label: "Weekly Resistance",
      value: weekly ? weekly.resistance : null,
      color: C_RED,
    },
  ];

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.predictions.card"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" style={{ color: C_GOLD }} />
          BTC Price Predictions
          {weekly && (
            <Badge
              variant="outline"
              className="ml-auto text-[10px]"
              style={{ color: C_GOLD, borderColor: `${C_GOLD}44` }}
            >
              Based on {weekly.trend} trend
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3" data-ocid="news.predictions.loading_state">
            {SKEL_4.map((sk) => (
              <Skeleton key={sk} className="h-10 w-full" />
            ))}
          </div>
        ) : !predictions ? (
          <p
            className="text-xs text-muted-foreground italic"
            data-ocid="news.predictions.error_state"
          >
            Insufficient data for predictions
          </p>
        ) : (
          <div className="space-y-4">
            {/* Scenarios */}
            <div className="space-y-3">
              {[
                {
                  label: "Bull Case",
                  target: predictions.bullCase,
                  prob: predictions.bullProb,
                  color: C_GREEN,
                  desc: "Breakout above weekly resistance",
                },
                {
                  label: "Base Case",
                  target: predictions.baseCase,
                  prob: predictions.baseProb,
                  color: C_GOLD,
                  desc: "Consolidation near current price",
                },
                {
                  label: "Bear Case",
                  target: predictions.bearCase,
                  prob: predictions.bearProb,
                  color: C_RED,
                  desc: "Correction to weekly support zone",
                },
              ].map((scenario) => (
                <div
                  key={scenario.label}
                  className="rounded-lg p-3 border border-border"
                  style={{ background: BG_DEEP }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: scenario.color }}
                      >
                        {scenario.label}
                      </span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {scenario.desc}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-sm font-bold font-mono"
                        style={{ color: scenario.color }}
                      >
                        {fmt(scenario.target)}
                      </span>
                      <div
                        className="text-[10px]"
                        style={{ color: scenario.color }}
                      >
                        {scenario.prob}% probability
                      </div>
                    </div>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: `${scenario.color}22` }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scenario.prob}%`,
                        background: scenario.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Key Levels */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Key Levels to Watch
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {keyLevels.map((level) => (
                  <div
                    key={level.label}
                    className="rounded-lg p-2.5 border border-border text-center"
                    style={{ background: BG_DEEP }}
                  >
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {level.label}
                    </p>
                    <p
                      className="text-xs font-bold font-mono"
                      style={{ color: level.color }}
                    >
                      {level.value !== null ? fmt(level.value) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 rounded-lg p-2.5 border border-border">
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 mt-0.5"
                style={{ color: C_ORANGE }}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Predictions are based on technical indicators only and are not
                financial advice. Past performance is not indicative of future
                results.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Day Summary & Analysis ─────────────────────────────────────────
function buildNarrative(
  price: number,
  change: number,
  fgValue: number | null,
  fgLabel: string,
  btcDom: number,
  weeklyTrend: string,
  dailyTrend: string,
  shortTermMomentum: string | null,
  weeklyChange: number,
  dailyChange: number,
): string[] {
  const paragraphs: string[] = [];

  const dir = change >= 0 ? "alta" : "queda";
  const magnitude =
    Math.abs(change) > 5
      ? "expressivo"
      : Math.abs(change) > 2
        ? "moderado"
        : "contido";
  paragraphs.push(
    `O Bitcoin opera atualmente em ${fmt(price)}, acumulando ${change >= 0 ? "+" : ""}${change.toFixed(2)}% nas últimas 24 horas — movimento de ${dir} ${magnitude}.`,
  );

  if (fgValue !== null) {
    const sentiment =
      fgValue >= 75
        ? "de ganância extrema"
        : fgValue >= 55
          ? "de otimismo"
          : fgValue <= 25
            ? "de medo extremo"
            : fgValue <= 45
              ? "de cautela"
              : "neutro";
    const domComment =
      btcDom > 55
        ? "sinalizando rotação de capital para Bitcoin"
        : btcDom > 45
          ? "dentro da média histórica recente"
          : "mostrando interesse elevado em altcoins";
    paragraphs.push(
      `O índice Fear & Greed marca ${fgValue} (${fgLabel}), indicando um sentimento ${sentiment} no mercado. A dominância do BTC está em ${btcDom.toFixed(1)}%, ${domComment}.`,
    );
  }

  paragraphs.push(
    `Na análise técnica, a tendência semanal é ${weeklyTrend.toLowerCase()} (${weeklyChange >= 0 ? "+" : ""}${weeklyChange.toFixed(1)}% na semana) e a tendência diária aponta ${dailyTrend.toLowerCase()}. O momentum de curto prazo é caracterizado como ${shortTermMomentum?.toLowerCase() ?? "indefinido"}.`,
  );

  const dailyDir = dailyChange >= 0 ? "alta" : "baixa";
  const dailyMag =
    Math.abs(dailyChange) > 3
      ? "forte pressão"
      : Math.abs(dailyChange) > 1
        ? "pressão moderada"
        : "pressão discreta";
  paragraphs.push(
    `No diário, o BTC registra ${dailyChange >= 0 ? "+" : ""}${dailyChange.toFixed(2)}% — ${dailyMag} de ${dailyDir}. Acompanhe os níveis de suporte e resistência nas seções de análise abaixo.`,
  );

  return paragraphs;
}

function DaySummaryAnalysis() {
  const { data: ticker, loading: tLoading } = useTicker();
  const { data: fg, loading: fgLoading } = useFearGreed();
  const { data: global, loading: gLoading } = useCoinGeckoGlobal();
  const { data: weekly, loading: wLoading } = useWeeklyAnalysis();
  const { data: daily, loading: dLoading } = useDailyAnalysis();

  const anyLoading = tLoading || fgLoading || gLoading || wLoading || dLoading;

  const price = ticker ? Number.parseFloat(ticker.lastPrice) : 0;
  const change24h = ticker ? Number.parseFloat(ticker.priceChangePercent) : 0;
  const fgValue = fg ? Number.parseInt(fg.value, 10) : null;
  const fgLabel = fg?.value_classification ?? "";
  const btcDom = global?.btc_dominance ?? 0;

  const paragraphs =
    !anyLoading && price > 0
      ? buildNarrative(
          price,
          change24h,
          fgValue,
          fgLabel,
          btcDom,
          weekly?.trend ?? "Neutral",
          daily?.trend ?? "Neutral",
          daily?.shortTermMomentum ?? null,
          weekly?.weeklyChange ?? 0,
          daily?.dailyChange ?? 0,
        )
      : [];

  return (
    <Card
      className="border-border"
      style={{ background: BG_CARD }}
      data-ocid="news.day_summary.card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" style={{ color: C_GOLD }} />
          Resumo do Dia & Análise
          <Badge
            variant="outline"
            className="ml-auto text-[9px] font-semibold"
            style={{ color: C_GOLD, borderColor: `${C_GOLD}40` }}
          >
            Gerado às{" "}
            {new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anyLoading ? (
          <div className="space-y-2" data-ocid="news.day_summary.loading_state">
            {SKEL_4.map((sk) => (
              <Skeleton key={sk} className="h-3 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {p}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function NewsPage() {
  const clock = useLiveClock();

  return (
    <div
      className="min-h-screen p-4 space-y-4"
      style={{ background: "oklch(0.11 0.015 240)" }}
      data-ocid="news.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-8 rounded-full"
            style={{ background: C_GOLD }}
          />
          <div>
            <h1
              className="text-lg font-bold font-display"
              style={{ color: C_GOLD }}
            >
              News & Analysis
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Live crypto intelligence — BTC focus
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border"
          style={{ background: BG_CARD }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] text-muted-foreground">Updated:</span>
          <span
            className="text-[11px] font-mono font-bold"
            style={{ color: C_GOLD }}
          >
            {clock}
          </span>
        </div>
      </div>

      {/* Day Summary & Analysis */}
      <DaySummaryAnalysis />

      {/* Top section: 2-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* News Feed — wider col */}
        <div className="lg:col-span-2" style={{ minHeight: 560 }}>
          <NewsFeed />
        </div>

        {/* Right column: Yesterday + Market Analysis */}
        <div className="flex flex-col gap-4">
          <YesterdaySummary />
          <MarketAnalysis />
        </div>
      </div>

      {/* Assets in Focus — full width */}
      <AssetsInFocus />

      {/* BTC Analysis — 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyMacro />
        <DailyMicro />
      </div>

      {/* Predictions — full width */}
      <Predictions />
    </div>
  );
}
