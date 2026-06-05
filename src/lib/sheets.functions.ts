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

// ===== Machine Events (Start/Stop) =====
import { ensureSheet } from "./sheets.server";

const EVENTS_SHEET = "Machine_Events";
const EVENTS_HEADERS = ["Timestamp", "Machine_ID", "Event_Type", "Reason", "Employee_ID", "Remarks"];

export type MachineEventRow = {
  id: string;
  timestamp: string; // ISO
  machine_id: string;
  event_type: "START" | "STOP";
  reason: string;
  employee_id: string;
  remarks: string;
};

export const listEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<MachineEventRow[]> => {
    const rows = await readObjects<{
      Timestamp: string; Machine_ID: string; Event_Type: string; Reason: string;
      Employee_ID?: string; Remarks?: string;
    }>(EVENTS_SHEET);
    return rows.map((r) => ({
      id: String(r._row),
      timestamp: r.Timestamp,
      machine_id: r.Machine_ID,
      event_type: (r.Event_Type === "STOP" ? "STOP" : "START") as "START" | "STOP",
      reason: r.Reason || "",
      employee_id: r.Employee_ID || "",
      remarks: r.Remarks || "",
    }));
  },
);

export const addEvent = createServerFn({ method: "POST" })
  .inputValidator((d: {
    machine_id: string; event_type: "START" | "STOP";
    reason?: string; employee_id?: string; remarks?: string;
  }) => d)
  .handler(async ({ data }) => {
    await ensureSheet(EVENTS_SHEET, EVENTS_HEADERS);
    const ts = new Date().toISOString();
    await appendRow(EVENTS_SHEET, [
      ts, data.machine_id, data.event_type,
      data.reason || "", data.employee_id || "", data.remarks || "",
    ]);
    return { timestamp: ts };
  });

// ===== User Master =====
const USERS_SHEET = "User_Master";
const USERS_HEADERS = ["Employee_ID", "Name", "Password", "Role", "Default_Machine_ID"];

export type UserRole = "operator" | "supervisor" | "manager" | "admin";
export type UserRow = {
  employee_id: string;
  name: string;
  role: UserRole;
  default_machine_id: string;
  _row: number;
};

async function ensureUsersSeed() {
  await ensureSheet(USERS_SHEET, USERS_HEADERS);
  const rows = await readObjects<{ Employee_ID: string }>(USERS_SHEET);
  if (rows.length === 0) {
    await appendRow(USERS_SHEET, ["admin", "Administrator", "admin", "admin", ""]);
  }
}

export const listUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserRow[]> => {
    await ensureUsersSeed();
    const rows = await readObjects<{
      Employee_ID: string; Name: string; Password: string;
      Role: string; Default_Machine_ID: string;
    }>(USERS_SHEET);
    return rows.map((r) => ({
      employee_id: r.Employee_ID,
      name: r.Name,
      role: (["operator","supervisor","manager","admin"].includes(r.Role)
        ? r.Role : "operator") as UserRole,
      default_machine_id: r.Default_Machine_ID || "",
      _row: r._row,
    }));
  },
);

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((d: { employee_id: string; password: string }) => d)
  .handler(async ({ data }) => {
    await ensureUsersSeed();
    const rows = await readObjects<{
      Employee_ID: string; Name: string; Password: string;
      Role: string; Default_Machine_ID: string;
    }>(USERS_SHEET);
    const u = rows.find(
      (r) => r.Employee_ID.trim() === data.employee_id.trim()
        && (r.Password || "") === data.password,
    );
    if (!u) throw new Error("Invalid Employee ID or password");
    return {
      employee_id: u.Employee_ID,
      name: u.Name || u.Employee_ID,
      role: (["operator","supervisor","manager","admin"].includes(u.Role)
        ? u.Role : "operator") as UserRole,
      default_machine_id: u.Default_Machine_ID || "",
    };
  });

export const saveUser = createServerFn({ method: "POST" })
  .inputValidator((d: {
    original_id?: string;
    employee_id: string; name: string; password: string;
    role: UserRole; default_machine_id: string;
  }) => d)
  .handler(async ({ data }) => {
    await ensureUsersSeed();
    const all = await readObjects<{ Employee_ID: string }>(USERS_SHEET);
    const row = [data.employee_id, data.name, data.password, data.role, data.default_machine_id];
    const key = data.original_id || data.employee_id;
    const found = all.find((r) => r.Employee_ID === key);
    if (found) await updateRow(USERS_SHEET, found._row, row);
    else await appendRow(USERS_SHEET, row);
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: { employee_id: string }) => d)
  .handler(async ({ data }) => {
    const all = await readObjects<{ Employee_ID: string }>(USERS_SHEET);
    const found = all.find((r) => r.Employee_ID === data.employee_id);
    if (!found) throw new Error("User not found");
    await deleteRow(USERS_SHEET, found._row);
  });
