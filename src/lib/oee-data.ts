import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as sheets from "./sheets.functions";

export type Shift = "A" | "B" | "C";

export type Machine = {
  id: string;
  machine_code: string;
  machine_name: string;
  line: string;
  ideal_cycle_time_seconds: number;
};

export type Production = {
  id: string;
  date: string;
  shift: Shift;
  machine_id: string;
  planned_time_minutes: number;
  output_qty: number;
};

export type Downtime = {
  id: string;
  date: string;
  shift: Shift;
  machine_id: string;
  downtime_reason: string;
  downtime_minutes: number;
};

export type Rejection = {
  id: string;
  date: string;
  shift: Shift;
  machine_id: string;
  reject_qty: number;
  reject_reason: string | null;
};

// ===== Queries =====
export const qk = {
  machines: ["sheets", "machines"] as const,
  production: ["sheets", "production"] as const,
  downtime: ["sheets", "downtime"] as const,
  rejection: ["sheets", "rejection"] as const,
};

const STALE = 10_000;

export function useMachines() {
  return useQuery({
    queryKey: qk.machines,
    queryFn: () => sheets.listMachines() as Promise<Machine[]>,
    staleTime: STALE,
  });
}
export function useProduction() {
  return useQuery({
    queryKey: qk.production,
    queryFn: () => sheets.listProduction() as Promise<Production[]>,
    staleTime: STALE,
  });
}
// useDowntime is defined near the bottom of this file, after downtimeFromEvents.
export function useRejections() {
  return useQuery({
    queryKey: qk.rejection,
    queryFn: () => sheets.listRejection() as Promise<Rejection[]>,
    staleTime: STALE,
  });
}

function inv(qc: ReturnType<typeof useQueryClient>, keys: readonly (readonly string[])[]) {
  for (const k of keys) qc.invalidateQueries({ queryKey: k });
}

// ===== Mutations =====
export function useUpsertMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Omit<Machine, "id"> & { id?: string }) =>
      sheets.saveMachine({ data: row }),
    onSuccess: () => inv(qc, [qk.machines]),
  });
}
export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sheets.deleteMachine({ data: { id } }),
    onSuccess: () => inv(qc, [qk.machines]),
  });
}
export function useAddProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Omit<Production, "id">) =>
      sheets.addProduction({ data: row }),
    onSuccess: () => inv(qc, [qk.production]),
  });
}
export function useDeleteProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sheets.deleteProduction({ data: { id } }),
    onSuccess: () => inv(qc, [qk.production]),
  });
}
export function useAddDowntime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Omit<Downtime, "id">) =>
      sheets.addDowntime({ data: row }),
    onSuccess: () => inv(qc, [qk.downtime]),
  });
}
export function useDeleteDowntime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sheets.deleteDowntime({ data: { id } }),
    onSuccess: () => inv(qc, [qk.downtime]),
  });
}
export function useAddRejection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Omit<Rejection, "id">) =>
      sheets.addRejection({ data: { ...row } }),
    onSuccess: () => inv(qc, [qk.rejection]),
  });
}
export function useDeleteRejection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sheets.deleteRejection({ data: { id } }),
    onSuccess: () => inv(qc, [qk.rejection]),
  });
}

// ===== KPI math (unchanged) =====
export type Metrics = {
  plannedMin: number;
  runtimeMin: number;
  downtimeMin: number;
  output: number;
  rejects: number;
  good: number;
  idealParts: number;
  plannedTargetParts: number;
  shiftCount: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  throughputPerHour: number;
  unitsPerShift: number;
  leadTimeMin: number;
  utilization: number;
  downtimePct: number;
  scrapPct: number;
  achievement: number;
};

export function computeMetrics(
  prod: Production[],
  downtime: Downtime[],
  rejection: Rejection[],
  machinesById: Record<string, Machine>,
): Metrics {
  const key = (d: string, s: string, m: string) => `${d}|${s}|${m}`;
  const dtByKey = new Map<string, number>();
  for (const d of downtime) {
    const k = key(d.date, d.shift, d.machine_id);
    dtByKey.set(k, (dtByKey.get(k) || 0) + Number(d.downtime_minutes));
  }
  const rjByKey = new Map<string, number>();
  for (const r of rejection) {
    const k = key(r.date, r.shift, r.machine_id);
    rjByKey.set(k, (rjByKey.get(k) || 0) + Number(r.reject_qty));
  }
  let plannedMin = 0, runtimeMin = 0, output = 0, rejects = 0,
    idealParts = 0, plannedTargetParts = 0;
  const shifts = new Set<string>();
  for (const p of prod) {
    const m = machinesById[p.machine_id];
    if (!m) continue;
    const k = key(p.date, p.shift, p.machine_id);
    const dt = dtByKey.get(k) || 0;
    const planned = Number(p.planned_time_minutes);
    const rt = Math.max(0, planned - dt);
    plannedMin += planned;
    runtimeMin += rt;
    output += Number(p.output_qty);
    rejects += rjByKey.get(k) || 0;
    idealParts += (rt * 60) / Number(m.ideal_cycle_time_seconds);
    plannedTargetParts += (planned * 60) / Number(m.ideal_cycle_time_seconds);
    shifts.add(k);
  }
  const downtimeMin = downtime.reduce((s, d) => s + Number(d.downtime_minutes), 0);
  const good = Math.max(0, output - rejects);
  const availability = plannedMin > 0 ? runtimeMin / plannedMin : 0;
  const performance = idealParts > 0 ? Math.min(1, output / idealParts) : 0;
  const quality = output > 0 ? good / output : 0;
  const oee = availability * performance * quality;
  const throughputPerHour = runtimeMin > 0 ? (good / runtimeMin) * 60 : 0;
  const unitsPerShift = shifts.size > 0 ? good / shifts.size : 0;
  const leadTimeMin = good > 0 ? runtimeMin / good : 0;
  const utilization = plannedMin > 0 ? runtimeMin / plannedMin : 0;
  const downtimePct = plannedMin > 0 ? Math.min(1, downtimeMin / plannedMin) : 0;
  const scrapPct = output > 0 ? rejects / output : 0;
  const achievement = plannedTargetParts > 0 ? good / plannedTargetParts : 0;
  return {
    plannedMin, runtimeMin, downtimeMin, output, rejects, good,
    idealParts, plannedTargetParts, shiftCount: shifts.size,
    availability, performance, quality, oee,
    throughputPerHour, unitsPerShift, leadTimeMin,
    utilization, downtimePct, scrapPct, achievement,
  };
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const num = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
export const fix = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");

// ===== Machine Events =====
export const DOWNTIME_REASONS = [
  "Mechanical Breakdown",
  "Electrical Breakdown",
  "Tool Change",
  "Setup Change",
  "Material Shortage",
  "Quality Issue",
  "No Operator",
  "Power Failure",
  "Preventive Maintenance",
  "Planned Shutdown",
  "Other",
] as const;

export type MachineEvent = {
  id: string;
  timestamp: string;
  machine_id: string;
  event_type: "START" | "STOP";
  reason: string;
};

export const eventsKey = ["sheets", "events"] as const;

export function useEvents() {
  return useQuery({
    queryKey: eventsKey,
    queryFn: () => sheets.listEvents() as Promise<MachineEvent[]>,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export function useAddEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: {
      machine_id: string; event_type: "START" | "STOP";
      reason?: string; employee_id?: string; remarks?: string;
    }) => sheets.addEvent({ data: row }),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });
}

export type MachineEventMetrics = {
  status: "RUNNING" | "STOPPED" | "UNKNOWN";
  lastEventAt: string | null;
  runtimeMin: number;
  downtimeMin: number;
  availability: number;
  failures: number;
  mttrMin: number; // mean time to repair (avg downtime duration)
  mtbfMin: number; // mean time between failures (avg run duration before a stop)
  byReason: { reason: string; minutes: number }[];
};

// Derive runtime/downtime/MTTR/MTBF from chronological events for a machine
// `until` defaults to now — ongoing intervals are counted up to that point.
export function metricsFromEvents(
  events: MachineEvent[],
  opts?: { from?: Date; until?: Date },
): MachineEventMetrics {
  const until = opts?.until ?? new Date();
  const from = opts?.from;
  const sorted = [...events].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : 1,
  );
  let runtimeMs = 0;
  let downtimeMs = 0;
  const runDurations: number[] = [];
  const downDurations: number[] = [];
  const reasonMs = new Map<string, number>();
  let last: MachineEvent | null = null;

  const clip = (a: Date, b: Date): number => {
    let s = a.getTime();
    let e = b.getTime();
    if (from) s = Math.max(s, from.getTime());
    e = Math.min(e, until.getTime());
    return Math.max(0, e - s);
  };

  for (const ev of sorted) {
    if (last) {
      const ms = clip(new Date(last.timestamp), new Date(ev.timestamp));
      if (last.event_type === "START") {
        runtimeMs += ms;
        if (ev.event_type === "STOP") runDurations.push(ms);
      } else {
        downtimeMs += ms;
        if (ev.event_type === "START") downDurations.push(ms);
        const r = last.reason || "Other";
        reasonMs.set(r, (reasonMs.get(r) || 0) + ms);
      }
    }
    last = ev;
  }
  // Tail interval up to `until`
  if (last) {
    const ms = clip(new Date(last.timestamp), until);
    if (last.event_type === "START") runtimeMs += ms;
    else {
      downtimeMs += ms;
      const r = last.reason || "Other";
      reasonMs.set(r, (reasonMs.get(r) || 0) + ms);
    }
  }

  const runtimeMin = runtimeMs / 60000;
  const downtimeMin = downtimeMs / 60000;
  const total = runtimeMin + downtimeMin;
  const availability = total > 0 ? runtimeMin / total : 0;
  const mttrMin = downDurations.length > 0
    ? downDurations.reduce((s, n) => s + n, 0) / downDurations.length / 60000
    : 0;
  const mtbfMin = runDurations.length > 0
    ? runDurations.reduce((s, n) => s + n, 0) / runDurations.length / 60000
    : 0;
  const byReason = [...reasonMs.entries()]
    .map(([reason, ms]) => ({ reason, minutes: ms / 60000 }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    status: last ? (last.event_type === "START" ? "RUNNING" : "STOPPED") : "UNKNOWN",
    lastEventAt: last ? last.timestamp : null,
    runtimeMin,
    downtimeMin,
    availability,
    failures: downDurations.length,
    mttrMin,
    mtbfMin,
    byReason,
  };
}

// Convert chronological events into Downtime rows (STOP → next START intervals).
// Ongoing stops (no closing START yet) are counted up to "now".
export function downtimeFromEvents(events: MachineEvent[]): Downtime[] {
  const byMachine = new Map<string, MachineEvent[]>();
  for (const e of events) {
    if (!byMachine.has(e.machine_id)) byMachine.set(e.machine_id, []);
    byMachine.get(e.machine_id)!.push(e);
  }
  const out: Downtime[] = [];
  const now = new Date();
  const shiftOf = (d: Date): Shift => {
    const h = d.getHours();
    if (h >= 6 && h < 14) return "A";
    if (h >= 14 && h < 22) return "B";
    return "C";
  };
  let counter = 0;
  for (const [mid, evs] of byMachine) {
    const sorted = [...evs].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      if (e.event_type !== "STOP") continue;
      const next = sorted.slice(i + 1).find((x) => x.event_type === "START");
      const start = new Date(e.timestamp);
      const end = next ? new Date(next.timestamp) : now;
      const minutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
      if (minutes <= 0) continue;
      out.push({
        id: `evt-${e.id}-${++counter}`,
        date: start.toISOString().slice(0, 10),
        shift: shiftOf(start),
        machine_id: mid,
        downtime_reason: e.reason || "Other",
        downtime_minutes: minutes,
      });
    }
  }
  return out;
}

// Defined here (after downtimeFromEvents) to avoid forward-reference issues.
export function useDowntime() {
  return useQuery({
    queryKey: ["sheets", "downtime-from-events"] as const,
    queryFn: async (): Promise<Downtime[]> => {
      const events = (await sheets.listEvents()) as unknown as MachineEvent[];
      return downtimeFromEvents(events);
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}
