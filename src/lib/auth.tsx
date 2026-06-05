import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { UserRole } from "./sheets.functions";

export type Session = {
  employee_id: string;
  name: string;
  role: UserRole;
  default_machine_id: string;
};

const KEY = "oee.session.v1";

type Ctx = {
  user: Session | null;
  ready: boolean;
  login: (s: Session) => void;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const login = (s: Session) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    setUser(s);
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function landingFor(role: UserRole, defaultMachineId: string): string {
  switch (role) {
    case "operator":
      return defaultMachineId ? `/operator/${defaultMachineId}` : "/operator";
    case "supervisor":
      return "/supervisor";
    case "manager":
    case "admin":
    default:
      return "/";
  }
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/login" });
    } else if (!roles.includes(user.role)) {
      navigate({ to: landingFor(user.role, user.default_machine_id) });
    }
  }, [ready, user, roles, navigate]);

  if (!ready) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user || !roles.includes(user.role)) {
    return <div className="p-8 text-sm text-muted-foreground">Redirecting…</div>;
  }
  return <>{children}</>;
}

export function currentShift(d = new Date()): "A" | "B" | "C" {
  const h = d.getHours();
  if (h >= 6 && h < 14) return "A";
  if (h >= 14 && h < 22) return "B";
  return "C";
}
