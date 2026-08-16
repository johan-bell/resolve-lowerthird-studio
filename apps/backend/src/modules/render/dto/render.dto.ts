import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Anchor, LayoutVariant } from '@lower-thirds/shared';
import { PaddingDto } from '../../presets/dto/preset.dto';

export class TimingDto {
  @IsInt()
  @Min(1)
  @Max(120)
  fps!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  inSeconds!: number;

  @IsNumber()
  @Min(0)
  @Max(120)
  holdSeconds!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  outSeconds!: number;
}

export class StyleDto {
  @IsIn(['solid-bar', 'accent-stripe', 'two-tone', 'minimal', 'underline', 'offset-block'])
  layout!: LayoutVariant;

  @IsString()
  fontFamily!: string;

  @IsInt()
  @Min(100)
  @Max(900)
  fontWeight!: number;

  @IsInt()
  @Min(8)
  @Max(400)
  fontSize!: number;

  @IsInt()
  @Min(8)
  @Max(400)
  subtitleFontSize!: number;

  @IsString()
  foregroundHex!: string;

  @IsString()
  backgroundHex!: string;

  @IsString()
  accentHex!: string;

  @IsInt()
  @Min(0)
  @Max(200)
  cornerRadius!: number;

  @IsIn(['top-left','top-center','top-right','middle-left','center','middle-right','bottom-left','bottom-center','bottom-right'])
  anchor!: Anchor;

  @IsNumber()
  @Min(-1)
  @Max(1)
  offsetX!: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  offsetY!: number;

  @ValidateNested()
  @Type(() => PaddingDto)
  padding!: PaddingDto;
}

export class InlineTargetDto {
  @IsString()
  name!: string;

  @IsString()
  subtitle!: string;
}

export class RenderRequestDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InlineTargetDto)
  targets?: InlineTargetDto[];

  @ValidateNested()
  @Type(() => StyleDto)
  style!: StyleDto;

  @ValidateNested()
  @Type(() => TimingDto)
  timing!: TimingDto;

  @IsIn(['prores4444'])
  format!: 'prores4444';

  @IsInt()
  @Min(64)
  @Max(7680)
  width!: number;

  @IsInt()
  @Min(64)
  @Max(4320)
  height!: number;
}
