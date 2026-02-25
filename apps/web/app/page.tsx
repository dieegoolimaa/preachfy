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
      const srcId = `src-${Date.now()}`;
      let finalBibleSourceContent = content;
      let blocksToCreate = [];

      // Category mapping utility
      const mapLabelToCategory = (label: string): string => {
        const l = label.toLowerCase();
        if (l.includes('texto') || l.includes('base')) return 'TEXTO_BASE';
        if (l.includes('hermeneutica') || l.includes('exegese') || l.includes('estudo')) return 'EXEGESE';
        if (l.includes('aplicacao') || l.includes('pratica') || l.includes('vida')) return 'APLICACAO';
        if (l.includes('ilustracao') || l.includes('exemplo')) return 'ILUSTRACAO';
        if (l.includes('enfase') || l.includes('aviso') || l.includes('alerta') || l.includes('chamada') || l.includes('importante')) return 'ENFASE';
        return 'CUSTOMIZAR';
      };

      try {
        const data = JSON.parse(content);
        if (data.type === 'structured-study' && data.blocks) {
          finalBibleSourceContent = data.chapterText;
          
          let currentOrder = 0;
          
          // For each highlighted verse, create a verse block and its companion insight block in sequence
          data.blocks.forEach((b: any) => {
            // 1. Create the Verse Block (TEXTO_BASE)
            blocksToCreate.push({
              type: 'TEXTO_BASE',
              content: `${b.verseNumber} ${b.verseText}`,
              order: currentOrder++,
              metadata: { 
                reference: `${reference}:${b.verseNumber}`, 
                bibleSourceId: srcId, 
                parentVerseId: b.verseNumber.toString() 
              }
            });

            // 2. Create the Insight Block if there is a comment
            if (b.comment) {
              const blockType = mapLabelToCategory(b.category);
              blocksToCreate.push({
                type: blockType,
                content: b.comment,
                order: currentOrder++,
                metadata: { 
                  reference: `${reference}:${b.verseNumber}`, 
                  bibleSourceId: srcId, 
                  parentVerseId: b.verseNumber.toString(),
                  customLabel: b.category,
                  customColor: b.color,
                  verseText: b.verseText,
                  depth: 1 // Nest this block under the verse
                }
              });
            }
          });
        }
      } catch (e) {
        // Fallback for simple markdown content
        blocksToCreate.push({
          type: 'TEXTO_BASE',
          content: content,
          order: 0,
          metadata: { reference, bibleSourceId: srcId, parentVerseId: 'ALL' }
        });
      }

      const res = await fetch(`${environment.apiUrl}/sermons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Estudo: ${reference}`,
          category: 'Estudo Bíblico',
          status: 'DRAFT',
          authorId: session.user.id,
          bibleSources: [
            { id: srcId, reference: `${reference} (Completo)`, content: finalBibleSourceContent }
          ],
          blocks: {
            create: blocksToCreate
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
