#!/usr/bin/env node
// Builds per-book Bible assets from downloaded sources.
// Usage: node tools/bible/build.mjs <blivre_vpl.txt> <kjv_vpl.txt> <almeida_gutenberg.txt> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [blivrePath, kjvPath, almeidaPath, outDir] = process.argv.slice(2);

function parseVpl(file, clean = (t) => t) {
  const books = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^(\S{3}) (\d+):(\d+) (.*)$/);
    if (!m) continue;
    const [, book, chapter, verse, text] = m;
    if (!books.has(book)) books.set(book, []);
    const chapters = books.get(book);
    (chapters[+chapter - 1] ??= [])[+verse - 1] = clean(text.trim());
  }
  return books;
}

const cleanAlmeida = (t) =>
  t
    .replace(/\[[0-9A-Z]+\]/g, ' ')
    .replace(/\[[^\]]*\?\]/g, '') // transcriber's query, as in Numbers 5:3
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

/**
 * The Gutenberg text mirrors the printed page: the first verse of a chapter
 * shows the chapter number instead of 1, so "2 Assim..." is 2:1 and is followed
 * by "2 E havendo...". That number is ambiguous, so parsing walks the expected
 * structure and `compare` reports every place the result differs from it.
 */
function parseAlmeida(file, shape) {
  const raw = fs.readFileSync(file, 'utf8')
    // Source errors: verse 5 joined to verse 4, and verse 34 printed as 31.
    .replace('mantimento. 5 Não [7] voltará', 'mantimento.\n\n5 Não [7] voltará')
    .replace('\n31 E sem parabolas nunca', '\n34 E sem parabolas nunca');
  const body = raw.slice(raw.indexOf('O PRIMEIRO LIVRO DE MOYSÉS CHAMADO GENESIS'), raw.indexOf('*** END OF THE PROJECT GUTENBERG'));
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  const order = [...shape.keys()];
  const books = new Map(order.map((b) => [b, []]));
  const skipped = [];
  let bookIndex = 0;
  let chapter = 0; // 1-based; 0 means before the first verse of the book
  let verse = 0;
  const expected = () => shape.get(order[bookIndex])[chapter - 1]?.length ?? 0;
  const chapterCount = () => shape.get(order[bookIndex]).length;
  const put = (text) => {
    const chapters = books.get(order[bookIndex]);
    (chapters[chapter - 1] ??= [])[verse - 1] = cleanAlmeida(text);
  };
  for (const paragraph of paragraphs) {
    const p = paragraph.replace(/^[A-ZÀ-Ý]{2,}\.?\s+(\[[0-9A-Z]+\]\s*)?(?=\d)/, '');
    const m = p.match(/^(\d+)\s+(.+)$/);
    if (!m) { skipped.push(paragraph); continue; }
    const n = +m[1];
    const text = m[2];
    const lastChapter = chapter === chapterCount();
    if (chapter === 0 && n === 1) { chapter = 1; verse = 1; put(text); }
    else if (n === verse + 1 && verse < expected()) { verse = n; put(text); }
    else if (!lastChapter && n === chapter + 1) { chapter = n; verse = 1; put(text); }
    else if (lastChapter && n === 1 && bookIndex < order.length - 1) { bookIndex++; chapter = 1; verse = 1; put(text); }
    else if (n === verse + 1) { verse = n; put(text); }
    else skipped.push(paragraph);
  }
  return { books, chapters: [...books.values()].reduce((sum, c) => sum + c.length, 0), skipped };
}

function compare(name, books, shape) {
  const problems = [];
  let verses = 0;
  for (const [book, reference] of shape) {
    const chapters = books.get(book) ?? [];
    if (chapters.length !== reference.length) problems.push(`${book}: ${chapters.length} chapters, expected ${reference.length}`);
    reference.forEach((verseList, i) => {
      const got = chapters[i]?.filter(Boolean).length ?? 0;
      verses += got;
      if (got !== verseList.length) problems.push(`${book} ${i + 1}: ${got} verses, expected ${verseList.length}`);
    });
  }
  console.log(`${name}: ${verses} verses, ${problems.length} differences from KJV`);
  return problems;
}

const kjv = parseVpl(kjvPath, (t) => t.replace(/[[\]¶]/g, '').replace(/\s+/g, ' ').trim());
const blivre = parseVpl(blivrePath, (t) => t.replace(/[[\]]/g, ''));
const almeida = parseAlmeida(almeidaPath, kjv);

// The 1911 edition numbers these chapters differently; the text itself is complete.
const KNOWN_ALMEIDA = new Set([
  'JDG 5: 32 verses, expected 31',
  '1SA 20: 43 verses, expected 42',
  '1KI 22: 54 verses, expected 53',
  '2CO 13: 13 verses, expected 14',
  '3JO 1: 15 verses, expected 14',
]);
const failures = [
  ...compare('kjv', kjv, kjv),
  ...compare('blivre', blivre, kjv),
  ...compare('almeida', almeida.books, kjv).filter((p) => !KNOWN_ALMEIDA.has(p)),
];
for (const [name, books] of [['kjv', kjv], ['blivre', blivre], ['almeida', almeida.books]]) {
  for (const [book, chapters] of books) {
    chapters.forEach((verses, c) => Array.from(verses).forEach((text, v) => {
      if (!text || /[[\]_¶<>{}]/.test(text)) failures.push(`${name} ${book} ${c + 1}:${v + 1} bad text: ${text}`);
    }));
  }
}
if (failures.length) {
  console.error(failures.slice(0, 30));
  process.exit(1);
}

if (outDir) {
  for (const [id, books] of [['kjv', kjv], ['blivre', blivre], ['alm1911', almeida.books]]) {
    fs.mkdirSync(path.join(outDir, id), { recursive: true });
    for (const [book, chapters] of books) {
      fs.writeFileSync(path.join(outDir, id, `${book}.bible`), JSON.stringify(chapters));
    }
  }
  const entries = ['alm1911', 'blivre', 'kjv'].map((id) => {
    const lines = [...kjv.keys()].map((book) => `    ${book.match(/^\d/) ? `'${book}'` : book}: require('../../assets/bible/${id}/${book}.bible'),`);
    return `  ${id}: {\n${lines.join('\n')}\n  },`;
  });
  fs.writeFileSync(
    path.join(outDir, '../../src/lib/bibleAssets.ts'),
    `// Generated by tools/bible/build.mjs.\nexport const bibleAssets: Record<string, Record<string, number>> = {\n${entries.join('\n')}\n};\n`,
  );
}
