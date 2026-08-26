"use client";

import { useCallback, useEffect, useState } from "react";
import { IconHamburgerMenuBold, IconCloseSquareBold } from "@ninzapp/solar-icons/bold";
import Sidebar from "@/components/sidebar";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export default function AppShell({ children, header }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 fade-in"
            onClick={close}
          />
          <div className="relative h-full w-64">
            <Sidebar onClose={close} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center border-b-[2px] border-card-border bg-sidebar-bg px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center border-[2px] border-transparent text-muted transition-colors hover:border-accent/40 hover:text-accent"
            aria-label="Open menu"
          >
            <IconHamburgerMenuBold className="h-4 w-4" />
          </button>
          <span className="ml-3 font-sans text-sm font-bold tracking-tight text-foreground">
            The Binder
          </span>
        </div>

        {/* Desktop full-width header stripe */}
        {header && (
          <div className="hidden md:block border-b-[2px] border-card-border bg-sidebar-bg">
            <div className="mx-auto max-w-5xl px-6 py-4">
              {header}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
