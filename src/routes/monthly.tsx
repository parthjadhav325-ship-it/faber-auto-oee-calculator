import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/lib/auth";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export const Route = createFileRoute("/monthly")({
  head: () => ({ meta: [{ title: "Monthly Dashboard · OEE Control" }] }),
  component: () => (<RequireRole roles={["manager","admin"]}><MonthlyDashboard /></RequireRole>),
});

function MonthlyDashboard() {
  const { data: machines = [] } = useMachines();
  const { data: production = [] } = useProduction();
  const { data: downtime = [] } = useDowntime();
  const { data: rejections = [] } = useRejections();
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const machinesById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);

  const mProd = useMemo(() => production.filter((p) => p.date.startsWith(month)), [production, month]);
  const mDt = useMemo(() => downtime.filter((d) => d.date.startsWith(month)), [downtime, month]);
  const mRj = useMemo(() => rejections.filter((r) => r.date.startsWith(month)), [rejections, month]);
  const metrics = useMemo(() => computeMetrics(mProd, mDt, mRj, machinesById), [mProd, mDt, mRj, machinesById]);

  const daily = useMemo(() => {
    const dates = new Set<string>([...mProd.map((p)=>p.date), ...mDt.map((d)=>d.date), ...mRj.map((r)=>r.date)]);
    return Array.from(dates).sort().map((d) => {
      const p = mProd.filter((x)=>x.date===d);
      const dt = mDt.filter((x)=>x.date===d);
      const r = mRj.filter((x)=>x.date===d);
      const m = computeMetrics(p, dt, r, machinesById);
      return {
        date: d.slice(8),
        OEE: +(m.oee*100).toFixed(1),
        A: +(m.availability*100).toFixed(1),
        P: +(m.performance*100).toFixed(1),
        Q: +(m.quality*100).toFixed(1),
        Throughput: +m.throughputPerHour.toFixed(0),
      };
    });
  }, [mProd, mDt, mRj, machinesById]);

  return (
    <>
      <TopBar
        title="Monthly Performance Dashboard"
        subtitle="OEE trends and throughput analysis"
        right={
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-1.5 text-sm tabular" />
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Avg OEE" value={pct(metrics.oee)} tone={metrics.oee>=0.85?"success":metrics.oee>=0.6?"warning":"danger"} />
          <KpiCard label="Availability" value={pct(metrics.availability)} tone="info" />
          <KpiCard label="Performance" value={pct(metrics.performance)} tone="default" />
          <KpiCard label="Quality" value={pct(metrics.quality)} tone="success" />
          <KpiCard label="Throughput / hr" value={fix(metrics.throughputPerHour,1)} unit="parts" tone="info" />
          <KpiCard label="Units / Shift" value={num(metrics.unitsPerShift)} tone="default" hint={`${metrics.shiftCount} shifts`} />
          <KpiCard label="Lead Time" value={fix(metrics.leadTimeMin,2)} unit="min/unit" tone="default" />
          <KpiCard label="Machine Utilization" value={pct(metrics.utilization)} tone="info" />
          <KpiCard label="Downtime %" value={pct(metrics.downtimePct)} tone="danger" hint={`${num(metrics.downtimeMin)} min`} />
          <KpiCard label="Scrap %" value={pct(metrics.scrapPct)} tone="warning" hint={`${num(metrics.rejects)} rejected`} />
          <KpiCard label="Good Quantity" value={num(metrics.good)} tone="success" hint={`of ${num(metrics.output)} output`} />
          <KpiCard label="Achievement" value={pct(metrics.achievement)} tone={metrics.achievement>=0.9?"success":"warning"} />
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">OEE Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Daily Availability · Performance · Quality · OEE</p>
          {daily.length === 0 ? (
            <div className="h-[320px] grid place-items-center text-sm text-muted-foreground">No data for this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={daily}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="A" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="P" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Q" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="OEE" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">Throughput Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Average parts per hour by day</p>
          {daily.length === 0 ? (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="tput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="Throughput" stroke="var(--color-primary)" fill="url(#tput)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
