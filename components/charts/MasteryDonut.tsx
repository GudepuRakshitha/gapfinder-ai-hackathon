"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { GapAnalysis } from "@/backend/types";
import { CHART_COLORS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";

const LABELS: { key: keyof GapAnalysis["distribution"]; label: string; color: string }[] = [
  { key: "weak", label: "Weak", color: CHART_COLORS.weak },
  { key: "medium", label: "Medium", color: CHART_COLORS.medium },
  { key: "strong", label: "Strong", color: CHART_COLORS.strong },
  { key: "notAssessed", label: "Not assessed", color: CHART_COLORS.notAssessed },
];

export function MasteryDonut({
  distribution,
  overallMastery,
  assessed,
  total,
}: {
  distribution: GapAnalysis["distribution"];
  overallMastery: number;
  assessed: number;
  total: number;
}) {
  const data = LABELS.map((item) => ({
    name: item.label,
    value: distribution[item.key],
    color: item.color,
  })).filter((item) => item.value > 0);

  if (!data.length) {
    return (
      <div className="flex h-[190px] items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
        No topics mapped yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              }}
              formatter={(value) => [`${value} topics`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {formatPercent(overallMastery)}
        </span>
        <span className="text-[10px] font-medium text-slate-500">
          {assessed}/{total} assessed
        </span>
      </div>
    </div>
  );
}

export function DistributionLegend({ distribution }: { distribution: GapAnalysis["distribution"] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {LABELS.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
          <span className="text-xs font-bold text-slate-900">{distribution[item.key]}</span>
        </div>
      ))}
    </div>
  );
}
