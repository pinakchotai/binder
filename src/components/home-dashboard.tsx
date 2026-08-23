"use client";

import { useEffect, useState, useCallback } from "react";
import { Droplets, Loader2, Trash2, BookOpen, Play, ExternalLink, BarChart3 } from "lucide-react";
import { supabase, getUserId, type WaterIntake } from "@/lib/supabase";
import { useSettings } from "@/lib/settings";
import HistoryPanel from "./history-panel";

const quickAmounts = [150, 250, 500, 750];

interface BookRec {
  title: string;
  author: string;
  year: number | null;
  coverUrl: string | null;
  openLibraryUrl: string;
}

interface VideoRec {
  title: string;
  channel: string;
  searchQuery: string;
  description: string;
}

const BOOK_SUBJECTS = ["business", "finance", "self-improvement", "productivity", "leadership"];

// Generic study topics — rotate weekly, link to YouTube search
const STUDY_VIDEO_TOPICS: VideoRec[] = [
  { title: "Active Recall", channel: "YouTube Search", searchQuery: "active recall study technique", description: "The most evidence-backed study method" },
  { title: "Spaced Repetition", channel: "YouTube Search", searchQuery: "spaced repetition technique explained", description: "Remember more by reviewing less often" },
  { title: "Deep Work", channel: "YouTube Search", searchQuery: "deep work focus strategies", description: "How to focus without distraction" },
  { title: "Pomodoro Technique", channel: "YouTube Search", searchQuery: "pomodoro technique tutorial", description: "Timeboxing for sustained concentration" },
  { title: "Deliberate Practice", channel: "YouTube Search", searchQuery: "deliberate practice explained", description: "Practice smarter, not just longer" },
  { title: "Beat Procrastination", channel: "YouTube Search", searchQuery: "how to beat procrastination science", description: "The science of getting started" },
  { title: "Effective Note-Taking", channel: "YouTube Search", searchQuery: "effective note taking methods students", description: "Notes that actually stick" },
  { title: "Exam Preparation Strategy", channel: "YouTube Search", searchQuery: "exam preparation strategy top students", description: "Plan your way to exam day" },
  { title: "Habit Building", channel: "YouTube Search", searchQuery: "how to build habits that stick", description: "Systems over motivation" },
  { title: "Sleep And Learning", channel: "YouTube Search", searchQuery: "sleep and memory consolidation learning", description: "Why sleep is a study superpower" },
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function HomeDashboard() {
  const { settings } = useSettings();
  const [todayEntries, setTodayEntries] = useState<WaterIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [books, setBooks] = useState<BookRec[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [videos, setVideos] = useState<VideoRec[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchToday = useCallback(async () => {
    const today = getTodayDateString();
    const { data, error } = await supabase
      .from("water_intake")
      .select("*")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .order("created_at", { ascending: false });
    if (error)
      console.error("Failed to fetch water:", JSON.stringify(error));
    setTodayEntries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    const week = getWeekNumber();
    const subject = BOOK_SUBJECTS[week % BOOK_SUBJECTS.length];
    setBooksLoading(true);
    fetch(`https://openlibrary.org/subjects/${subject}.json?limit=5`)
      .then((r) => r.json())
      .then((json) => {
        const works = json.works ?? [];
        const recs: BookRec[] = works.slice(0, 3).map((w: Record<string, unknown>) => {
          const title = (w.title as string) ?? "";
          const authors = (w.authors as Array<{ name: string }>) ?? [];
          const author = authors[0]?.name ?? "Unknown";
          const year = (w.first_publish_year as number) ?? null;
          const coverId = (w.cover_id as number) ?? null;
          const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
          const key = (w.key as string) ?? "";
          return { title, author, year, coverUrl, openLibraryUrl: `https://openlibrary.org${key}` };
        });
        setBooks(recs);
      })
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
  }, []);

  useEffect(() => {
    const week = getWeekNumber();
    const start = (week * 2) % STUDY_VIDEO_TOPICS.length;
    setVideos([STUDY_VIDEO_TOPICS[start], STUDY_VIDEO_TOPICS[(start + 1) % STUDY_VIDEO_TOPICS.length]]);
  }, []);

  const totalMl = todayEntries.reduce((sum, e) => sum + e.amount_ml, 0);
  const targetMl = settings.waterTargetMl;
  const progress = Math.min((totalMl / targetMl) * 100, 100);
  const percentage = Math.round((totalMl / targetMl) * 100);
  const remaining = Math.max(targetMl - totalMl, 0);

  const handleAdd = async (amountMl: number) => {
    if (amountMl <= 0) return;
    setSubmitting(true);
    const userId = await getUserId();
    const { error } = await supabase.from("water_intake").insert({
      user_id: userId,
      amount_ml: amountMl,
    });
    if (error) {
      console.error("Failed to log water:", JSON.stringify(error));
    } else {
      await fetchToday();
    }
    setSubmitting(false);
  };

  const handleCustomAdd = () => {
    const val = parseInt(customAmount);
    if (!isNaN(val) && val > 0) {
      handleAdd(val);
      setCustomAmount("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("water_intake")
      .delete()
      .eq("id", id);
    if (!error) await fetchToday();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b-[2px] border-card-border bg-card-bg px-8 py-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border-[2px] border-blue-400/40 bg-blue-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            Home
          </span>
        </div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
          {getGreeting()}, {settings.userName}
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Here&apos;s your daily overview
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="border-[2px] border-card-border bg-card-bg">
            {/* Card header */}
            <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center border-[2px] border-blue-400/30 bg-blue-400/10">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                Water Intake
              </h3>
              <span className="ml-auto font-mono text-[10px] text-muted">
                {getTodayDateString()}
              </span>
            </div>

            <div className="p-5">
              {/* Progress */}
              <div className="mb-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <div>
                    <span className="font-mono text-3xl font-bold text-foreground tabular-nums">
                      {(totalMl / 1000).toFixed(1)}
                    </span>
                    <span className="ml-1 font-mono text-sm text-muted">
                      / {(targetMl / 1000).toFixed(1)} L
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ${
                      percentage >= 100
                        ? "text-green-400"
                        : percentage >= 60
                          ? "text-accent"
                          : "text-muted"
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full border-[2px] border-blue-400/30 bg-input-bg">
                  <div
                    className="h-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  {remaining}ml remaining
                </p>
              </div>

              {/* Quick add buttons */}
              <div className="mb-4">
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Quick Add
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleAdd(amt)}
                      disabled={submitting}
                      className="border-[2px] border-blue-400/30 bg-blue-400/5 px-3 py-2.5 font-mono text-xs font-bold text-blue-400 transition-colors hover:bg-blue-400/10 hover:border-blue-400/50 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {amt >= 1000 ? `${amt / 1000}L` : `${amt}ml`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="custom ml"
                  min={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
                  className="flex-1 border-[2px] border-input-border bg-input-bg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-input-focus focus:outline-none transition-colors"
                />
                <button
                  onClick={handleCustomAdd}
                  disabled={submitting || !customAmount}
                  className="inline-flex items-center justify-center gap-2 border-[2px] border-blue-400/50 bg-blue-400/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-blue-400 transition-colors hover:bg-blue-400/20 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </button>
              </div>

              {/* Today's log */}
              {todayEntries.length > 0 && (
                <div className="mt-5 border-t-[2px] border-card-border pt-4">
                  <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    Today&apos;s Log ({todayEntries.length})
                  </p>
                  <div className="space-y-1">
                    {todayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between border border-table-border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Droplets className="h-3 w-3 text-blue-400/60" />
                          <span className="font-mono text-sm font-bold text-foreground">
                            {entry.amount_ml}ml
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            {formatTime(entry.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-muted transition-colors hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && todayEntries.length === 0 && (
                <div className="mt-5 border-t-[2px] border-card-border pt-4">
                  <p className="font-mono text-xs text-muted text-center uppercase tracking-wider">
                    No water logged today. Start hydrating!
                  </p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="mt-5 flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              )}
            </div>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full border-[2px] border-card-border bg-card-bg px-5 py-3 flex items-center gap-2.5 transition-colors hover:border-accent/40"
          >
            <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
            </div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
              {showHistory ? "Hide History" : "View History"}
            </h3>
          </button>

          {/* History Panel */}
          {showHistory && <HistoryPanel />}

          {/* Weekly Recommendations */}
          <div className="border-[2px] border-card-border bg-card-bg">
            <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
                <BookOpen className="h-3.5 w-3.5 text-accent" />
              </div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                Weekly Recommendations
              </h3>
              <span className="ml-auto font-mono text-[10px] text-muted">
                WEEK {getWeekNumber()}
              </span>
            </div>

            <div className="p-5">
              {/* Books */}
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Recommended Reading
              </p>
              {booksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              ) : (
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {books.map((book) => (
                    <a
                      key={book.openLibraryUrl}
                      href={book.openLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col border-[2px] border-input-border bg-input-bg p-4 transition-colors hover:border-accent/40"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="mb-3 h-32 w-full object-cover border border-table-border"
                        />
                      ) : (
                        <div className="mb-3 flex h-32 w-full items-center justify-center border border-table-border bg-table-header">
                          <BookOpen className="h-8 w-8 text-muted/30" />
                        </div>
                      )}
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-accent line-clamp-2">
                        {book.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        {book.author}{book.year ? ` (${book.year})` : ""}
                      </p>
                      <div className="mt-auto pt-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] text-accent">
                          <ExternalLink className="h-2.5 w-2.5" />
                          OPEN LIBRARY
                        </span>
                      </div>
                    </a>
                  ))}
                  {books.length === 0 && (
                    <p className="col-span-3 py-4 text-center font-mono text-xs text-muted">
                      No recommendations available this week.
                    </p>
                  )}
                </div>
              )}

              {/* Videos */}
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Study Videos
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {videos.map((video) => (
                  <a
                    key={video.searchQuery}
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 border-[2px] border-input-border bg-input-bg p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-red-500/30 bg-red-500/10">
                      <Play className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground group-hover:text-accent line-clamp-2">
                        {video.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted truncate">
                        {video.channel}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted/60 line-clamp-1">
                        {video.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
