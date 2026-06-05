import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, LogIn } from "lucide-react";
import { loginUser } from "@/lib/sheets.functions";
import { landingFor, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In · OEE Control" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: landingFor(user.role, user.default_machine_id) });
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) return;
    setBusy(true);
    try {
      const session = await loginUser({ data: { employee_id: employeeId, password } });
      login(session);
      toast.success(`Welcome, ${session.name}`);
      navigate({ to: landingFor(session.role, session.default_machine_id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid place-items-center bg-background p-6">
      <form
        onSubmit={submit}
        className="panel w-full max-w-sm p-8 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Activity className="size-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-base font-semibold tracking-wide">OEE CONTROL</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-[0.18em]">
              Plant Operator Portal
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Employee ID
            </span>
            <input
              autoFocus
              className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. admin"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Password
            </span>
            <input
              type="password"
              className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60"
        >
          <LogIn className="size-4" />
          {busy ? "Signing in…" : "Sign In"}
        </button>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          First-time setup: default admin <code className="text-foreground">admin</code> /
          <code className="text-foreground"> admin</code>. Manage users in Admin → Users.
        </p>
      </form>
    </div>
  );
}
