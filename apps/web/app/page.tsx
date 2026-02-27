"use client";

import { useState, useEffect } from "react";
import PulpitView from "@/components/pulpit/PulpitView";
import SermonCanvas from "@/components/study/SermonCanvas";
import DashboardView, { SermonMeta } from "@/components/dashboard/DashboardView";
import BibleExplorer from "@/components/dashboard/BibleExplorer";
import LandingView from "@/components/LandingView";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import CommunityHub from "@/components/community/CommunityHub";
import { Navbar } from "@/components/layout/Navbar";

type ViewState = 'dashboard' | 'study' | 'pulpit' | 'bible' | 'community';

export default function Home() {
  const { environment } = require('@/environments');
  const { data: session, status } = useSession();
  
  // ── State with Session Persistence ────────────────────────────
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSermon, setActiveSermon] = useState<SermonMeta | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);
  const [bibleSnapshot, setBibleSnapshot] = useState<{ 
    highlights?: any, 
    labels?: any,
    book?: string,
    chapter?: number,
    abbrev?: string,
    version?: string
  } | null>(null);

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

    // Check for Community Auto-Join Link
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('join');
    if (inviteCode && session?.user?.id) {
      const { environment } = require('@/environments');
      fetch(`${environment.apiUrl}/community/join/${inviteCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      }).then(res => {
        if (res.ok) {
          alert("Você entrou em uma nova comunidade ministerial!");
          setView('community');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [session?.user?.id]);

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

      const mapLabelToCategory = (label: string): string => {
        const l = label.toLowerCase();
        if (l.includes('texto') || l.includes('base')) return 'TEXTO_BASE';
        if (l.includes('hermeneutica') || l.includes('exegese') || l.includes('estudo')) return 'EXEGESE';
        if (l.includes('aplicacao') || l.includes('pratica') || l.includes('pastoral')) return 'APLICACAO';
        if (l.includes('vida') || l.includes('crescimento')) return 'VIDA';
        if (l.includes('ilustracao') || l.includes('exemplo')) return 'ILUSTRACAO';
        if (l.includes('alerta') || l.includes('aviso')) return 'ALERTA';
        if (l.includes('enfase') || l.includes('importante')) return 'ENFASE';
        if (l.includes('mandamento')) return 'MANDAMENTO';
        if (l.includes('promessa')) return 'PROMESSA';
        if (l.includes('contexto')) return 'CONTEXTO';
        if (l.includes('espirito santo')) return 'ESPIRITO_SANTO';
        if (l.includes('ceu') || l.includes('divino') || l.includes('desceu')) return 'CEU';
        if (l.includes('profecia')) return 'PROFECIA';
        if (l.includes('cristo') || l.includes('realeza')) return 'CRISTO';
        if (l.includes('adoracao')) return 'ADORACAO';
        if (l.includes('pecado') || l.includes('perdao')) return 'PECADO';
        if (l.includes('historia')) return 'HISTORIA';
        if (l.includes('significado') || l.includes('lexico') || l.includes('original')) return 'SIGNIFICADO';
        return 'APLICACAO';
      };

      const generateObjectId = () => {
        const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
        const chars = 'abcdef0123456789';
        let rest = '';
        for (let i = 0; i < 16; i++) rest += chars[Math.floor(Math.random() * 16)];
        return timestamp + rest;
      };

      try {
        const data = JSON.parse(content);
        if (data.type === 'structured-study' && data.blocks) {
          finalBibleSourceContent = data.chapterText;
          explorerSnapshot = {
            highlights: data.rawHighlights,
            labels: data.rawCustomLabels,
            book: data.book,
            chapter: data.chapter,
            abbrev: data.abbrev,
            version: data.version
          };
          
          let currentOrder = 0;
          const verseMap = new Map<string, string>(); // ref:verse -> mongoId
          
          // Use unique client-side IDs for initial linkage
          data.blocks.forEach((b: any) => {
            const verseRef = `${reference}:${b.verseNumber}`;
            let baseTextId = verseMap.get(verseRef);

            // 1. Create the Verse Block (TEXTO_BASE) ONLY IF NOT EXISTS
            if (!baseTextId) {
              baseTextId = generateObjectId();
              verseMap.set(verseRef, baseTextId);
              
              blocksToCreate.push({
                id: baseTextId,
                type: 'TEXTO_BASE',
                content: `${b.verseNumber} ${b.verseText}`,
                order: currentOrder++,
                metadata: { 
                  reference: verseRef, 
                  bibleSourceId: srcId, 
                  parentVerseId: '' // Clear self-reference to avoid appearing in Col 3
                }
              });
            }

            // 2. Create the Insight Block if there is a comment (even empty string)
            if (b.comment !== undefined && b.comment !== null) {
              const blockType = mapLabelToCategory(b.category);
              blocksToCreate.push({
                type: blockType,
                content: b.comment,
                order: currentOrder++,
                metadata: { 
                  reference: verseRef, 
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
        const baseTextId = generateObjectId();
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
        
        // 🔒 CLEAR BIBLE SESSION ONLY ON SUCCESS
        localStorage.removeItem('preachfy_bible_highlights');
        localStorage.removeItem('preachfy_bible_labels');
        setBibleSnapshot(null);

        setActiveSermon(newSermon);
        setView('study');
      } else {
        const error = await res.text();
        console.error("API Error creating sermon:", error);
        alert("Ops! Houve um erro ao salvar seu estudo no servidor. Suas anotações continuam seguras na bíblia, tente novamente em instantes.");
      }
    } catch (e) {
      console.error("Failed to create sermon from bible", e);
      alert("Falha na conexão. Suas anotações estão salvas no navegador, tente clicar em Gerar Estudo novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-background relative flex flex-col">
      {view !== 'pulpit' && (
        <Navbar 
          currentView={view} 
          onViewChange={(v) => {
            if (v === 'bible') {
              setBibleSnapshot(null);
              localStorage.removeItem('preachfy_bible_highlights');
              localStorage.removeItem('preachfy_bible_labels');
            }
            setView(v);
          }}
          onBack={view !== 'dashboard' ? () => setView('dashboard') : undefined}
        />
      )}

      <div className="flex-1 overflow-hidden h-full">
        {view === 'dashboard' && (
          <DashboardView 
            onEdit={handleEditSermon} 
            onStart={handleStartPulpit}
            onBible={() => { setBibleSnapshot(null); setView('bible'); }}
            onCommunity={() => setView('community')}
            onDelete={(id) => {
              if (activeSermon?.id === id) setActiveSermon(null);
              // Clear snapshot too if it belonged to this sermon (best effort)
              setBibleSnapshot(null);
            }}
          />
        )}

        {view === 'community' && (
          <CommunityHub 
            onBack={() => setView('dashboard')} 
            onViewSermon={async (sermonId) => {
              try {
                const res = await fetch(`${environment.apiUrl}/sermons/${sermonId}`);
                if (res.ok) {
                  const data = await res.json();
                  setActiveSermon(data);
                  setView('study');
                }
              } catch (e) {
                console.error("Failed to fetch shared sermon", e);
              }
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
            initialBook={bibleSnapshot?.book}
            initialChapter={bibleSnapshot?.chapter}
            initialAbbrev={bibleSnapshot?.abbrev}
            initialVersion={bibleSnapshot?.version}
            sermonTitle={activeSermon?.title}
          />
        )}
      </div>
    </main>
  );
}
