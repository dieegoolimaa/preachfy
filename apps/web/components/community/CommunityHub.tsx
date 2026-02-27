"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Link as LinkIcon, MessageSquare, 
  Calendar, Shield, ChevronRight, ChevronDown, Search, 
  Send, Clock,
  Share2, 
  Zap, 
  Trash2,
  Edit,
  MoreVertical, 
  CheckCircle2, 
  BookOpen,
  Bell, Loader2, ArrowLeft, X, FileText
} from "lucide-react";
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { RiceBeansLogo } from '@/components/ui/RiceBeansLogo';
import { clsx, type ClassValue } from 'clsx';

import { twMerge } from 'tailwind-merge';
import { environment } from '@/environments';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LABEL_MAP: Record<string, { label: string; color: string }> = {
  TEXTO_BASE: { label: 'Texto Base', color: '#94a3b8' },
  EXEGESE: { label: 'Hermenêutica / Exegese', color: '#818cf8' },
  APLICACAO: { label: 'Aplicação Pastoral', color: '#f97316' },
  ILUSTRACAO: { label: 'Ilustração', color: '#eab308' },
  ENFASE: { label: 'Ênfase / Alerta', color: '#fca5a5' },
  ALERTA: { label: 'Alerta / Aviso', color: '#fca5a5' },
  MANDAMENTO: { label: 'Mandamento', color: '#fdba74' },
  PROMESSA: { label: 'Promessa', color: '#fcd34d' },
  CONTEXTO: { label: 'Contexto', color: '#fef08a' },
  VIDA: { label: 'Vida / Crescimento', color: '#6ee7b7' },
  ESPIRITO_SANTO: { label: 'Espírito Santo', color: '#5eead4' },
  CEU: { label: 'Desceu do Céu', color: '#7dd3fc' },
  PROFECIA: { label: 'Profecia', color: '#93c5fd' },
  CRISTO: { label: 'Cristo / Realeza', color: '#a5b4fc' },
  ADORACAO: { label: 'Adoração', color: '#c4b5fd' },
  AMOR: { label: 'Amor / Graça', color: '#fda4af' },
  PECADO: { label: 'Pecado / Perdão', color: '#f5d0fe' },
  HISTORIA: { label: 'História', color: '#cbd5e1' },
  SIGNIFICADO: { label: 'Significado', color: '#a8a29e' },
};

export default function CommunityHub({ onBack, onViewSermon }: { onBack?: () => void, onViewSermon?: (sermonId: string) => void }) {
  const { data: session } = useSession();
  const [communities, setCommunities] = useState<any[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'FEED' | 'AGENDA'>('FEED');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'ONLINE', meetLink: '', description: '', participants: [] as string[] });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventMenuOpenId, setEventMenuOpenId] = useState<string | null>(null);
  
  // Post management
  const [postMenuOpenId, setPostMenuOpenId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostContent, setEditPostContent] = useState('');

  // Composer attachments
  const [attachSermon, setAttachSermon] = useState(false);
  const [attachEvent, setAttachEvent] = useState(false);
  const [mySermons, setMySermons] = useState<any[]>([]);
  const [selectedSermonId, setSelectedSermonId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventAttachMode, setEventAttachMode] = useState<'select' | 'create'>('select');
  const [inlineEvent, setInlineEvent] = useState({ title: '', date: '', type: 'ONLINE', meetLink: '' });

  useEffect(() => {
    if (session?.user?.id) fetchCommunities();
  }, [session?.user?.id]);

  useEffect(() => {
    if (activeCommunity?.id) {
      fetchFeed(activeCommunity.id);
      fetchEvents(activeCommunity.id);
      fetchMembers(activeCommunity.id);
    }
  }, [activeCommunity?.id]);

  const fetchCommunities = async () => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/my/${session?.user?.id}`);
      const data = await res.json();
      setCommunities(data);
      if (data.length > 0 && !activeCommunity) setActiveCommunity(data[0]);
    } catch (e) { console.error("Failed to fetch communities", e); }
    finally { setLoading(false); }
  };

  const fetchFeed = async (communityId: string) => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/feed`);
      const data = await res.json();
      setFeed(data);
    } catch (e) { console.error("Failed to fetch feed", e); }
  };

  const fetchEvents = async (communityId: string) => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/events`);
      const data = await res.json();
      setEvents(data);
    } catch (e) { console.error("Failed to fetch events", e); }
  };

  const fetchMembers = async (communityId: string) => {
    try {
      const res = await fetch(`${environment.apiUrl}/community/${communityId}/members`);
      const data = await res.json();
      setMembers(data);
    } catch (e) { console.error("Failed to fetch members", e); }
  };

  const fetchMySermons = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`${environment.apiUrl}/sermons?authorId=${session.user.id}`);
      const data = await res.json();
      setMySermons(data);
    } catch (e) { console.error("Failed to fetch sermons", e); }
  };

  // ─── POST actions ─────────────────────────────

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !activeCommunity || !session?.user?.id) return;
    setIsPosting(true);
    try {
      // Resolve event attachment
      let eventId: string | undefined = undefined;
      if (attachEvent) {
        if (eventAttachMode === 'select' && selectedEventId) {
          // Use existing event
          eventId = selectedEventId;
        } else if (eventAttachMode === 'create' && inlineEvent.title && inlineEvent.date) {
          // Create new event first
          const evRes = await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id, ...inlineEvent })
          });
          if (evRes.ok) {
            const ev = await evRes.json();
            eventId = ev.id;
          }
        }
      }

      const res = await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          content: newPostContent,
          type: selectedSermonId ? 'SERMAO' : 'ALINHAMENTO',
          sermonId: selectedSermonId || undefined,
          eventId: eventId || undefined
        })
      });
      if (res.ok) {
        setNewPostContent('');
        setAttachSermon(false);
        setAttachEvent(false);
        setSelectedSermonId(null);
        setSelectedEventId(null);
        setEventAttachMode('select');
        setInlineEvent({ title: '', date: '', type: 'ONLINE', meetLink: '' });
        fetchFeed(activeCommunity.id);
        if (eventId) fetchEvents(activeCommunity.id);
      }
    } catch (e) { console.error("Failed to post", e); }
    finally { setIsPosting(false); }
  };

  const handleUpdatePost = async () => {
    if (!editingPost?.id || !session?.user?.id) return;
    try {
      const res = await fetch(`${environment.apiUrl}/community/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, content: editPostContent })
      });
      if (res.ok) {
        setEditingPost(null);
        fetchFeed(activeCommunity.id);
      }
    } catch (e) { console.error("Failed to update post", e); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!session?.user?.id || !confirm('Tem certeza que deseja excluir este post?')) return;
    try {
      await fetch(`${environment.apiUrl}/community/posts/${postId}?userId=${session.user.id}`, {
        method: 'DELETE',
      });
      fetchFeed(activeCommunity.id);
    } catch (e) { console.error("Failed to delete post", e); }
  };

  const handleAcknowledge = async (postId: string) => {
    if (!session?.user?.id) return;
    try {
      await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/posts/${postId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      fetchFeed(activeCommunity.id);
    } catch (e) { console.error("Failed to acknowledge", e); }
  };

  const handleCloneSermon = async (sermonId: string) => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`${environment.apiUrl}/sermons/${sermonId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      if (res.ok) {
        const cloned = await res.json();
        alert('Sermão adicionado ao seu Studio com sucesso!');
        if (onViewSermon) onViewSermon(cloned.id);
      }
    } catch (e) { console.error("Failed to clone sermon", e); }
  };

  // ─── COMMUNITY ─────────────────────────────

  const handleCreateCommunity = async () => {
    if (!newCommunityName || !session?.user?.id) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: session.user.id, name: newCommunityName })
      });
      if (res.ok) {
        setNewCommunityName('');
        setShowCreateModal(false);
        fetchCommunities();
      }
    } catch (e) { console.error("Failed to create community", e); }
    finally { setIsCreating(false); }
  };

  const handleCopyInvite = () => {
    if (!activeCommunity?.inviteCode) return;
    const url = `${window.location.origin}${window.location.pathname}?join=${activeCommunity.inviteCode}`;
    navigator.clipboard.writeText(`Paz! Gostaria de te convidar para nossa comunidade ministerial no Rice & Beans Preaching. Acesse pelo link: ${url}`);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 3000);
  };

  // ─── EVENTS ─────────────────────────────

  const handleCreateEvent = async () => {
    if (!newEvent.title || !activeCommunity?.id || !session?.user?.id) return;
    setIsCreatingEvent(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community/${activeCommunity.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, userId: session.user.id })
      });
      if (res.ok) {
        setShowEventModal(false);
        setNewEvent({ title: '', date: '', type: 'ONLINE', meetLink: '', description: '', participants: [] });
        fetchEvents(activeCommunity.id);
      }
    } catch (e) { console.error("Failed to create event", e); }
    finally { setIsCreatingEvent(false); }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent?.id || !session?.user?.id) return;
    setIsCreatingEvent(true);
    try {
      const res = await fetch(`${environment.apiUrl}/community/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: session.user.id,
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          type: editingEvent.type,
          meetLink: editingEvent.meetLink
        })
      });
      if (res.ok) {
        setShowEditEventModal(false);
        fetchEvents(activeCommunity.id);
      }
    } catch (e) { console.error("Failed to update event", e); }
    finally { setIsCreatingEvent(false); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!session?.user?.id || !confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await fetch(`${environment.apiUrl}/community/events/${eventId}?userId=${session.user.id}`, {
        method: 'DELETE',
      });
      fetchEvents(activeCommunity.id);
    } catch (e) { console.error("Failed to delete event", e); }
  };

  // ─── RENDER HELPERS ─────────────────────────

  const canManagePost = (post: any) => {
    if (!session?.user?.id) return false;
    if (post.authorId === session?.user?.id) return true;
    const myMember = members.find(m => m.userId === session?.user?.id);
    return myMember?.role === 'LEADER';
  };

  const renderSermonContent = (sermon: any) => {
    if (!sermon) return null;
    const bibleSources = Array.isArray(sermon.bibleSources) ? sermon.bibleSources : [];
    const blocks = Array.isArray(sermon.blocks) ? sermon.blocks : [];

    return (
      <div className="mt-4 border border-border/60 rounded-2xl overflow-hidden bg-background/50">
        {/* Sermon header */}
        <div className="px-5 py-4 bg-brand-red/5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-brand-red" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red">Sermão Anexado</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{sermon.category || 'Estudo'}</span>
        </div>

        <div className="px-5 py-4">
          <h4 className="text-lg font-serif font-black italic text-foreground/90 mb-4 uppercase">{sermon.title}</h4>

          <div className="max-h-[350px] overflow-y-auto space-y-4" style={{ scrollbarWidth: 'thin' }}>
            {bibleSources.length > 0 ? bibleSources.map((source: any, srcIdx: number) => {
              const sourceBlocks = blocks.filter((b: any) => b.metadata?.bibleSourceId === source.id && b.type === 'TEXTO_BASE');
              return (
                <div key={srcIdx} className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-brand-red/10 flex items-center justify-center">
                      <BookOpen className="w-2.5 h-2.5 text-brand-red" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-red">{source.reference}</span>
                  </div>
                  {sourceBlocks.map((block: any) => {
                    const childInsights = blocks.filter((b: any) => b.metadata?.parentVerseId === block.id && b.type !== 'TEXTO_BASE');
                    return (
                      <div key={block.id} className="mb-3">
                        <p className="text-sm text-foreground/75 leading-relaxed font-medium pl-3 border-l-2 border-foreground/10">{block.content}</p>
                        {childInsights.length > 0 && (
                          <div className="pl-3 ml-3 space-y-1 mt-1.5">
                            {childInsights.map((ins: any) => {
                              const cat = LABEL_MAP[ins.type] || { label: ins.type, color: '#94a3b8' };
                              return (
                                <div key={ins.id} className="flex items-start gap-2">
                                  <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest"
                                    style={{ backgroundColor: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}30` }}
                                  >{cat.label}</span>
                                  <span className="text-xs text-foreground/55 leading-relaxed">{ins.content}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }) : blocks.length > 0 ? blocks.map((block: any) => {
              const cat = LABEL_MAP[block.type] || { label: block.type, color: '#94a3b8' };
              return (
                <div key={block.id} className="flex items-start gap-2 mb-2">
                  <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest"
                    style={{ backgroundColor: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}30` }}
                  >{cat.label}</span>
                  <span className="text-xs text-foreground/65 leading-relaxed">{block.content}</span>
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground/40 italic">Sermão sem conteúdo registado.</p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-foreground/[0.02] border-t border-border/40 flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30">
            {blocks.length} blocos
          </span>
          <button 
            onClick={() => handleCloneSermon(sermon.id)}
            className="flex items-center gap-2 px-5 py-2 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            Adicionar ao Studio
          </button>
        </div>
      </div>
    );
  };

  const renderEventAttachment = (event: any) => {
    if (!event) return null;
    return (
      <div className="mt-4 border border-brand-gold/30 rounded-2xl overflow-hidden bg-brand-gold/5">
        <div className="px-5 py-3 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-brand-gold" />
          <div className="flex-1">
            <span className="text-xs font-black text-foreground">{event.title}</span>
            <div className="text-[9px] font-black uppercase tracking-widest text-foreground/40">
              {new Date(event.date).toLocaleDateString('pt-BR')} às {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          {event.meetLink && (
            <a href={event.meetLink} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-gold text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
            >Aceder</a>
          )}
        </div>
      </div>
    );
  };

  // ─── LOADING / NO COMMUNITY ─────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
    </div>
  );

  if (!activeCommunity) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-10 p-8">
      <RiceBeansLogo className="w-20 h-20" />
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-black italic font-serif mb-2">Comunidade Ministerial</h1>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-8">Crie ou junte-se a uma comunidade para alinhar sua visão ministerial com outros líderes.</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => setShowCreateModal(true)} className="w-full py-4 bg-foreground text-background rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-red transition-all">
            <Plus className="w-4 h-4 inline mr-2" />Criar Comunidade
          </button>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface rounded-[2rem] p-8 w-full max-w-md border border-border shadow-2xl">
              <h2 className="text-lg font-black italic font-serif mb-6">Nova Comunidade</h2>
              <input value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} placeholder="Nome da comunidade..." className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all mb-6" />
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
                <button onClick={handleCreateCommunity} disabled={isCreating} className="flex-1 py-3 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-red transition-all disabled:opacity-50">
                  {isCreating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── MAIN LAYOUT ─────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-black italic font-serif text-foreground leading-tight">{activeCommunity?.name}</h1>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">{activeCommunity?._count?.members || 0} membros</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleCopyInvite} className="px-4 py-2 bg-surface border border-border rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all flex items-center gap-2">
              <LinkIcon className="w-3 h-3" />Convidar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-6 flex gap-1">
          {(['FEED', 'AGENDA'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2",
                activeTab === tab ? "border-brand-red text-brand-red" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >{tab === 'FEED' ? 'Feed' : 'Agenda'}</button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ────── FEED TAB ────── */}
        {activeTab === 'FEED' && (
          <div className="space-y-8">
            {/* Composer */}
            <div className="bg-surface border border-border/80 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center border border-brand-red/20 text-xs font-black text-brand-red overflow-hidden shrink-0">
                  {session?.user?.image ? <img src={session.user.image} className="w-full h-full object-cover" alt="" /> : session?.user?.name?.[0]}
                </div>
                <textarea
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="Lançar um alinhamento ou partilhar um estudo..."
                  className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/40 min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Attachment: Sermon Picker */}
              {attachSermon && (
                <div className="mt-4 p-4 bg-brand-red/5 border border-brand-red/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-red">Anexar Sermão</span>
                    <button onClick={() => { setAttachSermon(false); setSelectedSermonId(null); }}><X className="w-4 h-4 text-brand-red" /></button>
                  </div>
                  {mySermons.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum sermão encontrado no seu Studio.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {mySermons.map(s => (
                        <button key={s.id} onClick={() => setSelectedSermonId(s.id)}
                          className={cn("w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all border", selectedSermonId === s.id ? "bg-brand-red/10 border-brand-red/30 text-brand-red" : "bg-background border-border hover:bg-muted")}
                        >
                          <span className="font-black">{s.title}</span>
                          <span className="text-muted-foreground ml-2">{s.category || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment: Event (Select or Create) */}
              {attachEvent && (
                <div className="mt-4 p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold">Anexar Agendamento</span>
                    <button onClick={() => { setAttachEvent(false); setSelectedEventId(null); }}><X className="w-4 h-4 text-brand-gold" /></button>
                  </div>

                  {/* Toggle: Select existing vs Create new */}
                  <div className="flex gap-1 mb-4 p-1 bg-background rounded-xl border border-border">
                    <button onClick={() => setEventAttachMode('select')}
                      className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", eventAttachMode === 'select' ? "bg-brand-gold text-white" : "text-muted-foreground hover:text-foreground")}
                    >Selecionar Existente</button>
                    <button onClick={() => setEventAttachMode('create')}
                      className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", eventAttachMode === 'create' ? "bg-brand-gold text-white" : "text-muted-foreground hover:text-foreground")}
                    >Criar Novo</button>
                  </div>

                  {eventAttachMode === 'select' ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {events.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum evento agendado. Crie um novo.</p>
                      ) : events.map(ev => (
                        <button key={ev.id} onClick={() => setSelectedEventId(ev.id)}
                          className={cn("w-full text-left px-4 py-3 rounded-xl text-xs transition-all border flex items-center gap-3", selectedEventId === ev.id ? "bg-brand-gold/10 border-brand-gold/30 text-brand-gold" : "bg-background border-border hover:bg-muted")}
                        >
                          <Calendar className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-black block truncate">{ev.title}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                              {new Date(ev.date).toLocaleDateString('pt-BR')} às {new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {selectedEventId === ev.id && <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <input value={inlineEvent.title} onChange={e => setInlineEvent(p => ({ ...p, title: e.target.value }))} placeholder="Título do evento" className="col-span-2 px-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-gold transition-all" />
                      <input type="datetime-local" value={inlineEvent.date} onChange={e => setInlineEvent(p => ({ ...p, date: e.target.value }))} className="px-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-gold transition-all" />
                      <input value={inlineEvent.meetLink} onChange={e => setInlineEvent(p => ({ ...p, meetLink: e.target.value }))} placeholder="Link da reunião (opcional)" className="px-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-gold transition-all" />
                    </div>
                  )}
                </div>
              )}

              {/* Composer Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAttachSermon(!attachSermon); if (!attachSermon) fetchMySermons(); }}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", attachSermon ? "bg-brand-red/10 text-brand-red" : "hover:bg-muted text-muted-foreground")}
                  ><FileText className="w-3.5 h-3.5" />Sermão</button>
                  <button onClick={() => setAttachEvent(!attachEvent)}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", attachEvent ? "bg-brand-gold/10 text-brand-gold" : "hover:bg-muted text-muted-foreground")}
                  ><Calendar className="w-3.5 h-3.5" />Evento</button>
                </div>
                <button onClick={handleCreatePost} disabled={isPosting || !newPostContent.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red transition-all disabled:opacity-30 active:scale-95"
                >
                  {isPosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Publicar
                </button>
              </div>
            </div>

            {/* Feed Posts */}
            {feed.map(post => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border/80 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-xs font-black text-indigo-600 overflow-hidden">
                        {post.authorImage ? <img src={post.authorImage} className="w-full h-full object-cover" alt="" /> : post.authorName?.[0]}
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-tight">{post.authorName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">
                            {new Date(post.createdAt).toLocaleDateString('pt-BR')} às {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest",
                            post.type === 'SERMAO' ? "bg-brand-red/10 text-brand-red" : "bg-indigo-500/10 text-indigo-500"
                          )}>
                            {post.type === 'SERMAO' ? 'Sermão' : 'Alinhamento'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions menu */}
                    {canManagePost(post) && (
                      <div className="relative">
                        <button onClick={() => setPostMenuOpenId(postMenuOpenId === post.id ? null : post.id)}
                          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-all"
                        ><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                        {postMenuOpenId === post.id && (
                          <div className="absolute right-0 top-10 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]">
                            <button onClick={() => { setEditingPost(post); setEditPostContent(post.content); setPostMenuOpenId(null); }}
                              className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest hover:bg-muted flex items-center gap-2 transition-all"
                            ><Edit className="w-3 h-3" />Editar</button>
                            <button onClick={() => { handleDeletePost(post.id); setPostMenuOpenId(null); }}
                              className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest hover:bg-red-50 text-red-600 flex items-center gap-2 transition-all"
                            ><Trash2 className="w-3 h-3" />Eliminar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  {editingPost?.id === post.id ? (
                    <div className="space-y-3">
                      <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-4 text-sm outline-none resize-none min-h-[80px] focus:border-brand-red transition-all" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingPost(null)} className="px-4 py-2 border border-border rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-muted">Cancelar</button>
                        <button onClick={handleUpdatePost} className="px-4 py-2 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red">Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Sermon Attachment */}
                  {post.type === 'SERMAO' && post.sermon && renderSermonContent(post.sermon)}

                  {/* Event Attachment */}
                  {post.event && renderEventAttachment(post.event)}

                  {/* Acknowledge Footer (only for ALINHAMENTO) */}
                  {post.type === 'ALINHAMENTO' && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                      <div className="flex items-center gap-1">
                        {(post.vistoPorData || []).slice(0, 6).map((u: any, i: number) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-emerald-500/10 border-2 border-surface flex items-center justify-center text-[8px] font-black text-emerald-600 overflow-hidden -ml-1.5 first:ml-0">
                            {u.image ? <img src={u.image} className="w-full h-full object-cover" alt="" /> : u.name?.[0]}
                          </div>
                        ))}
                        {(post.vistoPor?.length || 0) > 6 && (
                          <span className="text-[8px] font-black text-muted-foreground ml-1">+{post.vistoPor.length - 6}</span>
                        )}
                      </div>
                      {!post.vistoPor?.includes(session?.user?.id) ? (
                        <button onClick={() => handleAcknowledge(post.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                        ><CheckCircle2 className="w-3.5 h-3.5" />Recebido</button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />Alinhado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            ))}

            {feed.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-[3rem] opacity-20 italic flex flex-col items-center gap-4">
                <RiceBeansLogo className="w-12 h-12 grayscale opacity-50" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">Nenhum post publicado ainda.</span>
              </div>
            )}
          </div>
        )}

        {/* ────── AGENDA TAB ────── */}
        {activeTab === 'AGENDA' && (
          <div className="space-y-10">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-lg font-black italic font-serif text-foreground">Agenda</h2>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">Eventos e reuniões</span>
              </div>
              <button onClick={() => setShowEventModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-foreground text-background rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red transition-all"
              ><Plus className="w-4 h-4" />Novo Evento</button>
            </div>

            {events.map(event => {
              const isPast = new Date(event.date) < new Date();
              return (
                <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("bg-surface border border-border/80 rounded-[2rem] overflow-hidden shadow-sm", isPast && "opacity-40")}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                          <Calendar className="w-5 h-5 text-brand-gold" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-foreground">{event.title}</h3>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.meetLink && (
                          <a href={event.meetLink} target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-brand-gold text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                          >Aceder à Reunião</a>
                        )}
                        <div className="relative">
                          <button onClick={() => setEventMenuOpenId(eventMenuOpenId === event.id ? null : event.id)}
                            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                          ><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                          {eventMenuOpenId === event.id && (
                            <div className="absolute right-0 top-10 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]">
                              <button onClick={() => { setEditingEvent(event); setShowEditEventModal(true); setEventMenuOpenId(null); }}
                                className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest hover:bg-muted flex items-center gap-2"
                              ><Edit className="w-3 h-3" />Editar</button>
                              <button onClick={() => { handleDeleteEvent(event.id); setEventMenuOpenId(null); }}
                                className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest hover:bg-red-50 text-red-600 flex items-center gap-2"
                              ><Trash2 className="w-3 h-3" />Eliminar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>}
                  </div>
                </motion.div>
              );
            })}

            {events.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-[3rem] opacity-20 italic flex flex-col items-center gap-4">
                <Calendar className="w-12 h-12" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">Nenhum evento agendado.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface rounded-[2rem] p-8 w-full max-w-lg border border-border shadow-2xl">
              <h2 className="text-lg font-black italic font-serif mb-6">Novo Evento</h2>
              <div className="space-y-4">
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Título do evento" className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
                <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" rows={2} className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none resize-none focus:border-brand-red transition-all" />
                <input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
                <input value={newEvent.meetLink} onChange={e => setNewEvent(p => ({ ...p, meetLink: e.target.value }))} placeholder="Link da reunião (opcional)" className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
                
                {/* Participant Selection */}
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Participantes</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {members.map(m => (
                      <label key={m.id} className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-muted transition-all cursor-pointer">
                        <input type="checkbox" checked={newEvent.participants.includes(m.userId)}
                          onChange={e => {
                            setNewEvent(p => ({
                              ...p,
                              participants: e.target.checked 
                                ? [...p.participants, m.userId] 
                                : p.participants.filter(id => id !== m.userId)
                            }));
                          }}
                          className="w-4 h-4 accent-brand-red"
                        />
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[8px] font-black text-indigo-600 overflow-hidden">
                          {m.user?.image ? <img src={m.user.image} className="w-full h-full object-cover" alt="" /> : m.user?.name?.[0]}
                        </div>
                        <span className="text-xs font-medium">{m.user?.name || m.user?.email}</span>
                        {m.role === 'LEADER' && <span className="text-[7px] font-black uppercase tracking-widest text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">Líder</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
                <button onClick={handleCreateEvent} disabled={isCreatingEvent} className="flex-1 py-3 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-red transition-all disabled:opacity-50">
                  {isCreatingEvent ? 'Criando...' : 'Criar Evento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {showEditEventModal && editingEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface rounded-[2rem] p-8 w-full max-w-lg border border-border shadow-2xl">
              <h2 className="text-lg font-black italic font-serif mb-6">Editar Evento</h2>
              <div className="space-y-4">
                <input value={editingEvent.title} onChange={e => setEditingEvent((p: any) => ({ ...p, title: e.target.value }))} className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
                <textarea value={editingEvent.description || ''} onChange={e => setEditingEvent((p: any) => ({ ...p, description: e.target.value }))} placeholder="Descrição" rows={2} className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none resize-none focus:border-brand-red transition-all" />
                <input type="datetime-local" value={editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''} onChange={e => setEditingEvent((p: any) => ({ ...p, date: e.target.value }))} className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
                <input value={editingEvent.meetLink || ''} onChange={e => setEditingEvent((p: any) => ({ ...p, meetLink: e.target.value }))} placeholder="Link da reunião" className="w-full px-5 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-brand-red transition-all" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditEventModal(false)} className="flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
                <button onClick={handleUpdateEvent} disabled={isCreatingEvent} className="flex-1 py-3 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-red transition-all disabled:opacity-50">
                  {isCreatingEvent ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Invite Toast */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 bg-foreground text-background rounded-[2rem] shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-widest">Link copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
