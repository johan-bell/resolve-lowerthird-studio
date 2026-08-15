import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;
}

export class UpdateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;
}

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

export class ImportDto {
  @IsIn(['csv', 'json'])
  format!: 'csv' | 'json';

  /** Raw file contents; parsed and validated server-side. */
  @IsString()
  content!: string;

  /** Optional name for the list created from this import. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}
