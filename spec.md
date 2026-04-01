# Bitcoin Analysis Lab

## Current State
New project — no existing code.

## Requested Changes (Diff)

### Add
- Full Motoko backend with curated dataset of 40+ historical BTC events (2009–2026), major moves, future events
- Backend query methods: getEventsWindow, getMajorMovesWithEvents, getFutureEvents, analyzeCurrentContext
- React frontend with lightweight-charts candlestick chart fetching real OHLCV from Binance /api/v3/klines
- Event markers overlaid on chart (halvings, Fed, ETF, crises, bans)
- Timeframe selector: 1D / 1W / 1M
- Major Moves detector panel (>10% moves highlighted)
- Events timeline sidebar with event type filters
- Current Context Similarity card (top 3 similar historical periods)
- Upcoming events countdown with pre-event behavior stats
- Fear & Greed / sentiment indicator panel (derived from price volatility + trend)
- Statistics panel: avg return 30/90 days after each event type
- Similarity engine running in frontend: DTW-lite pattern matching on recent price window vs historical windows

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Motoko: define types (HistoricalEvent, MajorMove, FutureEvent, SimilarityResult), preload rich dataset, implement query methods
2. Frontend: Binance API service, lightweight-charts integration, event marker overlay
3. Frontend: similarity engine (cosine similarity on normalized price windows)
4. Frontend: all UI panels — chart, timeline sidebar, similarity card, major moves list, upcoming events, stats
5. Wire backend data into frontend via generated bindings
