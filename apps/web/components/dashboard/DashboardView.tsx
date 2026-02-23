import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Play, Clock, MoreVertical, Calendar, Search } from 'lucide-react';
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
}

interface DashboardViewProps {
  onEdit: (sermon: SermonMeta) => void;
  onStart: (sermon: SermonMeta, timeInMinutes: number) => void;
}

const MOCK_SERMONS: SermonMeta[] = [
  { id: '1', title: 'A Luz que Resplandece nas Trevas', date: '21 de Out, 2026', duration: 45 },
  { id: '2', title: 'O Caminho, a Verdade e a Vida', date: '14 de Out, 2026', duration: 50 },
  { id: '3', title: 'A Graça que Transborda', date: '07 de Out, 2026', duration: 40 },
];

export default function DashboardView({ onEdit, onStart }: DashboardViewProps) {
  const [sermons, setSermons] = useState<SermonMeta[]>(MOCK_SERMONS);
  const [preparingStartId, setPreparingStartId] = useState<string | null>(null);
  const [targetTime, setTargetTime] = useState<number>(45);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSermons = sermons.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    const newSermon: SermonMeta = {
      id: Date.now().toString(),
      title: 'Novo Sermão',
      date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
    };
    setSermons([newSermon, ...sermons]);
    onEdit(newSermon);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      <header className="h-24 sticky top-0 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-12 z-50">
        <h1 className="text-3xl font-serif text-foreground tracking-tighter">
          Preachfy <span className="text-[12px] font-mono tracking-widest align-middle opacity-50 ml-2 uppercase">Workbench</span>
        </h1>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-mono text-sm tracking-widest uppercase">
            DL
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto mt-12 px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-mono tracking-[0.2em] font-medium uppercase text-muted-foreground flex-shrink-0">Meus Sermões</h2>
          
          <div className="flex-1 max-w-lg mx-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Buscar pregações..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface/30 border border-border/40 rounded-full py-2 pl-11 pr-4 text-xs font-sans text-foreground outline-none focus:border-foreground/20 transition-colors shadow-sm"
            />
          </div>

          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-sans text-[11px] font-medium uppercase tracking-[0.1em] hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Novo
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {filteredSermons.map((sermon) => (
            <div 
              key={sermon.id} 
              className="group relative flex items-center justify-between bg-surface/30 border border-border/40 rounded-2xl h-[88px] hover:shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all duration-300"
            >
              <div className="flex items-center flex-1 h-full pl-8 pr-4 gap-8">
                <div className="flex items-center gap-2 text-[10px] font-sans font-medium uppercase text-muted-foreground/50 w-32 shrink-0">
                  <Calendar className="w-3.5 h-3.5 mb-0.5" /> {sermon.date}
                </div>

                <h3 className="text-lg font-serif text-foreground line-clamp-1 flex-1">
                  {sermon.title}
                </h3>
              </div>

              <div className="flex items-center h-full shrink-0 pr-8 z-10">
                <AnimatePresence mode="wait">
                  {preparingStartId === sermon.id ? (
                    <motion.div 
                      key="timer-controls"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-6 h-full border-l border-border/40 pl-6 bg-surface/20"
                    >
                      <button onClick={() => setPreparingStartId(null)} className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors mr-2">
                         <span className="text-xl font-light">×</span>
                      </button>
                      
                      <button 
                        onClick={() => setTargetTime(Math.max(5, targetTime - 5))}
                        className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-lg text-muted-foreground hover:bg-surface/50 transition-colors"
                      >
                        -
                      </button>
                      <div className="text-6xl font-sans tracking-tighter" style={{ color: '#d4af37' /* Subtle Gold matching image */, transform: 'translateY(-2px)' }}>
                        {targetTime}
                      </div>
                      <button 
                        onClick={() => setTargetTime(targetTime + 5)}
                        className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-lg text-muted-foreground hover:bg-surface/50 transition-colors"
                      >
                        +
                      </button>

                      <button 
                        onClick={() => {
                          setPreparingStartId(null);
                          onStart(sermon, targetTime);
                        }}
                        className="ml-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background font-sans text-[11px] font-medium uppercase tracking-[0.1em] hover:opacity-90 transition-opacity"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Começar
                      </button>

                    </motion.div>
                  ) : (
                    <motion.div 
                      key="standard-actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-4"
                    >
                      <button 
                        onClick={() => onEdit(sermon)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-border/50 text-[10px] font-sans font-medium tracking-[0.15em] uppercase text-muted-foreground hover:bg-surface/50 hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      
                      <button 
                        onClick={() => setPreparingStartId(sermon.id)}
                        className="w-12 h-10 flex items-center justify-center rounded-xl bg-slate-600 text-white hover:brightness-110 transition-all shadow-[0_2px_10px_rgba(71,85,105,0.2)]"
                      >
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      </button>

                      <button className="p-2 ml-2 text-muted-foreground/30 hover:text-foreground transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
