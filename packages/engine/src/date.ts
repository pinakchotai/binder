function parseDay(dateStr: string): [number, number, number] {
  const [year, month, day] = dateStr.split("-").map(Number);
  return [year, month, day];
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = parseDay(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayDiff(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}