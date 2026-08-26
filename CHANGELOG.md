# Changelog

## v0.1.0-alpha.1

First public alpha release.

### Features

- **Onboarding wizard** — 4-domain setup with template selection and custom habit creation
- **Dashboard** — today's habits grouped by domain, quick-log toggles, total score, streak display
- **Domain pages** — per-domain habit list with scoring breakdown
- **Habit types** — recurring (binary), volume (numeric target), milestone (checkpoints)
- **Scoring engine** — difficulty weights (10/20/30), domain weighting (40/20/20/20), day-level recalculation
- **Streak multipliers** — bonus multiplier on total score for consecutive active days (1.00x to 1.25x)
- **XP and levels** — cumulative XP from habit points, level progression via sqrt curve
- **Badges** — first habit, streak milestones (3/7/30 days), perfect day, domain mastery
- **Habit editing** — edit name, difficulty, target via modal (type is locked after creation)
- **Habit deletion** — with cascade cleanup and score recalculation
- **History page** — heatmap calendar, 7-day and 30-day views, domain filter
- **Settings page** — sign out, account info
- **Charts** — custom visx-based heatmap, line, area charts with loading animations

### Infrastructure

- Supabase backend with Row Level Security on all tables
- Per-user data isolation via `auth.uid()` RLS policies
- Server-side triggers for score recalculation, XP updates, and badge awarding
