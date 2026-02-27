"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Clock, Search, Book, Sidebar, ChevronRight, X, 
  Maximize2, Minimize2, ArrowLeft, ArrowRight, MoreVertical, 
  LayoutGrid, Zap, GripVertical, CheckCircle2,
  Quote, CornerDownRight, LinkIcon, Trash2, Layout, LogOut, Plus, Highlighter, MessageSquare,
  BookOpen, HelpCircle, Target, Lightbulb, AlertTriangle, Cloud, Info, History, Languages, Star, Compass, Heart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { useGesture } from '@use-gesture/react';
import { useSession } from 'next-auth/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PulpitViewProps {
  sermonId: string;
  targetTime: number; // minutes
  onExit: () => void;
  onStudy?: () => void;
  onMinimize?: () => void;
}

const generateObjectId = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const chars = 'abcdef0123456789';
    let rest = '';
    for (let i = 0; i < 16; i++) rest += chars[Math.floor(Math.random() * 16)];
    return timestamp + rest;
};

// Perspectiva Teológica - Must match SermonCanvas
const CATEGORY_MAP: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  TEXTO_BASE: { label: 'Texto Base (Bíblico)', color: 'var(--color-texto)', icon: <BookOpen className="w-4 h-4" /> },
  EXEGESE: { label: 'Hermenêutica / Exegese', color: 'var(--color-exegese)', icon: <HelpCircle className="w-4 h-4" /> },
  APLICACAO: { label: 'Aplicação Pastoral', color: 'var(--color-aplicacao)', icon: <Target className="w-4 h-4" /> },
  ILUSTRACAO: { label: 'Ilustração', color: 'var(--color-ilustracao)', icon: <Lightbulb className="w-4 h-4" /> },
  ENFASE: { label: 'Ênfase / Alerta', color: 'var(--color-enfase)', icon: <AlertTriangle className="w-4 h-4" /> },
  ALERTA: { label: 'Alerta / Aviso', color: '#fca5a5', icon: <AlertTriangle className="w-4 h-4" /> },
  MANDAMENTO: { label: 'Mandamento', color: '#fdba74', icon: <Highlighter className="w-4 h-4" /> },
  PROMESSA: { label: 'Promessa', color: '#fcd34d', icon: <Star className="w-4 h-4" /> },
  CONTEXTO: { label: 'Contexto', color: '#fef08a', icon: <Info className="w-4 h-4" /> },
  VIDA: { label: 'Vida / Crescimento', color: '#6ee7b7', icon: <Plus className="w-4 h-4" /> },
  ESPIRITO_SANTO: { label: 'Espírito Santo', color: '#5eead4', icon: <Zap className="w-4 h-4" /> },
  REVELACAO: { label: 'Revelação / Rhema', color: '#7dd3fc', icon: <Zap className="w-4 h-4" /> },
  PROFECIA: { label: 'Profecia', color: '#93c5fd', icon: <History className="w-4 h-4" /> },
  CRISTO: { label: 'Cristo / Realeza', color: '#a5b4fc', icon: <Zap className="w-4 h-4" /> },
  ADORACAO: { label: 'Adoração', color: '#c4b5fd', icon: <Plus className="w-4 h-4" /> },
  AMOR: { label: 'Amor / Graça', color: '#fda4af', icon: <Plus className="w-4 h-4" /> },
  PECADO: { label: 'Pecado / Perdão', color: '#f5d0fe', icon: <Trash2 className="w-4 h-4" /> },
  HISTORIA: { label: 'História', color: '#cbd5e1', icon: <History className="w-4 h-4" /> },
  SIGNIFICADO: { label: 'Significado de Palavra', color: '#a8a29e', icon: <Languages className="w-4 h-4" /> },
  CUSTOMIZAR: { label: 'Customizar...', color: 'var(--color-custom)', icon: <MessageSquare className="w-4 h-4" /> }
};

const parseBibleContent = (content: string) => {
  if (!content) return [];
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const verses: { v: number; text: string }[] = [];
  lines.forEach(line => {
    const match = line.match(/^(\d+)\s+(.*)/);
    if (match && match[1] && match[2]) {
      verses.push({ v: parseInt(match[1]), text: match[2] });
    } else {
      const lastVerse = verses[verses.length - 1];
      if (lastVerse) {
        lastVerse.text += ' ' + line;
      }
    }
  });
  return verses;
};

export default function PulpitView({ sermonId, targetTime, onExit, onStudy, onMinimize }: PulpitViewProps) {
  const { data: session } = useSession();
  const { latestBlocks, latestMeta, isConnected, syncCanvas, syncMeta } = useSermonSocket(sermonId);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sermonMeta, setSermonMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'BIBLIA' | 'ESTRUTURA'>('ESTRUTURA');
  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`preachfy_pulpit_end_${sermonId}`);
      if (saved) {
        const remaining = Math.floor((parseInt(saved) - Date.now()) / 1000);
        return Math.max(0, remaining);
      }
      const end = Date.now() + targetTime * 60 * 1000;
      localStorage.setItem(`preachfy_pulpit_end_${sermonId}`, end.toString());
    }
    return targetTime * 60;
  });


  // Refs for auto-scroll
  const hudScrollRef = useRef<HTMLDivElement>(null);

  const activeVerseRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<any[]>(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);


  

  
  // Update local blocks when socket updates
  useEffect(() => {
    if (latestBlocks) {
      setBlocks(latestBlocks);
    }
  }, [latestBlocks]);

  // Update local metadata when socket updates
  useEffect(() => {
    if (latestMeta && sermonMeta) {
      setSermonMeta((prev: any) => ({
        ...prev,
        ...latestMeta
      }));
    }
  }, [latestMeta]);



  // Initial Fetch
  useEffect(() => {
    const { environment } = require('@/environments');
    const fetchSermon = async () => {
      try {
        const res = await fetch(`${environment.apiUrl}/sermons/${sermonId}`);
        const data = await res.json();
        setSermonMeta(data);
        if (data && data.blocks) {
          setBlocks(data.blocks);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sermon in Pulpit:", error);
        setLoading(false);
      }
    };
    fetchSermon();
  }, [sermonId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const saved = localStorage.getItem(`preachfy_pulpit_end_${sermonId}`);
      if (saved) {
        const remaining = Math.floor((parseInt(saved) - Date.now()) / 1000);
        setTimeLeft(Math.max(0, remaining));
      } else {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sermonId]);

  const handleSave = async (blocksToSave?: any[]) => {
    const data = blocksToSave || blocksRef.current;
    if (!sermonId || !data || data.length === 0) return;
    const { environment } = require('@/environments');
    try {
      await fetch(`${environment.apiUrl}/sermons/${sermonId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: data })
      });
      // CRITICAL: Clear Study Mode backup to force Studio to reload from DB
      localStorage.removeItem(`preachfy_study_backup_${sermonId}`);
    } catch (e) {
      console.error("Auto-save failed in Pulpit", e);
    }
  };

  // Sync on unmount
  useEffect(() => {
    return () => {
      handleSave();
    };
  }, []);

  useEffect(() => {
    if (blocks.length > 0) {
      const timer = setTimeout(() => handleSave(), 5000); // Back to background sync
      return () => clearTimeout(timer);
    }
  }, [blocks]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bind = useGesture({
    onDragEnd: (state) => {
      const { swipe: [sx] } = state;
      if (sx < 0) handleNext();
      if (sx > 0) handlePrev();
    }
  });

  // Enhanced grouping logic: Group by parent-child relationship
  const groupedBlocks = React.useMemo(() => {
    const result: any[][] = [];
    
    const usedIds = new Set<string>();
    const anchors = blocks.filter(b => !b.metadata?.isInsight);

    anchors.forEach(anchor => {
      // 2. Map each anchor to its specific insights using robust logic (ID or Reference)
      const insights = blocks.filter(b => 
        b.id !== anchor.id && 
        b.metadata?.isInsight && 
        b.metadata?.insightStatus !== 'PENDING' && ( // FIX: Only show fully formed insights in the structural map
          b.metadata?.parentVerseId === anchor.id
        )
      );
      
      // Block entirely empty anchors that have no insights, avoiding ghost steps
      if (!anchor.content?.trim() && insights.length === 0) {
         usedIds.add(anchor.id); // Mark it as used so it doesn't get picked up as an orphan
         return; 
      }
      
      const group = [anchor, ...insights];
      result.push(group);
      group.forEach(b => usedIds.add(b.id));
    });

    // 3. Catch any orphaned blocks that weren't linked to an anchor
    // We only want to show anchors or real mapped insights. 
    // If it's a completed insight but has no parent, we can show it as its own step or not?
    // Let's show all unused blocks EXCEPT pending insights which belong in the inbox.
    const orphans = blocks.filter(b => !usedIds.has(b.id) && b.content?.trim() && b.metadata?.insightStatus !== 'PENDING');
    orphans.forEach(o => result.push([o]));

    return result;
  }, [blocks]);

  const handleNext = () => {
    if (activeGroupIndex < groupedBlocks.length - 1) setActiveGroupIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (activeGroupIndex > 0) setActiveGroupIndex(prev => prev - 1);
  };

  const activeGroupBlocks = (groupedBlocks[activeGroupIndex] || []) as any[];
  const activeBlock = activeGroupBlocks[0] || null; // The "head" block of the group (depth 0)
  
  // Context info based on group
  const contextParent = activeBlock?.metadata?.depth > 0 ? activeBlock : null; 

  const activeVerseId = activeBlock?.metadata?.parentVerseId || activeBlock?.metadata?.reference?.split(':')[1];
  const activeSourceId = activeBlock?.metadata?.bibleSourceId;
  const activeSource = sermonMeta?.bibleSources?.find((s: any) => s.id === activeSourceId) || (sermonMeta?.bibleSources?.[0]);

  const finalSource = activeSource || { reference: activeBlock?.metadata?.reference, content: '' };
  const finalVerseId = activeVerseId || 'ALL';

  const jumpToGroup = (idx: number) => {
    const block = blocks[idx];
    // Find which group this block belongs to
    const groupIdx = groupedBlocks.findIndex(group => group.some(b => b.id === block.id));
    if (groupIdx !== -1) setActiveGroupIndex(groupIdx);
  };



  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin" />
        <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40">Preparando Altar...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground flex overflow-hidden font-sans selection:bg-brand-gold/30">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            className="w-[400px] h-full border-r border-border bg-surface/50 backdrop-blur-3xl z-40 flex flex-col shadow-2xl"
          >


            <div className="flex border-b border-border bg-foreground/[0.02]">
              <button 
                onClick={() => setSidebarTab('BIBLIA')}
                className={cn(
                  "flex-1 py-4 text-[11px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2",
                  sidebarTab === 'BIBLIA' ? "text-brand-red bg-foreground/5 shadow-[inset_0_-2px_0_var(--color-brand-red)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Book className="w-3.5 h-3.5" /> Bíblia
              </button>
              <button 
                onClick={() => setSidebarTab('ESTRUTURA')}
                className={cn(
                  "flex-1 py-4 text-[11px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2",
                  sidebarTab === 'ESTRUTURA' ? "text-brand-red bg-foreground/5 shadow-[inset_0_-2px_0_var(--color-brand-red)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Mapa
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {sidebarTab === 'BIBLIA' ? (
                <div className="p-5 flex flex-col gap-6">
                  {(sermonMeta?.bibleSources || []).map((source: any) => (
                    <div key={source.id} className="flex flex-col gap-3">
                       <div className="flex items-center gap-2">
                         <div className="h-px flex-1 bg-border/40" />
                         <div className="text-[14px] font-black uppercase tracking-[0.2em] text-brand-gold">{source.reference || 'Texto'}</div>
                         <div className="h-px flex-1 bg-border/40" />
                       </div>
                       <div className="flex flex-col gap-1.5">
                         {parseBibleContent(source.content).map(v => (
                           <div
                             key={`${source.id}-${v.v}`}
                             className={cn(
                               "py-2.5 px-3 rounded-lg transition-all flex items-start gap-3 group",
                               (String(v.v) === activeVerseId && source.id === activeSourceId)
                                ? "bg-foreground text-background shadow-lg" 
                                : "text-foreground/80 hover:bg-foreground/5 border border-transparent hover:border-border"
                             )}
                           >
                             <span className={cn("text-[18px] font-mono font-medium mt-0.5", (String(v.v) === activeVerseId && source.id === activeSourceId) ? "opacity-100" : "opacity-20")}>{v.v}</span>
                             <span className="text-[21px] leading-relaxed font-sans">{v.text}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                  {(!sermonMeta?.bibleSources || sermonMeta.bibleSources.length === 0) && (
                    <div className="py-20 text-center opacity-20 text-[16px] font-black tracking-widest uppercase italic">Nenhum texto bíblico importado</div>
                  )}
                </div>
              ) : (
                <div className="p-5 flex flex-col gap-4 relative">
                  {/* Clean Vertical Timeline */}
                  <div className="absolute left-[38px] top-12 bottom-12 w-px bg-border/40 -z-0" />

                  {groupedBlocks.map((group, gIdx) => {
                    const isActive = activeGroupIndex === gIdx;
                    const isPast = activeGroupIndex > gIdx;
                    const rootBlock = group[0];
                    const insights = group.slice(1);
                    
                    return (
                      <div key={gIdx} className="flex flex-col gap-1.5">
                        {/* Unit Step */}
                        <div 
                          onClick={() => { setActiveGroupIndex(gIdx); }}
                          className={cn(
                            "relative flex items-center gap-4 py-3 transition-all cursor-pointer group rounded-2xl px-3",
                            isActive ? "bg-surface shadow-xl border border-border/60" : "hover:bg-foreground/5",
                            !isActive && isPast ? "opacity-40" : ""
                          )}
                        >

                          {/* Minimalist Marker */}
                          <div className="relative z-10 flex flex-col items-center shrink-0 w-6">
                            <div className={cn(
                              "w-7 h-7 transition-all duration-300 flex items-center justify-center rounded-full border-[2px]",
                              isActive ? "bg-brand-red border-brand-red shadow-[0_0_15px_rgba(114,47,39,0.3)] text-white scale-110" : 
                              isPast ? "bg-border border-border text-foreground/40" : "bg-surface border-border/40 text-foreground/20"
                            )}>
                               {isPast ? (
                                 <CheckCircle2 className="w-4 h-4" />
                               ) : (
                                  <span className="font-sans font-black text-[12px]">
                                    {gIdx + 1}
                                  </span>
                               )}
                            </div>
                          </div>

                          {/* Info Block */}
                          <div className="flex-1 flex flex-col min-w-0 pr-1">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                               <span className={cn(
                                 "text-[9px] font-black uppercase tracking-[0.2em]", 
                                 isActive ? "text-brand-gold" : "text-muted-foreground/40"
                               )}>
                                 {rootBlock.metadata?.customLabel || (CATEGORY_MAP[rootBlock.type] || CATEGORY_MAP.CUSTOMIZAR)?.label.split(' / ')[0]}
                               </span>
                               {rootBlock.metadata?.reference && (
                                 <span className={cn(
                                   "text-[8px] font-mono font-black uppercase tracking-[0.05em] shrink-0",
                                   isActive ? "text-brand-gold/60" : "opacity-30"
                                 )}>
                                   {rootBlock.metadata.reference.split(' (')[0]}
                                 </span>
                               )}
                            </div>
                            <p className={cn(
                               "text-[14px] font-medium leading-[1.3] truncate transition-all",
                               isActive ? "text-foreground" : "text-foreground/60"
                             )}>
                              {rootBlock.content}
                            </p>
                          </div>
                        </div>

                        {/* Insights List */}
                        {group.slice(1).length > 0 && (
                          <div className={cn(
                            "flex flex-col gap-1.5 ml-[42px] pl-4 border-l-2 my-1",
                            isActive ? "border-brand-gold/20" : "border-border/20"
                          )}>
                             {group.slice(1).map((insight: any) => {
                               const iCat = (CATEGORY_MAP[insight.type] || CATEGORY_MAP.CUSTOMIZAR) as any;
                               return (
                                 <div key={insight.id} className="flex items-start gap-2.5 py-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="w-5 h-5 rounded flex flex-shrink-0 items-center justify-center border border-border/30 bg-surface shadow-sm" style={{ color: insight.metadata?.customColor || iCat.color }}>
                                       {React.cloneElement(iCat.icon as React.ReactElement<any>, { className: "w-3 h-3 stroke-[2.5px]" })}
                                    </div>
                                    <span className="text-[13px] font-medium text-foreground/80 leading-[1.4] line-clamp-2 mt-0.5" style={{ color: insight.metadata?.customColor ? insight.metadata.customColor : undefined }}>
                                        {insight.content}
                                    </span>
                                 </div>
                               );
                             })}
                          </div>
                        )}

                      </div>
                    );
                  })}
                  
                  {groupedBlocks.length === 0 && (
                     <div className="py-20 text-center flex flex-col items-center gap-4 px-10">
                        <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center">
                          <Layout className="w-6 h-6 opacity-20" />
                        </div>
                        <p className="text-[10px] font-black tracking-widest uppercase opacity-20">Trilha de estudo vazia</p>
                     </div>
                  )}
                </div>
              )}
            </div>

          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative h-full">
        {/* NAV/HUD PULPITO - PREMIUM WORKBENCH */}
        {/* STAGE HEADER - MINIMALIST & FOCUSED */}
        <header className="h-28 px-16 flex items-center justify-between shrink-0 z-[60] relative">
          <div className="flex items-center gap-8 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all border shadow-2xl active:scale-95 z-[70]",
                isSidebarOpen ? "bg-brand-red text-white border-brand-gold shadow-brand-gold/20" : "glass border-white/5 text-foreground/40 hover:text-foreground hover:border-white/20"
              )}
            >
              <Layout className="w-6 h-6" />
            </button>

            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="text-xl font-sans font-black italic tracking-tight line-clamp-1 max-w-xl text-foreground/90">
                {sermonMeta?.title || 'Mensagem'}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Ao Vivo</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20 text-foreground">{sermonMeta?.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-10">


            <div onClick={() => onMinimize?.()} className="flex items-center gap-3 cursor-pointer group px-5 py-2.5 rounded-full glass border-white/5 hover:border-brand-gold/40 hover:text-brand-gold transition-all opacity-40 hover:opacity-100 bg-surface">
              <Minimize2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Minimizar</span>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                 <span className={cn(
                   "text-5xl font-mono font-black tabular-nums leading-none tracking-tighter transition-colors",
                   timeLeft <= 60 ? "text-red-500 animate-pulse" : timeLeft <= 180 ? "text-amber-500" : "text-foreground"
                 )}>
                   {formatTime(timeLeft)}
                 </span>
                 <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 mt-1">Cronômetro</span>
              </div>

              <button 
                onClick={async () => {
                  await handleSave();
                  localStorage.removeItem(`preachfy_pulpit_end_${sermonId}`);
                  localStorage.removeItem(`preachfy_study_backup_${sermonId}`);
                  onExit();
                }}
                className="group flex items-center gap-3 px-6 h-16 rounded-full glass border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95"
                title="Encerrar Púlpito"
              >
                <div className="flex flex-col items-end mr-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 opacity-60 group-hover:opacity-100 transition-opacity">Encerrar</span>
                  <span className="text-[8px] font-mono opacity-20 uppercase">Sessão</span>
                </div>
                <LogOut className="w-5 h-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN CANVAS - THE PREACHING VIEW */}
        <div className="flex-1 relative flex flex-col overflow-y-auto custom-scrollbar-premium" {...bind()}>
          {/* Background capture for swipe is now on the whole container */}
          
          <div className="flex-1 flex flex-col items-center justify-center transition-all duration-500 pb-48">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={activeGroupIndex}
                 initial={{ y: 40, opacity: 0 }}
                 animate={{ 
                   y: 0, 
                   opacity: 1,
                   scale: 1,
                   filter: 'blur(0px)'
                 }}
                 exit={{ y: -20, opacity: 0 }}
                 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                 className="max-w-7xl w-full flex flex-col items-center gap-12 text-center z-10 origin-center"
               >
                 <div className="max-w-[1700px] w-full z-10 relative px-12">
                    <div className="flex flex-col lg:flex-row gap-16 items-stretch relative">
                      
                      {/* NEURAL BRIDGE - Solid horizontal connection with glow */}
                      <div className="absolute left-[400px] top-1/2 -translate-y-1/2 w-16 h-1.5 bg-gradient-to-r from-brand-gold/80 to-brand-gold/40 -z-10 hidden lg:block shadow-[0_0_20px_rgba(176,141,87,0.4)] rounded-full" />

                      {/* COLUMN 1: THE ANCHOR (TEXTO BASE) */}
                      {activeGroupBlocks[0] && activeGroupBlocks[0].content?.trim() !== '' && (() => {
                        const b = activeGroupBlocks[0];
                        const bCat = (CATEGORY_MAP[b.type] || CATEGORY_MAP.CUSTOMIZAR) as { label: string, color: string, icon: React.ReactNode };
                        return (
                          <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-full lg:w-[400px] shrink-0"
                          >
                            <div 
                              className={cn(
                                "h-full flex flex-col gap-6 p-10 rounded-[1.5rem] bg-surface text-foreground border border-border/20 shadow-2xl relative group/anchor transition-all duration-700 hover:shadow-brand-gold/5 overflow-hidden"
                              )}
                            >
                                 <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-[1.5rem]" style={{ backgroundColor: b.metadata?.color || 'var(--color-brand-red)' }} />
                                 
                                 <div className="flex items-center justify-between relative z-10 mb-2">
                                   <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold shadow-sm transition-all group-hover/anchor:scale-110 group-hover/anchor:bg-brand-gold group-hover/anchor:text-white">
                                       {React.cloneElement(bCat.icon as React.ReactElement<any>, { className: "w-6 h-6 stroke-[2.5px]" })}
                                     </div>
                                     <div className="flex flex-col text-left mb-1">
                                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/30">
                                          {(b.metadata?.customLabel || 'Texto Base').toUpperCase()}
                                        </span>
                                        {b.metadata?.reference && (
                                          <span className="text-[8px] font-black tracking-widest uppercase text-brand-gold opacity-0 group-hover/anchor:opacity-100 transition-opacity absolute -bottom-3"></span>
                                        )}
                                     </div>
                                   </div>
                                   {b.metadata?.reference && (
                                      <div className="flex items-center gap-2 px-5 py-2 rounded-full font-mono font-black text-[12px] border border-border/40 bg-foreground/5 text-foreground/60 transition-all">
                                        <Book className="w-3.5 h-3.5 opacity-80 shrink-0" />
                                        {b.metadata.reference.split(' (')[0]}
                                      </div>
                                   )}
                                 </div>
                                 <div className="flex-1 flex flex-col justify-center">
                                   <p className="text-[34px] font-sans font-medium tracking-tight leading-[1.2] text-left text-foreground">
                                     {b.content}
                                   </p>
                                 </div>
                              </div>
                          </motion.div>
                        );
                      })()}

                      {/* COLUMN 2: THE DERIVATIVES (MASONRY INSIGHTS) */}
                      <div className="flex-1 relative pl-6">
                        {activeGroupBlocks.length > 1 ? (
                          <>
                            {/* THE NEURAL STEM - Refined continuous backbone */}
                            <div className="absolute left-0 top-12 bottom-12 w-1.5 bg-gradient-to-b from-transparent via-brand-gold/60 to-transparent rounded-full hidden lg:block shadow-[0_0_20px_rgba(176,141,87,0.3)]" />
                            
                            <div className="flex flex-col gap-6 w-full">
                              {activeGroupBlocks.slice(1).map((b: any, subIdx: number) => {
                                const bCat = (CATEGORY_MAP[b.type] || CATEGORY_MAP.CUSTOMIZAR) as { label: string, color: string, icon: React.ReactNode };
                                
                                return (
                                  <motion.div
                                    key={b.id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 + (subIdx * 0.05), type: 'spring', damping: 25 }}
                                    className="break-inside-avoid relative pl-10 pb-2"
                                  >
                                     {/* Synapse Connection - Solid link with node */}
                                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-1 bg-brand-gold/40 hidden lg:block rounded-full">
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-gold rounded-full blur-[1px]" />
                                     </div>

                                     <div 
                                        style={{ backgroundColor: b.metadata?.color ? `${b.metadata.color}08` : 'var(--bg-surface)' }}
                                        className="flex flex-col gap-4 p-6 rounded-[1.2rem] bg-surface border border-border/20 shadow-xl transition-all duration-700 relative group/subcard hover:-translate-y-1 hover:shadow-brand-gold/5"
                                      >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.2rem]" style={{ backgroundColor: b.metadata?.color || '#e2e8f0' }} />
 
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-border/20 flex items-center justify-center transition-all group-hover/subcard:bg-surface shadow-sm" style={{ color: b.metadata?.customColor || bCat.color }}>
                                                {React.cloneElement(bCat.icon as React.ReactElement<any>, { className: "w-4 h-4 stroke-[2.5px]" })}
                                             </div>
                                             <div className="flex flex-col">
                                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 italic">
                                                    {(b.metadata?.customLabel || (CATEGORY_MAP[b.type] as any)?.label || b.type).toUpperCase()}
                                                 </span>
                                             </div>
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                           {b.type === 'SIGNIFICADO' ? (
                                              <div className="flex flex-col gap-4">
                                                <div className="p-6 rounded-3xl bg-brand-gold/5 border border-brand-gold/20">
                                                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-gold/40 block mb-2">Exegese da Palavra</span>
                                                  <p className="text-[32px] font-sans font-black italic text-foreground tracking-tight">
                                                     {b.content.split('\n')[0].replace('Palavra: ', '')}
                                                  </p>
                                                </div>
                                                <p className="text-[22px] font-sans font-medium text-foreground tracking-tight leading-[1.4] text-left opacity-80 whitespace-pre-wrap">
                                                   {b.content.split('\n').slice(1).join('\n').replace('Significado: ', '')}
                                                </p>
                                              </div>
                                            ) : (
                                              <p className="text-[20px] font-sans font-medium text-foreground tracking-tight leading-[1.4] text-left">
                                                {b.content}
                                              </p>
                                            )}
                                         </div>
                                      </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="h-full min-h-[400px] ml-4 rounded-[3.5rem] border-[3px] border-dashed border-border/40 flex flex-col items-center justify-center gap-6 opacity-30 group hover:opacity-60 transition-opacity">
                             <div className="w-24 h-24 rounded-full bg-brand-gold/5 border-2 border-brand-gold/10 flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
                                <Compass className="w-10 h-10 text-brand-gold" />
                             </div>
                             <p className="text-[14px] font-black uppercase tracking-[0.6em] text-center text-brand-gold/60 leading-loose">
                                Nenhum Apontamento<br/>
                                <span className="text-[10px] tracking-[0.3em] font-medium text-muted-foreground">Adicione desdobramentos no Studio</span>
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
               </motion.div>
            </AnimatePresence>
          </div>



          {/* PULPIT NAVIGATION RIBBON - REDESIGNED */}
          <div className={cn(
            "fixed bottom-8 left-0 right-0 flex justify-center z-50 transition-all duration-500 pointer-events-none",
            isSidebarOpen ? "ml-[400px]" : "ml-0"
          )}>
            <div className="w-full max-w-5xl px-12 pointer-events-auto">
              <div className="relative group shadow-[0_30px_60px_rgba(0,0,0,0.08)] rounded-[2.5rem] bg-surface/90 backdrop-blur-3xl border border-border overflow-hidden">
                <div className="relative flex items-center h-[7.5rem] px-10 gap-8">
                  {/* Anterior */}
                  <button 
                    onClick={handlePrev}
                    disabled={activeGroupIndex === 0}
                    className="flex-[1.8] flex flex-col items-start gap-1 group/btn disabled:opacity-0 transition-all duration-500 cursor-pointer text-left w-full overflow-hidden"
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-500 flex items-center gap-3">
                      <span className="flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5 group-hover/btn:-translate-x-1 transition-transform" /> ANTERIOR</span>
                      {groupedBlocks[activeGroupIndex - 1]?.[0] && (
                        <>
                          <span className="opacity-30">•</span>
                          <span className="text-foreground/40 font-black">
                             {groupedBlocks[activeGroupIndex - 1]?.[0]?.metadata?.customLabel || (CATEGORY_MAP as any)[groupedBlocks[activeGroupIndex - 1]?.[0]?.type || '']?.label.split(' ')[0]}
                          </span>
                        </>
                      )}
                    </span>
                    <p className="text-[14px] leading-tight font-sans mt-0.5 max-w-[95%] font-black italic line-clamp-1 opacity-25 group-hover/btn:opacity-60 transition-opacity">
                      {groupedBlocks[activeGroupIndex - 1]?.[0]?.content || 'Início'}
                    </p>
                  </button>

                  {/* Central Step Indicator */}
                  <div className="flex flex-col items-center justify-center px-6 shrink-0 border-x border-border/40">
                    <div className="text-[2.2rem] font-sans font-black tracking-tighter tabular-nums text-foreground leading-none flex items-baseline">
                      {activeGroupIndex + 1}
                      <span className="text-lg opacity-20 ml-1 font-medium">/{groupedBlocks.length}</span>
                    </div>
                    <div className="w-8 h-0.5 bg-indigo-500 mt-2 rounded-full" />
                  </div>

                  {/* Próximo */}
                  <button 
                    onClick={handleNext}
                    disabled={activeGroupIndex === groupedBlocks.length - 1}
                    className="flex-[1.8] flex flex-col items-end gap-1 group/btn disabled:opacity-0 transition-all duration-500 cursor-pointer text-right w-full overflow-hidden"
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-500 flex items-center gap-3">
                      {groupedBlocks[activeGroupIndex + 1]?.[0] && (
                        <>
                          <span className="text-foreground/40 font-black">
                             {groupedBlocks[activeGroupIndex + 1]?.[0]?.metadata?.customLabel || (CATEGORY_MAP as any)[groupedBlocks[activeGroupIndex + 1]?.[0]?.type || '']?.label.split(' ')[0]}
                          </span>
                          <span className="opacity-30">•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1.5">PRÓXIMO <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" /></span>
                    </span>
                    <p className="text-[16px] leading-tight font-sans mt-0.5 max-w-[95%] font-black italic transition-colors line-clamp-1">
                      {groupedBlocks[activeGroupIndex + 1]?.[0]?.content || 'Conclusão'}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PROGRESS RIBBON */}
          <div className="h-1 bg-border relative overflow-hidden shrink-0">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${((activeGroupIndex + 1) / groupedBlocks.length) * 100}%` }}
            />
          </div>
        </div>
      </main>




    </div>
  );
}
