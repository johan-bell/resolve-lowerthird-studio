import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
  layout: entity.layout,
  fontFamily: entity.fontFamily,
  fontWeight: entity.fontWeight,
  fontSize: entity.fontSize,
  subtitleFontSize: entity.subtitleFontSize,
  foregroundHex: entity.foregroundHex,
  backgroundHex: entity.backgroundHex,
  accentHex: entity.accentHex,
  cornerRadius: entity.cornerRadius,
  anchor: entity.anchor,
  offsetX: entity.offsetX,
  offsetY: entity.offsetY,
  padding: entity.padding,
  createdAt: entity.createdAt.toISOString(),
});

@Injectable()
export class PresetsService implements OnModuleInit {
  private readonly logger = new Logger(PresetsService.name);

  constructor(
    @InjectRepository(StylePresetEntity)
    private readonly presets: Repository<StylePresetEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfillMissingFields();
    await this.seedDefault();
  }

  /**
   * Fill in columns added after a preset was saved.
   *
   * Adding a column leaves existing rows null, and a null reaching the UI is
   * indistinguishable from a missing style field — it breaks rendering. Repair
   * on boot so an older database keeps working without being deleted.
   */
  private async backfillMissingFields(): Promise<void> {
    const all = await this.presets.find();
    const repaired = all.filter((preset) => {
      let changed = false;
      const fill = <K extends keyof StylePresetEntity>(
        key: K,
        fallback: StylePresetEntity[K],
      ): void => {
        if (preset[key] === null || preset[key] === undefined) {
          preset[key] = fallback;
          changed = true;
        }
      };

      fill('layout', DEFAULT_STYLE.layout);
      fill('fontFamily', DEFAULT_STYLE.fontFamily);
      fill('fontWeight', DEFAULT_STYLE.fontWeight);
      fill('fontSize', DEFAULT_STYLE.fontSize);
      fill('subtitleFontSize', DEFAULT_STYLE.subtitleFontSize);
      fill('foregroundHex', DEFAULT_STYLE.foregroundHex);
      fill('backgroundHex', DEFAULT_STYLE.backgroundHex);
      fill('accentHex', DEFAULT_STYLE.accentHex);
      fill('cornerRadius', DEFAULT_STYLE.cornerRadius);
      fill('anchor', DEFAULT_STYLE.anchor);
      fill('offsetX', DEFAULT_STYLE.offsetX);
      fill('offsetY', DEFAULT_STYLE.offsetY);
      fill('padding', { ...DEFAULT_STYLE.padding });
      return changed;
    });

    if (repaired.length > 0) {
      await this.presets.save(repaired);
      this.logger.log(`Backfilled ${String(repaired.length)} preset(s) with newer style fields`);
    }
  }

  /** Seed one preset on a fresh database so the UI is never empty. */
  private async seedDefault(): Promise<void> {
    if ((await this.presets.count()) > 0) return;
    await this.presets.save(
      this.presets.create({
        name: 'Default',
        fontFamily: DEFAULT_STYLE.fontFamily,
        fontWeight: DEFAULT_STYLE.fontWeight,
        fontSize: DEFAULT_STYLE.fontSize,
        subtitleFontSize: DEFAULT_STYLE.subtitleFontSize,
        foregroundHex: DEFAULT_STYLE.foregroundHex,
        backgroundHex: DEFAULT_STYLE.backgroundHex,
        accentHex: DEFAULT_STYLE.accentHex,
        cornerRadius: DEFAULT_STYLE.cornerRadius,
        anchor: DEFAULT_STYLE.anchor,
        offsetX: DEFAULT_STYLE.offsetX,
        offsetY: DEFAULT_STYLE.offsetY,
        layout: DEFAULT_STYLE.layout,
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
