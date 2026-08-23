"use client";

import { useMemo } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { GridRows } from "@visx/grid";
import { LinearGradient } from "@visx/gradient";
import { curveMonotoneX } from "@visx/curve";
import { extent, cumsum } from "d3-array";
import type { StudySession } from "@/lib/supabase";

interface Props {
  sessions: StudySession[];
}

interface CumulativePoint {
  date: Date;
  value: number;
}

export default function CumulativeHoursChart({ sessions }: Props) {
  const data = useMemo<CumulativePoint[]>(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const hours = sorted.map((s) => s.hours_spent);
    const running = Array.from(cumsum(hours));
    return sorted.map((s, i) => ({
      date: new Date(s.created_at),
      value: running[i],
    }));
  }, [sessions]);

  if (data.length === 0) {
    return (
      <div className="mb-4 flex h-72 items-center justify-center rounded-lg border border-dashed border-input-border">
        <p className="text-xs text-muted">
          Chart will appear once sessions are logged.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 h-72 w-full">
      <ResponsiveAreaChart data={data} />
    </div>
  );
}

function ResponsiveAreaChart({ data }: { data: CumulativePoint[] }) {
  const width = 800;
  const height = 288;
  const margin = { top: 20, right: 20, bottom: 30, left: 45 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: extent(data, (d) => d.date) as [Date, Date],
        range: [0, innerW],
      }),
    [data, innerW],
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, Math.max(...data.map((d) => d.value), 1)],
        range: [innerH, 0],
        nice: true,
      }),
    [data, innerH],
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <LinearGradient
          id="studyAreaGrad"
          from="#f59e0b"
          to="#f59e0b"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
          fromOpacity={0.25}
          toOpacity={0.02}
        />
      </defs>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <GridRows
          scale={yScale}
          width={innerW}
          stroke="#27272a"
          strokeDasharray="4,4"
        />
        <AreaClosed
          data={data}
          x={(d) => xScale(d.date)}
          y={(d) => yScale(d.value)}
          yScale={yScale}
          curve={curveMonotoneX}
          fill="url(#studyAreaGrad)"
        />
        <LinePath
          data={data}
          x={(d) => xScale(d.date)}
          y={(d) => yScale(d.value)}
          curve={curveMonotoneX}
          stroke="#f59e0b"
          strokeWidth={2}
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.date)}
            cy={yScale(d.value)}
            r={3}
            fill="#f59e0b"
            stroke="#0a0a0a"
            strokeWidth={1.5}
          />
        ))}
        <g>
          {yScale.ticks(5).map((tick) => (
            <text
              key={tick}
              x={-10}
              y={yScale(tick)}
              dy="0.35em"
              textAnchor="end"
              className="fill-muted"
              fontSize={10}
            >
              {tick}h
            </text>
          ))}
        </g>
        <g>
          {xScale.ticks(data.length > 6 ? 6 : data.length).map((tick) => (
            <text
              key={tick.getTime()}
              x={xScale(tick)}
              y={innerH + 20}
              textAnchor="middle"
              className="fill-muted"
              fontSize={10}
            >
              {new Date(tick).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}
