import { createServerFn } from "@tanstack/react-start";
import {
  appendRow,
  deleteRow,
  readObjects,
  updateRow,
} from "./sheets.server";

// ===== Types matching the sheet column names =====
export type MachineRow = {
  id: string; // = Machine_ID
  machine_code: string;
  machine_name: string;
  line: string;
  ideal_cycle_time_seconds: number;
  _row: number;
};
export type ProductionRow = {
  id: string; // = sheet row number
  date: string;
  shift: string;
  machine_id: string;
  planned_time_minutes: number;
  output_qty: number;
};
export type DowntimeRow = {
  id: string;
  date: string;
  shift: string;
  machine_id: string;
  downtime_reason: string;
  downtime_minutes: number;
};
export type RejectionRow = {
  id: string;
  date: string;
  shift: string;
  machine_id: string;
  reject_qty: number;
  reject_reason: string | null;
};

// ===== Machines =====
export const listMachines = createServerFn({ method: "GET" }).handler(
  async (): Promise<MachineRow[]> => {
    const rows = await readObjects<{
      Machine_ID: string;
      Machine_Name: string;
      Line: string;
      Ideal_Cycle_Time_sec: string;
    }>("Machine_Master");
    return rows.map((r) => ({
      id: r.Machine_ID,
      machine_code: r.Machine_ID,
      machine_name: r.Machine_Name,
      line: r.Line,
      ideal_cycle_time_seconds: Number(r.Ideal_Cycle_Time_sec) || 0,
      _row: r._row,
    }));
  },
);

export const saveMachine = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    machine_code: string;
    machine_name: string;
    line: string;
    ideal_cycle_time_seconds: number;
  }) => d)
  .handler(async ({ data }) => {
    const row = [
      data.machine_code,
      data.machine_name,
      data.line,
      data.ideal_cycle_time_seconds,
    ];
    if (data.id) {
      // Find row number by Machine_ID, then update
      const all = await readObjects<{ Machine_ID: string }>("Machine_Master");
      const found = all.find((r) => r.Machine_ID === data.id);
      if (!found) throw new Error("Machine not found");
      await updateRow("Machine_Master", found._row, row);
    } else {
      await appendRow("Machine_Master", row);
    }
  });

export const deleteMachine = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const all = await readObjects<{ Machine_ID: string }>("Machine_Master");
    const found = all.find((r) => r.Machine_ID === data.id);
    if (!found) throw new Error("Machine not found");
    await deleteRow("Machine_Master", found._row);
  });

// ===== Production =====
export const listProduction = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductionRow[]> => {
    const rows = await readObjects<{
      Date: string; Shift: string; Machine_ID: string;
      Planned_Time_min: string; Output_Qty: string;
    }>("Production_Data");
    return rows
      .map((r) => ({
        id: String(r._row),
        date: r.Date,
        shift: r.Shift,
        machine_id: r.Machine_ID,
        planned_time_minutes: Number(r.Planned_Time_min) || 0,
        output_qty: Number(r.Output_Qty) || 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },
);

export const addProduction = createServerFn({ method: "POST" })
  .inputValidator((d: {
    date: string; shift: string; machine_id: string;
    planned_time_minutes: number; output_qty: number;
  }) => d)
  .handler(async ({ data }) => {
    await appendRow("Production_Data", [
      data.date, data.shift, data.machine_id,
      data.planned_time_minutes, data.output_qty,
    ]);
  });

export const deleteProduction = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteRow("Production_Data", Number(data.id));
  });

// ===== Downtime =====
export const listDowntime = createServerFn({ method: "GET" }).handler(
  async (): Promise<DowntimeRow[]> => {
    const rows = await readObjects<{
      Date: string; Shift: string; Machine_ID: string;
      Reason: string; Downtime_min: string;
    }>("Downtime_Data");
    return rows
      .map((r) => ({
        id: String(r._row),
        date: r.Date,
        shift: r.Shift,
        machine_id: r.Machine_ID,
        downtime_reason: r.Reason,
        downtime_minutes: Number(r.Downtime_min) || 0,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },
);

export const addDowntime = createServerFn({ method: "POST" })
  .inputValidator((d: {
    date: string; shift: string; machine_id: string;
    downtime_reason: string; downtime_minutes: number;
  }) => d)
  .handler(async ({ data }) => {
    await appendRow("Downtime_Data", [
      data.date, data.shift, data.machine_id,
      data.downtime_reason, data.downtime_minutes,
    ]);
  });

export const deleteDowntime = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteRow("Downtime_Data", Number(data.id));
  });

// ===== Rejection =====
export const listRejection = createServerFn({ method: "GET" }).handler(
  async (): Promise<RejectionRow[]> => {
    const rows = await readObjects<{
      Date: string; Shift: string; Machine_ID: string; Reject_Qty: string;
    }>("Rejection_Data");
    return rows
      .map((r) => ({
        id: String(r._row),
        date: r.Date,
        shift: r.Shift,
        machine_id: r.Machine_ID,
        reject_qty: Number(r.Reject_Qty) || 0,
        reject_reason: null,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },
);

export const addRejection = createServerFn({ method: "POST" })
  .inputValidator((d: {
    date: string; shift: string; machine_id: string; reject_qty: number;
  }) => d)
  .handler(async ({ data }) => {
    await appendRow("Rejection_Data", [
      data.date, data.shift, data.machine_id, data.reject_qty,
    ]);
  });

export const deleteRejection = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteRow("Rejection_Data", Number(data.id));
  });
