import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/top-bar";
import {
  useMachines,
  useUpsertMachine,
  useDeleteMachine,
  type Machine,
} from "@/lib/oee-data";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/machines")({
  head: () => ({ meta: [{ title: "Machine Master · OEE Control" }] }),
  component: MachineMaster,
});

type Form = {
  id?: string;
  machine_code: string;
  machine_name: string;
  line: string;
  ideal_cycle_time_seconds: number;
};

const empty: Form = { machine_code: "", machine_name: "", line: "", ideal_cycle_time_seconds: 60 };

function MachineMaster() {
  const { data: machines = [], isLoading } = useMachines();
  const upsert = useUpsertMachine();
  const del = useDeleteMachine();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (m: Machine) => {
    setForm({
      id: m.id,
      machine_code: m.machine_code,
      machine_name: m.machine_name,
      line: m.line,
      ideal_cycle_time_seconds: Number(m.ideal_cycle_time_seconds),
    });
    setOpen(true);
  };
  const save = () => {
    if (!form.machine_code || !form.machine_name || form.ideal_cycle_time_seconds <= 0) {
      toast.error("Code, name and a positive cycle time are required");
      return;
    }
    upsert.mutate(form, {
      onSuccess: () => { setOpen(false); toast.success(form.id ? "Machine updated" : "Machine added"); },
      onError: (e) => toast.error(e.message),
    });
  };
  const remove = (id: string) => {
    if (!confirm("Delete this machine and all its production records?")) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Machine deleted"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <TopBar title="Machine Master" subtitle="Configure machines, lines and ideal cycle times"
        right={<button onClick={startNew} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90"><Plus className="size-4" />Add Machine</button>}
      />
      <div className="p-6">
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Line</th>
                <th className="text-right px-5 py-3">Ideal Cycle (s)</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium">{m.machine_code}</td>
                  <td className="px-5 py-3">{m.machine_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.line}</td>
                  <td className="px-5 py-3 text-right tabular">{Number(m.ideal_cycle_time_seconds)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                    <button onClick={() => remove(m.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {!isLoading && machines.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No machines configured</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{form.id ? "Edit Machine" : "New Machine"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Code"><input className="input" value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} placeholder="CNC-01" /></Field>
              <Field label="Name"><input className="input" value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} placeholder="CNC Lathe" /></Field>
              <Field label="Line"><input className="input" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Line A" /></Field>
              <Field label="Ideal Cycle Time (seconds per part)">
                <input type="number" min={1} step="0.1" className="input tabular" value={form.ideal_cycle_time_seconds} onChange={(e) => setForm({ ...form, ideal_cycle_time_seconds: +e.target.value })} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={save} disabled={upsert.isPending} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
                {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

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
