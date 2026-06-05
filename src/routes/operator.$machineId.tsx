import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Play, Square, X, ArrowLeft } from "lucide-react";
import {
  DOWNTIME_REASONS,
  useAddEvent,
  useEvents,
  useMachines,
} from "@/lib/oee-data";
import { currentShift, RequireRole, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/operator/$machineId")({
  head: () => ({ meta: [{ title: "Machine Operator · OEE Control" }] }),
  component: () => (
    <RequireRole roles={["operator", "supervisor", "manager", "admin"]}>
      <OperatorConsole />
    </RequireRole>
  ),
});

function pad(n: number) { return String(n).padStart(2, "0"); }
function hhmmss(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function OperatorConsole() {
  const { machineId } = Route.useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: machines = [] } = useMachines();
  const { data: events = [] } = useEvents();
  const addEvent = useAddEvent();

  const machine = useMemo(
    () => machines.find((m) => m.id === machineId),
    [machines, machineId],
  );

  const lastEvent = useMemo(() => {
    const evs = events.filter((e) => e.machine_id === machineId);
    if (!evs.length) return null;
    return [...evs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];
  }, [events, machineId]);

  const running = lastEvent?.event_type === "START";

  // live timer
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sinceMs = lastEvent ? now - new Date(lastEvent.timestamp).getTime() : 0;
  const elapsedMin = sinceMs / 60000;

  const downColor = !running && lastEvent
    ? elapsedMin >= 30 ? "destructive" : elapsedMin >= 10 ? "warning" : "success"
    : "success";

  const [stopOpen, setStopOpen] = useState(false);
  const [reason, setReason] = useState<string>(DOWNTIME_REASONS[0]);
  const [remarks, setRemarks] = useState("");

  const handleStart = () => {
    if (running) return;
    addEvent.mutate(
      {
        machine_id: machineId,
        event_type: "START",
        employee_id: user?.employee_id || "",
      },
      {
        onSuccess: () => toast.success("Machine started"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const handleStopConfirm = () => {
    if (!running) return;
    addEvent.mutate(
      {
        machine_id: machineId,
        event_type: "STOP",
        reason,
        remarks,
        employee_id: user?.employee_id || "",
      },
      {
        onSuccess: () => {
          toast.success(`Stopped — ${reason}`);
          setStopOpen(false);
          setRemarks("");
          setReason(DOWNTIME_REASONS[0]);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  if (!machine) {
    return (
      <div className="min-h-screen bg-background p-6 grid place-items-center">
        <div className="panel p-8 text-center max-w-md">
          <p className="text-sm text-muted-foreground mb-4">
            Machine <code className="text-foreground">{machineId}</code> not found.
          </p>
          <button
            onClick={() => navigate({ to: "/operator" })}
            className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
          >
            Choose machine
          </button>
        </div>
      </div>
    );
  }

  const statusBg = running
    ? "bg-success/20 text-success border-success/40"
    : lastEvent
      ? downColor === "destructive"
        ? "bg-destructive/20 text-destructive border-destructive/40"
        : downColor === "warning"
          ? "bg-warning/20 text-warning border-warning/40"
          : "bg-muted text-muted-foreground border-border"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-panel/60 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <Link
          to="/operator"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All machines
        </Link>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {user?.employee_id} · Shift {currentShift()}
          </div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-border hover:bg-accent"
        >
          <LogOut className="size-3.5" /> Exit
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto space-y-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {machine.line || "Plant"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{machine.machine_name}</h1>
          <div className="text-xs text-muted-foreground mt-1">{machine.machine_code}</div>
        </div>

        <div className={`panel p-6 border-2 ${statusBg} text-center`}>
          <div className="text-xs uppercase tracking-[0.2em] opacity-80">
            {running ? "Running" : lastEvent ? "Stopped" : "Idle"}
          </div>
          <div className="text-6xl md:text-7xl font-bold tabular-nums mt-2">
            {lastEvent ? hhmmss(sinceMs) : "00:00:00"}
          </div>
          <div className="text-xs mt-2 opacity-80">
            {running
              ? "Runtime"
              : lastEvent
                ? `Downtime · ${lastEvent.reason || "—"}`
                : "Press START to begin"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStart}
            disabled={running || addEvent.isPending}
            className="h-24 rounded-lg bg-success text-white text-2xl font-bold inline-flex flex-col items-center justify-center gap-1 disabled:opacity-30 hover:opacity-90 active:scale-95 transition-transform"
          >
            <Play className="size-8" strokeWidth={2.5} />
            START
          </button>
          <button
            onClick={() => setStopOpen(true)}
            disabled={!running || addEvent.isPending}
            className="h-24 rounded-lg bg-destructive text-destructive-foreground text-2xl font-bold inline-flex flex-col items-center justify-center gap-1 disabled:opacity-30 hover:opacity-90 active:scale-95 transition-transform"
          >
            <Square className="size-8" strokeWidth={2.5} />
            STOP
          </button>
        </div>
      </main>

      {/* Stop modal */}
      {stopOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
          onClick={() => setStopOpen(false)}
        >
          <div
            className="panel w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Stop {machine.machine_name}</h2>
              <button onClick={() => setStopOpen(false)} className="p-1 rounded hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Downtime Reason
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 mb-4">
              {DOWNTIME_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md border cursor-pointer text-sm ${
                    reason === r
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-primary"
                  />
                  {r}
                </label>
              ))}
            </div>
            <label className="block mb-4">
              <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Remarks (optional)
              </span>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                placeholder="Any additional notes…"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStopOpen(false)}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleStopConfirm}
                disabled={addEvent.isPending}
                className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground font-semibold disabled:opacity-60"
              >
                {addEvent.isPending ? "Recording…" : "Confirm Stop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
