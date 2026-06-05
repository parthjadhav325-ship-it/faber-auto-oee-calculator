import { createFileRoute, Link } from "@tanstack/react-router";
import { useMachines } from "@/lib/oee-data";
import { RequireRole, useAuth } from "@/lib/auth";
import { LogOut, Factory } from "lucide-react";

export const Route = createFileRoute("/operator/")({
  head: () => ({ meta: [{ title: "Operator Portal · OEE Control" }] }),
  component: () => (
    <RequireRole roles={["operator", "supervisor", "manager", "admin"]}>
      <OperatorPicker />
    </RequireRole>
  ),
});

function OperatorPicker() {
  const { data: machines = [], isLoading } = useMachines();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Select Your Machine</h1>
            <p className="text-xs text-muted-foreground">
              Operator {user?.employee_id} · {user?.name}
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading machines…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {machines.map((m) => (
              <Link
                key={m.id}
                to="/operator/$machineId"
                params={{ machineId: m.id }}
                className="panel p-5 hover:border-primary transition-colors flex items-center gap-4"
              >
                <div className="size-12 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <Factory className="size-6" />
                </div>
                <div>
                  <div className="font-semibold">{m.machine_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.machine_code} · {m.line}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
