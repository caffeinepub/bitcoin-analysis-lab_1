import type { CompareTimeframe, OHLCVCandle, Timeframe } from "../types";

function msToDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function msToDateTimeString(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}`;
}

async function fetchBinance(interval: Timeframe): Promise<OHLCVCandle[]> {
  // Map Timeframe to Binance interval string and limit
  const binanceInterval =
    interval === "1h"
      ? "1h"
      : interval === "4h"
        ? "4h"
        : interval === "1d"
          ? "1d"
          : interval === "1w"
            ? "1w"
            : "1M";
  const limit =
    interval === "1h"
      ? 500
      : interval === "4h"
        ? 500
        : interval === "1d"
          ? 1000
          : interval === "1w"
            ? 520
            : 120;
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${binanceInterval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw: [number, string, string, string, string, string][] =
    await res.json();
  const useDateTime = interval === "1h" || interval === "4h";
  return raw.map((r) => ({
    time: useDateTime ? msToDateTimeString(r[0]) : msToDateString(r[0]),
    open: Number.parseFloat(r[1]),
    high: Number.parseFloat(r[2]),
    low: Number.parseFloat(r[3]),
    close: Number.parseFloat(r[4]),
    volume: Number.parseFloat(r[5]),
    timestamp: r[0],
  }));
}

async function fetchCryptoCompare(interval: Timeframe): Promise<OHLCVCandle[]> {
  let endpoint: string;
  if (interval === "1h") {
    endpoint =
      "https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=500";
  } else if (interval === "4h") {
    endpoint =
      "https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=500&aggregate=4";
  } else if (interval === "1d") {
    endpoint =
      "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000";
  } else if (interval === "1w") {
    endpoint =
      "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000&aggregate=7";
  } else {
    endpoint =
      "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000&aggregate=30";
  }
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const json = await res.json();
  const data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volumefrom: number;
  }[] = json?.Data?.Data ?? [];
  const useDateTime = interval === "1h" || interval === "4h";
  return data
    .filter((r) => r.close > 0)
    .map((r) => ({
      time: useDateTime
        ? msToDateTimeString(r.time * 1000)
        : msToDateString(r.time * 1000),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volumefrom,
      timestamp: r.time * 1000,
    }));
}

export async function fetchBTCCandles(
  interval: Timeframe,
): Promise<OHLCVCandle[]> {
  try {
    const data = await fetchBinance(interval);
    if (data.length > 0) return data;
    throw new Error("Empty Binance response");
  } catch {
    console.warn("Binance failed, falling back to CryptoCompare");
    return fetchCryptoCompare(interval);
  }
}

// Map CompareTimeframe to window size in ms (300 candles worth)
function getWindowMs(interval: CompareTimeframe): number {
  const map: Record<CompareTimeframe, number> = {
    "1m": 300 * 60 * 1000,
    "3m": 300 * 3 * 60 * 1000,
    "5m": 300 * 5 * 60 * 1000,
    "15m": 300 * 15 * 60 * 1000,
    "1h": 300 * 60 * 60 * 1000,
    "4h": 300 * 4 * 60 * 60 * 1000,
    "1d": 300 * 24 * 60 * 60 * 1000,
    "3d": 300 * 3 * 24 * 60 * 60 * 1000,
  };
  return map[interval];
}

export { getWindowMs };

async function fetchBinanceAt(
  interval: CompareTimeframe,
  startTime: number,
  endTime: number,
): Promise<OHLCVCandle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw: [number, string, string, string, string, string][] =
    await res.json();
  return raw.map((r) => ({
    time: msToDateString(r[0]),
    open: Number.parseFloat(r[1]),
    high: Number.parseFloat(r[2]),
    low: Number.parseFloat(r[3]),
    close: Number.parseFloat(r[4]),
    volume: Number.parseFloat(r[5]),
    timestamp: r[0],
  }));
}

async function fetchCryptoCompareAt(
  interval: CompareTimeframe,
  startTime: number,
  endTime: number,
): Promise<OHLCVCandle[]> {
  const isMinute = ["1m", "3m", "5m", "15m"].includes(interval);
  const isHour = ["1h", "4h"].includes(interval);
  const aggregate =
    interval === "3m"
      ? 3
      : interval === "5m"
        ? 5
        : interval === "15m"
          ? 15
          : interval === "4h"
            ? 4
            : interval === "3d"
              ? 3
              : 1;

  // toTs anchors the response to the correct historical period
  const toTs = Math.floor(endTime / 1000);

  const endpoint = isMinute
    ? `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=300&aggregate=${aggregate}&toTs=${toTs}`
    : isHour
      ? `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=300&aggregate=${aggregate}&toTs=${toTs}`
      : `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=300&aggregate=${aggregate}&toTs=${toTs}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const json = await res.json();
  const data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volumefrom: number;
  }[] = json?.Data?.Data ?? [];
  return data
    .filter(
      (r) =>
        r.close > 0 && r.time * 1000 >= startTime && r.time * 1000 <= endTime,
    )
    .map((r) => ({
      time: msToDateString(r.time * 1000),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volumefrom,
      timestamp: r.time * 1000,
    }));
}

export async function fetchBTCCandlesAt(
  interval: CompareTimeframe,
  startTime: number,
  endTime: number,
): Promise<OHLCVCandle[]> {
  // Try Binance first
  try {
    const data = await fetchBinanceAt(interval, startTime, endTime);
    if (data.length > 0) return data;
  } catch {
    console.warn("Binance fetchAt failed, trying CryptoCompare");
  }
  // Fallback to CryptoCompare
  try {
    const data = await fetchCryptoCompareAt(interval, startTime, endTime);
    if (data.length > 0) return data;
  } catch {
    console.warn("CryptoCompare fetchAt also failed");
  }
  throw new Error("No data available from any source for this period");
}
