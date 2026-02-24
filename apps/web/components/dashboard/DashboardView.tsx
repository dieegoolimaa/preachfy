"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Play, Clock, MoreVertical, Calendar, Search, History, Sparkles, ChevronRight, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { ThemeToggle } from '@/components/theme-toggle';

export interface SermonMeta {
  id: string;
  title: string;
  date: string;
  duration?: number;
  category?: string;
  status?: string;
  history?: any[];
  _count?: { history: number };
}

interface DashboardViewProps {
  onEdit: (sermon: SermonMeta) => void;
  onStart: (sermon: SermonMeta, timeInMinutes: number) => void;
}

export default function DashboardView({ onEdit, onStart }: DashboardViewProps) {
  const [sermons, setSermons] = useState<SermonMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingStartId, setPreparingStartId] = useState<string | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSermonData, setNewSermonData] = useState({ title: '', category: 'Geral' });

  useEffect(() => {
    const fetchSermons = async () => {
      try {
        const res = await fetch('http://localhost:3001/sermons');
        const data = await res.json();
        setSermons(data.map((s: any) => ({
          ...s,
          date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s.createdAt))
        })));
      } catch (e) {
        console.error("Failed to fetch sermons", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSermons();
  }, []);

  const filteredSermons = sermons.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = async () => {
    if (!newSermonData.title) return;
    try {
      const res = await fetch('http://localhost:3001/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newSermonData.title, 
          category: newSermonData.category,
          status: 'DRAFT' 
        })
      });
      const newSermon = await res.json();
      const formattedSermon = {
        ...newSermon,
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(newSermon.createdAt || Date.now()))
      };
      setSermons([formattedSermon, ...sermons]);
      setIsCreating(false);
      setNewSermonData({ title: '', category: 'Geral' });
      onEdit(formattedSermon);
    } catch (e) {
      console.error("Failed to create sermon", e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative transition-colors duration-500">
      <header className="h-24 sticky top-0 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-12 z-50">
        <h1 className="text-2xl font-sans tracking-tight">
          <span className="font-bold">Preachfy</span> 
          <span className="font-light opacity-40 ml-2 uppercase text-[10px] tracking-[0.2em] relative top-[-1px]">Workbench</span>
        </h1>
        <div className="flex items-center gap-8">
          <ThemeToggle />
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-mono text-sm tracking-widest uppercase hover:border-foreground transition-all cursor-pointer">
            DL
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto mt-16 px-12 pb-32">
        {/* Welcome Section */}
        <div className="mb-16 flex flex-col gap-2">
          <h2 className="text-4xl font-serif font-bold italic tracking-tight text-foreground">Graça e Paz, Diego.</h2>
          <p className="text-sm font-sans font-medium text-muted-foreground opacity-60">Sua biblioteca de mensagens está pronta para ser expandida.</p>
        </div>

        <div className="flex items-center justify-between mb-10">
          <h2 className="text-[11px] font-sans font-black tracking-[0.4em] uppercase text-muted-foreground flex-shrink-0">Meus Sermões</h2>
          
          <div className="flex-1 max-w-xl mx-12 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-foreground transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar pregações por tema ou versículo..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface/40 border border-border/80 rounded-full py-4 pl-14 pr-6 text-sm font-sans text-foreground outline-none focus:border-foreground/20 focus:bg-surface/60 transition-all shadow-sm"
            />
          </div>

          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-foreground text-background font-sans text-[11px] font-black uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0 shadow-xl shadow-foreground/10"
          >
            <Plus className="w-4 h-4" /> Criar Novo
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {filteredSermons.map((sermon) => (
            <motion.div 
              layout
              key={sermon.id} 
              className="group relative flex items-center justify-between bg-surface/30 border border-border hover:border-foreground/10 rounded-[2.5rem] p-4 pr-10 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 overflow-hidden"
            >
              <div className="flex items-center flex-1 h-full pl-6 pr-4 gap-12">
                <div className="flex flex-col gap-1 text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted-foreground/40 w-32 shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 mb-0.5" /> <span>Postado em</span>
                  </div>
                  <span className="text-foreground/60">{sermon.date}</span>
                </div>

                <div className="flex flex-col flex-1 gap-1.5">
                  <h3 className="text-2xl font-serif font-bold text-foreground line-clamp-1 flex items-center gap-4 group-hover:italic transition-all">
                    {sermon.title}
                    {sermon.category && (
                      <span className="text-[10px] font-sans font-black uppercase tracking-widest px-3 py-1 rounded-full bg-foreground/5 border border-border opacity-60">
                        {sermon.category}
                      </span>
                    )}
                  </h3>

                  <div className="flex items-center gap-6 text-[10px] font-sans font-black uppercase tracking-[0.2em] opacity-30 group-hover:opacity-50 transition-opacity">
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5" />
                      <span>{sermon._count?.history || 0}</span>
                    </div>
                    {sermon.status && (
                      <div className={cn(
                        "flex items-center gap-2",
                        sermon.status === 'READY' ? "text-emerald-500 opacity-100" : 
                        sermon.status === 'DRAFT' ? "text-amber-500 opacity-100" : ""
                      )}>
                         <Sparkles className="w-3.5 h-3.5" />
                         <span>{sermon.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center h-full shrink-0 z-10">
                <AnimatePresence mode="wait">
                  {preparingStartId === sermon.id ? (
                    <motion.div 
                      key="timer-controls"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-8 h-full border-l border-border pl-8 bg-surface/40 rounded-r-[2.5rem]"
                    >
                      <button onClick={() => setPreparingStartId(null)} className="p-3 text-muted-foreground/50 hover:text-foreground transition-all hover:bg-muted rounded-full">
                         <X className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setTargetTime(Math.max(5, targetTime - 5))}
                          className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-xl text-foreground hover:bg-foreground hover:text-background transition-all"
                        >
                          -
                        </button>
                        <div className="flex flex-col items-center">
                          <span className="text-5xl font-sans font-black tracking-tighter text-foreground leading-none">
                            {targetTime}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Minutos</span>
                        </div>
                        <button 
                          onClick={() => setTargetTime(targetTime + 5)}
                          className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-xl text-foreground hover:bg-foreground hover:text-background transition-all"
                        >
                          +
                        </button>
                      </div>

                      <button 
                        onClick={() => {
                          setPreparingStartId(null);
                          onStart(sermon, targetTime);
                        }}
                        className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-foreground text-background font-sans text-[11px] font-black uppercase tracking-[0.1em] hover:scale-105 transition-all shadow-2xl shadow-foreground/20"
                      >
                        <Play className="w-4 h-4 fill-current" /> Começar
                      </button>

                    </motion.div>
                  ) : (
                    <motion.div 
                      key="standard-actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-5"
                    >
                      <button 
                        onClick={() => onEdit(sermon)}
                        className="flex items-center justify-center gap-3 px-6 py-2.5 rounded-full border border-border text-[11px] font-sans font-black tracking-widest uppercase text-muted-foreground hover:border-foreground hover:text-foreground transition-all group/edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Estudar
                      </button>
                      
                      <button 
                        onClick={() => setPreparingStartId(sermon.id)}
                        className="w-14 h-12 flex items-center justify-center rounded-[1.25rem] bg-foreground text-background hover:scale-105 transition-all shadow-xl shadow-foreground/10 group/play"
                      >
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

          {filteredSermons.length === 0 && !loading && (
             <div className="py-32 text-center opacity-20 italic">
                <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-40" />
                <p>Nenhuma pregação encontrada com esses critérios.</p>
             </div>
          )}
        </div>
      </main>

      {/* NEW SERMON MODAL */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-surface/90 backdrop-blur-3xl border border-border p-16 rounded-[4rem] z-[101] shadow-2xl"
            >
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-3">
                  <h2 className="text-4xl font-serif font-bold italic tracking-tight text-foreground">Novo Sermão</h2>
                  <p className="text-[11px] font-sans font-black tracking-[0.4em] uppercase opacity-30 ml-1">Inicie seu fluxo criativo e teológico</p>
                </div>

                <div className="flex flex-col gap-10">
                  <div className="flex flex-col gap-4">
                    <label className="text-[11px] font-sans font-black uppercase tracking-[0.3em] opacity-40 ml-1">Tema Principal da Mensagem</label>
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Ex: A Parábola do Filho Pródigo"
                      value={newSermonData.title}
                      onChange={e => setNewSermonData({...newSermonData, title: e.target.value})}
                      className="w-full bg-transparent border-b-2 border-border py-4 text-3xl font-serif font-bold italic outline-none focus:border-foreground transition-all placeholder:opacity-10"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-[11px] font-sans font-black uppercase tracking-[0.3em] opacity-40 ml-1">Selecione a Categoria</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['Geral', 'Evangelística', 'Expositiva', 'Temática', 'Doutrinária', 'Festiva'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setNewSermonData({...newSermonData, category: cat})}
                          className={cn(
                            "px-6 py-4 rounded-2xl border text-[10px] font-black tracking-[0.1em] uppercase transition-all shadow-sm",
                            newSermonData.category === cat 
                              ? "bg-foreground text-background border-foreground shadow-[0_10px_30px_rgb(0,0,0,0.1)] scale-105" 
                              : "bg-surface border-border text-muted-foreground/60 hover:border-foreground/30"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-6">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-8 py-5 rounded-full border border-border text-[11px] font-black tracking-widest uppercase text-muted-foreground hover:bg-surface transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={handleCreateNew}
                    disabled={!newSermonData.title}
                    className="flex-[2] px-12 py-5 rounded-full bg-foreground text-background text-[11px] font-black tracking-widest uppercase shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                  >
                    Iniciar Preparação <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
