import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/top-bar";
import {
  useMachines,
  useRejections,
  useAddRejection,
  useDeleteRejection,
  type Shift,
} from "@/lib/oee-data";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/rejection")({
  head: () => ({ meta: [{ title: "Rejection Entry · OEE Control" }] }),
  component: RejectionEntry,
});

function RejectionEntry() {
  const { data: machines = [] } = useMachines();
  const { data: rejections = [] } = useRejections();
  const addM = useAddRejection();
  const delM = useDeleteRejection();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    machine_id: "",
    shift: "A" as Shift,
    reject_qty: 0,
    reject_reason: "" as string,
  });
  const machineId = form.machine_id || machines[0]?.id || "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) return toast.error("Add a machine first");
    addM.mutate(
      { ...form, machine_id: machineId, reject_reason: form.reject_reason || null },
      {
        onSuccess: () => {
          toast.success("Rejection recorded");
          setForm({ ...form, machine_id: machineId, reject_qty: 0, reject_reason: "" });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };
  const byId = Object.fromEntries(machines.map((m) => [m.id, m]));

  return (
    <>
      <TopBar title="Rejection Entry" subtitle="Track defects and quality losses" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="panel p-5 space-y-3 h-fit">
          <h3 className="text-sm font-semibold mb-2">New Rejection</h3>
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
          <Field label="Reject Quantity"><input type="number" min={0} className="input tabular" value={form.reject_qty} onChange={(e) => setForm({ ...form, reject_qty: +e.target.value })} /></Field>
          <Field label="Defect / Reason (optional)"><input className="input" value={form.reject_reason} onChange={(e) => setForm({ ...form, reject_reason: e.target.value })} placeholder="e.g. Surface scratch" /></Field>
          <button type="submit" disabled={addM.isPending} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60">
            <Plus className="size-4" />{addM.isPending ? "Saving…" : "Record Rejection"}
          </button>
        </form>

        <div className="panel overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Rejections</h3>
            <p className="text-xs text-muted-foreground">{rejections.length} total records</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Machine</th>
                  <th className="text-center px-5 py-3">Shift</th>
                  <th className="text-left px-5 py-3">Reason</th>
                  <th className="text-right px-5 py-3">Qty</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rejections.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3 tabular">{r.date}</td>
                    <td className="px-5 py-3">{byId[r.machine_id]?.machine_code || "—"}</td>
                    <td className="px-5 py-3 text-center">{r.shift}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.reject_reason || "—"}</td>
                    <td className="px-5 py-3 text-right tabular text-destructive">{Number(r.reject_qty)}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => delM.mutate(r.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
                {rejections.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No rejections recorded</td></tr>
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
