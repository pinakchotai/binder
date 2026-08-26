"use client";

import {
  SquaresFour,
  ChartBar,
  Gear,
  SignOut,
  Flame,
  BookOpen,
  Pulse,
  Plant,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";

const DOMAIN_ICONS: Record<(typeof DOMAIN_IDS)[number], React.ComponentType<{ className?: string }>> = {
  non_negotiables: Flame,
  academia: BookOpen,
  physical: Pulse,
  personal_growth: Plant,
};

export default function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const { settings } = useSettings();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const displayName = settings.userName;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r-[2px] border-sidebar-border bg-sidebar-bg">
      <div className="flex items-center gap-3 border-b-[2px] border-sidebar-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center bg-accent/15 border-[2px] border-accent/30">
          <SquaresFour className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-sans text-sm font-bold tracking-tight text-foreground">
            The Binder
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">DASHBOARD</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-transparent text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Link
          href="/settings"
          className={`flex h-10 w-10 shrink-0 items-center justify-center border-[2px] transition-colors ${
            pathname === "/settings"
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-transparent text-muted hover:text-foreground/60 hover:bg-white/[0.02]"
          }`}
          title="Settings"
          aria-label="Settings"
          onClick={onClose}
        >
          <Gear className="h-4 w-4" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0 px-0 py-4">
        <p className="mb-2 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
          Main
        </p>
        {[
          { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
          { href: "/history", label: "History", icon: ChartBar },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
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
                {label}
              </span>
              {isActive && <span className="h-2 w-2 shrink-0 bg-accent" />}
            </Link>
          );
        })}
        <p className="mb-2 mt-5 px-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
          Binder Domains
        </p>
        {DOMAIN_IDS.map((id) => {
          const Icon = DOMAIN_ICONS[id];
          const isActive = pathname === `/domain/${id}`;
          return (
            <Link
              key={id}
              href={`/domain/${id}`}
              onClick={onClose}
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
      </nav>

      <div className="border-t-[2px] border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border-[2px] border-accent/30 bg-accent/10 font-mono text-xs font-bold text-accent">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-sans text-xs font-bold tracking-tight text-foreground">
              {displayName}
            </p>
            <p className="truncate font-mono text-[10px] text-muted">
              Goal Tracker
            </p>
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-transparent text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <SignOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
