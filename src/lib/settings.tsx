"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

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
  userName: "Champion",
  meditationTargetMin: 5,
  wakeUpHour: 6,
  wakeUpMinute: 0,
  sleepHour: 22,
  sleepMinute: 0,
  screenDisconnectMinutes: 60,
  waterTargetMl: 3000,
  accountabilityPartnerName: "",
  accountabilityPartnerPhone: "",
  partnerEmail: "",
};

// Columns synced to the per-user user_settings row (cross-device)
// Everything else stays local-only.
const SYNCED_COLUMNS = [
  "user_name",
  "partner_email",
  "water_target_ml",
  "meditation_target_min",
  "wake_up_hour",
  "sleep_hour",
] as const;

function localKey(userId: string) {
  return `thebinder_settings_${userId}`;
}

function loadLocal(userId: string): BinderSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveLocal(userId: string, settings: BinderSettings) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(settings));
  } catch {
    // silent
  }
}

function toRow(settings: BinderSettings) {
  return {
    user_name: settings.userName,
    partner_email: settings.partnerEmail,
    water_target_ml: settings.waterTargetMl,
    meditation_target_min: settings.meditationTargetMin,
    wake_up_hour: settings.wakeUpHour,
    sleep_hour: settings.sleepHour,
  };
}

function mergeRow(row: Record<string, unknown>, base: BinderSettings): BinderSettings {
  return {
    ...base,
    userName: (row.user_name as string) ?? base.userName,
    partnerEmail: (row.partner_email as string) ?? base.partnerEmail,
    waterTargetMl: (row.water_target_ml as number) ?? base.waterTargetMl,
    meditationTargetMin: (row.meditation_target_min as number) ?? base.meditationTargetMin,
    wakeUpHour: (row.wake_up_hour as number) ?? base.wakeUpHour,
    sleepHour: (row.sleep_hour as number) ?? base.sleepHour,
  };
}

interface SettingsContextValue {
  settings: BinderSettings;
  updateSetting: <K extends keyof BinderSettings>(key: K, value: BinderSettings[K]) => void;
  saveAll: () => Promise<void>;
  loadedForUser: string | null;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSetting: () => {},
  saveAll: async () => {},
  loadedForUser: null,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [settings, setSettings] = useState<BinderSettings>(defaults);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    async function init() {
      // Seed with the local cache, then overlay the remote per-user row.
      const local = loadLocal(userId!);
      try {
        const { data } = await supabase
          .from("user_settings")
          .select(SYNCED_COLUMNS.join(", "))
          .eq("user_id", userId!)
          .maybeSingle();
        if (cancelled) return;
        const merged = data
          ? mergeRow(data as unknown as Record<string, unknown>, local)
          : local;
        setSettings(merged);
        saveLocal(userId!, merged);
      } catch {
        if (cancelled) return;
        setSettings(local);
      }
      if (!cancelled) setLoadedForUser(userId!);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist synced columns to the user's row in Supabase
  const persist = useCallback(
    async (next: BinderSettings) => {
      if (!userId) return;
      try {
        await supabase.from("user_settings").upsert(
          { user_id: userId, ...toRow(next), updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      } catch {
        // silent — local copy still updated
      }
    },
    [userId],
  );

  const applyAndPersist = useCallback(
    (updater: (prev: BinderSettings) => BinderSettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        if (userId) saveLocal(userId, next);
        void persist(next);
        return next;
      });
    },
    [userId, persist],
  );

  const updateSetting = useCallback(
    <K extends keyof BinderSettings>(key: K, value: BinderSettings[K]) => {
      applyAndPersist((prev) => ({ ...prev, [key]: value }));
    },
    [applyAndPersist],
  );

  const saveAll = useCallback(async () => {
    if (userId) saveLocal(userId, settings);
    await persist(settings);
  }, [settings, persist, userId]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, saveAll, loadedForUser }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
