import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { ApiResult } from '@lower-thirds/shared';
import { PresetsService, type StylePreset } from './presets.service';
import { CreatePresetDto, UpdatePresetDto } from './dto/preset.dto';

@Controller('presets')
export class PresetsController {
  constructor(private readonly presets: PresetsService) {}

  @Get()
  async findAll(): Promise<ApiResult<StylePreset[]>> {
    return { ok: true, data: await this.presets.findAll() };
  }

  @Post()
  async create(@Body() dto: CreatePresetDto): Promise<ApiResult<StylePreset>> {
    return { ok: true, data: await this.presets.create(dto) };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePresetDto,
  ): Promise<ApiResult<StylePreset>> {
    return { ok: true, data: await this.presets.update(id, dto) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ApiResult<{ deleted: true }>> {
    await this.presets.remove(id);
    return { ok: true, data: { deleted: true } };
  }
}
