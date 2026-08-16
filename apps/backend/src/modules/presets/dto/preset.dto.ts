import { Type } from 'class-transformer';
import type { Anchor, LayoutVariant } from '@lower-thirds/shared';
import {
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export class PaddingDto {
  @IsInt()
  @Min(0)
  @Max(500)
  x!: number;

  @IsInt()
  @Min(0)
  @Max(500)
  y!: number;

  @IsInt()
  @Min(0)
  @Max(4096)
  minWidth!: number;

  @IsInt()
  @Min(1)
  @Max(4096)
  maxWidth!: number;
}

export class CreatePresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(['solid-bar', 'accent-stripe', 'two-tone', 'minimal', 'underline', 'offset-block'])
  layout!: LayoutVariant;

  @IsString()
  @MaxLength(120)
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

  @IsHexColor()
  @Matches(HEX, { message: 'foregroundHex must be #RRGGBB' })
  foregroundHex!: string;

  @IsHexColor()
  @Matches(HEX, { message: 'backgroundHex must be #RRGGBB' })
  backgroundHex!: string;

  @IsHexColor()
  @Matches(HEX, { message: 'accentHex must be #RRGGBB' })
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

export class UpdatePresetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['solid-bar', 'accent-stripe', 'two-tone', 'minimal', 'underline', 'offset-block'])
  layout?: LayoutVariant;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fontFamily?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(900)
  fontWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(400)
  fontSize?: number;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(400)
  subtitleFontSize?: number;

  @IsOptional()
  @IsHexColor()
  @Matches(HEX, { message: 'foregroundHex must be #RRGGBB' })
  foregroundHex?: string;

  @IsOptional()
  @IsHexColor()
  @Matches(HEX, { message: 'backgroundHex must be #RRGGBB' })
  backgroundHex?: string;

  @IsOptional()
  @IsHexColor()
  @Matches(HEX, { message: 'accentHex must be #RRGGBB' })
  accentHex?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  cornerRadius?: number;

  @IsOptional()
  @IsIn(['top-left','top-center','top-right','middle-left','center','middle-right','bottom-left','bottom-center','bottom-right'])
  anchor?: Anchor;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  offsetX?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  offsetY?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaddingDto)
  padding?: PaddingDto;
}
