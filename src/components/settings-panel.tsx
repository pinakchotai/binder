"use client";

import { useState } from "react";
import {
  Settings,
  Brain,
  Sunrise,
  Moon,
  WifiOff,
  Droplets,
  Users,
  User,
  Mail,
  ArrowLeft,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { useSettings } from "@/lib/settings";

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
    <div className="flex items-center gap-4 border-[2px] border-input-border bg-input-bg px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          {label}
        </p>
        <p className="font-mono text-[10px] text-muted mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const inputClass =
  "border-[2px] border-input-border bg-card-bg px-3 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none transition-colors w-32 text-center";

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const { settings, updateSetting } = useSettings();
  const [saved, setSaved] = useState(false);
  const [partnerSaved, setPartnerSaved] = useState(false);
  const [partnerName, setPartnerName] = useState(settings.accountabilityPartnerName);
  const [partnerPhone, setPartnerPhone] = useState(settings.accountabilityPartnerPhone);
  const [partnerEmail, setPartnerEmail] = useState(settings.partnerEmail);

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

  const handleSavePartner = () => {
    updateSetting("accountabilityPartnerName", partnerName);
    updateSetting("accountabilityPartnerPhone", partnerPhone);
    updateSetting("partnerEmail", partnerEmail);
    setPartnerSaved(true);
    setTimeout(() => setPartnerSaved(false), 3000);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b-[2px] border-card-border bg-card-bg px-8 py-5">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border-[2px] border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Settings
          </span>
        </div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
          Configuration
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Customize your targets and preferences
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-3">
            {/* User Name */}
            <SettingRow
              icon={User}
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
              icon={Brain}
              label="Meditation Target"
              description={`Minimum minutes per day (currently ${settings.meditationTargetMin} min)`}
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
              icon={Sunrise}
              label="Wake-up Time"
              description={`Target time to wake up (currently ${formatTime(settings.wakeUpHour, settings.wakeUpMinute)})`}
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
              icon={Moon}
              label="Sleep Time"
              description={`Target time to sleep (currently ${formatTime(settings.sleepHour, settings.sleepMinute)})`}
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
              icon={WifiOff}
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
              icon={Droplets}
              label="Water Target"
              description={`Daily water intake goal (currently ${(settings.waterTargetMl / 1000).toFixed(1)}L)`}
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

            {/* Accountability Partner */}
            <div className="border-[2px] border-input-border bg-input-bg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
                  <Users className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Accountability Partner
                  </p>
                  <p className="font-mono text-[10px] text-muted mt-0.5">Set your partner details for sharing and reports</p>
                </div>
              </div>

              <input
                type="text"
                placeholder="Partner name"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className={`${inputClass} text-left w-full`}
              />

              <input
                type="tel"
                placeholder="+91... (phone)"
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                className={`${inputClass} text-left w-full`}
              />

              <input
                type="email"
                placeholder="partner@email.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className={`${inputClass} text-left w-full`}
              />

              <button
                onClick={handleSavePartner}
                className={`flex w-full items-center justify-center gap-2 border-[2px] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  partnerSaved
                    ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                }`}
              >
                {partnerSaved ? (
                  <>
                    <Check className="h-3 w-3" />
                    Partner Saved
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Save Partner
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Saved indicator */}
          {saved && (
            <div className="mt-4 flex items-center justify-center gap-2 border-[2px] border-green-500/30 bg-green-500/10 px-4 py-2">
              <Save className="h-3 w-3 text-green-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-green-400">
                Saved
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
