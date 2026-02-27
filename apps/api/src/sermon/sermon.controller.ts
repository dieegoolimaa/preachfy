import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { SermonService } from './sermon.service';
import { Prisma } from '@preachfy/database';

@Controller('sermons')
export class SermonController {
  constructor(private readonly sermonService: SermonService) { }

  @Post()
  create(@Body() data: Prisma.SermonCreateInput) {
    return this.sermonService.createSermon(data);
  }

  @Get()
  findAll(@Query('authorId') authorId?: string) {
    // Basic implementation, usually we'd want filtration by author
    return this.sermonService.getAllSermons(authorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sermonService.getSermon(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.SermonUpdateInput) {
    // Standard update logic
    return this.sermonService.updateSermon(id, data);
  }


  @Post(':id/history')
  addHistory(@Param('id') id: string, @Body() data: any) {
    return this.sermonService.addHistory(id, data);
  }

  @Post(':id/sync')
  sync(@Param('id') id: string, @Body() data: { blocks: any[] }) {
    return this.sermonService.syncFullSermon(id, data.blocks);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sermonService.deleteSermon(id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Body() data: { userId: string }) {
    return this.sermonService.cloneSermon(id, data.userId);
  }
}
