// Alternative.me Fear & Greed Index
export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

export async function fetchFearGreedIndex(): Promise<FearGreedData[]> {
  const res = await fetch("https://api.alternative.me/fng/?limit=7");
  if (!res.ok) throw new Error("Fear & Greed API error");
  const json = await res.json();
  return json.data as FearGreedData[];
}

// CoinGecko Global Market Data
export interface CoinGeckoGlobal {
  btc_dominance: number;
  total_market_cap_usd: number;
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies: number;
}

export async function fetchCoinGeckoGlobal(): Promise<CoinGeckoGlobal> {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  if (!res.ok) throw new Error("CoinGecko API error");
  const json = await res.json();
  const d = json.data;
  return {
    btc_dominance: d.market_cap_percentage?.btc ?? 0,
    total_market_cap_usd: d.total_market_cap?.usd ?? 0,
    market_cap_change_percentage_24h_usd:
      d.market_cap_change_percentage_24h_usd ?? 0,
    active_cryptocurrencies: d.active_cryptocurrencies ?? 0,
  };
}

// Blockchain.info Network Stats
export interface BlockchainStats {
  hash_rate: number;
  n_tx: number;
  total_fees_btc: number;
  difficulty: number;
}

export async function fetchBlockchainStats(): Promise<BlockchainStats> {
  const res = await fetch("https://api.blockchain.info/stats");
  if (!res.ok) throw new Error("Blockchain.info API error");
  const json = await res.json();
  return {
    hash_rate: json.hash_rate ?? 0,
    n_tx: json.n_tx ?? 0,
    total_fees_btc: json.total_fees_btc ?? 0,
    difficulty: json.difficulty ?? 0,
  };
}
