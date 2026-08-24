"use client";

import { useMemo } from "react";
import {
  HeatmapChart,
  HeatmapCells,
  HeatmapTooltip,
  levelStylesFromColors,
  type HeatmapColumn,
  type HeatmapLevelColors,
} from "@/components/charts/heatmap";
import { formatDate } from "@/lib/dashboard-data";

const WEEKS = 13;

/**
 * The library buckets every bin into 5 fixed levels (0 / 1 / 2 / 3 / >=4).
 * We feed band indices instead of raw scores so the fills match our bands,
 * and look the real score back up for the tooltip text.
 */
export function bandIndexForScore(score: number | null | undefined): number {
  if (score == null || score <= 0) return 0;
  if (score < 25) return 1;
  if (score < 50) return 2;
  if (score < 75) return 3;
  return 4;
}

const BAND_LEVEL_COLORS: HeatmapLevelColors = [
  "#27272a", // L0 untracked
  "#ef4444", // L1 red     <25
  "#fb923c", // L2 orange  <50
  "#facc15", // L3 yellow  <75
  "#22c55e", // L4 green   >=75 (incl. 100)
];

interface HistoryHeatmapProps {
  scoresByDate: Map<string, number>;
  onSelect: (date: string) => void;
}

export default function HistoryHeatmap({
  scoresByDate,
  onSelect,
}: HistoryHeatmapProps) {
  const columns: HeatmapColumn[] = useMemo(() => {
    // Anchor the grid so its LAST cell is the Saturday of the current week.
    // Bins after today are automatically hidden as ghosts by the library.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysIntoWeek = today.getDay(); // 0 = Sunday
    const totalDays = WEEKS * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1) + (6 - daysIntoWeek));

    const cols: HeatmapColumn[] = [];
    for (let c = 0; c < WEEKS; c++) {
      const bins = [];
      for (let r = 0; r < 7; r++) {
        const d = new Date(start);
        d.setDate(start.getDate() + c * 7 + r);
        const ds = formatDate(d);
        bins.push({
          bin: r,
          date: d,
          count: bandIndexForScore(scoresByDate.get(ds)),
        });
      }
      cols.push({ bin: c, bins });
    }
    return cols;
  }, [scoresByDate]);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <HeatmapChart
        data={columns}
        layout="fluid"
        gap={3}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        levelStyles={levelStylesFromColors(BAND_LEVEL_COLORS)}
      >
        <HeatmapCells
          cornerRadius={2}
          onBinClick={(bin) => onSelect(formatDate(bin.date))}
        />
        <HeatmapTooltip
          formatLabel={(_, date) => {
            const s = scoresByDate.get(formatDate(date));
            return s == null ? "No log" : `${Math.round(s)} / 100`;
          }}
        />
      </HeatmapChart>
    </div>
  );
}
