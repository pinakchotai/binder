# Binder

Multi-tenant habit tracking system with 4 life domains, weighted scoring, streak multipliers, XP/levels, and badge gamification.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React, TypeScript, Tailwind CSS, visx (charts)
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, REST API)
- **Charts:** visx-based heatmap, line, area, and variance charts with custom animation system

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/your-org/the-binder-public.git
   cd the-binder-public
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## How It Works

### 4 Domains

| Domain | Weight | Description |
|---|---|---|
| Non-Negotiables | 40% | Daily essentials (sleep, hydration, routines) |
| Academia | 20% | Study and learning goals |
| Physical | 20% | Exercise, steps, diet |
| Personal Growth | 20% | Reading, journaling, new skills |

### Habit Types

- **Recurring** — binary complete/incomplete (e.g., "Worked out today")
- **Volume** — tracked against a numeric target (e.g., "8 glasses of water")
- **Milestone** — sequential checkpoints (e.g., "Read chapter 1 of 5")

### Scoring

Each habit type maps to a difficulty weight: Easy (10), Medium (20), Hard (30).

**Domain score** = `(earned / max) x 100`, where earned = sum of `points_earned` for the day in that domain, and max = sum of difficulty weights for all active habits in that domain.

**Total score** = average of all 4 domain scores, with a **streak multiplier** applied:

| Streak | Multiplier |
|---|---|
| 1-2 days | 1.00x |
| 3-6 days | 1.05x |
| 7-13 days | 1.10x |
| 14-29 days | 1.15x |
| 30+ days | 1.25x |

Scores are capped at 100.

### Gamification

- **XP:** Earned from habit points (1 point = 1 XP). Level = floor(sqrt(xp/100)) + 1.
- **Badges:** Awarded automatically for milestones (first habit, streak lengths, perfect days, domain mastery).

## Future Plans (v0.1.0-alpha.1)

- Android app (separate repo, not yet connected)
- Streak freeze or vacation mode
- UI customization or theme toggle
- Accountability-partner or social features

## License

MIT
