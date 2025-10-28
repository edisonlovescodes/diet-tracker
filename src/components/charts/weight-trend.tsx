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
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="rgba(20, 18, 18, 0.08)"
            vertical={false}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 12, fill: "#6C6A6A" }}
          />
          <YAxis
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fontSize: 12, fill: "#6C6A6A" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: "rgba(20, 18, 18, 0.2)" }}
            contentStyle={{
              backgroundColor: "#FCF6F5",
              borderRadius: 12,
              border: "1px solid rgba(20,18,18,0.08)",
              color: "#141212",
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
            stroke="#141212"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="#6C6A6A"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="goal"
            stroke="#FA4616"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
