"use client";

import LineChart, { Line } from "@/components/charts/line-chart";
import Grid from "@/components/charts/grid";
import XAxis from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import type { DomainId } from "@/lib/domains";

export const SERIES_KEY: Record<DomainId | "total", string> = {
  total: "Total",
  non_negotiables: "Non-Negotiables",
  academia: "Academia",
  physical: "Physical",
  personal_growth: "Growth",
};

export interface HistoryRow {
  date: Date;
  [key: string]: number | Date | null;
}

const TOTAL_HEX = "#f59e0b";

const DOMAIN_LINE_FAINT: Record<DomainId, string> = {
  non_negotiables: "#f8717166",
  academia: "#38bdf866",
  physical: "#fb923c66",
  personal_growth: "#34d39966",
};

const DOMAIN_LINE_BOLD: Record<DomainId, string> = {
  non_negotiables: "#f87171",
  academia: "#38bdf8",
  physical: "#fb923c",
  personal_growth: "#34d399",
};

interface HistoryLineChartProps {
  rows: HistoryRow[];
  filter: DomainId | "all";
}

export default function HistoryLineChart({ rows, filter }: HistoryLineChartProps) {
  if (rows.length === 0) {
    return (
      <div className="flex justify-center py-14">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          No score data in this range yet
        </p>
      </div>
    );
  }

  const lines =
    filter === "all"
      ? [
          ...(Object.keys(DOMAIN_LINE_FAINT) as DomainId[]).map((d) => (
            <Line
              key={d}
              dataKey={SERIES_KEY[d]}
              stroke={DOMAIN_LINE_FAINT[d]}
              strokeWidth={1.25}
              animate={false}
            />
          )),
          <Line key="total" dataKey={SERIES_KEY.total} stroke={TOTAL_HEX} strokeWidth={2.5} />,
        ]
      : [
          <Line
            key={filter}
            dataKey={SERIES_KEY[filter]}
            stroke={DOMAIN_LINE_BOLD[filter]}
            strokeWidth={2.5}
          />,
        ];

  return (
    <LineChart
      data={rows as unknown as Record<string, unknown>[]}
      margin={{ top: 16, right: 16, bottom: 4, left: 4 }}
      aspectRatio="5 / 2"
    >
      <Grid horizontal />
      {lines}
      <XAxis numTicks={5} />
      <ChartTooltip />
    </LineChart>
  );
}
