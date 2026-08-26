"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");

  useEffect(() => {
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
  }, [code, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
    </div>
  );
}
