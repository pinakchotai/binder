import { notFound } from "next/navigation";
import { isDomainId, DOMAIN_META } from "@/lib/domains";
import DomainPageClient from "@/components/domain-page";
import AppShell from "@/components/app-shell";

export default async function DomainRoute({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const { domainId } = await params;
  if (!isDomainId(domainId)) {
    notFound();
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
            <h1 className="mt-1 font-sans text-xl font-bold tracking-tight text-foreground">
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
