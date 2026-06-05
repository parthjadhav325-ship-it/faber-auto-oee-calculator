import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TopBar } from "@/components/top-bar";
import { KpiCard } from "@/components/kpi-card";
import {
  computeMetrics,
  fix,
  num,
  pct,
  useDowntime,
  useMachines,
  useProduction,
  useRejections,
} from "@/lib/oee-data";

export const Route = createFileRoute("/plant")({
  head: () => ({ meta: [{ title: "Plant Summary · OEE Control" }] }),
  component: PlantSummary,
});

function PlantSummary() {
  const { data: machines = [] } = useMachines();
  const { data: production = [] } = useProduction();
  const { data: downtime = [] } = useDowntime();
  const { data: rejections = [] } = useRejections();
  const machinesById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);

  const overall = useMemo(() => computeMetrics(production, downtime, rejections, machinesById),
    [production, downtime, rejections, machinesById]);

  const lines = useMemo(() => {
    const lineMap: Record<string, typeof machines> = {};
    machines.forEach((m) => { (lineMap[m.line] ||= []).push(m); });
    return Object.entries(lineMap).map(([line, ms]) => {
      const ids = new Set(ms.map((m) => m.id));
      const p = production.filter((x) => ids.has(x.machine_id));
      const d = downtime.filter((x) => ids.has(x.machine_id));
      const r = rejections.filter((x) => ids.has(x.machine_id));
      const m = computeMetrics(p, d, r, machinesById);
      return {
        line,
        machines: ms.length,
        OEE: +(m.oee * 100).toFixed(1),
        A: +(m.availability * 100).toFixed(1),
        P: +(m.performance * 100).toFixed(1),
        Q: +(m.quality * 100).toFixed(1),
        good: m.good,
        output: m.output,
      };
    });
  }, [machines, production, downtime, rejections, machinesById]);

  const topDefects = useMemo(() => {
    const map: Record<string, number> = {};
    rejections.forEach((r) => {
      const k = r.reject_reason || "Unspecified";
      map[k] = (map[k] || 0) + Number(r.reject_qty);
    });
    return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a,b) => b.qty - a.qty).slice(0, 6);
  }, [rejections]);

  return (
    <>
      <TopBar title="Plant Summary" subtitle="Aggregate performance across all production lines" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Plant OEE" value={pct(overall.oee)} tone={overall.oee>=0.85?"success":overall.oee>=0.6?"warning":"danger"} />
          <KpiCard label="Availability" value={pct(overall.availability)} tone="info" />
          <KpiCard label="Performance" value={pct(overall.performance)} tone="default" />
          <KpiCard label="Quality" value={pct(overall.quality)} tone="success" />
          <KpiCard label="Throughput / hr" value={fix(overall.throughputPerHour,1)} unit="parts" tone="info" />
          <KpiCard label="Units / Shift" value={num(overall.unitsPerShift)} tone="default" />
          <KpiCard label="Lead Time" value={fix(overall.leadTimeMin,2)} unit="min/unit" tone="default" />
          <KpiCard label="Utilization" value={pct(overall.utilization)} tone="info" />
          <KpiCard label="Downtime %" value={pct(overall.downtimePct)} tone="danger" hint={`${num(overall.downtimeMin)} min`} />
          <KpiCard label="Scrap %" value={pct(overall.scrapPct)} tone="warning" />
          <KpiCard label="Good Quantity" value={num(overall.good)} tone="success" hint={`${num(overall.output)} output`} />
          <KpiCard label="Achievement" value={pct(overall.achievement)} tone={overall.achievement>=0.9?"success":"warning"} />
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Production Lines</h3>
            <p className="text-xs text-muted-foreground">All-time performance by line</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-5 py-3">Line</th>
                <th className="text-right px-5 py-3">Machines</th>
                <th className="text-right px-5 py-3">Avail</th>
                <th className="text-right px-5 py-3">Perf</th>
                <th className="text-right px-5 py-3">Qual</th>
                <th className="text-right px-5 py-3">OEE</th>
                <th className="text-right px-5 py-3">Good / Output</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.line} className="border-t border-border hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium">{l.line}</td>
                  <td className="px-5 py-3 text-right tabular">{l.machines}</td>
                  <td className="px-5 py-3 text-right tabular">{l.A}%</td>
                  <td className="px-5 py-3 text-right tabular">{l.P}%</td>
                  <td className="px-5 py-3 text-right tabular">{l.Q}%</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">
                    <span className={l.OEE>=85?"text-success":l.OEE>=60?"text-warning":"text-destructive"}>{l.OEE}%</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular text-muted-foreground">{num(l.good)} / {num(l.output)}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No machines configured</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">Top Defects (Pareto)</h3>
          <p className="text-xs text-muted-foreground mb-4">Highest contributors to rejections</p>
          {topDefects.length === 0 ? (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">No rejections recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topDefects} layout="vertical">
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="qty" fill="var(--color-destructive)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
