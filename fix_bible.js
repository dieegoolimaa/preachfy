const fs = require('fs');

let file = fs.readFileSync('apps/api/src/bible/bible.service.ts', 'utf8');

const regexFix = `
    const lookupBookAbbrev = (name: string): string | null => {
        const normalized = name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
        const map = {
            'genesis': 'gn', 'exodo': 'ex', 'levitico': 'lv', 'numeros': 'nm', 'deuteronomio': 'dt',
            'josue': 'js', 'juizes': 'jz', 'rute': 'rt', '1samuel': '1sm', '2samuel': '2sm',
            '1reis': '1rs', '2reis': '2rs', '1cronicas': '1cr', '2cronicas': '2cr',
            'esdras': 'ed', 'neemias': 'ne', 'ester': 'et', 'jo': 'job', 'salmos': 'sl',
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
        const exact = map[normalized];
        if (exact) return exact;
        const partial = Object.entries(map).find(([k]) => k.startsWith(normalized));
        return partial ? partial[1] : null;
    };

    async search(version: string, text: string) {
        const query = text.trim();
        // If text looks like a reference (e.g. "Genesis 1" or "João 3:16")
        const refPattern = /^([1-3]?\\s?[a-zA-Z\\u00C0-\\u00FF]+)\\s?(\\d+)(?::(\\d+))?$/;
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
`;

const replaceRegex = /async search\(version: string, text: string\) \{[\s\S]*?(?=\/\/ Full-text)/;

file = file.replace(replaceRegex, regexFix.trim() + '\n\n        // Full-text');

file = file.replace(/async search\(version:/, "lookupBookAbbrev = " + regexFix.split("lookupBookAbbrev = ")[1].split("};\n")[0] + "};\n\n    async search(version:");

fs.writeFileSync('apps/api/src/bible/bible.service.ts', file);
