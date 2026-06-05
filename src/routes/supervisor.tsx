import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useEvents, useMachines } from "@/lib/oee-data";
import { RequireRole } from "@/lib/auth";

export const Route = createFileRoute("/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor · OEE Control" }] }),
  component: () => (
    <RequireRole roles={["supervisor", "manager", "admin"]}>
      <SupervisorBoard />
    </RequireRole>
  ),
});

function pad(n: number) { return String(n).padStart(2, "0"); }
function hhmmss(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function SupervisorBoard() {
  const { data: machines = [] } = useMachines();
  const { data: events = [] } = useEvents();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    return machines.map((m) => {
      const evs = events.filter((e) => e.machine_id === m.id);
      const last = evs.length
        ? [...evs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]
        : null;
      const running = last?.event_type === "START";
      const sinceMs = last ? now - new Date(last.timestamp).getTime() : 0;
      const elapsedMin = sinceMs / 60000;
      let tone: "success" | "warning" | "destructive" | "muted" = "muted";
      if (running) tone = "success";
      else if (last) tone = elapsedMin >= 30 ? "destructive" : elapsedMin >= 10 ? "warning" : "success";
      return { m, last, running, sinceMs, tone };
    });
  }, [machines, events, now]);

  const runningCount = rows.filter((r) => r.running).length;
  const stoppedCount = rows.filter((r) => !r.running && r.last).length;

  return (
    <>
      <TopBar
        title="Supervisor Board"
        subtitle={`${runningCount} running · ${stoppedCount} stopped · ${rows.length} machines`}
      />
      <div className="p-6">
        {rows.length === 0 ? (
          <div className="panel p-8 text-center text-muted-foreground">No machines configured.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(({ m, last, running, sinceMs, tone }) => {
              const toneClass =
                tone === "success"
                  ? "border-success/40 bg-success/5"
                  : tone === "warning"
                    ? "border-warning/40 bg-warning/5"
                    : tone === "destructive"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border";
              const dotClass =
                tone === "success" ? "bg-success animate-pulse"
                : tone === "warning" ? "bg-warning"
                : tone === "destructive" ? "bg-destructive"
                : "bg-muted-foreground";
              return (
                <div key={m.id} className={`panel p-5 border-2 ${toneClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-base font-semibold">{m.machine_name}</div>
                      <div className="text-xs text-muted-foreground">{m.machine_code} · {m.line}</div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-medium">
                      <span className={`size-2 rounded-full ${dotClass}`} />
                      {running ? "Running" : last ? "Stopped" : "Idle"}
                    </span>
                  </div>
                  <div className="text-3xl font-bold tabular-nums">
                    {last ? hhmmss(sinceMs) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {running ? "Runtime" : last ? `Down · ${last.reason || "—"}` : "Idle"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
