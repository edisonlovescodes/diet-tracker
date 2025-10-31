'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeightPoint = {
  date: string;
  weight: number;
  trend: number;
  goal: number;
};

type WeightTrendChartProps = {
  data: WeightPoint[];
};

export function WeightTrendChart({ data }: WeightTrendChartProps) {
  const palette = {
    weight: "var(--color-foreground)",
    trend: "color-mix(in oklab, var(--color-foreground) 60%, transparent)",
    goal: "var(--color-accent)",
    grid: "color-mix(in oklab, var(--color-foreground) 12%, transparent)",
    tooltipBackground: "var(--color-panel, var(--color-background))",
    tooltipBorder: "color-mix(in oklab, var(--color-foreground) 16%, transparent)",
    tooltipText: "var(--color-foreground)",
    axisTick: "color-mix(in oklab, var(--color-foreground) 65%, transparent)",
  } as const;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke={palette.grid}
            vertical={false}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 12, fill: palette.axisTick }}
          />
          <YAxis
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fontSize: 12, fill: palette.axisTick }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: palette.grid }}
            contentStyle={{
              backgroundColor: palette.tooltipBackground,
              borderRadius: 12,
              border: `1px solid ${palette.tooltipBorder}`,
              color: palette.tooltipText,
            }}
            formatter={(value, name) => {
              const label =
                name === "weight"
                  ? "Weight"
                  : name === "trend"
                    ? "Trend"
                    : "Goal";
              return [`${value} lb`, label];
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={palette.weight}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke={palette.trend}
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="goal"
            stroke={palette.goal}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
