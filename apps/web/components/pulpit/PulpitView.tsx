"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Clock, Search, Book, Sidebar, ChevronRight, X, 
  Maximize2, Minimize2, ArrowLeft, ArrowRight, MoreVertical, 
  LayoutGrid, Zap, Sparkles, GripVertical, CheckCircle2,
  Quote, CornerDownRight, LinkIcon, Trash2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { useGesture } from '@use-gesture/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PulpitViewProps {
  sermonId: string;
  targetTime: number; // minutes
  onExit: () => void;
  onStudy?: () => void;
}

const parseBibleContent = (content: string) => {
  if (!content) return [];
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const verses: { v: number; text: string }[] = [];
  lines.forEach(line => {
    const match = line.match(/^(\d+)\s+(.*)/);
    if (match) verses.push({ v: parseInt(match[1]), text: match[2] });
    else if (verses.length > 0) verses[verses.length - 1].text += ' ' + line;
  });
  return verses;
};

export default function PulpitView({ sermonId, targetTime, onExit, onStudy }: PulpitViewProps) {
  const { latestBlocks, isConnected } = useSermonSocket(sermonId);
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
  
  // Update local blocks when socket updates
  useEffect(() => {
    if (latestBlocks) {
      setBlocks(latestBlocks);
    }
  }, [latestBlocks]);

  // Initial Fetch
  useEffect(() => {
    const fetchSermon = async () => {
      try {
        const res = await fetch(`http://localhost:3001/sermons/${sermonId}`);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40">Preparando Altar...</p>
      </div>
    );
  }

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
  };

  const finalSource = previewSourceId 
    ? sermonMeta?.bibleSources?.find((s: any) => s.id === previewSourceId)
    : activeSource;
  
  const finalVerseId = previewVerseId || activeVerseId;

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
            <div className="p-10 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-black italic tracking-tight">Apoio</h2>
                <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase opacity-30 mt-1">Instrumental</p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all active:scale-90 shadow-sm"
              >
                <Sidebar className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-border bg-foreground/[0.02]">
              <button 
                onClick={() => setSidebarTab('BIBLIA')}
                className={cn(
                  "flex-1 py-4 text-[11px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3",
                  sidebarTab === 'BIBLIA' ? "text-foreground bg-foreground/5 shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Book className="w-4 h-4" /> Bíblia
              </button>
              <button 
                onClick={() => setSidebarTab('ESTRUTURA')}
                className={cn(
                  "flex-1 py-4 text-[11px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3",
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
                         <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">{source.reference || 'Texto'}</div>
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
                             <span className={cn("text-xs font-mono font-bold mt-0.5", (String(v.v) === activeVerseId && source.id === activeSourceId) || (String(v.v) === previewVerseId && source.id === previewSourceId) ? "opacity-100" : "opacity-20")}>{v.v}</span>
                             <span className="text-sm leading-relaxed font-serif">{v.text}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                  {(!sermonMeta?.bibleSources || sermonMeta.bibleSources.length === 0) && (
                    <div className="py-20 text-center opacity-20 text-[11px] font-black tracking-widest uppercase italic">Nenhum texto bíblico importado</div>
                  )}
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-2">
                  {blocks.map((block, idx) => (
                    <div 
                      key={block.id}
                      onClick={() => { setActiveBlockIndex(idx); setPreviewSourceId(null); setPreviewVerseId(null); }}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all flex flex-col gap-1.5 group relative overflow-hidden active:scale-[0.98]",
                        activeBlockIndex === idx ? "bg-foreground text-background shadow-md" : "bg-foreground/5 border border-border hover:border-foreground/20"
                      )}
                      style={{ marginLeft: `${(block.metadata?.depth || 0) * 0.75}rem` }}
                    >
                      {activeBlockIndex === idx && <motion.div layoutId="indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                      <div className="flex items-center justify-between">
                         <span className={cn("text-[8px] font-black uppercase tracking-widest", activeBlockIndex === idx ? "text-background/50" : "text-muted-foreground")}>{block.type}</span>
                         {block.metadata?.parentVerseId && <span className="text-[8px] font-mono font-bold opacity-40">REF {block.metadata.parentVerseId}</span>}
                      </div>
                      <p className="text-xs font-medium line-clamp-1 leading-tight">{block.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-10 border-t border-border bg-foreground/[0.02]">
               <button onClick={onExit} className="w-full flex items-center justify-center gap-4 py-5 rounded-full border border-border text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl active:scale-95">
                 <ArrowLeft className="w-5 h-5" /> Encerrar Púlpito
               </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative h-full">
        {/* NAV/HUD PULPITO - PREMIUM WORKBENCH */}
        <header className="h-24 px-12 border-b border-border bg-surface/40 backdrop-blur-md flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all active:scale-90 shadow-sm"
              >
                <Sidebar className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-serif font-black italic tracking-tight leading-none">{sermonMeta?.title || 'Mensagem'}</h2>
              <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
                <span className="text-emerald-500 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_rgb(16,185,129)]" /> AO VIVO</span>
                <span className="opacity-20">•</span>
                <span>{sermonMeta?.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div 
              onClick={() => setIsHudOpen(true)}
              className="group cursor-pointer flex items-center gap-4 bg-foreground/5 border border-border rounded-full py-2.5 px-6 hover:border-foreground/30 transition-all active:scale-95 shadow-sm"
            >
              <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-[11px] font-sans font-black tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Busca <span className="opacity-30 ml-2 font-mono">⌘K</span></span>
            </div>

            <div className="flex items-center gap-4">
              <div className={cn(
                "flex flex-col items-end",
                timeLeft < 300 ? "text-red-500 animate-pulse" : "text-foreground"
              )}>
                 <span className="text-4xl font-mono font-bold tracking-tighter tabular-nums leading-none">{formatTime(timeLeft)}</span>
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">CRONÔMETRO</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CANVAS - THE PREACHING VIEW */}
        <div className="flex-1 relative flex flex-col items-center justify-center px-12 pb-64 overflow-hidden" {...bind()}>
          <AnimatePresence mode="wait">
             <motion.div 
               key={activeBlockIndex}
               initial={{ y: 30, opacity: 0, scale: 0.98 }}
               animate={{ y: 0, opacity: 1, scale: 1 }}
               exit={{ y: -30, opacity: 0, scale: 0.98 }}
               transition={{ type: 'spring', damping: 25, stiffness: 120 }}
               className="max-w-6xl w-full flex flex-col items-center gap-10 text-center z-10"
             >
                <div className="flex flex-col items-center gap-10">
                  <div className="px-8 py-3 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-500 text-[12px] font-black tracking-[0.4em] uppercase flex items-center gap-4 shadow-sm">
                     <Zap className="w-5 h-5 fill-current" /> {activeBlock?.type || 'BLOCO'}
                  </div>
                  
                  <h1 className={cn(
                    "text-4xl md:text-6xl lg:text-7xl font-serif font-black italic leading-tight text-foreground transition-all duration-700 select-none drop-shadow-sm break-words whitespace-pre-wrap",
                    activeBlock?.metadata?.font || 'font-serif'
                  )}>
                    {activeBlock?.content}
                  </h1>

                  {finalVerseId && (
                    <button 
                      onClick={() => setShowContextPeek(!showContextPeek)} 
                      className={cn(
                        "mt-6 px-12 py-6 rounded-full font-sans font-black text-[13px] tracking-[0.3em] uppercase transition-all shadow-2xl flex items-center gap-4 border", 
                        showContextPeek 
                          ? "bg-indigo-600 text-white border-indigo-500" 
                          : "bg-surface/50 backdrop-blur-xl hover:bg-foreground/5 text-foreground/40 hover:text-foreground border-white/5"
                      )}
                    >
                      <Book className="w-6 h-6" /> {finalSource?.reference?.toUpperCase() || 'REF'}:{finalVerseId}
                    </button>
                  )}
                </div>
             </motion.div>
          </AnimatePresence>

          {/* PULPIT NAVIGATION RIBBON - PREMIUM INTEGRATED */}
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-6xl px-12 z-50">
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

        <AnimatePresence>
          {showContextPeek && finalVerseId && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="absolute bottom-48 left-1/2 -translate-x-1/2 w-full max-w-4xl glass p-12 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] z-[60] flex flex-col gap-10 border border-white/10"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-8">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
                    <Book className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-4xl font-serif font-bold italic">{finalSource?.reference}</h3>
                </div>
                <button onClick={() => setShowContextPeek(false)} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-foreground hover:text-background transition-all active:scale-90 shadow-sm"><X className="w-7 h-7" /></button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-6">
                {parseBibleContent(finalSource?.content).map(v => (
                  <div key={v.v} className={cn(
                    "text-3xl font-serif leading-[1.4] mb-10 flex gap-8 transition-all duration-500",
                    String(v.v) === finalVerseId ? "text-foreground opacity-100 italic" : "text-foreground/20"
                  )}>
                    <span className="font-mono text-lg opacity-40 shrink-0 mt-3 font-black tabular-nums">{v.v}</span>
                    <p>{v.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

               <div className="relative group">
                 <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/30 group-focus-within:text-foreground transition-colors" />
                 <input 
                   autoFocus
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Digite um tema ou versículo..."
                   className="w-full bg-surface/50 backdrop-blur-3xl border border-border rounded-[3rem] py-10 pl-24 pr-12 text-4xl font-serif italic font-bold outline-none focus:border-indigo-500/50 transition-all shadow-2xl placeholder:opacity-10"
                 />
               </div>

               <div className="grid grid-cols-2 gap-10 overflow-y-auto max-h-[50vh] custom-scrollbar p-2">
                 <div className="flex flex-col gap-6">
                    <h3 className="text-[11px] font-sans font-black tracking-[0.3em] uppercase opacity-30 px-2 flex items-center gap-3">
                      <LayoutGrid className="w-4 h-4" /> SERMÃO
                    </h3>
                    {searchQuery.length > 0 ? blocks.filter(b => b.content.toLowerCase().includes(searchQuery.toLowerCase())).map((b, idx) => (
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
                   {searchQuery.length > 2 ? (sermonMeta?.bibleSources || []).map((source: any) => (
                      parseBibleContent(source.content)
                        .filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((verse) => (
                          <div key={`${source.id}-${verse.v}`} onClick={() => { setIsHudOpen(false); jumpToSourceVerse(source.id, String(verse.v)); setSearchQuery(''); }} className="group/verse flex gap-6 items-start cursor-pointer transition-all bg-surface border border-border hover:border-indigo-500/30 p-6 rounded-2xl shadow-sm active:scale-95">
                            <span className="text-lg font-mono text-muted-foreground/30 font-bold mt-1 shrink-0">{verse.v}</span>
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500">{source.reference}:{verse.v}</span>
                              <p className="text-lg font-serif text-foreground/80 leading-snug group-hover/verse:text-foreground transition-colors line-clamp-4">{verse.text}</p>
                            </div>
                          </div>
                        ))
                   )) : (
                      <p className="px-2 py-4 text-[11px] opacity-20 italic font-medium uppercase tracking-widest">3+ caracteres...</p>
                   )}
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
