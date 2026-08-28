"use client";

import { useState } from "react";
import {
  IconCheckSquareBold,
  IconChartBold,
  IconSettingsBold,
  IconLogoutBold,
  IconBoltBold,
  IconBookBold,
  IconHeartPulseBold,
  IconLeafBold,
  IconCloseSquareBold,
  IconAltArrowRightBold,
  IconAltArrowLeftBold,
} from "@ninzapp/solar-icons/bold";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";
import { Button } from '@/components/lithos';

const DOMAIN_ICONS: Record<(typeof DOMAIN_IDS)[number], React.ComponentType<{ className?: string }>> = {
  non_negotiables: IconBoltBold,
  academia: IconBookBold,
  physical: IconHeartPulseBold,
  personal_growth: IconLeafBold,
};

export default function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const { settings } = useSettings();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const displayName = settings.userName;
  const initial = displayName.charAt(0).toUpperCase();
  const [collapsed, setCollapsed] = useState(false);
  const activeDomainId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("id");

  const rail = collapsed;
  const sidebarWidth = rail ? "w-16" : "w-64";

  return (
    <aside className={`flex h-full ${sidebarWidth} shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg transition-[width] duration-200`}>
      {/* Header */}
      <div className={`flex items-center gap-3 border-b border-sidebar-border py-5 ${rail ? "justify-center px-0" : "px-5"}`}>
        {!rail && (
          <>
            <div className="flex h-9 w-9 items-center justify-center bg-accent/15 border border-accent/30">
              <IconCheckSquareBold className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-mono text-sm font-bold tracking-tight text-foreground">
                The Binder
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">DASHBOARD</p>
            </div>
          </>
        )}
        {rail && (
          <div className="flex h-9 w-9 items-center justify-center bg-accent/15 border border-accent/30">
            <IconCheckSquareBold className="h-4 w-4 text-accent" />
          </div>
        )}
        {/* Desktop collapse toggle */}
        <Button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          variant="text"
          className={`hidden md:flex h-10 w-10 shrink-0 items-center justify-center border border-transparent text-muted transition-colors hover:border-accent/40 hover:text-accent ${rail ? "absolute top-5 right-0 translate-x-[calc(100%+1px)] bg-sidebar-bg border-r border-t border-b border-sidebar-border" : ""}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <IconAltArrowRightBold className="h-4 w-4" />
          ) : (
            <IconAltArrowLeftBold className="h-4 w-4" />
          )}
        </Button>
        {/* Mobile close button */}
        {onClose && (
          <Button
            type="button"
            onClick={onClose}
            variant="text"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/40 hover:text-red-400 md:hidden"
            aria-label="Close menu"
          >
            <IconCloseSquareBold className="h-4 w-4" />
          </Button>
        )}
        {!rail && (
          <Link
            href="/settings"
            className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors ${
              pathname === "/settings"
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-transparent text-muted hover:text-foreground/60 hover:bg-white/[0.02]"
            }`}
            title="Settings"
            aria-label="Settings"
            onClick={onClose}
          >
            <IconSettingsBold className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0 px-0 py-4">
        {!rail && (
          <p className="mb-2 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Main
          </p>
        )}
        {[
          { href: "/dashboard", label: "Dashboard", icon: IconCheckSquareBold },
          { href: "/history", label: "History", icon: IconChartBold },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={rail ? label : undefined}
              className={`group relative flex items-center transition-colors duration-100 ${
                rail ? "justify-center px-0 py-3" : "gap-3 px-5 py-3"
              } text-xs font-bold uppercase tracking-wider ${
                isActive
                  ? rail
                    ? "border-l-[3px] border-accent bg-accent/10 text-accent"
                    : "border-l-[3px] border-accent bg-accent/10 text-accent"
                  : rail
                    ? "border-l-[3px] border-transparent text-muted hover:bg-white/[0.02] hover:text-foreground/60"
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
              {!rail && (
                <span className="flex-1 truncate text-left font-mono">
                  {label}
                </span>
              )}
              {isActive && !rail && <span className="h-2 w-2 shrink-0 bg-accent" />}
              {/* Rail tooltip */}
              {rail && (
                <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap bg-surface border border-border px-2 py-1 text-[10px] font-bold text-foreground z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
        {!rail && (
          <p className="mb-2 mt-5 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Binder Domains
          </p>
        )}
        {rail && <div className="my-2 border-t border-sidebar-border mx-4" />}
        {DOMAIN_IDS.map((id) => {
          const Icon = DOMAIN_ICONS[id];
          const isActive = pathname === "/domain" && activeDomainId === id;
          return (
            <Link
              key={id}
              href={`/domain?id=${encodeURIComponent(id)}`}
              onClick={onClose}
              title={rail ? DOMAIN_META[id].label : undefined}
              className={`group relative flex items-center transition-colors duration-100 ${
                rail ? "justify-center px-0 py-3" : "gap-3 px-5 py-3"
              } text-xs font-bold uppercase tracking-wider ${
                isActive
                  ? rail
                    ? "border-l-[3px] border-accent bg-accent/10 text-accent"
                    : "border-l-[3px] border-accent bg-accent/10 text-accent"
                  : rail
                    ? "border-l-[3px] border-transparent text-muted hover:bg-white/[0.02] hover:text-foreground/60"
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
              {!rail && (
                <span className="flex-1 truncate text-left font-mono">
                  {DOMAIN_META[id].label}
                </span>
              )}
              {isActive && !rail && <span className="h-2 w-2 shrink-0 bg-accent" />}
              {rail && (
                <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap bg-surface border border-border px-2 py-1 text-[10px] font-bold text-foreground z-50">
                  {DOMAIN_META[id].label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`border-t border-sidebar-border py-4 ${rail ? "px-2" : "px-5"}`}>
        {rail ? (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center border border-accent/30 bg-accent/10 font-mono text-xs font-bold text-accent">
              {initial}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-accent/30 bg-accent/10 font-mono text-xs font-bold text-accent">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-mono text-xs font-bold tracking-tight text-foreground">
                {displayName}
              </p>
              <p className="truncate font-mono text-[10px] text-muted">
                Goal Tracker
              </p>
            </div>
            <Button
              onClick={() => void signOut()}
              title="Sign out"
              aria-label="Sign out"
              variant="text"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            >
              <IconLogoutBold className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
