"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import SettingsPanel from "@/components/settings-panel";

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <AppShell>
      <SettingsPanel onBack={() => router.push("/dashboard")} />
    </AppShell>
  );
}
