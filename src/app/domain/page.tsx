"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isDomainId, DOMAIN_META } from "@/lib/domains";
import DomainPageClient from "@/components/domain-page";
import AppShell from "@/components/app-shell";

function DomainContent() {
  const searchParams = useSearchParams();
  const domainId = searchParams.get("id") ?? "";

  if (!isDomainId(domainId)) {
    return (
      <AppShell
        header={
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                Domain
              </p>
              <h1 className="mt-1 font-mono text-lg font-bold tracking-tight text-foreground">
                Unknown domain
              </h1>
            </div>
          </div>
        }
      >
        <p className="mt-8 px-5 font-mono text-xs text-muted">
          The requested domain does not exist.
        </p>
      </AppShell>
    );
  }

  const meta = DOMAIN_META[domainId];

  return (
    <AppShell
      header={
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Domain
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">
              {meta.label}
            </h1>
          </div>
        </div>
      }
    >
      <DomainPageClient domainId={domainId} />
    </AppShell>
  );
}

export default function DomainPage() {
  return (
    <Suspense fallback={null}>
      <DomainContent />
    </Suspense>
  );
}