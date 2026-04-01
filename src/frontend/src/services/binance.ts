import type { OHLCVCandle, Timeframe } from "../types";

function msToDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchBinance(interval: Timeframe): Promise<OHLCVCandle[]> {
  const limit = interval === "1d" ? 1000 : interval === "1w" ? 520 : 120;
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
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

async function fetchCryptoCompare(interval: Timeframe): Promise<OHLCVCandle[]> {
  const endpoint =
    interval === "1d"
      ? "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000"
      : interval === "1w"
        ? "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000&aggregate=7"
        : "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=2000&aggregate=30";
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
    .filter((r) => r.close > 0)
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
