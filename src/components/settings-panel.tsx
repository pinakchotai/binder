"use client";

import { useState } from "react";
import {
  IconLightbulbBold,
  IconSunriseBold,
  IconMoonBold,
  IconWiFiRouterBold,
  IconWaterBold,
  IconUserBold,
  IconAltArrowLeftBold,
  IconDownloadBold,
  IconShieldBold,
} from "@ninzapp/solar-icons/bold";
import { useSettings } from "@/lib/settings";
import { isLocalMode } from "@/lib/storage";
import { clearLocalProfile } from "@/lib/local-db";
import { Card, Button } from '@/components/lithos';

function formatTime(h: number, m: number): string {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

interface SettingRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ icon: Icon, label, description, children }: SettingRowProps) {
  return (
    <Card className="flex items-center gap-4 border-input-border bg-input-bg px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-accent/30 bg-accent/10">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-bold tracking-tight text-foreground">
          {label}
        </p>
        <p className="font-mono text-[10px] text-muted mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </Card>
  );
}

const inputClass =
  "border border-input-border bg-card-bg px-3 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none transition-colors w-32 text-center";

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const { settings, updateSetting } = useSettings();
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetLocal = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearLocalProfile();
    if (typeof window !== "undefined") window.location.reload();
  };

  const handleTimeChange = (
    key: "wakeUp" | "sleep",
    value: string,
  ) => {
    const parsed = parseTimeInput(value);
    if (!parsed) return;
    if (key === "wakeUp") {
      updateSetting("wakeUpHour", parsed.hour);
      updateSetting("wakeUpMinute", parsed.minute);
    } else {
      updateSetting("sleepHour", parsed.hour);
      updateSetting("sleepMinute", parsed.minute);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleNumberChange = (key: keyof typeof settings, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      updateSetting(key as never, num as never);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleTextChange = (key: keyof typeof settings, value: string) => {
    updateSetting(key as never, value as never);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Card className="shrink-0 border-b border-card-border bg-card-bg px-8 py-5">
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium text-muted transition-colors hover:text-foreground"
          >
          <IconAltArrowLeftBold className="h-3 w-3" />
          Back
        </button>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Settings
          </span>
        </div>
        <h2 className="font-mono text-xl font-bold tracking-tight text-foreground">
          Configuration
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Customize your targets and preferences
        </p>
      </Card>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-3">
            {/* User Name */}
            <SettingRow
              icon={IconUserBold}
              label="Your Name"
              description="Displayed in greeting and sidebar"
            >
              <input
                type="text"
                placeholder="your name"
                value={settings.userName}
                onChange={(e) => handleTextChange("userName", e.target.value)}
                className={`${inputClass} text-left`}
              />
            </SettingRow>

            {/* Meditation Target */}
            <SettingRow
              icon={IconLightbulbBold}
              label="Meditation Target"
              description={`Minimum minutes per day (currently ${settings.meditationTargetMin} min). This sets your default target when you first add this habit. To change an existing habit's target later, you'll need habit editing — coming soon.`}
            >
              <input
                type="number"
                min={1}
                value={settings.meditationTargetMin}
                onChange={(e) => handleNumberChange("meditationTargetMin", e.target.value)}
                className={inputClass}
              />
            </SettingRow>

            {/* Wake-up Time */}
            <SettingRow
              icon={IconSunriseBold}
              label="Wake-up Time"
              description={`Target time to wake up (currently ${formatTime(settings.wakeUpHour, settings.wakeUpMinute)}). Reminders based on this time are coming in a future update — this doesn't affect anything yet.`}
            >
              <input
                type="time"
                value={formatTime(settings.wakeUpHour, settings.wakeUpMinute)}
                onChange={(e) => handleTimeChange("wakeUp", e.target.value)}
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`}
              />
            </SettingRow>

            {/* Sleep Time */}
            <SettingRow
              icon={IconMoonBold}
              label="Sleep Time"
              description={`Target time to sleep (currently ${formatTime(settings.sleepHour, settings.sleepMinute)}). Reminders based on this time are coming in a future update — this doesn't affect anything yet.`}
            >
              <input
                type="time"
                value={formatTime(settings.sleepHour, settings.sleepMinute)}
                onChange={(e) => handleTimeChange("sleep", e.target.value)}
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert`}
              />
            </SettingRow>

            {/* Screen Disconnect */}
            <SettingRow
              icon={IconWiFiRouterBold}
              label="Screen Disconnect"
              description={`Minutes before sleep without screens (currently ${settings.screenDisconnectMinutes} min)`}
            >
              <input
                type="number"
                min={1}
                value={settings.screenDisconnectMinutes}
                onChange={(e) =>
                  handleNumberChange("screenDisconnectMinutes", e.target.value)
                }
                className={inputClass}
              />
            </SettingRow>

            {/* Water Target */}
            <SettingRow
              icon={IconWaterBold}
              label="Water Target"
              description={`Daily water intake goal (currently ${(settings.waterTargetMl / 1000).toFixed(1)}L). This sets your default target when you first add this habit. To change an existing habit's target later, you'll need habit editing — coming soon.`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={settings.waterTargetMl}
                  onChange={(e) => handleNumberChange("waterTargetMl", e.target.value)}
                  className={inputClass}
                />
                <span className="font-mono text-[10px] text-muted">ml</span>
              </div>
            </SettingRow>

            {/* Streak Freezes */}
            <SettingRow
              icon={IconShieldBold}
              label="Streak Freezes"
              description="Complete a 7-day streak to earn 1 freeze (up to 3 held). A freeze protects your streak from a missed day — missed days stay in your history, your streak simply never breaks."
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                Auto-earned
              </span>
            </SettingRow>
          </div>

          {/* Local-only reset */}
          {isLocalMode() && (
            <Card className="mt-4 flex items-center justify-between gap-4 border-red-500/30 bg-red-500/10 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">
                  Reset local data
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  Clears the offline profile on this device and restarts onboarding.
                </p>
              </div>
              <Button
                variant="text"
                onClick={handleResetLocal}
                className={`shrink-0 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  confirmReset
                    ? "border-red-400 bg-red-500/20 text-red-200"
                    : "border-input-border text-muted hover:text-red-300"
                }`}
              >
                {confirmReset ? "Tap again to confirm" : "Reset"}
              </Button>
            </Card>
          )}

          {/* Saved indicator */}
          {saved && (
            <Card className="mt-4 flex items-center justify-center gap-2 border-green-500/30 bg-green-500/10 px-4 py-2">
              <IconDownloadBold className="h-3 w-3 text-green-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-green-400">
                Saved
              </span>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
