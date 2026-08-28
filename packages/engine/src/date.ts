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