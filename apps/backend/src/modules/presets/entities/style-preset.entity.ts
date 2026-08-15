import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { PaddingConstraints } from '@lower-thirds/shared';

/** A saved look: typography, colours and box constraints under one name. */
@Entity({ name: 'style_presets' })
export class StylePresetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  fontFamily!: string;

  @Column({ type: 'integer' })
  fontSize!: number;

  @Column({ type: 'integer' })
  subtitleFontSize!: number;

  @Column({ type: 'varchar', length: 7 })
  foregroundHex!: string;

  @Column({ type: 'varchar', length: 7 })
  backgroundHex!: string;

  /** Stored as JSON: four small numbers that always travel together. */
  @Column({ type: 'simple-json' })
  padding!: PaddingConstraints;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
