import AppShell from "@/components/app-shell";
import DashboardPage from "@/components/dashboard-page";

export default function DashboardRoute() {
  return (
    <AppShell
      header={
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Dashboard
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">
              The Binder
            </h1>
          </div>
        </div>
      }
    >
      <DashboardPage />
    </AppShell>
  );
}
