"use client";

import { useEffect, useState } from "react";
import { IconRefreshBold, IconBookBold, IconPlayBold, IconSquareArrowRightBold } from "@ninzapp/solar-icons/bold";
import { useSettings } from "@/lib/settings";
import { Card, Badge } from "@/components/lithos";

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

export default function HomeDashboard() {
  const { settings } = useSettings();
  const [books, setBooks] = useState<BookRec[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [videos, setVideos] = useState<VideoRec[]>([]);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-card-border bg-card-bg px-8 py-5">
        <div className="mb-2 flex items-center gap-3">
          <Badge intent="info" size="lg" className="items-center gap-1.5 tracking-[0.2em]">
            Home
          </Badge>
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
          {/* Weekly Recommendations */}
          <Card>
            <div className="flex items-center gap-2.5 border-b border-card-border px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center border border-accent/30 bg-accent/10">
                <IconBookBold className="h-3.5 w-3.5 text-accent" />
              </div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                Weekly Recommendations
              </h3>
              <span className="ml-auto font-mono text-[10px] text-muted">
                WEEK {getWeekNumber()}
              </span>
            </div>

            <div className="p-4">
              {/* Books */}
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Recommended Reading
              </p>
              {booksLoading ? (
                <div className="flex justify-center py-4">
                  <IconRefreshBold className="h-4 w-4 animate-spin text-muted" />
                </div>
              ) : (
                <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {books.map((book) => (
                    <a
                      key={book.openLibraryUrl}
                      href={book.openLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col border border-input-border bg-input-bg p-4 transition-colors hover:border-accent/40"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="mb-3 h-32 w-full object-cover border border-table-border"
                        />
                      ) : (
                        <div className="mb-3 flex h-32 w-full items-center justify-center border border-table-border bg-table-header">
                          <IconBookBold className="h-8 w-8 text-muted/30" />
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
                          <IconSquareArrowRightBold className="h-2.5 w-2.5" />
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {videos.map((video) => (
                  <a
                    key={video.searchQuery}
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 border border-input-border bg-input-bg p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-500/30 bg-red-500/10">
                      <IconPlayBold className="h-4 w-4 text-red-400" />
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
          </Card>
        </div>
      </div>
    </div>
  );
}