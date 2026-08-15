import { Type } from 'class-transformer';
import {
  IsHexColor,
  IsInt,
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

  @IsString()
  @MaxLength(120)
  fontFamily!: string;

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
  @IsString()
  @MaxLength(120)
  fontFamily?: string;

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
  @ValidateNested()
  @Type(() => PaddingDto)
  padding?: PaddingDto;
}
