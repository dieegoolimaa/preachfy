import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ProGuard, SessionGuard, type AuthedRequest } from '../account/guards';
import { LiveService } from './live.service';

type Fields = Record<string, unknown>;

@Controller('live')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Post()
  @UseGuards(ProGuard)
  create(@Req() { user }: AuthedRequest, @Body() body: Fields) {
    return this.service.create(user.id, body);
  }

  // Students and the media computer have no account.
  @Get(':code')
  read(@Param('code') code: string) {
    return this.service.read(code);
  }

  // A whole church can share one address, so the limit is per room rather than per person.
  @Post(':code/answers')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  answer(@Param('code') code: string, @Body() body: Fields) {
    return this.service.answer(code, body);
  }

  @Post(':code/state')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  state(@Req() { user }: AuthedRequest, @Param('code') code: string, @Body() body: Fields) {
    return this.service.setState(code, user.id, body);
  }

  @Post(':code/end')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  end(@Req() { user }: AuthedRequest, @Param('code') code: string, @Body() body: Fields) {
    return this.service.end(code, user.id, body?.closing);
  }

  @Get(':code/answers')
  @UseGuards(SessionGuard)
  answers(@Req() { user }: AuthedRequest, @Param('code') code: string, @Query('step') step: string) {
    return this.service.listAnswers(code, user.id, step);
  }

  @Post(':code/highlight')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  highlight(@Req() { user }: AuthedRequest, @Param('code') code: string, @Body() body: Fields) {
    return this.service.highlight(code, user.id, body?.answerId);
  }
}
