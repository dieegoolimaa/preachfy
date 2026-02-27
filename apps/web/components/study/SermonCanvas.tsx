"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Share2, Cloud, BookOpen, Lightbulb, Quote, Target, Trash2, HelpCircle, GripVertical, AlertTriangle, ArrowRight, CornerDownRight, Sparkles, ChevronDown, Info, X, MapPin, History, Plus, CheckCircle2, Link as LinkIcon, ArrowLeft, Play, Maximize2, Clock, Book, ChevronLeft, ChevronRight, Highlighter, Zap, MessageSquare, Download, Languages, Users, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Perspectiva Teológica
export type TheologyCategory = 
  'TEXTO_BASE' | 'EXEGESE' | 'APLICACAO' | 'ILUSTRACAO' | 'ENFASE' | 'CUSTOMIZAR' | 
  'ALERTA' | 'MANDAMENTO' | 'PROMESSA' | 'CONTEXTO' | 'VIDA' | 'ESPIRITO_SANTO' | 
  'PROFECIA' | 'CRISTO' | 'ADORACAO' | 'AMOR' | 'PECADO' | 'HISTORIA' | 'SIGNIFICADO';

export interface SermonBlock {
  id: string;
  type: TheologyCategory;
  content: string;
  metadata: {
    customColor?: string;
    customLabel?: string;
    parentVerseId?: string; 
    bibleSourceId?: string; 
    depth?: number;
    isInsight?: boolean;
    reference?: string;
    verseText?: string;
    revelation?: string;
  };
}

const CATEGORY_MAP: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  TEXTO_BASE: { label: 'Texto Base (Bíblico)', color: 'var(--color-texto)', icon: <BookOpen className="w-4 h-4" /> },
  EXEGESE: { label: 'Hermenêutica / Exegese', color: 'var(--color-exegese)', icon: <HelpCircle className="w-4 h-4" /> },
  APLICACAO: { label: 'Aplicação Pastoral', color: 'var(--color-aplicacao)', icon: <Target className="w-4 h-4" /> },
  ILUSTRACAO: { label: 'Ilustração', color: 'var(--color-ilustracao)', icon: <Lightbulb className="w-4 h-4" /> },
  ENFASE: { label: 'Ênfase / Alerta', color: '#fca5a5', icon: <AlertTriangle className="w-4 h-4" /> },
  ALERTA: { label: 'Alerta / Aviso', color: '#fca5a5', icon: <AlertTriangle className="w-4 h-4" /> },
  MANDAMENTO: { label: 'Mandamento', color: '#fdba74', icon: <Highlighter className="w-4 h-4" /> },
  PROMESSA: { label: 'Promessa', color: '#fcd34d', icon: <Sparkles className="w-4 h-4" /> },
  CONTEXTO: { label: 'Contexto', color: '#fef08a', icon: <Info className="w-4 h-4" /> },
  VIDA: { label: 'Vida / Crescimento', color: '#6ee7b7', icon: <Plus className="w-4 h-4" /> },
  ESPIRITO_SANTO: { label: 'Espírito Santo', color: '#5eead4', icon: <Zap className="w-4 h-4" /> },
  PROFECIA: { label: 'Profecia', color: '#93c5fd', icon: <History className="w-4 h-4" /> },
  CRISTO: { label: 'Cristo / Realeza', color: '#a5b4fc', icon: <Zap className="w-4 h-4" /> },
  ADORACAO: { label: 'Adoração', color: '#c4b5fd', icon: <Plus className="w-4 h-4" /> },
  AMOR: { label: 'Amor / Graça', color: '#fda4af', icon: <Plus className="w-4 h-4" /> },
  PECADO: { label: 'Pecado / Perdão', color: '#f5d0fe', icon: <Trash2 className="w-4 h-4" /> },
  HISTORIA: { label: 'História', color: '#cbd5e1', icon: <History className="w-4 h-4" /> },
  SIGNIFICADO: { label: 'Significado de Palavra', color: '#a8a29e', icon: <Languages className="w-4 h-4" /> },
  CUSTOMIZAR: { label: 'Customizar...', color: 'var(--color-custom)', icon: <MessageSquare className="w-4 h-4" /> }
};

interface SermonCanvasProps {
  sermonId: string;
  initialData?: any;
  onBack?: () => void;
  onStart?: () => void;
  onViewSnapshot?: (snapshot: any) => void;
}

export default function SermonCanvas({ sermonId, initialData, onBack, onStart, onViewSnapshot }: SermonCanvasProps) {
  const [blocks, setBlocks] = useState<SermonBlock[]>(initialData?.blocks || []);
  const [loading, setLoading] = useState(!initialData);
  const [sermonMeta, setSermonMeta] = useState<any>(initialData || null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { isConnected, syncCanvas, syncMeta } = useSermonSocket(sermonId);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBibleExpanded, setIsBibleExpanded] = useState(false);
  const [activeVerseFocusId, setActiveVerseFocusId] = useState<string | null>(null);
  const [newHistory, setNewHistory] = useState({
    location: '',
    city: '',
    notes: ''
  });
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<{ id: string; type: 'category' | 'link' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);

  // System States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Undo/Cascade Delete State
  const [undoState, setUndoState] = useState<{
    message: string;
    deletedBlocks: SermonBlock[];
    deletedSources: any[];
    timeoutId: NodeJS.Timeout | null;
  } | null>(null);

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

        // Check for local backup first (more recent)
        const localBackupRaw = localStorage.getItem(`preachfy_study_backup_${sermonId}`);
        const localBackup = localBackupRaw ? JSON.parse(localBackupRaw) : null;
        
        // Sanitize Bible Sources on load
        const sanitizedSources = (data.bibleSources || []).map((s: any) => ({
          ...s,
          reference: (s.reference || '').replace(/\s*\(COMPLETO\)/gi, '')
        }));

        if (localBackup && localBackup.meta) {
           // If we have a local version, we prefer it for title/content
           setSermonMeta({ ...data, ...localBackup.meta, bibleSources: sanitizedSources });
           if (localBackup.blocks) setBlocks(localBackup.blocks);
        } else {
           setSermonMeta({ ...data, bibleSources: sanitizedSources });
           if (data && data.blocks) {
             setBlocks(data.blocks.map((b: any) => ({
               id: b.id,
               type: b.type as TheologyCategory,
               content: b.content,
               metadata: b.metadata || {}
             })));
           }
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sermon:", error);
        setLoading(false);
      }
    };
    fetchSermon();
  }, [sermonId]);

  const fetchMyCommunities = async () => {
    const { environment } = require('@/environments');
    const { getSession } = require('next-auth/react');
    const session = await getSession();
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`${environment.apiUrl}/community/my/${session.user.id}`);
      const data = await res.json();
      setMyCommunities(data);
    } catch (e) {
      console.error("Failed to fetch communities", e);
    }
  };

  const handleShareSermon = async (communityId: string) => {
    const { environment } = require('@/environments');
    const { getSession } = require('next-auth/react');
    const session = await getSession();
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/share-sermon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, sermonId })
      });
      if (res.ok) {
        alert("Sermão partilhado com sucesso!");
        setIsShareModalOpen(false);
      }
    } catch (e) {
      console.error("Failed to share", e);
    }
  };

  const handleContentChange = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };
  
  const handleCategoryChange = (id: string, newType: TheologyCategory) => {
    setBlocks(prev => prev.map(b => b.id === id ? { 
      ...b, 
      type: newType, 
      metadata: { ...b.metadata, customLabel: newType === 'CUSTOMIZAR' ? (b.metadata.customLabel || 'Meu Título') : undefined } 
    } : b));
    setActiveDropdown(null);
  };

  const handleCustomLabelChange = (id: string, newLabel: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, customLabel: newLabel } } : b));
  };



  const clearUndo = () => {
    if (undoState?.timeoutId) clearTimeout(undoState.timeoutId);
    setUndoState(null);
  };

  const performUndo = () => {
    if (!undoState) return;
    if (undoState.deletedSources.length > 0) {
       setSermonMeta((prev: any) => ({
         ...prev,
         bibleSources: [...(prev.bibleSources || []), ...undoState.deletedSources]
       }));
    }
    if (undoState.deletedBlocks.length > 0) {
       setBlocks(prev => [...prev, ...undoState.deletedBlocks].sort((a,b) => (a as any).order - (b as any).order));
    }
    clearUndo();
    showToast('Ação desfeita com sucesso!');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteBlock = (id: string) => {
    const blockToDelete = blocks.find(b => b.id === id);
    if (!blockToDelete) return;

    // Define all blocks to delete (cascade)
    let blocksToDeleteIds = new Set<string>();
    blocksToDeleteIds.add(id);

    // If it's a base text, cascade delete all insights connected to it
    if (blockToDelete.type === 'TEXTO_BASE') {
      blocks.forEach(b => {
        if (b.metadata.parentVerseId === id) blocksToDeleteIds.add(b.id);
      });
    }

    const deletedBlocks = blocks.filter(b => blocksToDeleteIds.has(b.id));

    setBlocks(prev => prev.filter(b => !blocksToDeleteIds.has(b.id)));

    // Set Undo Timer (20 Seconds instead of 5)
    clearUndo();
    const timeoutId = setTimeout(() => setUndoState(null), 20000);

    const isCascade = deletedBlocks.length > 1;
    setUndoState({
      message: isCascade ? `${deletedBlocks.length} itens removidos` : 'Item removido',
      deletedBlocks,
      deletedSources: [],
      timeoutId
    });
  };

  const deleteBibleSource = (id: string) => {
    const srcToDelete = sermonMeta.bibleSources?.find((s: any) => s.id === id);
    if (!srcToDelete) return;

    const blocksToDelete = blocks.filter(b => b.metadata.bibleSourceId === id);
    
    setSermonMeta((prev: any) => ({
      ...prev,
      bibleSources: (prev.bibleSources || []).filter((s: any) => s.id !== id)
    }));
    setBlocks(prev => prev.filter(b => b.metadata.bibleSourceId !== id));

    // Set Undo Timer (20 Seconds)
    clearUndo();
    const timeoutId = setTimeout(() => setUndoState(null), 20000);

    setUndoState({
      message: `Fonte e ${blocksToDelete.length} itens movidos para lixeira`,
      deletedBlocks: blocksToDelete,
      deletedSources: [srcToDelete],
      timeoutId
    });
  };

  const handleIndent = (id: string, delta: number) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      const newDepth = Math.max(0, (b.metadata.depth || 0) + delta);
      return { ...b, metadata: { ...b.metadata, depth: newDepth } };
    }));
  };

  const addBlock = (type: TheologyCategory, metadata: any = {}) => {
    const newBlock: SermonBlock = {
      id: `new-${Date.now()}`,
      type,
      content: type === 'SIGNIFICADO' ? 'Palavra: \nSignificado: ' : '',
      metadata: { depth: 0, ...metadata }
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const addBlockAfter = (afterId: string, type: TheologyCategory, metadata: any = {}, depthOffset: number = 0) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx === -1) return prev;
      
      const parent = prev[idx];
      if (!parent) return prev;

      const newBlock: SermonBlock = {
        id: `new-${Date.now()}`,
        type,
        content: '',
        metadata: { 
          depth: (parent.metadata.depth || 0) + (metadata.depth !== undefined ? metadata.depth : depthOffset),
          bibleSourceId: parent.metadata.bibleSourceId,
          parentVerseId: type === 'TEXTO_BASE' ? parent.metadata.parentVerseId : (metadata.parentVerseId || afterId),
          verseText: parent.metadata.verseText,
          ...metadata
        }
      };
      
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
  };



  const handleLinkToVerse = (blockId: string, bibleSourceId: string, verseId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { 
      ...b, 
      metadata: { ...b.metadata, bibleSourceId, parentVerseId: verseId } 
    } : b));
    setActiveDropdown(null);
  };

  const updateBlockMetadata = (id: string, metadata: any) => {
    const updated = blocks.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, ...metadata } } : b);
    setBlocks(updated);
    syncCanvas(updated.map((n, idx) => ({ ...n, id: String(n.id), order: idx, positionX: 0, positionY: 0 })));
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
        bibleVersion: sermonMeta.bibleVersion || 'nvi',
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
      
      // Clear backup once successfully saved to DB
      localStorage.removeItem(`preachfy_study_backup_${sermonId}`);
    } catch (e) {
      console.error("Failed to manual save", e);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleExport = () => {
    if (!sermonMeta) return;
    
    let text = `${sermonMeta.title.toUpperCase()}\n`;
    text += `Categoria: ${sermonMeta.category || 'Geral'}\n`;
    text += `Gerado em: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += `==========================================\n\n`;

    (sermonMeta.bibleSources || []).forEach((source: any) => {
      text += `--- ${source.reference.toUpperCase()} ---\n\n`;
      const sourceBlocks = blocks.filter(b => b.metadata.bibleSourceId === source.id && b.type === 'TEXTO_BASE');
      
      sourceBlocks.forEach(block => {
        text += `• ${block.content}\n`;
        const insights = blocks.filter(b => b.metadata.parentVerseId === block.id);
        insights.forEach(ins => {
          text += `  [${CATEGORY_MAP[ins.type]?.label || ins.type}] ${ins.content}\n`;
        });
        text += `\n`;
      });
      text += `\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rice_and_Beans_Preaching - ${sermonMeta.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1. Auto-Save to DB (Background)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0) {
        handleSave();
      }
    }, 15000); // Auto-save to DB every 15s of inactivity after a change
    return () => clearTimeout(timer);
  }, [blocks, sermonMeta]);

  // 2. Emergency Backup to LocalStorage (Instant) - To survive refreshes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0 || sermonMeta) {
        const backup = {
          blocks,
          meta: sermonMeta,
          timestamp: Date.now()
        };
        localStorage.setItem(`preachfy_study_backup_${sermonId}`, JSON.stringify(backup));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, sermonMeta, sermonId]);

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
          bibleVersion: sermonMeta.bibleVersion || 'nvi',
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
    <div className="flex flex-col w-full min-h-screen bg-background text-foreground pb-40 transition-all duration-700 relative">
      {/* MINISTERIAL TOOLBAR - Floating Actions */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] group/hud">
        <div className="bg-surface/90 backdrop-blur-2xl border border-border/80 px-8 py-4 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,114,245,0.2)] flex items-center gap-4 transition-all hover:scale-[1.02]">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black tracking-widest border transition-all duration-500",
            isConnected ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/20" : "text-muted-foreground bg-surface border-border"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", isConnected && "animate-pulse")} /> 
            <span className="max-sm:hidden">{isConnected ? 'SINC. ATIVA' : 'OFFLINE'}</span>
          </div>

          <div className="h-6 w-px bg-border/40" />

          {/* Admin panel button directly on HUD */}
          <Button 
            variant="ghost"
            className="font-sans text-[11px] font-black gap-2 tracking-[0.1em] h-11 px-6 rounded-full hover:bg-foreground/5 transition-all text-muted-foreground hover:text-foreground"
            onClick={() => setIsDetailsOpen(true)}
          >
            <Shield className="w-4 h-4" />
            ADMIN
          </Button>

          <Button 
            variant="ghost"
            className="font-sans text-[11px] font-black gap-2 tracking-[0.1em] h-11 px-6 rounded-full hover:bg-emerald-500/10 transition-all active:scale-95 text-emerald-600"
            onClick={() => {
              fetchMyCommunities();
              setIsShareModalOpen(true);
            }}
          >
            <Share2 className="w-4 h-4" />
            PARTILHAR
          </Button>

          <Button 
            variant="ghost"
            className="font-sans text-[11px] font-black gap-2 tracking-[0.1em] h-11 px-6 rounded-full hover:bg-foreground/5 transition-all text-muted-foreground hover:text-foreground"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            EXPORTAR
          </Button>

          <Button 
            variant="default"
            className="font-sans text-[11px] font-black gap-2 tracking-[0.1em] h-11 px-8 bg-brand-red text-white hover:opacity-90 rounded-full transition-all shadow-xl shadow-brand-red/20 active:scale-95 group"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <CheckCircle2 className="w-4 h-4 animate-pulse" /> : <Cloud className="w-4 h-4" />}
            {isSaving ? 'SALVANDO...' : 'SALVAR'}
          </Button>
          
          <button 
            onClick={() => onStart?.()}
            className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all text-muted-foreground hover:border-foreground active:scale-90"
            title="Iniciar Púlpito"
          >
            <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      <main className="flex-1 w-full bg-background !overflow-visible">
        {/* Sermon Header - WORKBENCH STYLE */}
        <div className="border-b border-border bg-muted/20 px-12 py-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-2">
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
              className="w-full bg-transparent border-none outline-none font-sans text-3xl font-bold italic tracking-tight text-foreground placeholder:opacity-10 leading-tight focus:placeholder:opacity-5 transition-all resize-none !overflow-visible"
            />
            <div className="flex items-center gap-3 ml-1">
               <span className="text-[10px] font-sans font-black tracking-[0.4em] uppercase opacity-30">Categoria:</span>
               <span className="text-[11px] font-sans font-black tracking-[0.3em] uppercase text-foreground px-4 py-1 rounded-full bg-surface border border-border shadow-sm">{sermonMeta?.category || 'Geral'}</span>
            </div>
          </div>
        </div>


        <div className="flex-1 w-full bg-background mb-40">
          <div className="max-w-[1920px] mx-auto min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_60px] divide-x-0 lg:divide-x divide-border/10">
            
            {/* UNIFIED 3-COLUMN MATRIX GROUPED BY SOURCE */}
            <div className="col-span-1 lg:col-span-3 flex flex-col">
              {/* 1. RENDER SOURCES AND THEIR CHILD BLOCKS */}
              {(sermonMeta?.bibleSources || []).map((source: any, sIdx: number) => {
                const sourceBlocks = blocks.filter(b => b.metadata.bibleSourceId === source.id && b.type === 'TEXTO_BASE');
                const pillarColor = '#6366f1'; // Unified Brand Color for Sources

                return (
                  <div key={source.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] divide-y md:divide-y-0 md:divide-x divide-border/10 group/source-section bg-background/5">
                    {/* COL 1: SOURCE PILLAR (Extended Height) */}
                    <div className="p-4 pb-20 border-r border-border/10 bg-background/5 relative">
                       <div className="sticky top-44 h-[calc(100vh-200px)] group/src relative bg-surface shadow-xl border border-border/40 rounded-[3rem] p-10 transition-all hover:shadow-2xl z-10 overflow-hidden flex flex-col">
                          
                          {/* Accent Pillar */}
                          <div className="absolute top-0 left-0 bottom-0 w-3 bg-brand-gold rounded-l-[3rem]" />
                          
                          {/* Header */}
                          <div className="flex items-center justify-between mb-8 border-b border-border/5 pb-4 ml-4">
                            <div className="flex items-center gap-3 flex-1">
                              <Book className="w-4 h-4 text-brand-gold flex-shrink-0" />
                              <input 
                                type="text"
                                value={source.reference || ''}
                                onChange={e => updateBibleSource(sIdx, 'reference', e.target.value)}
                                className="bg-transparent border-none text-xs font-mono font-black uppercase tracking-[0.2em] text-brand-gold outline-none w-full"
                                placeholder="REFERÊNCIA"
                               />
                             </div>
                             <div className="flex items-center gap-1 opacity-0 group-hover/src:opacity-100 transition-opacity">
                               <button onClick={() => removeBibleSource(sIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>

                          {/* Center Content Area */}
                          <div className="flex-1 flex flex-col justify-start mt-4 ml-4 relative h-full">
                            {/* Prominent Snapshot Button */}
                            {source.explorerSnapshot && onViewSnapshot && (
                               <button 
                                 onClick={async () => {
                                   await handleSave(); // SAFETY FIRST: Save before navigating
                                   onViewSnapshot(source.explorerSnapshot);
                                 }}
                                 className="mb-6 w-full py-4 px-6 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl flex flex-col items-center justify-center gap-2 group/snap hover:bg-brand-gold hover:border-brand-gold transition-all shadow-lg hover:shadow-brand-gold/40"
                               >
                                 <Sparkles className="w-5 h-5 text-brand-gold group-hover/snap:text-white transition-colors" />
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-gold group-hover/snap:text-white transition-colors">Mapa Visual do Estudo</span>
                               </button>
                            )}

                            {/* Subtle background reference */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                              <span className="text-[120px] font-black rotate-[-10deg]">{source.reference?.split(' ')[0]}</span>
                            </div>
                            
                            <textarea 
                              value={source.content}
                              onChange={e => updateBibleSource(sIdx, 'content', e.target.value)}
                              placeholder="Texto bíblico..."
                              className="w-full h-full bg-transparent border-none outline-none resize-none font-sans text-base font-medium text-foreground/70 leading-relaxed custom-scrollbar relative z-10"
                            />
                          </div>

                          {/* Footer decorative element */}
                          <div className="mt-8 flex justify-center opacity-10">
                            <div className="w-12 h-1 bg-border rounded-full" />
                          </div>
                       </div>
                    </div>

                    {/* COL 2 & 3: SOURCE MATRIX */}
                    <div className="flex flex-col pt-2">
                      <Reorder.Group 
                        axis="y" 
                        values={sourceBlocks} 
                        onReorder={(newOrder: SermonBlock[]) => {
                          setBlocks(prev => {
                            const withoutSource = prev.filter(b => b.metadata.bibleSourceId !== source.id);
                            const sourceMatrix: SermonBlock[] = [];
                            newOrder.forEach(anchor => {
                              sourceMatrix.push(anchor);
                              const anchorInsights = prev.filter(b => b.metadata.parentVerseId === anchor.id);
                              sourceMatrix.push(...anchorInsights);
                            });
                            return [...withoutSource, ...sourceMatrix];
                          });
                        }}
                      >
                        {sourceBlocks.map((block, rowIdx) => {
                          const insights = blocks.filter(b => {
                            // Only process valid insights and non-TEXTO_BASE types
                            if (!CATEGORY_MAP[b.type] || b.type === 'TEXTO_BASE') return false;
                            return b.metadata.bibleSourceId === source.id && 
                                   b.metadata.isInsight && (
                                     b.metadata.parentVerseId === block.id || 
                                     b.metadata.reference === block.metadata.reference
                                   );
                          });
                          const blockColor = block.metadata.customColor || '#6366f1';

                          return (
                            <Reorder.Item 
                              key={block.id} 
                              value={block} 
                              className={cn(
                                "grid grid-cols-1 md:grid-cols-2 group/master transition-all duration-500 items-start relative border-b border-border/5",
                                rowIdx % 2 === 0 ? "bg-surface/10" : "bg-transparent"
                              )}
                            >
                              {/* COLUMN 2: TEXTO BASE */}
                              <div className="p-2 relative min-h-[140px] flex items-start">
                                <div 
                                   onPointerDown={() => setActiveVerseFocusId(block.id)}
                                   className={cn(
                                     "w-full bg-surface shadow-xl border border-border/40 rounded-2xl p-6 transition-all duration-500 flex flex-col group/card relative z-10",
                                     "group-hover/master:shadow-2xl",
                                     activeVerseFocusId === block.id ? "ring-2 ring-brand-gold/20" : ""
                                   )}
                                   style={{ 
                                     borderLeft: `8px solid ${blockColor}`,
                                     borderColor: activeVerseFocusId === block.id ? `${blockColor}80` : `${blockColor}20`
                                   }}
                                >
                                  <div className="flex items-center justify-between mb-4 border-b border-border/5 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md"
                                        style={{ backgroundColor: `${blockColor !== 'transparent' ? blockColor : '#6366f1'}15`, color: blockColor !== 'transparent' ? blockColor : '#6366f1' }}
                                      >
                                        Texto Base
                                      </span>
                                      <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        {['#ef4444', '#3b82f6', '#22c55e', '#6366f1'].map(c => (
                                          <button 
                                            key={c}
                                            onClick={() => updateBlockMetadata(block.id, { customColor: c })}
                                            className="w-2.5 h-2.5 rounded-full border border-border/20 shadow-sm transition-transform hover:scale-125"
                                            style={{ backgroundColor: c }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all">
                                       <button 
                                         onClick={() => addBlockAfter(block.id, 'APLICACAO', { parentVerseId: block.id, isInsight: true, bibleSourceId: source.id })}
                                         className="h-7 px-3 bg-indigo-50 text-brand-red hover:bg-brand-red hover:text-white rounded-full text-[9px] font-black tracking-widest transition-all uppercase"
                                       >
                                         + Insight
                                       </button>
                                       <button onClick={() => deleteBlock(block.id)} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>

                                  <textarea
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block.id, e.target.value)}
                                    placeholder="Insira o versículo ou texto central..."
                                    className="w-full bg-transparent border-none outline-none resize-none font-sans text-base font-bold leading-relaxed text-foreground placeholder:text-foreground/20 custom-scrollbar flex-1 p-0"
                                    rows={1}
                                    onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                  />
                                </div>
                                <div className="absolute top-1/2 right-[-2px] w-6 h-[2px] opacity-0 group-hover/master:opacity-40 transition-opacity z-0" 
                                     style={{ backgroundColor: blockColor !== 'transparent' ? blockColor : '#6366f1' }} 
                                />
                              </div>

                              {/* COLUMN 3: APONTAMENTOS */}
                              <div className="flex flex-col p-2 gap-1.5 bg-background/5 min-h-[140px] relative">
                                <div className="absolute left-0 top-6 bottom-6 w-[1.5px] bg-border/5 group-hover/master:bg-border/20 transition-colors" />
                                   {insights.length > 0 ? (
                                     insights.map((subBlock) => {
                                       const effectiveColor = subBlock.metadata.customColor || (blockColor !== 'transparent' ? blockColor : '#cbd5e1');
                                       return (
                                         <div key={subBlock.id} className="group/insight relative px-2">
                                           <div 
                                             className="bg-surface shadow-md border border-border/30 rounded-2xl p-5 hover:shadow-xl transition-all duration-500 border-l-4"
                                             style={{ 
                                               borderLeftColor: effectiveColor,
                                               borderColor: `${effectiveColor}30` 
                                             }}
                                           >
                                             <div className="flex items-center justify-between mb-3">
                                               <div className="flex items-center gap-2">
                                                 <div className="relative flex items-center gap-1 group/sel">
                                                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover/sel:text-foreground transition-colors">
                                                     {subBlock.metadata.customLabel || CATEGORY_MAP[subBlock.type]?.label || subBlock.type}
                                                   </span>
                                                   <ChevronDown className="w-2.5 h-2.5 text-foreground/20 group-hover/sel:text-foreground transition-colors" />
                                                   <select 
                                                     value={subBlock.type}
                                                     onChange={(e) => handleCategoryChange(subBlock.id, e.target.value as TheologyCategory)}
                                                     className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                   >
                                                     <optgroup label="Core Study">
                                                       <option value="EXEGESE">Exegese</option>
                                                       <option value="APLICACAO">Pastoral</option>
                                                       <option value="ILUSTRACAO">Ilustração</option>
                                                       <option value="ENFASE">Ênfase</option>
                                                     </optgroup>
                                                     <optgroup label="Research Highlights">
                                                       <option value="ALERTA">Alerta / Aviso</option>
                                                       <option value="MANDAMENTO">Mandamento</option>
                                                       <option value="PROMESSA">Promessa</option>
                                                       <option value="CONTEXTO">Contexto</option>
                                                       <option value="VIDA">Vida / Crescimento</option>
                                                       <option value="ESPIRITO_SANTO">Espírito Santo</option>
                                                       <option value="PROFECIA">Profecia</option>
                                                       <option value="CRISTO">Cristo / Realeza</option>
                                                       <option value="ADORACAO">Adoração</option>
                                                       <option value="AMOR">Amor / Graça</option>
                                                       <option value="PECADO">Pecado / Perdão</option>
                                                       <option value="HISTORIA">História</option>
                                                       <option value="SIGNIFICADO">Significado / Léxico</option>
                                                     </optgroup>
                                                   </select>
                                                 </div>
                                               </div>
                                               <button onClick={() => deleteBlock(subBlock.id)} className="opacity-0 group-hover/insight:opacity-100 p-1 text-red-400 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                                              </div>
                                              {subBlock.type === 'SIGNIFICADO' && (
                                                <div className="flex items-center gap-1.5 mb-2">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                                                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold/60 italic">Léxico / Original</span>
                                                </div>
                                              )}
                                             <textarea
                                               value={subBlock.content}
                                               onChange={(e) => handleContentChange(subBlock.id, e.target.value)}
                                               placeholder="Reflexão ou aplicação..."
                                               className={cn(
                                                 "w-full bg-transparent border-none outline-none resize-none font-sans text-base leading-relaxed text-foreground transition-all custom-scrollbar h-auto p-0",
                                                 subBlock.type === 'SIGNIFICADO' ? "font-bold" : "font-medium"
                                               )}
                                               onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                             />
                                           </div>
                                         </div>
                                       );
                                     })
                                   ) : (
                                     <div className="flex-1 flex items-center justify-center opacity-0 group-hover/master:opacity-10 transition-opacity">
                                       <span className="text-[9px] font-black uppercase tracking-widest italic">Aguardando Insights...</span>
                                     </div>
                                   )}
                              </div>
                            </Reorder.Item>
                          );
                        })}
                        
                        {/* IN-SOURCE ADD BUTTON */}
                        <div className="p-6 pt-2 pb-12">
                          <button 
                            onClick={() => addBlock('TEXTO_BASE', { bibleSourceId: source.id })}
                            className="w-full py-6 border border-dashed border-border/20 rounded-2xl flex items-center justify-center gap-3 hover:bg-surface hover:border-brand-gold/20 transition-all group hover:shadow-xl group/add-btn"
                          >
                            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-brand-gold transition-all" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-10 group-hover:opacity-100 transition-opacity">Novo Texto em {source.reference}</span>
                          </button>
                        </div>
                      </Reorder.Group>
                    </div>
                  </div>
                );
              })}

              {/* GLOBAL ADD SOURCE BUTTON */}
              <div className="p-20 border-t border-border/10 bg-background/5 flex justify-center">
                <button 
                  onClick={addBibleSource}
                  className="px-16 py-12 border-2 border-dashed border-border/20 rounded-[4rem] flex flex-col items-center justify-center gap-6 hover:bg-surface hover:border-brand-gold/40 transition-all group shadow-sm hover:shadow-2xl"
                >
                  <Plus className="w-10 h-10 text-brand-gold group-hover:scale-125 transition-transform" />
                  <span className="text-[12px] font-black uppercase tracking-[0.5em] text-foreground/40 group-hover:text-foreground">Adicionar Nova Fonte Bíblica</span>
                </button>
              </div>
            </div>

            {/* COLUMN 4: ACTIONS/SPACER */}
            <div className="flex items-center justify-center bg-background min-h-screen">
              <div className="sticky top-1/2 rotate-90 text-[10px] font-black tracking-[1em] uppercase opacity-5 whitespace-nowrap">Studio Workbench</div>
            </div>

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
                      className="bg-transparent border-none outline-none font-mono text-base font-black text-brand-gold uppercase tracking-[0.2em] placeholder:opacity-20"
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
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Versão da Bíblia (Preferencial)</label>
                    <select value={sermonMeta?.bibleVersion || 'nvi'} onChange={e => handleMetaChange('bibleVersion', e.target.value)} className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-foreground transition-all">
                      {['nvi', 'ra', 'acf'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                    </select>
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
                        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-gold">{new Date(h.date).toLocaleDateString('pt-BR')}</div>
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

      <AnimatePresence>
        {isShareModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShareModalOpen(false)} className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200]" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface border border-border rounded-[3rem] z-[201] shadow-2xl p-10"
            >
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="text-2xl font-serif font-black italic">Partilhar Estudo</h2>
                  <p className="text-[10px] font-sans font-black tracking-[0.3em] uppercase opacity-30 mt-1">Selecione uma comunidade ministerial</p>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {myCommunities.map((c) => (
                    <button 
                      key={c.id}
                      onClick={() => handleShareSermon(c.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-foreground/5 border border-transparent hover:border-border transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold"><Users className="w-5 h-5" /></div>
                        <span className="font-bold text-sm uppercase tracking-tight">{c.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  {myCommunities.length === 0 && (
                    <div className="py-12 text-center opacity-30 text-xs italic">Nenhuma comunidade ativa encontrada.</div>
                  )}
                </div>

                <Button variant="ghost" onClick={() => setIsShareModalOpen(false)} className="w-full rounded-2xl h-12 uppercase font-black text-[10px] tracking-widest border border-border">Cancelar</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Undo Toast (Subtle bottom right aligned) */}
      <AnimatePresence>
        {undoState && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[300] py-3 pr-2 pl-4 bg-surface text-foreground rounded-2xl shadow-xl border border-border/60 flex items-center gap-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{undoState.message}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <button 
              onClick={performUndo}
              className="px-4 py-1.5 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all active:scale-95 shrink-0"
            >
              Desfazer
            </button>
            <button onClick={clearUndo} className="p-1 text-muted-foreground hover:text-foreground transition-all rounded-md">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-[300] px-6 py-4 bg-emerald-50 text-emerald-900 rounded-2xl shadow-lg border border-emerald-100 flex items-center gap-3 backdrop-blur-xl"
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-500" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
