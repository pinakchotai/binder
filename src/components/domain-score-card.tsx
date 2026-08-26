"use client";

import Link from "next/link";
import { IconAltArrowRightBold } from "@ninzapp/solar-icons/bold";
import { DOMAIN_META, type DomainId } from "@/lib/domains";

export const DOMAIN_HEX: Record<DomainId, string> = {
  non_negotiables: "#f87171",
  academia: "#38bdf8",
  physical: "#fb923c",
  personal_growth: "#34d399",
};

interface DomainScoreCardProps {
  domain: DomainId;
  score: number | null;
  habitCount: number;
  completedCount: number;
}

export default function DomainScoreCard({
  domain,
  score,
  habitCount,
  completedCount,
}: DomainScoreCardProps) {
  const meta = DOMAIN_META[domain];
  const hex = DOMAIN_HEX[domain];
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <Link
      href={`/domain/${domain}`}
      className="group block border-[2px] border-card-border bg-card-bg p-5 transition-colors hover:border-white/15"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate font-sans text-xs font-bold tracking-tight"
            style={{ color: hex }}
          >
            {meta.label}
          </p>
          <p className="mt-0.5 truncate font-sans text-[10px] text-muted">
            {meta.subtitle}
          </p>
        </div>
        <IconAltArrowRightBold className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70" />
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
        {score == null ? "--" : Math.round(score)}
        <span className="text-sm font-bold text-muted">/100</span>
      </p>
      <div className="mt-2 h-1 w-full bg-input-bg">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: hex }}
        />
      </div>
      <p className="mt-2.5 font-sans text-[10px] text-muted">
        {completedCount}/{habitCount} done today
      </p>
    </Link>
  );
}
