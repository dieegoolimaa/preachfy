import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BibleService } from './bible.service';

@Controller('bible')
export class BibleController {
    constructor(private readonly bibleService: BibleService) { }

    @Get('versions')
    getVersions() {
        return this.bibleService.getVersions();
    }

    @Get('books')
    getBooks() {
        return this.bibleService.getBooks();
    }

    @Get('chapter/:version/:abbrev/:chapter')
    getChapter(
        @Param('version') version: string,
        @Param('abbrev') abbrev: string,
        @Param('chapter') chapter: string,
    ) {
        return this.bibleService.getChapter(version, abbrev, parseInt(chapter));
    }

    @Get('compare/:abbrev/:chapter')
    compareChapter(
        @Param('abbrev') abbrev: string,
        @Param('chapter') chapter: string,
    ) {
        return this.bibleService.compareChapter(abbrev, parseInt(chapter));
    }

    @Get('search')
    search(
        @Query('version') version: string,
        @Query('text') text: string,
    ) {
        return this.bibleService.search(version || 'nvi', text);
    }
}
