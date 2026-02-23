"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { Sparkles, Activity, AlertCircle, Quote, X, Edit2, CheckCircle2, MapPin } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TheologyCategory = 'TEXTO_BASE' | 'EXEGESE' | 'APLICACAO' | 'ILUSTRACAO' | 'ENFASE';

export interface Block {
  id: string;
  type: TheologyCategory;
  content: string;
  metadata: {
    font?: string;
    customColor?: string;
    parentVerseId?: string;
    depth?: number;
  };
  preached?: boolean;
}

const CATEGORY_MAP: Record<TheologyCategory, { label: string, color: string, defFont: string }> = {
  TEXTO_BASE: { label: 'Texto Base', color: 'var(--color-exegesis)', defFont: 'font-serif' },
  EXEGESE: { label: 'Exegese', color: '#6366f1', defFont: 'font-sans' },
  APLICACAO: { label: 'Aplicação', color: 'var(--color-application)', defFont: 'font-modern' },
  ILUSTRACAO: { label: 'Ilustração', color: '#10b981', defFont: 'font-theological' },
  ENFASE: { label: 'Ênfase', color: 'var(--color-emphasis)', defFont: 'font-sans' }
};

const MOCK_BLOCKS: Block[] = [
  { id: '1', type: 'TEXTO_BASE', content: 'E a luz resplandece nas trevas, e as trevas não a compreenderam. (João 1:5)', metadata: { font: 'font-serif', depth: 0 } },
  { id: '2', type: 'EXEGESE', content: 'A palavra original para "compreenderam" (katalambano) também significa "venceram" ou "apagaram".', metadata: { font: 'font-sans', depth: 1 } },
  { id: '3', type: 'APLICACAO', content: 'A escuridão não tem poder estrutural para apagar a luz. Ela é apenas a ausência dela.', metadata: { font: 'font-modern', depth: 2 } },
  { id: '4', type: 'ENFASE', content: 'Onde você está tolerando sombras na sua rotina, esquecendo que você carrega a fonte que as dissipa?', metadata: { font: 'font-sans', depth: 3 } },
  { id: '5', type: 'ILUSTRACAO', content: 'Como acender um fósforo numa caverna que não vê a luz há milênios. A escuridão histórica cede instantaneamente.', metadata: { font: 'font-theological', depth: 1 } },
];

export default function PulpitView({ targetTime = 45, onExit }: { targetTime?: number, onExit?: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [blocks, setBlocks] = useState(MOCK_BLOCKS);
  const [timer, setTimer] = useState(targetTime * 60);
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  const [congregationHeat, setCongregationHeat] = useState(30); // 0-100 Mock real-time feedback
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [minimapTab, setMinimapTab] = useState<'ESBOCO' | 'TEXTO_BASE'>('ESBOCO');
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const { pulpitAction } = useSermonSocket('mock-sermon-id');

  // Gestures & Navigation
  const goToNextBlock = useCallback(() => {
    if (activeIndex < blocks.length - 1) setActiveIndex(p => p + 1);
  }, [activeIndex, blocks.length]);

  const goToPrevBlock = useCallback(() => {
    if (activeIndex > 0) setActiveIndex(p => p - 1);
  }, [activeIndex]);

  const markAsPreached = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, preached: true } : b));
    pulpitAction(id, 'markAsPreached');
    if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([30, 50, 30]);
    setTimeout(goToNextBlock, 400);
  }, [goToNextBlock, pulpitAction]);

  const saveBlockEdits = useCallback((id: string, newContent: string, newColor: string, newFont?: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { 
      ...b, 
      content: newContent, 
      metadata: { ...b.metadata, customColor: newColor, font: newFont || b.metadata.font } 
    } : b));
    setEditingBlockId(null);
  }, []);

  const bind = useGesture(
    {
      onDrag: ({ swipe: [, swY], last }) => {
        if (last && !editingBlockId) {
          if (swY === -1) goToNextBlock(); // Swipe Up to go next
          if (swY === 1) goToPrevBlock();  // Swipe Down to go prev
        }
      },
    },
    { drag: { filterTaps: true, threshold: 30 } }
  );

  // Timer & Urgency Logic
  useEffect(() => {
    if (isEditingTimer) return;
    const interval = setInterval(() => {
      setTimer(t => {
        const next = t - 1;
        if (next > 0 && next < 300) setIsWrappingUp(true); // Last 5 minutes triggers warning aura
        if (next <= 0) setIsWrappingUp(true);
        return Math.max(0, next);
      });
      // Simulate real-time congregation heat fluctuating
      setCongregationHeat(prev => Math.min(100, Math.max(10, prev + (Math.random() - 0.5) * 10)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isEditingTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!blocks.length) return null;

  const activeBlock = blocks[activeIndex];
  // Safe fallback if activeBlock somehow becomes undefined during transit
  if (!activeBlock) return null;

  const activeToneColor = activeBlock.metadata.customColor || CATEGORY_MAP[activeBlock.type].color;

  // Find parent verse if current is insight
  const activeParentVerse = activeBlock.type !== 'TEXTO_BASE' 
    ? blocks.find(b => b.id === activeBlock.metadata.parentVerseId) 
    : null;

  // Find upcoming sub-blocks (infinite nesting)
  const upcomingSubBlocks: Block[] = [];
  const currentDepth = activeBlock.metadata.depth || 0;
  
  let i = activeIndex + 1;
  while(i < blocks.length) {
    const nextBlock = blocks[i];
    if (!nextBlock) break;
    const nextDepth = nextBlock.metadata.depth || 0;
    // Break if we hit a sibling or a higher level ancestor
    if (nextDepth <= currentDepth) break;
    upcomingSubBlocks.push(nextBlock);
    i++;
  }

  return (
    <main 
      {...bind()}
      className="relative h-screen w-full flex overflow-hidden bg-background text-foreground transition-colors duration-500 select-none"
    >
      {/* Deep Apple Green Background Aura */}
      <motion.div 
        animate={{ 
          background: isWrappingUp 
            ? `radial-gradient(circle at 60% 50%, rgba(200,20,20,0.15) 0%, #000000 80%)` 
            : `radial-gradient(circle at 60% 50%, #2a3c31 0%, #0d120f 80%)`
        }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* PROCESSUAL MAP (Left Sidebar - Toggleable) */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.aside 
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[380px] shrink-0 border-r border-[#1a1a1a]/50 bg-[#000000]/40 backdrop-blur-3xl flex flex-col relative z-20"
          >
            <div className="p-10 pb-4 flex justify-between items-center">
              <h2 className="text-[9px] font-sans font-bold tracking-[0.2em] text-muted-foreground/40 uppercase flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Mapa Processual
              </h2>
              <button onClick={() => setIsMapOpen(false)} className="p-2 text-muted-foreground/40 hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar px-10 pb-20 pt-6">
          <div className="relative">
            {/* The absolute timeline line */}
            <div className="absolute left-[13px] top-4 bottom-4 w-[1px] bg-border/20 rounded-full" />
            
            {blocks.map((block, idx) => {
              const isActive = idx === activeIndex;
              const isPast = activeIndex > idx;
              const isPreached = block.preached;
              const isBase = block.type === 'TEXTO_BASE';
              
              const blockColor = block.metadata.customColor || CATEGORY_MAP[block.type].color;

              return (
                <div 
                  key={block.id}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                  className={cn(
                    "relative flex items-start cursor-pointer group",
                    isBase ? "mb-10 mt-6" : "mb-6"
                  )}
                  style={{ marginLeft: `${(block.metadata.depth || 0) * 1.5}rem` }}
                >
                  <div className="w-7 shrink-0 flex items-center justify-center relative mt-1.5">
                    
                    <div className={cn(
                      "relative z-10 flex items-center justify-center rounded-full transition-all duration-500",
                      isBase ? "w-7 h-7 border-[1px]" : "w-3 h-3 border-[1px]",
                      isActive 
                        ? "border-[#00ff6c] bg-[#000000]" 
                        : isPast || isPreached
                          ? "border-muted-foreground/30 bg-transparent"
                          : "border-border/30 bg-transparent"
                    )}
                    style={isActive ? { borderColor: '#00ff6c' } : {}}>
                      {isActive && <div className={cn("rounded-full bg-[#00ff6c]", isBase ? "w-2.5 h-2.5 shadow-[0_0_10px_#00ff6c]" : "w-1 h-1")} />}
                      {isPreached || isPast ? <CheckCircle2 className={cn("text-muted-foreground/40", isBase ? "w-3 h-3" : "w-2 h-2 opacity-50")} /> : null}
                    </div>
                  </div>

                  {/* Node Content */}
                  <div className={cn(
                    "flex flex-col ml-5 flex-1 transition-all duration-500",
                    isBase ? "pt-0.5" : "pt-0",
                    isActive ? "opacity-100 translate-x-1" : isPast ? "opacity-30" : "opacity-40 group-hover:opacity-100"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-sans tracking-[0.2em] font-medium opacity-40">#{idx + 1}</span>
                      <span className={cn("font-bold tracking-widest uppercase", isBase ? "text-[9px]" : "text-[8px]")} style={{ color: isActive ? '#ffffff' : 'inherit' }}>
                        {CATEGORY_MAP[block.type].label}
                      </span>
                    </div>
                    <p className={cn(
                      "leading-relaxed font-sans",
                      isActive ? "text-[#f5f5f7]" : "text-muted-foreground",
                      isBase ? "text-sm line-clamp-3 italic font-medium" : "text-xs line-clamp-2 font-light"
                    )}>
                      {block.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FOCUS STAGE (Right Main Area) */}
      <section className="flex-1 relative flex flex-col items-center justify-center p-12 z-10 w-full">
        
        {/* Top UI Container (Timer, Context, Engajamento) */}
        <div className="absolute top-8 left-12 right-12 flex justify-between items-start pointer-events-none">
          {/* Top Left Controls: Exit & Map Toggle */}
          <div className="flex flex-col gap-4 pointer-events-auto">
            {!isMapOpen && (
              <button 
                onClick={() => setIsMapOpen(true)}
                className="flex items-center gap-3 text-[10px] font-sans font-bold tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors uppercase"
              >
                <Activity className="w-4 h-4" /> Mapa Processual
              </button>
            )}
            {onExit && (
               <button 
                 onClick={onExit}
                 className="flex items-center gap-3 text-[10px] font-sans font-bold tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors uppercase"
               >
                 <X className="w-4 h-4" /> Encerrar Pregação
               </button>
            )}
            
            <AnimatePresence>
               {activeParentVerse ? (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="max-w-md pointer-events-auto mt-4"
                >
                  <div className="px-5 py-3 border border-border/50 bg-surface/50 backdrop-blur-md rounded-lg shadow-sm">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-1 block">Contexto Base Atual</span>
                    <p className="font-serif text-muted-foreground text-sm line-clamp-2 italic">
                      &quot;{activeParentVerse.content}&quot;
                    </p>
                  </div>
                </motion.div>
              ) : <div />}
            </AnimatePresence>
          </div>

          {/* Kinetic Status Timer */}
          <div className="flex flex-col items-end gap-1 pointer-events-auto">
            {(() => {
              const totalSeconds = targetTime * 60;
              const elapsed = totalSeconds - timer;
              const percentage = Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
              const currentHue = Math.max(0, 120 - (percentage / 100) * 120);
              
              return (
                <motion.div 
                  animate={{ 
                    color: isWrappingUp ? '#ff4444' : '#ffffff',
                    backgroundColor: `hsla(${currentHue}, 70%, 50%, 0.15)`,
                    borderColor: `hsla(${currentHue}, 70%, 50%, 0.3)`
                  }}
                  className="px-6 py-3 rounded-full border shadow-sm font-mono text-4xl tracking-tighter flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity backdrop-blur-md"
                  onClick={() => setIsEditingTimer(true)}
                >
                  {isWrappingUp && <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}><AlertCircle className="w-6 h-6" /></motion.div>}
              {isEditingTimer ? (
                <input 
                  type="number" 
                  className="bg-transparent border-b border-border w-24 text-right outline-none text-foreground" 
                  defaultValue={Math.floor(timer / 60)} 
                  autoFocus 
                  onBlur={(e) => {
                    const mins = parseInt(e.target.value);
                    if (!isNaN(mins) && mins > 0) setTimer(mins * 60);
                    setIsEditingTimer(false);
                    setIsWrappingUp(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              ) : formatTime(timer)}
            </motion.div>
            );
            })()}
            
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase opacity-40">
              <Activity className="w-3 h-3" />
              Pulse: {Math.round(congregationHeat)}%
            </div>
          </div>
        </div>

        {/* Focus Stage Active Block */}
        <div className="w-full max-w-5xl relative z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBlock.id}
              initial={{ x: 30, opacity: 0, filter: 'blur(5px)' }}
              animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ x: -30, opacity: 0, filter: 'blur(5px)' }}
              transition={{ type: 'spring', stiffness: 120, damping: 25 }}
              className="w-full"
              onDoubleClick={() => !editingBlockId && markAsPreached(activeBlock.id)}
            >
              <div className="relative p-12">
                
                {/* Tone Line Indicator for Main Canvas */}
                <motion.div 
                  layoutId="active-stage-tone"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 rounded-full"
                  style={{ backgroundColor: activeToneColor, boxShadow: `0 0 20px ${activeToneColor}` }}
                />

                {/* Edit Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBlockId(editingBlockId === activeBlock.id ? null : activeBlock.id);
                  }}
                  className="absolute top-0 right-0 p-3 rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground backdrop-blur-md opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-50 cursor-pointer"
                  style={{ opacity: editingBlockId === activeBlock.id ? 1 : undefined }}
                >
                  {editingBlockId === activeBlock.id ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>

                <div className={cn(
                  "relative mx-auto text-left pl-8",
                  activeBlock.type === 'TEXTO_BASE' ? "max-w-4xl" : "max-w-3xl"
                )}>
                  {activeBlock.type === 'TEXTO_BASE' && <Quote className="absolute -top-8 -left-2 w-16 h-16 text-foreground opacity-5 -z-10" />}

                  {editingBlockId === activeBlock.id ? (
                    <div className="flex flex-col gap-6 items-start w-full">
                      <textarea
                        defaultValue={activeBlock.content}
                        className={cn(
                          "w-full bg-transparent border-b border-border text-left outline-none resize-none pb-4 transition-all focus:border-[var(--color-exegesis)] overflow-hidden",
                          activeBlock.metadata.font || CATEGORY_MAP[activeBlock.type].defFont,
                          activeBlock.type === 'TEXTO_BASE' ? "text-[4.5rem] leading-[1.1] text-foreground" : "text-4xl leading-tight text-muted-foreground font-light"
                        )}
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.shiftKey) {
                            e.preventDefault();
                            saveBlockEdits(activeBlock.id, e.currentTarget.value, activeBlock.metadata.customColor || '');
                          }
                        }}
                        onBlur={(e) => saveBlockEdits(activeBlock.id, e.target.value, activeToneColor)}
                      />
                      
                      <div className="flex items-center gap-6 w-full mt-2">
                        <div className="flex gap-2">
                          {['#64748b', '#a8a29e', '#737373', '#e2e8f0', '#d6d3d1'].map(color => (
                            <button
                              key={color}
                              onClick={(e) => { e.stopPropagation(); saveBlockEdits(activeBlock.id, activeBlock.content, color); }}
                              className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-125", activeToneColor === color ? "scale-125 border-foreground" : "border-transparent")}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                           {['font-sans', 'font-serif', 'font-modern', 'font-theological', 'font-mono'].map(f => (
                             <button
                               key={f}
                               onClick={(e) => { e.stopPropagation(); saveBlockEdits(activeBlock.id, activeBlock.content, activeToneColor, f); }}
                               className={cn(
                                 "px-3 py-1.5 text-[10px] rounded border transition-all whitespace-nowrap uppercase tracking-widest",
                                 (activeBlock.metadata.font || CATEGORY_MAP[activeBlock.type].defFont) === f ? "bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                               )}
                             >
                               {f.split('-')[1]?.toUpperCase() || f.toUpperCase()}
                             </button>
                           ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Shift + Enter para salvar rapidamente</p>
                    </div>
                  ) : (
                    <div className="flex flex-col relative">
                      <p className={cn(
                        "transition-colors duration-700 tracking-tight whitespace-pre-wrap cursor-pointer z-10",
                        activeBlock.metadata.font || CATEGORY_MAP[activeBlock.type].defFont,
                        activeBlock.type === 'TEXTO_BASE' ? "text-[4.5rem] leading-[1.1] text-foreground font-medium" : "text-[2.5rem] leading-[1.3] text-foreground/90 font-light"
                      )}
                      onClick={() => goToNextBlock()}
                      >
                        {activeBlock.content}
                      </p>

                      {/* Visual Preview of Upcoming Theological Paths */}
                      {upcomingSubBlocks.length > 0 && (
                        <div className="mt-20 relative flex flex-col gap-8 pl-12">
                           
                           {/* Head of the trail */}
                           <span className="absolute -top-7 -left-0 text-[9px] font-sans tracking-[0.2em] font-bold uppercase text-muted-foreground/50 flex items-center gap-2 mb-6 z-10">
                             Trilha Sequencial
                           </span>
                           
                           <div className="flex flex-col gap-6 relative z-10">
                             {upcomingSubBlocks.map((subBlock, idx) => {
                               const subColor = subBlock.metadata.customColor || CATEGORY_MAP[subBlock.type].color;
                               const relativeDepth = (subBlock.metadata.depth || 0) - currentDepth - 1;
                               const isFirst = idx === 0;
                               
                               return (
                                 <div 
                                   key={subBlock.id} 
                                   className="flex items-start gap-8 group cursor-pointer transition-all duration-300 relative" 
                                   onClick={(e) => { e.stopPropagation(); setActiveIndex(activeIndex + idx + 1); }}
                                   style={{ marginLeft: `${relativeDepth * 2}rem` }}
                                 >
                                   {/* The Neon Bar connector from your screenshot */}
                                   {isFirst ? (
                                     <motion.div 
                                       initial={{ height: 0, opacity: 0 }}
                                       animate={{ height: '100%', opacity: 1 }}
                                       className="absolute -left-12 top-2 bottom-0 w-1.5 rounded-full z-20 shadow-[0_0_20px_rgba(0,255,108,0.5)] bg-[#00ff6c]" 
                                     />
                                   ) : (
                                     <div className="absolute -left-12 top-2 bottom-0 w-1 rounded-full z-20 bg-border/20 group-hover:bg-[#00ff6c]/50 transition-colors" />
                                   )}
                                   
                                   
                                   {/* Plain Clean Text representation instead of boxes */}
                                   <div className="flex flex-col gap-3 flex-1 max-w-2xl group-hover:translate-x-2 transition-transform duration-500">
                                     <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 opacity-60">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subColor }} />
                                          <span className="text-[9px] font-sans font-bold tracking-[0.2em] uppercase" style={{ color: subColor }}>
                                            {CATEGORY_MAP[subBlock.type].label}
                                          </span>
                                        </div>
                                     </div>
                                     <p className="text-xl font-sans font-light text-muted-foreground line-clamp-3 leading-relaxed opacity-70 group-hover:opacity-100 group-hover:text-foreground transition-all duration-300">
                                       {subBlock.content}
                                     </p>
                                   </div>
                                 </div>
                               )
                             })}
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-12 text-left pl-8 opacity-40">
                  <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] font-mono uppercase text-foreground">
                    {activeBlock.type !== 'TEXTO_BASE' ? <Sparkles className="w-3 h-3 text-[var(--color-application)]" /> : <MapPin className="w-3 h-3 text-muted-foreground" />}
                    <span>{CATEGORY_MAP[activeBlock.type].label}</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Progress Line Map */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface flex">
           {blocks.map((b, i) => (
             <div 
               key={'prog-'+b.id} 
               className="h-full transition-all duration-500" 
               style={{ 
                 width: `${100 / blocks.length}%`, 
                 backgroundColor: i <= activeIndex ? (b.metadata.customColor || CATEGORY_MAP[b.type].color) : 'transparent',
                 opacity: i === activeIndex ? 1 : 0.3
               }} 
             />
           ))}
        </div>
      </section>
    </main>
  );
}
