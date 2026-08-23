"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import HomeDashboard from "@/components/home-dashboard";
import StudyPanel from "@/components/study-panel";
import DailySystemsPanel from "@/components/daily-systems-panel";
import SettingsPanel from "@/components/settings-panel";
import AuthScreen from "@/components/auth-screen";
import OnboardingScreen from "@/components/onboarding-screen";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { Layers, Loader2 } from "lucide-react";

function Splash() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center border-[2px] border-accent/30 bg-accent/15">
        <Layers className="h-6 w-6 text-accent" />
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-muted" />
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const { loadedForUser } = useSettings();
  const [activePanel, setActivePanel] = useState("home");
  const [skipOnboarding, setSkipOnboarding] = useState(false);

  if (loading) return <Splash />;
  if (!user) return <AuthScreen />;

  const needsOnboarding =
    loadedForUser === user.id &&
    !localStorage.getItem(`thebinder_onboarded_${user.id}`) &&
    !skipOnboarding;

  if (needsOnboarding) {
    return (
      <OnboardingScreen
        onDone={() => {
          setSkipOnboarding(true);
          localStorage.setItem(`thebinder_onboarded_${user.id}`, "true");
        }}
      />
    );
  }

  if (loadedForUser !== user.id) return <Splash />;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      {activePanel === "home" && <HomeDashboard />}
      {activePanel === "study" && <StudyPanel />}
      {activePanel === "daily-systems" && <DailySystemsPanel />}
      {activePanel === "settings" && (
        <SettingsPanel onBack={() => setActivePanel("home")} />
      )}
    </div>
  );
}
