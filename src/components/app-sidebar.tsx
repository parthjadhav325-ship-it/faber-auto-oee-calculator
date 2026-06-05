import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Eye,
  Factory,
  Gauge,
  LogOut,
  PackagePlus,
  Power,
  Settings2,
  Users,
  XOctagon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/sheets.functions";

type NavItem = { to: string; label: string; icon: typeof Activity; roles: UserRole[] };
type NavGroup = { group: string; items: NavItem[] };

const ALL: NavGroup[] = [
  { group: "Operator", items: [
    { to: "/operator", label: "Operator Portal", icon: Power, roles: ["operator","supervisor","manager","admin"] },
  ]},
  { group: "Live", items: [
    { to: "/supervisor", label: "Supervisor Board", icon: Eye, roles: ["supervisor","manager","admin"] },
    { to: "/control", label: "Machine Control", icon: Power, roles: ["manager","admin"] },
  ]},
  { group: "Dashboards", items: [
    { to: "/", label: "Daily Dashboard", icon: Gauge, roles: ["manager","admin"] },
    { to: "/monthly", label: "Monthly Dashboard", icon: Calendar, roles: ["manager","admin"] },
    { to: "/plant", label: "Plant Summary", icon: Factory, roles: ["manager","admin"] },
  ]},
  { group: "Data Entry", items: [
    { to: "/production", label: "Production Entry", icon: PackagePlus, roles: ["manager","admin"] },
    { to: "/rejection", label: "Rejection Entry", icon: XOctagon, roles: ["manager","admin"] },
  ]},
  { group: "Admin", items: [
    { to: "/machines", label: "Machine Master", icon: Settings2, roles: ["admin"] },
    { to: "/admin/users", label: "User Management", icon: Users, roles: ["admin"] },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();
  const role: UserRole = user?.role ?? "manager"; // pre-login briefly shows nothing; routes guard themselves

  const nav = ALL
    .map((g) => ({ ...g, items: g.items.filter((it) => it.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

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
      <div className="border-t border-sidebar-border p-4 space-y-3">
        {user ? (
          <>
            <div className="text-xs">
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground capitalize">{user.role} · {user.employee_id}</div>
            </div>
            <button
              onClick={logout}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="text-xs text-primary hover:underline">Sign in</Link>
        )}
        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse" />
          Live · Plant 01
        </div>
      </div>
    </aside>
  );
}
