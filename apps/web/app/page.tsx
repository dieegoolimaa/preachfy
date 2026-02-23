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
    <main className="min-h-screen bg-background overflow-hidden relative">
      {view === 'dashboard' && (
        <DashboardView 
          onEdit={handleEditSermon} 
          onStart={handleStartPulpit} 
        />
      )}
      
      {view === 'study' && activeSermon && (
        <div className="relative w-full h-full">
          <SermonCanvas />
          <Button 
            onClick={() => setView('dashboard')}
            className="absolute bottom-6 left-6 rounded-full shadow-2xl h-12 px-6 font-mono font-bold tracking-widest text-[10px] uppercase bg-surface border border-border text-foreground hover:bg-background transition-colors z-[200]"
          >
            ← Voltar ao Início
          </Button>
          <Button 
            onClick={() => setView('pulpit')}
            className="absolute bottom-6 right-6 rounded-full shadow-2xl h-12 px-8 font-mono font-bold tracking-widest text-[10px] uppercase bg-foreground text-background hover:scale-105 transition-transform z-[200]"
          >
            Simular Púlpito
          </Button>
        </div>
      )}

      {view === 'pulpit' && (
        <div className="relative w-full h-full">
          <PulpitView targetTime={targetTime} onExit={() => setView('dashboard')} />
        </div>
      )}
    </main>
  );
}
