import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { ApiResult, ImportFormat, QueueItem, QueueList } from '@lower-thirds/shared';
import { QueueService, type ImportResult } from './queue.service';
import {
  CreateItemDto,
  CreateListDto,
  ImportDto,
  ReorderDto,
  UpdateItemDto,
  UpdateListDto,
} from './dto/queue.dto';

@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get('lists')
  async findAll(): Promise<ApiResult<QueueList[]>> {
    return { ok: true, data: await this.queue.findAllLists() };
  }

  @Get('lists/:id')
  async findOne(@Param('id') id: string): Promise<ApiResult<QueueList>> {
    return { ok: true, data: await this.queue.findList(id) };
  }

  @Post('lists')
  async create(@Body() dto: CreateListDto): Promise<ApiResult<QueueList>> {
    return { ok: true, data: await this.queue.createList(dto) };
  }

  @Patch('lists/:id')
  async rename(
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ): Promise<ApiResult<QueueList>> {
    return { ok: true, data: await this.queue.renameList(id, dto.label) };
  }

  @Delete('lists/:id')
  async remove(@Param('id') id: string): Promise<ApiResult<{ deleted: true }>> {
    await this.queue.deleteList(id);
    return { ok: true, data: { deleted: true } };
  }

  @Post('lists/:id/items')
  async addItem(
    @Param('id') listId: string,
    @Body() dto: CreateItemDto,
  ): Promise<ApiResult<QueueItem>> {
    return { ok: true, data: await this.queue.addItem(listId, dto) };
  }

  @Patch('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ): Promise<ApiResult<QueueItem>> {
    return { ok: true, data: await this.queue.updateItem(id, dto) };
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string): Promise<ApiResult<{ deleted: true }>> {
    await this.queue.deleteItem(id);
    return { ok: true, data: { deleted: true } };
  }

  @Patch('lists/:id/order')
  async reorder(
    @Param('id') listId: string,
    @Body() dto: ReorderDto,
  ): Promise<ApiResult<QueueList>> {
    return { ok: true, data: await this.queue.reorder(listId, dto.items) };
  }

  @Post('import')
  async import(@Body() dto: ImportDto): Promise<ApiResult<ImportResult>> {
    return { ok: true, data: await this.queue.importList(dto.format, dto.content, dto.label) };
  }

  @Get('lists/:id/export')
  async export(
    @Param('id') id: string,
    @Query('format') format?: string,
  ): Promise<ApiResult<{ content: string; format: ImportFormat }>> {
    const chosen: ImportFormat = format === 'json' ? 'json' : 'csv';
    return { ok: true, data: { content: await this.queue.exportList(id, chosen), format: chosen } };
  }
}
