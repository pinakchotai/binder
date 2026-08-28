"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconAltArrowLeftBold,
  IconDownloadBold,
  IconRefreshBold,
} from "@ninzapp/solar-icons/bold";
import { getUserId } from "@/lib/supabase";
import { db } from "@/lib/storage";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";
import {
  DEFAULT_DOMAIN_WEIGHTS,
  getActiveDomainWeights,
  MIN_ACTIVE_DOMAINS,
} from "@binder/engine";
import type { Domain } from "@binder/engine";
import { Card, Button } from "@/components/lithos";

interface DomainSettingRow {
  isActive: boolean;
  weightOverride: number | null;
}

type SettingsMap = Record<Domain, DomainSettingRow>;

function defaultSettings(): SettingsMap {
  return DOMAIN_IDS.reduce((acc, domain) => {
    acc[domain] = { isActive: true, weightOverride: null };
    return acc;
  }, {} as SettingsMap);
}

const inputClass =
  "border border-input-border bg-card-bg px-2 py-1 font-mono text-sm text-foreground focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none transition-colors w-20 text-center";

export default function DomainSettingsPanel({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [blockHint, setBlockHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await getUserId();
      if (!uid) {
        if (!cancelled) {
          setLoadError("Not signed in");
          setLoading(false);
        }
        return;
      }
      const { data, error } = await db
        .from("user_domain_settings")
        .select("domain, is_active, weight_override");
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      const next = defaultSettings();
      for (const row of data ?? []) {
        if (!DOMAIN_IDS.includes(row.domain as Domain)) continue;
        next[row.domain as Domain] = {
          isActive: row.is_active,
          weightOverride: row.weight_override == null ? null : Number(row.weight_override),
        };
      }
      setSettings(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(
    () => DOMAIN_IDS.filter((d) => settings[d].isActive).length,
    [settings],
  );

  let normalized: Record<Domain, number> | null = null;
  let normalizeError: string | null = null;
  try {
    normalized = getActiveDomainWeights(
      DOMAIN_IDS.map((domain) => ({
        domain,
        isActive: settings[domain].isActive,
        weightOverride: settings[domain].weightOverride,
      })),
    );
  } catch (e) {
    normalizeError = e instanceof Error ? e.message : "Invalid weight configuration";
  }

  const toggleDomain = (domain: Domain) => {
    setBlockHint(null);
    if (settings[domain].isActive && activeCount <= MIN_ACTIVE_DOMAINS) {
      setBlockHint(
        `At least ${MIN_ACTIVE_DOMAINS} domains must stay active. Turn another domain back on first.`,
      );
      return;
    }
    setSettings((prev) => ({
      ...prev,
      [domain]: { ...prev[domain], isActive: !prev[domain].isActive },
    }));
    setSaveError(null);
    setSaved(false);
  };

  const changeWeight = (domain: Domain, raw: string) => {
    setBlockHint(null);
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    const clamped = Math.max(1, Math.min(100, num));
    setSettings((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        weightOverride: clamped === DEFAULT_DOMAIN_WEIGHTS[domain] ? null : clamped,
      },
    }));
    setSaveError(null);
    setSaved(false);
  };

  const resetToDefaults = () => {
    setBlockHint(null);
    setSettings(defaultSettings());
    setSaveError(null);
    setSaved(false);
  };

  const save = async () => {
    const uid = await getUserId();
    if (!uid) {
      setSaveError("Not signed in");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const rows = DOMAIN_IDS.map((domain) => ({
      user_id: uid,
      domain,
      is_active: settings[domain].isActive,
      weight_override: settings[domain].weightOverride,
    }));
    const { error } = await db
      .from("user_domain_settings")
      .upsert(rows, { onConflict: "user_id,domain" });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
    setBlockHint(null);
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
            Domains
          </span>
        </div>
        <h2 className="font-mono text-xl font-bold tracking-tight text-foreground">
          Scoring Weights
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Choose which domains shape your daily score, and how heavily each counts.
        </p>
      </Card>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          {loading && (
            <Card className="flex items-center justify-center border-input-border bg-input-bg px-4 py-8">
              <span className="font-mono text-xs text-muted">Loading…</span>
            </Card>
          )}

          {!loading && loadError && (
            <Card className="flex items-center justify-center border-red-500/30 bg-red-500/10 px-4 py-8">
              <span className="font-mono text-xs text-red-400">
                Failed to load domain settings: {loadError}
              </span>
            </Card>
          )}

          {!loading && !loadError && (
            <div className="space-y-3">
              {DOMAIN_IDS.map((domain) => {
                const row = settings[domain];
                const meta = DOMAIN_META[domain];
                const effective =
                  normalized?.[domain] ?? DEFAULT_DOMAIN_WEIGHTS[domain];
                return (
                  <Card
                    key={domain}
                    className="flex items-center gap-4 border-input-border bg-input-bg px-4 py-4"
                  >
                    <button
                      type="button"
                      aria-pressed={row.isActive}
                      onClick={() => toggleDomain(domain)}
                      className={`flex h-6 w-12 shrink-0 items-center border transition-colors ${
                        row.isActive
                          ? "justify-end border-accent/60 bg-accent/20"
                          : "justify-start border-card-border bg-card-bg"
                      }`}
                      title={row.isActive ? "Deactivate domain" : "Activate domain"}
                    >
                      <span
                        className={`mx-0.5 h-4 w-4 transition-colors ${
                          row.isActive ? "bg-accent" : "bg-muted"
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold tracking-tight text-foreground">
                        {meta.label}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        {meta.subtitle}
                      </p>
                      <div className="mt-2 h-1 w-full bg-card-bg">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${effective}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[10px] text-muted">
                        {effective}%
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        disabled={!row.isActive}
                        value={row.weightOverride ?? DEFAULT_DOMAIN_WEIGHTS[domain]}
                        onChange={(e) => changeWeight(domain, e.target.value)}
                        className={`${inputClass} ${!row.isActive ? "opacity-40" : ""}`}
                      />
                    </div>
                  </Card>
                );
              })}

              <Card className="border-input-border bg-input-bg px-4 py-3">
                <p className="font-mono text-[10px] leading-relaxed text-muted">
                  {activeCount} domain{activeCount === 1 ? "" : "s"} active · weights
                  are automatically normalized — inactive domains are excluded, the
                  rest rescaled to total 100%. Values below are the effective
                  percentages used for scoring.
                </p>
                {normalizeError && (
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-red-400">
                    {normalizeError}
                  </p>
                )}
                {blockHint && (
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-amber-400">
                    {blockHint}
                  </p>
                )}
              </Card>

              <div className="flex items-center gap-3">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="secondary" onClick={resetToDefaults}>
                  <IconRefreshBold className="h-4 w-4" />
                  Reset
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 border border-green-500/30 bg-green-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-400">
                    <IconDownloadBold className="h-3 w-3" />
                    Saved
                  </span>
                )}
                {saveError && (
                  <span className="font-mono text-[10px] text-red-400">
                    {saveError}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}