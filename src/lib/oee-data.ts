import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  machines: ["machines"] as const,
  production: ["production_data"] as const,
  downtime: ["downtime_data"] as const,
  rejection: ["rejection_data"] as const,
};

export function useMachines() {
  return useQuery({
    queryKey: qk.machines,
    queryFn: async (): Promise<Machine[]> => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("machine_code");
      if (error) throw error;
      return (data ?? []) as Machine[];
    },
  });
}

export function useProduction() {
  return useQuery({
    queryKey: qk.production,
    queryFn: async (): Promise<Production[]> => {
      const { data, error } = await supabase
        .from("production_data")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Production[];
    },
  });
}

export function useDowntime() {
  return useQuery({
    queryKey: qk.downtime,
    queryFn: async (): Promise<Downtime[]> => {
      const { data, error } = await supabase
        .from("downtime_data")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Downtime[];
    },
  });
}

export function useRejections() {
  return useQuery({
    queryKey: qk.rejection,
    queryFn: async (): Promise<Rejection[]> => {
      const { data, error } = await supabase
        .from("rejection_data")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rejection[];
    },
  });
}

// ===== Mutations =====
function inv(qc: ReturnType<typeof useQueryClient>, keys: readonly (readonly string[])[]) {
  for (const k of keys) qc.invalidateQueries({ queryKey: k });
}

export function useUpsertMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      row: Omit<Machine, "id"> & { id?: string }
    ) => {
      if (row.id) {
        const { id, ...rest } = row;
        const { error } = await supabase.from("machines").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("machines").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => inv(qc, [qk.machines]),
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("machines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.machines, qk.production, qk.downtime, qk.rejection]),
  });
}

export function useAddProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Production, "id">) => {
      const { error } = await supabase.from("production_data").insert(row);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.production]),
  });
}

export function useDeleteProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.production]),
  });
}

export function useAddDowntime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Downtime, "id">) => {
      const { error } = await supabase.from("downtime_data").insert(row);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.downtime]),
  });
}

export function useDeleteDowntime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("downtime_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.downtime]),
  });
}

export function useAddRejection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Rejection, "id">) => {
      const { error } = await supabase.from("rejection_data").insert(row);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.rejection]),
  });
}

export function useDeleteRejection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rejection_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => inv(qc, [qk.rejection]),
  });
}

// ===== KPI math =====
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
  machinesById: Record<string, Machine>
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
  let plannedMin = 0,
    runtimeMin = 0,
    output = 0,
    rejects = 0,
    idealParts = 0,
    plannedTargetParts = 0;
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
    plannedMin,
    runtimeMin,
    downtimeMin,
    output,
    rejects,
    good,
    idealParts,
    plannedTargetParts,
    shiftCount: shifts.size,
    availability,
    performance,
    quality,
    oee,
    throughputPerHour,
    unitsPerShift,
    leadTimeMin,
    utilization,
    downtimePct,
    scrapPct,
    achievement,
  };
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const num = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
export const fix = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
