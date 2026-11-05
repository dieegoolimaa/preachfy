import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProGuard, SessionGuard, type AuthedRequest } from '../account/guards';
import { CommunityService } from './community.service';

type Fields = Record<string, unknown>;

@Controller()
@UseGuards(SessionGuard)
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  // Only the leader subscribes. Members join and take part for free.
  @Post('communities')
  @UseGuards(ProGuard)
  create(@Req() { user }: AuthedRequest, @Body() body: Fields) {
    return this.service.create(user, body);
  }

  @Get('communities')
  mine(@Req() { user }: AuthedRequest) {
    return this.service.mine(user.id);
  }

  @Post('communities/join')
  @HttpCode(200)
  join(@Req() { user }: AuthedRequest, @Body() body: Fields) {
    return this.service.join(user, body?.code);
  }

  @Get('communities/:id')
  detail(@Req() { user }: AuthedRequest, @Param('id') id: string) {
    return this.service.detail(id, user.id);
  }

  @Patch('communities/:id')
  update(@Req() { user }: AuthedRequest, @Param('id') id: string, @Body() body: Fields) {
    return this.service.update(id, user.id, body);
  }

  @Post('communities/:id/invite')
  @HttpCode(200)
  rotate(@Req() { user }: AuthedRequest, @Param('id') id: string) {
    return this.service.rotateInvite(id, user.id);
  }

  @Delete('communities/:id')
  remove(@Req() { user }: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(id, user.id);
  }

  @Delete('communities/:id/members/:userId')
  removeMember(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('userId') target: string) {
    return this.service.removeMember(id, user.id, target);
  }

  @Patch('communities/:id/members/:userId')
  setRole(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('userId') target: string, @Body() body: Fields) {
    return this.service.setRole(id, user.id, target, body?.role);
  }

  @Get('communities/:id/posts')
  feed(@Req() { user }: AuthedRequest, @Param('id') id: string, @Query('before') before: string) {
    return this.service.feed(id, user.id, before);
  }

  @Post('communities/:id/posts')
  createPost(@Req() { user }: AuthedRequest, @Param('id') id: string, @Body() body: Fields) {
    return this.service.createPost(id, user, body);
  }

  @Delete('communities/:id/posts/:postId')
  deletePost(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('postId') postId: string) {
    return this.service.deletePost(id, user.id, postId);
  }

  @Post('communities/:id/posts/:postId/seen')
  @HttpCode(200)
  seen(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('postId') postId: string) {
    return this.service.markSeen(id, user.id, postId);
  }

  @Post('communities/:id/posts/:postId/report')
  @HttpCode(200)
  report(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('postId') postId: string, @Body() body: Fields) {
    return this.service.report(id, user.id, postId, body?.reason);
  }

  @Get('communities/:id/reports')
  reports(@Req() { user }: AuthedRequest, @Param('id') id: string) {
    return this.service.listReports(id, user.id);
  }

  @Get('communities/:id/events')
  events(@Req() { user }: AuthedRequest, @Param('id') id: string) {
    return this.service.listEvents(id, user.id);
  }

  @Post('communities/:id/events')
  createEvent(@Req() { user }: AuthedRequest, @Param('id') id: string, @Body() body: Fields) {
    return this.service.createEvent(id, user.id, body);
  }

  @Patch('communities/:id/events/:eventId')
  updateEvent(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('eventId') eventId: string, @Body() body: Fields) {
    return this.service.updateEvent(id, user.id, eventId, body);
  }

  @Delete('communities/:id/events/:eventId')
  deleteEvent(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('eventId') eventId: string) {
    return this.service.deleteEvent(id, user.id, eventId);
  }

  @Post('communities/:id/events/:eventId/rsvp')
  @HttpCode(200)
  rsvp(@Req() { user }: AuthedRequest, @Param('id') id: string, @Param('eventId') eventId: string, @Body() body: Fields) {
    return this.service.rsvp(id, user.id, eventId, body?.going);
  }

  @Post('blocks')
  @HttpCode(200)
  block(@Req() { user }: AuthedRequest, @Body() body: Fields) {
    return this.service.block(user.id, body?.userId);
  }

  @Delete('blocks/:userId')
  unblock(@Req() { user }: AuthedRequest, @Param('userId') target: string) {
    return this.service.unblock(user.id, target);
  }
}
