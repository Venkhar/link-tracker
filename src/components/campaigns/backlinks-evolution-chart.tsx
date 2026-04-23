"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DataPoint {
  label: string;
  actifs: number;
  inactifs: number;
}

interface BacklinksEvolutionChartProps {
  data: DataPoint[];
}

/* Editorial palette — ink ground, signal lime for healthy, rust for loss. */
const INK = "#1A1816";
const INK_3 = "#716D65";
const RULE = "rgba(26, 24, 22, 0.12)";
const SIGNAL = "#D6FF47";
const SIGNAL_DEEP = "#9AC22A";
const RUST = "#C4461A";

export function BacklinksEvolutionChart({ data }: BacklinksEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center font-serif italic text-ink-3">
        Pas encore assez de données pour afficher un graphique.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="colorActifs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SIGNAL} stopOpacity={0.65} />
            <stop offset="100%" stopColor={SIGNAL} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInactifs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RUST} stopOpacity={0.22} />
            <stop offset="100%" stopColor={RUST} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 3" stroke={RULE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: INK_3, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: RULE }}
          tickLine={false}
          dy={4}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: INK_3, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: INK, strokeWidth: 1, strokeDasharray: "2 2" }}
          contentStyle={{
            borderRadius: 3,
            border: `1px solid ${INK}`,
            backgroundColor: "#F5F0E4",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: INK,
            boxShadow: "2px 2px 0 0 rgba(26, 24, 22, 0.9)",
            padding: "8px 12px",
          }}
          labelStyle={{ fontWeight: 600, color: INK, fontFamily: "var(--font-serif)", fontSize: 13, marginBottom: 4, textTransform: "none" }}
          itemStyle={{ color: INK_3 }}
          formatter={(value: number, name: string) => [value, name === "actifs" ? "Actifs" : "Inactifs"]}
        />
        <Legend
          wrapperStyle={{
            fontSize: 10,
            paddingTop: 12,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: INK_3,
          }}
          iconType="square"
          iconSize={8}
          formatter={(value) => <span style={{ color: INK_3 }}>{value === "actifs" ? "Actifs" : "Inactifs"}</span>}
        />
        <Area
          type="monotone"
          dataKey="actifs"
          stroke={SIGNAL_DEEP}
          strokeWidth={1.75}
          fill="url(#colorActifs)"
          dot={false}
          activeDot={{ r: 3, fill: INK, stroke: SIGNAL, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="inactifs"
          stroke={RUST}
          strokeWidth={1.75}
          fill="url(#colorInactifs)"
          dot={false}
          activeDot={{ r: 3, fill: INK, stroke: RUST, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
