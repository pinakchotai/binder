"use client";

import { useEffect } from "react";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth";
import { registerNativeBackButton } from "@/lib/native-back-button";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerNativeBackButton();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </AuthProvider>
  );
}