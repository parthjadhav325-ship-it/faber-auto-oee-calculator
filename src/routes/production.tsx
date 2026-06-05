import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/top-bar";
import {
  useMachines,
  useProduction,
  useAddProduction,
  useDeleteProduction,
  type Shift,
} from "@/lib/oee-data";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/production")({
  head: () => ({ meta: [{ title: "Production Entry · OEE Control" }] }),
  component: ProductionEntry,
});

function ProductionEntry() {
  const { data: machines = [] } = useMachines();
  const { data: production = [] } = useProduction();
  const addM = useAddProduction();
  const delM = useDeleteProduction();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    machine_id: "",
    shift: "A" as Shift,
    planned_time_minutes: 480,
    output_qty: 0,
  });
  const machineId = form.machine_id || machines[0]?.id || "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) return toast.error("Add a machine first");
    addM.mutate(
      { ...form, machine_id: machineId },
      {
        onSuccess: () => {
          toast.success("Production recorded");
          setForm({ ...form, machine_id: machineId, output_qty: 0 });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };
  const byId = Object.fromEntries(machines.map((m) => [m.id, m]));

  return (
    <>
      <TopBar title="Production Entry" subtitle="Record shift production output" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="panel p-5 space-y-3 lg:col-span-1 h-fit">
          <h3 className="text-sm font-semibold mb-2">New Entry</h3>
          <Field label="Date"><input type="date" className="input tabular" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Machine">
            <select className="input" value={machineId} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
            </select>
          </Field>
          <Field label="Shift">
            <div className="grid grid-cols-3 gap-2">
              {(["A","B","C"] as const).map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, shift: s })} className={`py-2 text-sm rounded-md border ${form.shift===s?"bg-primary text-primary-foreground border-primary":"border-border hover:bg-accent"}`}>Shift {s}</button>
              ))}
            </div>
          </Field>
          <Field label="Planned Production Time (minutes)">
            <input type="number" min={0} className="input tabular" value={form.planned_time_minutes} onChange={(e) => setForm({ ...form, planned_time_minutes: +e.target.value })} />
          </Field>
          <Field label="Output Quantity (parts)">
            <input type="number" min={0} className="input tabular" value={form.output_qty} onChange={(e) => setForm({ ...form, output_qty: +e.target.value })} />
          </Field>
          <button type="submit" disabled={addM.isPending} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60">
            <Plus className="size-4" />{addM.isPending ? "Saving…" : "Record Production"}
          </button>
        </form>

        <div className="panel overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Entries</h3>
            <p className="text-xs text-muted-foreground">{production.length} total records</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Machine</th>
                  <th className="text-center px-5 py-3">Shift</th>
                  <th className="text-right px-5 py-3">Planned (min)</th>
                  <th className="text-right px-5 py-3">Output</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {production.slice(0, 100).map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3 tabular">{p.date}</td>
                    <td className="px-5 py-3">{byId[p.machine_id]?.machine_code || "—"}</td>
                    <td className="px-5 py-3 text-center">{p.shift}</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">{Number(p.planned_time_minutes)}</td>
                    <td className="px-5 py-3 text-right tabular text-success">{Number(p.output_qty).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => delM.mutate(p.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
                {production.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No production recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:6px;padding:8px 10px;font-size:14px;color:var(--color-foreground)}.input:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
