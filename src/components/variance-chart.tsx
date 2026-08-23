"use client";

import { useMemo } from "react";
import { LinePath, Line as VisxLine } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { GridRows } from "@visx/grid";
import { curveMonotoneX } from "@visx/curve";
import type { PracticeQuestion } from "@/lib/supabase";

interface Props {
  questions: PracticeQuestion[];
}

interface VariancePoint {
  label: string;
  value: number;
}

export default function VarianceChart({ questions }: Props) {
  const data = useMemo<VariancePoint[]>(() => {
    const sorted = [...questions]
      .filter((q) => q.actual_time_minutes !== null)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    return sorted.map((q) => ({
      label: q.question_name,
      value: (q.actual_time_minutes ?? 0) - q.target_time_minutes,
    }));
  }, [questions]);

  if (data.length === 0) {
    return (
      <div className="mb-4 flex h-72 items-center justify-center rounded-lg border border-dashed border-input-border">
        <p className="text-xs text-muted">
          Chart will appear once practice sums are logged.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 h-72 w-full">
      <ResponsiveLineChart data={data} />
    </div>
  );
}

function ResponsiveLineChart({ data }: { data: VariancePoint[] }) {
  const width = 800;
  const height = 288;
  const margin = { top: 20, right: 20, bottom: 50, left: 45 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const yExtent = useMemo(() => {
    const vals = data.map((d) => d.value);
    const lo = Math.min(...vals, 0);
    const hi = Math.max(...vals, 0);
    const pad = Math.max((hi - lo) * 0.15, 1);
    return [lo - pad, hi + pad] as [number, number];
  }, [data]);

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, data.length - 1],
        range: [0, innerW],
      }),
    [data.length, innerW],
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: yExtent,
        range: [innerH, 0],
        nice: true,
      }),
    [yExtent, innerH],
  );

  const zeroY = yScale(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${margin.left},${margin.top})`}>
        <GridRows
          scale={yScale}
          width={innerW}
          stroke="#27272a"
          strokeDasharray="4,4"
        />

        <VisxLine
          from={{ x: 0, y: zeroY }}
          to={{ x: innerW, y: zeroY }}
          stroke="#52525b"
          strokeWidth={1}
          strokeDasharray="6,4"
        />

        <LinePath
          data={data}
          x={(_, i) => xScale(i)}
          y={(d) => yScale(d.value)}
          curve={curveMonotoneX}
          stroke="#f59e0b"
          strokeWidth={2}
        />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r={4}
            fill={d.value > 0 ? "#f87171" : "#4ade80"}
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
              {tick > 0 ? "+" : ""}
              {tick}m
            </text>
          ))}
        </g>
        <g>
          {data.map((d, i) => {
            const tickCount = data.length;
            const skip = tickCount > 8 ? Math.ceil(tickCount / 8) : 1;
            if (i % skip !== 0 && i !== tickCount - 1) return null;
            const xPos = xScale(i);
            return (
              <text
                key={i}
                x={xPos}
                y={innerH + 20}
                textAnchor="middle"
                className="fill-muted"
                fontSize={9}
                transform={`rotate(-25, ${xPos}, ${innerH + 20})`}
              >
                {d.label.length > 12
                  ? d.label.slice(0, 12) + "…"
                  : d.label}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
