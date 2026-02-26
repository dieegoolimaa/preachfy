"use client";

import { useState, useEffect } from "react";
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
  
  // ── State with Session Persistence ────────────────────────────
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSermon, setActiveSermon] = useState<SermonMeta | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);
  const [bibleSnapshot, setBibleSnapshot] = useState<{ highlights?: any, labels?: any } | null>(null);

  // Load state on mount
  useEffect(() => {
    const savedView = localStorage.getItem('preachfy_view') as ViewState;
    if (savedView) setView(savedView);

    const savedSermon = localStorage.getItem('preachfy_active_sermon');
    if (savedSermon) setActiveSermon(JSON.parse(savedSermon));

    const savedTime = localStorage.getItem('preachfy_target_time');
    if (savedTime) setTargetTime(parseInt(savedTime));

    const savedSnapshot = localStorage.getItem('preachfy_bible_snapshot');
    if (savedSnapshot) setBibleSnapshot(JSON.parse(savedSnapshot));
  }, []);

  // Save state on change
  useEffect(() => {
    localStorage.setItem('preachfy_view', view);
    if (activeSermon) localStorage.setItem('preachfy_active_sermon', JSON.stringify(activeSermon));
    else localStorage.removeItem('preachfy_active_sermon');

    localStorage.setItem('preachfy_target_time', targetTime.toString());
    
    if (bibleSnapshot) localStorage.setItem('preachfy_bible_snapshot', JSON.stringify(bibleSnapshot));
    else localStorage.removeItem('preachfy_bible_snapshot');
  }, [view, activeSermon, targetTime, bibleSnapshot]);

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
      let explorerSnapshot = null;

      // Category mapping utility
      const mapLabelToCategory = (label: string): string => {
        const l = label.toLowerCase();
        if (l.includes('texto') || l.includes('base')) return 'TEXTO_BASE';
        if (l.includes('hermeneutica') || l.includes('exegese') || l.includes('estudo')) return 'EXEGESE';
        if (l.includes('aplicacao') || l.includes('pratica') || l.includes('vida') || l.includes('pastoral')) return 'APLICACAO';
        if (l.includes('ilustracao') || l.includes('exemplo')) return 'ILUSTRACAO';
        if (l.includes('enfase') || l.includes('aviso') || l.includes('alerta') || l.includes('chamada') || l.includes('importante')) return 'ENFASE';
        if (l.includes('promessa')) return 'PROMESSA';
        if (l.includes('mandamento')) return 'MANDAMENTO';
        if (l.includes('cristo') || l.includes('realeza') || l.includes('divino')) return 'CRISTO';
        return 'CUSTOMIZAR';
      };

      try {
        const data = JSON.parse(content);
        if (data.type === 'structured-study' && data.blocks) {
          finalBibleSourceContent = data.chapterText;
          explorerSnapshot = {
            highlights: data.rawHighlights,
            labels: data.rawCustomLabels
          };
          
          let currentOrder = 0;
          
          // Use unique client-side IDs for initial linkage
          data.blocks.forEach((b: any) => {
            const baseTextId = `bt-${Date.now()}-${currentOrder}`;

            // 1. Create the Verse Block (TEXTO_BASE)
            blocksToCreate.push({
              id: baseTextId,
              type: 'TEXTO_BASE',
              content: `${b.verseNumber} ${b.verseText}`,
              order: currentOrder++,
              metadata: { 
                reference: `${reference}:${b.verseNumber}`, 
                bibleSourceId: srcId, 
                parentVerseId: baseTextId 
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
                  parentVerseId: baseTextId,
                  customLabel: b.category,
                  customColor: b.color,
                  verseText: b.verseText,
                  isInsight: true,
                  depth: 1 
                }
              });
            }
          });
        }
      } catch (e) {
        const baseTextId = `bt-${Date.now()}-0`;
        // Fallback for simple markdown content
        blocksToCreate.push({
          id: baseTextId,
          type: 'TEXTO_BASE',
          content: content,
          order: 0,
          metadata: { reference, bibleSourceId: srcId, parentVerseId: baseTextId }
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
            { 
              id: srcId, 
              reference: `${reference} (Completo)`, 
              content: finalBibleSourceContent,
              explorerSnapshot 
            }
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
          onBible={() => {
            setBibleSnapshot(null);
            localStorage.removeItem('preachfy_bible_highlights');
            localStorage.removeItem('preachfy_bible_labels');
            setView('bible');
          }}
        />
      )}
      
      {view === 'study' && activeSermon && (
        <div className="relative w-full">
          <SermonCanvas 
            sermonId={activeSermon.id} 
            initialData={activeSermon}
            onBack={() => setView('dashboard')} 
            onStart={() => setView('pulpit')}
            onViewSnapshot={(snapshot) => {
              setBibleSnapshot(snapshot);
              setView('bible');
            }}
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
          onBack={() => setView(activeSermon ? 'study' : 'dashboard')} 
          onCreateSermon={handleCreateSermonFromBible}
          initialHighlights={bibleSnapshot?.highlights}
          initialCustomLabels={bibleSnapshot?.labels}
        />
      )}
    </main>
  );
}
