"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthScreen from "@/components/auth-screen";
import { useAuth, notifyLocalAuthChanged } from "@/lib/auth";
import { isNativePlatform } from "@/lib/platform";
import { ensureLocalProfile, getLocalProfileId } from "@/lib/local-db";
import { IconCpuBold, IconRefreshBold, IconAltArrowLeftBold } from "@ninzapp/solar-icons/bold";

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center border border-accent/30 bg-accent/15">
        <IconCpuBold className="h-6 w-6 text-accent" />
      </div>
      <IconRefreshBold className="h-4 w-4 animate-spin text-muted" />
    </div>
  );
}

/** Native-only landing shown before any profile exists (no account yet). */
function NativeLanding() {
  const [screen, setScreen] = useState<"landing" | "auth">("landing");

  if (screen === "auth") {
    return (
      <div className="relative min-h-dvh bg-background">
        <button
          type="button"
          onClick={() => setScreen("landing")}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent"
        >
          <IconAltArrowLeftBold className="h-3.5 w-3.5" />
          Back
        </button>
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex h-12 w-12 items-center justify-center border border-accent/30 bg-accent/15">
        <IconCpuBold className="h-6 w-6 text-accent" />
      </div>
      <h1 className="mt-6 font-mono text-3xl font-bold tracking-tight text-foreground">
        The Binder
      </h1>
      <p className="mt-3 max-w-sm text-center font-mono text-sm text-muted">
        Track habits across 4 life domains and level up — no account needed.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            ensureLocalProfile();
            notifyLocalAuthChanged();
          }}
          className="inline-flex items-center justify-center gap-2 border border-button-bg bg-button-bg px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-button-text btn-primary"
        >
          Continue offline
        </button>
        <button
          type="button"
          onClick={() => setScreen("auth")}
          className="inline-flex items-center justify-center gap-2 border border-input-border px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          Sign in
        </button>
      </div>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted/60">
        Sign in later to back up this device
      </p>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const onboarded = user?.user_metadata?.onboarding_completed === true;

  useEffect(() => {
    if (!loading && user) {
      router.replace(onboarded ? "/dashboard" : "/onboarding");
    }
  }, [loading, user, onboarded, router]);

  if (loading) return <Splash />;
  if (user) return <Splash />;
  if (isNativePlatform() && !getLocalProfileId()) return <NativeLanding />;
  return <AuthScreen />;
}