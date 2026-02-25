"use client";

import { useState } from "react";
import PulpitView from "@/components/pulpit/PulpitView";
import SermonCanvas from "@/components/study/SermonCanvas";
import DashboardView, { SermonMeta } from "@/components/dashboard/DashboardView";
import BibleExplorer from "@/components/dashboard/BibleExplorer";
import LandingView from "@/components/LandingView";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

type ViewState = 'dashboard' | 'study' | 'pulpit' | 'bible';

export default function Home() {
  const { environment } = require('@/environments');
  const { data: session, status } = useSession();
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSermon, setActiveSermon] = useState<SermonMeta | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LandingView />;
  }

  const handleEditSermon = (sermon: SermonMeta) => {
    setActiveSermon(sermon);
    setView('study');
  };

  const handleStartPulpit = (sermon: SermonMeta, time: number) => {
    setActiveSermon(sermon);
    setTargetTime(time);
    setView('pulpit');
  };

  const handleCreateSermonFromBible = async (reference: string, content: string) => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`${environment.apiUrl}/sermons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Estudo: ${reference}`,
          category: 'Estudo Bíblico',
          status: 'DRAFT',
          authorId: session.user.id,
          bibleSources: [
            { id: `src-${Date.now()}`, reference, content }
          ],
          blocks: {
            create: [
              {
                type: 'TEXTO_BASE',
                content: content,
                order: 0,
                metadata: { reference, bibleSourceId: `src-${Date.now()}` }
              }
            ]
          }
        })
      });
      if (res.ok) {
        const newSermon = await res.json();
        setActiveSermon(newSermon);
        setView('study');
      }
    } catch (e) {
      console.error("Failed to create sermon from bible", e);
    }
  };

  return (
    <main className="min-h-screen bg-background relative">
      {view === 'dashboard' && (
        <DashboardView 
          onEdit={handleEditSermon} 
          onStart={handleStartPulpit}
          onBible={() => setView('bible')}
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

      {view === 'bible' && (
        <BibleExplorer 
          onBack={() => setView('dashboard')} 
          onCreateSermon={handleCreateSermonFromBible}
        />
      )}
    </main>
  );
}
