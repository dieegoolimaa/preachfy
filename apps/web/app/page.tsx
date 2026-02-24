"use client";

import { useState } from "react";
import PulpitView from "@/components/pulpit/PulpitView";
import SermonCanvas from "@/components/study/SermonCanvas";
import DashboardView, { SermonMeta } from "@/components/dashboard/DashboardView";
import { Button } from "@/components/ui/button";

type ViewState = 'dashboard' | 'study' | 'pulpit';

export default function Home() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSermon, setActiveSermon] = useState<SermonMeta | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);

  const handleEditSermon = (sermon: SermonMeta) => {
    setActiveSermon(sermon);
    setView('study');
  };

  const handleStartPulpit = (sermon: SermonMeta, time: number) => {
    setActiveSermon(sermon);
    setTargetTime(time);
    setView('pulpit');
  };

  return (
    <main className="min-h-screen bg-background relative">
      {view === 'dashboard' && (
        <DashboardView 
          onEdit={handleEditSermon} 
          onStart={handleStartPulpit} 
        />
      )}
      
      {view === 'study' && activeSermon && (
        <div className="relative w-full">
          <SermonCanvas 
            sermonId={activeSermon.id} 
            initialData={activeSermon}
            onBack={() => setView('dashboard')} 
            onStart={() => setView('pulpit')}
          />
        </div>
      )}

      {view === 'pulpit' && activeSermon && (
        <div className="relative w-full h-full">
          <PulpitView 
            sermonId={activeSermon.id}
            targetTime={targetTime} 
            onExit={() => setView('dashboard')} 
            onStudy={() => setView('study')}
          />
        </div>
      )}
    </main>
  );
}
