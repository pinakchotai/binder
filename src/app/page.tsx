"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthScreen from "@/components/auth-screen";
import { useAuth } from "@/lib/auth";
import { IconCpuBold, IconRefreshBold } from "@ninzapp/solar-icons/bold";

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
  if (!user) return <AuthScreen />;
  return <Splash />;
}
