import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Factory,
  Gauge,
  PackagePlus,
  Power,
  Settings2,
  XOctagon,
} from "lucide-react";

const nav = [
  { group: "Operator", items: [
    { to: "/control", label: "Machine Control", icon: Power },
  ]},
  { group: "Operations", items: [
    { to: "/", label: "Daily Dashboard", icon: Gauge },
    { to: "/monthly", label: "Monthly Dashboard", icon: Calendar },
    { to: "/plant", label: "Plant Summary", icon: Factory },
  ]},
  { group: "Data Entry", items: [
    { to: "/production", label: "Production Entry", icon: PackagePlus },
    { to: "/rejection", label: "Rejection Entry", icon: XOctagon },
  ]},
  { group: "Master", items: [
    { to: "/machines", label: "Machine Master", icon: Settings2 },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Activity className="size-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">OEE CONTROL</div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-[0.18em]">Plant Ops v1.0</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {nav.map((g) => (
          <div key={g.group}>
            <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{g.group}</div>
            <ul className="space-y-1">
              {g.items.map((it) => {
                const active = pathname === it.to;
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                          : "hover:bg-sidebar-accent/60 border-l-2 border-transparent"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground flex items-center gap-2">
        <span className="size-2 rounded-full bg-success animate-pulse" />
        Live · Plant 01
      </div>
    </aside>
  );
}
