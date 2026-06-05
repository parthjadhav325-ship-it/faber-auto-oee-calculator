import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TopBar } from "@/components/top-bar";
import { KpiCard, OEEGauge } from "@/components/kpi-card";
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
import { Activity, Gauge, PackageCheck, Percent, Timer, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Daily Dashboard · OEE Control" }] }),
  component: DailyDashboard,
});

function DailyDashboard() {
  const { data: machines = [] } = useMachines();
  const { data: production = [] } = useProduction();
  const { data: downtime = [] } = useDowntime();
  const { data: rejections = [] } = useRejections();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const machinesById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);
  const dayProd = useMemo(() => production.filter((p) => p.date === date), [production, date]);
  const dayDt = useMemo(() => downtime.filter((d) => d.date === date), [downtime, date]);
  const dayRj = useMemo(() => rejections.filter((r) => r.date === date), [rejections, date]);
  const metrics = useMemo(() => computeMetrics(dayProd, dayDt, dayRj, machinesById), [dayProd, dayDt, dayRj, machinesById]);

  const perMachine = useMemo(() => machines.map((m) => {
    const p = dayProd.filter((x) => x.machine_id === m.id);
    const d = dayDt.filter((x) => x.machine_id === m.id);
    const r = dayRj.filter((x) => x.machine_id === m.id);
    const mm = computeMetrics(p, d, r, machinesById);
    return { name: m.machine_code, OEE: +(mm.oee*100).toFixed(1), A: +(mm.availability*100).toFixed(1), P: +(mm.performance*100).toFixed(1), Q: +(mm.quality*100).toFixed(1) };
  }), [machines, dayProd, dayDt, dayRj, machinesById]);

  const shiftData = useMemo(() => (["A","B","C"] as const).map((s) => {
    const p = dayProd.filter((x) => x.shift === s);
    const d = dayDt.filter((x) => x.shift === s);
    const r = dayRj.filter((x) => x.shift === s);
    const mm = computeMetrics(p, d, r, machinesById);
    return { shift: `Shift ${s}`, OEE: +(mm.oee*100).toFixed(1), Throughput: +mm.throughputPerHour.toFixed(0) };
  }), [dayProd, dayDt, dayRj, machinesById]);

  const dtByReason = useMemo(() => {
    const map: Record<string, number> = {};
    dayDt.forEach((d) => { map[d.downtime_reason] = (map[d.downtime_reason] || 0) + Number(d.downtime_minutes); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
  }, [dayDt]);
  const dtColors = ["var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)","var(--color-chart-5)"];

  return (
    <>
      <TopBar
        title="Daily Production Dashboard"
        subtitle="Real-time OEE across all machines and shifts"
        right={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-1.5 text-sm tabular" />
        }
      />
      <div className="p-6 space-y-6">
        {/* Top KPI cards — all 12 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="OEE" value={pct(metrics.oee)} tone={metrics.oee>=0.85?"success":metrics.oee>=0.6?"warning":"danger"} icon={<Gauge className="size-4" />} />
          <KpiCard label="Availability" value={pct(metrics.availability)} tone="info" />
          <KpiCard label="Performance" value={pct(metrics.performance)} tone="default" />
          <KpiCard label="Quality" value={pct(metrics.quality)} tone="success" />
          <KpiCard label="Throughput / hr" value={fix(metrics.throughputPerHour, 1)} unit="parts" tone="info" icon={<TrendingUp className="size-4" />} />
          <KpiCard label="Units / Shift" value={num(metrics.unitsPerShift)} tone="default" hint={`${metrics.shiftCount} shifts`} />
          <KpiCard label="Lead Time" value={fix(metrics.leadTimeMin, 2)} unit="min/unit" tone="default" icon={<Timer className="size-4" />} />
          <KpiCard label="Machine Utilization" value={pct(metrics.utilization)} tone="info" />
          <KpiCard label="Downtime %" value={pct(metrics.downtimePct)} tone="danger" icon={<Zap className="size-4" />} hint={`${num(metrics.downtimeMin)} min`} />
          <KpiCard label="Scrap %" value={pct(metrics.scrapPct)} tone="warning" icon={<Percent className="size-4" />} hint={`${num(metrics.rejects)} rejected`} />
          <KpiCard label="Good Quantity" value={num(metrics.good)} tone="success" icon={<PackageCheck className="size-4" />} hint={`of ${num(metrics.output)} output`} />
          <KpiCard label="Production Achievement" value={pct(metrics.achievement)} tone={metrics.achievement>=0.9?"success":"warning"} hint={`vs ${num(metrics.plannedTargetParts)} target`} />
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
            {perMachine.length === 0 ? (
              <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">No machines configured</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={perMachine}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="A" name="Availability" fill="var(--color-chart-3)" radius={[2,2,0,0]} />
                  <Bar dataKey="P" name="Performance" fill="var(--color-chart-1)" radius={[2,2,0,0]} />
                  <Bar dataKey="Q" name="Quality" fill="var(--color-chart-2)" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Downtime by Reason</h3>
                <p className="text-xs text-muted-foreground">Minutes lost today</p>
              </div>
              <Activity className="size-4 text-muted-foreground" />
            </div>
            {dtByReason.length === 0 ? (
              <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">No downtime recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dtByReason} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {dtByReason.map((_, i) => <Cell key={i} fill={dtColors[i % dtColors.length]} />)}
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
                const p = dayProd.filter((x) => x.machine_id === m.id);
                const d = dayDt.filter((x) => x.machine_id === m.id);
                const r = dayRj.filter((x) => x.machine_id === m.id);
                const mm = computeMetrics(p, d, r, machinesById);
                const tone = mm.oee >= 0.85 ? "bg-success" : mm.oee >= 0.6 ? "bg-warning" : "bg-destructive";
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.machine_code}</div>
                      <div className="text-xs text-muted-foreground">{m.machine_name}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{m.line}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.availability)}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.performance)}</td>
                    <td className="px-5 py-3 text-right tabular">{pct(mm.quality)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold">{pct(mm.oee)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${mm.oee >= 0.85 ? "text-success" : mm.oee >= 0.6 ? "text-warning" : "text-destructive"}`}>
                        <span className={`size-2 rounded-full ${tone}`} />
                        {p.length === 0 ? "No Data" : mm.oee >= 0.85 ? "Optimal" : mm.oee >= 0.6 ? "Acceptable" : "Critical"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {machines.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No machines configured. Go to Machine Master to add some.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
