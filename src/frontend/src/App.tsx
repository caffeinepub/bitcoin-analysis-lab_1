import { useEffect, useState } from "react";
import { ChartPanel } from "./components/ChartPanel";
import { EventsTimeline } from "./components/EventsTimeline";
import { FearGreed } from "./components/FearGreed";
import { Header } from "./components/Header";
import { MajorMoves } from "./components/MajorMoves";
import { SimilarityPanel } from "./components/SimilarityPanel";
import { StatsPanel } from "./components/StatsPanel";
import { UpcomingEvents } from "./components/UpcomingEvents";
import type { Timeframe } from "./types";

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Enforce dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.11 0.015 240)" }}
    >
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main 3-column layout */}
      <div
        className="flex-1 grid gap-2 p-2 overflow-hidden"
        style={{
          gridTemplateColumns: "280px 1fr 300px",
          gridTemplateRows: "1fr",
          minHeight: "calc(100vh - 56px - 2rem - 280px)",
        }}
      >
        {/* Left sidebar: Events Timeline */}
        <aside
          className="rounded border border-border overflow-hidden flex flex-col"
          style={{
            background: "oklch(0.14 0.025 240)",
            minHeight: 500,
            maxHeight: "calc(100vh - 56px - 2rem - 280px)",
          }}
        >
          <EventsTimeline />
        </aside>

        {/* Center: Chart panel */}
        <main
          className="rounded border border-border overflow-hidden flex flex-col"
          style={{
            background: "oklch(0.14 0.025 240)",
            minHeight: 500,
            maxHeight: "calc(100vh - 56px - 2rem - 280px)",
          }}
        >
          <ChartPanel timeframe={timeframe} onTimeframeChange={setTimeframe} />
        </main>

        {/* Right sidebar */}
        <aside
          className="rounded border border-border overflow-hidden flex flex-col gap-0"
          style={{
            background: "oklch(0.14 0.025 240)",
            minHeight: 500,
            maxHeight: "calc(100vh - 56px - 2rem - 280px)",
            overflowY: "auto",
          }}
        >
          <FearGreed />
          <div className="border-t border-border" />
          <SimilarityPanel />
          <div className="border-t border-border" />
          <UpcomingEvents />
        </aside>
      </div>

      {/* Bottom section */}
      <div
        className="grid gap-2 px-2 pb-2"
        style={{ gridTemplateColumns: "1fr 480px", height: "260px" }}
      >
        {/* Major Moves */}
        <div
          className="rounded border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          <MajorMoves />
        </div>

        {/* Stats Panel */}
        <div
          className="rounded border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          <StatsPanel />
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-[10px] text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
