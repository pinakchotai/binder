"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import HomeDashboard from "@/components/home-dashboard";
import AcademiaPanel from "@/components/academia-panel";
import DailySystemsPanel from "@/components/daily-systems-panel";
import SettingsPanel from "@/components/settings-panel";

export default function Home() {
  const [activePanel, setActivePanel] = useState("home");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      {activePanel === "home" && <HomeDashboard />}
      {activePanel === "academia" && <AcademiaPanel />}
      {activePanel === "daily-systems" && <DailySystemsPanel />}
      {activePanel === "settings" && (
        <SettingsPanel onBack={() => setActivePanel("home")} />
      )}
    </div>
  );
}
