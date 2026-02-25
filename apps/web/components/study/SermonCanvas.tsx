"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Share2, Cloud, BookOpen, Lightbulb, Quote, Target, Trash2, HelpCircle, GripVertical, AlertTriangle, ArrowRight, CornerDownRight, Sparkles, ChevronDown, Info, X, MapPin, History, Plus, CheckCircle2, Link as LinkIcon, ArrowLeft, Play, Maximize2, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Perspectiva Teológica
export type TheologyCategory = 'TEXTO_BASE' | 'EXEGESE' | 'APLICACAO' | 'ILUSTRACAO' | 'ENFASE' | 'CUSTOMIZAR';

export interface SermonBlock {
  id: string;
  type: TheologyCategory;
  content: string;
  metadata: {
    font?: string;
    customColor?: string;
    customLabel?: string;
    parentVerseId?: string; 
    bibleSourceId?: string; 
    depth?: number;
    isInsight?: boolean;
    insightStatus?: 'PENDING' | 'COMPLETED';
    reference?: string;
    verseText?: string;
    revelation?: string;
  };
}

const CATEGORY_MAP: Record<TheologyCategory, { label: string, color: string, icon: React.ReactNode, defFont: string }> = {
  TEXTO_BASE: { label: 'Texto Base (Bíblico)', color: 'var(--color-texto)', icon: <BookOpen className="w-4 h-4" />, defFont: 'font-serif' },
  EXEGESE: { label: 'Hermenêutica / Exegese', color: 'var(--color-exegese)', icon: <HelpCircle className="w-4 h-4" />, defFont: 'font-sans' },
  APLICACAO: { label: 'Aplicação Pastoral', color: 'var(--color-aplicacao)', icon: <Target className="w-4 h-4" />, defFont: 'font-modern' },
  ILUSTRACAO: { label: 'Ilustração', color: 'var(--color-ilustracao)', icon: <Lightbulb className="w-4 h-4" />, defFont: 'font-theological' },
  ENFASE: { label: 'Ênfase / Chamada', color: 'var(--color-enfase)', icon: <AlertTriangle className="w-4 h-4" />, defFont: 'font-sans' },
  CUSTOMIZAR: { label: 'Customizar...', color: 'var(--color-custom)', icon: <Sparkles className="w-4 h-4" />, defFont: 'font-sans' }
};

interface SermonCanvasProps {
  sermonId: string;
  initialData?: any;
  onBack?: () => void;
  onStart?: () => void;
}

export default function SermonCanvas({ sermonId, initialData, onBack, onStart }: SermonCanvasProps) {
  const [blocks, setBlocks] = useState<SermonBlock[]>(initialData?.blocks || []);
  const [loading, setLoading] = useState(!initialData);
  const [sermonMeta, setSermonMeta] = useState<any>(initialData || null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { isConnected, syncCanvas, syncMeta } = useSermonSocket(sermonId);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBibleExpanded, setIsBibleExpanded] = useState(false);
  const [newHistory, setNewHistory] = useState({
    location: '',
    city: '',
    notes: ''
  });
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<{ id: string; type: 'category' | 'font' | 'link' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialMetaRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on mount and changes
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [sermonMeta?.title, loading]);
  useEffect(() => {
    const { environment } = require('@/environments');
    const fetchSermon = async () => {
      try {
        const res = await fetch(`${environment.apiUrl}/sermons/${sermonId}`);
        const data = await res.json();
        setSermonMeta(data);
        if (data && data.blocks) {
          setBlocks(data.blocks.map((b: any) => ({
            id: b.id,
            type: b.type as TheologyCategory,
            content: b.content,
            metadata: b.metadata || {}
          })));
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sermon:", error);
        setLoading(false);
      }
    };
    fetchSermon();
  }, [sermonId]);

  const handleContentChange = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };
  
  const handleCategoryChange = (id: string, newType: TheologyCategory) => {
    setBlocks(prev => prev.map(b => b.id === id ? { 
      ...b, 
      type: newType, 
      metadata: { ...b.metadata, font: CATEGORY_MAP[newType].defFont, customLabel: newType === 'CUSTOMIZAR' ? (b.metadata.customLabel || 'Meu Título') : undefined } 
    } : b));
    setActiveDropdown(null);
  };

  const handleCustomLabelChange = (id: string, newLabel: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, customLabel: newLabel } } : b));
  };

  const handleFontChange = (id: string, newFont: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, font: newFont } } : b));
    setActiveDropdown(null);
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleIndent = (id: string, delta: number) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newDepth = Math.max(0, (b.metadata.depth || 0) + delta);
      return { ...b, metadata: { ...b.metadata, depth: newDepth } };
    }));
  };

  const addBlock = (type: TheologyCategory) => {
    const newBlock: SermonBlock = {
      id: `new-${Date.now()}`,
      type,
      content: '',
      metadata: { font: CATEGORY_MAP[type].defFont, depth: 0 }
    };
    setBlocks(prev => [...prev, newBlock]);
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 100);
  };

  const handleColorChange = (id: string, newColor: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, customColor: newColor } } : b));
  };

  const handleLinkToVerse = (blockId: string, bibleSourceId: string, verseId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { 
      ...b, 
      metadata: { ...b.metadata, bibleSourceId, parentVerseId: verseId } 
    } : b));
    setActiveDropdown(null);
  };

  const handleMetaChange = (field: string, value: any) => {
    setSermonMeta((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateBibleSource = (index: number, field: string, value: string) => {
    const newSources = [...(sermonMeta?.bibleSources || [])];
    newSources[index] = { ...newSources[index], [field]: value };
    handleMetaChange('bibleSources', newSources);
  };

  const addBibleSource = () => {
    const newSources = [...(sermonMeta?.bibleSources || []), { id: `src-${Date.now()}`, reference: '', content: '' }];
    handleMetaChange('bibleSources', newSources);
  };

  const removeBibleSource = (index: number) => {
    const newSources = (sermonMeta?.bibleSources || []).filter((_: any, i: number) => i !== index);
    handleMetaChange('bibleSources', newSources);
  };

  const handleSave = async () => {
    if (!sermonMeta) return;
    setIsSaving(true);
    try {
      const payload = {
        title: sermonMeta.title,
        category: sermonMeta.category,
        status: sermonMeta.status,
        bibleSources: sermonMeta.bibleSources,
      };

      const { environment } = require('@/environments');
      // Save metadata
      await fetch(`${environment.apiUrl}/sermons/${sermonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Save blocks (Sync full sermon on backend)
      await fetch(`${environment.apiUrl}/sermons/${sermonId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      });

      initialMetaRef.current = JSON.stringify(payload);
    } catch (e) {
      console.error("Failed to manual save", e);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  // Auto-sync blocks to socket whenever they change (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0) {
        syncCanvas(blocks.map((n, idx) => ({
          ...n,
          id: String(n.id),
          order: idx,
          positionX: 0,
          positionY: 0
        })));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [blocks, syncCanvas]);

  // Auto-sync metadata (title, category, bibleSources) to socket (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sermonMeta) {
        syncMeta({
          title: sermonMeta.title,
          category: sermonMeta.category,
          bibleSources: sermonMeta.bibleSources
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [sermonMeta, syncMeta]);

  const handleAddHistory = async () => {
    if (!newHistory.location) return;
    try {
      const { environment } = require('@/environments');
      const res = await fetch(`${environment.apiUrl}/sermons/${sermonId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newHistory })
      });
      const data = await res.json();
      setSermonMeta((prev: any) => ({
        ...prev,
        history: [data, ...(prev.history || [])]
      }));
      setNewHistory({ location: '', city: '', notes: '' });
      setIsAddingHistory(false);
    } catch (e) {
      console.error("Failed to add history", e);
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center font-mono text-[10px] tracking-[0.5em] animate-pulse">
      CARREGANDO STUDIO...
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-background text-foreground pb-32 transition-all duration-700">
      {/* GLOBAL TOP NAVIGATION - PREMIUM WORKBENCH STYLE */}
      <header className="h-24 sticky top-0 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-12 z-50">
        <div className="flex items-center gap-8">
          {onBack && (
            <button 
              onClick={onBack}
              className="group flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-border hover:bg-foreground hover:text-background transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <h1 className="text-2xl font-sans tracking-tight">
            <span className="font-bold">Preachfy</span> 
            <span className="font-light opacity-40 ml-2 uppercase text-[10px] tracking-[0.2em] relative top-[-1px]">Studio</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest border transition-all duration-500 shadow-sm",
            isConnected ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/20" : "text-muted-foreground bg-surface border-border"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", isConnected && "animate-pulse")} /> 
            <span className="max-sm:hidden">{isConnected ? 'SINC. ATIVA' : 'OFFLINE'}</span>
          </div>

          <div className="h-8 w-px bg-border/40" />
          
          <ThemeToggle />

          <Button 
            variant="default"
            className="font-sans text-[11px] font-black gap-2 tracking-[0.1em] h-11 px-8 bg-indigo-600 text-white hover:bg-indigo-700 rounded-full transition-all shadow-xl shadow-indigo-500/20 active:scale-95 group"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <CheckCircle2 className="w-4 h-4 animate-pulse" /> : <Cloud className="w-4 h-4 group-hover:scale-110 transition-transform" />}
            {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </Button>
          
          <button 
            onClick={() => setIsDetailsOpen(true)}
            className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all text-muted-foreground hover:border-foreground active:scale-90"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto mt-16 px-12 !overflow-visible">
        {/* Sermon Header (The Theme) - PREMIUM COMPACT */}
        <div className="mb-12 flex flex-col gap-2">
          <textarea 
            ref={titleRef}
            value={sermonMeta?.title || ''}
            onChange={e => handleMetaChange('title', e.target.value)}
            placeholder="Título do Sermão..."
            rows={1}
            onInput={(e) => {
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
            }}
            className="w-full bg-transparent border-none outline-none font-serif text-2xl md:text-3xl lg:text-4xl font-bold italic tracking-tight text-foreground placeholder:opacity-10 leading-tight focus:placeholder:opacity-5 transition-all resize-none !overflow-visible"
          />
          <div className="flex items-center gap-3 mt-4 ml-1">
             <span className="text-[10px] font-sans font-black tracking-[0.4em] uppercase opacity-30">Categoria:</span>
             <span className="text-[11px] font-sans font-black tracking-[0.3em] uppercase text-foreground px-4 py-1 rounded-full bg-surface border border-border">{sermonMeta?.category || 'Geral'}</span>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[10px] font-sans font-black tracking-[0.4em] uppercase opacity-30 flex items-center gap-2">
               <BookOpen className="w-3.5 h-3.5 text-foreground/40" /> Fontes Bíblicas
             </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBibleExpanded(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-[9px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all shadow-sm hover:border-foreground active:scale-95"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Expandir
                </button>
                <button 
                  onClick={addBibleSource}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white border border-indigo-500 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Fonte
                </button>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(sermonMeta?.bibleSources || []).map((source: any, idx: number) => (
              <div key={source.id || idx} className="p-6 rounded-[2rem] bg-surface/30 border border-border shadow-sm backdrop-blur-xl relative group/source transition-all hover:border-border/80">
                <div className="absolute top-2 right-4 opacity-0 group-hover/source:opacity-100 transition-opacity">
                   <button onClick={() => removeBibleSource(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors active:scale-90">
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-0.5">
                    <input 
                      type="text"
                      placeholder="Referência (Ex: João 1)"
                      value={source.reference}
                      onChange={e => updateBibleSource(idx, 'reference', e.target.value)}
                      className="bg-transparent border-none outline-none font-mono text-[11px] text-foreground font-bold uppercase tracking-widest placeholder:opacity-20 focus:text-indigo-500 transition-colors"
                    />
                  </div>
                  <textarea 
                    placeholder="Texto bíblico..."
                    className="w-full bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-foreground/80 placeholder:text-muted-foreground/20 min-h-[60px] custom-scrollbar focus:text-foreground transition-all"
                    value={source.content}
                    onChange={e => updateBibleSource(idx, 'content', e.target.value)}
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Banner - COMPACT */}
        <div className="mb-8 p-6 rounded-[2.5rem] bg-foreground/[0.03] border border-border backdrop-blur-xl relative overflow-hidden group">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-12 h-12 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-lg font-sans font-medium leading-relaxed text-muted-foreground max-w-2xl">
              Estruture sua trilha abaixo. Vincule blocos às <span className="text-foreground font-bold">Fontes Bíblicas</span> e use o <span className="text-foreground font-bold">Aninhamento</span> para profundidade.
            </p>
          </div>
        </div>

        <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="flex flex-col gap-4 !overflow-visible">
          <AnimatePresence>
            {blocks.map((block) => {
              const cat = CATEGORY_MAP[block.type as TheologyCategory];
              const linkedSource = sermonMeta?.bibleSources?.find((s: any) => s.id === block.metadata.bibleSourceId) || (sermonMeta?.bibleSources?.length > 0 ? sermonMeta.bibleSources[0] : null);

              return (
                <Reorder.Item 
                  key={block.id} 
                  value={block}
                  className={cn(
                    "relative group bg-surface border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-foreground/10 transition-all duration-500 backdrop-blur-3xl !overflow-visible",
                    activeDropdown?.id === block.id ? "z-[100]" : "z-10"
                  )}
                  style={{ 
                    marginLeft: `${(block.metadata.depth || 0) * 1.5}rem`
                  }}
                >
                  {/* Category Highlight - Integrated with card boundary */}
                  <div 
                    className="absolute inset-[0] border-l-[6px] rounded-[2rem] pointer-events-none z-0" 
                    style={{ borderColor: block.metadata.customColor || CATEGORY_MAP[block.type as TheologyCategory].color }} 
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing text-muted-foreground p-1 hover:bg-muted rounded-lg transition-all z-20">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="flex flex-col gap-4 pl-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="relative group/select">
                          <div 
                            className="flex items-center border border-border bg-surface hover:bg-muted transition-all px-4 py-1.5 rounded-full gap-2 cursor-pointer min-w-[150px] justify-center shadow-sm active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown?.id === block.id && activeDropdown?.type === 'category' ? null : { id: block.id, type: 'category' });
                            }}
                          >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] shadow-lg shrink-0" style={{ backgroundColor: cat.color }}>
                              {cat.icon}
                            </div>
                            
                            <span className="font-sans text-[10px] font-black tracking-widest uppercase text-foreground select-none">
                              {CATEGORY_MAP[block.type as TheologyCategory].label.split(' ')[0]}
                            </span>

                            <ChevronDown className={cn(
                              "w-3.5 h-3.5 opacity-20 group-hover/select:opacity-100 transition-all",
                              activeDropdown?.id === block.id && activeDropdown?.type === 'category' && "rotate-180 opacity-100"
                            )} />
                          </div>

                          <AnimatePresence>
                            {activeDropdown?.id === block.id && activeDropdown.type === 'category' && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute top-full left-0 w-80 mt-3 bg-background border border-border rounded-[2rem] shadow-2xl z-[60] overflow-hidden py-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                                  <div
                                    key={k}
                                    onClick={() => handleCategoryChange(block.id, k as TheologyCategory)}
                                    className={cn(
                                      "px-8 py-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-between hover:bg-foreground hover:text-background cursor-pointer",
                                      block.type === k ? "text-indigo-500 bg-indigo-500/5" : "text-foreground/80"
                                    )}
                                  >
                                    {v.label}
                                    {block.type === k && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Link to Bible Source Dropdown */}
                        <div className="relative">
                          <div 
                            className={cn(
                              "px-4 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 cursor-pointer shadow-sm",
                              block.metadata.parentVerseId ? "bg-indigo-500 text-white border-indigo-600" : "bg-surface border-border text-muted-foreground/60 hover:border-foreground/30 hover:text-foreground"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown?.id === block.id && activeDropdown?.type === 'link' ? null : { id: block.id, type: 'link' });
                            }}
                          >
                             <LinkIcon className="w-3.5 h-3.5" />
                             {block.metadata.parentVerseId ? `${linkedSource?.reference || 'Ref'}${block.metadata.parentVerseId === 'ALL' ? '' : ':' + block.metadata.parentVerseId}` : 'Vincular'}
                          </div>

                          <AnimatePresence>
                            {activeDropdown?.id === block.id && activeDropdown.type === 'link' && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-3 w-80 bg-background border border-border rounded-[2rem] shadow-2xl z-[60] p-8 max-h-[400px] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                                 {(sermonMeta?.bibleSources || []).map((source: any) => {
                                    const verses = (source.content || '').split('\n').map((l: string) => l.match(/^(\d+)/)?.[1]).filter(Boolean);
                                    return (
                                      <div key={source.id} className="mb-6 last:mb-0">
                                        <div className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/40 mb-3 px-2 border-l-2 border-border ml-1">{source.reference || 'Sem Ref.'}</div>
                                        <div className="grid grid-cols-5 gap-2">
                                           <button 
                                             onClick={() => handleLinkToVerse(block.id, source.id, 'ALL')}
                                             className={cn(
                                               "col-span-5 p-2 text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-foreground hover:text-background transition-all",
                                               block.metadata.parentVerseId === 'ALL' && block.metadata.bibleSourceId === source.id ? "bg-indigo-500 text-white shadow-lg" : "bg-muted text-foreground/60"
                                             )}
                                           >
                                             Toda a Fonte
                                           </button>
                                           {verses.map((v: string) => (
                                             <button 
                                               key={v} 
                                               onClick={() => handleLinkToVerse(block.id, source.id, v)}
                                               className={cn(
                                                 "p-2 text-[11px] font-mono rounded-lg hover:bg-foreground hover:text-background transition-all",
                                                 block.metadata.parentVerseId === v && block.metadata.bibleSourceId === source.id ? "bg-indigo-500 text-white shadow-lg" : "bg-muted text-foreground/60"
                                               )}
                                             >
                                               {v}
                                             </button>
                                           ))}
                                        </div>
                                      </div>
                                    );
                                 })}
                                 {(sermonMeta?.bibleSources || []).length === 0 && (
                                   <p className="text-[11px] text-center opacity-40 font-medium py-4">Adicione uma fonte bíblica primeiro.</p>
                                 )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="relative group/font">
                          <div 
                            className="w-full min-w-[150px] bg-surface border border-border rounded-lg text-[10px] font-mono text-muted-foreground px-4 py-1.5 hover:border-foreground/30 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown?.id === block.id && activeDropdown?.type === 'font' ? null : { id: block.id, type: 'font' });
                            }}
                          >
                             <span className="truncate tracking-widest uppercase">
                               {block.metadata.font === 'font-sans' ? 'Outfit' : block.metadata.font === 'font-serif' ? 'Playfair' : block.metadata.font === 'font-modern' ? 'Sans-UI' : block.metadata.font === 'font-theological' ? 'Lora' : block.metadata.font === 'font-mono' ? 'JetBrains' : 'Default'}
                             </span>
                             <ChevronDown className={cn("w-3.5 h-3.5 opacity-20", activeDropdown?.id === block.id && activeDropdown?.type === 'font' && "rotate-180 opacity-100")} />
                          </div>

                          <AnimatePresence>
                            {activeDropdown?.id === block.id && activeDropdown.type === 'font' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                                className="absolute top-full left-0 w-80 mt-3 bg-background border border-border rounded-[2rem] shadow-2xl z-[60] py-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[
                                  { id: 'font-sans', label: 'Outfit' },
                                  { id: 'font-serif', label: 'Playfair' },
                                  { id: 'font-modern', label: 'Sans-UI' },
                                  { id: 'font-theological', label: 'Lora' },
                                  { id: 'font-mono', label: 'JetBrains' }
                                ].map((f) => (
                                  <div 
                                    key={f.id} 
                                    onClick={() => handleFontChange(block.id, f.id)} 
                                    className={cn(
                                      "px-6 py-3 text-[11px] font-mono transition-all flex items-center justify-between hover:bg-foreground hover:text-background cursor-pointer uppercase tracking-widest", 
                                      (block.metadata.font || cat.defFont) === f.id ? "text-foreground bg-foreground/5 font-bold" : "text-muted-foreground/60"
                                    )}
                                  >
                                    {f.label}
                                    {(block.metadata.font || cat.defFont) === f.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex items-center bg-surface border border-border rounded-lg shadow-sm overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <button onClick={() => handleIndent(block.id, -1)} disabled={!block.metadata.depth} className="px-4 py-1.5 text-muted-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-20 text-[9px] font-black uppercase tracking-[0.2em] border-r border-border">Recuar</button>
                          <button onClick={() => handleIndent(block.id, 1)} className="px-4 py-1.5 text-muted-foreground hover:bg-foreground hover:text-background transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">Aninhar <CornerDownRight className="w-3.5 h-3.5" /></button>
                        </div>

                        <button 
                          onClick={() => deleteBlock(block.id)}
                          className="w-9 h-9 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500 hover:text-white shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                       {['var(--color-texto)', 'var(--color-exegese)', 'var(--color-aplicacao)', 'var(--color-ilustracao)', 'var(--color-enfase)', 'var(--color-custom)'].map(color => (
                         <button
                           key={color}
                           onClick={() => handleColorChange(block.id, color)}
                           className={cn("w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-all shadow-sm", block.metadata.customColor === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                       <button onClick={() => handleColorChange(block.id, '')} className="text-[10px] font-sans font-black tracking-widest opacity-30 hover:opacity-100 ml-3 uppercase">Reset Style</button>
                    </div>

                    <div className="relative pt-2 pl-4 border-l-2 focus-within:border-foreground transition-all duration-500" style={{ borderColor: (block.metadata.customColor || cat.color) + '40' }}>
                      {block.metadata.isInsight && (
                        <div className="mb-4 flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-lg uppercase tracking-tighter">
                              REVELAÇÃO: {block.metadata.reference}
                            </span>
                            {block.metadata.insightStatus === 'PENDING' && (
                              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> Lembrete Pendente
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-serif italic text-foreground opacity-30 leading-relaxed border-l-[3px] border-border/20 pl-4 py-1">
                            "{block.metadata.verseText}"
                          </p>
                        </div>
                      )}
                      
                      {block.type === 'TEXTO_BASE' && <Quote className="absolute -top-6 -left-8 w-12 h-12 text-foreground opacity-[0.02] -z-10" />}
                      <textarea
                        value={block.content}
                        onChange={(e) => handleContentChange(block.id, e.target.value)}
                        placeholder={block.metadata.isInsight ? "Escreva aqui a revelação sobre este versículo..." : `Escreva aqui...`}
                        className={cn(
                          "w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:opacity-10 text-lg leading-relaxed text-foreground opacity-90 transition-all focus:opacity-100", 
                          block.metadata.font || cat.defFont,
                          block.metadata.isInsight && block.metadata.insightStatus === 'PENDING' && "placeholder:opacity-30"
                        )}
                        rows={1}
                        onInput={(e) => {
                          e.currentTarget.style.height = 'auto';
                          e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
                        }}
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>

        <div className="mt-12 w-full p-8 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-surface/20 hover:bg-surface/50 transition-all duration-500 group cursor-pointer">
           <div className="flex flex-col items-center gap-1">
             <h3 className="text-[10px] font-sans font-black tracking-[0.3em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Adicionar Bloco Teológico</h3>
           </div>
           <div className="flex flex-wrap items-center justify-center gap-3">
             {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
               <Button key={key} variant="outline" className="gap-2.5 rounded-full font-sans text-[10px] font-bold tracking-[0.05em] uppercase shadow-sm bg-surface hover:scale-105 transition-all h-9 px-6 border-border hover:border-foreground active:scale-95" onClick={() => addBlock(key as TheologyCategory)}>
                 <span className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: cat.color }} />
                 {cat.label.split(' ')[0]}
               </Button>
             ))}
           </div>
        </div>
      </main>

      <AnimatePresence>
        {isBibleExpanded && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBibleExpanded(false)} className="fixed inset-0 bg-background/80 backdrop-blur-2xl z-[200]" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="fixed inset-12 bg-surface/50 border border-border rounded-[4rem] z-[201] shadow-2xl flex flex-col overflow-hidden backdrop-blur-3xl"
            >
              <div className="p-12 border-b border-border flex items-center justify-between bg-foreground/[0.02]">
                <div>
                  <h2 className="text-[2.5rem] font-serif font-black italic tracking-tight">Fontes Bíblicas</h2>
                  <p className="text-[11px] font-sans font-black tracking-[0.4em] uppercase opacity-30 mt-2">Leitura em Profundidade</p>
                </div>
                <button onClick={() => setIsBibleExpanded(false)} className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all shadow-xl active:scale-95"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar-premium grid grid-cols-2 gap-8 pb-32">
                {(sermonMeta?.bibleSources || []).map((source: any, idx: number) => (
                  <div key={source.id} className="p-10 rounded-[3rem] bg-surface border border-border shadow-xl min-h-[400px] flex flex-col gap-6 group/item relative">
                    <div className="absolute top-6 right-8 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button onClick={() => removeBibleSource(idx)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-full transition-all active:scale-90">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={source.reference} 
                      onChange={e => updateBibleSource(idx, 'reference', e.target.value)}
                      placeholder="Referência..."
                      className="bg-transparent border-none outline-none font-mono text-base font-black text-indigo-500 uppercase tracking-[0.2em] placeholder:opacity-20"
                    />
                    <textarea 
                      value={source.content} 
                      onChange={e => updateBibleSource(idx, 'content', e.target.value)}
                      placeholder="Cole aqui o texto bíblico..."
                      className="w-full h-full bg-transparent border-none outline-none resize-none font-serif text-[1.4rem] leading-relaxed text-foreground opacity-80 focus:opacity-100 transition-all custom-scrollbar"
                    />
                  </div>
                ))}
                <button 
                  onClick={addBibleSource}
                  className="rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 hover:bg-foreground/5 transition-all group min-h-[400px]"
                >
                  <Plus className="w-12 h-12 text-muted-foreground group-hover:scale-110 group-hover:text-foreground transition-all" />
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-100">Nova Fonte</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailsOpen(false)} className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-surface/95 backdrop-blur-3xl border-l border-border z-[101] shadow-2xl flex flex-col">
              <div className="p-10 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-bold italic tracking-tight">Administração</h2>
                  <p className="text-[10px] font-sans font-black tracking-[0.3em] uppercase opacity-30">Métricas & Histórico</p>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="flex flex-col gap-8 mb-12">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Título do Sermão</label>
                    <input type="text" value={sermonMeta?.title || ''} onChange={e => handleMetaChange('title', e.target.value)} className="bg-transparent text-xl font-serif outline-none border-b border-border/40 focus:border-foreground transition-all font-bold italic py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Categoria</label>
                      <select value={sermonMeta?.category || 'Geral'} onChange={e => handleMetaChange('category', e.target.value)} className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-foreground transition-all">{['Geral', 'Evangelística', 'Expositiva', 'Temática', 'Doutrinária', 'Festiva', 'Estudo Bíblico'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Status</label>
                      <select value={sermonMeta?.status || 'DRAFT'} onChange={e => handleMetaChange('status', e.target.value)} className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-foreground transition-all">{['DRAFT', 'READY', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-border/40 mb-12" />
                <div className="flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-sans font-black tracking-[0.3em] uppercase">Registros de Ministração</h3>
                    <Button variant="outline" size="sm" onClick={() => setIsAddingHistory(!isAddingHistory)} className="rounded-full h-10 px-6 text-[11px] font-black uppercase tracking-widest border-border hover:border-foreground">{isAddingHistory ? 'FECHAR' : 'NOVO REGISTRO'}</Button>
                  </div>
                  {isAddingHistory && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-foreground/5 border border-border rounded-[2.5rem] flex flex-col gap-5">
                      <input placeholder="Igreja ou Local" className="bg-transparent border-b border-border p-3 text-base outline-none font-medium placeholder:opacity-20" value={newHistory.location} onChange={e => setNewHistory({...newHistory, location: e.target.value})} />
                      <input placeholder="Cidade / Estado" className="bg-transparent border-b border-border p-3 text-base outline-none font-medium placeholder:opacity-20" value={newHistory.city} onChange={e => setNewHistory({...newHistory, city: e.target.value})} />
                      <textarea placeholder="Observações e Feedback..." className="bg-transparent border-b border-border p-3 text-base h-24 resize-none outline-none font-medium placeholder:opacity-20" value={newHistory.notes} onChange={e => setNewHistory({...newHistory, notes: e.target.value})} />
                      <Button onClick={handleAddHistory} className="h-12 text-[11px] font-black uppercase tracking-widest rounded-2xl">SALVAR REGISTRO</Button>
                    </motion.div>
                  )}
                  {(sermonMeta?.history || []).length === 0 && !isAddingHistory && (
                    <div className="px-10 py-16 text-center border border-dashed border-border rounded-[2.5rem] opacity-20 text-[11px] font-black uppercase tracking-[0.3em]">Nenhum histórico registrado</div>
                  )}
                  {(sermonMeta?.history || []).map((h: any) => (
                    <div key={h.id} className="p-8 border border-border rounded-[2.5rem] bg-surface/50 hover:bg-surface hover:shadow-xl transition-all duration-500 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-indigo-500">{new Date(h.date).toLocaleDateString('pt-BR')}</div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-3 mb-3"><MapPin className="w-4 h-4 text-muted-foreground" /><span className="text-lg font-bold font-serif italic">{h.location}</span><span className="text-sm opacity-40 font-sans">{h.city}</span></div>
                      {h.notes && <p className="text-base italic text-muted-foreground/80 leading-relaxed pl-7 border-l-2 border-border/40">&quot;{h.notes}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FIXED ACTION BAR AT THE BOTTOM */}
      <footer className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 px-8 py-4 bg-foreground/90 text-background backdrop-blur-xl rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
         <div className="flex items-center gap-3 pr-6 border-r border-background/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16,185,129)]" />
            <span className="text-[10px] font-sans font-black tracking-widest uppercase opacity-60">Sessão Pronta</span>
         </div>
         <Button 
            className="bg-background text-foreground hover:bg-background/90 flex items-center gap-3 h-10 px-10 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-background/10 active:scale-95 transition-all"
            onClick={() => {
              handleSave();
              if (onStart) onStart();
            }}
          >
           <Play className="w-3.5 h-3.5 fill-current" /> Começar Sessão
          </Button>
      </footer>
    </div>
  );
}
