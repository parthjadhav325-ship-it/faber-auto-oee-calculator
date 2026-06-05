import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useOEE, type Downtime } from "@/lib/oee-store";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/downtime")({
  head: () => ({ meta: [{ title: "Downtime Entry · OEE Control" }] }),
  component: DowntimeEntry,
});

const cats: Downtime["category"][] = ["Breakdown","Changeover","Material","Quality","Other"];

function DowntimeEntry() {
  const machines = useOEE((s) => s.machines);
  const downtime = useOEE((s) => s.downtime);
  const add = useOEE((s) => s.addDowntime);
  const del = useOEE((s) => s.deleteDowntime);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<Downtime,"id">>({ date: today, machineId: machines[0]?.id || "", shift: "A", reason: "", category: "Breakdown", minutes: 0 });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId || !form.reason) return;
    add(form);
    setForm({ ...form, reason: "", minutes: 0 });
  };
  const byId = Object.fromEntries(machines.map((m) => [m.id, m]));

  return (
    <>
      <TopBar title="Downtime Entry" subtitle="Log unplanned and planned stoppages" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="panel p-5 space-y-3 h-fit">
          <h3 className="text-sm font-semibold mb-2">Log Downtime</h3>
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
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Downtime["category"] })}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Reason"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Tool change" /></Field>
          <Field label="Duration (minutes)"><input type="number" className="input tabular" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: +e.target.value })} /></Field>
          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90"><Plus className="size-4" />Record Downtime</button>
        </form>

        <div className="panel overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Downtime Events</h3>
            <p className="text-xs text-muted-foreground">{downtime.length} total events</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Machine</th>
                  <th className="text-center px-5 py-3">Shift</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Reason</th>
                  <th className="text-right px-5 py-3">Mins</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {downtime.slice(0, 50).map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3 tabular">{d.date}</td>
                    <td className="px-5 py-3">{byId[d.machineId]?.code || "—"}</td>
                    <td className="px-5 py-3 text-center">{d.shift}</td>
                    <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{d.category}</span></td>
                    <td className="px-5 py-3 text-muted-foreground">{d.reason}</td>
                    <td className="px-5 py-3 text-right tabular text-destructive">{d.minutes}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => del(d.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></td>
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
