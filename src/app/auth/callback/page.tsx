"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      router.replace("/");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) {
        router.replace("/dashboard");
      } else {
        router.replace("/");
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
    </div>
  );
}
