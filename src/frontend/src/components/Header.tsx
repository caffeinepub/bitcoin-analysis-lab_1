import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronDown, Search } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  "Dashboard",
  "Historical Events",
  "Similarity Engine",
  "Reports",
  "Academy",
];

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 h-14 flex items-center px-4 gap-6 border-b border-border"
      style={{ background: "oklch(0.12 0.02 240)" }}
      data-ocid="header.panel"
    >
      <div className="flex items-baseline gap-2 shrink-0">
        <span className="font-display font-extrabold text-2xl tracking-tight text-gold">
          BHAL
        </span>
        <span className="hidden lg:block text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          Bitcoin Historical Analysis Laboratory
        </span>
      </div>

      <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item}
            data-ocid={`nav.${item.toLowerCase().replace(/ /g, "_")}.link`}
            onClick={() => onTabChange(item)}
            className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-colors whitespace-nowrap ${
              activeTab === item
                ? "bg-primary/10 text-gold border border-gold/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            data-ocid="header.search_input"
            type="text"
            placeholder="Search events..."
            className="pl-8 pr-3 py-1.5 rounded text-xs bg-muted/50 border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 w-40 placeholder:text-muted-foreground text-foreground"
          />
        </div>
        <button
          type="button"
          className="relative p-1.5 rounded hover:bg-accent transition-colors"
          data-ocid="header.notifications.button"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gold" />
        </button>
        <div className="flex items-center gap-1.5 cursor-pointer">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary/20 text-gold">
              BT
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
