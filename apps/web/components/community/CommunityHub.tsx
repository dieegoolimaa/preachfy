"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Link as LinkIcon, MessageSquare, 
  Calendar, Shield, ChevronRight, Share2, 
  CheckCircle2, Bell, Search, MoreVertical, Send, Loader2,
  ArrowLeft, Zap
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { RiceBeansLogo } from '@/components/ui/RiceBeansLogo';
import { clsx, type ClassValue } from 'clsx';

import { twMerge } from 'tailwind-merge';
import { environment } from '@/environments';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CommunityHub({ onBack }: { onBack?: () => void }) {
  const { data: session } = useSession();
  const [communities, setCommunities] = useState<any[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'FEED'>('FEED');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'ONLINE', meetLink: '', description: '' });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCommunities();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (activeCommunity) {
      fetchFeed(activeCommunity.id);
    }
  }, [activeCommunity]);

  const fetchCommunities = async () => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/my/${session?.user?.id}`);
      const data = await res.json();
      setCommunities(data);
      if (data.length > 0 && !activeCommunity) {
        setActiveCommunity(data[0]);
      }
    } catch (e) {
      console.error("Failed to fetch communities", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async (communityId: string) => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/feed`);
      const data = await res.json();
      setFeed(data);
    } catch (e) {
      console.error("Failed to fetch feed", e);
    }
  };

  const fetchEvents = async (communityId: string) => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/events`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error("Failed to fetch events", e);
    }
  };

  useEffect(() => {
    if (activeCommunity?.id) {
      fetchFeed(activeCommunity.id);
      fetchEvents(activeCommunity.id);
    }
  }, [activeCommunity?.id]);

  const handleCreatePost = async () => {
    if (!newPostContent || !activeCommunity || !session?.user?.id) return;
    setIsPosting(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, content: newPostContent })
      });
      if (res.ok) {
        setNewPostContent('');
        fetchFeed(activeCommunity.id);
      }
    } catch (e) {
      console.error("Failed to post", e);
    } finally {
      setIsPosting(false);
    }
  };

  const handleAcknowledge = async (postId: string) => {
    if (!session?.user?.id) return;
    try {
      await fetch(`${environment.apiUrl}/community/post/${postId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      fetchFeed(activeCommunity.id);
    } catch (e) {
      console.error("Failed to acknowledge", e);
    }
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName || !session?.user?.id) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, name: newCommunityName })
      });
      if (res.ok) {
        setNewCommunityName('');
        setShowCreateModal(false);
        fetchCommunities();
      }
    } catch (e) {
      console.error("Failed to create community", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyInvite = () => {
    if (!activeCommunity?.inviteCode) return;
    const url = `${window.location.origin}${window.location.pathname}?join=${activeCommunity.inviteCode}`;
    navigator.clipboard.writeText(`Paz! Gostaria de te convidar para nossa comunidade ministerial no Rice & Beans Preaching. Acesse pelo link: ${url}`);
    alert("Link de convite copiado para a área de transferência!");
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !activeCommunity?.id || !session?.user?.id) return;
    setIsCreatingEvent(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, userId: session.user.id })
      });
      if (res.ok) {
        setShowEventModal(false);
        setNewEvent({ title: '', date: '', type: 'ONLINE', meetLink: '', description: '' });
        fetchEvents(activeCommunity.id);
      }
    } catch (e) {
      console.error("Failed to create event", e);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-red opacity-20" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-5rem)] bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar - Community List */}
      <aside className="w-full lg:w-72 border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comunidades</h2>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 hover:bg-foreground/5 rounded-full transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..."
              className="w-full bg-foreground/5 border-none rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {communities.map((community) => (
             <button 
               key={community.id}
               onClick={() => setActiveCommunity(community)}
               className={cn(
                 "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                 activeCommunity?.id === community.id 
                   ? "bg-foreground/5 shadow-sm" 
                   : "hover:bg-foreground/[0.02]"
               )}
             >
               <div className={cn(
                 "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all font-bold text-xs uppercase",
                 activeCommunity?.id === community.id 
                   ? "bg-foreground text-background border-foreground" 
                   : "bg-foreground/5 border-border/50 text-foreground/40"
               )}>
                  {community.name.slice(0, 2)}
               </div>
               <div className="flex-1 min-w-0">
                 <h4 className="font-semibold text-xs truncate leading-tight">{community.name}</h4>
                 <p className="text-[10px] text-muted-foreground truncate">{community._count?.members || 0} membros</p>
               </div>
               {activeCommunity?.id === community.id && <div className="w-1 h-3 bg-foreground rounded-full" />}
             </button>
          ))}
        </div>

        <div className="p-4 border-t border-border">
           <div className="p-3 rounded-xl bg-foreground/5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 ml-1">Link de Convite</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-[10px] font-mono opacity-40 bg-background/50 px-2 py-1 rounded border border-border/50 block truncate flex-1">
                  {activeCommunity?.inviteCode || '...'}
                </code>
                <button 
                  disabled={!activeCommunity}
                  onClick={handleCopyInvite}
                  className="p-1.5 hover:bg-foreground/5 rounded-lg transition-all disabled:opacity-30 shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content - Feed / Alignment */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto px-12 py-12 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            {/* IN-PAGE TABS */}
            <div className="mb-12 flex items-center justify-between border-b border-border/50 pb-8">
               <div className="flex items-center gap-8">
                <button 
                  onClick={() => setActiveTab('FEED')}
                  className={cn(
                    "text-sm font-bold transition-all relative py-2 tracking-tight",
                    activeTab === 'FEED' ? "text-brand-red" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  FEED DE ALINHAMENTOS
                  {activeTab === 'FEED' && <motion.div layoutId="community-tab" className="absolute -bottom-[33px] left-0 right-0 h-[3px] bg-brand-red rounded-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab('EXPLORE')}
                  className={cn(
                    "text-sm font-bold transition-all relative py-2 tracking-tight",
                    activeTab === 'EXPLORE' ? "text-brand-red" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  AGENDA MINISTERIAL
                  {activeTab === 'EXPLORE' && <motion.div layoutId="community-tab" className="absolute -bottom-[33px] left-0 right-0 h-[3px] bg-brand-red rounded-full" />}
                </button>
               </div>

               <div className="flex items-center gap-3 opacity-20 grayscale pointer-events-none select-none">
                  <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0">
                     <RiceBeansLogo className="w-full h-full drop-shadow-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Comunidade</span>
               </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6 pb-20">
              
              {/* Creator Box */}
              {activeCommunity && (
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground shrink-0 border border-border">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <textarea 
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Lançar um alinhamento..."
                        className="w-full bg-transparent border-none outline-none text-base font-medium text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]"
                      />
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                         <div className="flex items-center gap-1">
                           <button className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground transition-all"><Calendar className="w-4 h-4" /></button>
                           <button className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground transition-all"><LinkIcon className="w-4 h-4" /></button>
                           <button className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground transition-all"><Share2 className="w-4 h-4" /></button>
                         </div>
                         <button 
                           disabled={isPosting || !newPostContent}
                           onClick={handleCreatePost}
                           className="bg-foreground text-background rounded-full px-5 py-2 font-semibold text-xs transition-all hover:opacity-90 disabled:opacity-30"
                         >
                           {isPosting ? 'Enviando...' : 'Confirmar'}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feed Posts */}
              {activeTab === 'FEED' && feed.map((post) => (
                <motion.article 
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:surface transition-all group/post"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground font-bold text-xs border border-border/50">
                         {post.authorName?.[0] || 'A'}
                       </div>
                       <div>
                         <h4 className="text-sm font-bold tracking-tight">{post.authorName || 'Membro'}</h4>
                         <p className="text-xs text-muted-foreground font-medium">
                           {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                    </div>
                    <button className="p-1.5 hover:bg-foreground/5 rounded-full transition-all opacity-0 group-hover/post:opacity-100"><MoreVertical className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="pl-13">
                    <p className="text-lg font-medium leading-relaxed text-foreground whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                      <button 
                        onClick={() => handleAcknowledge(post.id)}
                        disabled={post.vistoPor?.includes(session?.user?.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest",
                          post.vistoPor?.includes(session?.user?.id) 
                            ? "bg-brand-red/10 text-brand-red cursor-default" 
                            : "bg-foreground/5 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {post.vistoPor?.includes(session?.user?.id) ? 'Recebido' : 'Confirmar'}
                        </span>
                      </button>

                      <div className="flex -space-x-2 overflow-hidden">
                         {post.vistoPor?.slice(0, 3).map((vistoId: string) => (
                            <div key={vistoId} className="inline-block h-6 w-6 rounded-full ring-2 ring-surface bg-foreground/10 border border-border flex items-center justify-center text-[7px] font-bold">
                               {vistoId.slice(-2).toUpperCase()}
                            </div>
                         ))}
                         {post.vistoPor?.length > 3 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-surface bg-foreground text-background text-[7px] font-bold">
                            +{post.vistoPor.length - 3}
                          </div>
                         )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}

              {activeTab === 'FEED' && feed.length === 0 && (
                <div className="py-20 text-center opacity-30 italic">
                  Ainda não há alinhamentos nesta comunidade.
                </div>
              )}

            {/* Events View */}
            {activeTab === 'EXPLORE' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-tight">Próximos Alinhamentos</h3>
                  <button 
                    onClick={() => setShowEventModal(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:opacity-80 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agendar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {events.map((event, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={event.id || i} 
                      className="p-5 rounded-xl bg-surface border border-border shadow-sm flex items-center justify-between group"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground border border-border/50">
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                             <h3 className="text-sm font-semibold tracking-tight">{event.title}</h3>
                             <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{event.date}</span>
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                  event.type === 'ONLINE' ? "bg-brand-gold/5 border-brand-gold/20 text-brand-gold" : "bg-orange-500/5 border-orange-500/20 text-orange-500"
                                )}>
                                  {event.type}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       {event.type === 'ONLINE' && event.meetLink && (
                         <a 
                           href={event.meetLink.startsWith('http') ? event.meetLink : `https://${event.meetLink}`}
                           target="_blank"
                           rel="noopener noreferrer"
                         >
                           <button className="bg-foreground text-background rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all">Entrar</button>
                         </a>
                       )}
                    </motion.div>
                  ))}
                  
                  {events.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-border rounded-xl opacity-30 text-xs font-medium">
                      Nenhum alinhamento agendado.
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {(showCreateModal || showEventModal) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowCreateModal(false); setShowEventModal(false); }} className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[200]" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }} 
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface border border-border rounded-2xl z-[201] shadow-2xl overflow-hidden p-8"
            >
              {showCreateModal ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Nova Comunidade</h2>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">Crie um hub de alinhamento ministerial.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                      placeholder="Ex: Liderança Central"
                      className="w-full bg-foreground/5 border border-border/50 rounded-xl py-3 px-4 text-sm outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      disabled={isCreating || !newCommunityName}
                      onClick={handleCreateCommunity}
                      className="w-full h-11 bg-foreground text-background rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-30"
                    >
                      {isCreating ? 'Criando...' : 'Criar'}
                    </button>
                    <button onClick={() => setShowCreateModal(false)} className="w-full h-11 text-muted-foreground hover:text-foreground font-semibold text-xs transition-all">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Agendar Alinhamento</h2>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">Crie um novo evento ministerial.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Título</label>
                      <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Papo de Liderança" className="w-full bg-foreground/5 border border-border/50 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-1 focus:ring-foreground/10 transition-all"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Data e Hora</label>
                      <input type="text" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} placeholder="Sábado, 19:00" className="w-full bg-foreground/5 border border-border/50 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-1 focus:ring-foreground/10 transition-all"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tipo</label>
                        <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full bg-foreground/5 border border-border/50 rounded-xl py-3 px-4 text-xs font-semibold appearance-none outline-none">
                          <option value="ONLINE">Digital (Meet)</option>
                          <option value="PRESENCIAL">Presencial</option>
                        </select>
                      </div>
                      {newEvent.type === 'ONLINE' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Link</label>
                          <input type="text" value={newEvent.meetLink} onChange={e => setNewEvent({...newEvent, meetLink: e.target.value})} placeholder="Opcional" className="w-full bg-foreground/5 border border-border/50 rounded-xl py-3 px-4 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 transition-all" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      disabled={isCreatingEvent || !newEvent.title}
                      onClick={handleCreateEvent}
                      className="w-full h-11 bg-foreground text-background rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-30"
                    >
                      {isCreatingEvent ? 'Agendando...' : 'Confirmar'}
                    </button>
                    <button onClick={() => setShowEventModal(false)} className="w-full h-11 text-muted-foreground hover:text-foreground font-semibold text-xs transition-all">Cancelar</button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
