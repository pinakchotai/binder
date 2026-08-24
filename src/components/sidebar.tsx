"use client";

import { useState, useEffect, useRef } from "react";
import {
  Home,
  GraduationCap,
  Briefcase,
  Dumbbell,
  DollarSign,
  Layers,
  Zap,
  Settings,
  Send,
  Check,
  Loader2,
  AlertTriangle,
  LogOut,
  Flame,
  BookOpen,
  Activity,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { supabase, getUserId } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "daily-systems", label: "Daily Systems", icon: Zap },
  { id: "professional", label: "Professional", icon: Briefcase, comingSoon: true },
  { id: "physical", label: "Physical", icon: Dumbbell, comingSoon: true },
  { id: "financial", label: "Financial", icon: DollarSign, comingSoon: true },
];

const DOMAIN_ICONS: Record<(typeof DOMAIN_IDS)[number], React.ComponentType<{ className?: string }>> = {
  non_negotiables: Flame,
  academia: BookOpen,
  physical: Activity,
  personal_growth: Sprout,
};

interface SidebarProps {
  activePanel: string;
  onNavigate: (panel: string) => void;
}

export default function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  const { settings } = useSettings();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const displayName = settings.userName;
  const initial = displayName.charAt(0).toUpperCase();
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "queued" | "processing" | "sent" | "failed">("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const reportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSendReport = async () => {
    if (reportStatus === "sending" || reportStatus === "queued" || reportStatus === "processing" || reportStatus === "sent") return;
    if (!settings.partnerEmail) {
      setReportStatus("failed");
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
      reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
      return;
    }
    setReportStatus("sending");
    try {
      const userId = await getUserId();
      if (!userId) {
        setReportStatus("failed");
        reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
        return;
      }
      const { data, error } = await supabase
        .from("report_requests")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (error) {
        setReportStatus("failed");
        reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
      } else if (data) {
        setReportId(data.id);
        setReportStatus("queued");
        // Fire the edge function — it sends the email and marks the request sent.
        supabase.functions
          .invoke("send-report", { body: { user_id: userId } })
          .catch(() => {
            setReportStatus("failed");
            reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
          });
      }
    } catch {
      setReportStatus("failed");
      reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
    }
  };

  useEffect(() => {
    if (!reportId || reportStatus === "sent" || reportStatus === "failed") return;

    const channel = supabase
      .channel(`report-${reportId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "report_requests", filter: `id=eq.${reportId}` },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row.status === "sent") {
            setReportStatus("sent");
            reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
          } else if (row.status === "failed") {
            setReportStatus("failed");
            reportTimeoutRef.current = setTimeout(() => setReportStatus("idle"), 5000);
          } else if (row.status === "processing") {
            setReportStatus("processing");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, [reportId, reportStatus]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r-[2px] border-sidebar-border bg-sidebar-bg">
      <div className="flex items-center gap-3 border-b-[2px] border-sidebar-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center bg-accent/15 border-[2px] border-accent/30">
          <Layers className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            The Binder
          </h1>
          <p className="font-mono text-[10px] text-muted">DASHBOARD</p>
        </div>
        <button
          onClick={() => onNavigate("settings")}
          className={`flex h-8 w-8 shrink-0 items-center justify-center border-[2px] transition-colors ${
            activePanel === "settings"
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-transparent text-muted hover:text-foreground/60 hover:bg-white/[0.02]"
          }`}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0 px-0 py-4">
        <p className="mb-2 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
          Binder Domains
        </p>
        {DOMAIN_IDS.map((id) => {
          const Icon = DOMAIN_ICONS[id];
          const isActive = pathname === `/domain/${id}`;
          return (
            <Link
              key={id}
              href={`/domain/${id}`}
              className={`group flex items-center gap-3 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-100 ${
                isActive
                  ? "border-l-[3px] border-accent bg-accent/10 text-accent"
                  : "border-l-[3px] border-transparent text-muted hover:bg-white/[0.02] hover:text-foreground/60"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive
                    ? "text-accent"
                    : "text-muted group-hover:text-foreground/60"
                }`}
              />
              <span className="flex-1 truncate text-left font-mono">
                {DOMAIN_META[id].label}
              </span>
              {isActive && <span className="h-2 w-2 shrink-0 bg-accent" />}
            </Link>
          );
        })}
        <p className="mb-2 mt-5 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
          Panels
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activePanel;
          return (
            <button
              key={item.id}
              disabled={!!item.comingSoon}
              onClick={() => !item.comingSoon && onNavigate(item.id)}
              className={`group flex items-center gap-3 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-100 ${
                isActive
                  ? "border-l-[3px] border-accent bg-accent/10 text-accent"
                  : "border-l-[3px] border-transparent text-muted hover:bg-white/[0.02] hover:text-foreground/60"
              } ${item.comingSoon ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive
                    ? "text-accent"
                    : "text-muted group-hover:text-foreground/60"
                }`}
              />
              <span className="flex-1 text-left font-mono">{item.label}</span>
              {item.comingSoon && (
                <span className="border border-badge-text/20 bg-badge-bg px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-badge-text">
                  Soon
                </span>
              )}
              {isActive && (
                <span className="h-2 w-2 bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t-[2px] border-sidebar-border px-5 py-4">
        <button
          onClick={handleSendReport}
          disabled={reportStatus === "sending" || reportStatus === "queued" || reportStatus === "processing" || reportStatus === "sent"}
          className={`mb-3 flex w-full items-center justify-center gap-2 border-[2px] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
            reportStatus === "failed"
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : reportStatus === "sent"
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : reportStatus === "processing"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                  : reportStatus === "queued" || reportStatus === "sending"
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {reportStatus === "failed" ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              {!settings.partnerEmail ? "Set Email First" : "Failed — Retry"}
            </>
          ) : reportStatus === "sent" ? (
            <>
              <Check className="h-3 w-3" />
              Delivered
            </>
          ) : reportStatus === "processing" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : reportStatus === "queued" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Queued...
            </>
          ) : reportStatus === "sending" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Send Report
            </>
          )}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border-[2px] border-accent/30 bg-accent/10 font-mono text-xs font-bold text-accent">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {displayName}
            </p>
            <p className="truncate font-mono text-[10px] text-muted">
              Goal Tracker
            </p>
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-transparent text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
