import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useOEE, type Machine } from "@/lib/oee-store";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/machines")({
  head: () => ({ meta: [{ title: "Machine Master · OEE Control" }] }),
  component: MachineMaster,
});

const empty: Omit<Machine, "id"> = { code: "", name: "", line: "", idealCycleSec: 60, plannedShiftMin: 480 };

function MachineMaster() {
  const machines = useOEE((s) => s.machines);
  const addMachine = useOEE((s) => s.addMachine);
  const updateMachine = useOEE((s) => s.updateMachine);
  const deleteMachine = useOEE((s) => s.deleteMachine);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Machine, "id">>(empty);

  const startNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const startEdit = (m: Machine) => { setEditId(m.id); const { id, ...rest } = m; setForm(rest); setOpen(true); };
  const save = () => {
    if (!form.code || !form.name) return;
    if (editId) updateMachine(editId, form); else addMachine(form);
    setOpen(false);
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
                <th className="text-right px-5 py-3">Planned Shift (min)</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium">{m.code}</td>
                  <td className="px-5 py-3">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.line}</td>
                  <td className="px-5 py-3 text-right tabular">{m.idealCycleSec}</td>
                  <td className="px-5 py-3 text-right tabular">{m.plannedShiftMin}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                    <button onClick={() => deleteMachine(m.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No machines configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{editId ? "Edit Machine" : "New Machine"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CNC-01" /></Field>
              <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CNC Lathe" /></Field>
              <Field label="Line"><input className="input" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Line A" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ideal Cycle (sec/part)"><input type="number" className="input tabular" value={form.idealCycleSec} onChange={(e) => setForm({ ...form, idealCycleSec: +e.target.value })} /></Field>
                <Field label="Planned Shift (min)"><input type="number" className="input tabular" value={form.plannedShiftMin} onChange={(e) => setForm({ ...form, plannedShiftMin: +e.target.value })} /></Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={save} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium">Save</button>
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
