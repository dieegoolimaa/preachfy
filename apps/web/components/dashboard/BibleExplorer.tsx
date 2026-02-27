"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, X, ChevronLeft, ChevronRight, BookOpen, Check, Copy, Highlighter, List, Columns, ArrowLeft, Plus, MessageSquare, Palette, Trash2, Save, Languages, ExternalLink, Zap } from 'lucide-react';
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

const HI_COLORS = {
  warm: [
    { name: 'Red', color: '#fca5a5', label: 'Alerta / Aviso' },
    { name: 'Orange', color: '#fdba74', label: 'Mandamento' },
    { name: 'Amber', color: '#fcd34d', label: 'Promessa' },
    { name: 'Yellow', color: '#fef08a', label: 'Contexto' },
  ],
  cold: [
    { name: 'Emerald', color: '#6ee7b7', label: 'Vida / Crescimento' },
    { name: 'Teal', color: '#5eead4', label: 'Espírito Santo' },
    { name: 'Sky', color: '#7dd3fc', label: 'Revelação / Rhema' },
    { name: 'Blue', color: '#93c5fd', label: 'Profecia' },
    { name: 'Indigo', color: '#a5b4fc', label: 'Cristo / Realeza' },
    { name: 'Violet', color: '#c4b5fd', label: 'Adoração' },
  ],
  neutral: [
    { name: 'Rose', color: '#fda4af', label: 'Amor / Graça' },
    { name: 'Fuchsia', color: '#f5d0fe', label: 'Pecado / Perdão' },
    { name: 'Slate', color: '#cbd5e1', label: 'História' },
    { name: 'Stone', color: '#a8a29e', label: 'Significado de Palavra' },
  ]
};

const COLOR_LIST = [
  ...HI_COLORS.warm,
  ...HI_COLORS.cold,
  ...HI_COLORS.neutral
];

export default function BibleExplorer({ 
  onBack, 
  onCreateSermon,
  initialHighlights,
  initialCustomLabels,
  initialBook,
  initialChapter,
  initialAbbrev,
  initialVersion,
  sermonTitle,
  activePulpitSermonId,
  onResumePulpit
}: { 
  onBack: () => void, 
  onCreateSermon?: (reference: string, content: string) => void,
  initialHighlights?: Record<string, any[]>,
  initialCustomLabels?: Record<string, string>,
  initialBook?: string,
  initialChapter?: number,
  initialAbbrev?: string,
  initialVersion?: string,
  sermonTitle?: string,
  activePulpitSermonId?: string,
  onResumePulpit?: () => void
}) {
  const { environment } = require('@/environments');
  const isSnapshot = !!initialHighlights;

  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(initialVersion || (typeof window !== 'undefined' ? localStorage.getItem('preachfy_bible_version') || 'nvi' : 'nvi'));
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'READ' | 'SEARCH' | 'INDEX' | 'COMPARE'>('READ');
  const [currentInfo, setCurrentInfo] = useState<{ book: string; abbrev: string; chapter: number }>({
    book: initialBook || 'Gênesis', 
    abbrev: initialAbbrev || 'gn', 
    chapter: initialChapter || 1
  });
  const [indexSelectedBook, setIndexSelectedBook] = useState<{ name: string; abbrev: string; chapters: number } | null>(null);
  const [selectedText, setSelectedText] = useState<{ text: string; x: number; y: number; verse: any } | null>(null);
  const [highlights, setHighlights] = useState<Record<string, Array<{ id: string, color: string, comment?: string, isWordMeaning?: boolean, word?: string }>>>(() => {
    if (typeof window === 'undefined') return {};
    let data: any = {};
    if (initialHighlights) {
      data = initialHighlights;
    } else {
      // ONLY LOAD CACHE IF WE ARE NOT IN SNAPSHOT MODE. If we are in Native Bible mode, start fresh.
      const saved = localStorage.getItem('preachfy_bible_highlights');
      data = saved ? JSON.parse(saved) : {};
    }

    // Migration: Transform old "Name-Chapter-Number" keys to "abbrev:chapter:number"
    const migrated: any = {};
    const allBooks = [...BIBLE_BOOKS.at, ...BIBLE_BOOKS.nt];
    Object.keys(data).forEach(key => {
      if (key.includes(':')) {
        migrated[key] = data[key];
      } else {
        const parts = key.split('-');
        if (parts.length === 3) {
          const bName = parts[0]!;
          const book = allBooks.find(b => b.name === bName || b.abbrev === bName.toLowerCase());
          if (book) {
            migrated[`${book.abbrev}:${parts[1]!}:${parts[2]!}`] = data[key];
          } else {
            migrated[key] = data[key];
          }
        } else {
          migrated[key] = data[key];
        }
      }
    });
    return migrated;
  });

  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    if (initialCustomLabels) return initialCustomLabels;
    
    // Default labels from COLOR_LIST
    const defaultLabels: Record<string, string> = {};
    COLOR_LIST.forEach(c => { defaultLabels[c.color] = c.label; });

    const saved = localStorage.getItem('preachfy_bible_labels');
    if (saved) return JSON.parse(saved);
    
    return defaultLabels;
  });
  const [editingVerseKey, setEditingVerseKey] = useState<string | null>(null);
  const [editingInsightId, setEditingInsightId] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState<string | null>(null); // color code being edited
  const [commentInput, setCommentInput] = useState('');
  const [selection, setSelection] = useState<{ start: string | null, chapters: number[] } | null>(null);
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<Record<string, any>>({});
  const [compareVersions, setCompareVersions] = useState<string[]>(['nvi', 'ra']);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isPulpitActive, setIsPulpitActive] = useState(false);
  const isInitialMount = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && activePulpitSermonId) {
      const pEndTime = localStorage.getItem(`preachfy_pulpit_end_${activePulpitSermonId}`);
      if (pEndTime) {
         setIsPulpitActive(true);
      }
    }
  }, [activePulpitSermonId]);

  // Sync with snapshot if prop changes (for Restoration Mode)
  useEffect(() => {
    if (initialHighlights) {
      setHighlights(initialHighlights);
    } else {
       // BUGFIX: If a snapshot was unloaded, we restore to the global bible state to avoid lingering ghost data
       const saved = localStorage.getItem('preachfy_bible_highlights');
       setHighlights(saved ? JSON.parse(saved) : {});
    }
    
    if (initialCustomLabels) {
      setCustomLabels(initialCustomLabels);
    } else {
       const savedLabels = localStorage.getItem('preachfy_bible_labels');
       // Reload global dictionary if unmounted from snapshot mode
       if (savedLabels) setCustomLabels(JSON.parse(savedLabels));
    }
  }, [initialHighlights, initialCustomLabels]);

  // Auto-save session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // IMPORTANT: Only save if we NOT in snapshot mode
    if (!initialHighlights) {
      localStorage.setItem('preachfy_bible_highlights', JSON.stringify(highlights));
      localStorage.setItem('preachfy_bible_labels', JSON.stringify(customLabels));
    }
  }, [highlights, customLabels, initialHighlights]);

  // ── Load Versions ─────────────────────────────────────────────
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch(`${environment.apiUrl}/bible/versions`);
        if (!res.ok) return;
        setVersions(await res.json());
      } catch (e) { console.error("Failed to fetch versions", e); }
    };
    fetchVersions();
    loadChapter(currentInfo.abbrev, currentInfo.chapter);
  }, []);

  // Save version to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preachfy_bible_version', version);
  }, [version]);

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
      
      const bookAbbrev = (data.book?.abbrev || abbrev).toLowerCase();
      const bookEntry = [...BIBLE_BOOKS.at, ...BIBLE_BOOKS.nt].find(b => b.abbrev === bookAbbrev);
      
      setCurrentInfo({ 
        book: bookEntry?.name || data.book.name, 
        abbrev: bookAbbrev, 
        chapter: data.chapter 
      });

      setResults((data.verses || []).map((v: any) => ({
        book: { name: bookEntry?.name || data.book.name, abbrev: bookAbbrev }, 
        chapter: data.chapter, 
        number: v.number, 
        text: v.text
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

  const scrollToVerse = (key: string) => {
    const el = document.getElementById(key);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-brand-red', 'ring-offset-4');
      setTimeout(() => el.classList.remove('ring-2', 'ring-brand-red', 'ring-offset-4'), 2000);
    }
  };

  // ── Actions ───────────────────────────────────────────────────
  const verseKey = (v: any) => {
    const abbrev = (v.book?.abbrev || v.abbrev || v.book || currentInfo.abbrev).toString().toLowerCase();
    const chapter = v.chapter || currentInfo.chapter;
    const number = v.number;
    return `${abbrev}:${chapter}:${number}`;
  };

  const handleTextSelection = (verse: any) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText({
        text: selection.toString().trim(),
        x: rect.left + rect.width / 2,
        y: rect.top,
        verse
      });
    } else {
      setSelectedText(null);
    }
  };

  const addWordMeaning = () => {
    if (!selectedText) return;
    const key = verseKey(selectedText.verse);
    const meaningId = `word-${Date.now()}`;
    const meaningHighlight = {
       id: meaningId,
       color: '#a8a29e', // Stone
       comment: `Palavra: ${selectedText.text}\nSignificado: `,
       isWordMeaning: true,
       word: selectedText.text
    };

    setHighlights(prev => {
      const current = prev[key] || [];
      return { ...prev, [key]: [...current, meaningHighlight] };
    });

    setEditingVerseKey(key);
    setEditingInsightId(meaningId);
    setCommentInput(`Palavra: ${selectedText.text}\nSignificado: `);
    setSelectedText(null);
    window.getSelection()?.removeAllRanges();
  };

  const toggleHighlight = (verse: any, color?: string) => {
    const key = verseKey(verse);
    
    if (multiSelect.size > 0) {
      if (color) {
        setHighlights(prev => {
          const next = { ...prev };
          multiSelect.forEach(k => {
            const current = next[k] || [];
            next[k] = [...current, { id: Date.now().toString() + Math.random(), color, comment: '' }];
          });
          return next;
        });
        setMultiSelect(new Set());
      }
      return;
    }

    setEditingVerseKey(key);
    setEditingInsightId(null);
    setCommentInput('');
  };

  const handleVerseClick = (e: React.MouseEvent, verse: any) => {
    const key = verseKey(verse);
    if (e.shiftKey) {
      setMultiSelect(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      if (multiSelect.size > 0) {
        setMultiSelect(new Set());
      } else {
        toggleHighlight(verse);
      }
    }
  };

  const addOrUpdateInsight = (color: string) => {
    if (!editingVerseKey) return;
    
    const currentVerseInsights = highlights[editingVerseKey] || [];
    const existingSameColor = currentVerseInsights.find(h => h.color === color);

    if (existingSameColor) {
      // SWITCH MODE: Focus on existing insight with this color
      setEditingInsightId(existingSameColor.id);
      setCommentInput(existingSameColor.comment || '');
      return;
    }

    // CREATE MODE: Picked a color not yet in this verse
    const newId = `ins-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    // Safety: prevent clobbering by the auto-sync effect, 
    // but keep current commentInput so it gets saved into the new object
    setEditingInsightId(null);

    setHighlights(prev => {
      const list = prev[editingVerseKey] || [];
      return { 
        ...prev, 
        [editingVerseKey]: [...list, { id: newId, color, comment: commentInput }] 
      };
    });

    // We set the ID in the next tick to ensure state has updated
    setTimeout(() => {
      setEditingInsightId(newId);
    }, 10);
  };

  // Auto-sync comment to highlights state
  useEffect(() => {
    if (editingVerseKey && editingInsightId) {
      setHighlights(prev => {
        const current = prev[editingVerseKey] || [];
        const item = current.find(h => h.id === editingInsightId);
        
        // Safety: Only update if the content actually changed to avoid cycles
        if (item && item.comment === commentInput) return prev;
        
        const next = current.map(h => h.id === editingInsightId ? { ...h, comment: commentInput } : h);
        return { ...prev, [editingVerseKey]: next };
      });
    }
  }, [commentInput, editingInsightId, editingVerseKey]);

  const removeInsight = (verseKey: string, insightId: string) => {
    setHighlights(prev => {
      const next = { ...prev };
      next[verseKey] = (next[verseKey] || []).filter(h => h.id !== insightId);
      if (next[verseKey].length === 0) delete next[verseKey];
      return next;
    });
    setEditingInsightId(null);
    setCommentInput('');
  };

  const copyVerse = (v: any) => {
    navigator.clipboard.writeText(`${v.text} (${v.book.name} ${v.chapter}:${v.number})`);
    setCopiedId(verseKey(v));
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyHighlightedVerses = () => {
    const highlighted = results.filter(v => highlights[verseKey(v)]);
    if (!highlighted.length) return;
    const first = highlighted[0], last = highlighted[highlighted.length - 1];
    const ref = first.number === last.number
      ? `${first.book.name} ${first.chapter}:${first.number}`
      : `${first.book.name} ${first.chapter}:${first.number}-${last.number}`;
    navigator.clipboard.writeText(`${highlighted.map(v => `${v.number} ${v.text}`).join(' ')} (${ref})`);
    setCopiedId('range');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createStudyFromInsights = async () => {
    if (!onCreateSermon) return;
    
    const chapterHighlights = results.filter(v => highlights[verseKey(v)]);
    if (chapterHighlights.length === 0) return;

    setLoading(true);
    let chapterText = '';
    
    try {
      // Always try to fetch the full chapter to ensure we have context even if we are in SEARCH mode
      const abbrev = chapterHighlights[0].book.abbrev || currentInfo.abbrev;
      const chapter = chapterHighlights[0].chapter || currentInfo.chapter;
      
      const res = await fetch(`${environment.apiUrl}/bible/chapter/${version}/${abbrev}/${chapter}`);
      if (res.ok) {
        const data = await res.json();
        chapterText = data.verses.map((v: any) => `${v.number} ${v.text}`).join('\n');
      } else {
        // Fallback to current results if API fails
        chapterText = results.map(v => `${v.number} ${v.text}`).join('\n');
      }
    } catch (e) {
      console.error("Failed to get full chapter context for study", e);
      chapterText = results.map(v => `${v.number} ${v.text}`).join('\n');
    } finally {
      setLoading(false);
    }

    // 2. Prepare structured blocks data including the visual SNAPSHOT
    const studyData = {
      type: 'structured-study',
      chapterText: chapterText,
      book: currentInfo.book,
      chapter: currentInfo.chapter,
      abbrev: currentInfo.abbrev,
      version: version,
      rawHighlights: highlights, // The secret sauce for the snapshot
      rawCustomLabels: customLabels,
      blocks: chapterHighlights.flatMap(v => {
        const verseInsights = highlights[verseKey(v)] || [];
        return verseInsights.map(h => ({
          verseNumber: v.number,
          verseText: v.text,
          category: h.color === '#a8a29e' ? 'SIGNIFICADO' : (customLabels[h.color] || 'Outros'),
          comment: h.comment || '',
          color: h.color,
          isWordMeaning: h.isWordMeaning,
          word: h.word
        }));
      })
    };

    // Pass as JSON string to the callback
    onCreateSermon(`${currentInfo.book} ${currentInfo.chapter}`, JSON.stringify(studyData));
    
    // Clear highlights locally after creation to "reset" the bible for next time
    setHighlights({});
  };

  const changeChapter = (offset: number) => {
    const next = currentInfo.chapter + offset;
    if (next < 1) return;
    if (viewMode === 'COMPARE') {
      loadCompare(currentInfo.abbrev, next);
    } else {
      loadChapter(currentInfo.abbrev, next);
    }
  };

  const openBookFromIndex = (abbrev: string, chapter: number) => {
    setQuery('');
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

  const highlightedCount = results.filter(v => highlights[verseKey(v)]).length;
  const maxCompareVerses = compareVersions.reduce((max, ver) =>
    Math.max(max, (compareData[ver]?.verses || []).length), 0);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-5rem)] bg-background text-foreground flex overflow-hidden">
      {/* ── Sidebar (Book Index) ─────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-full border-r border-border bg-surface/50 overflow-hidden shrink-0"
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
                            ? "bg-brand-red text-white border-brand-red"
                            : "bg-foreground/5 border-border hover:bg-brand-red/10 hover:border-brand-red/30"
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
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-red mb-3">{section.title}</h4>
                      <div className="space-y-0.5">
                        {section.books.map(book => (
                          <button
                            key={book.abbrev}
                            onClick={() => setIndexSelectedBook(book)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between",
                              currentInfo.abbrev === book.abbrev
                                ? "bg-brand-red/10 text-brand-red font-bold"
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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ── Top Bar ──────────────────────────────────────── */}
        <header className="h-16 sticky top-0 border-b border-border bg-surface shadow-sm flex items-center justify-between px-8 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Voltar</span>
            </button>

            {isPulpitActive && onResumePulpit && (
              <button 
                onClick={onResumePulpit}
                className="flex items-center gap-2 px-4 py-1.5 ml-2 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-brand-red animate-ping" />
                No Púlpito
              </button>
            )}

            {!isSnapshot && (
              <>
                <div className="w-px h-6 bg-border" />
                <button
                  onClick={() => { setShowSidebar(!showSidebar); setIndexSelectedBook(null); }}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                    showSidebar ? "bg-brand-red text-white border-brand-red" : "bg-foreground/5 border-border hover:bg-foreground/10"
                  )}
                  title="Índice"
                >
                  <List className="w-4 h-4" />
                </button>
              </>
            )}
            {!isSnapshot && (
              <h1 className="text-lg font-serif font-bold italic">
                <Book className="w-4 h-4 inline mr-2 text-brand-red" />
                Bíblia
              </h1>
            )}
            <div className="flex flex-col gap-0.5 ml-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {isSnapshot && sermonTitle ? `Lendo Estudo: ${sermonTitle}` : (viewMode === 'COMPARE' ? `Comparando` : `Lendo em ${VERSION_LABELS[version] || version.toUpperCase()}`)}
              </span>
              <span className="text-[9px] font-bold text-brand-red/60 uppercase tracking-tighter">
                {currentInfo.book} {currentInfo.chapter}
              </span>
            </div>
          </div>

          {!isSnapshot && (
            <div className="flex items-center gap-3">
              {/* Compare Toggle */}
              <button
                onClick={() => viewMode === 'COMPARE' ? setViewMode('READ') : loadCompare()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                  viewMode === 'COMPARE' ? "bg-brand-red text-white border-brand-red" : "bg-foreground/5 border-border hover:bg-foreground/10"
                )}
              >
                <Columns className="w-3.5 h-3.5" />
                Comparar
              </button>

              {/* Version Selector (hidden in compare) */}
              {viewMode !== 'COMPARE' && (
                <div className="flex items-center gap-1.5 bg-foreground/5 p-1 rounded-xl border border-border/50">
                  <span className="text-[8px] font-black uppercase tracking-widest pl-2 opacity-30">Versão:</span>
                  {versions.length > 0 ? versions.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                          console.log("Setting version to:", v.id);
                          setVersion(v.id);
                      }}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        version === v.id ? "bg-brand-red text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                      )}
                    >{v.id}</button>
                  )) : ALL_VERSIONS.map(vid => (
                    <button
                      key={vid}
                      onClick={() => setVersion(vid)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        version === vid ? "bg-brand-red text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                      )}
                    >{vid}</button>
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
                        compareVersions.includes(ver) ? "bg-brand-red text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                      )}
                    >{ver}</button>
                  ))}
                </div>
              )}
            </div>
          )}
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
                className="w-full bg-surface border border-border/80 rounded-xl py-3 pl-11 pr-10 text-base font-serif italic outline-none focus:border-brand-red/30 transition-all placeholder:opacity-20"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Highlighted Bar ─────────────────────────────── */}
        {viewMode === 'READ' && highlightedCount > 0 && (
          <div className="px-8 py-2 border-b border-brand-red/20 bg-brand-red/5 shrink-0">
            <div className="flex items-center justify-between max-w-3xl">
              <span className="text-xs font-bold text-brand-red">
                <Highlighter className="w-3.5 h-3.5 inline mr-1.5" />
                {Object.keys(highlights).length} versículo{Object.keys(highlights).length > 1 ? 's' : ''} destacado{Object.keys(highlights).length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                {!isSnapshot && (
                  onCreateSermon && (
                    <button onClick={createStudyFromInsights} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white px-3 py-1.5 rounded-lg bg-brand-red hover:bg-brand-red/90 transition-all active:scale-95 shadow-md">
                      <Zap className="w-3.5 h-3.5" /> Gerar Estudo Pronto
                    </button>
                  )
                )}
                <button onClick={copyHighlightedVerses} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-red hover:text-brand-red px-3 py-1.5 rounded-lg bg-brand-red/10 hover:bg-brand-red/20 transition-all active:scale-95">
                  {copiedId === 'range' ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar Seleção</>}
                </button>
                <button onClick={() => setHighlights({})} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-foreground/5 transition-all">
                  Limpar Tudo
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
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red block">Comparando Versões · Capítulo {currentInfo.chapter}</span>
                    <h3 className="text-2xl font-serif font-bold italic">{currentInfo.book}</h3>
                    <div className="w-12 h-0.5 bg-brand-red/20 mx-auto rounded-full mt-1.5" />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className={cn("grid gap-6", compareVersions.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                    {compareVersions.map(ver => (
                      <div key={ver}>
                        {/* Column Header */}
                        <div className="sticky top-16 z-10 bg-background/90 backdrop-blur-xl py-2 mb-4 text-center border-b border-border/50">
                          <span className="inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-red/10 text-brand-red">
                            {ver.toUpperCase()}
                          </span>
                          <p className="text-[9px] text-muted-foreground mt-1">{VERSION_LABELS[ver]}</p>
                        </div>

                        {/* Continuous text for this version */}
                        <div className="font-serif leading-[1.8] text-foreground/90 text-justify px-2">
                          {(compareData[ver]?.verses || []).map((verse: any, idx: number) => (
                            <span
                              key={idx}
                              className="hover:bg-brand-red/5 transition-colors cursor-pointer inline rounded px-1"
                              onClick={() => {
                                const bookName = compareData[ver]?.book?.name || currentInfo.book;
                                navigator.clipboard.writeText(`${verse.text} (${bookName} ${currentInfo.chapter}:${verse.number} - ${ver.toUpperCase()})`);
                                setCopiedId(`c-${ver}-${verse.number}`);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              title="Clique para copiar"
                            >
                              <span className="text-xs font-bold text-brand-red mr-1 select-none align-super">{verse.number}</span>
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
            ) : (viewMode === 'READ' && results.length > 0) ? (
              <div className="max-w-6xl mx-auto py-12 px-8">
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl py-6 -mx-8 px-8 border-b border-border/10 mb-8">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red block">Capítulo {currentInfo.chapter} · {version.toUpperCase()}</span>
                    <h3 className="text-2xl font-serif font-bold italic">{currentInfo.book}</h3>
                <div className="w-12 h-0.5 bg-brand-red/20 mx-auto rounded-full mt-1.5" />
                  </div>
                </div>

                <div className="flex gap-16 relative items-start">
                  {/* Text Column */}
                  <div className="max-w-3xl flex-1 mt-6 font-serif leading-[2.2] text-foreground/90 text-justify">
                    {results.map((verse, idx) => {
                      const key = verseKey(verse);
                      const verseInsights = highlights[key] || [];
                      const isMultiSelected = multiSelect.has(key);
                      
                      return (
                        <span
                          key={idx}
                          id={key}
                          className={cn(
                            "relative cursor-pointer transition-all inline p-1 rounded-md px-1.5 group/verse my-0.5",
                            verseInsights.length > 0 ? "" : "hover:bg-brand-red/5",
                            isMultiSelected ? "ring-2 ring-brand-red/50 bg-brand-red/10" : ""
                          )}
                          style={verseInsights.length > 0 ? { 
                            background: verseInsights.length === 1 
                              ? `${verseInsights[0]?.color}40`
                              : `linear-gradient(to right, ${verseInsights.map(h => `${h.color}40`).join(', ')})`
                          } : {}}
                          onClick={(e) => handleVerseClick(e, verse)}
                          onDoubleClick={() => copyVerse(verse)}
                        >
                          <span className="text-xs font-bold text-brand-red mr-1.5 select-none align-super">{verse.number}</span>
                          <span className="text-xl" onMouseUp={() => handleTextSelection(verse)}>{verse.text} </span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Annotations Column */}
                  <div className="w-[320px] shrink-0 relative mt-6">
                    <div className="sticky top-24">
                      <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anotações & Insights</h5>
                        <span className="text-[9px] bg-brand-red/10 text-brand-red px-2 py-0.5 rounded-full font-bold">
                          {results.reduce((acc, v) => acc + (highlights[verseKey(v)]?.length || 0), 0)}
                        </span>
                      </div>
                                           <div className="flex flex-col gap-6">
                        <AnimatePresence mode="popLayout">
                          {results.flatMap(v => {
                             const key = verseKey(v);
                             const verseInsights = highlights[key] || [];
                             return verseInsights.map(h => ({ ...h, verse: v, key }));
                          }).map((h) => (
                            <motion.div 
                              key={h.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="p-5 min-h-[120px] rounded-[2rem] bg-surface border border-border/60 shadow-sm group cursor-pointer hover:border-brand-red/40 hover:shadow-xl hover:shadow-brand-red/5 transition-all overflow-hidden relative flex flex-col justify-between"
                              onClick={() => {
                                setEditingVerseKey(h.key);
                                setEditingInsightId(h.id);
                                setCommentInput(h.comment || '');
                                scrollToVerse(h.key);
                              }}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: h.color }} />
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-red">Versículo {h.verse.number}</span>
                                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                                    {customLabels[h.color]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeInsight(h.key, h.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <MessageSquare className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <div className="max-h-32 overflow-y-auto custom-scrollbar-thin mb-2">
                                <p className="text-xs font-serif italic text-foreground/80 leading-relaxed font-medium">"{h.comment}"</p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            
            ) : (viewMode === 'SEARCH' && results.length > 0) ? (
              <div className="max-w-3xl mx-auto py-6 px-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
                  {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
                </p>
                {results.map((verse, idx) => {
                  const isCopied = copiedId === verseKey(verse);
                  return (
                    <div
                      key={idx}
                      className="mb-6 pb-6 border-b border-border/30 last:border-0 group cursor-pointer hover:bg-brand-red/[0.02] rounded-xl px-4 py-3 -mx-4 transition-all"
                      onClick={() => copyVerse(verse)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-red">
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

      {/* Floating Bars & Popovers */}
      <AnimatePresence>
        {multiSelect.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 bg-foreground text-background rounded-2xl shadow-2xl flex items-center gap-6 z-[200]"
          >
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Selecionados</span>
               <span className="text-sm font-bold">{multiSelect.size} versículos</span>
             </div>
             <div className="w-px h-8 bg-background/10" />
              <div className="flex gap-1.5 flex-wrap max-w-md">
                {COLOR_LIST.map(c => (
                  <button
                    key={c.color}
                    onClick={() => {
                      setHighlights(prev => {
                        const next = { ...prev };
                        multiSelect.forEach(k => {
                          const current = next[k] || [];
                          next[k] = [...current, { id: Date.now().toString() + Math.random(), color: c.color, comment: '' }];
                        });
                        return next;
                      });
                      setMultiSelect(new Set());
                    }}
                    className="w-7 h-7 rounded-full border border-background/20 hover:scale-110 transition-all"
                    style={{ backgroundColor: c.color }}
                    title={customLabels[c.color]}
                  />
                ))}
             </div>
             <button 
               onClick={() => setMultiSelect(new Set())}
               className="bg-background/10 hover:bg-background/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
             >Cancelar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingVerseKey && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[205] flex items-center justify-center p-4"
             onClick={() => setEditingVerseKey(null)}
          >
             <motion.div 
               initial={{ y: 20 }} animate={{ y: 0 }}
               className="w-full max-w-sm bg-surface border border-border rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-8 flex flex-col gap-6"
               onClick={e => e.stopPropagation()}
             >
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-brand-red flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Personalizar Destaque
                   </span>
                   <button onClick={() => setEditingVerseKey(null)} className="w-10 h-10 rounded-full hover:bg-foreground/5 flex items-center justify-center">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="space-y-4">
                   <div>
                     <label className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-4 block">Toque na Cor para Salvar o Insight</label>
                     <div className="grid grid-cols-5 gap-3">
                       {COLOR_LIST.map(c => {
                         const currentVerseInsights = highlights[editingVerseKey] || [];
                         const isSelected = editingInsightId 
                           ? currentVerseInsights.find(h => h.id === editingInsightId)?.color === c.color
                           : false;

                         return (
                           <div key={c.color} className="relative group/color">
                             <button 
                               onClick={() => addOrUpdateInsight(c.color)}
                               className={cn(
                                 "w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 flex items-center justify-center",
                                 isSelected ? "border-brand-red shadow-lg scale-110" : "border-transparent"
                               )}
                               style={{ backgroundColor: c.color }}
                               title={customLabels[c.color]}
                             >
                                {isSelected && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); setIsEditingLabel(c.color); }}
                               className="absolute -top-1 -right-1 w-4 h-4 bg-white border shadow-sm rounded-full opacity-0 group-hover/color:opacity-100 flex items-center justify-center transition-all hover:scale-110 z-10"
                             >
                               <Palette className="w-2 h-2 text-brand-red" />
                             </button>
                           </div>
                         );
                       })}
                     </div>
                     <div className="mt-4 flex flex-col items-center">
                       {isEditingLabel ? (
                         <div className="flex items-center gap-2 bg-brand-red/5 p-2 rounded-xl border border-brand-red/20">
                           <input 
                             autoFocus
                             className="bg-transparent text-[10px] font-bold outline-none text-center"
                             value={customLabels[isEditingLabel]}
                             onChange={e => setCustomLabels(prev => ({ ...prev, [isEditingLabel]: e.target.value }))}
                             onBlur={() => setIsEditingLabel(null)}
                             onKeyDown={e => e.key === 'Enter' && setIsEditingLabel(null)}
                           />
                           <Check className="w-3 h-3 text-brand-red cursor-pointer" onClick={() => setIsEditingLabel(null)} />
                         </div>
                       ) : (
                         <p className="text-[10px] font-bold text-brand-red/60 uppercase tracking-widest italic flex items-center gap-2 transition-all opacity-40">
                           Categorias Rápidas
                         </p>
                       )}
                     </div>
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-[9px] font-black uppercase tracking-widest opacity-30">Insight / Revelação</label>
                     <textarea 
                       autoFocus
                       value={commentInput}
                       onChange={e => setCommentInput(e.target.value)}
                       placeholder="O que esta passagem ministrou ao seu coração?"
                       className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-base font-serif italic outline-none focus:border-brand-red/30 min-h-[120px] resize-none"
                     />
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                   <div className="flex flex-col gap-2 border-t border-border pt-4">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Neste Versículo:</span>
                      <div className="flex flex-wrap gap-2">
                        {(highlights[editingVerseKey] || []).map(h => (
                           <div 
                             key={h.id} 
                             className="flex items-center gap-2 bg-foreground/5 pl-2 pr-1 py-1 rounded-lg border border-border/50 group"
                           >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                              <span className="text-[9px] font-bold text-foreground/60">{customLabels[h.color]}</span>
                              <button 
                                onClick={() => {
                                  setEditingInsightId(h.id);
                                  setCommentInput(h.comment || '');
                                }}
                                className="p-1 hover:bg-brand-red/10 rounded transition-all"
                              >
                                <Palette className="w-2.5 h-2.5 text-brand-red" />
                              </button>
                              <button 
                                onClick={() => removeInsight(editingVerseKey, h.id)}
                                className="p-1 hover:bg-red-500/10 rounded transition-all"
                              >
                                <Trash2 className="w-2.5 h-2.5 text-red-500" />
                              </button>
                           </div>
                        ))}
                        {(highlights[editingVerseKey] || []).length === 0 && (
                          <span className="text-[10px] italic opacity-30">Nenhum insight ainda</span>
                        )}
                      </div>
                   </div>

                    <button 
                      onClick={() => {
                         setEditingVerseKey(null);
                         setEditingInsightId(null);
                         setCommentInput('');
                      }}
                      className="w-full bg-brand-red/10 text-brand-red rounded-2xl py-3 font-black uppercase tracking-widest text-[10px] hover:bg-brand-red hover:text-white transition-all"
                    >Concluir Ajustes</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
     {/* Floating Selection Menu */}
     {selectedText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed z-[100] flex items-center gap-1.5 p-1.5 bg-background border border-border shadow-2xl rounded-full"
            style={{ 
               left: selectedText.x - 60, 
               top: selectedText.y - 60 
            }}
          >
            <button 
              onClick={addWordMeaning}
              className="flex items-center gap-2 px-4 py-2 hover:bg-brand-red/10 text-brand-red text-[10px] font-black uppercase tracking-widest transition-all rounded-full"
            >
              <Languages className="w-3.5 h-3.5" />
              Significado
            </button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            <button 
               onClick={() => setSelectedText(null)}
               className="p-2 hover:bg-foreground/5 text-muted-foreground transition-all rounded-full"
            >
               <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
    </div>
  );
}
