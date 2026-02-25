import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

import { environment } from '../environments';

@Injectable()
export class BibleService {
    private readonly baseUrl = environment.bibleApiUrl;
    private readonly fallbackUrl = 'https://bible-api.com';

    private readonly bookMapping: Record<string, string> = {
        'gn': 'Genesis', 'ex': 'Exodus', 'lv': 'Leviticus', 'nm': 'Numbers', 'dt': 'Deuteronomy',
        'js': 'Joshua', 'jz': 'Judges', 'rt': 'Ruth', '1sm': '1 Samuel', '2sm': '2 Samuel',
        '1rs': '1 Kings', '2rs': '2 Kings', '1cr': '1 Chronicles', '2cr': '2 Chronicles',
        'ed': 'Ezra', 'ne': 'Nehemiah', 'et': 'Esther', 'job': 'Job', 'sl': 'Psalms',
        'pv': 'Proverbs', 'ec': 'Ecclesiastes', 'ct': 'Song of Solomon', 'is': 'Isaiah',
        'jr': 'Jeremiah', 'lm': 'Lamentations', 'ez': 'Ezekiel', 'dn': 'Daniel',
        'os': 'Hosea', 'jl': 'Joel', 'am': 'Amos', 'ob': 'Obadiah', 'jn': 'Jonah',
        'mq': 'Micah', 'na': 'Nahum', 'hc': 'Habakkuk', 'sf': 'Zephaniah', 'ag': 'Haggai',
        'zc': 'Zechariah', 'ml': 'Malachi', 'mt': 'Matthew', 'mc': 'Mark', 'lc': 'Luke',
        'jo': 'John', 'at': 'Acts', 'rm': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
        'gl': 'Galatians', 'ef': 'Ephesians', 'fp': 'Philippians', 'cl': 'Colossians',
        '1ts': '1 Thessalonians', '2ts': '2 Thessalonians', '1tm': '1 Timothy', '2tm': '2 Timothy',
        'tt': 'Titus', 'fm': 'Philemon', 'hb': 'Hebrews', 'tg': 'James', '1pe': '1 Peter',
        '2pe': '2 Peter', '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jd': 'Jude', 'ap': 'Revelation'
    };

    async getVersions() {
        return [
            { id: 'nvi', name: 'NVI - Nova Versão Internacional' },
            { id: 'ra', name: 'ARA - Almeida Revista e Atualizada' },
            { id: 'acf', name: 'ACF - Almeida Corrigida Fiel' },
        ];
    }

    async getBooks() {
        try {
            const response = await axios.get(`${this.baseUrl}/books`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return response.data;
        } catch (error) {
            console.error("Bible API Books Error:", error.message);
            throw new HttpException('Falha ao buscar livros da Bíblia', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getChapter(version: string, abbrev: string, chapter: number) {
        // PRIMARY: abibliadigital (supports NVI, RA, ACF)
        try {
            const response = await axios.get(`${this.baseUrl}/verses/${version}/${abbrev}/${chapter}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000,
            });
            if (response.data && response.data.verses) {
                return response.data;
            }
        } catch (e) {
            console.warn(`abibliadigital failed for ${version}/${abbrev}/${chapter}:`, e.message);
        }

        // FALLBACK: bible-api.com (only "almeida" Portuguese translation)
        try {
            const bookName = this.bookMapping[abbrev.toLowerCase()] || abbrev;
            const res = await axios.get(`${this.fallbackUrl}/${bookName}+${chapter}?translation=almeida`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000,
            });

            if (res.data && res.data.verses) {
                return {
                    book: { name: res.data.verses[0].book_name, abbrev: abbrev },
                    chapter: chapter,
                    verses: res.data.verses.map((v: any) => ({
                        number: v.verse,
                        text: v.text.trim()
                    }))
                };
            }
        } catch (error) {
            console.error("bible-api.com Chapter Error:", error.message);
        }

        throw new HttpException('Capítulo não encontrado em nenhum provedor', HttpStatus.NOT_FOUND);
    }

    async compareChapter(abbrev: string, chapter: number) {
        const versions = ['nvi', 'ra', 'acf'];
        const results: Record<string, any> = {};

        await Promise.allSettled(
            versions.map(async (ver) => {
                try {
                    const data = await this.getChapter(ver, abbrev, chapter);
                    results[ver] = {
                        book: data.book,
                        chapter: data.chapter,
                        verses: data.verses || [],
                    };
                } catch (e) {
                    console.warn(`Compare: failed to fetch ${ver}/${abbrev}/${chapter}`, e.message);
                    results[ver] = { book: { name: abbrev, abbrev }, chapter, verses: [] };
                }
            })
        );

        return results;
    }

    private lookupBookAbbrev(name: string): string | null {
        const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const map = {
            'genesis': 'gn', 'exodo': 'ex', 'levitico': 'lv', 'numeros': 'nm', 'deuteronomio': 'dt',
            'josue': 'js', 'juizes': 'jz', 'rute': 'rt', '1samuel': '1sm', '2samuel': '2sm',
            '1reis': '1rs', '2reis': '2rs', '1cronicas': '1cr', '2cronicas': '2cr',
            'esdras': 'ed', 'neemias': 'ne', 'ester': 'et', 'job': 'job', 'salmos': 'sl',
            'proverbios': 'pv', 'eclesiastes': 'ec', 'cantares': 'ct', 'isaias': 'is',
            'jeremias': 'jr', 'lamentacoes': 'lm', 'ezequiel': 'ez', 'daniel': 'dn',
            'oseias': 'os', 'joel': 'jl', 'amos': 'am', 'obadias': 'ob', 'jonas': 'jn',
            'miqueias': 'mq', 'naum': 'na', 'habacuque': 'hc', 'sofonias': 'sf', 'ageu': 'ag',
            'zacarias': 'zc', 'malaquias': 'ml', 'mateus': 'mt', 'marcos': 'mc', 'lucas': 'lc',
            'joao': 'jo', 'atos': 'at', 'romanos': 'rm', '1corintios': '1co', '2corintios': '2co',
            'galatas': 'gl', 'efesios': 'ef', 'filipenses': 'fp', 'colossenses': 'cl',
            '1tessalonicenses': '1ts', '2tessalonicenses': '2ts', '1timoteo': '1tm', '2timoteo': '2tm',
            'tito': 'tt', 'filemon': 'fm', 'hebreus': 'hb', 'tiago': 'tg', '1pedro': '1pe',
            '2pedro': '2pe', '1joao': '1jo', '2joao': '2jo', '3joao': '3jo', 'judas': 'jd', 'apocalipse': 'ap'
        };
        const exact = map[normalized as keyof typeof map];
        if (exact) return exact;
        const partial = Object.entries(map).find(([k]) => k.startsWith(normalized));
        return partial ? partial[1] : null;
    }

    async search(version: string, text: string) {
        const query = text.trim();
        // If text looks like a reference (e.g. "Genesis 1" or "João 3:16")
        const refPattern = /^([1-3]?\s?[a-zA-Z\u00C0-\u00FF]+)\s?(\d+)(?::(\d+))?$/;
        const match = query.match(refPattern);

        if (match) {
            try {
                const bookName = match[1];
                const chapter = parseInt(match[2]);
                const verse = match[3] ? parseInt(match[3]) : null;

                const abbrev = this.lookupBookAbbrev(bookName);
                if (abbrev) {
                    const chapterData = await this.getChapter(version, abbrev, chapter);
                    if (chapterData && chapterData.verses) {
                        let matchingVerses = chapterData.verses;
                        if (verse) {
                            matchingVerses = matchingVerses.filter((v: any) => v.number == verse);
                        }

                        return {
                            occurrence: matchingVerses.length,
                            verses: matchingVerses.map((v: any) => ({
                                book: { name: chapterData.book?.name || bookName, abbrev: abbrev },
                                chapter: chapter,
                                number: v.number,
                                text: v.text.trim()
                            }))
                        };
                    }
                }
            } catch (e) {
                console.warn("Search as passage by getChapter failed", e.message);
            }
        }

        // Full-text// Full-text search (Thematic) - abibliadigital is best for this
        try {
            const response = await axios.post(`${this.baseUrl}/verses/search`, {
                version,
                text: query,
            }, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return response.data;
        } catch (error) {
            console.error("Bible API Search Error:", error.message);
            throw new HttpException('Erro na busca bíblica (Provedor Temporariamente Indisponível)', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
