"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "thebinder_settings";

export interface BinderSettings {
  userName: string;
  meditationTargetMin: number;
  wakeUpHour: number;
  wakeUpMinute: number;
  sleepHour: number;
  sleepMinute: number;
  screenDisconnectMinutes: number;
  waterTargetMl: number;
  accountabilityPartnerName: string;
  accountabilityPartnerPhone: string;
  partnerEmail: string;
}

const defaults: BinderSettings = {
  userName: "Hades",
  meditationTargetMin: 5,
  wakeUpHour: 6,
  wakeUpMinute: 0,
  sleepHour: 23,
  sleepMinute: 0,
  screenDisconnectMinutes: 60,
  waterTargetMl: 3000,
  accountabilityPartnerName: "",
  accountabilityPartnerPhone: "",
  partnerEmail: "",
};

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

function loadSettings(): BinderSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveToDisk(settings: BinderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // silent
  }
}

async function syncFromSupabase(): Promise<Partial<BinderSettings>> {
  try {
    const { data } = await supabase
      .from("user_settings")
      .select("user_name, partner_email")
      .eq("id", SETTINGS_ID)
      .single();
    if (!data) return {};
    return {
      userName: data.user_name ?? defaults.userName,
      partnerEmail: data.partner_email ?? defaults.partnerEmail,
    };
  } catch {
    return {};
  }
}

async function syncToSupabase(key: "user_name" | "partner_email", value: string) {
  try {
    await supabase
      .from("user_settings")
      .upsert({ id: SETTINGS_ID, [key]: value }, { onConflict: "id" });
  } catch {
    // silent
  }
}

interface SettingsContextValue {
  settings: BinderSettings;
  updateSetting: <K extends keyof BinderSettings>(key: K, value: BinderSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSetting: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BinderSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      const local = loadSettings();
      const remote = await syncFromSupabase();
      const merged = { ...local, ...remote };
      setSettings(merged);
      saveToDisk(merged);
      setLoaded(true);
    }
    init();
  }, []);

  const updateSetting = useCallback(
    <K extends keyof BinderSettings>(key: K, value: BinderSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveToDisk(next);
        if (key === "userName") syncToSupabase("user_name", value as string);
        if (key === "partnerEmail") syncToSupabase("partner_email", value as string);
        return next;
      });
    },
    [],
  );

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
