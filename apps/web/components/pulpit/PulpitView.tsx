"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Clock, Search, Book, Sidebar, ChevronRight, X, 
  Maximize2, Minimize2, ArrowLeft, ArrowRight, MoreVertical, 
  LayoutGrid, Zap, Sparkles, GripVertical, CheckCircle2,
  Quote, CornerDownRight, LinkIcon, Trash2, Layout, LogOut, Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { useGesture } from '@use-gesture/react';
import { BookOpen, HelpCircle, Target, Lightbulb, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PulpitViewProps {
  sermonId: string;
  targetTime: number; // minutes
  onExit: () => void;
  onStudy?: () => void;
}

// Perspectiva Teológica - Must match SermonCanvas
const CATEGORY_MAP: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  TEXTO_BASE: { label: 'Texto Base', color: 'var(--color-texto)', icon: <BookOpen className="w-4 h-4" /> },
  EXEGESE: { label: 'Exegese', color: 'var(--color-exegese)', icon: <HelpCircle className="w-4 h-4" /> },
  APLICACAO: { label: 'Aplicação', color: 'var(--color-aplicacao)', icon: <Target className="w-4 h-4" /> },
  ILUSTRACAO: { label: 'Ilustração', color: 'var(--color-ilustracao)', icon: <Lightbulb className="w-4 h-4" /> },
  ENFASE: { label: 'Ênfase', color: 'var(--color-enfase)', icon: <AlertTriangle className="w-4 h-4" /> },
  CUSTOMIZAR: { label: 'Custom', color: 'var(--color-custom)', icon: <Sparkles className="w-4 h-4" /> }
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

export default function PulpitView({ sermonId, targetTime, onExit, onStudy }: PulpitViewProps) {
  const { data: session } = useSession();
  const { latestBlocks, latestMeta, isConnected, syncCanvas, syncMeta } = useSermonSocket(sermonId);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sermonMeta, setSermonMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'BIBLIA' | 'ESTRUTURA' | 'INSIGHTS'>('ESTRUTURA');
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(targetTime * 60);
  const [showContextPeek, setShowContextPeek] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'SERMON' | 'GLOBAL'>('SERMON');
  const [bibleResults, setBibleResults] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState('nvi');
  const [isBibleSearching, setIsBibleSearching] = useState(false);


  // Refs for auto-scroll
  const hudScrollRef = useRef<HTMLDivElement>(null);
  const contextScrollRef = useRef<HTMLDivElement>(null);
  const activeVerseRef = useRef<HTMLDivElement>(null);

  const handleGlobalSearch = async (query: string) => {
    if (query.length < 3) {
      setBibleResults([]);
      return;
    }
    setIsBibleSearching(true);
    const { environment } = require('@/environments');
    try {
      const res = await fetch(`${environment.apiUrl}/bible/search?version=${selectedVersion}&text=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setBibleResults([]);
        return;
      }
      const data = await res.json();
      setBibleResults(data.verses || []);
    } catch (e) {
      console.error("Bible search error", e);
      setBibleResults([]);
    } finally {
      setIsBibleSearching(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'GLOBAL' && searchQuery.length > 2) {
      const timer = setTimeout(() => handleGlobalSearch(searchQuery), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchMode, selectedVersion]);
  
  const saveInsight = (verse: any, source: any) => {
    const reference = `${source?.reference?.split(' (')[0]}:${verse.v}`;
    
    // Create a persistent block instead of just local state
    const newBlock = {
      id: `insight-${Date.now()}`,
      type: 'CUSTOMIZAR',
      content: `${verse.text}`,
      order: blocks.length,
      metadata: {
        customLabel: 'NOVA REVELAÇÃO',
        customColor: 'var(--color-aplicacao)',
        reference: reference,
        verseText: verse.text,
        isInsight: true,
        insightStatus: 'PENDING' // PENDING or COMPLETED
      }
    };

    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    syncCanvas(updatedBlocks as any);

    setShowToast(`Revelação Guardada: ${reference}`);
    setIsSidebarOpen(true);
    setSidebarTab('INSIGHTS');
    setTimeout(() => setShowToast(null), 3000);
  };
  
  const handleUpdateInsight = (blockId: string, newRevelation: string, finalize = false) => {
    const updatedBlocks = blocks.map(b => b.id === blockId ? {
      ...b,
      content: newRevelation || b.content,
      metadata: {
        ...b.metadata,
        revelation: newRevelation,
        insightStatus: finalize ? 'COMPLETED' : 'PENDING'
      }
    } : b);
    
    setBlocks(updatedBlocks);
    syncCanvas(updatedBlocks as any);
    if (finalize) setShowToast("Insight integrado ao Estudo!");
  };

  const saveGlobalInsight = async (verse: any) => {
    if (!session?.user?.id) {
       setShowToast("Erro: Sessão não encontrada");
       setTimeout(() => setShowToast(null), 3000);
       return;
    }
    
    const bookName = verse.book?.name || verse.book_name;
    const chap = verse.chapter;
    const num = verse.number || verse.verse;
    const globalRef = `${bookName} ${chap}:${num}`;

    try {
      const { environment } = require('@/environments');
      await fetch(`${environment.apiUrl}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          reference: globalRef,
          verseText: verse.text,
        })
      });
      setShowToast(`Devocional Global Salvo!`);
      setTimeout(() => setShowToast(null), 3000);
    } catch (e) {
      console.error(e);
      setShowToast(`Erro ao salvar insight.`);
      setTimeout(() => setShowToast(null), 3000);
    }
  };
  
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

  useEffect(() => {
    if (sermonMeta?.bibleVersion) {
      setSelectedVersion(sermonMeta.bibleVersion);
    }
  }, [sermonMeta?.bibleVersion]);

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
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const groupedBlocks = blocks.reduce((acc: any[][], block: any) => {
    // FORCE every TEXTO_BASE to start a new group, or anything with depth 0
    if (acc.length === 0 || block.type === 'TEXTO_BASE' || block.metadata?.depth === 0) {
      acc.push([block]);
    } else {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup) lastGroup.push(block);
    }
    return acc;
  }, []);

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

  const activeVerseId = activeBlock?.metadata?.parentVerseId;
  const activeSourceId = activeBlock?.metadata?.bibleSourceId;
  const activeSource = sermonMeta?.bibleSources?.find((s: any) => s.id === activeSourceId) || (sermonMeta?.bibleSources?.[0]);

  const finalSource = activeSource;
  const finalVerseId = activeVerseId;

  const jumpToGroup = (idx: number) => {
    const block = blocks[idx];
    // Find which group this block belongs to
    const groupIdx = groupedBlocks.findIndex(group => group.some(b => b.id === block.id));
    if (groupIdx !== -1) setActiveGroupIndex(groupIdx);
  };

  const [fullChapterVerses, setFullChapterVerses] = useState<{ v: number; text: string }[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    if (!showContextPeek || !finalSource?.reference) {
      setFullChapterVerses([]);
      return;
    }

    const loadContext = async () => {
      setIsLoadingContext(true);
      
      // 1. ESTRATÉGIA DE ALTA VELOCIDADE: Verificar se o conteúdo local já é o capítulo completo
      // Se salvamos via "Gerar Estudo", o conteúdo já virá com o capítulo todo.
      if (finalSource.reference.includes('(Completo)') && finalSource.content) {
        const localVerses = parseBibleContent(finalSource.content);
        if (localVerses.length > 5) { // Heurística: se tem mais de 5 versos, provavelmente é o capítulo todo
          setFullChapterVerses(localVerses);
          setIsLoadingContext(false);
          return;
        }
      }

      // 2. ESTRATÉGIA DE API: Buscar o capítulo limpo
      try {
        const { environment } = require('@/environments');
        
        // Regex robusto: Extrai apenas Livro e Capítulo, ignorando versículos e outros sufixos
        // Ex: "1 Samuel 17:45:45 (Completo)" -> "1 Samuel 17"
        // Ex: "João 3:16" -> "João 3"
        const refParts = finalSource.reference.match(/^([1-3]?\s?[a-zA-Z\u00C0-\u00FF\s]+)\s(\d+)/);
        const bookAndChapter = refParts ? `${refParts[1].trim()} ${refParts[2]}` : null;
        
        if (bookAndChapter) {
          const res = await fetch(`${environment.apiUrl}/bible/search?version=${selectedVersion}&text=${encodeURIComponent(bookAndChapter)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.verses && data.verses.length > 0) {
              setFullChapterVerses(data.verses.map((v: any) => ({ v: v.number, text: v.text })));
              setIsLoadingContext(false);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Critical failure loading chapter context", e);
      }

      // 3. FALLBACK: Usar o que tivermos disponível
      setFullChapterVerses(parseBibleContent(finalSource.content));
      setIsLoadingContext(false);
    };

    loadContext();
  }, [showContextPeek, finalSource, selectedVersion]);

  // Effect for Context Peek Auto-scroll
  useEffect(() => {
    if (showContextPeek && !isLoadingContext && fullChapterVerses.length > 0) {
      const activeEl = activeVerseRef.current;
      if (activeEl) {
        // Aumentamos o delay para garantir que o DOM renderizou a lista inteira
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      }
    }
  }, [showContextPeek, finalVerseId, isLoadingContext, fullChapterVerses.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40">Preparando Altar...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground flex overflow-hidden font-sans selection:bg-indigo-500/30">
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
                  "flex-1 py-4 text-[16px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3",
                  sidebarTab === 'BIBLIA' ? "text-foreground bg-foreground/5 shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Book className="w-4 h-4" /> Bíblia
              </button>
              <button 
                onClick={() => setSidebarTab('ESTRUTURA')}
                className={cn(
                  "flex-1 py-4 text-[13px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2",
                  sidebarTab === 'ESTRUTURA' ? "text-foreground bg-foreground/5 shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Mapa
              </button>
              <button 
                onClick={() => setSidebarTab('INSIGHTS')}
                className={cn(
                  "flex-1 py-4 text-[13px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2",
                  sidebarTab === 'INSIGHTS' ? "text-foreground bg-foreground/5 shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Insights</span>
                {blocks.filter(b => b.metadata?.isInsight && b.metadata?.insightStatus !== 'COMPLETED').length > 0 && (
                  <span className="flex items-center justify-center bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] shadow-lg shadow-indigo-500/20">
                    {blocks.filter(b => b.metadata?.isInsight && b.metadata?.insightStatus !== 'COMPLETED').length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {sidebarTab === 'BIBLIA' ? (
                <div className="p-5 flex flex-col gap-6">
                  {(sermonMeta?.bibleSources || []).map((source: any) => (
                    <div key={source.id} className="flex flex-col gap-3">
                       <div className="flex items-center gap-2">
                         <div className="h-px flex-1 bg-border/40" />
                         <div className="text-[14px] font-black uppercase tracking-[0.2em] text-indigo-500">{source.reference || 'Texto'}</div>
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
                             <span className="text-[21px] leading-relaxed font-serif">{v.text}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                  {(!sermonMeta?.bibleSources || sermonMeta.bibleSources.length === 0) && (
                    <div className="py-20 text-center opacity-20 text-[16px] font-black tracking-widest uppercase italic">Nenhum texto bíblico importado</div>
                  )}
                </div>
              ) : sidebarTab === 'ESTRUTURA' ? (
                <div className="p-5 flex flex-col gap-4 relative">
                  {/* Tactical Roadmap Track */}
                  <div className="absolute left-[2.1rem] top-12 bottom-12 w-0.5 bg-gradient-to-b from-indigo-500/30 via-indigo-500/10 to-transparent rounded-full -z-0" />

                  
                  {groupedBlocks.map((group, gIdx) => {
                    const isActive = activeGroupIndex === gIdx;
                    const isPast = activeGroupIndex > gIdx;
                    const rootBlock = group[0];
                    const insights = group.slice(1);
                    
                    const category = (CATEGORY_MAP[rootBlock.type] || CATEGORY_MAP.CUSTOMIZAR) as { label: string, color: string, icon: React.ReactNode };

                    return (
                      <div key={gIdx} className="flex flex-col gap-1.5">
                        {/* Unit Step */}
                        <div 
                          onClick={() => { setActiveGroupIndex(gIdx); }}
                          className={cn(
                            "relative flex items-center gap-4 py-1 transition-all cursor-pointer group pr-2",
                            isActive ? "opacity-100 scale-[1.02] origin-left z-10" : isPast ? "opacity-50" : "opacity-30 hover:opacity-100"
                          )}
                        >

                          {/* Tactical Marker - Diamond for Units */}
                          <div className="relative z-10 flex flex-col items-center shrink-0">
                            <div className={cn(
                              "w-10 h-10 transition-all duration-500 flex items-center justify-center rounded-xl rotate-45 border-2",
                              isActive ? "bg-indigo-600 border-indigo-400 shadow-[0_0_30px_rgba(79,70,229,0.8)] scale-125 z-20" : 
                              isPast ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-500" : "bg-surface border-border"
                            )}>
                               <div className="-rotate-45">
                                 {isPast ? (
                                   <CheckCircle2 className="w-5 h-5 stroke-[3px]" />
                                 ) : (
                                    <span className={cn(
                                      "font-mono font-black text-[15px]",
                                      isActive ? "text-white scale-110" : "text-muted-foreground"
                                    )}>
                                      {gIdx + 1}
                                    </span>
                                 )}
                               </div>
                            </div>
                            {isActive && <div className="absolute inset-0 bg-indigo-500/40 blur-2xl rounded-full scale-150 -z-10 animate-pulse" />}
                          </div>

          
                          {/* Info Block */}
                          <div className={cn(
                            "flex-1 flex flex-col gap-0.5 p-2.5 rounded-2xl transition-all duration-300 border ml-1",
                            isActive ? "bg-indigo-500/10 border-indigo-500/30 shadow-2xl backdrop-blur-md ring-1 ring-white/10" : "bg-transparent border-transparent"
                          )}>
                            <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-2">
                                 <span className={cn(
                                   "text-[9px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-md", 
                                   isActive ? "bg-indigo-500 text-white" : "text-muted-foreground/30"
                                 )}>
                                   {rootBlock.metadata?.customLabel || (rootBlock.type === 'TEXTO_BASE' ? 'TEXTO' : rootBlock.type.substring(0, 3))}
                                 </span>
                               </div>
                               {rootBlock.metadata?.reference && (
                                 <span className={cn(
                                   "text-[8.5px] font-mono font-black uppercase tracking-[0.1em] shrink-0",
                                   isActive ? "opacity-60 text-indigo-400" : "opacity-20"
                                 )}>
                                   {rootBlock.metadata.reference.split(' (')[0]}
                                 </span>
                               )}
                            </div>
                             <p className={cn(
                               "text-[15px] font-medium leading-tight line-clamp-1 transition-all",
                               isActive ? "text-foreground" : "text-foreground/40"
                             )}>
                              {rootBlock.content}
                            </p>
                          </div>
                        </div>


                        {/* Insights List (Nested markers) */}
                        {insights.length > 0 && (
                          <div className="flex flex-col gap-1.5 ml-3 border-l-2 border-indigo-500/10 pl-8 my-0.5">
                             {insights.map((insight: any) => {
                               const iCat = (CATEGORY_MAP[insight.type] || CATEGORY_MAP.CUSTOMIZAR) as any;
                               return (
                                 <div key={insight.id} className="flex items-center gap-3 py-1 opacity-40 hover:opacity-100 transition-opacity group/sub">
                                    <div className="w-4 h-4 rounded-md border border-border flex items-center justify-center bg-surface group-hover/sub:border-indigo-500/30 shrink-0">
                                       {React.cloneElement(iCat.icon as React.ReactElement<any>, { className: "w-2.5 h-2.5 stroke-[2.5px] opacity-40" })}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                       <span className="text-[11px] font-medium text-foreground/40 group-hover/sub:text-foreground transition-colors italic truncate">
                                          {insight.content}
                                       </span>
                                    </div>
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
              ) : (
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-serif font-black italic text-foreground/90">Novas Revelações</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-60">Capturadas durante o Altar</p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {blocks.filter(b => b.metadata?.isInsight).reverse().map((block, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={block.id} 
                        className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col gap-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-500/10 px-2 py-0.5 rounded">
                            {block.metadata?.reference}
                          </span>
                          {block.metadata?.insightStatus === 'PENDING' ? (
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 animate-pulse">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                              <Layout className="w-3 h-3" /> No Estudo
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <p className="text-[15px] font-sans leading-relaxed text-foreground opacity-60 line-clamp-2">
                             "{block.metadata.verseText}"
                          </p>
                          
                          <div className="flex flex-col gap-3">
                            <textarea
                              placeholder="Digite aqui a revelação recebida..."
                              value={block.metadata.revelation || ''}
                              onChange={(e) => handleUpdateInsight(block.id, e.target.value)}
                              className="w-full bg-foreground/[0.03] border border-border rounded-xl p-3 text-sm font-sans text-foreground outline-none focus:border-indigo-500/30 transition-all min-h-[80px] resize-none"
                            />
                            
                            <button 
                              onClick={() => handleUpdateInsight(block.id, block.metadata.revelation, true)}
                              disabled={block.metadata.insightStatus === 'COMPLETED'}
                              className={cn(
                                "w-full py-2.5 rounded-xl font-sans text-[10px] font-black uppercase tracking-widest transition-all select-none",
                                block.metadata.insightStatus === 'COMPLETED'
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 pointer-events-none" 
                                  : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
                              )}
                            >
                              {block.metadata.insightStatus === 'COMPLETED' ? "Enviado ao Estudo" : "Concluir e Inserir no Estudo"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {blocks.filter(b => b.metadata?.isInsight).length === 0 && (
                      <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                        <Sparkles className="w-8 h-8" />
                        <p className="text-[10px] font-black tracking-widest uppercase">Nenhum insight capturado ainda</p>
                      </div>
                    )}
                  </div>
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
                isSidebarOpen ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20" : "glass border-white/5 text-foreground/40 hover:text-foreground hover:border-white/20"
              )}
            >
              <Layout className="w-6 h-6" />
            </button>

            <div className="flex flex-col gap-1.5 min-w-0">
              <h2 className="text-xl font-serif font-black italic tracking-tight line-clamp-1 max-w-xl text-foreground/90">
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


            <div onClick={() => setIsHudOpen(true)} className="flex items-center gap-3 cursor-pointer group px-5 py-2.5 rounded-full glass border-white/5 hover:border-white/10 transition-all opacity-40 hover:opacity-100">
              <Search className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Busca</span>
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
                onClick={onExit}
                className="w-16 h-16 rounded-full glass border-white/5 flex items-center justify-center text-muted-foreground/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all active:scale-90 group"
                title="Encerrar Púlpito"
              >
                <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
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
                   y: showContextPeek ? -400 : 0, 
                   opacity: showContextPeek ? 0 : 1,
                   scale: showContextPeek ? 0.8 : 1,
                   filter: showContextPeek ? 'blur(30px)' : 'blur(0px)'
                 }}
                 exit={{ y: -20, opacity: 0 }}
                 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                 className="max-w-7xl w-full flex flex-col items-center gap-12 text-center z-10 origin-center"
               >
                 <div className="max-w-[1700px] w-full z-10 relative px-12">
                    <div className="flex flex-col lg:flex-row gap-16 items-stretch relative">
                      
                      {/* NEURAL BRIDGE - Solid horizontal connection with glow */}
                      <div className="absolute left-[400px] top-1/2 -translate-y-1/2 w-16 h-1.5 bg-gradient-to-r from-indigo-500/80 to-indigo-500/40 -z-10 hidden lg:block shadow-[0_0_20px_rgba(79,70,229,0.5)] rounded-full" />

                      {/* COLUMN 1: THE ANCHOR (TEXTO BASE) */}
                      {activeGroupBlocks[0] && (() => {
                        const b = activeGroupBlocks[0];
                        const bCat = (CATEGORY_MAP[b.type] || CATEGORY_MAP.CUSTOMIZAR) as { label: string, color: string, icon: React.ReactNode };
                        return (
                          <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-full lg:w-[400px] shrink-0"
                          >
                              <div className="h-full flex flex-col gap-6 p-10 rounded-[1.5rem] bg-white text-foreground border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_40px_-12px_rgba(0,0,0,0.08)] relative group/anchor transition-all duration-700 hover:shadow-[0_2px_10px_rgba(0,0,0,0.04),0_25px_50px_-12px_rgba(0,0,0,0.12)]">
                                 <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: b.metadata?.color || '#6366f1' }} />
                                 
                                 <div className="flex items-center justify-between relative z-10">
                                   <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm transition-all group-hover/anchor:scale-110">
                                       {React.cloneElement(bCat.icon as React.ReactElement<any>, { className: "w-6 h-6 stroke-[2.5px]" })}
                                     </div>
                                     <div className="flex flex-col text-left">
                                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/30">
                                          {(b.metadata?.customLabel || 'Texto Base').toUpperCase()}
                                        </span>
                                     </div>
                                   </div>
                                   {b.metadata?.reference && (
                                      <div className="flex items-center gap-2 px-5 py-2 rounded-full font-mono font-black text-[12px] border border-border bg-stone-50 text-foreground/60">
                                        <BookOpen className="w-3.5 h-3.5 opacity-50 shrink-0" />
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
                            <div className="absolute left-0 top-12 bottom-12 w-1.5 bg-gradient-to-b from-transparent via-indigo-500/60 to-transparent rounded-full hidden lg:block shadow-[0_0_20px_rgba(79,70,229,0.3)]" />
                            
                            <div className="columns-1 md:columns-2 gap-10 space-y-10 w-full">
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
                                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-1 bg-indigo-500/40 hidden lg:block rounded-full">
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full blur-[1px]" />
                                     </div>

                                     <div 
                                        style={{ backgroundColor: b.metadata?.color ? `${b.metadata.color}08` : 'white' }}
                                        className="flex flex-col gap-5 p-8 rounded-[1.2rem] bg-white border border-border/50 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_-8px_rgba(0,0,0,0.06)] transition-all duration-700 relative group/subcard hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_20px_40px_-12px_rgba(0,0,0,0.12)]"
                                      >
                                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: b.metadata?.color || '#e2e8f0' }} />
 
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-stone-50 border border-border/40 flex items-center justify-center transition-all group-hover/subcard:bg-white shadow-sm" style={{ color: b.metadata?.customColor || bCat.color }}>
                                                {React.cloneElement(bCat.icon as React.ReactElement<any>, { className: "w-4 h-4 stroke-[2.5px]" })}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/20 italic">
                                                   {(b.metadata?.customLabel || b.type.substring(0, 3)).toUpperCase()}
                                                </span>
                                             </div>
                                          </div>
                                          {b.metadata?.reference && (
                                             <span className="text-[10px] font-mono font-black opacity-40 uppercase tracking-[0.1em] bg-stone-50 px-3 py-1 rounded-full text-foreground/60">{b.metadata.reference.split(' (')[0].replace(/:\d+.*$/, '')}</span>
                                        )}
                                        </div>
                                        
                                        <div className="flex-1">
                                           <p className="text-[20px] font-sans font-medium text-foreground tracking-tight leading-[1.4] text-left">
                                             {b.content}
                                           </p>
                                         </div>
 
                                        {b.metadata?.isInsight && b.metadata?.verseText && (
                                          <div className="mt-1 p-5 rounded-2xl bg-stone-50 border border-border/40 text-[15px] font-sans text-foreground/40 leading-relaxed relative overflow-hidden">
                                            <span className="relative z-10 block">"{b.metadata.verseText}"</span>
                                          </div>
                                        )}
                                      </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="h-full min-h-[400px] ml-4 rounded-[3.5rem] border-[3px] border-dashed border-border/40 flex flex-col items-center justify-center gap-6 opacity-30 group hover:opacity-60 transition-opacity">
                             <div className="w-24 h-24 rounded-full bg-indigo-500/5 border-2 border-indigo-500/10 flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
                                <Plus className="w-10 h-10 text-indigo-500" />
                             </div>
                             <p className="text-[14px] font-black uppercase tracking-[0.6em] text-center text-indigo-500/60 leading-loose">
                                Mapeie o texto<br/>
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

          {/* FOCUS CONTEXT LAYER - Immersive Overlay */}
          <AnimatePresence>
            {showContextPeek && finalVerseId && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/70 backdrop-blur-3xl z-40" 
                  onClick={() => setShowContextPeek(false)}
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 120, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 120, scale: 0.98 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 120 }}
                  className="absolute inset-x-8 top-12 bottom-44 max-w-5xl mx-auto bg-surface p-16 rounded-[4.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] z-50 flex flex-col gap-10 border border-border"
                >
                  <div className="flex items-center justify-between pb-4 shrink-0">
                    <div className="flex items-center gap-6">
                      <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[2.5rem] font-sans font-black italic leading-none tracking-tight text-foreground">
                          {finalSource?.reference?.split(' (')[0].replace(/:\d+.*$/, '')}
                        </h3>
                        <p className="text-[10px] font-black tracking-[0.4em] uppercase opacity-30 mt-2 text-indigo-500">Capítulo Completo</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowContextPeek(false)} 
                      className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center hover:scale-105 transition-all shadow-sm active:scale-95 text-foreground/40 hover:text-foreground"
                    >
                      <X className="w-8 h-8" />
                    </button>
                  </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar-premium pr-8 pb-32 scroll-pt-20" ref={contextScrollRef}>
                    {isLoadingContext ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Alimentando Altar com Escritura...</p>
                      </div>
                    ) : (
                      <div className="font-sans font-medium text-foreground/60 leading-[2.2] text-justify">
                        {fullChapterVerses.map((v, index) => {
                          const isTarget = finalVerseId === 'ALL' || String(v.v) === finalVerseId;
                          const currentRef = `${finalSource?.reference?.split(' (')[0].replace(/:\d+.*$/, '')}:${v.v}`;
                          const isSaved = blocks.some(b => b.metadata?.isInsight && b.metadata?.reference === currentRef);
                          
                          return (
                            <span 
                              key={v.v} 
                              ref={isTarget && (finalVerseId !== 'ALL' || index === 0) ? activeVerseRef : null}
                              className={cn(
                                "relative transition-all duration-1000 inline rounded-[1.5rem] px-3 py-1.5 group/line cursor-pointer",
                                isSaved ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]" :
                                isTarget ? "text-foreground opacity-100 bg-indigo-500/10 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]" : "text-foreground/30 hover:text-foreground/80 hover:bg-foreground/5"
                              )}
                            >
                              <span className={cn(
                                "text-[1.1rem] font-bold mr-3 select-none align-baseline opacity-90 transition-colors",
                                isSaved ? "text-emerald-500" : "text-indigo-500"
                              )}>{v.v}</span>
                              <span className="text-[1.6rem] leading-relaxed tracking-tight">{v.text} </span>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); if(!isSaved) saveInsight(v, finalSource); }}
                                className={cn(
                                  "absolute -top-12 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-xl z-20",
                                  isSaved 
                                    ? "bg-emerald-500 text-white border-emerald-400 opacity-100 pointer-events-none scale-0" 
                                    : "bg-surface border-border opacity-0 group-hover/line:opacity-100 hover:bg-indigo-600 hover:text-white hover:scale-110 active:scale-90 text-foreground/60"
                                )}
                                title={isSaved ? "Revelação Guardada" : "Salvar como Insight"}
                              >
                                <Sparkles className="w-5 h-5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

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

      {/* SEARCH HUD - COMMAND CENTER */}
      <AnimatePresence>
        {isHudOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-3xl z-[100] p-12 flex flex-col items-center overflow-y-auto custom-scrollbar"
          >
            <div className="w-full max-w-4xl flex flex-col gap-12 mt-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Sparkles className="w-8 h-8 text-indigo-500" />
                    <h2 className="text-4xl font-sans font-black italic tracking-tight">O que você busca?</h2>
                  </div>
                  <button onClick={() => { setIsHudOpen(false); setSearchQuery(''); }} className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-all active:scale-95 shadow-xl">
                    <X className="w-6 h-6" />
                  </button>
               </div>

               <div className="flex items-center gap-6 mb-2">
                 <div className="flex items-center gap-2 bg-surface backdrop-blur-xl rounded-full p-1.5 border border-border shadow-sm">
                   <button 
                     onClick={() => setSearchMode('SERMON')}
                     className={cn(
                       "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                       searchMode === 'SERMON' ? "bg-indigo-600 text-white shadow-lg" : "text-foreground/40 hover:text-foreground"
                     )}
                   >
                     Meu Sermão
                   </button>
                   <button 
                     onClick={() => setSearchMode('GLOBAL')}
                     className={cn(
                       "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                       searchMode === 'GLOBAL' ? "bg-indigo-600 text-white shadow-lg" : "text-foreground/40 hover:text-foreground"
                     )}
                   >
                     Bíblia Global
                   </button>
                 </div>

                 <div className="flex items-center gap-2 bg-surface/50 backdrop-blur-xl rounded-full p-1 border border-border">
                   {['nvi', 'ra', 'acf'].map(v => (
                     <button 
                       key={v}
                       onClick={() => { 
                         setSelectedVersion(v); 
                         setSearchMode('GLOBAL');
                         if (sermonMeta) {
                           syncMeta({ ...sermonMeta, bibleVersion: v });
                         }
                       }}
                       className={cn(
                         "w-14 h-9 rounded-full text-[10px] font-black uppercase transition-all flex items-center justify-center",
                         selectedVersion === v && searchMode === 'GLOBAL' ? "bg-foreground/10 text-foreground" : "text-foreground/20 hover:text-foreground/60"
                       )}
                     >
                       {v}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="relative group flex justify-center w-full">
                 <input 
                   autoFocus
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder={searchMode === 'SERMON' ? "ex: Introdução..." : "ex: marcos 5..."}
                   className="w-full bg-surface/80 border border-border/80 rounded-[3rem] py-10 px-12 text-center text-4xl font-sans italic font-black outline-none focus:border-indigo-500/50 transition-all shadow-xl placeholder:opacity-20"
                 />
                 {isBibleSearching && (
                   <div className="absolute right-10 top-1/2 -translate-y-1/2">
                     <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                   </div>
                 )}
               </div>

                <div className="w-full flex-1" ref={hudScrollRef}>
                  {searchMode === 'SERMON' ? (
                    <div className="grid grid-cols-2 gap-10">
                      <div className="flex flex-col gap-6">
                        <h3 className="text-[11px] font-sans font-black tracking-[0.3em] uppercase opacity-30 px-2 flex items-center gap-3">
                          <LayoutGrid className="w-4 h-4" /> SERMÃO
                        </h3>
                        {searchQuery.length > 0 ? blocks.filter(b => 
                          b.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.metadata?.customLabel?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map((b, idx) => (
                          <div key={b.id} onClick={() => { jumpToGroup(blocks.indexOf(b)); setIsHudOpen(false); setSearchQuery(''); }} className="p-6 rounded-2xl bg-surface border border-border hover:border-foreground/30 transition-all cursor-pointer group active:scale-95 shadow-sm">
                             <div className="flex items-center gap-3 mb-2">
                               <span className="text-[10px] font-black uppercase text-indigo-500">{b.type}</span>
                               <span className="text-[10px] opacity-20 uppercase font-black">S{blocks.indexOf(b) + 1}</span>
                             </div>
                             <p className="text-lg font-serif group-hover:italic transition-all line-clamp-2">{b.content}</p>
                          </div>
                        )) : (
                          <p className="px-2 py-4 text-[11px] opacity-20 italic font-medium uppercase tracking-widest">Aguardando busca...</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-6">
                        <h3 className="text-[11px] font-sans font-black tracking-[0.3em] uppercase opacity-30 px-2 flex items-center gap-3">
                          <Book className="w-4 h-4" /> BÍBLIA
                        </h3>
                        {searchQuery.length > 1 ? (sermonMeta?.bibleSources || []).map((source: any) => (
                          parseBibleContent(source.content)
                            .filter(v => 
                              v.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              source.reference.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((verse) => (
                              <div key={`${source.id}-${verse.v}`} className="relative group/search-verse">
                                <div 
                                  onClick={() => { setIsHudOpen(false); jumpToGroup(blocks.indexOf(blocks.find(b => b.metadata?.parentVerseId === String(verse.v) && b.metadata?.bibleSourceId === source.id))); setSearchQuery(''); }} 
                                  className="group/verse flex gap-6 items-start cursor-pointer transition-all bg-surface border border-border hover:border-indigo-500/30 p-6 rounded-2xl shadow-sm active:scale-95"
                                >
                                  <span className="text-lg font-mono text-muted-foreground/30 font-bold mt-1 shrink-0">{verse.v}</span>
                                  <div className="flex flex-col gap-2 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500">{source.reference}:{verse.v}</span>
                                      {/* Focus Ribbon Indicator for search */}
                                      {source.id === activeSourceId && String(verse.v) === activeVerseId && (
                                        <motion.div layoutId="focus-ribbon" className="h-0.5 w-12 bg-indigo-500 rounded-full" />
                                      )}
                                    </div>
                                    <p className="text-lg font-serif text-foreground/80 leading-snug group-hover/verse:text-foreground transition-colors line-clamp-4">{verse.text}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); saveInsight(verse, source); }}
                                  className="absolute right-4 top-4 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover/search-verse:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-90 z-10"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                        )) : (
                          <p className="px-2 py-4 text-[11px] opacity-20 italic font-medium uppercase tracking-widest">3+ caracteres...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 w-full -mx-4 px-4 pb-12">
                      <div className="w-full h-px bg-border mt-2 mb-2 relative">
                         <div className="absolute -top-3 left-0 bg-background pr-4 flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-foreground/30" />
                            <span className="text-[10px] font-sans font-black tracking-[0.3em] uppercase text-foreground/40">
                              RESULTADOS BÍBLIA GLOBAL ({selectedVersion.toUpperCase()})
                            </span>
                         </div>
                      </div>
                      <div className="flex flex-col w-full max-w-2xl mx-auto">
                        {bibleResults.length > 0 ? bibleResults.map((verse: any, idx: number) => (
                          <div 
                            key={idx}
                            className="mb-6 pb-6 border-b border-border/30 last:border-0 group relative hover:bg-indigo-500/[0.02] rounded-xl px-4 py-3 -mx-4 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                                {verse.book?.name || verse.book_name} {verse.chapter}:{verse.number || verse.verse}
                              </span>
                              <span className="text-[9px] opacity-20 font-black tracking-widest">{selectedVersion.toUpperCase()}</span>
                            </div>
                            <p className="text-xl font-serif text-foreground/80 leading-relaxed italic block mt-1 pr-12">"{verse.text}"</p>
                            
                            <button 
                              onClick={() => saveGlobalInsight(verse)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface border border-border text-foreground/40 hidden group-hover:flex items-center justify-center hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 active:scale-95 transition-all shadow-sm"
                              title="Guardar Insight Global"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          </div>
                        )) : (
                          <div className="col-span-1 py-20 text-center">
                             <p className="text-[11px] opacity-20 italic font-medium uppercase tracking-widest">
                               {searchQuery.length < 3 ? 'Digite ao menos 3 letras...' : 'Nenhum versículo encontrado.'}
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST - PREMIUM FEEDBACK */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="fixed bottom-48 left-1/2 -translate-x-1/2 z-[110] px-8 py-4 glass-heavy border-indigo-500/30 text-indigo-400 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
