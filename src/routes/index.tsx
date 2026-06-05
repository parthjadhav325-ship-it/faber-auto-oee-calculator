import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TopBar } from "@/components/top-bar";
import { KpiCard, OEEGauge } from "@/components/kpi-card";
import { computeOEE, num, pct, useOEE } from "@/lib/oee-store";
import { Activity, Gauge, PackageCheck, Timer, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Daily Dashboard · OEE Control" }] }),
  component: DailyDashboard,
});

function DailyDashboard() {
  const machines = useOEE((s) => s.machines);
  const production = useOEE((s) => s.production);
  const downtime = useOEE((s) => s.downtime);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const machinesById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);
  const dayProd = useMemo(() => production.filter((p) => p.date === date), [production, date]);
  const dayDt = useMemo(() => downtime.filter((d) => d.date === date), [downtime, date]);
  const metrics = useMemo(() => computeOEE(dayProd, machinesById), [dayProd, machinesById]);

  const perMachine = useMemo(() => machines.map((m) => {
    const rows = dayProd.filter((p) => p.machineId === m.id);
    const mm = computeOEE(rows, machinesById);
    return { name: m.code, oee: +(mm.oee * 100).toFixed(1), a: +(mm.availability * 100).toFixed(1), p: +(mm.performance * 100).toFixed(1), q: +(mm.quality * 100).toFixed(1) };
  }), [machines, dayProd, machinesById]);

  const shiftData = useMemo(() => (["A","B","C"] as const).map((s) => {
    const rows = dayProd.filter((p) => p.shift === s);
    const mm = computeOEE(rows, machinesById);
    return { shift: `Shift ${s}`, OEE: +(mm.oee * 100).toFixed(1), Throughput: +mm.throughput.toFixed(0) };
  }), [dayProd, machinesById]);

  const dtByCat = useMemo(() => {
    const map: Record<string, number> = {};
    dayDt.forEach((d) => { map[d.category] = (map[d.category] || 0) + d.minutes; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dayDt]);
  const dtColors = ["var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)","var(--color-chart-5)"];

  return (
    <>
      <TopBar
        title="Daily Production Dashboard"
        subtitle="Real-time OEE across all machines and shifts"
        right={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-1.5 text-sm tabular"
          />
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Good Parts" value={num(metrics.goodParts)} tone="success" icon={<PackageCheck className="size-4" />} hint={`of ${num(metrics.totalParts)} total`} />
          <KpiCard label="Throughput" value={metrics.throughput.toFixed(1)} unit="parts/hr" tone="info" icon={<TrendingUp className="size-4" />} />
          <KpiCard label="Runtime" value={num(metrics.runtimeMin)} unit="min" tone="default" icon={<Timer className="size-4" />} hint={`Planned ${num(metrics.plannedMin)} min`} />
          <KpiCard label="Downtime" value={num(dayDt.reduce((a, d) => a + d.minutes, 0))} unit="min" tone="danger" icon={<Zap className="size-4" />} hint={`${dayDt.length} events`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <OEEGauge value={metrics.oee} label="Overall OEE" />
          <OEEGauge value={metrics.availability} label="Availability" />
          <OEEGauge value={metrics.performance} label="Performance" />
          <OEEGauge value={metrics.quality} label="Quality" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">OEE by Machine</h3>
                <p className="text-xs text-muted-foreground">Availability · Performance · Quality</p>
              </div>
              <Gauge className="size-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perMachine}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="a" name="Availability" fill="var(--color-chart-3)" radius={[2,2,0,0]} />
                <Bar dataKey="p" name="Performance" fill="var(--color-chart-1)" radius={[2,2,0,0]} />
                <Bar dataKey="q" name="Quality" fill="var(--color-chart-2)" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Downtime by Reason</h3>
                <p className="text-xs text-muted-foreground">Minutes lost today</p>
              </div>
              <Activity className="size-4 text-muted-foreground" />
            </div>
            {dtByCat.length === 0 ? (
              <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">No downtime recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dtByCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {dtByCat.map((_, i) => <Cell key={i} fill={dtColors[i % dtColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">Shift Performance</h3>
          <p className="text-xs text-muted-foreground mb-4">OEE % and throughput per shift</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={shiftData}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="shift" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis yAxisId="l" stroke="var(--color-muted-foreground)" fontSize={11} unit="%" />
              <YAxis yAxisId="r" orientation="right" stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="OEE" fill="var(--color-chart-1)" radius={[2,2,0,0]} />
              <Bar yAxisId="r" dataKey="Throughput" fill="var(--color-chart-2)" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Machine Status · {date}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-5 py-3">Machine</th>
                <th className="text-left px-5 py-3">Line</th>
                <th className="text-right px-5 py-3">Avail</th>
                <th className="text-right px-5 py-3">Perf</th>
                <th className="text-right px-5 py-3">Qual</th>
                <th className="text-right px-5 py-3">OEE</th>
                <th className="text-right px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => {
                const rows = dayProd.filter((p) => p.machineId === m.id);
                const mm = computeOEE(rows, machinesById);
                const tone = mm.oee >= 0.85 ? "bg-success" : mm.oee >= 0.6 ? "bg-warning" : "bg-destructive";
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.code}</div>
                      <div className="text-xs text-muted-foreground">{m.name}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{m.line}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.availability)}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.performance)}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.quality)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold">{pct(mm.oee)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${mm.oee >= 0.85 ? "text-success" : mm.oee >= 0.6 ? "text-warning" : "text-destructive"}`}>
                        <span className={`size-2 rounded-full ${tone}`} />
                        {mm.oee >= 0.85 ? "Optimal" : mm.oee >= 0.6 ? "Acceptable" : "Critical"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
