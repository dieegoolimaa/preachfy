import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
    constructor(private readonly eventService: EventService) { }

    @Post()
    async create(@Body() body: {
        communityId: string;
        title: string;
        description: string;
        date: string;
        meetLink?: string
    }) {
        return this.eventService.createEvent({
            ...body,
            date: new Date(body.date),
        });
    }

    @Get('community/:id')
    async getByCommunity(@Param('id') communityId: string) {
        return this.eventService.getCommunityEvents(communityId);
    }
}
