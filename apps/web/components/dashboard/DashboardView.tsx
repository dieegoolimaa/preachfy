"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Play, Clock, MoreVertical, Calendar, Search, History, Sparkles, ChevronRight, X, Zap, BookOpen, Layout, Trash2, Users } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth-components";


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
  onBible: () => void;
  onCommunity: () => void;
}

export default function DashboardView({ onEdit, onStart, onBible, onCommunity }: DashboardViewProps) {
  const { data: session } = useSession();
  const [sermons, setSermons] = useState<SermonMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingStartId, setPreparingStartId] = useState<string | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSermonData, setNewSermonData] = useState({ title: '', category: 'Geral' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const CATEGORIES = ['Geral', 'Evangelística', 'Expositiva', 'Temática', 'Doutrinária', 'Festiva', 'Estudo Bíblico'];

  const { environment } = require('@/environments');
  const apiUrl = environment.apiUrl;

  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchSermons = async () => {
      try {
        const res = await fetch(`${apiUrl}/sermons?authorId=${session?.user?.id}`);
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
  }, [session?.user?.id]);

  const filteredSermons = sermons.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = async () => {
    if (!newSermonData.title) return;
    try {
      const res = await fetch(`${apiUrl}/sermons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newSermonData.title, 
          category: newSermonData.category,
          status: 'DRAFT',
          authorId: session?.user?.id
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



  const handleDeleteSermon = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${title}"?`)) return;
    try {
      const res = await fetch(`${apiUrl}/sermons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSermons(sermons.filter(s => s.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete sermon", e);
    }
  };


  return (
    <div className="bg-background text-foreground flex flex-col relative">

      <main className="flex-1 w-full max-w-5xl mx-auto mt-12 px-8 pb-32">
        {/* Welcome Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Graça e Paz, {session?.user?.name?.split(' ')[0] || 'Pregador'}.</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Sua biblioteca de mensagens está pronta para ser expandida.</p>
        </section>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <input 
                type="text" 
                placeholder="Pesquisar sermões..." 
                className="w-full h-11 bg-foreground/5 border-none rounded-xl pl-10 pr-4 text-sm font-medium placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-sans"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="h-11 px-6 rounded-full bg-brand-red text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm"
          >
            Novo Estudo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredSermons.map((sermon) => (
            <motion.div 
              layout
              key={sermon.id} 
              className="group relative flex items-center justify-between bg-surface/50 border border-border rounded-2xl p-6 hover:bg-surface transition-all"
            >
              <div className="flex items-center gap-8 flex-1 min-w-0">
                <div className="flex flex-col gap-1 w-24 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Criado</span>
                  <span className="text-xs font-semibold">{sermon.date}</span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground truncate">{sermon.title}</h3>
                    {sermon.category && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-foreground/5 text-muted-foreground border border-border/50">
                        {sermon.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>{sermon._count?.history || 0} ministrações</span>
                    </div>
                    {sermon.status && (
                      <div className={cn(
                        "flex items-center gap-1.5",
                        sermon.status === 'READY' ? "text-brand-gold" : "text-orange-500"
                      )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
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
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-6 bg-foreground/5 p-2 rounded-full border border-white/5 shadow-inner"
                    >
                      <button onClick={() => setPreparingStartId(null)} className="w-10 h-10 flex items-center justify-center text-muted-foreground/30 hover:text-foreground transition-all ml-2">
                         <X className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => setTargetTime(Math.max(5, targetTime - 5))}
                          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-all shadow-sm active:scale-90"
                        >
                          -
                        </button>
                        <div className="flex flex-col items-center min-w-[70px]">
                          <span className="text-4xl font-mono font-black tracking-tighter text-foreground leading-none">
                            {targetTime}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 mt-1">Minutos</span>
                        </div>
                        <button 
                          onClick={() => setTargetTime(targetTime + 5)}
                          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-all shadow-sm active:scale-90"
                        >
                          +
                        </button>
                      </div>

                       <button 
                        onClick={() => {
                          setPreparingStartId(null);
                          onStart(sermon, targetTime);
                        }}
                        className="flex items-center gap-3 px-8 py-4 rounded-full bg-foreground text-background font-sans text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-black/20"
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

                      <button 
                        onClick={() => handleDeleteSermon(sermon.id, sermon.title)}
                        className="w-12 h-12 flex items-center justify-center rounded-[1.25rem] bg-surface border border-border text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95 shadow-sm"
                        title="Deletar Sermão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

          {filteredSermons.length === 0 && !loading && (
             <div className="py-32 text-center opacity-20 italic flex flex-col items-center">
                <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-40" />
                <p className="mb-8">Nenhuma pregação encontrada com esses critérios.</p>
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {CATEGORIES.map(cat => (
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
