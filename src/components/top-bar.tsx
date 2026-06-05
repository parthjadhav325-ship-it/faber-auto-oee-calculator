import { useEffect, useState } from "react";

export function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <header className="h-16 border-b border-border bg-panel/60 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {right}
        <div className="text-right tabular text-xs leading-tight">
          <div className="text-foreground">{now ? now.toLocaleTimeString() : "—"}</div>
          <div className="text-muted-foreground">{now ? now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "\u00a0"}</div>

        </div>
      </div>
    </header>
  );
}
