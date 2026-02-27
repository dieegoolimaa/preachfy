import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
    constructor(private readonly communityService: CommunityService) { }

    @Post()
    create(@Body() data: { ownerId: string; name: string; description?: string }) {
        return this.communityService.create(data.ownerId, data.name, data.description);
    }

    @Post('join')
    join(@Body() data: { userId: string; inviteCode: string }) {
        return this.communityService.joinByInvite(data.userId, data.inviteCode);
    }

    @Get('my/:userId')
    getMyCommunities(@Param('userId') userId: string) {
        return this.communityService.getMyCommunities(userId);
    }

    @Get(':communityId/members')
    getMembers(@Param('communityId') communityId: string) {
        return this.communityService.getMembers(communityId);
    }

    @Patch(':communityId')
    updateCommunity(@Param('communityId') id: string, @Body() data: { userId: string; name?: string; meetLink?: string }) {
        return this.communityService.updateCommunity(data.userId, id, data);
    }

    @Delete(':communityId/members/:targetUserId')
    removeMember(
        @Param('communityId') communityId: string,
        @Param('targetUserId') targetUserId: string,
        @Query('userId') requesterId: string
    ) {
        return this.communityService.removeMember(requesterId, communityId, targetUserId);
    }

    // ─── POSTS ──────────────────────────────────

    @Post(':communityId/posts')
    createPost(
        @Param('communityId') communityId: string,
        @Body() data: { userId: string; content: string; type?: string; sermonId?: string; eventId?: string },
    ) {
        return this.communityService.createPost(data.userId, communityId, data);
    }

    @Patch('posts/:postId')
    updatePost(@Body() data: { userId: string; content?: string }, @Param('postId') postId: string) {
        return this.communityService.updatePost(data.userId, postId, data);
    }

    @Delete('posts/:postId')
    deletePost(@Query('userId') userId: string, @Param('postId') postId: string) {
        return this.communityService.deletePost(userId, postId);
    }

    @Post(':communityId/posts/:postId/acknowledge')
    acknowledge(@Param('postId') postId: string, @Body() data: { userId: string }) {
        return this.communityService.acknowledgePost(data.userId, postId);
    }

    @Get(':communityId/feed')
    getFeed(@Param('communityId') communityId: string) {
        return this.communityService.getFeed(communityId);
    }

    // Legacy: share sermon (creates a SERMAO post)
    @Post(':communityId/share-sermon')
    shareSermon(@Param('communityId') communityId: string, @Body() data: { userId: string; sermonId: string }) {
        return this.communityService.shareSermon(data.userId, communityId, data.sermonId);
    }

    @Get(':communityId/shared-sermons')
    getSharedSermons(@Param('communityId') communityId: string) {
        return this.communityService.getSharedSermons(communityId);
    }

    // ─── EVENTS ─────────────────────────────────

    @Post(':communityId/events')
    createEvent(
        @Param('communityId') communityId: string,
        @Body() data: { userId: string; title: string; description?: string; date: string; meetLink?: string; type?: string; participants?: string[] },
    ) {
        return this.communityService.createEvent(data.userId, communityId, data);
    }

    @Get(':communityId/events')
    getEvents(@Param('communityId') communityId: string) {
        return this.communityService.getEvents(communityId);
    }

    @Patch('events/:eventId')
    updateEvent(@Param('eventId') eventId: string, @Body() data: any) {
        return this.communityService.updateEvent(data.userId, eventId, data);
    }

    @Delete('events/:eventId')
    deleteEvent(@Param('eventId') eventId: string, @Query('userId') userId: string) {
        return this.communityService.deleteEvent(userId, eventId);
    }
}
