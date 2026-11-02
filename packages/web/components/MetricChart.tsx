"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MetricPoint {
  date: string;
  value: number;
}

/**
 * Recharts area chart of a metric over snapshot history.
 * Rendered only when history exists; the parent shows a placeholder otherwise.
 */
export function MetricChart({ data }: { data: MetricPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-52 w-full" role="img" aria-label="Metric history chart from pinned snapshots">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00EC97" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00EC97" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#5c5c5c"
            tick={{ fill: "#8a8a8a", fontSize: 10, fontFamily: "var(--font-geist-mono), monospace" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(v: string) => String(v).slice(5, 10)}
          />
          <YAxis
            width={64}
            stroke="#5c5c5c"
            tick={{ fill: "#8a8a8a", fontSize: 10, fontFamily: "var(--font-geist-mono), monospace" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={fmtAxis}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#101010",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 0,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
            }}
            labelStyle={{ color: "#8a8a8a" }}
            itemStyle={{ color: "#00EC97" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00EC97"
            strokeWidth={2}
            fill="url(#metricFill)"
            dot={{ r: 2, fill: "#00EC97" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  if (abs < 1) return v.toFixed(2);
  return v.toFixed(1);
}
