import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Anchor, LayoutVariant, PaddingConstraints } from '@lower-thirds/shared';

/** A saved look: typography, colours and box constraints under one name. */
@Entity({ name: 'style_presets' })
export class StylePresetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 40, default: 'solid-bar' })
  layout!: LayoutVariant;

  @Column({ type: 'varchar', length: 120 })
  fontFamily!: string;

  @Column({ type: 'integer', default: 600 })
  fontWeight!: number;

  @Column({ type: 'integer' })
  fontSize!: number;

  @Column({ type: 'integer' })
  subtitleFontSize!: number;

  @Column({ type: 'varchar', length: 7 })
  foregroundHex!: string;

  @Column({ type: 'varchar', length: 7 })
  backgroundHex!: string;

  @Column({ type: 'varchar', length: 7, default: '#E8483F' })
  accentHex!: string;

  @Column({ type: 'integer', default: 0 })
  cornerRadius!: number;

  @Column({ type: 'varchar', length: 20, default: 'bottom-left' })
  anchor!: Anchor;

  @Column({ type: 'float', default: 0.1 })
  offsetX!: number;

  @Column({ type: 'float', default: 0.18 })
  offsetY!: number;

  /** Stored as JSON: four small numbers that always travel together. */
  @Column({ type: 'simple-json' })
  padding!: PaddingConstraints;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
