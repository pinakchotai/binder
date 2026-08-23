"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen,
  Target,
  Clock,
  PenLine,
  Loader2,
  Square,
  ArrowLeft,
  Plus,
} from "lucide-react";
import {
  supabase,
  type SyllabusSession,
  type PracticeQuestion,
} from "@/lib/supabase";
import CumulativeHoursChart from "@/components/cumulative-hours-chart";
import VarianceChart from "@/components/variance-chart";

const MARKS_PER_MINUTE = 1.8;

const syllabusHeaders = ["Topic", "Hours", "Date"];
const implementationHeaders = [
  "Question",
  "Marks",
  "Target Time",
  "Actual Time",
  "Variance",
];

const inputClass =
  "border-[2px] border-input-border bg-input-bg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-input-focus focus:outline-none transition-colors uppercase placeholder:lowercase";

interface SyllabusSectionProps {
  sessions: SyllabusSession[];
  loading: boolean;
  submitting: boolean;
  topicName: string;
  hoursSpent: string;
  onTopicNameChange: (v: string) => void;
  onHoursSpentChange: (v: string) => void;
  onSubmit: () => void;
}

function SyllabusSection({
  sessions,
  loading,
  submitting,
  topicName,
  hoursSpent,
  onTopicNameChange,
  onHoursSpentChange,
  onSubmit,
}: SyllabusSectionProps) {
  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border bg-card-bg px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <BookOpen className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Syllabus Understanding
        </h3>
      </div>

      <div className="p-5">
        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
          <input
            type="text"
            placeholder="topic name"
            value={topicName}
            onChange={(e) => onTopicNameChange(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="hours"
            min={0}
            step={0.5}
            value={hoursSpent}
            onChange={(e) => onHoursSpentChange(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PenLine className="h-3.5 w-3.5" />
            )}
            Log Session
          </button>
        </div>

        {!loading && sessions.length > 0 && (
          <CumulativeHoursChart sessions={sessions} />
        )}

        <div className="overflow-hidden border-[2px] border-table-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[2px] border-table-border bg-table-header">
                {syllabusHeaders.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={syllabusHeaders.length}
                    className="px-4 py-8 text-center font-mono text-xs text-muted"
                  >
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted" />
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={syllabusHeaders.length}
                    className="border border-dashed border-table-border px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-muted"
                  >
                    No sessions logged yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-table-border last:border-0"
                  >
                    <td className="px-4 py-2.5 font-mono text-sm font-medium text-foreground">
                      {s.topic_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-accent font-bold">
                      {s.hours_spent}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatStopwatch(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface ImplementationSectionProps {
  questions: PracticeQuestion[];
  loading: boolean;
  questionName: string;
  marks: string;
  onQuestionNameChange: (v: string) => void;
  onMarksChange: (v: string) => void;
  onStart: () => void;
  onFinish: () => void;
  submittingStart: boolean;
  stopwatchRunning: boolean;
  stopwatchSeconds: number;
}

function ImplementationSection({
  questions,
  loading,
  questionName,
  marks,
  onQuestionNameChange,
  onMarksChange,
  onStart,
  onFinish,
  submittingStart,
  stopwatchRunning,
  stopwatchSeconds,
}: ImplementationSectionProps) {
  const targetMinutes = marks ? Number(marks) * MARKS_PER_MINUTE : null;

  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border bg-card-bg px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <Target className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Implementation
        </h3>
      </div>

      <div className="p-5">
        {stopwatchRunning ? (
          <div className="mb-5 flex flex-col items-center gap-4 border-[2px] border-accent/40 bg-accent/5 p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Timer Running
            </p>
            <p className="font-mono text-6xl font-bold tabular-nums text-foreground">
              {formatStopwatch(stopwatchSeconds)}
            </p>
            <button
              onClick={onFinish}
              className="inline-flex items-center justify-center gap-2 border-[2px] border-red-500/60 bg-red-500/15 px-8 py-3 font-mono text-xs font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/25 active:translate-y-[1px]"
            >
              <Square className="h-3.5 w-3.5" />
              Finish
            </button>
          </div>
        ) : (
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
            <input
              type="text"
              placeholder="question name"
              value={questionName}
              onChange={(e) => onQuestionNameChange(e.target.value)}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="marks"
              min={1}
              value={marks}
              onChange={(e) => onMarksChange(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={onStart}
              disabled={submittingStart || !questionName.trim() || !marks}
              className="inline-flex items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submittingStart ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              Start
            </button>
          </div>
        )}

        {targetMinutes !== null && (
          <div className="mb-4 border border-input-border bg-input-bg px-3 py-2 font-mono text-[11px] text-muted">
            TARGET:{" "}
            <span className="font-bold text-foreground">
              {targetMinutes.toFixed(1)}m
            </span>{" "}
            &middot; {MARKS_PER_MINUTE} min/mark
          </div>
        )}

        {!loading && questions.length > 0 && (
          <VarianceChart questions={questions} />
        )}

        <div className="overflow-hidden border-[2px] border-table-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[2px] border-table-border bg-table-header">
                {implementationHeaders.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={implementationHeaders.length}
                    className="px-4 py-8 text-center font-mono text-xs text-muted"
                  >
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted" />
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td
                    colSpan={implementationHeaders.length}
                    className="border border-dashed border-table-border px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-muted"
                  >
                    No practice sums logged yet.
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const actual = q.actual_time_minutes;
                  const variance =
                    actual !== null ? actual - q.target_time_minutes : null;
                  return (
                    <tr
                      key={q.id}
                      className="border-b border-table-border last:border-0"
                    >
                      <td className="px-4 py-2.5 font-mono text-sm font-medium text-foreground">
                        {q.question_name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm font-bold text-accent">
                        {q.marks}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-muted">
                        {q.target_time_minutes.toFixed(1)}m
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-foreground">
                        {actual !== null ? `${actual.toFixed(1)}m` : "—"}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-sm font-bold ${
                          variance === null
                            ? "text-muted"
                            : variance > 0
                              ? "text-red-400"
                              : "text-green-400"
                        }`}
                      >
                        {variance !== null
                          ? `${variance > 0 ? "+" : ""}${variance.toFixed(1)}m`
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AcademiaPanel() {
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SyllabusSession[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submittingSyllabus, setSubmittingSyllabus] = useState(false);
  const [submittingStart, setSubmittingStart] = useState(false);

  const [topicName, setTopicName] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  const [questionName, setQuestionName] = useState("");
  const [marks, setMarks] = useState("");

  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const activeQuestionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchSecondsRef = useRef(0);

  const fetchData = useCallback(async () => {
    const [sessRes, qRes] = await Promise.all([
      supabase
        .from("syllabus_sessions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("practice_questions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (sessRes.error)
      console.error(
        "Failed to fetch syllabus sessions:",
        JSON.stringify(sessRes.error),
      );
    if (qRes.error)
      console.error(
        "Failed to fetch practice questions:",
        JSON.stringify(qRes.error),
      );
    setSessions(sessRes.data ?? []);
    setQuestions(qRes.data ?? []);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [sessRes, qRes] = await Promise.all([
        supabase
          .from("syllabus_sessions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("practice_questions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (sessRes.error) {
        console.error(
          "Failed to fetch syllabus sessions:",
          JSON.stringify(sessRes.error),
        );
      }
      if (qRes.error) {
        console.error(
          "Failed to fetch practice questions:",
          JSON.stringify(qRes.error),
        );
      }
      setSessions(sessRes.data ?? []);
      setQuestions(qRes.data ?? []);
      setLoadingData(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleLogSession = async () => {
    if (!topicName.trim() || !hoursSpent) return;
    setSubmittingSyllabus(true);
    const { error } = await supabase.from("syllabus_sessions").insert({
      topic_name: topicName.trim(),
      hours_spent: Number(hoursSpent),
    });
    if (error) {
      console.error("Failed to log session:", error);
    } else {
      setTopicName("");
      setHoursSpent("");
      fetchData();
    }
    setSubmittingSyllabus(false);
  };

  const handleStartPractice = async () => {
    if (!questionName.trim() || !marks) return;
    setSubmittingStart(true);
    const targetTime = Number(marks) * MARKS_PER_MINUTE;
    const { data, error } = await supabase
      .from("practice_questions")
      .insert({
        question_name: questionName.trim(),
        marks: Number(marks),
        target_time_minutes: targetTime,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to start practice:", JSON.stringify(error));
      setSubmittingStart(false);
      return;
    }
    activeQuestionIdRef.current = data.id;
    setStopwatchSeconds(0);
    stopwatchSecondsRef.current = 0;
    setStopwatchRunning(true);
    setSubmittingStart(false);
    setQuestionName("");
    setMarks("");
    intervalRef.current = setInterval(() => {
      stopwatchSecondsRef.current += 1;
      setStopwatchSeconds(stopwatchSecondsRef.current);
    }, 1000);
  };

  const handleFinishPractice = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const questionId = activeQuestionIdRef.current;
    if (!questionId) return;
    const actualMinutes = stopwatchSecondsRef.current / 60;
    const { error } = await supabase
      .from("practice_questions")
      .update({ actual_time_minutes: actualMinutes })
      .eq("id", questionId);
    if (error) {
      console.error("Failed to finish practice:", JSON.stringify(error));
    }
    activeQuestionIdRef.current = null;
    setStopwatchRunning(false);
    setStopwatchSeconds(0);
    stopwatchSecondsRef.current = 0;
    fetchData();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b-[2px] border-card-border bg-card-bg px-8 py-5">
        {activeGoal ? (
          <>
            <button
              onClick={() => setActiveGoal(null)}
              className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              All Goals
            </button>
            <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
              {activeGoal === "sbr" && "ACCA SBR — Strategic Business Reporting"}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted">
              Track your syllabus coverage and exam practice progress
            </p>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 border-[2px] border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                Academia
              </span>
            </div>
            <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
              Academic Goals
            </h2>
            <p className="mt-1 font-mono text-xs text-muted">
              Select a goal to view progress and log work
            </p>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeGoal ? (
          activeGoal === "sbr" ? (
            <div className="mx-auto flex max-w-5xl flex-col gap-5">
              <SyllabusSection
                sessions={sessions}
                loading={loadingData}
                submitting={submittingSyllabus}
                topicName={topicName}
                hoursSpent={hoursSpent}
                onTopicNameChange={setTopicName}
                onHoursSpentChange={setHoursSpent}
                onSubmit={handleLogSession}
              />
              <ImplementationSection
                questions={questions}
                loading={loadingData}
                questionName={questionName}
                marks={marks}
                onQuestionNameChange={setQuestionName}
                onMarksChange={setMarks}
                onStart={handleStartPractice}
                onFinish={handleFinishPractice}
                submittingStart={submittingStart}
                stopwatchRunning={stopwatchRunning}
                stopwatchSeconds={stopwatchSeconds}
              />
            </div>
          ) : null
        ) : (
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setActiveGoal("sbr")}
                className="group flex flex-col border-[2px] border-card-border bg-card-bg p-6 text-left transition-colors hover:border-accent/50 hover:bg-accent/[0.03]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                    Active
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    2 sections
                  </span>
                </div>
                <h3 className="mb-1 font-mono text-sm font-bold uppercase tracking-wider text-foreground group-hover:text-accent">
                  ACCA SBR
                </h3>
                <p className="font-mono text-[11px] text-muted">
                  Strategic Business Reporting
                </p>
                <div className="mt-auto pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Exam Date: 10th
                  </p>
                </div>
              </button>

              <div className="flex flex-col items-center justify-center border-[2px] border-dashed border-table-border bg-transparent p-6 opacity-40">
                <Plus className="mb-3 h-5 w-5 text-muted" />
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                  New Goal
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted/60">
                  Coming Soon
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
