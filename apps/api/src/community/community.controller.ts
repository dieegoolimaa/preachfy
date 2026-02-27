import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
    constructor(private readonly communityService: CommunityService) { }

    @Post()
    async create(@Body() body: { userId: string; name: string; description?: string }) {
        return this.communityService.create(body.userId, body.name, body.description);
    }

    @Post('join/:inviteCode')
    async join(@Param('inviteCode') inviteCode: string, @Body() body: { userId: string }) {
        return this.communityService.joinByInvite(body.userId, inviteCode);
    }

    @Get('my/:userId')
    async getMyCommunities(@Param('userId') userId: string) {
        return this.communityService.getMyCommunities(userId);
    }

    @Post(':id/post')
    async createPost(
        @Param('id') communityId: string,
        @Body() body: { userId: string; content: string },
    ) {
        return this.communityService.createPost(body.userId, communityId, body.content);
    }

    @Get(':id/feed')
    async getFeed(@Param('id') communityId: string) {
        return this.communityService.getFeed(communityId);
    }

    @Post('post/:postId/acknowledge')
    async acknowledge(@Param('postId') postId: string, @Body() body: { userId: string }) {
        return this.communityService.acknowledgePost(body.userId, postId);
    }

    @Post(':id/share-sermon')
    async shareSermon(
        @Param('id') communityId: string,
        @Body() body: { userId: string; sermonId: string },
    ) {
        return this.communityService.shareSermon(body.userId, communityId, body.sermonId);
    }

    @Post(':id/event')
    async createEvent(
        @Param('id') communityId: string,
        @Body() body: { userId: string, title: string, description?: string, date: string, meetLink?: string },
    ) {
        return this.communityService.createEvent(body.userId, communityId, body);
    }

    @Get(':id/events')
    async getEvents(@Param('id') communityId: string) {
        return this.communityService.getEvents(communityId);
    }
}
