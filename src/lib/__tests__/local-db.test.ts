import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureLocalProfile,
  getLocalProfileId,
  isLocalOnboarded,
  setLocalOnboarded,
  isLocalImported,
  setLocalImported,
  hasLocalData,
  localFrom,
  getLocalSnapshot,
} from "../local-db";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: undefined as unknown },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
});

const habit = (id: string, extra: Record<string, unknown> = {}) => ({
  user_id: "u1",
  id,
  name: "Run",
  type: "recurring",
  frequency: "daily",
  difficulty: "medium",
  domain: "physical",
  is_template: false,
  target_value: null,
  checkpoint_count: null,
  created_at: "2026-01-01T00:00:00.000Z",
  ...extra,
});

describe("local profile", () => {
  it("creates and re-reads a profile", () => {
    expect(getLocalProfileId()).toBeNull();
    const id = ensureLocalProfile();
    expect(id).toBeTruthy();
    expect(getLocalProfileId()).toBe(id);
    expect(hasLocalData(id)).toBe(false); // empty doc = no data yet
  });

  it("tracks onboarding + imported state", () => {
    const id = ensureLocalProfile();
    expect(isLocalOnboarded(id)).toBe(false);
    setLocalOnboarded(id, true);
    expect(isLocalOnboarded(id)).toBe(true);

    expect(isLocalImported(id)).toBe(false);
    setLocalImported(id, true);
    expect(isLocalImported(id)).toBe(true);
  });
});

describe("engine write-through", () => {
  it("scores a completed recurring log → domain, total, xp", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(habit("h1"));

    const log = await localFrom("habit_logs", p)
      .upsert(
        {
          habit_id: "h1",
          user_id: p,
          log_date: "2026-08-01",
          completed: true,
          value: null,
          checkpoints_done: null,
        },
        { onConflict: "habit_id,log_date" },
      )
      .select("*")
      .single();
    expect(log.data?.points_earned).toBe(20);

    const ds = await localFrom("domain_scores", p)
      .select("*")
      .eq("score_date", "2026-08-01")
      .eq("domain", "physical");
    expect(ds.data).toHaveLength(1);
    expect(ds.data[0].domain).toBe("physical");
    expect(ds.data[0].score).toBe(100);

    const ts = await localFrom("total_scores", p)
      .select("*")
      .eq("score_date", "2026-08-01");
    expect(ts.data).toHaveLength(1);
    expect(ts.data[0].score).toBe(20); // physical weight 20 of 100

    const xp = await localFrom("user_xp", p).select("*").maybeSingle();
    expect(xp.data?.total_xp).toBe(20);
    expect(xp.data?.current_level).toBe(1);
  });

  it("partial volume + milestone produce proportional points", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(
      habit("h-vol", {
        type: "volume",
        target_value: 100,
      }),
    );
    const v = await localFrom("habit_logs", p)
      .upsert({
        habit_id: "h-vol",
        user_id: p,
        log_date: "2026-08-02",
        completed: true,
        value: 50,
        checkpoints_done: null,
      })
      .select("*")
      .single();
    expect(v.data?.points_earned).toBe(10);

    await localFrom("habits", p).insert(
      habit("h-ms", {
        type: "milestone",
        checkpoint_count: 3,
      }),
    );
    const m = await localFrom("habit_logs", p)
      .upsert({
        habit_id: "h-ms",
        user_id: p,
        log_date: "2026-08-02",
        completed: true,
        value: null,
        checkpoints_done: 2,
      })
      .select("*")
      .single();
    expect(m.data?.points_earned).toBeCloseTo(13.33, 2);
  });

  it("rewrites today's row on re-upsert (idempotent)", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(habit("h2"));
    await localFrom("habit_logs", p).upsert({
      habit_id: "h2",
      user_id: p,
      log_date: "2026-08-03",
      completed: true,
      value: null,
      checkpoints_done: null,
    });
    await localFrom("habit_logs", p).upsert({
      habit_id: "h2",
      user_id: p,
      log_date: "2026-08-03",
      completed: false,
      value: null,
      checkpoints_done: null,
    });
    const logs = await localFrom("habit_logs", p)
      .select("*")
      .eq("habit_id", "h2");
    expect(logs.data).toHaveLength(1);
    expect(logs.data[0].completed).toBe(false);
  });

  it("deleting a log recomputes scores + xp", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(habit("h3"));
    await localFrom("habit_logs", p).upsert({
      habit_id: "h3",
      user_id: p,
      log_date: "2026-08-04",
      completed: true,
      value: null,
      checkpoints_done: null,
    });
    await localFrom("habit_logs", p)
      .delete()
      .eq("habit_id", "h3")
      .eq("log_date", "2026-08-04");

    const snaps = await localFrom("domain_scores", p)
      .select("*")
      .eq("score_date", "2026-08-04");
    expect(snaps.data).toHaveLength(0);

    const xp = await localFrom("user_xp", p).select("*").maybeSingle();
    expect(xp.data?.total_xp).toBe(0);
    expect(xp.data?.current_level).toBe(1);
  });

  it("deleting a habit removes its logs and re-scores everything", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(habit("h4"));
    await localFrom("habit_logs", p).upsert({
      habit_id: "h4",
      user_id: p,
      log_date: "2026-08-05",
      completed: true,
      value: null,
      checkpoints_done: null,
    });
    await localFrom("habits", p).delete().eq("id", "h4");

    const logs = await localFrom("habit_logs", p).select("*");
    expect(logs.data).toHaveLength(0);
    const ds = await localFrom("domain_scores", p).select("*");
    expect(ds.data).toHaveLength(0);
    const xp = await localFrom("user_xp", p).select("*").maybeSingle();
    expect(xp.data?.total_xp).toBe(0);
  });

  it("snapshot has the full row set for import", async () => {
    const p = ensureLocalProfile();
    await localFrom("habits", p).insert(habit("h5"));
    await localFrom("habit_logs", p).upsert({
      habit_id: "h5",
      user_id: p,
      log_date: "2026-08-06",
      completed: true,
      value: null,
      checkpoints_done: null,
    });
    await localFrom("user_settings", p).upsert(
      { user_id: p, user_name: "Champion", water_target_ml: 3000 },
      { onConflict: "user_id" },
    );
    const snap = getLocalSnapshot(p);
    expect(snap.habits).toHaveLength(1);
    expect(snap.habit_logs).toHaveLength(1);
    expect(snap.total_scores).toHaveLength(1);
    expect(snap.domain_scores.filter((r) => r.domain === "physical")).toHaveLength(1);
    expect(snap.user_settings[0].user_name).toBe("Champion");
  });
});
