"use client";

import React, { useState, useCallback } from 'react';
import { Share2, Cloud, BookOpen, Lightbulb, Quote, Target, Trash2, HelpCircle, GripVertical, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSermonSocket } from '@/hooks/useSermonSocket';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Perspectiva Teológica
export type TheologyCategory = 'TEXTO_BASE' | 'EXEGESE' | 'APLICACAO' | 'ILUSTRACAO' | 'ENFASE';

export interface SermonBlock {
  id: string;
  type: TheologyCategory;
  content: string;
  metadata: {
    font?: string;
    customColor?: string;
    parentVerseId?: string; 
    depth?: number;
  };
}

const CATEGORY_MAP: Record<TheologyCategory, { label: string, color: string, icon: React.ReactNode, defFont: string }> = {
  TEXTO_BASE: { label: 'Texto Base (Bíblico)', color: 'var(--color-exegesis)', icon: <BookOpen className="w-4 h-4" />, defFont: 'font-serif' },
  EXEGESE: { label: 'Hermenêutica / Exegese', color: '#6366f1', icon: <HelpCircle className="w-4 h-4" />, defFont: 'font-sans' },
  APLICACAO: { label: 'Aplicação Pastoral', color: 'var(--color-application)', icon: <Target className="w-4 h-4" />, defFont: 'font-modern' },
  ILUSTRACAO: { label: 'Ilustração', color: '#10b981', icon: <Lightbulb className="w-4 h-4" />, defFont: 'font-theological' },
  ENFASE: { label: 'Ênfase / Chamada', color: 'var(--color-emphasis)', icon: <AlertTriangle className="w-4 h-4" />, defFont: 'font-sans' }
};

const MOCK_START: SermonBlock[] = [
  { id: '1', type: 'TEXTO_BASE', content: 'E a luz resplandece nas trevas, e as trevas não a compreenderam. (João 1:5)', metadata: { font: 'font-serif', depth: 0 } },
  { id: '2', type: 'EXEGESE', content: 'A palavra original para "compreenderam" (katalambano) também significa "venceram" ou "apagaram".', metadata: { font: 'font-sans', depth: 1 } },
  { id: '3', type: 'APLICACAO', content: 'A escuridão não tem poder estrutural para apagar a luz. Ela é apenas a ausência dela.', metadata: { font: 'font-modern', depth: 2 } },
  { id: '4', type: 'ENFASE', content: 'Onde você está tolerando sombras na sua rotina, esquecendo que você carrega a fonte que as dissipa?', metadata: { font: 'font-sans', depth: 3 } },
  { id: '5', type: 'ILUSTRACAO', content: 'Como acender um fósforo numa caverna que não vê a luz há milênios. A escuridão histórica cede instantaneamente.', metadata: { font: 'font-theological', depth: 1 } },
];

export default function SermonCanvas() {
  const [blocks, setBlocks] = useState<SermonBlock[]>(MOCK_START);
  const { isConnected, syncCanvas } = useSermonSocket('mock-sermon-id');

  const handleContentChange = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };
  
  const handleCategoryChange = (id: string, newType: TheologyCategory) => {
    setBlocks(prev => prev.map(b => b.id === id ? { 
      ...b, 
      type: newType, 
      metadata: { ...b.metadata, font: CATEGORY_MAP[newType].defFont } 
    } : b));
  };

  const handleFontChange = (id: string, newFont: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, font: newFont } } : b));
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
      id: Date.now().toString(),
      type,
      content: '',
      metadata: { font: CATEGORY_MAP[type].defFont }
    };
    setBlocks(prev => [...prev, newBlock]);
    // Scroll to bottom optionally
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 100);
  };

  const serializeToFlowRibbon = useCallback(() => {
    // Already processual, map it out
    syncCanvas(blocks.map(n => ({
      id: undefined, 
      type: n.type,
      content: n.content,
      positionX: 0,
      positionY: 0,
      metadata: n.metadata
    })));
    alert("Perspectiva Teológica Sincronizada com o Púlpito!");
  }, [blocks, syncCanvas]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background text-foreground pb-32">
      {/* GLOBAL TOP NAVIGATION */}
      <header className="h-16 sticky top-0 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-serif text-muted-foreground tracking-tighter select-none">
            PREACHFY <span className="text-[10px] font-mono tracking-widest align-middle opacity-50 ml-1">STUDIO</span>
          </h1>
          <div className="h-6 w-px bg-border max-md:hidden" />
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 max-md:hidden">Modo Processual (Perspectiva Teológica)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono border transition-all",
            isConnected ? "text-[var(--color-exegesis)] bg-[var(--color-exegesis)]/10 border-[var(--color-exegesis)]/30 shadow-[0_0_10px_rgba(100,116,139,0.1)]" : "text-muted-foreground bg-surface border-border"
          )}>
            <Cloud className={cn("w-3 h-3", isConnected && "animate-pulse")} /> <span className="max-sm:hidden">{isConnected ? 'SINC. ATIVA' : 'OFFLINE'}</span>
          </div>
          <Button 
            variant="default"
            className="font-mono text-[11px] gap-2 tracking-widest h-9 bg-foreground text-background hover:bg-foreground/90 shadow-md"
            onClick={serializeToFlowRibbon}
          >
            <Share2 className="w-3.5 h-3.5" /> <span className="max-sm:hidden">SINCRONIZAR PÚLPITO</span>
          </Button>
        </div>
      </header>

      {/* PROCESSUAL CANVAS AREA */}
      <main className="flex-1 w-full max-w-4xl mx-auto mt-12 px-6">
        
        {/* Help Banner */}
        <div className="mb-8 p-4 rounded-xl bg-surface/50 border gap-4 border-border/60 flex items-start text-muted-foreground shadow-sm">
          <BookOpen className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold tracking-widest uppercase text-foreground/80">Como Estruturar sua Pregação</h3>
            <p className="text-sm font-light leading-relaxed">
              Crie uma trilha de raciocínio. Ao passar o mouse sobre cada bloco, use as opções de <strong>Aninhar</strong> na barra superior direita para recuar o bloco e torná-lo &quot;filho&quot; do argumento acima dele. O Modo Púlpito interpretará essa matemática para guiar você.
            </p>
          </div>
        </div>

        <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="flex flex-col gap-6">
          <AnimatePresence>
            {blocks.map((block, idx) => {
              const cat = CATEGORY_MAP[block.type];

              return (
                <Reorder.Item 
                  key={block.id} 
                  value={block}
                  className="relative group bg-surface/30 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
                  style={{ marginLeft: `${(block.metadata.depth || 0) * 3}rem` }}
                >
                  <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground p-2 hover:bg-surface rounded-md transition-all">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Header of Block */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.color }}>
                          {cat.icon}
                        </div>
                        <select
                          value={block.type}
                          onChange={(e) => handleCategoryChange(block.id, e.target.value as TheologyCategory)}
                          className="bg-transparent font-mono text-[11px] tracking-widest uppercase text-foreground outline-none cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={block.metadata.font || cat.defFont}
                          onChange={(e) => handleFontChange(block.id, e.target.value)}
                          className="bg-transparent border border-border rounded text-[10px] font-mono text-muted-foreground px-2 py-1 outline-none hover:border-foreground/30 transition-all cursor-pointer"
                        >
                          <option value="font-sans">Modern (Inter)</option>
                          <option value="font-serif">Editorial (Playfair)</option>
                          <option value="font-modern">Geométrica (Outfit)</option>
                          <option value="font-theological">Clássico (Lora)</option>
                          <option value="font-mono">Code (JetBrains)</option>
                        </select>
                        <div className="flex items-center bg-surface/50 rounded-md border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleIndent(block.id, -1)}
                            disabled={!block.metadata.depth}
                            className="px-2 py-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-l-md border-r border-border/50 text-[10px] uppercase font-mono tracking-widest flex items-center gap-1"
                            title="Recuar Bloco"
                          >
                            Recuar
                          </button>
                          <button 
                            onClick={() => handleIndent(block.id, 1)}
                            className="px-2 py-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors rounded-r-md text-[10px] uppercase font-mono tracking-widest flex items-center gap-1"
                            title="Avançar Bloco (Tornar filho do acima)"
                          >
                            Aninhar <CornerDownRight className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => deleteBlock(block.id)}
                          className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-500 hover:text-white ml-2"
                          title="Excluir Bloco"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Editor */}
                    <div className="relative pt-2 pl-4 border-l-2 border-border/50 ml-4 focus-within:border-foreground/30 transition-colors">
                      {block.type === 'TEXTO_BASE' && <Quote className="absolute -top-2 -left-3 w-8 h-8 text-foreground opacity-[0.03] -z-10" />}
                      <textarea
                        value={block.content}
                        onChange={(e) => handleContentChange(block.id, e.target.value)}
                        placeholder={`Adicione sua ${cat.label.toLowerCase()} aqui...`}
                        className={cn(
                          "w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:opacity-30",
                          block.metadata.font || cat.defFont,
                          block.type === 'TEXTO_BASE' ? "italic text-foreground text-xl leading-relaxed" : "text-foreground/80 text-lg leading-relaxed"
                        )}
                        rows={1}
                        onInput={(e) => {
                          e.currentTarget.style.height = 'auto';
                          e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
                        }}
                        style={{ minHeight: '80px' }}
                      />
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>

        {/* Theology Builder Palette (Bottom Addition) */}
        <div className="mt-12 w-full p-6 border border-dashed border-border/60 rounded-3xl flex flex-col items-center justify-center gap-4 bg-muted-foreground/5 hover:bg-muted-foreground/10 transition-colors">
           <h3 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Adicionar Bloco Teológico</h3>
           <div className="flex flex-wrap items-center justify-center gap-3">
             {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
               <Button
                 key={key}
                 variant="outline"
                 className="gap-2 rounded-full font-mono text-xs shadow-sm bg-surface hover:scale-105 transition-transform"
                 onClick={() => addBlock(key as TheologyCategory)}
               >
                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                 {cat.label}
               </Button>
             ))}
           </div>
        </div>

      </main>
    </div>
  );
}
