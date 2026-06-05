import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Machine = {
  id: string;
  code: string;
  name: string;
  line: string;
  idealCycleSec: number; // seconds per part at ideal speed
  plannedShiftMin: number; // planned production time per shift (min)
};

export type Production = {
  id: string;
  date: string; // yyyy-mm-dd
  machineId: string;
  shift: "A" | "B" | "C";
  goodParts: number;
  totalParts: number;
  runtimeMin: number;
};

export type Downtime = {
  id: string;
  date: string;
  machineId: string;
  shift: "A" | "B" | "C";
  reason: string;
  category: "Breakdown" | "Changeover" | "Material" | "Quality" | "Other";
  minutes: number;
};

export type Rejection = {
  id: string;
  date: string;
  machineId: string;
  shift: "A" | "B" | "C";
  defect: string;
  quantity: number;
};

type State = {
  machines: Machine[];
  production: Production[];
  downtime: Downtime[];
  rejections: Rejection[];
  addMachine: (m: Omit<Machine, "id">) => void;
  updateMachine: (id: string, m: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  addProduction: (p: Omit<Production, "id">) => void;
  deleteProduction: (id: string) => void;
  addDowntime: (d: Omit<Downtime, "id">) => void;
  deleteDowntime: (id: string) => void;
  addRejection: (r: Omit<Rejection, "id">) => void;
  deleteRejection: (id: string) => void;
  seed: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useOEE = create<State>()(
  persist(
    (set, get) => ({
      machines: [],
      production: [],
      downtime: [],
      rejections: [],
      addMachine: (m) => set({ machines: [...get().machines, { ...m, id: uid() }] }),
      updateMachine: (id, m) =>
        set({ machines: get().machines.map((x) => (x.id === id ? { ...x, ...m } : x)) }),
      deleteMachine: (id) => set({ machines: get().machines.filter((x) => x.id !== id) }),
      addProduction: (p) => set({ production: [{ ...p, id: uid() }, ...get().production] }),
      deleteProduction: (id) => set({ production: get().production.filter((x) => x.id !== id) }),
      addDowntime: (d) => set({ downtime: [{ ...d, id: uid() }, ...get().downtime] }),
      deleteDowntime: (id) => set({ downtime: get().downtime.filter((x) => x.id !== id) }),
      addRejection: (r) => set({ rejections: [{ ...r, id: uid() }, ...get().rejections] }),
      deleteRejection: (id) => set({ rejections: get().rejections.filter((x) => x.id !== id) }),
      seed: () => {
        if (get().machines.length > 0) return;
        const machines: Machine[] = [
          { id: "m1", code: "CNC-01", name: "CNC Lathe Alpha", line: "Line A", idealCycleSec: 45, plannedShiftMin: 480 },
          { id: "m2", code: "CNC-02", name: "CNC Mill Beta", line: "Line A", idealCycleSec: 60, plannedShiftMin: 480 },
          { id: "m3", code: "PRS-01", name: "Hydraulic Press", line: "Line B", idealCycleSec: 30, plannedShiftMin: 480 },
          { id: "m4", code: "ASM-01", name: "Assembly Robot", line: "Line B", idealCycleSec: 25, plannedShiftMin: 480 },
          { id: "m5", code: "WLD-01", name: "Robotic Welder", line: "Line C", idealCycleSec: 90, plannedShiftMin: 480 },
        ];
        const today = new Date();
        const production: Production[] = [];
        const downtime: Downtime[] = [];
        const rejections: Rejection[] = [];
        const shifts: ("A" | "B" | "C")[] = ["A", "B", "C"];
        const dtReasons = ["Tool change", "Material wait", "Setup", "Breakdown", "Cleaning"];
        const dtCats: Downtime["category"][] = ["Changeover", "Material", "Changeover", "Breakdown", "Other"];
        const defects = ["Surface scratch", "Dimension OOS", "Weld porosity", "Burr"];
        for (let d = 29; d >= 0; d--) {
          const date = new Date(today);
          date.setDate(today.getDate() - d);
          const ds = date.toISOString().slice(0, 10);
          machines.forEach((m) => {
            shifts.forEach((s) => {
              const dt = Math.floor(Math.random() * 80) + 20;
              const runtime = m.plannedShiftMin - dt;
              const ideal = (runtime * 60) / m.idealCycleSec;
              const perfFactor = 0.78 + Math.random() * 0.18;
              const total = Math.floor(ideal * perfFactor);
              const qualityFactor = 0.94 + Math.random() * 0.05;
              const good = Math.floor(total * qualityFactor);
              production.push({
                id: uid(),
                date: ds,
                machineId: m.id,
                shift: s,
                goodParts: good,
                totalParts: total,
                runtimeMin: runtime,
              });
              const ri = Math.floor(Math.random() * dtReasons.length);
              downtime.push({
                id: uid(),
                date: ds,
                machineId: m.id,
                shift: s,
                reason: dtReasons[ri],
                category: dtCats[ri],
                minutes: dt,
              });
              if (total - good > 0) {
                rejections.push({
                  id: uid(),
                  date: ds,
                  machineId: m.id,
                  shift: s,
                  defect: defects[Math.floor(Math.random() * defects.length)],
                  quantity: total - good,
                });
              }
            });
          });
        }
        set({ machines, production, downtime, rejections });
      },
    }),
    { name: "oee-store-v1" }
  )
);

// ===== OEE math =====
export type OEEMetrics = {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  goodParts: number;
  totalParts: number;
  runtimeMin: number;
  plannedMin: number;
  throughput: number; // parts per hour
};

export function computeOEE(
  rows: Production[],
  machinesById: Record<string, Machine>
): OEEMetrics {
  let goodParts = 0;
  let totalParts = 0;
  let runtimeMin = 0;
  let plannedMin = 0;
  let idealParts = 0;
  for (const r of rows) {
    const m = machinesById[r.machineId];
    if (!m) continue;
    goodParts += r.goodParts;
    totalParts += r.totalParts;
    runtimeMin += r.runtimeMin;
    plannedMin += m.plannedShiftMin;
    idealParts += (r.runtimeMin * 60) / m.idealCycleSec;
  }
  const availability = plannedMin > 0 ? runtimeMin / plannedMin : 0;
  const performance = idealParts > 0 ? Math.min(1, totalParts / idealParts) : 0;
  const quality = totalParts > 0 ? goodParts / totalParts : 0;
  const oee = availability * performance * quality;
  const throughput = runtimeMin > 0 ? (goodParts / runtimeMin) * 60 : 0;
  return { availability, performance, quality, oee, goodParts, totalParts, runtimeMin, plannedMin, throughput };
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const num = (n: number) => n.toLocaleString();
