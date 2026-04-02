import { useEffect, useState } from "react";
import { ChartPanel } from "./components/ChartPanel";
import { ComparativeChartsPage } from "./components/ComparativeChartsPage";
import { EventsTimeline } from "./components/EventsTimeline";
import { FearGreed } from "./components/FearGreed";
import { Header } from "./components/Header";
import { HistoricalEventsPage } from "./components/HistoricalEventsPage";
import { MajorMoves } from "./components/MajorMoves";
import { NewsPage } from "./components/NewsPage";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { ReportsPage } from "./components/ReportsPage";
import { SimilarityEnginePage } from "./components/SimilarityEnginePage";
import { SimilarityPanel } from "./components/SimilarityPanel";
import { StatsPanel } from "./components/StatsPanel";
import { UpcomingEvents } from "./components/UpcomingEvents";
import type { Timeframe } from "./types";

const C_GOLD = "#F2B24C";

function PageShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: string;
  onTabChange: (t: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.11 0.015 240)" }}
    >
      <Header activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1">{children}</div>
      <footer className="text-center py-3 text-[10px] text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: C_GOLD }}
        >
          caffeine.ai
        </a>
      </footer>
      <PwaInstallBanner />
    </div>
  );
}

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [chartFullscreen, setChartFullscreen] = useState(false);

  // Enforce dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!chartFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChartFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chartFullscreen]);

  if (activeTab === "Historical Events") {
    return (
      <PageShell activeTab={activeTab} onTabChange={setActiveTab}>
        <HistoricalEventsPage />
      </PageShell>
    );
  }

  if (activeTab === "Reports") {
    return (
      <PageShell activeTab={activeTab} onTabChange={setActiveTab}>
        <ReportsPage />
      </PageShell>
    );
  }

  if (activeTab === "Similarity Engine") {
    return (
      <PageShell activeTab={activeTab} onTabChange={setActiveTab}>
        <SimilarityEnginePage />
      </PageShell>
    );
  }

  if (activeTab === "Comparative") {
    return (
      <PageShell activeTab={activeTab} onTabChange={setActiveTab}>
        <ComparativeChartsPage />
      </PageShell>
    );
  }

  if (activeTab === "News") {
    return (
      <PageShell activeTab={activeTab} onTabChange={setActiveTab}>
        <NewsPage />
      </PageShell>
    );
  }

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
          <ChartPanel
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onToggleFullscreen={() => setChartFullscreen(true)}
            isFullscreen={false}
          />
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
        <div
          className="rounded border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          <MajorMoves />
        </div>
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
          className="hover:underline"
          style={{ color: C_GOLD }}
        >
          caffeine.ai
        </a>
      </footer>

      <PwaInstallBanner />

      {/* Fullscreen chart overlay */}
      {chartFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "oklch(0.11 0.015 240)" }}
        >
          <ChartPanel
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isFullscreen={true}
            onToggleFullscreen={() => setChartFullscreen(false)}
          />
        </div>
      )}
    </div>
  );
}
