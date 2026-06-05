import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/lib/auth";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TopBar } from "@/components/top-bar";
import { KpiCard, OEEGauge } from "@/components/kpi-card";
import {
  fix, num, pct,
  metricsFromEvents,
  useEvents, useMachines, useProduction, useRejections,
  type Machine, type MachineEvent, type Production, type Rejection,
} from "@/lib/oee-data";
import {
  Activity, Gauge, PackageCheck, Percent, Timer, TrendingUp, Wrench, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Daily Dashboard · OEE Control" }] }),
  component: () => (<RequireRole roles={["manager","admin"]}><DailyDashboard /></RequireRole>),
});

const dayBounds = (date: string) => {
  const from = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  const until = end > new Date() ? new Date() : end;
  return { from, until };
};

function dayMetrics(
  machines: Machine[],
  events: MachineEvent[],
  production: Production[],
  rejections: Rejection[],
  date: string,
) {
  const { from, until } = dayBounds(date);
  const byMachine = new Map<string, MachineEvent[]>();
  for (const e of events) {
    if (!byMachine.has(e.machine_id)) byMachine.set(e.machine_id, []);
    byMachine.get(e.machine_id)!.push(e);
  }
  let runtimeMin = 0, downtimeMin = 0, output = 0, rejects = 0;
  let idealParts = 0, failures = 0;
  let mttrSum = 0, mtbfSum = 0, mttrN = 0, mtbfN = 0;
  const reasonMin = new Map<string, number>();

  for (const m of machines) {
    const k = metricsFromEvents(byMachine.get(m.id) || [], { from, until });
    runtimeMin += k.runtimeMin;
    downtimeMin += k.downtimeMin;
    failures += k.failures;
    if (k.failures > 0) { mttrSum += k.mttrMin * k.failures; mttrN += k.failures; }
    if (k.failures > 0) { mtbfSum += k.mtbfMin * k.failures; mtbfN += k.failures; }
    for (const r of k.byReason)
      reasonMin.set(r.reason, (reasonMin.get(r.reason) || 0) + r.minutes);
    idealParts += (k.runtimeMin * 60) / (Number(m.ideal_cycle_time_seconds) || 1);
  }
  const dayProd = production.filter((p) => p.date === date);
  const dayRj = rejections.filter((r) => r.date === date);
  output = dayProd.reduce((s, p) => s + Number(p.output_qty), 0);
  rejects = dayRj.reduce((s, r) => s + Number(r.reject_qty), 0);
  const good = Math.max(0, output - rejects);

  const total = runtimeMin + downtimeMin;
  const availability = total > 0 ? runtimeMin / total : 0;
  const performance = idealParts > 0 ? Math.min(1, output / idealParts) : 0;
  const quality = output > 0 ? good / output : 0;
  const oee = availability * performance * quality;

  return {
    runtimeMin, downtimeMin, output, rejects, good,
    availability, performance, quality, oee,
    failures,
    mttrMin: mttrN > 0 ? mttrSum / mttrN : 0,
    mtbfMin: mtbfN > 0 ? mtbfSum / mtbfN : 0,
    downtimePct: total > 0 ? downtimeMin / total : 0,
    scrapPct: output > 0 ? rejects / output : 0,
    throughputPerHour: runtimeMin > 0 ? (good / runtimeMin) * 60 : 0,
    byReason: [...reasonMin.entries()]
      .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
      .sort((a, b) => b.value - a.value),
  };
}

function DailyDashboard() {
  const { data: machines = [] } = useMachines();
  const { data: events = [] } = useEvents();
  const { data: production = [] } = useProduction();
  const { data: rejections = [] } = useRejections();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const m = useMemo(
    () => dayMetrics(machines, events, production, rejections, date),
    [machines, events, production, rejections, date],
  );

  const perMachine = useMemo(() => {
    const { from, until } = dayBounds(date);
    return machines.map((mc) => {
      const evs = events.filter((e) => e.machine_id === mc.id);
      const k = metricsFromEvents(evs, { from, until });
      const out = production
        .filter((p) => p.date === date && p.machine_id === mc.id)
        .reduce((s, p) => s + Number(p.output_qty), 0);
      const rej = rejections
        .filter((r) => r.date === date && r.machine_id === mc.id)
        .reduce((s, r) => s + Number(r.reject_qty), 0);
      const ideal = (k.runtimeMin * 60) / (Number(mc.ideal_cycle_time_seconds) || 1);
      const perf = ideal > 0 ? Math.min(1, out / ideal) : 0;
      const qual = out > 0 ? Math.max(0, out - rej) / out : 0;
      const oee = k.availability * perf * qual;
      return {
        name: mc.machine_code,
        OEE: +(oee * 100).toFixed(1),
        A: +(k.availability * 100).toFixed(1),
        P: +(perf * 100).toFixed(1),
        Q: +(qual * 100).toFixed(1),
      };
    });
  }, [machines, events, production, rejections, date]);

  const dtColors = [
    "var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)",
    "var(--color-chart-4)","var(--color-chart-5)",
  ];

  return (
    <>
      <TopBar
        title="Daily Production Dashboard"
        subtitle="Live OEE from machine Start/Stop events"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="OEE" value={pct(m.oee)} tone={m.oee>=0.85?"success":m.oee>=0.6?"warning":"danger"} icon={<Gauge className="size-4" />} />
          <KpiCard label="Availability" value={pct(m.availability)} tone="info" />
          <KpiCard label="Performance" value={pct(m.performance)} tone="default" />
          <KpiCard label="Quality" value={pct(m.quality)} tone="success" />
          <KpiCard label="Runtime" value={fix(m.runtimeMin, 0)} unit="min" tone="info" />
          <KpiCard label="Downtime" value={fix(m.downtimeMin, 0)} unit="min" tone="danger" icon={<Zap className="size-4" />} />
          <KpiCard label="MTTR" value={fix(m.mttrMin, 1)} unit="min" tone="warning" icon={<Wrench className="size-4" />} hint={`${m.failures} failures`} />
          <KpiCard label="MTBF" value={fix(m.mtbfMin, 1)} unit="min" tone="info" icon={<Timer className="size-4" />} />
          <KpiCard label="Throughput / hr" value={fix(m.throughputPerHour, 1)} unit="parts" tone="info" icon={<TrendingUp className="size-4" />} />
          <KpiCard label="Downtime %" value={pct(m.downtimePct)} tone="danger" />
          <KpiCard label="Scrap %" value={pct(m.scrapPct)} tone="warning" icon={<Percent className="size-4" />} hint={`${num(m.rejects)} rejected`} />
          <KpiCard label="Good Quantity" value={num(m.good)} tone="success" icon={<PackageCheck className="size-4" />} hint={`of ${num(m.output)} output`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <OEEGauge value={m.oee} label="Overall OEE" />
          <OEEGauge value={m.availability} label="Availability" />
          <OEEGauge value={m.performance} label="Performance" />
          <OEEGauge value={m.quality} label="Quality" />
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
                <h3 className="text-sm font-semibold">Downtime Pareto</h3>
                <p className="text-xs text-muted-foreground">Minutes by reason</p>
              </div>
              <Activity className="size-4 text-muted-foreground" />
            </div>
            {m.byReason.length === 0 ? (
              <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">No downtime recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={m.byReason} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {m.byReason.map((_, i) => <Cell key={i} fill={dtColors[i % dtColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {m.byReason.length > 0 && (
          <div className="panel p-5">
            <h3 className="text-sm font-semibold mb-1">Downtime Pareto — Ranked</h3>
            <p className="text-xs text-muted-foreground mb-4">Largest contributors to downtime</p>
            <ResponsiveContainer width="100%" height={Math.max(200, m.byReason.length * 36)}>
              <BarChart data={m.byReason} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} unit=" min" />
                <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={160} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" name="Minutes" fill="var(--color-chart-1)" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
