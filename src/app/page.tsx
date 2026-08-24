"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthScreen from "@/components/auth-screen";
import { useAuth } from "@/lib/auth";
import { Layers, Loader2 } from "lucide-react";

function Splash() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center border-[2px] border-accent/30 bg-accent/15">
        <Layers className="h-6 w-6 text-accent" />
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-muted" />
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
