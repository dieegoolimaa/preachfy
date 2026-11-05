import { foldText } from './study.ts';

export type Locale = 'pt' | 'en' | 'es';
export type Book = { id: string; name: string; abbr: string; chapters: number; names: Record<Locale, string> };

const table = `GEN Gênesis Gn 50|EXO Êxodo Êx 40|LEV Levítico Lv 27|NUM Números Nm 36|DEU Deuteronômio Dt 34|JOS Josué Js 24|JDG Juízes Jz 21|RUT Rute Rt 4|1SA 1_Samuel 1Sm 31|2SA 2_Samuel 2Sm 24|1KI 1_Reis 1Rs 22|2KI 2_Reis 2Rs 25|1CH 1_Crônicas 1Cr 29|2CH 2_Crônicas 2Cr 36|EZR Esdras Ed 10|NEH Neemias Ne 13|EST Ester Et 10|JOB Jó Jó 42|PSA Salmos Sl 150|PRO Provérbios Pv 31|ECC Eclesiastes Ec 12|SOL Cânticos Ct 8|ISA Isaías Is 66|JER Jeremias Jr 52|LAM Lamentações Lm 5|EZE Ezequiel Ez 48|DAN Daniel Dn 12|HOS Oseias Os 14|JOE Joel Jl 3|AMO Amós Am 9|OBA Obadias Ob 1|JON Jonas Jn 4|MIC Miqueias Mq 7|NAH Naum Na 3|HAB Habacuque Hc 3|ZEP Sofonias Sf 3|HAG Ageu Ag 2|ZEC Zacarias Zc 14|MAL Malaquias Ml 4|MAT Mateus Mt 28|MAR Marcos Mc 16|LUK Lucas Lc 24|JOH João Jo 21|ACT Atos At 28|ROM Romanos Rm 16|1CO 1_Coríntios 1Co 16|2CO 2_Coríntios 2Co 13|GAL Gálatas Gl 6|EPH Efésios Ef 6|PHI Filipenses Fp 4|COL Colossenses Cl 4|1TH 1_Tessalonicenses 1Ts 5|2TH 2_Tessalonicenses 2Ts 3|1TI 1_Timóteo 1Tm 6|2TI 2_Timóteo 2Tm 4|TIT Tito Tt 3|PHM Filemom Fm 1|HEB Hebreus Hb 13|JAM Tiago Tg 5|1PE 1_Pedro 1Pe 5|2PE 2_Pedro 2Pe 3|1JO 1_João 1Jo 5|2JO 2_João 2Jo 1|3JO 3_João 3Jo 1|JUD Judas Jd 1|REV Apocalipse Ap 22`;

const en = 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|');
const es = 'Génesis|Éxodo|Levítico|Números|Deuteronomio|Josué|Jueces|Rut|1 Samuel|2 Samuel|1 Reyes|2 Reyes|1 Crónicas|2 Crónicas|Esdras|Nehemías|Ester|Job|Salmos|Proverbios|Eclesiastés|Cantares|Isaías|Jeremías|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amós|Abdías|Jonás|Miqueas|Nahúm|Habacuc|Sofonías|Hageo|Zacarías|Malaquías|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|1 Corintios|2 Corintios|Gálatas|Efesios|Filipenses|Colosenses|1 Tesalonicenses|2 Tesalonicenses|1 Timoteo|2 Timoteo|Tito|Filemón|Hebreos|Santiago|1 Pedro|2 Pedro|1 Juan|2 Juan|3 Juan|Judas|Apocalipsis'.split('|');

export const BOOKS: Book[] = table.split('|').map((row, i) => {
  const [id, raw, abbr, chapters] = row.split(' ') as [string, string, string, string];
  const name = raw.replace('_', ' ');
  return { id, name, abbr, chapters: Number(chapters), names: { pt: name, en: en[i]!, es: es[i]! } };
});

export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
export const bookName = (id: string, locale: Locale) => bookById(id)?.names[locale] ?? id;

const compact = (text: string) => foldText(text).replace(/[\s.]/g, '');

function findBook(typed: string, locale: Locale): Book | undefined {
  const raw = typed.toLowerCase().replace(/[\s.]/g, '');
  // "jó" is Job; plain "jo" is João, the far more common search.
  if (raw === 'jó' || raw === 'job') return bookById('JOB');
  const key = compact(typed);
  return (
    BOOKS.find((b) => b.id !== 'JOB' && compact(b.abbr) === key) ??
    BOOKS.find((b) => Object.values(b.names).some((n) => compact(n) === key)) ??
    BOOKS.find((b) => compact(b.names[locale]).startsWith(key)) ??
    BOOKS.find((b) => Object.values(b.names).some((n) => compact(n).startsWith(key)))
  );
}

export type ParsedReference = { book: string; chapter: number; verse?: number };

/** Reads "jo 3 16", "João 3:16", "John 3:16", "Juan 3 16", "1 co 13" or "sl 23". */
export function parseReference(input: string, locale: Locale = 'pt'): ParsedReference | null {
  const m = input.trim().match(/^(\d?\s*[^\d\s:.,]+\.?)(?:\s*(\d+))?(?:[\s:.,]+(\d+))?$/);
  if (!m) return null;
  const book = findBook(m[1]!, locale);
  if (!book) return null;
  const chapter = m[2] ? Number(m[2]) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;
  return m[3] ? { book: book.id, chapter, verse: Number(m[3]) } : { book: book.id, chapter };
}

/** Accepts "sl 23", "sl 23:4" and "sl 23:1-6". Without verses, the caller uses the whole chapter. */
export function parsePassage(input: string, locale: Locale = 'pt'): (ParsedReference & { to?: number }) | null {
  const range = input.trim().match(/^(.*?)\s*[-–]\s*(\d+)$/);
  const found = parseReference(range ? range[1]! : input, locale);
  if (!found) return null;
  if (!range) return found;
  const to = Number(range[2]);
  return found.verse !== undefined && to >= found.verse ? { ...found, to } : null;
}

export type SearchHit = { book: string; chapter: number; verse: number; text: string };

/** Finds a word or phrase, ignoring case and accents. `chapters` is verses by chapter. */
export function searchBook(book: string, chapters: string[][], query: string, limit: number): SearchHit[] {
  const needle = foldText(query).trim();
  const hits: SearchHit[] = [];
  if (!needle) return hits;
  for (let c = 0; c < chapters.length; c++) {
    const verses = chapters[c]!;
    for (let v = 0; v < verses.length && hits.length < limit; v++) {
      if (foldText(verses[v]!).includes(needle)) hits.push({ book, chapter: c + 1, verse: v + 1, text: verses[v]! });
    }
  }
  return hits;
}
