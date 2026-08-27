"use client";

import { useState } from "react";
import { IconCpuBold, IconRefreshBold, IconDangerTriangleBold, IconLetterBold, IconLockBold, IconUserBold } from "@ninzapp/solar-icons/bold";
import { Card, Button } from '@/components/lithos';
import { useAuth } from "@/lib/auth";

type Mode = "login" | "signup";

const inputClass =
  "w-full border border-input-border bg-input-bg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none transition-colors";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password || busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    if (mode === "login") {
      const err = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setBusy(false);
        return;
      }
      const err = await signUp(
        email.trim(),
        password,
        fullName.trim() || undefined,
      );
      if (err) {
        setError(err);
      } else {
        setNotice("Account created. Check your email to confirm, then log in.");
      }
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center border border-accent/30 bg-accent/15">
            <IconCpuBold className="h-6 w-6 text-accent" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
            The Binder
          </h1>
          <p className="font-mono text-[11px] text-muted">
            Performance Dashboard
          </p>
        </div>

        <Card className="p-0 card-depth">
          <div className="border-b border-card-border px-5 py-3">
            <h2 className="font-mono text-sm font-bold tracking-tight text-foreground">
              {mode === "login" ? "Log In" : "Create Account"}
            </h2>
          </div>

          <div className="space-y-3 p-5">
            {error && (
              <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-3 py-2">
                <IconDangerTriangleBold className="h-3 w-3 shrink-0 text-red-400" />
                <span className="font-mono text-[11px] text-red-400">{error}</span>
              </div>
            )}
            {notice && (
              <div className="border border-green-500/40 bg-green-500/10 px-3 py-2 font-mono text-[11px] text-green-400">
                {notice}
              </div>
            )}

            {mode === "signup" && (
              <div className="relative">
                <IconUserBold className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className={`${inputClass} pl-9`}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="relative">
                <IconLetterBold className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="email"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={`${inputClass} pl-9`}
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <IconLockBold className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={`${inputClass} pl-9`}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              disabled={busy || !email.trim() || !password}
              className="flex items-center justify-center gap-2 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider"
            >
              {busy && <IconRefreshBold className="h-3.5 w-3.5 animate-spin" />}
              {mode === "login" ? "Log In" : "Sign Up"}
            </Button>

          </div>
        </Card>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent"
        >
          {mode === "login"
            ? "No account? Create one"
            : "Have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
