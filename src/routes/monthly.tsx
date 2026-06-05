import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TopBar } from "@/components/top-bar";
import { KpiCard } from "@/components/kpi-card";
import { computeOEE, num, pct, useOEE } from "@/lib/oee-store";

export const Route = createFileRoute("/monthly")({
  head: () => ({ meta: [{ title: "Monthly Dashboard · OEE Control" }] }),
  component: MonthlyDashboard,
});

function MonthlyDashboard() {
  const machines = useOEE((s) => s.machines);
  const production = useOEE((s) => s.production);
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const machinesById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);

  const monthProd = useMemo(() => production.filter((p) => p.date.startsWith(month)), [production, month]);
  const metrics = useMemo(() => computeOEE(monthProd, machinesById), [monthProd, machinesById]);

  const daily = useMemo(() => {
    const map: Record<string, typeof monthProd> = {};
    monthProd.forEach((p) => { (map[p.date] ||= []).push(p); });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([d, rows]) => {
      const m = computeOEE(rows, machinesById);
      return { date: d.slice(8), OEE: +(m.oee*100).toFixed(1), A: +(m.availability*100).toFixed(1), P: +(m.performance*100).toFixed(1), Q: +(m.quality*100).toFixed(1), Throughput: +m.throughput.toFixed(0) };
    });
  }, [monthProd, machinesById]);

  return (
    <>
      <TopBar
        title="Monthly Performance Dashboard"
        subtitle="OEE trends and throughput analysis"
        right={
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-1.5 text-sm tabular"
          />
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Avg OEE" value={pct(metrics.oee)} tone={metrics.oee>=0.85?"success":metrics.oee>=0.6?"warning":"danger"} />
          <KpiCard label="Availability" value={pct(metrics.availability)} tone="info" />
          <KpiCard label="Performance" value={pct(metrics.performance)} tone="default" />
          <KpiCard label="Quality" value={pct(metrics.quality)} tone="success" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Total Good Parts" value={num(metrics.goodParts)} tone="success" />
          <KpiCard label="Total Rejects" value={num(metrics.totalParts - metrics.goodParts)} tone="danger" />
          <KpiCard label="Avg Throughput" value={metrics.throughput.toFixed(1)} unit="parts/hr" tone="info" />
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">OEE Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Daily Availability · Performance · Quality · OEE</p>
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
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold mb-1">Throughput Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Average parts per hour by day</p>
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
        </div>
      </div>
    </>
  );
}
