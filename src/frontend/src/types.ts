export interface OHLCVCandle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number; // ms
}

export type Timeframe = "1d" | "1w" | "1M";

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
