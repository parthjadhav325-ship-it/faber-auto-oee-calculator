import { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
}) {
  const toneRing = {
    default: "before:bg-primary",
    success: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-destructive",
    info: "before:bg-info",
  }[tone];
  return (
    <div className={`relative panel kpi-glow p-5 overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${toneRing}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="tabular text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {unit && <div className="text-sm text-muted-foreground">{unit}</div>}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function OEEGauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  const pct = (v * 100).toFixed(1);
  const color = v >= 0.85 ? "var(--color-success)" : v >= 0.6 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="panel p-5 flex flex-col items-center">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{label}</div>
      <div
        className="relative size-36 rounded-full grid place-items-center"
        style={{
          background: `conic-gradient(${color} ${v * 360}deg, var(--color-muted) 0deg)`,
        }}
      >
        <div className="absolute inset-2 rounded-full bg-panel grid place-items-center">
          <div className="tabular text-3xl font-semibold" style={{ color }}>{pct}%</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {v >= 0.85 ? "World Class" : v >= 0.6 ? "Typical" : "Needs Attention"}
      </div>
    </div>
  );
}
