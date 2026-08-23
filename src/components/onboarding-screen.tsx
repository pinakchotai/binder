"use client";

import { useState } from "react";
import { Layers, Loader2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";

const inputClass =
  "w-full border-[2px] border-input-border bg-input-bg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-input-focus focus:outline-none transition-colors text-center";

interface FieldProps {
  label: string;
  hint: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      {children}
      <p className="mt-1 font-mono text-[10px] text-muted/60">{hint}</p>
    </div>
  );
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { settings, updateSetting, saveAll } = useSettings();
  const { user } = useAuth();
  const [name, setName] = useState(settings.userName === "Champion" ? "" : settings.userName);
  const [waterTargetMl, setWaterTargetMl] = useState(String(settings.waterTargetMl));
  const [meditationTargetMin, setMeditationTargetMin] = useState(String(settings.meditationTargetMin));
  const [partnerEmail, setPartnerEmail] = useState(settings.partnerEmail);
  const [busy, setBusy] = useState(false);

    const handleFinish = async () => {
    setBusy(true);
    if (name.trim()) updateSetting("userName", name.trim());
    if (partnerEmail.trim()) updateSetting("partnerEmail", partnerEmail.trim());
    const wt = parseInt(waterTargetMl, 10);
    if (!isNaN(wt) && wt >= 500) updateSetting("waterTargetMl", wt);
    const mt = parseInt(meditationTargetMin, 10);
    if (!isNaN(mt) && mt >= 1) updateSetting("meditationTargetMin", mt);
    await saveAll();
    // Server-side flag so other devices (web or Android) skip onboarding too.
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    } catch {}
    if (user) localStorage.setItem(`thebinder_onboarded_${user.id}`, "true");
    setBusy(false);
    onDone();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-[2px] border-accent/30 bg-accent/15">
            <Layers className="h-6 w-6 text-accent" />
          </div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-[0.25em] text-foreground">
            Welcome
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            Set up your binder
          </p>
        </div>

        <div className="border-[2px] border-card-border bg-card-bg">
          <div className="border-b-[2px] border-card-border px-5 py-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
              Your Targets
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <Field label="Display name" hint="Shown in your greeting and reports">
              <input
                type="text"
                placeholder="champion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Daily water target" hint="Hydration habit auto-completes at this amount (ml)">
              <input
                type="number"
                min={500}
                step={250}
                value={waterTargetMl}
                onChange={(e) => setWaterTargetMl(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Meditation target" hint="Minimum minutes per day (+20 pts)">
              <input
                type="number"
                min={1}
                value={meditationTargetMin}
                onChange={(e) => setMeditationTargetMin(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Accountability partner email" hint="Optional — receives your daily report">
              <input
                type="email"
                placeholder="partner@email.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className={`${inputClass} text-left`}
              />
            </Field>

            <button
              onClick={handleFinish}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Start Tracking
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <button
              onClick={onDone}
              className="flex w-full items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent"
            >
              <Check className="h-3 w-3" />
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
