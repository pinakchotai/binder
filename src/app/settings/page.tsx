"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import SettingsPanel from "@/components/settings-panel";

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <AppShell
      header={
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Configuration
            </p>
            <h1 className="mt-1 font-sans text-xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
        </div>
      }
    >
      <SettingsPanel onBack={() => router.push("/dashboard")} />
    </AppShell>
  );
}
