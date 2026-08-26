"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen,
  Target,
  Clock,
  Pen,
  CircleNotch,
  Square,
} from "@phosphor-icons/react";
import {
  supabase,
  getUserId,
  type StudySession,
  type PracticeQuestion,
} from "@/lib/supabase";
import CumulativeHoursChart from "@/components/cumulative-hours-chart";
import VarianceChart from "@/components/variance-chart";

const sessionHeaders = ["Topic", "Hours", "Date"];
const timerHeaders = [
  "Task",
  "Target Time",
  "Actual Time",
  "Variance",
];

const inputClass =
  "border-[2px] border-input-border bg-input-bg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none transition-colors uppercase placeholder:lowercase";

function StudySessionsSection({
  sessions,
  loading,
  submitting,
  topicName,
  hoursSpent,
  onTopicNameChange,
  onHoursSpentChange,
  onSubmit,
}: {
  sessions: StudySession[];
  loading: boolean;
  submitting: boolean;
  topicName: string;
  hoursSpent: string;
  onTopicNameChange: (v: string) => void;
  onHoursSpentChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border bg-card-bg px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <BookOpen className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Study Sessions
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
              <CircleNotch className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pen className="h-3.5 w-3.5" />
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
                {sessionHeaders.map((h) => (
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
                    colSpan={sessionHeaders.length}
                    className="px-4 py-8 text-center font-mono text-xs text-muted"
                  >
                    <CircleNotch className="mx-auto h-4 w-4 animate-spin text-muted" />
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={sessionHeaders.length}
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
                    <td className="px-4 py-2.5 font-mono text-sm font-bold text-accent">
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

function TimedTasksSection({
  questions,
  loading,
  taskName,
  targetMinutesInput,
  onTaskNameChange,
  onTargetMinutesChange,
  onStart,
  onFinish,
  submittingStart,
  stopwatchRunning,
  stopwatchSeconds,
}: {
  questions: PracticeQuestion[];
  loading: boolean;
  taskName: string;
  targetMinutesInput: string;
  onTaskNameChange: (v: string) => void;
  onTargetMinutesChange: (v: string) => void;
  onStart: () => void;
  onFinish: () => void;
  submittingStart: boolean;
  stopwatchRunning: boolean;
  stopwatchSeconds: number;
}) {
  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border bg-card-bg px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <Target className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Timed Practice
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
              placeholder="task or question name"
              value={taskName}
              onChange={(e) => onTaskNameChange(e.target.value)}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="target min"
              min={1}
              step={1}
              value={targetMinutesInput}
              onChange={(e) => onTargetMinutesChange(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={onStart}
              disabled={
                submittingStart || !taskName.trim() || !targetMinutesInput
              }
              className="inline-flex items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submittingStart ? (
                <CircleNotch className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              Start
            </button>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <VarianceChart questions={questions} />
        )}

        <div className="overflow-hidden border-[2px] border-table-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[2px] border-table-border bg-table-header">
                {timerHeaders.map((h) => (
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
                    colSpan={timerHeaders.length}
                    className="px-4 py-8 text-center font-mono text-xs text-muted"
                  >
                    <CircleNotch className="mx-auto h-4 w-4 animate-spin text-muted" />
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td
                    colSpan={timerHeaders.length}
                    className="border border-dashed border-table-border px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-muted"
                  >
                    No timed tasks logged yet.
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

export default function StudyPanel() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submittingSession, setSubmittingSession] = useState(false);
  const [submittingStart, setSubmittingStart] = useState(false);

  const [topicName, setTopicName] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  const [taskName, setTaskName] = useState("");
  const [targetMinutesInput, setTargetMinutesInput] = useState("");

  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const activeQuestionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchSecondsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [sessRes, qRes] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("practice_questions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (sessRes.error)
        console.error(
          "Failed to fetch study sessions:",
          JSON.stringify(sessRes.error),
        );
      if (qRes.error)
        console.error(
          "Failed to fetch practice tasks:",
          JSON.stringify(qRes.error),
        );
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
    setSubmittingSession(true);
    const userId = await getUserId();
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId,
      topic_name: topicName.trim(),
      hours_spent: Number(hoursSpent),
    });
    if (error) {
      console.error("Failed to log session:", error);
    } else {
      setTopicName("");
      setHoursSpent("");
      const res = await supabase
        .from("study_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      setSessions(res.data ?? []);
    }
    setSubmittingSession(false);
  };

  const handleStartPractice = async () => {
    if (!taskName.trim() || !targetMinutesInput) return;
    setSubmittingStart(true);
    const targetTime = Number(targetMinutesInput);
    if (isNaN(targetTime) || targetTime <= 0) {
      setSubmittingStart(false);
      return;
    }
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("practice_questions")
      .insert({
        user_id: userId,
        question_name: taskName.trim(),
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
    setTaskName("");
    setTargetMinutesInput("");
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
    const res = await supabase
      .from("practice_questions")
      .select("*")
      .order("created_at", { ascending: false });
    setQuestions(res.data ?? []);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b-[2px] border-card-border bg-card-bg px-8 py-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border-[2px] border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Study
          </span>
        </div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
          Study Tracker
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Log study sessions and time your practice against targets
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <StudySessionsSection
            sessions={sessions}
            loading={loadingData}
            submitting={submittingSession}
            topicName={topicName}
            hoursSpent={hoursSpent}
            onTopicNameChange={setTopicName}
            onHoursSpentChange={setHoursSpent}
            onSubmit={handleLogSession}
          />
          <TimedTasksSection
            questions={questions}
            loading={loadingData}
            taskName={taskName}
            targetMinutesInput={targetMinutesInput}
            onTaskNameChange={setTaskName}
            onTargetMinutesChange={setTargetMinutesInput}
            onStart={handleStartPractice}
            onFinish={handleFinishPractice}
            submittingStart={submittingStart}
            stopwatchRunning={stopwatchRunning}
            stopwatchSeconds={stopwatchSeconds}
          />
        </div>
      </div>
    </div>
  );
}
