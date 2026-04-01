import { useQuery } from "@tanstack/react-query";
import { fetchBTCCandles } from "../services/binance";
import type { Timeframe } from "../types";
import { useActor } from "./useActor";

export function useBTCCandles(timeframe: Timeframe) {
  return useQuery({
    queryKey: ["btc-candles", timeframe],
    queryFn: () => fetchBTCCandles(timeframe),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

export function useHistoricalEvents() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["historical-events"],
    queryFn: async () => {
      if (!actor) return [];
      const start =
        BigInt(new Date("2009-01-01").getTime()) * BigInt(1_000_000);
      const end = BigInt(Date.now()) * BigInt(1_000_000);
      return actor.getEventsWindow(start, end);
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMajorMoves() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["major-moves"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMajorMovesWithEvents();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFutureEvents() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["future-events"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFutureEvents();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 10,
  });
}

export function useSimilarity(currentPrice: number, recentReturnPct: number) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: [
      "similarity",
      Math.round(currentPrice),
      Math.round(recentReturnPct * 100),
    ],
    queryFn: async () => {
      if (!actor || currentPrice === 0) return [];
      return actor.analyzeCurrentContext(currentPrice, recentReturnPct);
    },
    enabled: !!actor && !isFetching && currentPrice > 0,
    staleTime: 1000 * 60 * 5,
  });
}
