export interface OHLCVCandle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number; // ms
}

export type Timeframe = "1h" | "4h" | "1d" | "1w" | "1M";

export type CompareTimeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "1h"
  | "4h"
  | "1d"
  | "3d";

export interface ChartMarker {
  index: number;
  time: string;
  color: string;
  label: string;
  eventType: string;
}

export interface FearGreedData {
  score: number;
  label: string;
  color: string;
}
