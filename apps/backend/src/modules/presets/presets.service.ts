import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_STYLE, type LowerThirdStyle } from '@lower-thirds/shared';
import { StylePresetEntity } from './entities/style-preset.entity';
import type { CreatePresetDto, UpdatePresetDto } from './dto/preset.dto';

export interface StylePreset extends LowerThirdStyle {
  id: string;
  name: string;
  createdAt: string;
}

const toDto = (entity: StylePresetEntity): StylePreset => ({
  id: entity.id,
  name: entity.name,
  fontFamily: entity.fontFamily,
  fontSize: entity.fontSize,
  subtitleFontSize: entity.subtitleFontSize,
  foregroundHex: entity.foregroundHex,
  backgroundHex: entity.backgroundHex,
  padding: entity.padding,
  createdAt: entity.createdAt.toISOString(),
});

@Injectable()
export class PresetsService implements OnModuleInit {
  constructor(
    @InjectRepository(StylePresetEntity)
    private readonly presets: Repository<StylePresetEntity>,
  ) {}

  /** Seed one preset on a fresh database so the UI is never empty. */
  async onModuleInit(): Promise<void> {
    if ((await this.presets.count()) > 0) return;
    await this.presets.save(
      this.presets.create({
        name: 'Default',
        fontFamily: DEFAULT_STYLE.fontFamily,
        fontSize: DEFAULT_STYLE.fontSize,
        subtitleFontSize: DEFAULT_STYLE.subtitleFontSize,
        foregroundHex: DEFAULT_STYLE.foregroundHex,
        backgroundHex: DEFAULT_STYLE.backgroundHex,
        padding: DEFAULT_STYLE.padding,
      }),
    );
  }

  async findAll(): Promise<StylePreset[]> {
    const found = await this.presets.find({ order: { createdAt: 'ASC' } });
    return found.map(toDto);
  }

  async create(dto: CreatePresetDto): Promise<StylePreset> {
    const clash = await this.presets.findOne({ where: { name: dto.name } });
    if (clash) throw new ConflictException(`A preset named "${dto.name}" already exists.`);
    return toDto(await this.presets.save(this.presets.create(dto)));
  }

  async update(id: string, dto: UpdatePresetDto): Promise<StylePreset> {
    const found = await this.presets.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`No preset with id ${id}`);

    if (dto.name !== undefined && dto.name !== found.name) {
      const clash = await this.presets.findOne({ where: { name: dto.name } });
      if (clash) throw new ConflictException(`A preset named "${dto.name}" already exists.`);
    }

    Object.assign(found, dto);
    return toDto(await this.presets.save(found));
  }

  async remove(id: string): Promise<void> {
    const result = await this.presets.delete({ id });
    if (result.affected === 0) throw new NotFoundException(`No preset with id ${id}`);
  }
}
