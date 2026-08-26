import AppShell from "@/components/app-shell";
import HistoryPage from "@/components/history-page";

export default function HistoryRoute() {
  return (
    <AppShell
      header={
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Analytics
            </p>
            <h1 className="mt-1 font-sans text-xl font-bold tracking-tight text-foreground">
              History
            </h1>
          </div>
        </div>
      }
    >
      <HistoryPage />
    </AppShell>
  );
}
