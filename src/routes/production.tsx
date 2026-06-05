import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useOEE } from "@/lib/oee-store";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/production")({
  head: () => ({ meta: [{ title: "Production Entry · OEE Control" }] }),
  component: ProductionEntry,
});

function ProductionEntry() {
  const machines = useOEE((s) => s.machines);
  const production = useOEE((s) => s.production);
  const addProduction = useOEE((s) => s.addProduction);
  const del = useOEE((s) => s.deleteProduction);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, machineId: machines[0]?.id || "", shift: "A" as "A"|"B"|"C", goodParts: 0, totalParts: 0, runtimeMin: 0 });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId) return;
    addProduction(form);
    setForm({ ...form, goodParts: 0, totalParts: 0, runtimeMin: 0 });
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
            <select className="input" value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </Field>
          <Field label="Shift">
            <div className="grid grid-cols-3 gap-2">
              {(["A","B","C"] as const).map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, shift: s })} className={`py-2 text-sm rounded-md border ${form.shift===s?"bg-primary text-primary-foreground border-primary":"border-border hover:bg-accent"}`}>Shift {s}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Good Parts"><input type="number" className="input tabular" value={form.goodParts} onChange={(e) => setForm({ ...form, goodParts: +e.target.value })} /></Field>
            <Field label="Total Parts"><input type="number" className="input tabular" value={form.totalParts} onChange={(e) => setForm({ ...form, totalParts: +e.target.value })} /></Field>
          </div>
          <Field label="Runtime (minutes)"><input type="number" className="input tabular" value={form.runtimeMin} onChange={(e) => setForm({ ...form, runtimeMin: +e.target.value })} /></Field>
          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90"><Plus className="size-4" />Record Production</button>
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
                  <th className="text-right px-5 py-3">Good</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-right px-5 py-3">Runtime</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {production.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3 tabular">{p.date}</td>
                    <td className="px-5 py-3">{byId[p.machineId]?.code || "—"}</td>
                    <td className="px-5 py-3 text-center">{p.shift}</td>
                    <td className="px-5 py-3 text-right tabular text-success">{p.goodParts.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular">{p.totalParts.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular text-muted-foreground">{p.runtimeMin}m</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
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
