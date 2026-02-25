import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { InsightService } from './insight.service';
import { Prisma } from '@preachfy/database';

@Controller('insights')
export class InsightController {
    constructor(private readonly insightService: InsightService) { }

    @Post()
    create(@Body() createInsightDto: Prisma.GlobalInsightCreateInput) {
        return this.insightService.create(createInsightDto);
    }

    @Get()
    findAllByUser(@Query('userId') userId: string) {
        return this.insightService.findAllByUser(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.insightService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateInsightDto: Prisma.GlobalInsightUpdateInput) {
        return this.insightService.update(id, updateInsightDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.insightService.remove(id);
    }
}
