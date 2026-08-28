"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import DomainSettingsPanel from "@/components/domain-settings-panel";

export default function DomainSettingsRoute() {
  const router = useRouter();
  return (
    <AppShell
      header={
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Configuration
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">
              Domain Weights
            </h1>
          </div>
        </div>
      }
    >
      <DomainSettingsPanel onBack={() => router.push("/settings")} />
    </AppShell>
  );
}