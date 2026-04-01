import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface HistoricalEvent {
    id: bigint;
    title: string;
    source: string;
    importance: number;
    description: string;
    predictability: number;
    timestamp: Time;
    eventType: EventType;
}
export interface MajorMove {
    id: bigint;
    startTime: Time;
    returnPct: number;
    direction: Direction;
    endTime: Time;
    relatedEvents: Array<bigint>;
}
export interface FutureEvent {
    id: bigint;
    title: string;
    importance: number;
    description: string;
    predictability: number;
    expectedTime: Time;
    eventType: EventType;
}
export type Time = bigint;
export interface SimilarityResult {
    startTime: Time;
    keyEvents: Array<string>;
    endTime: Time;
    returnPct30d: number;
    returnPct90d: number;
    similarityScore: number;
    periodLabel: string;
}
export enum Direction {
    Alta = "Alta",
    Queda = "Queda"
}
export enum EventType {
    Geopolitico = "Geopolitico",
    Macro = "Macro",
    Estrutural = "Estrutural"
}
export interface backendInterface {
    analyzeCurrentContext(currentPrice: number, recentReturnPct: number): Promise<Array<SimilarityResult>>;
    getEventsWindow(start: Time, end: Time): Promise<Array<HistoricalEvent>>;
    getFutureEvents(): Promise<Array<FutureEvent>>;
    getMajorMovesWithEvents(): Promise<Array<[MajorMove, Array<HistoricalEvent>]>>;
}
