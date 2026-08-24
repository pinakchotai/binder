import { notFound } from "next/navigation";
import { isDomainId } from "@/lib/domains";
import DomainPageClient from "@/components/domain-page";

export default async function DomainRoute({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const { domainId } = await params;
  if (!isDomainId(domainId)) {
    notFound();
  }
  return <DomainPageClient domainId={domainId} />;
}
