"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyActivity, MasteryTrendPoint } from "@/backend/types";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

export function MasteryTrendChart({ data }: { data: MasteryTrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
        Submit a diagnostic quiz to start your trend
      </div>
    );
  }
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="masteryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d4aff" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#6d4aff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="mastery"
            name="Cumulative mastery"
            stroke="#6d4aff"
            strokeWidth={2}
            fill="url(#masteryFill)"
          />
          <Area
            type="monotone"
            dataKey="quizScore"
            name="Quiz score"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#scoreFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data }: { data: DailyActivity[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="minutes" name="Study minutes" fill="#6d4aff" radius={[6, 6, 0, 0]} maxBarSize={30} />
          <Bar dataKey="questions" name="Questions" fill="#93c5fd" radius={[6, 6, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
