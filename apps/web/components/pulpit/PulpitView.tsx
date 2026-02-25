"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Clock, Search, Book, Sidebar, ChevronRight, X, 
  Maximize2, Minimize2, ArrowLeft, ArrowRight, MoreVertical, 
  LayoutGrid, Zap, Sparkles, GripVertical, CheckCircle2,
  Quote, CornerDownRight, LinkIcon, Trash2, Layout, LogOut
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { useGesture } from '@use-gesture/react';
import { BookOpen, HelpCircle, Target, Lightbulb, AlertTriangle } from 'lucide-react';

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
  TEXTO_BASE: { label: 'Texto Base', color: 'var(--color-exegesis)', icon: <BookOpen className="w-4 h-4" /> },
  EXEGESE: { label: 'Exegese', color: '#6366f1', icon: <HelpCircle className="w-4 h-4" /> },
  APLICACAO: { label: 'Aplicação', color: 'var(--color-application)', icon: <Target className="w-4 h-4" /> },
  ILUSTRACAO: { label: 'Ilustração', color: '#10b981', icon: <Lightbulb className="w-4 h-4" /> },
  ENFASE: { label: 'Ênfase', color: 'var(--color-emphasis)', icon: <AlertTriangle className="w-4 h-4" /> },
  CUSTOMIZAR: { label: 'Custom', color: '#737373', icon: <Sparkles className="w-4 h-4" /> }
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
  const { latestBlocks, latestMeta, isConnected } = useSermonSocket(sermonId);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sermonMeta, setSermonMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'BIBLIA' | 'ESTRUTURA'>('ESTRUTURA');
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(targetTime * 60);
  const [showContextPeek, setShowContextPeek] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
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
      if (!res.ok) throw new Error('Bible search failed');
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
    const newInsight = {
      id: Math.random().toString(36).substr(2, 9),
      verse,
      sourceReference: source.reference,
      timestamp: new Date().toISOString(),
      sermonId
    };
    setInsights(prev => [...prev, newInsight]);
    setShowToast(`Revelação guardada: ${source.reference}:${verse.v}`);
    setTimeout(() => setShowToast(null), 3000);
    
    // In a real app, this would persist to the DB
    console.log("Insight Saved:", newInsight);
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
      const { swipe: [_, sy] } = state;
      if (sy < 0) handleNext();
      if (sy > 0) handlePrev();
    }
  });

  const handleNext = () => {
    if (activeBlockIndex < blocks.length - 1) setActiveBlockIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (activeBlockIndex > 0) setActiveBlockIndex(prev => prev - 1);
  };

  const activeBlock = blocks[activeBlockIndex] || null;
  const activeVerseId = activeBlock?.metadata?.parentVerseId;
  const activeSourceId = activeBlock?.metadata?.bibleSourceId;
  const activeSource = sermonMeta?.bibleSources?.find((s: any) => s.id === activeSourceId) || (sermonMeta?.bibleSources?.[0]);

  const [previewSourceId, setPreviewSourceId] = useState<string | null>(null);
  const [previewVerseId, setPreviewVerseId] = useState<string | null>(null);

  const finalSource = previewSourceId 
    ? sermonMeta?.bibleSources?.find((s: any) => s.id === previewSourceId)
    : activeSource;
  
  const finalVerseId = previewVerseId || activeVerseId;

  const jumpToSourceVerse = (sourceId: string, vId: string) => {
    const index = blocks.findIndex(b => b.metadata?.parentVerseId === vId && b.metadata?.bibleSourceId === sourceId);
    if (index !== -1) {
      setActiveBlockIndex(index);
      setPreviewSourceId(null);
      setPreviewVerseId(null);
    } else {
      setPreviewSourceId(sourceId);
      setPreviewVerseId(vId);
    }
    setShowContextPeek(true);
    
    // Auto-scroll logic happens in useEffect
  };

  // Effect for Context Peek Auto-scroll
  useEffect(() => {
    if (showContextPeek) {
      const activeEl = activeVerseRef.current;
      if (activeEl) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [showContextPeek, finalVerseId]);

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
            <div className="p-6 border-b border-border flex items-center justify-between bg-foreground/[0.03]">
              <div>
                <h2 className="text-3xl font-serif font-black italic tracking-tight">Apoio</h2>
                <p className="text-[15px] font-sans font-black tracking-[0.3em] uppercase opacity-30 mt-0.5">Instrumental</p>
              </div>
            </div>

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
                  "flex-1 py-4 text-[16px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3",
                  sidebarTab === 'ESTRUTURA' ? "text-foreground bg-foreground/5 shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4" /> Mapa
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
                             onClick={() => jumpToSourceVerse(source.id, String(v.v))}
                             className={cn(
                               "py-2.5 px-3 rounded-lg cursor-pointer transition-all flex items-start gap-3 group active:scale-95",
                               (String(v.v) === activeVerseId && source.id === activeSourceId) || (String(v.v) === previewVerseId && source.id === previewSourceId)
                                ? "bg-foreground text-background shadow-lg" 
                                : "text-foreground/80 hover:bg-foreground/5 border border-transparent hover:border-border"
                             )}
                           >
                             <span className={cn("text-[18px] font-mono font-medium mt-0.5", (String(v.v) === activeVerseId && source.id === activeSourceId) || (String(v.v) === previewVerseId && source.id === previewSourceId) ? "opacity-100" : "opacity-20")}>{v.v}</span>
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
              ) : (
                <div className="p-3 flex flex-col gap-0.5 relative">
                  {/* Vertical Roadmap Track */}
                  <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-foreground/[0.08]" />
                  
                  {blocks.map((block, idx) => {
                    const isActive = activeBlockIndex === idx;
                    const isPast = activeBlockIndex > idx;
                    const depth = block.metadata?.depth || 0;
                    
                    return (
                      <div 
                        key={block.id}
                        onClick={() => { setActiveBlockIndex(idx); setPreviewSourceId(null); setPreviewVerseId(null); }}
                        className={cn(
                          "relative flex items-start gap-3 py-1 transition-all cursor-pointer group",
                          isActive ? "opacity-100" : 
                          block.type === 'TEXTO_BASE' ? "opacity-80" : "opacity-30 hover:opacity-100"
                        )}
                        style={{ marginLeft: `${depth * 1.25}rem` }}
                      >
                        {/* Step Marker */}
                        <div className="relative z-10 flex flex-col items-center shrink-0 mt-1">
                          <div className={cn(
                            "w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-500",
                            isActive ? "bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] scale-110" : 
                            isPast ? "bg-foreground/10 border-transparent text-indigo-500/50" : "bg-surface border-border"
                          )}>
                            {isPast ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                               <span className={cn(
                                 "text-[15px] font-mono font-black",
                                 isActive ? "text-white" : "text-muted-foreground"
                               )}>
                                 {idx + 1}
                               </span>
                            )}
                          </div>
                        </div>
        
                        {/* Content Card */}
                        <div className={cn(
                          "flex-1 flex flex-col gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-500 border",
                          isActive ? "bg-foreground/5 border-foreground/15 shadow-sm" : "bg-transparent border-transparent"
                        )}>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-1.5 min-w-0">
                               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: block.metadata?.customColor || CATEGORY_MAP[block.type]?.color || '#888' }} />
                               <span className={cn(
                                 "text-[12px] font-black uppercase tracking-[0.2em] truncate", 
                                 isActive ? "text-indigo-500" : "text-muted-foreground"
                               )}>
                                 {block.metadata?.customLabel || CATEGORY_MAP[block.type]?.label || block.type}
                               </span>
                             </div>
                          </div>
                           <p className={cn(
                             "text-[18px] font-medium leading-tight line-clamp-2 mt-0.5 transition-colors",
                             isActive ? "text-foreground" : 
                             block.type === 'TEXTO_BASE' ? "text-indigo-400/80 italic" : "text-foreground/60"
                           )}>
                            {block.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
              <span className="text-[10px] font-black uppercase tracking-widest">Busca</span>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                 <span className={cn(
                   "text-5xl font-mono font-black tabular-nums leading-none tracking-tighter",
                   timeLeft < 300 ? "text-red-500 animate-pulse" : "text-foreground"
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
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <div className="absolute inset-0 z-0" {...bind()} />
          
          <div className="flex-1 flex flex-col items-center justify-center transition-all duration-500 pb-32">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={activeBlockIndex}
                 initial={{ y: 40, opacity: 0 }}
                 animate={{ 
                   y: showContextPeek ? -400 : 0, 
                   opacity: showContextPeek ? 0 : 1,
                   scale: showContextPeek ? 0.8 : 1,
                   filter: showContextPeek ? 'blur(30px)' : 'blur(0px)'
                 }}
               exit={{ y: -20, opacity: 0 }}
               transition={{ type: 'spring', damping: 30, stiffness: 300 }}
               className="max-w-7xl w-full flex flex-col items-center gap-16 text-center z-10 origin-center"
             >
                <div className="flex flex-col items-center gap-16 w-full">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-12 py-3.5 rounded-full border flex items-center gap-5 shadow-2xl transition-all duration-500"
                    style={{ 
                      borderColor: (activeBlock?.metadata?.customColor || CATEGORY_MAP[activeBlock?.type]?.color || '#6366f1') + '40',
                      backgroundColor: (activeBlock?.metadata?.customColor || CATEGORY_MAP[activeBlock?.type]?.color || '#6366f1') + '10',
                      color: activeBlock?.metadata?.customColor || CATEGORY_MAP[activeBlock?.type]?.color || '#6366f1'
                    }}
                  >
                     <div className="w-6 h-6 flex items-center justify-center">
                        {CATEGORY_MAP[activeBlock?.type]?.icon || <Zap className="w-5 h-5 fill-current" />}
                     </div>
                     <span className="text-[14px] font-black tracking-[0.6em] uppercase">
                       {activeBlock?.metadata?.customLabel || CATEGORY_MAP[activeBlock?.type]?.label || activeBlock?.type}
                     </span>
                  </motion.div>
                  
                  <h1 className={cn(
                    "font-serif font-black italic leading-[1.3] text-foreground transition-all duration-500 select-none drop-shadow-2xl break-words whitespace-pre-wrap w-full px-4",
                    activeBlock?.metadata?.font || 'font-serif',
                    (activeBlock?.content?.length || 0) > 200 ? "text-2xl md:text-3xl lg:text-4xl" :
                    (activeBlock?.content?.length || 0) > 120 ? "text-3xl md:text-4xl lg:text-5xl" :
                    (activeBlock?.content?.length || 0) > 60 ? "text-4xl md:text-5xl lg:text-6xl" :
                    "text-5xl md:text-6xl lg:text-7xl"
                  )}>
                    {activeBlock?.content}
                  </h1>

                  {!showContextPeek && finalVerseId && (
                    <motion.button 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowContextPeek(true)} 
                      className="mt-8 px-14 py-7 rounded-full font-sans font-black text-[14px] tracking-[0.3em] uppercase transition-all shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center gap-5 border border-white/5 bg-surface/50 backdrop-blur-3xl hover:bg-indigo-600 hover:text-white hover:border-indigo-500 group"
                    >
                      <Book className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
                      <span>{finalSource?.reference?.toUpperCase() || 'REF'}:{finalVerseId}</span>
                    </motion.button>
                  )}
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
                  className="absolute inset-0 bg-background/60 backdrop-blur-2xl z-40" 
                  onClick={() => setShowContextPeek(false)}
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 120, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 120, scale: 0.98 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 120 }}
                  className="absolute inset-x-8 top-32 bottom-48 max-w-6xl mx-auto glass-heavy p-16 rounded-[4.5rem] shadow-[0_80px_150px_rgba(0,0,0,0.9)] z-50 flex flex-col gap-12 border border-white/10"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-10">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                        <Book className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-5xl font-serif font-black italic leading-none tracking-tight">{finalSource?.reference}</h3>
                        <p className="text-[11px] font-black tracking-[0.5em] uppercase opacity-30 mt-3 text-indigo-400">Contexto de Escritura</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowContextPeek(false)} 
                      className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all active:scale-90 shadow-2xl"
                    >
                      <X className="w-8 h-8" />
                    </button>
                  </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar-premium pr-8 pb-32" ref={contextScrollRef}>
                    <div className="font-serif leading-[1.8] text-justify">
                      {parseBibleContent(finalSource?.content).map(v => {
                        const isTarget = String(v.v) === finalVerseId;
                        return (
                          <span 
                            key={v.v} 
                            ref={isTarget ? activeVerseRef : null}
                            className={cn(
                              "relative transition-all duration-1000 inline rounded-xl px-2 py-1 group/line cursor-pointer",
                              isTarget ? "text-foreground opacity-100 bg-indigo-500/10 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]" : "text-foreground/40 hover:opacity-100 hover:bg-white/5"
                            )}
                          >
                            <span className="text-2xl font-bold text-indigo-500 mr-2 select-none align-super">{v.v}</span>
                            <span className="text-4xl leading-relaxed">{v.text} </span>
                            
                            {/* SAVE INSIGHT BUTTON IN CONTEXT PEEK */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); saveInsight(v, finalSource); }}
                              className="absolute -top-12 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full glass border-white/10 flex items-center justify-center opacity-0 group-hover/line:opacity-100 transition-all hover:bg-indigo-600 hover:text-white hover:scale-110 active:scale-90 shadow-2xl z-20"
                              title="Salvar como Insight"
                            >
                              <Sparkles className="w-5 h-5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* PULPIT NAVIGATION RIBBON - CENTERED COCKPIT */}
          <div className={cn(
            "fixed bottom-12 left-0 right-0 flex justify-center z-50 transition-all duration-500 pointer-events-none",
            isSidebarOpen ? "ml-[400px]" : "ml-0"
          )}>
            <div className="w-full max-w-6xl px-12 pointer-events-auto">
              <div className="relative group">
                {/* Premium Glass Card */}
                <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]" />
                
                <div className="relative flex items-center h-32 px-12 gap-12">
                  {/* Anterior */}
                  <button 
                    onClick={handlePrev}
                    disabled={activeBlockIndex === 0}
                    className="flex-1 flex flex-col items-start gap-2 group/btn disabled:opacity-0 transition-all duration-500 cursor-pointer"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 flex items-center gap-2 mb-1">
                      <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" /> ANTERIOR
                    </span>
                    <p className="text-lg font-serif italic text-left line-clamp-1 max-w-[200px] opacity-20 group-hover/btn:opacity-60 transition-opacity">
                      {blocks[activeBlockIndex - 1]?.content || 'Início'}
                    </p>
                  </button>

                  {/* Central Step Indicator */}
                  <div className="flex flex-col items-center justify-center px-12 border-x border-white/5">
                    <div className="text-6xl font-mono font-black tracking-tighter tabular-nums text-foreground leading-none">
                      {activeBlockIndex + 1}
                      <span className="text-xl opacity-20 ml-2 font-medium">/ {blocks.length}</span>
                    </div>
                    <div className="w-16 h-1.5 bg-indigo-500 mt-4 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mt-3">PASSO</span>
                  </div>

                  {/* Próximo */}
                  <button 
                    onClick={handleNext}
                    disabled={activeBlockIndex === blocks.length - 1}
                    className="flex-[2] flex flex-col items-end gap-2 group/btn disabled:opacity-0 transition-all duration-500 cursor-pointer"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 flex items-center gap-2 mb-1">
                      PRÓXIMO <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    <p className="text-2xl font-serif font-bold italic text-right leading-tight text-foreground group-hover:text-indigo-400 transition-colors">
                      {blocks[activeBlockIndex + 1]?.content || 'Fim'}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* PROGRESS RIBBON */}
        <div className="h-1.5 bg-border relative overflow-hidden shrink-0">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${((activeBlockIndex + 1) / blocks.length) * 100}%` }}
          />
        </div>
      </main>

      {/* SEARCH HUD - COMMAND CENTER */}
      <AnimatePresence>
        {isHudOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-3xl z-[100] p-12 flex flex-col items-center"
          >
            <div className="w-full max-w-4xl flex flex-col gap-12">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Sparkles className="w-8 h-8 text-indigo-500" />
                    <h2 className="text-4xl font-serif font-bold italic tracking-tight">O que você busca?</h2>
                  </div>
                  <button onClick={() => { setIsHudOpen(false); setSearchQuery(''); }} className="w-14 h-14 rounded-full border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all active:scale-90">
                    <X className="w-8 h-8" />
                  </button>
               </div>

               <div className="flex items-center gap-6 mb-8">
                 <div className="flex bg-surface/50 backdrop-blur-xl rounded-full p-1 border border-white/5">
                   <button 
                     onClick={() => setSearchMode('SERMON')}
                     className={cn(
                       "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                       searchMode === 'SERMON' ? "bg-indigo-600 text-white shadow-lg" : "text-foreground/40 hover:text-foreground"
                     )}
                   >
                     Meu Sermão
                   </button>
                   <button 
                     onClick={() => setSearchMode('GLOBAL')}
                     className={cn(
                       "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                       searchMode === 'GLOBAL' ? "bg-indigo-600 text-white shadow-lg" : "text-foreground/40 hover:text-foreground"
                     )}
                   >
                     Bíblia Global
                   </button>
                 </div>

                 {searchMode === 'GLOBAL' && (
                   <div className="flex items-center gap-2 bg-surface/50 backdrop-blur-xl rounded-full p-1 border border-white/5">
                     {['nvi', 'ra', 'acf'].map(v => (
                       <button 
                         key={v}
                         onClick={() => setSelectedVersion(v)}
                         className={cn(
                           "w-12 h-8 rounded-full text-[9px] font-black uppercase transition-all",
                           selectedVersion === v ? "bg-foreground/10 text-foreground" : "text-foreground/20 hover:text-foreground/60"
                         )}
                       >
                         {v}
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               <div className="relative group">
                 <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/30 group-focus-within:text-foreground transition-colors" />
                 <input 
                   autoFocus
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder={searchMode === 'SERMON' ? "Busque temas, versículos ou notas..." : "Pesquisar na Bíblia toda (ex: Amor, Fé, Jesus)..."}
                   className="w-full bg-surface/50 backdrop-blur-3xl border border-border rounded-[3rem] py-10 pl-24 pr-12 text-4xl font-serif italic font-bold outline-none focus:border-indigo-500/50 transition-all shadow-2xl placeholder:opacity-10"
                 />
                 {isBibleSearching && (
                   <div className="absolute right-10 top-1/2 -translate-y-1/2">
                     <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                   </div>
                 )}
               </div>

                <div className="w-full overflow-y-auto max-h-[55vh] custom-scrollbar p-2" ref={hudScrollRef}>
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
                          <div key={b.id} onClick={() => { setActiveBlockIndex(blocks.indexOf(b)); setIsHudOpen(false); setSearchQuery(''); }} className="p-6 rounded-2xl bg-surface border border-border hover:border-foreground/30 transition-all cursor-pointer group active:scale-95 shadow-sm">
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
                                  onClick={() => { setIsHudOpen(false); jumpToSourceVerse(source.id, String(verse.v)); setSearchQuery(''); }} 
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
                    <div className="flex flex-col gap-6">
                      <h3 className="text-[11px] font-sans font-black tracking-[0.3em] uppercase opacity-30 px-2 flex items-center gap-3">
                        <Sparkles className="w-4 h-4" /> RESULTADOS BÍBLIA GLOBAL ({selectedVersion.toUpperCase()})
                      </h3>
                      <div className="grid grid-cols-2 gap-8">
                        {bibleResults.length > 0 ? bibleResults.map((verse: any, idx: number) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              const tempSource = { id: `global-${Date.now()}`, reference: `${verse.book.name} ${verse.chapter}:${verse.number}`, content: `${verse.number} ${verse.text}` };
                              setSermonMeta((prev: any) => ({
                                ...prev,
                                bibleSources: [...(prev.bibleSources || []), tempSource]
                              }));
                              jumpToSourceVerse(tempSource.id, String(verse.number));
                              setIsHudOpen(false);
                            }}
                            className="p-8 rounded-3xl bg-surface/30 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group active:scale-95 shadow-xl backdrop-blur-md"
                          >
                             <div className="flex items-center justify-between mb-4">
                               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                 {verse.book.name} {verse.chapter}:${verse.number}
                               </span>
                               <span className="text-[10px] opacity-20 font-black">{selectedVersion.toUpperCase()}</span>
                             </div>
                             <p className="text-xl font-serif text-foreground/80 leading-snug group-hover:text-foreground transition-colors italic">"{verse.text}"</p>
                          </div>
                        )) : (
                          <div className="col-span-2 py-32 text-center">
                             <p className="text-[11px] opacity-20 italic font-medium uppercase tracking-widest">
                               {searchQuery.length < 3 ? 'Digite ao menos 3 letras para pesquisar na Bíblia toda...' : 'Nenhum versículo encontrado.'}
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
