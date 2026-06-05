import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/lib/auth";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Play, Square, X, Activity } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import {
  DOWNTIME_REASONS,
  metricsFromEvents,
  useAddEvent,
  useEvents,
  useMachines,
  type Machine,
} from "@/lib/oee-data";

export const Route = createFileRoute("/control")({
  head: () => ({ meta: [{ title: "Machine Control · OEE Control" }] }),
  component: () => (<RequireRole roles={["manager","admin"]}><MachineControl /></RequireRole>),
});

function fmtDuration(min: number) {
  if (!Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MachineControl() {
  const { data: machines = [], isLoading } = useMachines();
  const { data: events = [] } = useEvents();
  const addEvent = useAddEvent();
  const [stopFor, setStopFor] = useState<Machine | null>(null);
  const [reason, setReason] = useState<string>(DOWNTIME_REASONS[0]);

  const eventsByMachine = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const e of events) (map[e.machine_id] ||= []).push(e);
    return map;
  }, [events]);

  const start = (m: Machine) => {
    addEvent.mutate(
      { machine_id: m.id, event_type: "START" },
      {
        onSuccess: () => toast.success(`${m.machine_name} started`),
        onError: (e) => toast.error(e.message),
      },
    );
  };
  const confirmStop = () => {
    if (!stopFor) return;
    addEvent.mutate(
      { machine_id: stopFor.id, event_type: "STOP", reason },
      {
        onSuccess: () => {
          toast.success(`${stopFor.machine_name} stopped — ${reason}`);
          setStopFor(null);
          setReason(DOWNTIME_REASONS[0]);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <>
      <TopBar
        title="Machine Control"
        subtitle="Operator console — Start and Stop machines. Events log to Google Sheets."
      />
      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading machines…</div>
        ) : machines.length === 0 ? (
          <div className="panel p-8 text-center text-muted-foreground">
            No machines configured. Add some in Machine Master.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {machines.map((m) => {
              const evs = eventsByMachine[m.id] || [];
              const last = evs.length
                ? [...evs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]
                : null;
              const running = last?.event_type === "START";
              const k = metricsFromEvents(evs);
              return (
                <div key={m.id} className="panel p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-base font-semibold">{m.machine_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.machine_code} · {m.line}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                        running
                          ? "bg-success/15 text-success"
                          : last
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          running
                            ? "bg-success animate-pulse"
                            : last
                              ? "bg-destructive"
                              : "bg-muted-foreground"
                        }`}
                      />
                      {running ? "Running" : last ? "Stopped" : "Idle"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <Stat label="Last event" value={fmtTime(last?.timestamp ?? null)} />
                    <Stat
                      label={running ? "Running since" : "Stop reason"}
                      value={running ? fmtTime(last!.timestamp) : last?.reason || "—"}
                    />
                    <Stat label="Runtime" value={fmtDuration(k.runtimeMin)} />
                    <Stat label="Downtime" value={fmtDuration(k.downtimeMin)} />
                    <Stat
                      label="Availability"
                      value={`${(k.availability * 100).toFixed(1)}%`}
                    />
                    <Stat label="Failures" value={String(k.failures)} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => start(m)}
                      disabled={running || addEvent.isPending}
                      className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-success text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    >
                      <Play className="size-4" />
                      Start
                    </button>
                    <button
                      onClick={() => {
                        setReason(DOWNTIME_REASONS[0]);
                        setStopFor(m);
                      }}
                      disabled={!running || addEvent.isPending}
                      className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-destructive text-destructive-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    >
                      <Square className="size-4" />
                      Stop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {stopFor && (
        <div
          className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4"
          onClick={() => setStopFor(null)}
        >
          <div
            className="panel w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Activity className="size-4" />
                  Stop {stopFor.machine_name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select the downtime reason
                </p>
              </div>
              <button
                onClick={() => setStopFor(null)}
                className="p-1 rounded hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {DOWNTIME_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer text-sm ${
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
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setStopFor(null)}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                disabled={addEvent.isPending}
                className="px-4 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground font-semibold disabled:opacity-60"
              >
                {addEvent.isPending ? "Recording…" : "Confirm Stop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium tabular truncate">{value}</div>
    </div>
  );
}
