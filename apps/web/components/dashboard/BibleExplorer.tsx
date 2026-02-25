"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, X, ChevronLeft, ChevronRight, BookOpen, Check, Copy, Highlighter, List, Columns, ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Bible Books Data ──────────────────────────────────────────────
const BIBLE_BOOKS = {
  at: [
    { name: 'Gênesis', abbrev: 'gn', chapters: 50 },
    { name: 'Êxodo', abbrev: 'ex', chapters: 40 },
    { name: 'Levítico', abbrev: 'lv', chapters: 27 },
    { name: 'Números', abbrev: 'nm', chapters: 36 },
    { name: 'Deuteronômio', abbrev: 'dt', chapters: 34 },
    { name: 'Josué', abbrev: 'js', chapters: 24 },
    { name: 'Juízes', abbrev: 'jz', chapters: 21 },
    { name: 'Rute', abbrev: 'rt', chapters: 4 },
    { name: '1 Samuel', abbrev: '1sm', chapters: 31 },
    { name: '2 Samuel', abbrev: '2sm', chapters: 24 },
    { name: '1 Reis', abbrev: '1rs', chapters: 22 },
    { name: '2 Reis', abbrev: '2rs', chapters: 25 },
    { name: '1 Crônicas', abbrev: '1cr', chapters: 29 },
    { name: '2 Crônicas', abbrev: '2cr', chapters: 36 },
    { name: 'Esdras', abbrev: 'ed', chapters: 10 },
    { name: 'Neemias', abbrev: 'ne', chapters: 13 },
    { name: 'Ester', abbrev: 'et', chapters: 10 },
    { name: 'Jó', abbrev: 'job', chapters: 42 },
    { name: 'Salmos', abbrev: 'sl', chapters: 150 },
    { name: 'Provérbios', abbrev: 'pv', chapters: 31 },
    { name: 'Eclesiastes', abbrev: 'ec', chapters: 12 },
    { name: 'Cantares', abbrev: 'ct', chapters: 8 },
    { name: 'Isaías', abbrev: 'is', chapters: 66 },
    { name: 'Jeremias', abbrev: 'jr', chapters: 52 },
    { name: 'Lamentações', abbrev: 'lm', chapters: 5 },
    { name: 'Ezequiel', abbrev: 'ez', chapters: 48 },
    { name: 'Daniel', abbrev: 'dn', chapters: 12 },
    { name: 'Oséias', abbrev: 'os', chapters: 14 },
    { name: 'Joel', abbrev: 'jl', chapters: 3 },
    { name: 'Amós', abbrev: 'am', chapters: 9 },
    { name: 'Obadias', abbrev: 'ob', chapters: 1 },
    { name: 'Jonas', abbrev: 'jn', chapters: 4 },
    { name: 'Miquéias', abbrev: 'mq', chapters: 7 },
    { name: 'Naum', abbrev: 'na', chapters: 3 },
    { name: 'Habacuque', abbrev: 'hc', chapters: 3 },
    { name: 'Sofonias', abbrev: 'sf', chapters: 3 },
    { name: 'Ageu', abbrev: 'ag', chapters: 2 },
    { name: 'Zacarias', abbrev: 'zc', chapters: 14 },
    { name: 'Malaquias', abbrev: 'ml', chapters: 4 },
  ],
  nt: [
    { name: 'Mateus', abbrev: 'mt', chapters: 28 },
    { name: 'Marcos', abbrev: 'mc', chapters: 16 },
    { name: 'Lucas', abbrev: 'lc', chapters: 24 },
    { name: 'João', abbrev: 'jo', chapters: 21 },
    { name: 'Atos', abbrev: 'at', chapters: 28 },
    { name: 'Romanos', abbrev: 'rm', chapters: 16 },
    { name: '1 Coríntios', abbrev: '1co', chapters: 16 },
    { name: '2 Coríntios', abbrev: '2co', chapters: 13 },
    { name: 'Gálatas', abbrev: 'gl', chapters: 6 },
    { name: 'Efésios', abbrev: 'ef', chapters: 6 },
    { name: 'Filipenses', abbrev: 'fp', chapters: 4 },
    { name: 'Colossenses', abbrev: 'cl', chapters: 4 },
    { name: '1 Tessalonicenses', abbrev: '1ts', chapters: 5 },
    { name: '2 Tessalonicenses', abbrev: '2ts', chapters: 3 },
    { name: '1 Timóteo', abbrev: '1tm', chapters: 6 },
    { name: '2 Timóteo', abbrev: '2tm', chapters: 4 },
    { name: 'Tito', abbrev: 'tt', chapters: 3 },
    { name: 'Filemom', abbrev: 'fm', chapters: 1 },
    { name: 'Hebreus', abbrev: 'hb', chapters: 13 },
    { name: 'Tiago', abbrev: 'tg', chapters: 5 },
    { name: '1 Pedro', abbrev: '1pe', chapters: 5 },
    { name: '2 Pedro', abbrev: '2pe', chapters: 3 },
    { name: '1 João', abbrev: '1jo', chapters: 5 },
    { name: '2 João', abbrev: '2jo', chapters: 1 },
    { name: '3 João', abbrev: '3jo', chapters: 1 },
    { name: 'Judas', abbrev: 'jd', chapters: 1 },
    { name: 'Apocalipse', abbrev: 'ap', chapters: 22 },
  ],
};

const ALL_VERSIONS = ['nvi', 'ra', 'acf'] as const;
const VERSION_LABELS: Record<string, string> = {
  nvi: 'Nova Versão Internacional',
  ra: 'Almeida Revista e Atualizada',
  acf: 'Almeida Corrigida Fiel',
};

export default function BibleExplorer({ onBack, onCreateSermon }: { onBack: () => void, onCreateSermon?: (reference: string, content: string) => void }) {
  const { environment } = require('@/environments');

  const [query, setQuery] = useState('');
  const [version, setVersion] = useState('nvi');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'READ' | 'SEARCH' | 'INDEX' | 'COMPARE'>('READ');
  const [currentInfo, setCurrentInfo] = useState<{ book: string; abbrev: string; chapter: number }>({
    book: 'Gênesis', abbrev: 'gn', chapter: 1
  });
  const [indexSelectedBook, setIndexSelectedBook] = useState<{ name: string; abbrev: string; chapters: number } | null>(null);
  const [highlightedVerses, setHighlightedVerses] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<Record<string, any>>({});
  const [compareVersions, setCompareVersions] = useState<string[]>(['nvi', 'ra']);
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch(`${environment.apiUrl}/bible/versions`);
        if (!res.ok) return;
        setVersions(await res.json());
      } catch (e) { console.error("Failed to fetch versions", e); }
    };
    fetchVersions();
    loadChapter('gn', 1);
  }, []);

  useEffect(() => {
    if (viewMode === 'READ' && results.length > 0) {
      loadChapter(currentInfo.abbrev, currentInfo.chapter);
    }
  }, [version]);

  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(() => { handleSearch(query); }, 500);
      return () => clearTimeout(timer);
    } else if (query.length === 0 && viewMode !== 'INDEX' && viewMode !== 'COMPARE') {
      loadChapter(currentInfo.abbrev, currentInfo.chapter);
    }
  }, [query]);

  // ── Data Loading ──────────────────────────────────────────────
  const loadChapter = async (abbrev: string, chapter: number) => {
    setLoading(true);
    if (viewMode !== 'INDEX') setViewMode('READ');
    try {
      const res = await fetch(`${environment.apiUrl}/bible/chapter/${version}/${abbrev}/${chapter}`);
      if (!res.ok) { setResults([]); return; }
      const data = await res.json();
      setCurrentInfo({ book: data.book.name, abbrev: data.book.abbrev || abbrev, chapter: data.chapter });
      setResults((data.verses || []).map((v: any) => ({
        book: data.book, chapter: data.chapter, number: v.number, text: v.text
      })));
      scrollRef.current?.scrollTo({ top: 0 });
    } catch (e) { console.error("Chapter load failed", e); setResults([]); }
    finally { setLoading(false); }
  };

  const handleSearch = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${environment.apiUrl}/bible/search?version=${version}&text=${encodeURIComponent(text)}`);
      if (!res.ok) { setResults([]); return; }
      const data = await res.json();
      const verses = data.verses || [];
      const isSingleChapter = verses.length > 0 && verses.every((v: any) =>
        v.book.name === verses[0].book.name && v.chapter === verses[0].chapter
      );
      if (isSingleChapter) {
        setCurrentInfo({ book: verses[0].book.name, abbrev: verses[0].book.abbrev, chapter: verses[0].chapter });
        setViewMode('READ');
      } else { setViewMode('SEARCH'); }
      setResults(verses);
    } catch (e) { console.error("Bible search failed", e); setResults([]); }
    finally { setLoading(false); }
  };

  const loadCompare = async (abbrev?: string, chapter?: number) => {
    setLoading(true);
    setViewMode('COMPARE');
    const a = abbrev || currentInfo.abbrev;
    const c = chapter || currentInfo.chapter;
    try {
      const res = await fetch(`${environment.apiUrl}/bible/compare/${a}/${c}`);
      if (!res.ok) { setCompareData({}); return; }
      const data = await res.json();
      setCompareData(data);
      const firstKey = Object.keys(data)[0] as string | undefined;
      if (firstKey && data[firstKey]?.book) {
        setCurrentInfo({ book: data[firstKey].book.name, abbrev: a, chapter: c });
      }
    } catch (e) { console.error("Compare load failed", e); setCompareData({}); }
    finally { setLoading(false); }
  };

  // ── Actions ───────────────────────────────────────────────────
  const verseKey = (v: any) => `${v.book?.name || v.book}-${v.chapter}-${v.number}`;

  const toggleHighlight = (verse: any) => {
    const key = verseKey(verse);
    setHighlightedVerses(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const copyVerse = (v: any) => {
    navigator.clipboard.writeText(`${v.text} (${v.book.name} ${v.chapter}:${v.number})`);
    setCopiedId(verseKey(v));
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyHighlightedVerses = () => {
    const highlighted = results.filter(v => highlightedVerses.has(verseKey(v)));
    if (!highlighted.length) return;
    const first = highlighted[0], last = highlighted[highlighted.length - 1];
    const ref = first.number === last.number
      ? `${first.book.name} ${first.chapter}:${first.number}`
      : `${first.book.name} ${first.chapter}:${first.number}-${last.number}`;
    navigator.clipboard.writeText(`${highlighted.map(v => `${v.number} ${v.text}`).join(' ')} (${ref})`);
    setCopiedId('range');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createSermonFromSelection = () => {
    const highlighted = results.filter(v => highlightedVerses.has(verseKey(v)));
    if (!highlighted.length || !onCreateSermon) return;
    const first = highlighted[0], last = highlighted[highlighted.length - 1];
    const ref = first.number === last.number
      ? `${first.book.name} ${first.chapter}:${first.number}`
      : `${first.book.name} ${first.chapter}:${first.number}-${last.number}`;
    const text = highlighted.map(v => `${v.number} ${v.text}`).join('\n\n');
    onCreateSermon(ref, text);
  };

  const changeChapter = (offset: number) => {
    const next = currentInfo.chapter + offset;
    if (next < 1) return;
    setHighlightedVerses(new Set());
    if (viewMode === 'COMPARE') {
      loadCompare(currentInfo.abbrev, next);
    } else {
      loadChapter(currentInfo.abbrev, next);
    }
  };

  const openBookFromIndex = (abbrev: string, chapter: number) => {
    setQuery('');
    setHighlightedVerses(new Set());
    setIndexSelectedBook(null);
    setShowSidebar(false);
    loadChapter(abbrev, chapter);
  };

  const toggleCompareVersion = (ver: string) => {
    setCompareVersions(prev => {
      if (prev.includes(ver)) {
        if (prev.length <= 2) return prev; // min 2
        return prev.filter(v => v !== ver);
      }
      return [...prev, ver];
    });
  };

  const highlightedCount = results.filter(v => highlightedVerses.has(verseKey(v))).length;
  const maxCompareVerses = compareVersions.reduce((max, ver) =>
    Math.max(max, (compareData[ver]?.verses || []).length), 0);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Sidebar (Book Index) ─────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-screen sticky top-0 border-r border-border bg-surface/50 overflow-hidden shrink-0"
          >
            <div className="w-[320px] h-full overflow-y-auto p-6 custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Índice Bíblico</h3>

              {indexSelectedBook ? (
                <div>
                  <button onClick={() => setIndexSelectedBook(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <h4 className="text-lg font-serif font-bold italic mb-4">{indexSelectedBook.name}</h4>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: indexSelectedBook.chapters }, (_, i) => i + 1).map(ch => (
                      <button
                        key={ch}
                        onClick={() => openBookFromIndex(indexSelectedBook.abbrev, ch)}
                        className={cn(
                          "py-2 rounded-lg text-xs font-bold transition-all border",
                          currentInfo.abbrev === indexSelectedBook.abbrev && currentInfo.chapter === ch
                            ? "bg-indigo-500 text-white border-indigo-600"
                            : "bg-foreground/5 border-border hover:bg-indigo-500/10 hover:border-indigo-500/30"
                        )}
                      >{ch}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    { title: 'Antigo Testamento', books: BIBLE_BOOKS.at },
                    { title: 'Novo Testamento', books: BIBLE_BOOKS.nt },
                  ].map(section => (
                    <div key={section.title}>
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-3">{section.title}</h4>
                      <div className="space-y-0.5">
                        {section.books.map(book => (
                          <button
                            key={book.abbrev}
                            onClick={() => setIndexSelectedBook(book)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between",
                              currentInfo.abbrev === book.abbrev
                                ? "bg-indigo-500/10 text-indigo-600 font-bold"
                                : "hover:bg-foreground/5 text-foreground"
                            )}
                          >
                            <span>{book.name}</span>
                            <span className="text-[10px] text-muted-foreground">{book.chapters}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen">
        {/* ── Top Bar ──────────────────────────────────────── */}
        <header className="h-16 sticky top-0 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-8 z-50 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Voltar</span>
            </button>
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() => { setShowSidebar(!showSidebar); setIndexSelectedBook(null); }}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                showSidebar ? "bg-indigo-500 text-white border-indigo-600" : "bg-foreground/5 border-border hover:bg-foreground/10"
              )}
              title="Índice"
            >
              <List className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-serif font-bold italic">
              <Book className="w-4 h-4 inline mr-2 text-indigo-500" />
              Bíblia
            </h1>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {viewMode === 'COMPARE' ? `Comparando · ${currentInfo.book} ${currentInfo.chapter}` : `${currentInfo.book} ${currentInfo.chapter} · ${version.toUpperCase()}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Compare Toggle */}
            <button
              onClick={() => viewMode === 'COMPARE' ? setViewMode('READ') : loadCompare()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                viewMode === 'COMPARE' ? "bg-indigo-500 text-white border-indigo-600" : "bg-foreground/5 border-border hover:bg-foreground/10"
              )}
            >
              <Columns className="w-3.5 h-3.5" />
              Comparar
            </button>

            {/* Version Selector (hidden in compare) */}
            {viewMode !== 'COMPARE' && (
              <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-lg border border-border/50">
                {versions.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVersion(v.id)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      version === v.id ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground"
                    )}
                  >{v.id}</button>
                ))}
              </div>
            )}

            {/* Compare: version toggles */}
            {viewMode === 'COMPARE' && (
              <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-lg border border-border/50">
                {ALL_VERSIONS.map(ver => (
                  <button
                    key={ver}
                    onClick={() => toggleCompareVersion(ver)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      compareVersions.includes(ver) ? "bg-indigo-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                    )}
                  >{ver}</button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── Search Bar ──────────────────────────────────── */}
        {viewMode !== 'COMPARE' && (
          <div className="px-8 py-3 border-b border-border/50 bg-surface/30 shrink-0">
            <div className="relative group max-w-3xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-foreground transition-colors" />
              <input
                type="text"
                placeholder="Lugar de leitura (ex: Gênesis 1) ou Busca temática (ex: Amor)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-surface border border-border/80 rounded-xl py-3 pl-11 pr-10 text-base font-serif italic outline-none focus:border-indigo-500/30 transition-all placeholder:opacity-20"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Highlighted Bar ─────────────────────────────── */}
        {viewMode === 'READ' && highlightedCount > 0 && (
          <div className="px-8 py-2 border-b border-indigo-500/20 bg-indigo-500/5 shrink-0">
            <div className="flex items-center justify-between max-w-3xl">
              <span className="text-xs font-bold text-indigo-500">
                <Highlighter className="w-3.5 h-3.5 inline mr-1.5" />
                {highlightedCount} versículo{highlightedCount > 1 ? 's' : ''} destacado{highlightedCount > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                {onCreateSermon && (
                  <button onClick={createSermonFromSelection} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FFF7D6] hover:text-white px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-all active:scale-95 shadow-md">
                    <Sparkles className="w-3 h-3" /> Criar Sermão
                  </button>
                )}
                <button onClick={copyHighlightedVerses} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-all active:scale-95">
                  {copiedId === 'range' ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar Seleção</>}
                </button>
                <button onClick={() => setHighlightedVerses(new Set())} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-foreground/5 transition-all">
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left Arrow */}
          {(viewMode === 'READ' || viewMode === 'COMPARE') && (
            <div className="shrink-0 flex items-center px-3">
              <button
                onClick={() => changeChapter(-1)}
                disabled={currentInfo.chapter <= 1}
                className="w-11 h-11 rounded-full bg-surface/80 border border-border shadow-lg flex items-center justify-center hover:bg-foreground/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Main Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ── COMPARE MODE ───────────────────────────── */}
            {viewMode === 'COMPARE' ? (
              <div className="py-6 px-4">
                {/* Sticky Title */}
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl py-3 mb-4">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 block">Comparando Versões · Capítulo {currentInfo.chapter}</span>
                    <h3 className="text-2xl font-serif font-bold italic">{currentInfo.book}</h3>
                    <div className="w-12 h-0.5 bg-indigo-500/20 mx-auto rounded-full mt-1.5" />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className={cn("grid gap-6", compareVersions.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                    {compareVersions.map(ver => (
                      <div key={ver}>
                        {/* Column Header */}
                        <div className="sticky top-16 z-10 bg-background/90 backdrop-blur-xl py-2 mb-4 text-center border-b border-border/50">
                          <span className="inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500">
                            {ver.toUpperCase()}
                          </span>
                          <p className="text-[9px] text-muted-foreground mt-1">{VERSION_LABELS[ver]}</p>
                        </div>

                        {/* Continuous text for this version */}
                        <div className="font-serif leading-[1.8] text-foreground/90 text-justify px-2">
                          {(compareData[ver]?.verses || []).map((verse: any, idx: number) => (
                            <span
                              key={idx}
                              className="hover:bg-indigo-500/5 transition-colors cursor-pointer inline rounded px-1"
                              onClick={() => {
                                const bookName = compareData[ver]?.book?.name || currentInfo.book;
                                navigator.clipboard.writeText(`${verse.text} (${bookName} ${currentInfo.chapter}:${verse.number} - ${ver.toUpperCase()})`);
                                setCopiedId(`c-${ver}-${verse.number}`);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              title="Clique para copiar"
                            >
                              <span className="text-xs font-bold text-indigo-500 mr-1 select-none align-super">{verse.number}</span>
                              <span className="text-lg">{verse.text} </span>
                              {copiedId === `c-${ver}-${verse.number}` && (
                                <span className="text-[9px] font-bold text-green-600">✓</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            /* ── READ MODE ───────────────────────────────── */
            ) : viewMode === 'READ' && results.length > 0 ? (
              <div className="max-w-3xl mx-auto py-6 px-4">
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl py-3 -mx-4 px-4">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 block">Capítulo {currentInfo.chapter} · {version.toUpperCase()}</span>
                    <h3 className="text-2xl font-serif font-bold italic">{currentInfo.book}</h3>
                    <div className="w-12 h-0.5 bg-indigo-500/20 mx-auto rounded-full mt-1.5" />
                  </div>
                </div>

                <div className="mt-6 font-serif leading-[1.8] text-foreground/90 text-justify">
                  {results.map((verse, idx) => {
                    const key = verseKey(verse);
                    const isHighlighted = highlightedVerses.has(key);
                    const isCopied = copiedId === key;
                    return (
                      <span
                        key={idx}
                        className={cn(
                          "relative cursor-pointer transition-all inline p-1 rounded-md px-1.5",
                          isHighlighted ? "bg-amber-300/30 dark:bg-amber-500/20 hover:bg-amber-300/40" : "hover:bg-indigo-500/5"
                        )}
                        onClick={() => toggleHighlight(verse)}
                        onDoubleClick={() => copyVerse(verse)}
                        title="Clique para destacar · Duplo clique para copiar"
                      >
                        <span className="text-xs font-bold text-indigo-500 mr-1.5 select-none align-super">{verse.number}</span>
                        <span className="text-xl">{verse.text} </span>
                        {isCopied && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-3 py-1 rounded-full font-bold uppercase shadow-xl whitespace-nowrap z-10"
                          >✓ Copiado</motion.span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

            /* ── SEARCH MODE ─────────────────────────────── */
            ) : viewMode === 'SEARCH' && results.length > 0 ? (
              <div className="max-w-3xl mx-auto py-6 px-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
                  {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
                </p>
                {results.map((verse, idx) => {
                  const isCopied = copiedId === verseKey(verse);
                  return (
                    <div
                      key={idx}
                      className="mb-6 pb-6 border-b border-border/30 last:border-0 group cursor-pointer hover:bg-indigo-500/[0.02] rounded-xl px-4 py-3 -mx-4 transition-all"
                      onClick={() => copyVerse(verse)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                          {verse.book.name} {verse.chapter}:{verse.number}
                        </span>
                        <span className={cn("text-[9px] font-bold uppercase transition-opacity", isCopied ? "text-green-600 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100")}>
                          {isCopied ? '✓ Copiado' : 'Clique para copiar'}
                        </span>
                      </div>
                      <p className="text-lg font-serif leading-relaxed text-foreground/80 group-hover:text-foreground transition-all">
                        {verse.text}
                      </p>
                    </div>
                  );
                })}
              </div>

            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                <BookOpen className="w-16 h-16 mb-6" />
                <p className="max-w-xs font-serif italic text-xl">
                  {query.length > 0 ? "Buscando nas águas profundas..." : "A Escritura está à sua espera."}
                </p>
              </div>
            )}
          </div>

          {/* Right Arrow */}
          {(viewMode === 'READ' || viewMode === 'COMPARE') && (
            <div className="shrink-0 flex items-center px-3">
              <button
                onClick={() => changeChapter(1)}
                className="w-11 h-11 rounded-full bg-surface/80 border border-border shadow-lg flex items-center justify-center hover:bg-foreground/10 transition-all group"
              >
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
